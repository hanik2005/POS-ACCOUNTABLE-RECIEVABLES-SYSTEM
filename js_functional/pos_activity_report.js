import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI } from "../js/config.js";
import { formatCurrency, formatNumber } from "../js/module/number_format.js";
import { addPrintSummaryTables, removePrintSummaryTables } from "../js/module/report_print.js";

sessionStorage.setItem("baseAPI", baseAPI);

const activityLabels = {
  VOID_SALE: "Void sale",
  VOID_LINE: "Void line",
  QUANTITY_REDUCE: "Quantity reduced",
  CASH_DROP: "Cash drop",
  FLOAT_ADD: "Float added",
  FLOAT_REMOVE: "Float removed",
};

let activities = [];
let currentPage = 1;
let printing = false;

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const escapeHtml = (value) => {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
};

const getActivityLabel = (activityType) => activityLabels[activityType] || activityType || "Activity";

const getVariance = (countedCash, expectedCash) => {
  if (countedCash == null || expectedCash == null || countedCash === "" || expectedCash === "") {
    return "-";
  }

  return formatCurrency((Number(countedCash) || 0) - (Number(expectedCash) || 0));
};

const getDetailsText = (activity) => {
  if (!activity.details_json) {
    return "-";
  }

  try {
    const details = JSON.parse(activity.details_json);
    const items = Array.isArray(details) ? details : [details];

    return items.map((item) => {
      const name = String(item.productName || "Product");
      const quantity = Number(item.qty) || 0;

      if (activity.activity_type == "QUANTITY_REDUCE" && item.quantityBefore && item.quantityAfter) {
        return `${name} (${formatNumber(item.quantityBefore, 0)} to ${formatNumber(item.quantityAfter, 0)}, reduced ${formatNumber(quantity, 0)})`;
      }

      return quantity > 0 ? `${name} \u00d7${formatNumber(quantity, 0)}` : name;
    }).join(", ");
  } catch {
    return "-";
  }
};

const getReconciliationFields = (activity) => [
  ["Starting cash / float", formatCurrency(Number(activity.starting_cash) || 0)],
  ["Expected cash", activity.expected_cash == null ? "-" : formatCurrency(Number(activity.expected_cash) || 0)],
  ["Cashier count", activity.cashier_count == null ? "-" : formatCurrency(Number(activity.cashier_count) || 0)],
  ["Cashier over / short", getVariance(activity.cashier_count, activity.expected_cash)],
  ["Opening supervisor", activity.opening_supervisor || "Not recorded"],
  ["Closing supervisor", activity.closing_supervisor || "Not recorded"],
  ["Supervisor count", activity.supervisor_count == null ? "-" : formatCurrency(Number(activity.supervisor_count) || 0)],
  ["Supervisor over / short", getVariance(activity.supervisor_count, activity.expected_cash)],
  ["Shift status", activity.shift_status || "-"],
];

const getOptions = (selectId, valueField, labelField, allLabel) => {
  const select = document.getElementById(selectId);
  const previousValue = select.value;
  const optionMap = new Map();

  activities.forEach((activity) => {
    const value = activity[valueField];
    const label = activity[labelField];

    if (value != null && value !== "" && label) {
      optionMap.set(String(value), String(label));
    }
  });

  const options = [...optionMap.entries()]
    .sort((first, second) => first[1].localeCompare(second[1]))
    .map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`)
    .join("");
  const hasUnrecorded = activities.some((activity) => !activity[valueField] || !activity[labelField]);

  select.innerHTML = `<option value="all">${allLabel}</option>${options}${hasUnrecorded
    ? '<option value="__unrecorded__">Not recorded</option>'
    : ""}`;

  if (previousValue == "__unrecorded__" && hasUnrecorded) {
    select.value = previousValue;
  } else if (optionMap.has(previousValue)) {
    select.value = previousValue;
  }
};

const populateSupervisorFilter = () => {
  const select = document.getElementById("supervisorFilter");
  const previousValue = select.value;
  const supervisorMap = new Map();
  const supervisorFields = [
    ["supervisor_user_id", "supervisor"],
    ["opening_supervisor_user_id", "opening_supervisor"],
    ["closing_supervisor_user_id", "closing_supervisor"],
  ];

  activities.forEach((activity) => {
    supervisorFields.forEach(([idField, nameField]) => {
      const id = activity[idField];
      const name = activity[nameField];

      if (id != null && id !== "" && name) {
        supervisorMap.set(String(id), String(name));
      }
    });
  });

  const options = [...supervisorMap.entries()]
    .sort((first, second) => first[1].localeCompare(second[1]))
    .map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`)
    .join("");
  const hasUnrecorded = activities.some((activity) => supervisorFields.every(([field]) => !activity[field]));

  select.innerHTML = `<option value="all">All supervisors</option>${options}${hasUnrecorded
    ? '<option value="__unrecorded__">Not recorded</option>'
    : ""}`;

  if (previousValue == "__unrecorded__" && hasUnrecorded) {
    select.value = previousValue;
  } else if (supervisorMap.has(previousValue)) {
    select.value = previousValue;
  }
};

