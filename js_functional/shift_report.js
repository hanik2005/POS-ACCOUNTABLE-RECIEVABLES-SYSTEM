import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI, sessionAPI, baseUrl } from "../js/config.js";
import { formatCurrency, formatNumber } from "../js/module/number_format.js";

const posPage = "pos.html";

sessionStorage.setItem("baseAPI", baseAPI);

let userId = "";
let shiftPage = 1;
let arPage = 1;
let shiftReports = [];
let arReports = [];
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

document.addEventListener("DOMContentLoaded", async () => {
  const todayString = formatDate(new Date());

  document.getElementById("shiftFrom").value = todayString;
  document.getElementById("shiftTo").value = todayString;

  const response = await axios.get(sessionAPI, {
    params: { operation: "getSession" },
  });

  if (!response.data.success) {
    window.location.href = `${baseUrl}/index.html`;
    return;
  }

  const role = response.data.user.role_name.toUpperCase();

  if (role == "CASHIER" || role == "SUPERVISOR") {
    userId = role == "CASHIER" ? response.data.user.user_id : "";
    const back = document.getElementById("back-pos");

    back.href = posPage;
    back.classList.remove("d-none");

    document.addEventListener("keydown", (e) => {
      if (e.key == "Escape") {
        window.location.href = posPage;
      }
    });
  }

  document.getElementById("shiftBtn").addEventListener("click", () => {
    shiftPage = 1;
    arPage = 1;
    loadShiftReport();
  });
  document.getElementById("printBtn").addEventListener("click", () => {
    window.print();
  });

  loadShiftReport();
});

window.addEventListener("beforeprint", () => {
  printing = true;
  displayShiftTable(shiftReports);
  displayArTable(arReports);
});

window.addEventListener("afterprint", () => {
  printing = false;
  displayShiftTable(shiftReports);
  displayArTable(arReports);
});

const loadShiftReport = async () => {
  const jsonData = {
    dateFrom: document.getElementById("shiftFrom").value,
    dateTo: document.getElementById("shiftTo").value,
    userId: userId,
  };

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

  if (shiftResponse.status == 200 && arResponse.status == 200) {
    shiftReports = shiftResponse.data;
    arReports = arResponse.data;
    displayShiftTable(shiftReports);
    displayArTable(arReports);
  } else {
    Swal.fire("Error", "Shift report could not be loaded.", "error");
  }
};

