import { paginate, createPagination } from "../js/module/pagination.js";
import { functionalAPI as baseAPI, sessionAPI } from "../js/config.js";

let invoices = [];
let paymentMethods = [];
let selectedCustomerInvoices = [];
let selectedInvoice = null;
let currentPage = 1;
let canReceivePayments = false;

document.addEventListener("DOMContentLoaded", async () => {
  ensureInvoiceModals();

  const sessionResponse = await axios.get(sessionAPI, {
    params: { operation: "getSession" },
  });
  const sessionUser = sessionResponse.data.success ? sessionResponse.data.user : null;
  canReceivePayments = sessionUser
    && sessionUser.role_name.toUpperCase() == "ACCOUNTING";

  displayInvoices();

  if (canReceivePayments) {
    loadPaymentMethods();
  }

  document
    .getElementById("button-save-payment")
    .addEventListener("click", savePayment);

  document.getElementById("searchInvoice").addEventListener("input", () => {
    currentPage = 1;
    displayInvoicesTable();
  });

  document
    .getElementById("payment-amount")
    .addEventListener("input", updatePaymentPreview);
});

const ensureInvoiceModals = () => {
  if (!document.getElementById("customerInvoicesModal")) {
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "customerInvoicesModal";
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="customer-invoice-title">
              Customer AR invoices
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body table-responsive">
            <table class="table table-sm table-striped">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Sales date</th>
                  <th>Due date</th>
                  <th>Due status</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="customer-invoice-rows"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  if (!document.getElementById("customer-invoice-rows")) {
    const modalBody = document.querySelector(
      "#customerInvoicesModal .modal-body",
    );
    const tableBody = document.createElement("tbody");
    tableBody.id = "customer-invoice-rows";
    modalBody.querySelector("table").appendChild(tableBody);
  }

  if (!document.getElementById("payment-allocation")) {
    const paymentMethod = document.getElementById("payment-method");
    const allocation = document.createElement("p");
    allocation.id = "payment-allocation";
    allocation.className = "small text-muted mb-2";
    paymentMethod.insertAdjacentElement("afterend", allocation);
  }

  if (!document.getElementById("payment-overflow-modal")) {
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.id = "payment-overflow-modal";
    modal.tabIndex = -1;
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Cash exceeds this invoice</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <p id="payment-overflow-message" class="mb-0"></p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" id="payment-return-change">
              Apply to this invoice and return change
            </button>
            <button type="button" class="btn btn-primary" id="payment-distribute-ar">
              Distribute to other AR invoices
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  document
    .getElementById("payment-return-change")
    .addEventListener("click", () => {
      bootstrap.Modal.getInstance(
        document.getElementById("payment-overflow-modal"),
      ).hide();
      submitPayment(false);
    });

  document
    .getElementById("payment-distribute-ar")
    .addEventListener("click", () => {
      bootstrap.Modal.getInstance(
        document.getElementById("payment-overflow-modal"),
      ).hide();
      submitPayment(true);
    });
};

const money = (value) => {
  return new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
};

const getInvoiceDueStatus = (invoice) => {
  if (invoice.days_past_due === null
    || invoice.days_past_due === undefined
    || invoice.days_past_due === "") {
    return '<span class="text-muted">Unknown</span>';
  }

  const daysPastDue = Number(invoice.days_past_due);

  if (!Number.isFinite(daysPastDue)) {
    return '<span class="text-muted">Unknown</span>';
  }

  if (daysPastDue > 0) {
    return `<span class="text-danger fw-semibold">Overdue ${daysPastDue} days</span>`;
  }

  if (daysPastDue == 0) {
    return '<span class="text-warning fw-semibold">Due today</span>';
  }

  return `<span class="text-success">Due in ${Math.abs(daysPastDue)} days</span>`;
};

const displayInvoices = async () => {
  const response = await axios.get(`${baseAPI}/invoice.php`, {
    params: {
      operation: "getAllInvoices",
    },
  });

  invoices = Array.isArray(response.data) ? response.data : [];
  displayInvoicesTable();
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
        balance: 0,
      });
    }

    const customer = groups.get(key);
    customer.invoices.push(invoice);
    customer.balance += Number(invoice.balance) || 0;
  });

  return [...groups.values()].sort((first, second) => {
    return first.customer_name.localeCompare(second.customer_name);
  });
};

