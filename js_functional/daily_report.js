import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI, sessionAPI, baseUrl } from "../js/config.js";
import { formatCurrency, formatNumber } from "../js/module/number_format.js";
import { addPrintSummaryTables, removePrintSummaryTables } from "../js/module/report_print.js";

sessionStorage.setItem("baseAPI", baseAPI);

let shiftPage = 1;
let reportData = null;

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

const number = (value) => {
  return formatNumber(parseInt(value, 10) || 0, 0);
};

document.addEventListener("DOMContentLoaded", async () => {
  const dateInput = document.getElementById("dailyDate");

  if (!dateInput) {
    return;
  }

  dateInput.value = formatDate(new Date());

  const response = await axios.get(sessionAPI, {
    params: { operation: "getSession" },
  });

  if (!response.data.success) {
    window.location.href = `${baseUrl}/index.html`;
    return;
  }

  const role = response.data.user.role_name.toUpperCase();

  if (!["ADMIN", "ACCOUNTING", "SUPERVISOR"].includes(role)) {
    return;
  }

  document.getElementById("dailyBtn").addEventListener("click", () => {
    shiftPage = 1;
    loadDailyReport();
  });
  document.getElementById("printBtn").addEventListener("click", () => {
    window.print();
  });

  loadDailyReport();
});

window.addEventListener("beforeprint", () => {
  displayShiftTable(reportData ? reportData.shifts : []);
  addPrintSummaryTables();
});

window.addEventListener("afterprint", () => {
  removePrintSummaryTables();
  displayShiftCards(reportData ? reportData.shifts : []);
});

const loadDailyReport = async () => {
  const jsonData = {
    date: document.getElementById("dailyDate").value,
  };

  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: {
      operation: "getDailyReport",
      json: JSON.stringify(jsonData),
    },
  });

  if (response.status == 200 && response.data.summary) {
    reportData = response.data;
    displayDailyReport(reportData);
  } else {
    Swal.fire("Error", "Daily Z-report could not be loaded.", "error");
  }
};

const displayDailyReport = (report) => {
  document.getElementById("report-date").textContent = report.date;
  displaySummary(report.summary);
  displayPaymentMethods(report.paymentMethods);
  displayCashDrawer(report.drawer);
  displayShiftCards(report.shifts);
};

const displaySummary = (summary) => {
  const main = document.getElementById("sales-summary");
  const cards = [
    { title: "Completed Transactions", value: number(summary.transactions) },
    { title: "Gross Sales", value: amount(summary.gross_sales) },
    { title: "Paid at Sale (POS)", value: amount(summary.paid_at_sale) },
    { title: "Charged to AR", value: amount(summary.ar_charged) },
    { title: "VATable Sales", value: amount(summary.vatable_sales) },
    { title: "VAT (12%)", value: amount(summary.vat_amount) },
    { title: "Void Sales (Count)", value: number(summary.void_count) },
    { title: "Void Sales (Amount)", value: amount(summary.void_sales) },
    { title: "Void Lines (Count)", value: number(summary.void_line_count) },
    { title: "Void Lines (Amount)", value: amount(summary.void_line_amount) },
  ];

  main.innerHTML = cards.map((card) => `
    <div class="col-12 col-sm-6 col-xl-4">
      <div class="card h-100 bg-dark text-light border-secondary">
        <div class="card-body">
          <div class="small text-secondary">${card.title}</div>
          <div class="fs-4 fw-semibold">${card.value}</div>
        </div>
      </div>
    </div>
  `).join("");

  document.getElementById("sales-details").innerHTML = `
    <div class="table-responsive">
      <table class="table table-dark table-sm mb-0">
        <tbody>
          <tr><th>Paid at sale (POS)</th><td class="text-end">${amount(summary.paid_at_sale)}</td></tr>
          <tr><th>Charged to AR</th><td class="text-end">${amount(summary.ar_charged)}</td></tr>
          <tr><th>Walk-in transactions</th><td class="text-end">${number(summary.walk_in_transactions)}</td></tr>
          <tr><th>Customers charged to AR</th><td class="text-end">${number(summary.ar_customers)}</td></tr>
          <tr>
            <th>AR payments collected on report date</th>
            <td class="text-end">${amount(summary.ar_collected)}</td>
          </tr>
          <tr><th>Void lines (count)</th><td class="text-end">${number(summary.void_line_count)}</td></tr>
          <tr><th>Void lines (amount)</th><td class="text-end">${amount(summary.void_line_amount)}</td></tr>
        </tbody>
      </table>
    </div>
  `;
};

