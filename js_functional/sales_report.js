import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI, sessionAPI, baseUrl } from "../js/config.js";
import { formatCurrency, formatNumber } from "../js/module/number_format.js";
import { addPrintSummaryTables, removePrintSummaryTables } from "../js/module/report_print.js";

sessionStorage.setItem("baseAPI", baseAPI);

let currentPage = 1;
let reportSales = [];
let reportVoidSaleActions = [];
let reportCollectionsInPeriod = 0;
let reportVoidLineCount = 0;
let reportVoidLineAmount = 0;
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
    "'": "&#039;",
  })[character]);
};

const getSaleType = (sale) => {
  return sale.sale_type == "AR" ? "AR" : "WALK_IN";
};

const getSaleTypeLabel = (sale) => {
  return getSaleType(sale) == "AR" ? "Accounts receivable" : "Walk-in";
};

const initializeSalesReport = async () => {
  try {
    const sessionResponse = await axios.get(sessionAPI, {
      params: { operation: "getSession" },
    });

    if (!sessionResponse.data.success) {
      window.location.href = `${baseUrl}/index.html`;
      return;
    }

    const role = sessionResponse.data.user?.role_name?.toUpperCase() || "";

    if (!["ADMIN", "ACCOUNTING", "SUPERVISOR"].includes(role)) {
      await Swal.fire({
        icon: "error",
        title: "Access denied",
        text: "You do not have permission to view the Sales Report.",
      });
      return;
    }

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    document.getElementById("dateFrom").value = formatDate(firstDay);
    document.getElementById("dateTo").value = formatDate(today);

    ["searchSales", "saleTypeFilter", "terminalFilter", "cashierFilter"]
      .forEach((id) => {
        document.getElementById(id).addEventListener(
          id == "searchSales" ? "input" : "change",
          () => {
            currentPage = 1;
            renderSalesReport();
          },
        );
      });

    document.getElementById("generateBtn").addEventListener("click", loadSalesReport);
    document.getElementById("printBtn").addEventListener("click", () => window.print());
    await loadSalesReport();
  } catch (error) {
    console.error("Unable to initialize Sales Report:", error);
    Swal.fire({
      icon: "error",
      title: "Sales Report unavailable",
      text: "Unable to load your session or report. Refresh the page and try again.",
    });
  }
};

if (document.readyState == "loading") {
  document.addEventListener("DOMContentLoaded", initializeSalesReport);
} else {
  initializeSalesReport();
}

window.addEventListener("beforeprint", () => {
  printing = true;
  renderSalesReport();
  addPrintSummaryTables();
});

window.addEventListener("afterprint", () => {
  removePrintSummaryTables();
  printing = false;
  renderSalesReport();
});

const loadSalesReport = async () => {
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
    const response = await axios.get(`${baseAPI}/sales_report.php`, {
      params: {
        operation: "getSalesReport",
        json: JSON.stringify({ dateFrom, dateTo }),
      },
    });

    if (!Array.isArray(response.data?.sales)) {
      throw new Error("The Sales Report returned an invalid response.");
    }

    reportSales = response.data.sales;
    reportVoidSaleActions = Array.isArray(response.data.void_sale_actions)
      ? response.data.void_sale_actions
      : [];
    reportCollectionsInPeriod = Number(response.data.collections_in_period) || 0;
    reportVoidLineCount = Number(response.data.void_line_count) || 0;
    reportVoidLineAmount = Number(response.data.void_line_amount) || 0;
    currentPage = 1;
    document.getElementById("reportPeriod").textContent = `${dateFrom} to ${dateTo}`;
    populateFilterOptions();
    displaySummary(reportSales);
    renderVoidSalesActions();
    renderSalesReport();
  } catch (error) {
    console.error("Unable to load Sales Report:", error);
    await Swal.fire({
      icon: "error",
      title: "Sales Report unavailable",
      text: error.response?.data?.message || "Unable to load sales for the selected dates.",
    });
  } finally {
    generateButton.disabled = false;
  }
};