const displayInvoicesTable = () => {
  const main = document.getElementById("main-div");
  main.innerHTML = "";

  const search = document
    .getElementById("searchInvoice")
    .value.trim()
    .toLowerCase();

  const customers = groupCustomers().filter((customer) => {
    return (
      customer.customer_name.toLowerCase().includes(search) ||
      customer.invoices.some((invoice) => {
        return `${invoice.invoice_number} ${invoice.status}`
          .toLowerCase()
          .includes(search);
      })
    );
  });

  const total = customers.reduce((sum, customer) => {
    return sum + customer.balance;
  }, 0);

  const { rows, current } = paginate(customers, currentPage);
  currentPage = current;

  const table = document.createElement("table");
  table.className = "table table-hover table-striped table-sm";
  table.innerHTML = `
    <thead>
      <tr>
        <th>Customer</th>
        <th>Open AR invoices</th>
        <th>Total balance</th>
        <th>Action</th>
      </tr>
    </thead>
  `;

  const body = document.createElement("tbody");

  rows.forEach((customer) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(customer.customer_name)}</td>
      <td>${new Intl.NumberFormat("en-PH").format(customer.invoices.length)}</td>
      <td>₱${money(customer.balance)}</td>
      <td>
        <button type="button" class="btn btn-outline-primary btn-sm">
          View invoices
        </button>
      </td>
    `;

    row
      .querySelector("button")
      .addEventListener("click", () => showCustomerInvoices(customer));
    row.addEventListener("dblclick", () => showCustomerInvoices(customer));
    body.appendChild(row);
  });

  if (!rows.length) {
    body.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted">
          No customers with an open AR balance.
        </td>
      </tr>
    `;
  }

  table.appendChild(body);
  main.append(
    table,
    createPagination(customers.length, currentPage, (page) => {
      currentPage = page;
      displayInvoicesTable();
    }),
  );

  document.getElementById("totalReceivable").innerText = `₱${money(total)}`;
};

const escapeHtml = (value) => {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character];
  });
};

