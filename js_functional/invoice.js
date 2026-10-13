import { paginate, createPagination } from "../js/module/pagination.js";

const baseAPI = "http://localhost/POS_AR_SYSTEM/api_functional";

sessionStorage.setItem("baseAPI", baseAPI);

let invoices = [];
let paymentMethods = [];
let selectedInvoice = null;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayInvoices();
  loadPaymentMethods();

  document.getElementById("button-save-payment").addEventListener("click", () => {
    savePayment();
  });

  document.getElementById("searchInvoice").addEventListener("input", function () {
    const searchValue = this.value.toLowerCase();
    const filtered = invoices.filter(
      (invoice) =>
        invoice.invoice_number.toLowerCase().includes(searchValue) ||
        (invoice.customer_name || "").toLowerCase().includes(searchValue) ||
        invoice.status.toLowerCase().includes(searchValue),
    );

    currentPage = 1;

    displayInvoicesTable(filtered);
  });
});

const displayInvoices = async () => {
  const response = await axios.get(`${baseAPI}/invoice.php`, {
    params: {
      operation: "getAllInvoices",
    },
  });

  if (response.status == 200) {
    console.log(response.data);

    invoices = response.data;

    displayInvoicesTable(response.data);
  } else {
    alert("ERROR");
  }
};

const displayInvoicesTable = (invoices) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(invoices, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
        <tr>
            <th>Invoice No.</th>
            <th>Sales ID</th>
            <th>Customer</th>
            <th>Sales Date</th>
            <th>Due Date</th>
            <th>Amount Due</th>
            <th>Paid</th>
            <th>Balance</th>
            <th>Status</th>
            <th>Action</th>
        </tr>
    `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  const today = new Date().toISOString().slice(0, 10);

  const totalBalance = invoices.reduce((sum, invoice) => sum + parseFloat(invoice.balance), 0);

  rows.forEach((invoice) => {
    const balance = parseFloat(invoice.balance);

    const isOverdue = balance > 0 && invoice.due_date < today;

    const tr = document.createElement("tr");

    if (isOverdue) {
      tr.classList.add("table-danger");
    }

    tr.innerHTML = `
            <td>${invoice.invoice_number}</td>
            <td>${invoice.sales_id}</td>
            <td>${invoice.customer_name || ""}</td>
            <td>${invoice.sales_date}</td>
            <td>${invoice.due_date}</td>
            <td>₱${parseFloat(invoice.amount_due).toFixed(2)}</td>
            <td>₱${parseFloat(invoice.total_paid).toFixed(2)}</td>
            <td>₱${balance.toFixed(2)}</td>
            <td>${invoice.status}${isOverdue ? " (OVERDUE)" : ""}</td>
            <td>${balance > 0 ? `<button type="button" class="btn btn-success btn-sm btn-pay">PAY</button>` : ""}</td>
        `;

    tBody.appendChild(tr);

    const payBtn = tr.querySelector(".btn-pay");

    if (payBtn) {
      payBtn.addEventListener("click", () => {
        openPaymentModal(invoice);
      });
    }
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(invoices.length, currentPage, (page) => {
      currentPage = page;

      displayInvoicesTable(invoices);
    }),
  );

  document.getElementById("totalReceivable").innerText = `₱${totalBalance.toFixed(2)}`;
};

const loadPaymentMethods = async () => {
  const response = await axios.get(`${baseAPI}/payments.php`, {
    params: { operation: "getPaymentMethods" },
  });

  if (response.status == 200) {
    paymentMethods = response.data;

    document.getElementById("payment-method").innerHTML = `<option value="">Select payment method</option>${paymentMethods.map((method) => `<option value="${method.payment_method_id}">${method.method_name}</option>`).join("")}`;
  } else {
    alert("Error!");
  }
};

const openPaymentModal = (invoice) => {
  selectedInvoice = invoice;

  const balance = parseFloat(invoice.balance).toFixed(2);

  document.getElementById("payment-invoice").innerText = `${invoice.invoice_number} - ${invoice.customer_name}`;
  document.getElementById("payment-balance").innerText = `₱${balance}`;
  document.getElementById("payment-amount").value = balance;
  document.getElementById("payment-reference").value = "";
  document.getElementById("payment-remarks").value = "";

  bootstrap.Modal.getOrCreateInstance(document.getElementById("paymentModal")).show();
};

const savePayment = async () => {
  const amount = parseFloat(document.getElementById("payment-amount").value);

  if (document.getElementById("payment-method").value == "" || !(amount > 0)) {
    alert("Please select a payment method and enter a valid amount.");
    return;
  }

  const header = {
    customerId: selectedInvoice.customer_id,
    amount: amount,
    paymentMethodId: document.getElementById("payment-method").value,
    referenceNumber: document.getElementById("payment-reference").value,
    remarks: document.getElementById("payment-remarks").value,
  };

  const details = [{ invoiceId: selectedInvoice.invoice_id, amountApplied: amount }];

  const jsonData = { header: header, details: details };

  const formData = new FormData();
  formData.append("operation", "savePayment");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/payments.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    bootstrap.Modal.getInstance(document.getElementById("paymentModal")).hide();
    displayInvoices();
    alert("Payment has been successfully saved!");
  } else if (response.data == 2) {
    alert("ERROR! Amount is more than the balance.");
  } else {
    alert("ERROR!");
  }
};