const displayPaymentMethods = (methods) => {
  const main = document.getElementById("payment-methods");
  const rows = methods.map((method) => `
    <tr>
      <td>${escapeHtml(method.method_name)}</td>
      <td class="text-end">${amount(method.amount_applied)}</td>
    </tr>
  `).join("");
  const totalPayments = methods.reduce((sum, method) => {
    return sum + (parseFloat(method.amount_applied) || 0);
  }, 0);
  const footer = methods.length > 0 ? `
    <tfoot>
      <tr class="fw-bold">
        <td>Total POS Payments</td>
        <td class="text-end">${amount(totalPayments)}</td>
      </tr>
    </tfoot>
  ` : "";

  main.innerHTML = `
    <div class="table-responsive">
      <table class="table table-dark table-striped table-sm mb-0">
        <thead><tr><th>Payment Method</th><th class="text-end">Collected</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="2" class="text-center">No POS payments found.</td></tr>'}</tbody>
        ${footer}
      </table>
    </div>
  `;
};

const displayCashDrawer = (drawer) => {
  const variance = drawer.over_short === null
    ? "Waiting for all shifts to close"
    : amount(drawer.over_short);
  const details = [
    ["Starting Cash / Float", amount(drawer.starting_float)],
    ["Float Added", amount(drawer.float_added)],
    ["Float Removed", amount(drawer.float_removed)],
    ["Cash Tendered", amount(drawer.cash_received)],
    ["Change Given", amount(drawer.change_given)],
    ["Cash Drops (count)", number(drawer.cash_drop_count)],
    ["Cash Drops (amount)", amount(drawer.cash_drop)],
    ["Expected Cash", amount(drawer.expected_cash)],
    ["Cash Counted", amount(drawer.counted_cash)],
    ["Over / Short", variance],
    ["Closed Shifts", `${number(drawer.closed_shifts)} / ${number(drawer.total_shifts)}`],
  ];

  document.getElementById("cash-drawer-summary").innerHTML = `
    <div class="table-responsive">
      <table class="table table-dark table-striped table-sm mb-0">
        <tbody>
          ${details.map(([label, value]) => {
            return `<tr><th>${label}</th><td class="text-end">${value}</td></tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
};

const getShiftCashDetails = (shift) => {
  const closed = Boolean(shift.closed_at) && shift.closing_cash !== null && shift.closing_cash !== "";
  const expected = parseFloat(shift.expected_cash) || 0;
  const counted = closed ? parseFloat(shift.closing_cash) || 0 : null;
  const variance = closed ? counted - expected : null;

  return { expected, counted, variance };
};

const renderShiftFields = (fields) => fields.map(({ label, value, wide = false, danger = false }) => `
  <div class="report-field${wide ? " report-field-wide" : ""}">
    <dt>${escapeHtml(label)}</dt>
    <dd${danger ? ' class="text-danger"' : ""}>${escapeHtml(value)}</dd>
  </div>
`).join("");

const renderShiftCard = (shift) => {
  const { expected, counted, variance } = getShiftCashDetails(shift);
  const isClosed = Boolean(shift.closed_at);
  const card = document.createElement("article");

  card.classList.add("shift-report-card");
  card.innerHTML = `
    <header class="shift-report-card-header">
      <div>
        <p class="report-eyebrow">Register shift</p>
        <h4>${escapeHtml(shift.cashier || "Unknown cashier")}</h4>
        <div class="report-meta">
          ${escapeHtml(shift.terminal_name || "Unknown terminal")}${shift.schedule_name ? ` | ${escapeHtml(shift.schedule_name)}` : ""}
        </div>
      </div>
      <span class="report-status${isClosed ? " is-closed" : ""}">${isClosed ? "Closed" : "Open"}</span>
    </header>
    <section class="report-group">
      <h5>Shift times</h5>
      <dl class="report-fields">
        ${renderShiftFields([
          { label: "Opened", value: formatTime(shift.opened_at) },
          { label: "Closed", value: shift.closed_at ? formatTime(shift.closed_at) : "Open" },
        ])}
      </dl>
    </section>
    <section class="report-group">
      <h5>Sales</h5>
      <dl class="report-fields">
        ${renderShiftFields([
          { label: "Transactions", value: number(shift.transactions) },
          { label: "Gross sales", value: amount(shift.gross_sales) },
          { label: "Paid at sale (POS)", value: amount(shift.paid_at_sale) },
          { label: "Charged to AR", value: amount(shift.ar_charged) },
          { label: "Void sales (count)", value: number(shift.void_transactions) },
          { label: "Void sales (amount)", value: amount(shift.void_sales) },
          { label: "Void lines (count)", value: number(shift.void_line_count) },
          { label: "Void lines (amount)", value: amount(shift.void_line_amount) },
        ])}
      </dl>
    </section>
    <section class="report-group">
      <h5>Cash reconciliation</h5>
      <dl class="report-fields">
        ${renderShiftFields([
          { label: "Starting cash / float", value: amount(shift.float_start) },
          { label: "Cash tendered", value: amount(shift.cash_received) },
          { label: "Change", value: amount(shift.change_given) },
          { label: "Cash drops (count)", value: number(shift.cash_drop_count) },
          { label: "Cash drops (amount)", value: amount(shift.cash_drop) },
          { label: "Expected cash", value: amount(expected) },
          { label: "Counted cash", value: counted !== null ? amount(counted) : "-" },
          { label: "Over / short", value: variance !== null ? amount(variance) : "-", danger: variance < 0 },
          { label: "Payment methods", value: shift.payment_summary || "-", wide: true },
        ])}
      </dl>
    </section>
  `;

  return card;
};