const showCustomerInvoices = (customer) => {
  selectedCustomerInvoices = customer.invoices
    .slice()
    .sort((first, second) => {
      return (
        String(first.due_date).localeCompare(String(second.due_date)) ||
        Number(first.invoice_id) - Number(second.invoice_id)
      );
    });

  const modal = document.getElementById("customerInvoicesModal");
  const modalHeader = modal.querySelector(".modal-header");
  const actionHeading = modal.querySelector("thead th:last-child");
  let title = document.getElementById("customer-invoice-title");

  if (actionHeading) {
    actionHeading.classList.toggle("d-none", !canReceivePayments);
  }

  if (!title) {
    title = document.createElement("h5");
    title.className = "modal-title";
    title.id = "customer-invoice-title";
    modalHeader.prepend(title);
  }

  title.innerText = `${customer.customer_name} — Open AR invoices`;

  const body = document.getElementById("customer-invoice-rows");
  body.innerHTML = "";

  selectedCustomerInvoices.forEach((invoice) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(invoice.invoice_number)}</td>
      <td>${escapeHtml(invoice.sales_date)}</td>
      <td>${escapeHtml(invoice.due_date)}</td>
      <td>${getInvoiceDueStatus(invoice)}</td>
      <td>₱${money(invoice.balance)}</td>
      <td>${escapeHtml(invoice.status)}</td>
      <td class="${canReceivePayments ? "" : "d-none"}">
        ${canReceivePayments ? '<button class="btn btn-success btn-sm" type="button">Pay</button>' : ""}
      </td>
    `;

    if (canReceivePayments) {
      row
        .querySelector("button")
        .addEventListener("click", () => openPaymentModal(invoice));
    }
    body.appendChild(row);
  });

  bootstrap.Modal.getOrCreateInstance(modal).show();
};

const loadPaymentMethods = async () => {
  const response = await axios.get(`${baseAPI}/payments.php`, {
    params: {
      operation: "getPaymentMethods",
    },
  });

  paymentMethods = Array.isArray(response.data) ? response.data : [];

  document.getElementById("payment-method").innerHTML = `
    <option value="">Select payment method</option>
    ${paymentMethods
      .map((method) => {
        return `<option value="${escapeHtml(method.payment_method_id)}">
          ${escapeHtml(method.method_name)}
        </option>`;
      })
      .join("")}
  `;

  document
    .getElementById("payment-method")
    .addEventListener("change", updatePaymentPreview);
};

const openPaymentModal = (invoice) => {
  selectedInvoice = invoice;

  document.getElementById("payment-invoice").innerText =
    `${invoice.invoice_number} — ${invoice.customer_name}`;
  document.getElementById("payment-balance").innerText =
    `₱${money(invoice.balance)}`;
  document.getElementById("payment-amount").value = (Number(invoice.balance) || 0).toFixed(2);
  document.getElementById("payment-reference").value = "";
  document.getElementById("payment-remarks").value = "";

  updatePaymentPreview();

  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("customerInvoicesModal"),
  ).hide();
  bootstrap.Modal.getOrCreateInstance(
    document.getElementById("paymentModal"),
  ).show();
};

const updatePaymentPreview = () => {
  if (!selectedInvoice) {
    return;
  }

  const tendered = Math.max(
    0,
    Math.round(
      (Number(document.getElementById("payment-amount").value) || 0) * 100,
    ),
  );
  const method = paymentMethods.find((item) => {
    return (
      String(item.payment_method_id) ===
      document.getElementById("payment-method").value
    );
  });
  const cash = method?.method_name?.trim().toUpperCase() === "CASH";
  const totalCents = selectedCustomerInvoices.reduce((sum, invoice) => {
    return sum + Math.round((Number(invoice.balance) || 0) * 100);
  }, 0);
  const appliedCents = Math.min(tendered, totalCents);
  const changeCents = cash ? Math.max(0, tendered - appliedCents) : 0;
  const changeText = changeCents
    ? ` · Change: ₱${money(changeCents / 100)}`
    : "";

  document.getElementById("payment-allocation").innerText =
    `Applied to this and following AR invoices: ₱${money(appliedCents / 100)}${changeText}`;
};

const savePayment = async () => {
  if (!selectedInvoice) {
    return;
  }

  const tenderedCents = Math.round(
    (Number(document.getElementById("payment-amount").value) || 0) * 100,
  );
  const methodId = document.getElementById("payment-method").value;
  const method = paymentMethods.find((item) => {
    return String(item.payment_method_id) === methodId;
  });

  if (!methodId || tenderedCents <= 0) {
    Swal.fire({
      icon: "warning",
      title: "Payment details required",
      text: "Please select a payment method and enter a valid amount.",
    });
    return;
  }

  const ordered = selectedCustomerInvoices.slice().sort((first, second) => {
    return (
      String(first.due_date).localeCompare(String(second.due_date)) ||
      Number(first.invoice_id) - Number(second.invoice_id)
    );
  });
  const totalCents = ordered.reduce((sum, invoice) => {
    return sum + Math.round((Number(invoice.balance) || 0) * 100);
  }, 0);
  const cash = method?.method_name?.trim().toUpperCase() === "CASH";

  if (!cash && tenderedCents > totalCents) {
    Swal.fire({
      icon: "warning",
      title: "Amount exceeds AR balance",
      text: "A non-cash payment cannot exceed the customer's total AR balance.",
    });
    return;
  }

  const selectedBalanceCents = Math.round(
    (Number(selectedInvoice.balance) || 0) * 100,
  );
  const otherBalanceCents = selectedCustomerInvoices.reduce((sum, invoice) => {
    if (String(invoice.invoice_id) === String(selectedInvoice.invoice_id)) {
      return sum;
    }

    return sum + Math.round((Number(invoice.balance) || 0) * 100);
  }, 0);

  if (cash && tenderedCents > selectedBalanceCents && otherBalanceCents > 0) {
    const selectedExcess = tenderedCents - selectedBalanceCents;
    const amountToOtherInvoices = Math.min(
      selectedExcess,
      otherBalanceCents,
    );
    const changeCents = selectedExcess - amountToOtherInvoices;

    document.getElementById("payment-overflow-message").innerText =
      `This invoice has ₱${money(selectedBalanceCents / 100)} remaining. ` +
      `Distribute up to ₱${money(amountToOtherInvoices / 100)} to the customer's other open AR invoices` +
      `${changeCents > 0 ? ` and return ₱${money(changeCents / 100)} as change` : ""}?`;

    bootstrap.Modal.getOrCreateInstance(
      document.getElementById("payment-overflow-modal"),
    ).show();
    return;
  }

  submitPayment(!cash || tenderedCents <= selectedBalanceCents);
};

