import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI } from "../js/config.js";
import { formatCurrency, formatNumber } from "../js/module/number_format.js";


sessionStorage.setItem("baseAPI", baseAPI);

let currentPage = 1;
let reportSales = [];
let printing = false;

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date();

  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

  const formatDate = (date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

  document.getElementById("dateFrom").value = formatDate(firstDay);
  document.getElementById("dateTo").value = formatDate(today);

  displaySalesReport();

  document.getElementById("generateBtn").addEventListener("click", () => {
    currentPage = 1;
    displaySalesReport();
  });

  document.getElementById("printBtn").addEventListener("click", () => {
    window.print();
  });
});

window.addEventListener("beforeprint", () => {
  printing = true;
  displaySalesReportTable(reportSales);
});

window.addEventListener("afterprint", () => {
  printing = false;
  displaySalesReportTable(reportSales);
});

const displaySalesReport = async () => {
  const jsonData = {
    dateFrom: document.getElementById("dateFrom").value,
    dateTo: document.getElementById("dateTo").value,
  };

  const response = await axios.get(`${baseAPI}/sales_report.php`, {
    params: {
      operation: "getSalesReport",
      json: JSON.stringify(jsonData),
    },
  });

  if (response.status == 200) {
    console.log(response.data);

    reportSales = response.data;

    displaySummary(reportSales);

    displaySalesReportTable(reportSales);
  } else {
    Swal.fire("ERROR");
  }
};

const displaySummary = (sales) => {
  let totalSales = 0;
  let collected = 0;
  let outstanding = 0;

  sales.forEach((sale) => {
    totalSales += parseFloat(sale.total_amount);
    collected += parseFloat(sale.total_paid);
    outstanding += Math.max(0, parseFloat(sale.total_amount) - parseFloat(sale.total_paid));
  });

  document.getElementById("sumTransactions").innerText = formatNumber(sales.length, 0);
  document.getElementById("sumTotalSales").innerText = formatCurrency(totalSales);
  document.getElementById("sumNetSales").innerText = formatCurrency(totalSales);
  document.getElementById("sumPostedAR").innerText = formatCurrency(totalSales);
  document.getElementById("sumCollected").innerText = formatCurrency(collected);
  document.getElementById("sumOutstanding").innerText = formatCurrency(outstanding);
};

const displaySalesReportTable = (sales) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(sales, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
        <tr>
            <th>Date</th>
            <th>Customer</th>
            <th>Terminal</th>
            <th>Cashier</th>
            <th>Total</th>
            <th>Invoice No.</th>
            <th>Paid</th>
            <th>Balance</th>
        </tr>
    `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  const visible = printing ? sales : rows;

  visible.forEach((sale) => {
    const balance = Math.max(0, parseFloat(sale.total_amount) - parseFloat(sale.total_paid));

    const tr = document.createElement("tr");

    tr.innerHTML = `
            <td>${sale.sales_date}</td>
            <td>${sale.customer_name}</td>
            <td>${sale.terminal_name || ""}</td>
            <td>${sale.cashier || ""}</td>
            <td>${formatCurrency(parseFloat(sale.total_amount))}</td>
            <td>${sale.invoice_number}</td>
            <td>${formatCurrency(parseFloat(sale.total_paid))}</td>
            <td>${formatCurrency(balance)}</td>
        `;

    tBody.appendChild(tr);
  });

  table.appendChild(tBody);

  main.appendChild(table);

  if (!printing) {
    main.appendChild(
      createPagination(sales.length, currentPage, (page) => {
        currentPage = page;

        displaySalesReportTable(sales);
      }),
    );
  }
};
