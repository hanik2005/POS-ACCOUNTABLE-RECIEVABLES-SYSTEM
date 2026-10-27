import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI } from "../js/config.js";
import { formatCurrency, formatNumber } from "../js/module/number_format.js";
import { addPrintSummaryTables, removePrintSummaryTables } from "../js/module/report_print.js";

sessionStorage.setItem("baseAPI", baseAPI);

let invoices = [];
let currentPage = 1;
let printing = false;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("refreshBtn").addEventListener("click", loadReport);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("searchInput").addEventListener("input", () => {
    currentPage = 1;
    renderReport();
  });
  document.getElementById("agingBucketFilter").addEventListener("change", () => {
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
    const response = await axios.get(`${baseAPI}/aging_report.php`, {
      params: { operation: "getAgingReport" },
    });

    if (response.status == 200 && Array.isArray(response.data)) {
      invoices = response.data;
      currentPage = 1;
      renderReport();
      return;
    }

    document.getElementById("reportTable").innerHTML =
      '<div class="alert alert-danger mb-0">Unable to load the aging report.</div>';
  } catch (error) {
    console.error("Unable to load aging report:", error);
    document.getElementById("reportTable").innerHTML =
      '<div class="alert alert-danger mb-0">Unable to load the aging report. Please refresh and try again.</div>';
  }
};

const getDaysPastDue = (invoice) => {
  const days = Number(invoice.days_past_due);
  return Number.isFinite(days) ? days : 0;
};

const getBucketKey = (days) => {
  if (days <= 0) {
    return "current";
  }

  if (days <= 30) {
    return "days1to30";
  }

  if (days <= 60) {
    return "days31to60";
  }

  if (days <= 90) {
    return "days61to90";
  }

  return "over90";
};

const getBucketLabel = (days) => {
  if (days < 0) {
    return "Not due";
  }

  if (days == 0) {
    return "Due today";
  }

  if (days <= 30) {
    return "1–30 days";
  }

  if (days <= 60) {
    return "31–60 days";
  }

  if (days <= 90) {
    return "61–90 days";
  }

  return "Over 90 days";
};

const agingEmailBuckets = [
  { key: "days1to30", label: "1-30" },
  { key: "days31to60", label: "31-60" },
  { key: "days61to90", label: "61-90" },
  { key: "over90", label: "Over 90" },
];

const getEmailStatusBadge = (status) => {
  const labels = {
    SENT: { text: "Sent", className: "text-bg-success" },
    PENDING: { text: "Sending", className: "text-bg-warning" },
    NOT_SENT: { text: "Not sent", className: "text-bg-secondary" },
  };
  const badge = labels[status] || labels.NOT_SENT;

  return `<span class="badge ${badge.className}">${badge.text}</span>`;
};

const getCustomerAgingEmailStatus = (customer) => {
  const activeBuckets = agingEmailBuckets.filter((bucket) => {
    return Number(customer[bucket.key]) > 0;
  });

  if (!activeBuckets.length) {
    return '<span class="text-muted">No overdue invoices</span>';
  }

  return `<div class="d-flex flex-wrap gap-1">${activeBuckets.map((bucket) => {
    const invoice = customer.invoices.find((item) => {
      return getBucketKey(getDaysPastDue(item)) == bucket.key;
    });
    const status = invoice?.aging_email_status || "NOT_SENT";

    return `<span class="text-nowrap"><span class="small fw-semibold">${bucket.label}:</span> ${getEmailStatusBadge(status)}</span>`;
  }).join("")}</div>`;
};

const groupCustomers = () => {
  const groups = new Map();

  invoices.forEach((invoice) => {
    const key = String(invoice.customer_id);

    if (!groups.has(key)) {
      groups.set(key, {
        customer_id: invoice.customer_id,
        customer_name: invoice.customer_name || "Unknown customer",
        invoices: [],
        current: 0,
        days1to30: 0,
        days31to60: 0,
        days61to90: 0,
        over90: 0,
        balance: 0,
        dueCount: 0,
      });
    }

    const customer = groups.get(key);
    const balance = Number(invoice.balance) || 0;
    const days = getDaysPastDue(invoice);

    customer.invoices.push(invoice);
    customer[getBucketKey(days)] += balance;
    customer.balance += balance;

    if (days >= 0) {
      customer.dueCount += 1;
    }
  });

  return [...groups.values()].sort((first, second) => {
    return first.customer_name.localeCompare(second.customer_name);
  });
};

