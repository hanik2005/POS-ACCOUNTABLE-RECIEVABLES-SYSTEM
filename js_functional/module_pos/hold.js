import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { formatCurrency, moveIndex } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";
import { displayCart, displayCustomer, getTotalSales, getTotalQty, resetSale } from "./cart.js";
import { saveSale } from "./checkout.js";

export const holdSale = () => {
  if (state.details.length == 0) {
    return;
  }

  saveSale("HOLD");
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
            <span>${sale.customer_name || "No customer yet"}</span>
            <span>${sale.item_count} item(s)</span>
            <span>${formatCurrency(parseFloat(sale.total_amount))}</span>
          </div>
        `,
      )
      .join("");
  };

  openDialog("Held sales", `<div id="dialog-list"></div>`, "↑↓ select · Enter recall · Esc cancel", (e) => {
    if (e.key == "Escape") {
      e.preventDefault();
      closeDialog();
    } else if (e.key == "Enter") {
      e.preventDefault();
      recallSale(held[index]);
    } else {
      index = moveIndex(e, index, held.length);
      render();
    }
  });

  render();
};

export const recallSale = async (held) => {
  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: {
      operation: "getHeldSale",
      json: JSON.stringify({ salesId: held.sales_id }),
    },
  });

  state.details = response.data.map((line) => ({
    productId: line.product_id,
    productName: line.product_name,
    productPrice: parseFloat(line.unit_price),
    qty: parseInt(line.quantity),
    amount: parseFloat(line.line_total),
  }));

  state.customer = held.customer_id ? { customerId: held.customer_id, customerName: held.customer_name } : null;
  state.recallId = held.sales_id;
  state.selected = state.details.length - 1;

  closeDialog();
  displayCart();
  displayCustomer();
};

export const voidSale = async (salesId) => {
  const jsonData = { salesId: salesId };

  const formData = new FormData();
  formData.append("operation", "voidSale");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/sales.php`,
    method: "POST",
    data: formData,
  });

  return response.data;
};

export const openVoidSaleDialog = () => {
  if (state.details.length == 0) {
    return;
  }

  openDialog(
    "Void sale",
    `<p class="dialog-text">Void this current sale? ${getTotalQty()} item(s) - ${formatCurrency(getTotalSales())}</p>`,
    "Enter = Yes · Esc = No",
    async (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        closeDialog();

        if (state.recallId) {
          await voidSale(state.recallId);
        }

        resetSale();
      }
    },
  );
};