const populateFilterOptions = () => {
  const setOptions = (elementId, field, allLabel) => {
    const select = document.getElementById(elementId);
    const selectedValue = select.value;
    const values = [...new Set(reportSales
      .map((sale) => String(sale[field] || "").trim())
      .filter(Boolean))]
      .sort((first, second) => first.localeCompare(second));

    select.innerHTML = `<option value="all">${allLabel}</option>${values.map((value) => {
      return `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`;
    }).join("")}`;

    if (values.includes(selectedValue)) {
      select.value = selectedValue;
    }
  };

  setOptions("terminalFilter", "terminal_name", "All terminals");
  setOptions("cashierFilter", "cashier", "All cashiers");
};

const getFilteredSales = () => {
  const search = document.getElementById("searchSales").value.trim().toLowerCase();
  const type = document.getElementById("saleTypeFilter").value;
  const terminal = document.getElementById("terminalFilter").value;
  const cashier = document.getElementById("cashierFilter").value;

  return reportSales.filter((sale) => {
    const searchableText = [
      sale.invoice_number,
      sale.customer_name,
      sale.terminal_name,
      sale.cashier,
    ].join(" ").toLowerCase();

    return (!search || searchableText.includes(search))
      && (type == "all" || getSaleType(sale) == type)
      && (terminal == "all" || String(sale.terminal_name || "") == terminal)
      && (cashier == "all" || String(sale.cashier || "") == cashier);
  });
};

const displaySummary = (sales) => {
  const completed = sales;
  const grossSalesCents = completed.reduce((sum, sale) => {
    return sum + Math.round((Number(sale.total_amount) || 0) * 100);
  }, 0);
  const vatCents = completed.reduce((sum, sale) => {
    const saleCents = Math.round((Number(sale.total_amount) || 0) * 100);
    return sum + Math.round((saleCents * 12) / 112);
  }, 0);
  const chargedToArCents = completed.reduce((sum, sale) => {
    return sum + Math.round((Number(sale.charged_to_ar) || 0) * 100);
  }, 0);
  const paymentsAtPosCents = completed.reduce((sum, sale) => {
    return sum + Math.round((Number(sale.paid_at_pos) || 0) * 100);
  }, 0);
  const currentBalanceCents = completed.reduce((sum, sale) => {
    return sum + Math.round((Number(sale.current_balance) || 0) * 100);
  }, 0);
  const voidSaleActionCents = reportVoidSaleActions.reduce((sum, action) => {
    return sum + Math.round((Number(action.amount) || 0) * 100);
  }, 0);

  document.getElementById("sumTransactions").textContent = formatNumber(completed.length, 0);
  document.getElementById("sumTotalSales").textContent = formatCurrency(grossSalesCents / 100);
  document.getElementById("sumNetSales").textContent = formatCurrency((grossSalesCents - vatCents) / 100);
  document.getElementById("sumVat").textContent = formatCurrency(vatCents / 100);
  document.getElementById("sumPaymentsAtPos").textContent = formatCurrency(paymentsAtPosCents / 100);
  document.getElementById("sumPostedAR").textContent = formatCurrency(chargedToArCents / 100);
  document.getElementById("sumCollected").textContent = formatCurrency(reportCollectionsInPeriod);
  document.getElementById("sumOutstanding").textContent = formatCurrency(currentBalanceCents / 100);
  document.getElementById("sumVoidSaleActions").textContent = formatNumber(reportVoidSaleActions.length, 0);
  document.getElementById("sumVoidSaleAmount").textContent = formatCurrency(voidSaleActionCents / 100);
  document.getElementById("sumVoidLineCount").textContent = formatNumber(reportVoidLineCount, 0);
  document.getElementById("sumVoidLineAmount").textContent = formatCurrency(reportVoidLineAmount);
};

const renderSalesReport = () => {
  const matchingSales = getFilteredSales();
  document.getElementById("matchingCount").textContent = `${formatNumber(matchingSales.length, 0)} sales`;
  renderSalesReportTable(matchingSales);
};

const renderSaleRegister = (sale) => {
  return `<div>${escapeHtml(sale.terminal_name || "-")}</div>
    <small class="text-muted">${escapeHtml(sale.cashier || "-")}</small>`;
};

