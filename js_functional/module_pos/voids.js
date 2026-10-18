import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { formatCurrency, formatNumber, moveIndex } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";

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

export const openPaidVoidDialog = async () => {
  if (state.dialog) {
    const dialogBody = document.getElementById("dialog-body");

    if (!document.getElementById("paid-void-blocked-message")) {
      const message = document.createElement("p");
      message.id = "paid-void-blocked-message";
      message.className = "dialog-text";
      message.innerText = "Finish or close this POS dialog before opening Void Paid Sale.";
      dialogBody.prepend(message);
    }

    return;
  }

  if (!state.shift) {
    openMessageDialog("Void paid sale", "Start a cashier shift first. Only completed sales from the open shift can be selected.");
    return;
  }

  if (state.details.length > 0) {
    openMessageDialog("Void paid sale", "Finish, hold, or clear the current sale first.");
    return;
  }

  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: { operation: "getVoidableSales" },
  }).then(
    (result) => result,
    () => null,
  );

  if (!response || !Array.isArray(response.data)) {
    openMessageDialog("Unable to load paid sales", "Check the connection and try again.");
    return;
  }

  const sales = response.data;
  let index = 0;

  if (sales.length == 0) {
    openMessageDialog("Void paid sale", "There are no completed sales for this cashier's open shift.");
    return;
  }

  const render = () => {
    const list = document.getElementById("dialog-list");

    list.innerHTML = sales.map((sale, i) => `
      <div class="list-row ${i == index ? "active" : ""}">
        <span>${escapeHtml(sale.invoice_number || `Sale ${sale.sales_id}`)}</span>
        <span>${escapeHtml(sale.sale_type == "WALK_IN" ? "Walk-in" : sale.customer_name || "Customer")}</span>
        <span>${formatCurrency(sale.total_amount)}</span>
        <button type="button" class="void-details-btn" data-sale-index="${i}">Details</button>
      </div>
    `).join("");
  };

  openDialog(
    "Select paid sale to void",
    `<div id="dialog-list"></div>`,
    "Arrow keys = select | Enter = details | Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        showSaleDetails(sales[index]);
      } else {
        index = moveIndex(e, index, sales.length);
        render();
      }
    },
  );

  render();

  document.getElementById("dialog-list").addEventListener("click", (e) => {
    const button = e.target.closest("[data-sale-index]");

    if (button) {
      index = parseInt(button.dataset.saleIndex, 10);
      render();
      showSaleDetails(sales[index]);
    }
  });
};

const showSaleDetails = async (sale) => {
  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: {
      operation: "getVoidableSaleDetails",
      json: JSON.stringify({ salesId: sale.sales_id }),
    },
  }).then(
    (result) => result,
    () => null,
  );

  if (!response || !response.data || response.data == 0 || !Array.isArray(response.data.items)) {
    openMessageDialog("Unable to load sale details", "This sale may no longer be eligible to void. Refresh the list and try again.");
    return;
  }

  const detailRows = response.data.items.map((item) => `
    <tr>
      <td>${escapeHtml(item.product_name)}</td>
      <td class="text-end">${formatNumber(item.quantity, 0)}</td>
      <td class="text-end">${formatCurrency(item.unit_price)}</td>
      <td class="text-end">${formatCurrency(item.line_total)}</td>
    </tr>
  `).join("");

  openDialog(
    "Paid sale details",
    `<p class="dialog-text">${escapeHtml(sale.invoice_number || `Sale ${sale.sales_id}`)} - ${escapeHtml(sale.sale_type == "WALK_IN" ? "Walk-in customer" : sale.customer_name || "Customer")}</p>
     <table class="sale-details-table">
       <thead><tr><th>Product</th><th class="text-end">Qty</th><th class="text-end">Price</th><th class="text-end">Amount</th></tr></thead>
       <tbody>${detailRows}</tbody>
       <tfoot><tr><th colspan="3">Total</th><th class="text-end">${formatCurrency(sale.total_amount)}</th></tr></tfoot>
     </table>`,
    "Enter = continue to void approval | Esc = back to sales",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
        openPaidVoidDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        chooseVoidMethod(sale);
      }
    },
  );
};

