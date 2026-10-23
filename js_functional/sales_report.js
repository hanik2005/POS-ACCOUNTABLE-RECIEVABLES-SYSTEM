import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI, sessionAPI, baseUrl } from "../js/config.js";
import { formatCurrency, formatNumber } from "../js/module/number_format.js";


sessionStorage.setItem("baseAPI", baseAPI);

let currentPage = 1;
let reportSales = [];
let reportCollectionsInPeriod = 0;
let printing = false;

document.addEventListener("DOMContentLoaded", async () => {
  const sessionResponse = await axios.get(sessionAPI, {
    params: { operation: "getSession" },
  });

  if (!sessionResponse.data.success) {
    window.location.href = `${baseUrl}/index.html`;
    return;
  }

  if (!["ADMIN", "ACCOUNTING"].includes(sessionResponse.data.user.role_name.toUpperCase())) {
    return;
  }

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
    reportSales = Array.isArray(response.data.sales) ? response.data.sales : [];
    reportCollectionsInPeriod = Number(response.data.collections_in_period) || 0;

    displaySummary(reportSales);

    displaySalesReportTable(reportSales);
  } else {
    Swal.fire("ERROR");
  }
};

const displaySummary = (sales) => {
  const completed = sales.filter((sale) => {
    return sale.status == "COMPLETED" && sale.invoice_status != "VOID";
  });
  const voided = sales.filter((sale) => {
    return sale.status == "VOID" || sale.invoice_status == "VOID";
  });
  const grossSalesCents = completed.reduce((sum, sale) => {
    return sum + Math.round((Number(sale.total_amount) || 0) * 100);
  }, 0);
  const vatCents = completed.reduce((sum, sale) => {
    const saleCents = Math.round((Number(sale.total_amount) || 0) * 100);
    return sum + Math.round((saleCents * 12) / 112);
  }, 0);
  const chargedToAr = completed.reduce((sum, sale) => {
    return sum + (Number(sale.charged_to_ar) || 0);
  }, 0);
  const paymentsAtPos = completed.reduce((sum, sale) => {
    return sum + (Number(sale.paid_at_pos) || 0);
  }, 0);
  const currentBalance = completed.reduce((sum, sale) => {
    return sum + (Number(sale.current_balance) || 0);
  }, 0);
  const voidedSales = voided.reduce((sum, sale) => {
    return sum + (Number(sale.total_amount) || 0);
  }, 0);

  document.getElementById("sumTransactions").innerText = formatNumber(completed.length, 0);
  document.getElementById("sumTotalSales").innerText = formatCurrency(grossSalesCents / 100);
  document.getElementById("sumNetSales").innerText = formatCurrency((grossSalesCents - vatCents) / 100);
  document.getElementById("sumVat").innerText = formatCurrency(vatCents / 100);
  document.getElementById("sumPaymentsAtPos").innerText = formatCurrency(paymentsAtPos);
  document.getElementById("sumPostedAR").innerText = formatCurrency(chargedToAr);
  document.getElementById("sumCollected").innerText = formatCurrency(reportCollectionsInPeriod);
  document.getElementById("sumOutstanding").innerText = formatCurrency(currentBalance);
  document.getElementById("sumVoidedTransactions").innerText = formatNumber(voided.length, 0);
  document.getElementById("sumVoided").innerText = formatCurrency(voidedSales);
};

const displaySalesReportTable = (sales) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(sales, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-dark", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
        <tr>
            <th>Date</th>
            <th>Invoice No.</th>
            <th>Customer</th>
            <th>Terminal</th>
            <th>Cashier</th>
            <th>Sale Type</th>
            <th>Status</th>
            <th>Total</th>
            <th>Payments Applied at POS</th>
            <th>Charged to AR</th>
            <th>AR Collections on Invoice in Period</th>
            <th>Current AR Balance</th>
        </tr>
    `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  const visible = printing ? sales : rows;

  visible.forEach((sale) => {
    const isVoided = sale.status == "VOID" || sale.invoice_status == "VOID";

    const tr = document.createElement("tr");

    tr.innerHTML = `
            <td>${escapeHtml(sale.sales_date)}</td>
            <td>${escapeHtml(sale.invoice_number || "-")}</td>
            <td>${escapeHtml(sale.customer_name)}</td>
            <td>${escapeHtml(sale.terminal_name || "-")}</td>
            <td>${escapeHtml(sale.cashier || "-")}</td>
            <td>${sale.sale_type == "AR" ? "AR" : "Walk-in"}</td>
            <td>${isVoided ? "VOID" : escapeHtml(sale.status)}</td>
            <td>${formatCurrency(Number(sale.total_amount) || 0)}</td>
            <td>${formatCurrency(Number(sale.paid_at_pos) || 0)}</td>
            <td>${isVoided ? "-" : formatCurrency(Number(sale.charged_to_ar) || 0)}</td>
            <td>${isVoided ? "-" : formatCurrency(Number(sale.collected_in_period) || 0)}</td>
            <td>${isVoided ? "-" : formatCurrency(Number(sale.current_balance) || 0)}</td>
        `;

    tBody.appendChild(tr);
  });

  table.appendChild(tBody);

  const tableWrap = document.createElement("div");
  tableWrap.classList.add("table-responsive");
  tableWrap.appendChild(table);
  main.appendChild(tableWrap);

  if (!printing) {
    main.appendChild(
      createPagination(sales.length, currentPage, (page) => {
        currentPage = page;

        displaySalesReportTable(sales);
      }),
    );
  }
};

const escapeHtml = (value) => {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
};
