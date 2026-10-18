import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI, sessionAPI } from "../js/config.js";
import { formatCurrency, formatNumber } from "../js/module/number_format.js";

const posPage = "pos.html";

sessionStorage.setItem("baseAPI", baseAPI);

let userId = "";
let shiftPage = 1;
let dailyPage = 1;
let shiftReports = [];
let dailyReports = [];
let printing = false;

const formatDate = (date) => {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

const formatTime = (dateTime) => {
  return new Date(dateTime.replace(" ", "T")).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  const today = new Date();

  document.getElementById("shiftFrom").value = formatDate(today);
  document.getElementById("shiftTo").value = formatDate(today);
  document.getElementById("dailyDate").value = formatDate(today);

  const response = await axios.get(sessionAPI, {
    params: { operation: "getSession" },
  });

  const role = response.data.success ? response.data.user.role_name.toUpperCase() : "";

  if (role == "CASHIER") {
    userId = response.data.user.user_id;
  }

  if (role == "CASHIER") {
    const back = document.getElementById("back-pos");

    back.href = posPage;
    back.classList.remove("d-none");

    document.addEventListener("keydown", (e) => {
      if (e.key == "Escape") {
        window.location.href = posPage;
      }
    });
  }

  displayShiftReport();
  displayDailyReport();

  document.getElementById("shiftBtn").addEventListener("click", () => {
    shiftPage = 1;
    displayShiftReport();
  });

  document.getElementById("dailyBtn").addEventListener("click", () => {
    dailyPage = 1;
    displayDailyReport();
  });

  document.getElementById("printBtn").addEventListener("click", () => {
    window.print();
  });
});

window.addEventListener("beforeprint", () => {
  printing = true;
  displayShiftTable(shiftReports);
  displayDailyTable(dailyReports);
});

window.addEventListener("afterprint", () => {
  printing = false;
  displayShiftTable(shiftReports);
  displayDailyTable(dailyReports);
});

const displayShiftReport = async () => {
  const jsonData = {
    dateFrom: document.getElementById("shiftFrom").value,
    dateTo: document.getElementById("shiftTo").value,
    userId: userId,
  };

  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: {
      operation: "getShiftReport",
      json: JSON.stringify(jsonData),
    },
  });

  if (response.status == 200) {
    shiftReports = response.data;

    displayShiftTable(shiftReports);
  } else {
    Swal.fire("Error!");
  }
};