const displayShiftTable = (shifts) => {
  const main = document.getElementById("shift-div");

  main.innerHTML = "";

  const { rows, current } = paginate(shifts, shiftPage);

  shiftPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-dark", "table-hover", "table-striped", "table-sm", "report-table");

  table.innerHTML = `
    <thead>
      <tr>
        <th>Cashier</th>
        <th>Terminal</th>
        <th>Schedule</th>
        <th>Opened</th>
        <th>Closed</th>
        <th class="text-end">Transactions</th>
        <th class="text-end">Gross Sales</th>
        <th class="text-end">Paid at Sale (POS)</th>
        <th class="text-end">Charged to AR</th>
        <th class="text-end">Void Sales (Count)</th>
        <th class="text-end">Void Sales (Amount)</th>
        <th class="text-end">Void Lines (Count)</th>
        <th class="text-end">Void Lines (Amount)</th>
        <th class="text-end">Cash Drops (Count)</th>
        <th class="text-end">Cash Drops (Amount)</th>
        <th class="text-end">Starting Float</th>
        <th class="text-end">Float Added</th>
        <th class="text-end">Float Removed</th>
        <th class="text-end">Cash Received</th>
        <th class="text-end">Change Given</th>
        <th>Payment Methods</th>
        <th class="text-end">Expected Cash</th>
        <th class="text-end">Cashier Count</th>
        <th class="text-end">Supervisor Count</th>
        <th>Opening Supervisor</th>
        <th>Closing Supervisor</th>
        <th class="text-end">Count Difference</th>
        <th class="text-end">Over / Short</th>
      </tr>
    </thead>
  `;

  const tBody = document.createElement("tbody");
  const visible = printing ? shifts : rows;
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

  shifts.forEach((shift) => {
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

  if (visible.length == 0) {
    tBody.innerHTML = '<tr><td colspan="28" class="text-center">No shifts found for this date range.</td></tr>';
  }

  visible.forEach((shift) => {
    const closed = Boolean(shift.closed_at) && shift.closing_cash !== null;
    const expectedCash = parseFloat(shift.expected_cash) || 0;
    const difference = closed ? (parseFloat(shift.closing_cash) || 0) - expectedCash : null;
    const cashierCount = shift.cashier_closing_cash !== null && shift.cashier_closing_cash !== ""
      ? parseFloat(shift.cashier_closing_cash)
      : shift.supervisor_user_id ? null : closed ? parseFloat(shift.closing_cash) : null;
    const supervisorCount = shift.supervisor_user_id && closed ? parseFloat(shift.closing_cash) : null;
    const countDifference = cashierCount !== null && supervisorCount !== null
      ? supervisorCount - cashierCount
      : null;
    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${escapeHtml(shift.cashier)}</td>
      <td>${escapeHtml(shift.terminal_name)}</td>
      <td>${escapeHtml(shift.schedule_name)}</td>
      <td>${formatTime(shift.opened_at)}</td>
      <td>${shift.closed_at ? formatTime(shift.closed_at) : "OPEN"}</td>
      <td class="text-end">${formatNumber(shift.transactions, 0)}</td>
      <td class="text-end">${amount(shift.gross_sales)}</td>
      <td class="text-end">${amount(shift.paid_at_sale)}</td>
      <td class="text-end">${amount(shift.ar_charged)}</td>
      <td class="text-end">${formatNumber(shift.void_transactions, 0)}</td>
      <td class="text-end">${amount(shift.void_sales)}</td>
      <td class="text-end">${formatNumber(shift.void_line_count, 0)}</td>
      <td class="text-end">${amount(shift.void_line_amount)}</td>
      <td class="text-end">${formatNumber(shift.cash_drop_count, 0)}</td>
      <td class="text-end">${amount(shift.cash_drop)}</td>
      <td class="text-end">${amount(shift.float_start)}</td>
      <td class="text-end">${amount(shift.float_added)}</td>
      <td class="text-end">${amount(shift.float_removed)}</td>
      <td class="text-end">${amount(shift.cash_received)}</td>
      <td class="text-end">${amount(shift.change_given)}</td>
      <td>${escapeHtml(shift.payment_summary || "-")}</td>
      <td class="text-end">${amount(expectedCash)}</td>
      <td class="text-end">${cashierCount !== null ? amount(cashierCount) : "-"}</td>
      <td class="text-end">${supervisorCount !== null ? amount(supervisorCount) : "-"}</td>
      <td>${escapeHtml(shift.opening_supervisor_name || "-")}</td>
      <td>${escapeHtml(shift.supervisor_name || "-")}</td>
      <td class="text-end ${countDifference < 0 ? "text-danger" : ""}">
        ${countDifference !== null ? amount(countDifference) : "-"}
      </td>
      <td class="text-end ${difference < 0 ? "text-danger" : ""}">${closed ? amount(difference) : "-"}</td>
    `;

    tBody.appendChild(row);
  });

  if (shifts.length > 0) {
    const totalRow = document.createElement("tr");
    totalRow.classList.add("fw-bold");
    totalRow.innerHTML = `
      <td colspan="5">TOTAL</td>
      <td class="text-end">${formatNumber(transactions, 0)}</td>
      <td class="text-end">${amount(grossSales)}</td>
      <td class="text-end">${amount(paidAtSale)}</td>
      <td class="text-end">${amount(chargedToAr)}</td>
      <td class="text-end">${formatNumber(voidTransactions, 0)}</td>
      <td class="text-end">${amount(voidSales)}</td>
      <td class="text-end">${formatNumber(voidLineCount, 0)}</td>
      <td class="text-end">${amount(voidLineAmount)}</td>
      <td class="text-end">${formatNumber(cashDropCount, 0)}</td>
      <td class="text-end">${amount(cashDrop)}</td>
      <td colspan="13"></td>
    `;
    tBody.appendChild(totalRow);
  }

  table.appendChild(tBody);
  main.appendChild(table);

  if (!printing) {
    main.appendChild(createPagination(shifts.length, shiftPage, (page) => {
      shiftPage = page;
      displayShiftTable(shifts);
    }));
  }
};

const displayArTable = (reports) => {
  const main = document.getElementById("ar-div");

  main.innerHTML = "";

  const { rows, current } = paginate(reports, arPage);

  arPage = current;

  const table = document.createElement("table");
  table.classList.add("table", "table-dark", "table-hover", "table-striped", "table-sm", "report-table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>Invoice</th>
        <th>Shift</th>
        <th>Issued</th>
        <th>Terminal</th>
        <th>Customer</th>
        <th>Cashier</th>
        <th class="text-end">Invoice Amount</th>
        <th class="text-end">Paid at Sale</th>
        <th class="text-end">Charged to AR</th>
        <th class="text-end">Collected in Period</th>
        <th class="text-end">Current Balance</th>
      </tr>
    </thead>
  `;

  const tBody = document.createElement("tbody");
  const visible = printing ? reports : rows;
  const totals = { amountDue: 0, paidAtSale: 0, chargedToAr: 0, collected: 0, balance: 0 };

  reports.forEach((report) => {
    totals.amountDue += parseFloat(report.amount_due) || 0;
    totals.paidAtSale += parseFloat(report.paid_at_sale) || 0;
    totals.chargedToAr += parseFloat(report.charged_to_ar) || 0;
    totals.collected += parseFloat(report.collected_in_period) || 0;
    totals.balance += parseFloat(report.current_balance) || 0;
  });

  if (visible.length == 0) {
    tBody.innerHTML = `
      <tr>
        <td colspan="11" class="text-center">
          No AR invoices or collections found for this date range.
        </td>
      </tr>
    `;
  }

  visible.forEach((report) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(report.invoice_number)}</td>
      <td>${escapeHtml(report.shift_id)}</td>
      <td>${formatTime(report.sales_date)}</td>
      <td>${escapeHtml(report.terminal_name)}</td>
      <td>${escapeHtml(report.customer_name)}</td>
      <td>${escapeHtml(report.cashier)}</td>
      <td class="text-end">${amount(report.amount_due)}</td>
      <td class="text-end">${amount(report.paid_at_sale)}</td>
      <td class="text-end">${amount(report.charged_to_ar)}</td>
      <td class="text-end">${amount(report.collected_in_period)}</td>
      <td class="text-end">${amount(report.current_balance)}</td>
    `;
    tBody.appendChild(row);
  });

  if (reports.length > 0) {
    const totalRow = document.createElement("tr");
    totalRow.classList.add("fw-bold");
    totalRow.innerHTML = `
      <td colspan="6">TOTAL</td>
      <td class="text-end">${amount(totals.amountDue)}</td>
      <td class="text-end">${amount(totals.paidAtSale)}</td>
      <td class="text-end">${amount(totals.chargedToAr)}</td>
      <td class="text-end">${amount(totals.collected)}</td>
      <td class="text-end">${amount(totals.balance)}</td>
    `;
    tBody.appendChild(totalRow);
  }

  table.appendChild(tBody);
  main.appendChild(table);

  if (!printing) {
    main.appendChild(createPagination(reports.length, arPage, (page) => {
      arPage = page;
      displayArTable(reports);
    }));
  }
};