const submitPayment = async (distributeToOtherInvoices) => {
  const tenderedCents = Math.round(
    (Number(document.getElementById("payment-amount").value) || 0) * 100,
  );
  const methodId = document.getElementById("payment-method").value;
  const method = paymentMethods.find((item) => {
    return String(item.payment_method_id) === methodId;
  });
  const cash = method?.method_name?.trim().toUpperCase() === "CASH";

  const ordered = selectedCustomerInvoices
    .slice()
    .sort((first, second) => {
      return (
        String(first.due_date).localeCompare(String(second.due_date)) ||
        Number(first.invoice_id) - Number(second.invoice_id)
      );
    });
  const selectedFirst = ordered.filter((invoice) => {
    return String(invoice.invoice_id) === String(selectedInvoice.invoice_id);
  });
  const otherInvoices = ordered.filter((invoice) => {
    return String(invoice.invoice_id) !== String(selectedInvoice.invoice_id);
  });
  const paymentOrder = distributeToOtherInvoices
    ? [...selectedFirst, ...otherInvoices]
    : selectedFirst;
  let remaining = Math.min(
    tenderedCents,
    paymentOrder.reduce((sum, invoice) => {
      return sum + Math.round((Number(invoice.balance) || 0) * 100);
    }, 0),
  );
  const details = [];

  for (const invoice of paymentOrder) {
    if (remaining <= 0) {
      break;
    }

    const balanceCents = Math.round((Number(invoice.balance) || 0) * 100);
    const appliedCents = Math.min(remaining, balanceCents);

    if (appliedCents > 0) {
      details.push({
        invoiceId: invoice.invoice_id,
        amountApplied: (appliedCents / 100).toFixed(2),
      });
    }

    remaining -= appliedCents;
  }

  const appliedCents = details.reduce((sum, detail) => {
    return sum + Math.round(Number(detail.amountApplied) * 100);
  }, 0);
  const data = {
    header: {
      customerId: selectedInvoice.customer_id,
      amount: (appliedCents / 100).toFixed(2),
      amountTendered: (tenderedCents / 100).toFixed(2),
      paymentMethodId: methodId,
      referenceNumber: document.getElementById("payment-reference").value,
      remarks: document.getElementById("payment-remarks").value,
    },
    details: details,
  };

  const formData = new FormData();
  formData.append("operation", "savePayment");
  formData.append("json", JSON.stringify(data));

  const button = document.getElementById("button-save-payment");
  button.disabled = true;

  const response = await axios.post(`${baseAPI}/payments.php`, formData);

  if (Number(response.data) === 1) {
    bootstrap.Modal.getInstance(
      document.getElementById("paymentModal"),
    )?.hide();
    await displayInvoices();

    const changeText = cash && tenderedCents > appliedCents
      ? ` · Change: ₱${money((tenderedCents - appliedCents) / 100)}`
      : "";

    Swal.fire({
      icon: "success",
      title: "Payment saved",
      text: "Payment was recorded successfully.",
    });
  } else if (Number(response.data) === 2) {
    Swal.fire({
      icon: "warning",
      title: "Invoice balance changed",
      text: "Refresh and try again.",
    });
  } else {
    Swal.fire({
      icon: "error",
      title: "Payment could not be saved",
      text: "Please check the payment details and try again.",
    });
  }

  button.disabled = false;
};