const displayShiftTable = (shifts) => {
  const main = document.getElementById("shift-div");

  main.innerHTML = "";

  const { rows, current } = paginate(shifts, shiftPage);

  shiftPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  table.innerHTML = `
        <thead>
            <tr>
                <th>Cashier</th>
                <th>Terminal</th>
                <th>Schedule</th>
                <th>Opened</th>
                <th>Closed</th>
                <th class="text-end">Transactions</th>
                <th class="text-end">Charged to AR</th>
                <th class="text-end">Float Start</th>
                <th class="text-end">Float Adjust</th>
                <th class="text-end">Cash Received</th>
                <th class="text-end">Change Given</th>
                <th class="text-end">Cash Drop</th>
                <th class="text-end">Expected Cash</th>
                <th class="text-end">Cashier Count</th>
                <th class="text-end">Supervisor Count</th>
                <th>Supervisor</th>
                <th class="text-end">Count Difference</th>
                <th class="text-end">Over / Short</th>
            </tr>
        </thead>
    `;

  const tBody = document.createElement("tbody");

  const visible = printing ? shifts : rows;

  visible.forEach((shift) => {
    const gross = parseFloat(shift.gross_sales);
    const closed = shift.closed_at && shift.closing_cash !== null;
    const difference = closed ? parseFloat(shift.closing_cash) - parseFloat(shift.expected_cash) : 0;
    const cashierCount = shift.cashier_closing_cash !== null && shift.cashier_closing_cash !== ""
      ? parseFloat(shift.cashier_closing_cash)
      : shift.supervisor_user_id ? null : closed ? parseFloat(shift.closing_cash) : null;
    const supervisorCount = shift.supervisor_user_id && closed ? parseFloat(shift.closing_cash) : null;
    const countDifference = cashierCount !== null && supervisorCount !== null
      ? supervisorCount - cashierCount
      : null;

    const tr = document.createElement("tr");

    tr.innerHTML = `
            <td>${shift.cashier}</td>
            <td>${shift.terminal_name}</td>
            <td>${shift.schedule_name}</td>
            <td>${formatTime(shift.opened_at)}</td>
            <td>${shift.closed_at ? formatTime(shift.closed_at) : "OPEN"}</td>
            <td class="text-end">${formatNumber(shift.transactions, 0)}</td>
            <td class="text-end">${formatCurrency(gross)}</td>
            <td class="text-end">${formatCurrency(parseFloat(shift.float_start))}</td>
            <td class="text-end">${formatCurrency(parseFloat(shift.float_adjust))}</td>
            <td class="text-end">${formatCurrency(parseFloat(shift.cash_received))}</td>
            <td class="text-end">${formatCurrency(parseFloat(shift.change_given))}</td>
            <td class="text-end">${formatCurrency(parseFloat(shift.cash_drop))}</td>
            <td class="text-end">${formatCurrency(parseFloat(shift.expected_cash))}</td>
            <td class="text-end">${cashierCount !== null ? formatCurrency(cashierCount) : "-"}</td>
            <td class="text-end">${supervisorCount !== null ? formatCurrency(supervisorCount) : "-"}</td>
            <td>${shift.supervisor_name || "-"}</td>
            <td class="text-end ${countDifference < 0 ? "text-danger" : ""}">${countDifference !== null ? formatCurrency(countDifference) : "-"}</td>
            <td class="text-end ${difference < 0 ? "text-danger" : ""}">${closed ? formatCurrency(difference) : "-"}</td>
        `;

    tBody.appendChild(tr);
  });

  table.appendChild(tBody);

  main.appendChild(table);

  if (!printing) {
    main.appendChild(
      createPagination(shifts.length, shiftPage, (page) => {
        shiftPage = page;

        displayShiftTable(shifts);
      }),
    );
  }
};

const displayDailyReport = async () => {
  const jsonData = {
    date: document.getElementById("dailyDate").value,
    userId: userId,
  };

  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: {
      operation: "getDailyReport",
      json: JSON.stringify(jsonData),
    },
  });

  if (response.status == 200) {
    dailyReports = response.data;

    displayDailyTable(dailyReports);
  } else {
    Swal.fire("Error!");
  }
};

const displayDailyTable = (reports) => {
  const main = document.getElementById("daily-div");

  main.innerHTML = "";

  const { rows, current } = paginate(reports, dailyPage);

  dailyPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  table.innerHTML = `
        <thead>
            <tr>
                <th>Cashier</th>
                <th>Terminal</th>
                <th class="text-end">Transactions</th>
                <th class="text-end">Charged to AR</th>
            </tr>
        </thead>
    `;

  const tBody = document.createElement("tbody");

  const total = { transactions: 0, gross: 0 };

  reports.forEach((row) => {
    total.transactions += parseInt(row.transactions);
    total.gross += parseFloat(row.gross_sales);
  });

  const visible = printing ? reports : rows;

  visible.forEach((row) => {
    const gross = parseFloat(row.gross_sales);

    const tr = document.createElement("tr");

    tr.innerHTML = `
            <td>${row.cashier}</td>
            <td>${row.terminal_name || ""}</td>
            <td class="text-end">${formatNumber(row.transactions, 0)}</td>
            <td class="text-end">${formatCurrency(gross)}</td>
        `;

    tBody.appendChild(tr);
  });

  if (reports.length > 0) {
    const tr = document.createElement("tr");

    tr.classList.add("fw-bold");

    tr.innerHTML = `
            <td colspan="2">TOTAL</td>
            <td class="text-end">${formatNumber(total.transactions, 0)}</td>
            <td class="text-end">${formatCurrency(total.gross)}</td>
        `;

    tBody.appendChild(tr);
  }

  table.appendChild(tBody);

  main.appendChild(table);

  if (!printing) {
    main.appendChild(
      createPagination(reports.length, dailyPage, (page) => {
        dailyPage = page;

        displayDailyTable(reports);
      }),
    );
  }
};
