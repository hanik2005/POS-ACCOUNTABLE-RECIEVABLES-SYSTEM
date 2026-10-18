import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI } from "../js/config.js";
import { formatNumber } from "../js/module/number_format.js";

sessionStorage.setItem("baseAPI", baseAPI);

let reportRows = [];
let currentPage = 1;
let printing = false;

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(Number(value) || 0);

const escapeHtml = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("generateBtn").addEventListener("click", loadReport);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1;
    renderReport();
  });
  loadReport();
});

window.addEventListener("beforeprint", () => {
  printing = true;
  renderReport();
});

window.addEventListener("afterprint", () => {
  printing = false;
  renderReport();
});

const loadReport = async () => {
  const response = await axios.get(`${baseAPI}/credit_limit_report.php`, {
    params: { operation: "getCreditLimitReport" },
  });

  if (response.status == 200 && Array.isArray(response.data)) {
    reportRows = response.data;
    renderReport();
  } else {
    document.getElementById("reportTable").innerHTML = '<div class="alert alert-danger mb-0">Unable to load customer credit limits.</div>';
  }
};

const renderReport = () => {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const filtered = reportRows.filter((row) => row.customer_name.toLowerCase().includes(search));
  const totalOutstanding = reportRows.reduce((sum, row) => sum + Number(row.outstanding_balance), 0);
  const overLimitCount = reportRows.filter((row) => Number(row.over_limit_amount) > 0).length;
  const reachedCount = reportRows.filter((row) => row.credit_status == "LIMIT REACHED").length;

  document.getElementById("customerCount").textContent = formatNumber(reportRows.length, 0);
  document.getElementById("totalOutstanding").textContent = formatCurrency(totalOutstanding);
  document.getElementById("limitCount").textContent = formatNumber(overLimitCount + reachedCount, 0);

  const { rows, current } = paginate(filtered, currentPage);
  currentPage = current;
  const visible = printing ? filtered : rows;
  const body = visible.map((row) => {
    const statusClass = row.credit_status == "OVER LIMIT" ? "text-danger" : row.credit_status == "LIMIT REACHED" ? "text-warning" : "text-success";
    return `<tr>
      <td>${escapeHtml(row.customer_name)}</td>
      <td>${escapeHtml(row.status)}</td>
      <td class="text-end">${formatCurrency(row.credit_limit)}</td>
      <td class="text-end">${formatCurrency(row.outstanding_balance)}</td>
      <td class="text-end">${formatCurrency(row.available_credit)}</td>
      <td class="text-end">${formatCurrency(row.over_limit_amount)}</td>
      <td class="${statusClass} fw-semibold">${escapeHtml(row.credit_status)}</td>
    </tr>`;
  }).join("");

  document.getElementById("reportTable").innerHTML = `<div class="table-responsive"><table class="table table-hover table-striped table-sm align-middle mb-0">
    <thead><tr><th>Customer</th><th>Account</th><th class="text-end">Credit Limit</th><th class="text-end">Outstanding</th><th class="text-end">Available Credit</th><th class="text-end">Over Limit</th><th>Status</th></tr></thead>
    <tbody>${body || '<tr><td colspan="7" class="text-center text-muted py-4">No customers found.</td></tr>'}</tbody>
  </table></div>`;

  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";
  if (!printing) {
    pagination.appendChild(createPagination(filtered.length, currentPage, (page) => {
      currentPage = page;
      renderReport();
    }));
  }
};
