import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI, sessionAPI, baseUrl } from "../js/config.js";
import { formatCurrency, formatNumber } from "../js/module/number_format.js";

const posPage = window.location.pathname.toLowerCase().includes("/interface/cashier/")
  ? "pos.html"
  : "../Cashier/pos.html";
const unknownTerminalValue = "__unknown_terminal__";

sessionStorage.setItem("baseAPI", baseAPI);

let userId = "";
let shiftPage = 1;
let accountingArPage = 1;
let shiftReports = [];
let arReports = [];
let printing = false;
let cashierMode = false;

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const formatTime = (dateTime) => {
  if (!dateTime) {
    return "-";
  }

  return new Date(dateTime.replace(" ", "T")).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const escapeHtml = (value) => {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
};

const amount = (value) => {
  const number = parseFloat(value);

  return formatCurrency(Number.isFinite(number) ? number : 0);
};

const renderReportFields = (fields) => fields.map(({ label, value, wide = false, danger = false }) => `
  <div class="report-field${wide ? " report-field-wide" : ""}">
    <dt>${label}</dt>
    <dd${danger ? ' class="text-danger"' : ""}>${value}</dd>
  </div>
`).join("");

const renderReportSummary = (title, fields) => `
  ${printing ? `
    <section class="report-print-section">
      <h3 class="report-print-summary-title">${title}</h3>
      <table class="table table-sm report-print-summary-table">
        <thead><tr><th>Report total</th><th class="text-end">Value</th></tr></thead>
        <tbody>
          ${fields.map(({ label, value }) => `<tr><th scope="row">${label}</th><td class="text-end">${value}</td></tr>`).join("")}
        </tbody>
      </table>
    </section>
  ` : `
  <section class="report-summary" aria-label="${title}">
    <h4 class="report-summary-title">${title}</h4>
    <div class="report-summary-grid">
      ${fields.map(({ label, value }) => `
        <div class="report-summary-item">
          <span>${label}</span>
          <strong>${value}</strong>
        </div>
      `).join("")}
    </div>
  </section>
  `}
`;

const renderCashierArTable = (reports) => `
  <div class="report-ar-table-wrap">
    <table class="report-ar-table report-cashier-ar-table">
      <thead>
        <tr>
          <th scope="col">Invoice number</th>
          <th scope="col">Customer</th>
          <th scope="col" class="text-end">Invoice amount</th>
        </tr>
      </thead>
      <tbody>
        ${reports.map((report) => `
          <tr>
            <td data-label="Invoice number">${escapeHtml(report.invoice_number || "Invoice")}</td>
            <td data-label="Customer">${escapeHtml(report.customer_name || "-")}</td>
            <td data-label="Invoice amount" class="text-end">${amount(report.amount_due)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
`;

const renderAccountingArTable = (reports) => `
  <div class="report-ar-table-wrap">
    <table class="report-ar-table report-accounting-ar-table">
      <thead>
        <tr>
          <th scope="col">Invoice number</th>
          <th scope="col">Customer</th>
          <th scope="col" class="text-end">Invoice amount</th>
          <th scope="col" class="text-end">AR payment</th>
          <th scope="col">Accounting staff</th>
        </tr>
      </thead>
      <tbody>
        ${reports.map((report) => `
          <tr>
            <td data-label="Invoice number">${escapeHtml(report.invoice_number || "Invoice")}</td>
            <td data-label="Customer">${escapeHtml(report.customer_name || "-")}</td>
            <td data-label="Invoice amount" class="text-end">${amount(report.amount_due)}</td>
            <td data-label="AR payment" class="text-end">${amount(report.collected_in_period)}</td>
            <td data-label="Accounting staff">${escapeHtml(report.accounting_staff || "-")}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  </div>
`;

const renderShiftArActivity = (reports) => `
  <section class="report-group">
    <h5>AR activity (${formatNumber(reports.length, 0)})</h5>
    ${reports.length
      ? renderCashierArTable(reports)
      : '<p class="report-empty-message">No AR invoices were recorded for this shift.</p>'}
  </section>
`;

const renderPrintDetails = (fields) => `
  <div class="shift-print-details">
    ${fields.map(([label, value]) => `<div><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value || "-")}</div>`).join("")}
  </div>
`;

const renderPrintShiftTable = (shifts, arReportsByShift) => {
  const rows = shifts.map((shift) => {
    const closed = Boolean(shift.closed_at) && shift.closing_cash !== null;
    const isClosed = Boolean(shift.closed_at);
    const expectedCash = parseFloat(shift.expected_cash) || 0;
    const difference = closed ? (parseFloat(shift.closing_cash) || 0) - expectedCash : null;
    const cashierCount = shift.cashier_closing_cash !== null && shift.cashier_closing_cash !== ""
      ? parseFloat(shift.cashier_closing_cash)
      : shift.supervisor_user_id ? null : closed ? parseFloat(shift.closing_cash) : null;
    const supervisorCount = shift.supervisor_user_id && closed ? parseFloat(shift.closing_cash) : null;
    const countDifference = cashierCount !== null && supervisorCount !== null
      ? supervisorCount - cashierCount
      : null;
    const arReports = arReportsByShift.get(getShiftKey(shift.shift_id)) || [];
    const arRows = arReports.map((report) => `
      <tr>
        <td>${escapeHtml(report.invoice_number || "Invoice")}</td>
        <td>${escapeHtml(report.customer_name || "-")}</td>
        <td class="text-end">${amount(report.amount_due)}</td>
      </tr>
    `).join("");
    const arTable = arReports.length > 0
      ? `<table class="table table-sm shift-print-ar-table">
          <thead><tr><th>Invoice</th><th>Customer</th><th class="text-end">Amount</th></tr></thead>
          <tbody>${arRows}</tbody>
        </table>`
      : "No AR invoices";

    return `<tr>
      <td>${renderPrintDetails([
        ["Cashier", shift.cashier || "Unknown cashier"],
        ["Terminal", shift.terminal_name || "Unknown terminal"],
        ["Schedule", shift.schedule_name || "No schedule"],
        ["Status", isClosed ? "Closed" : "Open"],
      ])}</td>
      <td>${renderPrintDetails([
        ["Opened", formatTime(shift.opened_at)],
        ["Closed", shift.closed_at ? formatTime(shift.closed_at) : "Open"],
      ])}</td>
      <td>${renderPrintDetails([
        ["Transactions", formatNumber(shift.transactions, 0)],
        ["Gross sales", amount(shift.gross_sales)],
        ["Paid at sale (POS)", amount(shift.paid_at_sale)],
        ["Charged to AR", amount(shift.ar_charged)],
      ])}</td>
      <td>${arTable}</td>
      <td>${renderPrintDetails([
        ["Void sales (count)", formatNumber(shift.void_transactions, 0)],
        ["Void sales (amount)", amount(shift.void_sales)],
        ["Void lines (count)", formatNumber(shift.void_line_count, 0)],
        ["Void lines (amount)", amount(shift.void_line_amount)],
        ["Cash drops (count)", formatNumber(shift.cash_drop_count, 0)],
        ["Cash drops (amount)", amount(shift.cash_drop)],
      ])}</td>
      <td>${renderPrintDetails([
        ["Starting cash / float", amount(shift.float_start)],
        ["Float added", amount(shift.float_added)],
        ["Float removed", amount(shift.float_removed)],
        ["Cash received", amount(shift.cash_received)],
        ["Change given", amount(shift.change_given)],
        ["Expected cash", amount(expectedCash)],
        ["Cashier count", cashierCount !== null ? amount(cashierCount) : "-"],
        ["Supervisor count", supervisorCount !== null ? amount(supervisorCount) : "-"],
        ["Count difference", countDifference !== null ? amount(countDifference) : "-"],
        ["Over / short", closed ? amount(difference) : "-"],
        ["Payment methods", shift.payment_summary || "-"],
      ])}</td>
      <td>${renderPrintDetails([
        ["Opening supervisor", shift.opening_supervisor_name || "-"],
        ["Closing supervisor", shift.supervisor_name || "-"],
      ])}</td>
    </tr>`;
  }).join("");

  return `<table class="table table-sm report-print-table shift-print-table">
    <thead><tr>
      <th>Register shift</th>
      <th>Shift times</th>
      <th>Sales</th>
      <th>Cashier AR invoices</th>
      <th>Voids and cash drops</th>
      <th>Cash reconciliation</th>
      <th>Supervisors</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="7" class="text-center">No register shifts match these filters.</td></tr>'}</tbody>
  </table>`;
};

document.addEventListener("DOMContentLoaded", async () => {
  let response;

  try {
    response = await axios.get(sessionAPI, {
      params: { operation: "getSession" },
    });
  } catch {
    Swal.fire("Connection error", "Your session could not be checked. Refresh the page and try again.", "error");
    return;
  }

  if (!response.data?.success || !response.data.user) {
    window.location.href = `${baseUrl}/index.html`;
    return;
  }

  const role = String(response.data.user.role_name || "").toUpperCase();
  cashierMode = document.body.dataset.reportView === "cashier" && role === "CASHIER";

  if (!cashierMode) {
    const todayString = formatDate(new Date());

    document.getElementById("shiftFrom").value = todayString;
    document.getElementById("shiftTo").value = todayString;
  }

  if (role == "CASHIER" || role == "SUPERVISOR") {
    userId = role == "CASHIER" ? response.data.user.user_id : "";

    if (role == "CASHIER") {
      const back = document.getElementById("back-pos");

      if (back) {
        back.href = posPage;
        back.classList.remove("d-none");
      }

      document.addEventListener("keydown", (e) => {
        if (e.key == "Escape") {
          window.location.href = posPage;
        }
      });
    }
  }

  document.getElementById("printBtn").addEventListener("click", () => {
    window.print();
  });

  if (cashierMode) {
    loadCashierShiftReport();
    return;
  }

  document.getElementById("shift-date-controls")?.classList.remove("d-none");
  document.getElementById("shift-filter-controls")?.classList.remove("d-none");
  document.getElementById("shiftBtn").addEventListener("click", () => {
    shiftPage = 1;
    accountingArPage = 1;
    loadShiftReport();
  });

  const refreshShiftFilters = () => {
    shiftPage = 1;
    accountingArPage = 1;
    displayShiftReport(shiftReports);
  };
  document.getElementById("shiftTerminal").addEventListener("change", refreshShiftFilters);
  document.getElementById("shiftCashier").addEventListener("input", refreshShiftFilters);
  document.getElementById("shiftStatus").addEventListener("change", refreshShiftFilters);

  loadShiftReport();
});

window.addEventListener("beforeprint", () => {
  printing = true;
  displayShiftReport(shiftReports);
});

window.addEventListener("afterprint", () => {
  printing = false;
  displayShiftReport(shiftReports);
});

const loadShiftReport = async () => {
  const dateFrom = document.getElementById("shiftFrom").value;
  const dateTo = document.getElementById("shiftTo").value;

  if (!dateFrom || !dateTo || dateFrom > dateTo) {
    Swal.fire("Invalid date range", "Choose a valid start date and an end date on or after it.", "warning");
    return;
  }

  const jsonData = {
    dateFrom: dateFrom,
    dateTo: dateTo,
    userId: userId,
  };

  try {
    const [shiftResponse, arResponse] = await Promise.all([
      axios.get(`${baseAPI}/shift.php`, {
        params: {
          operation: "getShiftReport",
          json: JSON.stringify(jsonData),
        },
      }),
      axios.get(`${baseAPI}/shift.php`, {
        params: {
          operation: "getShiftArDetails",
          json: JSON.stringify(jsonData),
        },
      }),
    ]);

    if (Array.isArray(shiftResponse.data) && Array.isArray(arResponse.data)) {
      shiftReports = shiftResponse.data;
      arReports = arResponse.data;
      populateTerminalFilter(shiftReports);
      displayShiftReport(shiftReports);
      return;
    }
  } catch {
    Swal.fire("Error", "Shift report could not be loaded. Check the connection and try again.", "error");
    return;
  }

  Swal.fire("Error", "Shift report returned an invalid response. Refresh the page and try again.", "error");
};

const loadCashierShiftReport = async () => {
  try {
    const sessionResponse = await axios.get(`${baseAPI}/shift.php`, {
      params: { operation: "getPosSession" },
    });
    const activeShift = sessionResponse.data?.shift;

    if (!activeShift?.shift_id) {
      shiftReports = [];
      arReports = [];
      displayShiftReport(shiftReports);
      return;
    }

    const openedDate = String(activeShift.opened_at || "").slice(0, 10);
    const reportRequest = { shiftId: activeShift.shift_id };
    const arRequest = {
      dateFrom: openedDate,
      dateTo: formatDate(new Date()),
      userId,
    };
    const [shiftResponse, arResponse] = await Promise.all([
      axios.get(`${baseAPI}/shift.php`, {
        params: {
          operation: "getShiftReport",
          json: JSON.stringify(reportRequest),
        },
      }),
      axios.get(`${baseAPI}/shift.php`, {
        params: {
          operation: "getShiftArDetails",
          json: JSON.stringify(arRequest),
        },
      }),
    ]);

    if (!Array.isArray(shiftResponse.data) || !Array.isArray(arResponse.data)) {
      throw new Error("The active shift report returned an invalid response.");
    }

    const activeShiftId = getShiftKey(activeShift.shift_id);
    shiftReports = shiftResponse.data.filter((shift) => {
      return getShiftKey(shift.shift_id) === activeShiftId && isOpenShift(shift);
    });
    arReports = arResponse.data;
    displayShiftReport(shiftReports);
  } catch (error) {
    console.error("Unable to load the active cashier shift report:", error);
    document.getElementById("printBtn").classList.add("d-none");
    document.getElementById("shift-div").innerHTML = `
      <p class="shift-report-empty">Unable to load the active shift report. Return to POS and try again.</p>
    `;
  }
};

const populateTerminalFilter = (shifts) => {
  const select = document.getElementById("shiftTerminal");
  const previousValue = select.value;
  const terminals = new Map();

  shifts.forEach((shift) => {
    const terminalName = String(shift.terminal_name || "").trim();

    if (terminalName) {
      terminals.set(terminalName, terminalName);
    } else {
      terminals.set(unknownTerminalValue, "Unknown terminal");
    }
  });

  select.replaceChildren(new Option("All terminals", ""));
  [...terminals.entries()]
    .sort((first, second) => first[1].localeCompare(second[1]))
    .forEach(([value, label]) => {
      select.add(new Option(label, value));
    });

  if ([...terminals.keys()].includes(previousValue)) {
    select.value = previousValue;
  }
};

const getFilteredShifts = (shifts) => {
  const terminal = document.getElementById("shiftTerminal").value;
  const cashierQuery = document.getElementById("shiftCashier").value.trim().toLocaleLowerCase();
  const status = document.getElementById("shiftStatus").value;

  return shifts.filter((shift) => {
    const terminalName = String(shift.terminal_name || "").trim();
    const cashierName = String(shift.cashier || "").toLocaleLowerCase();
    const isClosed = Boolean(shift.closed_at);

    if (terminal && terminal !== unknownTerminalValue && terminalName !== terminal) {
      return false;
    }

    if (terminal === unknownTerminalValue && terminalName) {
      return false;
    }

    if (cashierQuery && !cashierName.includes(cashierQuery)) {
      return false;
    }

    if (status === "open" && isClosed) {
      return false;
    }

    if (status === "closed" && !isClosed) {
      return false;
    }

    return true;
  });
};

const getShiftKey = (shiftId) => {
  return shiftId === null || shiftId === undefined || shiftId === ""
    ? null
    : String(shiftId);
};

const isOpenShift = (shift) => {
  return String(shift.status || "").toUpperCase() === "OPEN" && !shift.closed_at;
};

const getFilteredArReports = (shifts, filteredShifts, reports) => {
  const allShiftIds = new Set(shifts.map((shift) => getShiftKey(shift.shift_id)));
  const filteredShiftIds = new Set(filteredShifts.map((shift) => getShiftKey(shift.shift_id)));
  const terminal = document.getElementById("shiftTerminal").value;
  const cashierQuery = document.getElementById("shiftCashier").value.trim().toLocaleLowerCase();
  const status = document.getElementById("shiftStatus").value;

  return reports.filter((report) => {
    const shiftId = getShiftKey(report.shift_id);

    if (shiftId && allShiftIds.has(shiftId)) {
      return filteredShiftIds.has(shiftId);
    }

    const terminalName = String(report.terminal_name || "").trim();
    const cashierName = String(report.cashier || "").toLocaleLowerCase();
    const shiftStatus = String(report.shift_status || "").toUpperCase();

    if (terminal && terminal !== unknownTerminalValue && terminalName !== terminal) {
      return false;
    }

    if (terminal === unknownTerminalValue && terminalName) {
      return false;
    }

    if (cashierQuery && !cashierName.includes(cashierQuery)) {
      return false;
    }

    if (shiftStatus && status === "open" && shiftStatus !== "OPEN") {
      return false;
    }

    if (shiftStatus && status === "closed" && shiftStatus === "OPEN") {
      return false;
    }

    return true;
  });
};

const displayShiftReport = (shifts) => {
  const main = document.getElementById("shift-div");

  main.innerHTML = "";

  const filteredShifts = cashierMode
    ? shifts.filter(isOpenShift)
    : getFilteredShifts(shifts);
  const { rows, current } = paginate(filteredShifts, shiftPage);

  shiftPage = current;
  const visible = printing ? filteredShifts : rows;
  const allShiftIds = new Set(shifts.map((shift) => getShiftKey(shift.shift_id)));
  const filteredArReports = cashierMode
    ? arReports.filter((report) => allShiftIds.has(getShiftKey(report.shift_id)))
    : getFilteredArReports(shifts, filteredShifts, arReports);
  const accountingArReports = cashierMode
    ? []
    : filteredArReports.filter((report) => (parseFloat(report.collected_in_period) || 0) > 0);
  const { rows: accountingArRows, current: accountingArCurrent } = paginate(
    accountingArReports,
    accountingArPage,
  );

  accountingArPage = accountingArCurrent;
  const visibleAccountingArReports = printing ? accountingArReports : accountingArRows;
  const arReportsByShift = new Map();

  filteredArReports.forEach((report) => {
    const shiftId = getShiftKey(report.shift_id);

    if ((parseFloat(report.charged_to_ar) || 0) > 0 && shiftId !== null && allShiftIds.has(shiftId)) {
      const reportsForShift = arReportsByShift.get(shiftId) || [];
      reportsForShift.push(report);
      arReportsByShift.set(shiftId, reportsForShift);
    }
  });

  let transactions = 0;
  let grossSales = 0;
  let paidAtSale = 0;
  let chargedToAr = 0;
  let voidTransactions = 0;
  let voidSales = 0;
  let voidLineCount = 0;
  let voidLineAmount = 0;
  let cashDropCount = 0;
  let cashDrop = 0;
  let arCollectedAmount = 0;

  filteredShifts.forEach((shift) => {
    transactions += parseInt(shift.transactions, 10) || 0;
    grossSales += parseFloat(shift.gross_sales) || 0;
    paidAtSale += parseFloat(shift.paid_at_sale) || 0;
    chargedToAr += parseFloat(shift.ar_charged) || 0;
    voidTransactions += parseInt(shift.void_transactions, 10) || 0;
    voidSales += parseFloat(shift.void_sales) || 0;
    voidLineCount += parseInt(shift.void_line_count, 10) || 0;
    voidLineAmount += parseFloat(shift.void_line_amount) || 0;
    cashDropCount += parseInt(shift.cash_drop_count, 10) || 0;
    cashDrop += parseFloat(shift.cash_drop) || 0;
  });

  filteredArReports.forEach((report) => {
    arCollectedAmount += parseFloat(report.collected_in_period) || 0;
  });

  const list = document.createElement("div");
  list.classList.add("shift-report-list");

  if (cashierMode) {
    document.getElementById("printBtn").classList.toggle("d-none", filteredShifts.length === 0);
  }

  if (printing) {
    list.innerHTML = renderPrintShiftTable(filteredShifts, arReportsByShift);
  }

  if (!printing && visible.length == 0) {
    list.innerHTML = cashierMode
      ? '<p class="shift-report-empty">This report is available only while you have an open register shift. Closed shifts are not shown.</p>'
      : accountingArReports.length
        ? '<p class="shift-report-empty">No register shifts match these filters. AR payments recorded by Accounting are listed below.</p>'
        : '<p class="shift-report-empty">No shifts match this date range and filter selection.</p>';
  }

  if (!printing) visible.forEach((shift) => {
    const closed = Boolean(shift.closed_at) && shift.closing_cash !== null;
    const isClosed = Boolean(shift.closed_at);
    const expectedCash = parseFloat(shift.expected_cash) || 0;
    const difference = closed ? (parseFloat(shift.closing_cash) || 0) - expectedCash : null;
    const cashierCount = shift.cashier_closing_cash !== null && shift.cashier_closing_cash !== ""
      ? parseFloat(shift.cashier_closing_cash)
      : shift.supervisor_user_id ? null : closed ? parseFloat(shift.closing_cash) : null;
    const supervisorCount = shift.supervisor_user_id && closed ? parseFloat(shift.closing_cash) : null;
    const countDifference = cashierCount !== null && supervisorCount !== null
      ? supervisorCount - cashierCount
      : null;
    const shiftArReports = arReportsByShift.get(getShiftKey(shift.shift_id)) || [];
    const card = document.createElement("article");
    card.classList.add("shift-report-card");
    card.innerHTML = `
      <header class="shift-report-card-header">
        <div>
          <p class="report-eyebrow">Register shift</p>
          <h4>${escapeHtml(shift.cashier || "Unknown cashier")}</h4>
          <div class="report-meta">
            ${escapeHtml(shift.terminal_name || "Unknown terminal")} · ${escapeHtml(shift.schedule_name || "No schedule")}
          </div>
        </div>
        <span class="report-status${isClosed ? " is-closed" : ""}">${isClosed ? "Closed" : "Open"}</span>
      </header>
      <section class="report-group">
        <h5>Shift times</h5>
        <dl class="report-fields">
          ${renderReportFields([
            { label: "Opened", value: formatTime(shift.opened_at) },
            { label: "Closed", value: shift.closed_at ? formatTime(shift.closed_at) : "Open" },
          ])}
        </dl>
      </section>
      <section class="report-group">
        <h5>Sales</h5>
        <dl class="report-fields">
          ${renderReportFields([
            { label: "Transactions", value: formatNumber(shift.transactions, 0) },
            { label: "Gross sales", value: amount(shift.gross_sales) },
            { label: "Paid at sale (POS)", value: amount(shift.paid_at_sale) },
            { label: "Charged to AR", value: amount(shift.ar_charged) },
          ])}
        </dl>
      </section>
      ${renderShiftArActivity(shiftArReports)}
      <section class="report-group">
        <h5>Voids and cash drops</h5>
        <dl class="report-fields">
          ${renderReportFields([
            { label: "Void sales (count)", value: formatNumber(shift.void_transactions, 0) },
            { label: "Void sales (amount)", value: amount(shift.void_sales) },
            { label: "Void lines (count)", value: formatNumber(shift.void_line_count, 0) },
            { label: "Void lines (amount)", value: amount(shift.void_line_amount) },
            { label: "Cash drops (count)", value: formatNumber(shift.cash_drop_count, 0) },
            { label: "Cash drops (amount)", value: amount(shift.cash_drop) },
          ])}
        </dl>
      </section>
      <section class="report-group">
        <h5>Cash reconciliation</h5>
        <dl class="report-fields">
          ${renderReportFields([
            { label: "Starting cash / float", value: amount(shift.float_start) },
            { label: "Float added", value: amount(shift.float_added) },
            { label: "Float removed", value: amount(shift.float_removed) },
            { label: "Cash received", value: amount(shift.cash_received) },
            { label: "Change given", value: amount(shift.change_given) },
            { label: "Expected cash", value: amount(expectedCash) },
            { label: "Cashier count", value: cashierCount !== null ? amount(cashierCount) : "-" },
            { label: "Supervisor count", value: supervisorCount !== null ? amount(supervisorCount) : "-" },
            { label: "Count difference", value: countDifference !== null ? amount(countDifference) : "-", danger: countDifference < 0 },
            { label: "Over / short", value: closed ? amount(difference) : "-", danger: difference < 0 },
            { label: "Payment methods", value: escapeHtml(shift.payment_summary || "-"), wide: true },
          ])}
        </dl>
      </section>
      <section class="report-group">
        <h5>Supervisors</h5>
        <dl class="report-fields">
          ${renderReportFields([
            { label: "Opening supervisor", value: escapeHtml(shift.opening_supervisor_name || "-") },
            { label: "Closing supervisor", value: escapeHtml(shift.supervisor_name || "-") },
          ])}
        </dl>
      </section>
    `;

    list.appendChild(card);
  });

  if (accountingArReports.length > 0) {
    if (printing) {
      list.insertAdjacentHTML("beforeend", `
        <section class="report-print-section">
          <h3>AR activity paid through Accounting</h3>
          ${renderAccountingArTable(accountingArReports)}
        </section>
      `);
    } else {
      const accountingCard = document.createElement("article");
      accountingCard.classList.add("shift-report-card", "report-accounting-ar");
      accountingCard.innerHTML = `
        <header class="shift-report-card-header">
          <div>
            <p class="report-eyebrow">Accounting AR collections</p>
            <h4>AR activity paid through Accounting</h4>
            <div class="report-meta">This table lists customer payments against AR invoices recorded by Accounting during the selected period.</div>
          </div>
        </header>
        ${renderAccountingArTable(visibleAccountingArReports)}
      `;

      const pagination = createPagination(accountingArReports.length, accountingArPage, (page) => {
        accountingArPage = page;
        displayShiftReport(shifts);
      });
      pagination.classList.add("shift-report-pagination");
      accountingCard.appendChild(pagination);

      list.appendChild(accountingCard);
    }
  }

  main.appendChild(list);

  if (!cashierMode && (filteredShifts.length > 0 || filteredArReports.length > 0)) {
    main.insertAdjacentHTML("beforeend", renderReportSummary("Totals for matching shifts and AR activity", [
      { label: "Transactions", value: formatNumber(transactions, 0) },
      { label: "Gross sales", value: amount(grossSales) },
      { label: "Paid at sale (POS)", value: amount(paidAtSale) },
      { label: "Charged to AR", value: amount(chargedToAr) },
      { label: "Void sales (count)", value: formatNumber(voidTransactions, 0) },
      { label: "Void sales (amount)", value: amount(voidSales) },
      { label: "Void lines (count)", value: formatNumber(voidLineCount, 0) },
      { label: "Void lines (amount)", value: amount(voidLineAmount) },
      { label: "Cash drops (count)", value: formatNumber(cashDropCount, 0) },
      { label: "Cash drops (amount)", value: amount(cashDrop) },
      { label: "AR payments collected", value: amount(arCollectedAmount) },
    ]));
  }

  if (!printing && !cashierMode) {
    const pagination = createPagination(filteredShifts.length, shiftPage, (page) => {
      shiftPage = page;
      displayShiftReport(shifts);
    });
    pagination.classList.add("shift-report-pagination");
    main.appendChild(pagination);
  }
};
