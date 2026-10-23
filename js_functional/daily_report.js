import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI, sessionAPI, baseUrl } from "../js/config.js";
import { formatCurrency, formatNumber } from "../js/module/number_format.js";

const posPage = "pos.html";

sessionStorage.setItem("baseAPI", baseAPI);

let shiftPage = 1;
let reportData = null;
let printing = false;

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

  if (role == "SUPERVISOR") {
    const back = document.getElementById("back-pos");

    back.href = posPage;
    back.classList.remove("d-none");

    document.addEventListener("keydown", (e) => {
      if (e.key == "Escape") {
        window.location.href = posPage;
      }
    });
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
  printing = true;
  displayShiftTable(reportData ? reportData.shifts : []);
});

window.addEventListener("afterprint", () => {
  printing = false;
  displayShiftTable(reportData ? reportData.shifts : []);
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
  displayShiftTable(report.shifts);
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
    ["Starting Float", amount(drawer.starting_float)],
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

const displayShiftTable = (shifts) => {
  const main = document.getElementById("shift-div");

  main.innerHTML = "";

  const { rows, current } = paginate(shifts, shiftPage);

  shiftPage = current;

  const visible = printing ? shifts : rows;
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
        <th class="text-end">Starting Float</th>
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

  if (visible.length == 0) {
    tBody.innerHTML = '<tr><td colspan="21" class="text-center">No register shifts opened on this date.</td></tr>';
  }

  visible.forEach((shift) => {
    const closed = Boolean(shift.closed_at) && shift.closing_cash !== null && shift.closing_cash !== "";
    const expected = parseFloat(shift.expected_cash) || 0;
    const counted = closed ? parseFloat(shift.closing_cash) || 0 : null;
    const variance = closed ? counted - expected : null;
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

  if (!printing) {
    main.appendChild(createPagination(shifts.length, shiftPage, (page) => {
      shiftPage = page;
      displayShiftTable(shifts);
    }));
  }
};
