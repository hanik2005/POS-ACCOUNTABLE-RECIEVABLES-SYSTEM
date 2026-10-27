import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI } from "../js/config.js";
import { formatNumber } from "../js/module/number_format.js";
import { addPrintSummaryTables, removePrintSummaryTables } from "../js/module/report_print.js";

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
  document.getElementById("emailStatusFilter").addEventListener("change", () => {
    currentPage = 1;
    renderReport();
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

const loadReport = async () => {
  try {
    const response = await axios.get(`${baseAPI}/credit_limit_report.php`, {
      params: { operation: "getCreditLimitReport" },
    });

    if (response.status == 200 && Array.isArray(response.data)) {
      reportRows = response.data;
      renderReport();
      return;
    }

    document.getElementById("reportTable").innerHTML = '<div class="alert alert-danger mb-0">Unable to load customer credit limits.</div>';
  } catch (error) {
    console.error("Unable to load customer credit limits:", error);
    document.getElementById("reportTable").innerHTML = '<div class="alert alert-danger mb-0">Unable to load customer credit limits. Please refresh and try again.</div>';
  }
};

const getCreditEmailCell = (row) => {
  const badges = {
    SENT: '<span class="badge text-bg-success">Sent</span>',
    PENDING: '<span class="badge text-bg-warning">Sending</span>',
    NOT_SENT: '<span class="badge text-bg-secondary">Not sent</span>',
    NOT_REQUIRED: '<span class="text-muted">Not required</span>',
  };
  const badge = badges[row.credit_email_status] || badges.NOT_REQUIRED;

  if (!["LIMIT REACHED", "OVER LIMIT"].includes(row.credit_status)
    || row.credit_email_status != "NOT_SENT") {
    return badge;
  }

  if (!row.email) {
    return `${badge}<div class="small text-muted mt-1">No email address</div>`;
  }

  return `<div class="d-flex flex-wrap align-items-center gap-2">
    ${badge}
    <button type="button" class="btn btn-outline-primary btn-sm" data-send-credit-limit="${escapeHtml(row.customer_id)}">
      Send email
    </button>
  </div>`;
};

const renderReport = () => {
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const emailStatus = document.getElementById("emailStatusFilter").value;
  const filtered = reportRows.filter((row) => {
    const matchesSearch = String(row.customer_name || "").toLowerCase().includes(search);
    const matchesEmailStatus = emailStatus == "all" || row.credit_email_status == emailStatus;

    return matchesSearch && matchesEmailStatus;
  });
  const totalOutstanding = reportRows.reduce((sum, row) => sum + Number(row.outstanding_balance), 0);
  const limitCount = reportRows.filter((row) => {
    return ["LIMIT REACHED", "OVER LIMIT"].includes(row.credit_status);
  }).length;

  document.getElementById("customerCount").textContent = formatNumber(reportRows.length, 0);
  document.getElementById("totalOutstanding").textContent = formatCurrency(totalOutstanding);
  document.getElementById("limitCount").textContent = formatNumber(limitCount, 0);
  document.getElementById("matchingCount").textContent = `${formatNumber(filtered.length, 0)} customers`;

  const { rows, current } = paginate(filtered, currentPage);
  currentPage = current;
  const visible = printing ? filtered : rows;
  const body = visible.map((row) => {
    const statusClass = row.credit_status == "OVER LIMIT"
      ? "text-danger"
      : row.credit_status == "LIMIT REACHED"
        ? "text-warning"
        : "text-success";

    return `<tr>
      <td>${escapeHtml(row.customer_name)}</td>
      <td>${escapeHtml(row.status)}</td>
      <td class="text-end">${formatCurrency(row.credit_limit)}</td>
      <td class="text-end">${formatCurrency(row.outstanding_balance)}</td>
      <td class="text-end">${formatCurrency(row.available_credit)}</td>
      <td class="text-end">${formatCurrency(row.over_limit_amount)}</td>
      <td class="${statusClass} fw-semibold">${escapeHtml(row.credit_status)}</td>
      <td>${getCreditEmailCell(row)}</td>
    </tr>`;
  }).join("");

  document.getElementById("reportTable").innerHTML = `<div class="table-responsive"><table class="table table-hover table-striped table-sm align-middle mb-0">
    <thead><tr><th>Customer</th><th>Account</th><th class="text-end">Credit Limit</th><th class="text-end">Outstanding</th><th class="text-end">Available Credit</th><th class="text-end">Over Limit</th><th>Status</th><th>Email notice</th></tr></thead>
    <tbody>${body || '<tr><td colspan="8" class="text-center text-muted py-4">No customers found.</td></tr>'}</tbody>
  </table></div>`;

  document.querySelectorAll("[data-send-credit-limit]").forEach((button) => {
    button.addEventListener("click", () => {
      const customer = reportRows.find((row) => {
        return String(row.customer_id) == button.dataset.sendCreditLimit;
      });

      if (customer) {
        sendCreditLimitEmail(customer, button);
      }
    });
  });

  const pagination = document.getElementById("pagination");
  pagination.innerHTML = "";
  if (!printing) {
    pagination.appendChild(createPagination(filtered.length, currentPage, (page) => {
      currentPage = page;
      renderReport();
    }));
  }
};

const sendCreditLimitEmail = async (customer, button) => {
  const confirmation = await Swal.fire({
    icon: "question",
    title: "Send credit-limit notice?",
    text: `Send ${customer.customer_name} an email because their balance has reached or exceeded the credit limit?`,
    showCancelButton: true,
    confirmButtonText: "Send email",
    cancelButtonText: "Cancel",
  });

  if (!confirmation.isConfirmed) {
    return;
  }

  button.disabled = true;
  const formData = new FormData();
  formData.append("operation", "sendCreditLimitEmail");
  formData.append("json", JSON.stringify({ customerId: customer.customer_id }));

  try {
    const response = await axios.post(`${baseAPI}/credit_limit_report.php`, formData);

    if (!response.data?.success) {
      throw new Error(response.data?.message || "The credit-limit notice could not be sent.");
    }

    await loadReport();
    await Swal.fire({
      icon: "success",
      title: response.data.alreadySent ? "Notice already sent" : "Email sent",
      text: response.data.message,
    });
  } catch (error) {
    if (error.response?.status == 409) {
      await loadReport();
    }

    button.disabled = false;
    await Swal.fire({
      icon: error.response?.data?.pending ? "info" : "error",
      title: error.response?.data?.pending ? "Notice is already sending" : "Email not sent",
      text: error.response?.data?.message || error.message || "Please try again.",
    });
  }
};