const displayShiftCards = (shifts) => {
  const main = document.getElementById("shift-div");
  const { rows, current } = paginate(shifts, shiftPage);

  shiftPage = current;
  main.innerHTML = "";

  if (rows.length === 0) {
    main.innerHTML = '<p class="shift-report-empty">No register shifts opened on this date.</p>';
  } else {
    rows.forEach((shift) => main.appendChild(renderShiftCard(shift)));
  }

  if (shifts.length > 0) {
    const pagination = createPagination(shifts.length, shiftPage, (page) => {
      shiftPage = page;
      displayShiftCards(shifts);
    });
    pagination.classList.add("shift-report-pagination");
    main.appendChild(pagination);
  }
};

const displayShiftTable = (shifts) => {
  const main = document.getElementById("shift-div");
  main.innerHTML = "";

  const table = document.createElement("table");
  table.classList.add("table", "table-dark", "table-hover", "table-striped", "table-sm", "report-table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Cashier</th>
        <th>Terminal</th>
        <th>Opened</th>
        <th>Closed</th>
        <th class="text-end">Transactions</th>
        <th class="text-end">Gross Sales</th>
        <th class="text-end">Paid at Sale (POS)</th>
        <th class="text-end">Void Sales (Count)</th>
        <th class="text-end">Void Sales (Amount)</th>
        <th class="text-end">Void Lines (Count)</th>
        <th class="text-end">Void Lines (Amount)</th>
        <th class="text-end">Charged to AR</th>
        <th>Payment Methods</th>
        <th class="text-end">Starting Cash / Float</th>
        <th class="text-end">Cash Tendered</th>
        <th class="text-end">Change</th>
        <th class="text-end">Cash Drops (Count)</th>
        <th class="text-end">Cash Drops (Amount)</th>
        <th class="text-end">Expected Cash</th>
        <th class="text-end">Counted Cash</th>
        <th class="text-end">Over / Short</th>
      </tr>
    </thead>
  `;

  const tBody = document.createElement("tbody");

  if (shifts.length == 0) {
    tBody.innerHTML = '<tr><td colspan="21" class="text-center">No register shifts opened on this date.</td></tr>';
  }

  shifts.forEach((shift) => {
    const { expected, counted, variance } = getShiftCashDetails(shift);
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(shift.cashier)}</td>
      <td>${escapeHtml(shift.terminal_name)}</td>
      <td>${formatTime(shift.opened_at)}</td>
      <td>${shift.closed_at ? formatTime(shift.closed_at) : "OPEN"}</td>
      <td class="text-end">${number(shift.transactions)}</td>
      <td class="text-end">${amount(shift.gross_sales)}</td>
      <td class="text-end">${amount(shift.paid_at_sale)}</td>
      <td class="text-end">${number(shift.void_transactions)}</td>
      <td class="text-end">${amount(shift.void_sales)}</td>
      <td class="text-end">${number(shift.void_line_count)}</td>
      <td class="text-end">${amount(shift.void_line_amount)}</td>
      <td class="text-end">${amount(shift.ar_charged)}</td>
      <td>${escapeHtml(shift.payment_summary || "-")}</td>
      <td class="text-end">${amount(shift.float_start)}</td>
      <td class="text-end">${amount(shift.cash_received)}</td>
      <td class="text-end">${amount(shift.change_given)}</td>
      <td class="text-end">${number(shift.cash_drop_count)}</td>
      <td class="text-end">${amount(shift.cash_drop)}</td>
      <td class="text-end">${amount(expected)}</td>
      <td class="text-end">${counted !== null ? amount(counted) : "-"}</td>
      <td class="text-end ${variance < 0 ? "text-danger" : ""}">${variance !== null ? amount(variance) : "-"}</td>
    `;

    tBody.appendChild(row);
  });

  table.appendChild(tBody);
  main.appendChild(table);
};