const renderVoidSalesActions = () => {
  const body = document.getElementById("void-sales-actions-body");
  const rows = reportVoidSaleActions.map((action) => `<tr>
    <td class="text-nowrap">${escapeHtml(action.action_at)}</td>
    <td>${escapeHtml(action.shift_id)}</td>
    <td>${escapeHtml(action.terminal_name || "-")}</td>
    <td>${escapeHtml(action.cashier || "-")}</td>
    <td>${escapeHtml(action.supervisor || "-")}</td>
    <td>${escapeHtml(action.reason || "-")}</td>
    <td class="text-end text-nowrap">${formatCurrency(Number(action.amount) || 0)}</td>
  </tr>`).join("");

  body.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover table-striped table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Action date</th>
            <th>Shift</th>
            <th>Terminal</th>
            <th>Cashier</th>
            <th>Supervisor</th>
            <th>Reason</th>
            <th class="text-end">Amount</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="7" class="text-center text-muted py-4">No void sale actions in this period.</td></tr>'}</tbody>
      </table>
    </div>`;
};

const renderSalesReportTable = (sales) => {
  const main = document.getElementById("main-div");
  const { rows, current } = paginate(sales, currentPage);
  currentPage = current;
  const visible = printing ? sales : rows;
  const tableRows = visible.map((sale) => {
    return `<tr>
      <td class="text-nowrap">${escapeHtml(sale.sales_date)}</td>
      <td>${escapeHtml(sale.invoice_number || "-")}</td>
      <td>${escapeHtml(sale.customer_name || "Walk-in customer")}</td>
      <td>${renderSaleRegister(sale)}</td>
      <td>${escapeHtml(getSaleTypeLabel(sale))}</td>
      <td class="text-end text-nowrap">${formatCurrency(Number(sale.total_amount) || 0)}</td>
      <td class="text-end text-nowrap">${formatCurrency(Number(sale.paid_at_pos) || 0)}</td>
      <td class="text-end text-nowrap">${formatCurrency(Number(sale.charged_to_ar) || 0)}</td>
      <td class="text-end text-nowrap">${formatCurrency(Number(sale.collected_in_period) || 0)}</td>
      <td class="text-end text-nowrap">${formatCurrency(Number(sale.current_balance) || 0)}</td>
    </tr>`;
  }).join("");
  const mobileCards = visible.map((sale) => {
    const fields = [
      ["Invoice", escapeHtml(sale.invoice_number || "-")],
      ["Terminal", escapeHtml(sale.terminal_name || "-")],
      ["Cashier", escapeHtml(sale.cashier || "-")],
      ["Sale type", escapeHtml(getSaleTypeLabel(sale))],
      ["Total", formatCurrency(Number(sale.total_amount) || 0)],
      ["Paid at POS", formatCurrency(Number(sale.paid_at_pos) || 0)],
      ["Charged to AR", formatCurrency(Number(sale.charged_to_ar) || 0)],
      ["AR collected in period", formatCurrency(Number(sale.collected_in_period) || 0)],
      ["Current AR balance", formatCurrency(Number(sale.current_balance) || 0)],
    ];

    return `<article class="card sales-report-card mb-3">
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
          <div>
            <h3 class="h6 mb-1">${escapeHtml(sale.customer_name || "Walk-in customer")}</h3>
            <div class="small text-muted">${escapeHtml(sale.sales_date)}</div>
          </div>
          <span class="badge text-bg-success">Completed</span>
        </div>
        <dl class="sales-report-fields mb-0">
          ${fields.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join("")}
        </dl>
      </div>
    </article>`;
  }).join("");

  main.innerHTML = `
    <div class="sales-report-table d-none d-xxl-block">
      <div class="table-responsive">
        <table class="table table-hover table-striped table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>Date</th>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Terminal / Cashier</th>
              <th>Sale type</th>
              <th class="text-end">Total</th>
              <th class="text-end">Paid at POS</th>
              <th class="text-end">Charged to AR</th>
              <th class="text-end">AR collected</th>
              <th class="text-end">AR balance</th>
            </tr>
          </thead>
          <tbody>${tableRows || '<tr><td colspan="10" class="text-center text-muted py-4">No sales match these filters.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
    <div class="sales-report-cards d-xxl-none">
      ${mobileCards || '<div class="text-center text-muted py-4">No sales match these filters.</div>'}
    </div>
  `;

  const oldPagination = document.getElementById("salesPagination");
  oldPagination?.remove();

  if (!printing) {
    const pagination = createPagination(sales.length, currentPage, (page) => {
      currentPage = page;
      renderSalesReportTable(sales);
    });
    pagination.id = "salesPagination";
    pagination.classList.add("mt-3");
    main.appendChild(pagination);
  }
};
