import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { formatCurrency, formatNumber, moveIndex } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";
import { displayCart, displayCustomer, getTotalSales, getTotalQty, resetSale } from "./cart.js";
import { saveSale } from "./checkout.js";
import { openSupervisorApprovalDialog } from "./supervisor.js";
import { openCustomerDialog } from "./customer.js";

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

export const holdSale = () => {
  if (state.details.length == 0) {
    openMessageDialog("Cannot hold sale", "Add at least one product before holding a sale.");
    return;
  }

  const modes = ["Walk-in customer", "Accounts Receivable - charge to customer"];
  const previousCustomer = state.customer;
  const previousSaleType = state.saleType;
  let index = state.customer ? 1 : 0;

  const render = () => {
    document.getElementById("dialog-list").innerHTML = modes.map((mode, i) => `
      <button type="button" class="list-row ${i == index ? "active" : ""}" data-hold-mode="${i}">
        <span>${mode}</span>
      </button>
    `).join("");
  };

  const chooseMode = () => {
    closeDialog();

    if (index == 0) {
      state.saleType = "WALK_IN";
      state.customer = null;
      displayCustomer();
      saveSale("HOLD");
      return;
    }

    if (state.customers.length == 0) {
      state.customer = previousCustomer;
      state.saleType = previousSaleType;
      openMessageDialog("No AR customers", "Add an active customer before holding an Accounts Receivable sale.");
      return;
    }

    state.saleType = "AR";

    if (previousCustomer) {
      state.customer = previousCustomer;
      displayCustomer();
      saveSale("HOLD");
      return;
    }

    state.customer = null;
    displayCustomer();
    openCustomerDialog(
      () => {
        state.saleType = "AR";
        saveSale("HOLD");
      },
      () => {
        state.customer = previousCustomer;
        state.saleType = previousSaleType;
        displayCustomer();
      },
    );
  };

  openDialog(
    "Choose customer type",
    `<p class="dialog-text">Choose whether this held sale is for a walk-in customer or an AR account.</p>
     <div id="dialog-list"></div>`,
    "Up/down = select | Enter = continue | Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        chooseMode();
      } else {
        index = moveIndex(e, index, modes.length);
        render();
      }
    },
  );

  document.getElementById("dialog-list").addEventListener("click", (e) => {
    const button = e.target.closest("[data-hold-mode]");

    if (button) {
      index = parseInt(button.dataset.holdMode, 10);
      chooseMode();
    }
  });

  render();
};

export const openRecallDialog = async () => {
  if (state.details.length > 0) {
    openMessageDialog("Recall", "Finish or hold the current sale first.");
    return;
  }

  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: { operation: "getHeldSales" },
  });

  const held = response.data;
  let index = 0;

  if (held.length == 0) {
    openMessageDialog("Recall", "There are no held sales.");
    return;
  }

  const render = () => {
    document.getElementById("dialog-list").innerHTML = held
      .map(
        (sale, i) => `
          <div class="list-row ${i == index ? "active" : ""}">
            <span>${escapeHtml(sale.recall_name)}</span>
            <span>${formatNumber(parseFloat(sale.item_count), 0)} item(s)</span>
            <span>${formatCurrency(parseFloat(sale.total_amount))}</span>
          </div>
        `,
      )
      .join("");
  };

  openDialog(
    "Held sales",
    `<div id="dialog-list"></div>`,
    "\u2191\u2193 select \u00b7 Enter view items \u00b7 F2 remove with supervisor PIN \u00b7 Esc cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        showHeldSale(held[index]);
      } else if (e.key == "F2") {
        e.preventDefault();
        removeHeldSale(held[index]);
      } else {
        index = moveIndex(e, index, held.length);
        render();
      }
    },
  );

  render();
};

const removeHeldSale = (held) => {
  openSupervisorApprovalDialog(
    "Remove held sale",
    `Void the held sale for ${escapeHtml(held.recall_name)} (${formatNumber(Number(held.item_count) || 0, 0)} item(s), ${formatCurrency(Number(held.total_amount) || 0)})? Enter the supervisor PIN and reason.`,
    async (credentials) => {
      const formData = new FormData();
      formData.append("operation", "authorizeHeldSaleRemoval");
      formData.append("json", JSON.stringify({
        shiftId: state.shift ? state.shift.shift_id : null,
        salesId: held.sales_id,
        supervisorPin: credentials.supervisorPin,
        reason: credentials.reason,
      }));

      const response = await axios({
        url: `${baseAPI}/shift.php`,
        method: "POST",
        data: formData,
      });

      if (response.data == 1) {
        return {
          success: true,
          afterClose: () => openMessageDialog(
            "Held sale removed",
            "The supervisor approved and recorded this held sale as a void.",
            () => openRecallDialog(),
          ),
        };
      }

      return {
        success: false,
        message: response.data == 3
          ? "Supervisor PIN not recognized. Check that the PIN is active and try again."
          : response.data == 4
            ? "The held sale is no longer available, or the cashier's open shift changed. Refresh held sales and try again."
            : "The held sale could not be removed. Confirm that you are signed in as its cashier and have an open shift.",
      };
    },
  );
};