const populateFilters = () => {
  getOptions("terminalFilter", "terminal_id", "terminal_name", "All terminals");
  getOptions("cashierFilter", "cashier_user_id", "cashier", "All cashiers");
  populateSupervisorFilter();
};

const matchesSelect = (activity, selectId, field) => {
  const selected = document.getElementById(selectId).value;

  if (selected == "all") {
    return true;
  }

  if (selected == "__unrecorded__") {
    if (field == "supervisor_user_id") {
      return !activity.supervisor_user_id
        && !activity.opening_supervisor_user_id
        && !activity.closing_supervisor_user_id;
    }

    return !activity[field];
  }

  if (field == "supervisor_user_id") {
    return [
      activity.supervisor_user_id,
      activity.opening_supervisor_user_id,
      activity.closing_supervisor_user_id,
    ].some((id) => String(id ?? "") == selected);
  }

  return String(activity[field] ?? "") == selected;
};

const getFilteredActivities = () => {
  const search = document.getElementById("searchActivity").value.trim().toLowerCase();
  const type = document.getElementById("activityTypeFilter").value;
  const status = document.getElementById("statusFilter").value;

  return activities.filter((activity) => {
    const searchableText = [
      activity.shift_id,
      activity.terminal_name,
      activity.cashier,
      activity.supervisor,
      activity.opening_supervisor,
      activity.closing_supervisor,
      activity.reason,
      getDetailsText(activity),
    ].join(" ").toLowerCase();

    return (!search || searchableText.includes(search))
      && (type == "all" || activity.activity_type == type)
      && (status == "all" || String(activity.status || "").toUpperCase() == status)
      && matchesSelect(activity, "terminalFilter", "terminal_id")
      && matchesSelect(activity, "cashierFilter", "cashier_user_id")
      && matchesSelect(activity, "supervisorFilter", "supervisor_user_id");
  });
};

const updateSummary = (filtered) => {
  const voidActivities = filtered.filter((activity) => {
    return activity.activity_type == "VOID_SALE" || activity.activity_type == "VOID_LINE";
  });
  const cashMovements = filtered.filter((activity) => {
    return ["CASH_DROP", "FLOAT_ADD", "FLOAT_REMOVE"].includes(activity.activity_type);
  });
  const voidAmount = voidActivities.reduce((sum, activity) => sum + (Number(activity.amount) || 0), 0);
  const movementAmount = cashMovements.reduce((sum, activity) => sum + (Number(activity.amount) || 0), 0);

  document.getElementById("activityCount").textContent = formatNumber(filtered.length, 0);
  document.getElementById("voidAmount").textContent = formatCurrency(voidAmount);
  document.getElementById("movementAmount").textContent = formatCurrency(movementAmount);
};

const renderReconciliation = (activity) => getReconciliationFields(activity).map(([label, value]) => `
  <div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</div>
`).join("");

const renderTable = (visible) => {
  const rows = visible.map((activity) => `
    <tr>
      <td class="text-nowrap">${escapeHtml(activity.activity_at || "-")}</td>
      <td>${escapeHtml(getActivityLabel(activity.activity_type))}</td>
      <td>Shift ${escapeHtml(activity.shift_id || "-")}<br>${escapeHtml(activity.terminal_name || "-")}</td>
      <td>${escapeHtml(activity.cashier || "Not recorded")}</td>
      <td>${escapeHtml(activity.supervisor || "Not recorded")}</td>
      <td class="text-end text-nowrap">${formatCurrency(Number(activity.amount) || 0)}</td>
      <td>${escapeHtml(getDetailsText(activity))}</td>
      <td>${escapeHtml(activity.reason || "-")}</td>
      <td>${escapeHtml(activity.status || "-")}</td>
      <td class="pos-activity-reconciliation">${renderReconciliation(activity)}</td>
    </tr>
  `).join("");

  return `<div class="pos-activity-table d-none d-xxl-block">
    <div class="table-responsive">
      <table class="table table-hover table-striped table-sm align-middle report-table mb-0">
        <thead><tr>
          <th>Date and time</th><th>Activity</th><th>Shift / terminal</th><th>Cashier</th>
          <th>Approving supervisor</th><th class="text-end">Amount</th><th>Items</th><th>Reason</th>
          <th>Status</th><th>Reconciliation</th>
        </tr></thead>
        <tbody>${rows || '<tr><td colspan="10" class="text-center text-muted py-4">No POS activity matches these filters.</td></tr>'}</tbody>
      </table>
    </div>
  </div>`;
};