const chooseVoidMethod = (sale) => {
  let index = 0;
  const methods = [
    "Supervisor is at this terminal — enter supervisor credentials",
    "Send request to supervisor for approval",
  ];

  const render = () => {
    document.getElementById("dialog-list").innerHTML = methods.map((method, i) => `
      <div class="list-row ${i == index ? "active" : ""}">
        <span>${method}</span>
      </div>
    `).join("");
  };

  openDialog(
    "Supervisor approval",
    `<p class="dialog-text">${escapeHtml(sale.invoice_number || `Sale ${sale.sales_id}`)} — ${formatCurrency(sale.total_amount)}</p>
     <div id="dialog-list"></div>`,
    "Arrow keys = select | Enter = continue | Esc = back",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
        openPaidVoidDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();

        if (index == 0) {
          openSupervisorCredentials(sale);
        } else {
          openVoidRequestReason(sale);
        }
      } else {
        index = moveIndex(e, index, methods.length);
        render();
      }
    },
  );

  render();
};

const openVoidRequestReason = (sale) => {
  openDialog(
    "Request sale void",
    `<p class="dialog-text">${escapeHtml(sale.invoice_number || `Sale ${sale.sales_id}`)} — ${formatCurrency(sale.total_amount)}</p>
     <label class="dialog-text" for="void-reason">Reason</label>
     <input id="void-reason" type="text" maxlength="255" class="pos-input" autocomplete="off" placeholder="Reason for voiding">
     <div id="void-error" class="entry-message"></div>`,
    "Enter = send request · Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        const reason = document.getElementById("void-reason").value.trim();

        if (reason == "") {
          document.getElementById("void-error").innerText = "Enter a reason before sending the request.";
          document.getElementById("void-reason").focus();
          return;
        }

        submitVoidRequest(sale, reason);
      }
    },
  );

  document.getElementById("void-reason").focus();
};

const submitVoidRequest = async (sale, reason) => {
  const formData = new FormData();
  formData.append("operation", "requestSaleVoid");
  formData.append("json", JSON.stringify({ salesId: sale.sales_id, reason: reason }));

  const response = await axios.post(`${baseAPI}/sales.php`, formData);
  closeDialog();

  if (response.data == 1) {
    openMessageDialog("Void request sent", "The sale stays completed until a supervisor approves the request.");
  } else if (response.data == 2) {
    openMessageDialog("Request already pending", "A supervisor already has a void request for this sale.");
  } else {
    openMessageDialog("Unable to request void", "The sale may no longer be eligible for a void.");
  }
};

const openSupervisorCredentials = (sale) => {
  openDialog(
    "Supervisor at POS terminal",
    `<p class="dialog-text">${escapeHtml(sale.invoice_number || `Sale ${sale.sales_id}`)} — ${formatCurrency(sale.total_amount)}</p>
     <p class="dialog-text">This marks the sale and invoice VOID. It does not issue or record a refund.</p>
     <input id="void-supervisor-username" type="text" class="pos-input" autocomplete="username" placeholder="Supervisor username">
     <input id="void-supervisor-password" type="password" class="pos-input mt-2" autocomplete="current-password" placeholder="Supervisor password">
     <input id="void-reason" type="text" maxlength="255" class="pos-input mt-2" autocomplete="off" placeholder="Reason for voiding">
     <div id="void-error" class="entry-message"></div>`,
    "Enter = approve and void · Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        authorizeVoid(sale);
      }
    },
  );

  document.getElementById("void-supervisor-username").focus();
};

const authorizeVoid = async (sale) => {
  const supervisorUsername = document.getElementById("void-supervisor-username").value.trim();
  const supervisorPassword = document.getElementById("void-supervisor-password").value;
  const reason = document.getElementById("void-reason").value.trim();

  if (supervisorUsername == "" || supervisorPassword == "" || reason == "") {
    document.getElementById("void-error").innerText = "Enter supervisor credentials and a reason.";
    return;
  }

  const formData = new FormData();
  formData.append("operation", "authorizeVoidSale");
  formData.append("json", JSON.stringify({
    salesId: sale.sales_id,
    supervisorUsername: supervisorUsername,
    supervisorPassword: supervisorPassword,
    reason: reason,
  }));

  const response = await axios.post(`${baseAPI}/sales.php`, formData);
  closeDialog();

  if (response.data == 1) {
    openMessageDialog("Sale voided", "The supervisor approved this void at the POS terminal.");
  } else if (response.data == 3) {
    openMessageDialog("Supervisor not verified", "Check the supervisor username and password.", () => {
      openSupervisorCredentials(sale);
    });
  } else {
    openMessageDialog("Unable to void sale", "This sale may already be voided or does not belong to this cashier.");
  }
};