const renderReport = () => {
  const customers = groupCustomers();
  const search = document.getElementById("searchInput").value.trim().toLowerCase();
  const agingBucket = document.getElementById("agingBucketFilter").value;
  const emailStatus = document.getElementById("emailStatusFilter").value;
  const filtered = customers.filter((customer) => {
    const matchesBucket = agingBucket == "all" || customer[agingBucket] > 0;
    const matchesSearch = customer.customer_name.toLowerCase().includes(search)
      || customer.invoices.some((invoice) => {
        return String(invoice.invoice_number).toLowerCase().includes(search);
      });
    const overdueInvoices = customer.invoices.filter((invoice) => {
      const days = getDaysPastDue(invoice);
      return days > 0 && (agingBucket == "all" || getBucketKey(days) == agingBucket);
    });
    const matchesEmailStatus = emailStatus == "all"
      || (emailStatus == "NO_OVERDUE" && overdueInvoices.length == 0)
      || overdueInvoices.some((invoice) => {
        return (invoice.aging_email_status || "NOT_SENT") == emailStatus;
      });

    return matchesBucket && matchesSearch && matchesEmailStatus;
  });
  const totalOutstanding = customers.reduce((sum, customer) => sum + customer.balance, 0);
  const totalOverdue = customers.reduce((sum, customer) => {
    return sum + customer.days1to30 + customer.days31to60 + customer.days61to90 + customer.over90;
  }, 0);
  const customersDue = customers.filter((customer) => customer.dueCount > 0).length;

  document.getElementById("customerCount").textContent =
    `${formatNumber(filtered.length, 0)} customers`;
  document.getElementById("totalOutstanding").textContent = formatCurrency(totalOutstanding);
  document.getElementById("totalOverdue").textContent = formatCurrency(totalOverdue);
  document.getElementById("customersDue").textContent = formatNumber(customersDue, 0);

  const { rows, current } = paginate(filtered, currentPage);
  currentPage = current;
  const visible = printing ? filtered : rows;
  const body = visible.map((customer) => `
    <tr>
      <td>${escapeHtml(customer.customer_name)}</td>
      <td class="text-end">${formatCurrency(customer.current)}</td>
      <td class="text-end">${formatCurrency(customer.days1to30)}</td>
      <td class="text-end">${formatCurrency(customer.days31to60)}</td>
      <td class="text-end">${formatCurrency(customer.days61to90)}</td>
      <td class="text-end">${formatCurrency(customer.over90)}</td>
      <td class="text-end fw-semibold">${formatCurrency(customer.balance)}</td>
      <td>${getCustomerAgingEmailStatus(customer)}</td>
      <td class="text-end">${formatNumber(customer.invoices.length, 0)}</td>
      <td class="text-end no-print">
        <button
          type="button"
          class="btn btn-outline-primary btn-sm"
          data-customer-details="${escapeHtml(customer.customer_id)}"
        >
          Details
        </button>
      </td>
    </tr>
  `).join("");

  document.getElementById("reportTable").innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover table-striped table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Customer</th>
            <th class="text-end">Current</th>
            <th class="text-end">1–30</th>
            <th class="text-end">31–60</th>
            <th class="text-end">61–90</th>
            <th class="text-end">Over 90</th>
            <th class="text-end">Total Balance</th>
            <th>Email Status</th>
            <th class="text-end">Invoices</th>
            <th class="text-end no-print">Details</th>
          </tr>
        </thead>
        <tbody>
          ${body || `
            <tr>
              <td colspan="10" class="text-center text-muted py-4">
                No open receivables found.
              </td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;

  document.querySelectorAll("[data-customer-details]").forEach((button) => {
    button.addEventListener("click", () => {
      const customer = customers.find((item) => {
        return String(item.customer_id) == button.dataset.customerDetails;
      });

      if (customer) {
        showCustomerDetails(customer);
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

const getReminderAction = (invoice, bucketKey, days, reminderActionsAdded) => {
  if (days <= 0) {
    return '<span class="text-muted">—</span>';
  }

  if (invoice.aging_email_status == "SENT") {
    return getEmailStatusBadge("SENT");
  }

  if (invoice.aging_email_status == "PENDING") {
    return getEmailStatusBadge("PENDING");
  }

  if (reminderActionsAdded.has(bucketKey)) {
    return '<span class="small text-muted">Included above</span>';
  }

  if (!invoice.email) {
    return '<span class="text-muted">No email address</span>';
  }

  const bucket = agingEmailBuckets.find((item) => item.key == bucketKey);
  const label = bucket?.label || "aging";

  return `<button type="button" class="btn btn-outline-primary btn-sm" data-send-aging-reminder="${escapeHtml(bucketKey)}">Send ${escapeHtml(label)} email</button>`;
};

const showCustomerDetails = (customer) => {
  const invoicesForCustomer = customer.invoices.slice().sort((first, second) => {
    return String(first.due_date).localeCompare(String(second.due_date))
      || Number(first.invoice_id) - Number(second.invoice_id);
  });
  const reminderActionsAdded = new Set();

  document.getElementById("detailsTitle").textContent =
    `${customer.customer_name} — Open Receivables`;
  document.getElementById("detailsRows").innerHTML = invoicesForCustomer.map((invoice) => {
    const days = getDaysPastDue(invoice);
    const bucketKey = getBucketKey(days);
    const status = days > 0
      ? `<span class="text-danger fw-semibold">Overdue ${formatNumber(days, 0)} days</span>`
      : days == 0
        ? '<span class="text-warning fw-semibold">Due today</span>'
        : '<span class="text-success">Not due</span>';
    const emailAction = getReminderAction(
      invoice,
      bucketKey,
      days,
      reminderActionsAdded,
    );

    if (days > 0) {
      reminderActionsAdded.add(bucketKey);
    }

    return `
      <tr>
        <td>${escapeHtml(invoice.invoice_number)}</td>
        <td>${escapeHtml(invoice.sales_date)}</td>
        <td>${escapeHtml(invoice.due_date)}</td>
        <td>${status}</td>
        <td class="text-end">${formatCurrency(invoice.balance)}</td>
        <td>${emailAction}</td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("[data-send-aging-reminder]").forEach((button) => {
    button.addEventListener("click", () => {
      sendAgingReminder(customer, button.dataset.sendAgingReminder, button);
    });
  });

  bootstrap.Modal.getOrCreateInstance(document.getElementById("customerDetailsModal")).show();
};

const sendAgingReminder = async (customer, bucketKey, button) => {
  const bucket = agingEmailBuckets.find((item) => item.key == bucketKey);

  if (!bucket) {
    return;
  }

  const confirmation = await Swal.fire({
    icon: "question",
    title: `Send ${bucket.label} reminder?`,
    text: "This sends one email covering all of this customer's open invoices in this aging period.",
    showCancelButton: true,
    confirmButtonText: "Send email",
    cancelButtonText: "Cancel",
  });

  if (!confirmation.isConfirmed) {
    return;
  }

  button.disabled = true;
  const formData = new FormData();
  formData.append("operation", "sendAgingReminder");
  formData.append("json", JSON.stringify({
    customerId: customer.customer_id,
    bucket: bucketKey,
  }));

  try {
    const response = await axios.post(`${baseAPI}/aging_report.php`, formData);

    if (!response.data?.success) {
      throw new Error(response.data?.message || "The reminder could not be sent.");
    }

    invoices.forEach((invoice) => {
      if (String(invoice.customer_id) == String(customer.customer_id)
        && getBucketKey(getDaysPastDue(invoice)) == bucketKey) {
        invoice.aging_email_status = "SENT";
      }
    });
    renderReport();
    const updatedCustomer = groupCustomers().find((item) => {
      return String(item.customer_id) == String(customer.customer_id);
    });

    if (updatedCustomer) {
      showCustomerDetails(updatedCustomer);
    }

    await Swal.fire({
      icon: "success",
      title: response.data.alreadySent ? "Reminder already sent" : "Email sent",
      text: response.data.message,
    });
  } catch (error) {
    const message = error.response?.data?.message
      || error.message
      || "The reminder could not be sent. Please try again.";

    if (error.response?.status == 409) {
      await loadReport();
      const updatedCustomer = groupCustomers().find((item) => {
        return String(item.customer_id) == String(customer.customer_id);
      });

      if (updatedCustomer) {
        showCustomerDetails(updatedCustomer);
      }
    }

    button.disabled = false;

    await Swal.fire({
      icon: error.response?.data?.pending ? "info" : "error",
      title: error.response?.data?.pending ? "Reminder is already sending" : "Email not sent",
      text: message,
    });
  }
};

const escapeHtml = (value) => {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
};