const renderCards = (visible) => {
  if (visible.length == 0) {
    return '<div class="text-center text-muted py-4">No POS activity matches these filters.</div>';
  }

  return visible.map((activity) => {
    const reconciliation = getReconciliationFields(activity).map(([label, value]) => `
      <div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>
    `).join("");

    return `<article class="card pos-activity-card">
      <div class="card-body">
        <header class="d-flex justify-content-between align-items-start gap-2 mb-3">
          <div>
            <p class="report-eyebrow mb-1">${escapeHtml(activity.activity_at || "-")}</p>
            <h3 class="h5 mb-1">${escapeHtml(getActivityLabel(activity.activity_type))}</h3>
            <div class="text-muted small">Shift ${escapeHtml(activity.shift_id || "-")} | ${escapeHtml(activity.terminal_name || "Unknown terminal")}</div>
          </div>
          <span class="badge text-bg-secondary">${escapeHtml(activity.status || "-")}</span>
        </header>
        <dl class="pos-activity-fields">
          <div><dt>Cashier</dt><dd>${escapeHtml(activity.cashier || "Not recorded")}</dd></div>
          <div><dt>Approving supervisor</dt><dd>${escapeHtml(activity.supervisor || "Not recorded")}</dd></div>
          <div><dt>Amount</dt><dd>${formatCurrency(Number(activity.amount) || 0)}</dd></div>
          <div class="pos-activity-field-wide"><dt>Items</dt><dd>${escapeHtml(getDetailsText(activity))}</dd></div>
          <div class="pos-activity-field-wide"><dt>Reason</dt><dd>${escapeHtml(activity.reason || "-")}</dd></div>
        </dl>
        <section class="pos-activity-reconciliation mt-3">
          <h4 class="report-eyebrow">Shift reconciliation</h4>
          <dl class="pos-activity-fields">${reconciliation}</dl>
        </section>
      </div>
    </article>`;
  }).join("");
};

const renderReport = () => {
  const filtered = getFilteredActivities();
  const { rows, current } = paginate(filtered, currentPage);
  currentPage = current;
  const visible = printing ? filtered : rows;
  const report = document.getElementById("activityReport");

  updateSummary(filtered);
  report.innerHTML = `${renderTable(visible)}<div class="pos-activity-cards d-xxl-none">${renderCards(visible)}</div>`;

  if (!printing) {
    const pagination = createPagination(filtered.length, currentPage, (page) => {
      currentPage = page;
      renderReport();
    });
    pagination.classList.add("mt-3");
    report.appendChild(pagination);
  }
};

const loadReport = async () => {
  const dateFrom = document.getElementById("dateFrom").value;
  const dateTo = document.getElementById("dateTo").value;

  if (!dateFrom || !dateTo || dateFrom > dateTo) {
    await Swal.fire({
      icon: "warning",
      title: "Check the report dates",
      text: "Enter a start date that is on or before the end date.",
    });
    return;
  }

  const generateButton = document.getElementById("generateBtn");
  generateButton.disabled = true;

  try {
    const response = await axios.get(`${baseAPI}/pos_activity_report.php`, {
      params: {
        operation: "getPosActivityReport",
        json: JSON.stringify({ dateFrom, dateTo }),
      },
    });

    if (!Array.isArray(response.data?.activities)) {
      throw new Error(response.data?.message || "The POS Activity Report returned an invalid response.");
    }

    activities = response.data.activities;
    currentPage = 1;
    document.getElementById("reportPeriod").textContent = `${dateFrom} to ${dateTo}`;
    populateFilters();
    renderReport();
  } catch (error) {
    console.error("Unable to load POS Activity Report:", error);
    document.getElementById("activityReport").innerHTML = `
      <div class="alert alert-danger mb-0">
        ${escapeHtml(error.response?.data?.message || "Unable to load POS activity. Refresh and try again.")}
      </div>`;
  } finally {
    generateButton.disabled = false;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();
  document.getElementById("dateFrom").value = formatDate(new Date(today.getFullYear(), today.getMonth(), 1));
  document.getElementById("dateTo").value = formatDate(today);

  document.getElementById("generateBtn").addEventListener("click", loadReport);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("searchActivity").addEventListener("input", () => {
    currentPage = 1;
    renderReport();
  });

  ["activityTypeFilter", "terminalFilter", "cashierFilter", "supervisorFilter", "statusFilter"]
    .forEach((id) => {
      document.getElementById(id).addEventListener("change", () => {
        currentPage = 1;
        renderReport();
      });
    });

  loadReport();
});

window.addEventListener("beforeprint", () => {
  printing = true;
  renderReport();
  addPrintSummaryTables();
});

window.addEventListener("afterprint", () => {
  removePrintSummaryTables();
  printing = false;
  renderReport();
});