const showHeldSale = async (held) => {
  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: {
      operation: "getHeldSale",
      json: JSON.stringify({ salesId: held.sales_id }),
    },
  });

  const details = response.data;
  const invalidDetails = !Array.isArray(details) || details.length == 0
    || details.some((line) => {
      const quantity = Number(line.quantity);
      const unitPrice = Number(line.unit_price);
      const lineTotal = Number(line.line_total);

      return !Number.isInteger(quantity) || quantity < 1
        || !Number.isFinite(unitPrice) || unitPrice < 0
        || !Number.isFinite(lineTotal) || lineTotal < 0
        || Math.round(unitPrice * quantity * 100) != Math.round(lineTotal * 100);
    });
  const detailTotalCents = Array.isArray(details)
    ? details.reduce((sum, line) => sum + Math.round(Number(line.line_total) * 100), 0)
    : 0;

  if (invalidDetails || detailTotalCents != Math.round(Number(held.total_amount) * 100)) {
    openMessageDialog("Invalid held sale", "This held sale has no valid items and cannot be recalled.");
    return;
  }

  const itemRows = details
    .map((line) => `
      <div class="list-row">
        <span>${escapeHtml(line.product_name)} x${formatNumber(parseFloat(line.quantity), 0)}</span>
        <span>${formatCurrency(parseFloat(line.line_total))}</span>
      </div>
    `)
    .join("");

  openDialog(
    `Recall ${escapeHtml(held.recall_name)}`,
    `<div class="recall-items">${itemRows}</div>
     <div class="side-row"><strong>Total</strong><strong>${formatCurrency(parseFloat(held.total_amount))}</strong></div>`,
    "Enter = recall sale \u00b7 F2 = remove with supervisor PIN \u00b7 Esc = back to held sales",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        openRecallDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        recallSale(held, details);
      } else if (e.key == "F2") {
        e.preventDefault();
        removeHeldSale(held);
      }
    },
  );
};

export const recallSale = async (held, lines) => {
  const details = lines || await getHeldSaleDetails(held.sales_id);

  state.details = details.map((line) => ({
    productId: line.product_id,
    productName: line.product_name,
    productPrice: parseFloat(line.unit_price),
    qty: parseInt(line.quantity, 10),
    amount: parseFloat(line.line_total),
  }));

  state.customer = held.customer_id
    ? { customerId: held.customer_id, customerName: held.customer_name }
    : null;
  state.saleType = held.customer_id ? "AR" : "WALK_IN";
  state.recallId = held.sales_id;
  state.selected = state.details.length - 1;

  closeDialog();
  displayCart();
  displayCustomer();
};

const getHeldSaleDetails = async (salesId) => {
  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: {
      operation: "getHeldSale",
      json: JSON.stringify({ salesId: salesId }),
    },
  });

  return response.data;
};

export const openVoidSaleDialog = () => {
  if (state.details.length == 0) {
    return;
  }

  const saleDetails = state.details.map((item) => ({ ...item }));
  const total = getTotalSales();

  openSupervisorApprovalDialog(
    "Void sale",
    `Void ${getTotalQty()} item(s) - ${formatCurrency(total)}? Enter the supervisor PIN.`,
    async (credentials) => {
      const formData = new FormData();
      formData.append("operation", "authorizePosVoid");
      formData.append("json", JSON.stringify({
        shiftId: state.shift ? state.shift.shift_id : null,
        actionType: "VOID_SALE",
        salesId: state.recallId,
        amount: total,
        details: saleDetails,
        supervisorPin: credentials.supervisorPin,
        reason: credentials.reason,
      }));

      const response = await axios({
        url: `${baseAPI}/shift.php`,
        method: "POST",
        data: formData,
      });

      if (response.data == 1) {
        resetSale();
        return {
          success: true,
          afterClose: () => openMessageDialog("Sale voided", "The supervisor approved this sale void."),
        };
      }

      return {
        success: false,
        message: response.data == 3
          ? "Supervisor PIN not recognized. Check that the PIN is active and try again."
          : "The sale could not be voided. Confirm the open shift and try again.",
      };
    },
  );
};
