import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { entry, formatCurrency, formatNumber, showStatus } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";
import { openSupervisorApprovalDialog } from "./supervisor.js";

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

export const displaySuggestions = () => {
  const box = document.getElementById("suggest");
  const search = entry().value.trim().toLowerCase();

  if (search == "") {
    state.suggestions = [];
    box.innerHTML = "";
    return;
  }

  state.suggestions = state.products
    .filter((product) => {
      const nameMatch = product.product_name.toLowerCase().includes(search);
      const barcodeMatch = (product.barcode || "").toLowerCase().includes(search);

      return nameMatch || barcodeMatch;
    })
    .slice(0, 6);

  state.suggestIndex = Math.min(state.suggestIndex, Math.max(state.suggestions.length - 1, 0));

  box.innerHTML = state.suggestions
    .map(
      (product, i) => `
        <div class="suggest-item ${i == state.suggestIndex ? "active" : ""}">
          <span>${escapeHtml(product.product_name)}</span>
          <span>${formatCurrency(parseFloat(product.unit_price))}</span>
        </div>
      `,
    )
    .join("");
};

export const onEntryInput = () => {
  state.suggestIndex = 0;
  showStatus("");
  displaySuggestions();
};

export const clearEntry = () => {
  entry().value = "";
  state.suggestIndex = 0;
  displaySuggestions();
};

export const moveSuggestion = (step) => {
  if (state.suggestions.length == 0) {
    return;
  }

  state.suggestIndex =
    step > 0 ? Math.min(state.suggestIndex + 1, state.suggestions.length - 1) : Math.max(state.suggestIndex - 1, 0);

  displaySuggestions();
};

export const getTotalSales = () => {
  const totalSales = state.details.reduce((sum, item) => {
    return sum + item.amount;
  }, 0);

  return totalSales;
};

export const getTotalQty = () => {
  return state.details.reduce((sum, item) => sum + item.qty, 0);
};

export const displayCart = () => {
  const tbody = document.getElementById("cart-body");

  tbody.innerHTML = state.details
    .map(
      (item, i) => `
        <tr class="${i == state.selected ? "selected" : ""}">
          <td>${escapeHtml(item.productName)}</td>
          <td class="text-end">${formatCurrency(item.productPrice)}</td>
          <td class="text-end">${formatNumber(item.qty, 0)}</td>
          <td class="text-end">${formatCurrency(item.amount)}</td>
        </tr>
      `,
    )
    .join("");

  const row = tbody.querySelector(".selected");

  if (row) {
    row.scrollIntoView({ block: "nearest" });
  }

  document.getElementById("total").innerText = formatCurrency(getTotalSales());
  document.getElementById("count").innerText = formatNumber(getTotalQty(), 0);
};

export const displayCustomer = () => {
  const name = state.customer ? state.customer.customerName : "-";

  document.getElementById("bar-customer").innerText = name;
  document.getElementById("side-customer").innerText = name;
};

export const addToCart = (product, qty) => {
  const details = state.details;
  const price = parseFloat(product.unit_price);
  const index = details.findIndex((item) => item.productId == product.product_id);

  if (index >= 0) {
    details[index].qty += qty;
    details[index].amount = details[index].productPrice * details[index].qty;
    state.selected = index;
  } else {
    details.push({
      productId: product.product_id,
      productName: product.product_name,
      productPrice: price,
      qty: qty,
      amount: price * qty,
    });
    state.selected = details.length - 1;
  }

  document.getElementById("last-item").innerText = `${product.product_name}  x${formatNumber(qty, 0)}`;

  displayCart();
};

const addProduct = (product, qty) => {
  addToCart(product, qty);
  entry().value = "";
  state.suggestIndex = 0;
  showStatus("");
  displaySuggestions();
  entry().focus();
};

const openQuantityDialog = (product) => {
  openDialog(
    "Enter quantity",
    `<p class="dialog-text">${escapeHtml(product.product_name)} - ${formatCurrency(parseFloat(product.unit_price))}</p>
     <label class="dialog-label" for="dialog-input">Quantity</label>
     <input id="dialog-input" type="number" min="1" step="1" value="1" class="pos-input" autocomplete="off">`,
    "Enter = add product \u00b7 Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        const qty = Number(document.getElementById("dialog-input").value);

        if (!Number.isInteger(qty) || qty < 1) {
          document.getElementById("dialog-input").focus();
          return;
        }

        closeDialog();
        addProduct(product, qty);
      }
    },
  );

  const quantityInput = document.getElementById("dialog-input");
  quantityInput.focus();
  quantityInput.select();
};

export const addEntry = () => {
  const text = entry().value.trim();

  if (text == "") {
    return;
  }

  let product = state.products.find((item) => item.barcode == text);

  if (!product) {
    product = state.products.find((item) => item.product_name.toLowerCase() == text.toLowerCase());
  }

  if (!product) {
    product = state.suggestions[state.suggestIndex];
  }

  if (!product) {
    showStatus(`Product not found: ${text}`);
    return;
  }

  openQuantityDialog(product);
};

export const moveSelected = (step) => {
  if (state.details.length == 0) {
    return;
  }

  state.selected = Math.min(Math.max(state.selected + step, 0), state.details.length - 1);

  displayCart();
};

export const changeQty = (step) => {
  if (state.selected < 0 || state.selected >= state.details.length) {
    return;
  }

  const item = state.details[state.selected];

  item.qty = Math.max(item.qty + step, 1);
  item.amount = item.productPrice * item.qty;

  displayCart();
};

export const editQty = () => {
  if (state.selected < 0 || state.selected >= state.details.length) {
    openMessageDialog("Select a product", "Select a cart line before adjusting its quantity.");
    return;
  }

  const item = state.details[state.selected];

  openDialog(
    "Adjust quantity",
    `<p class="dialog-text">${escapeHtml(item.productName)}</p>
     <label class="dialog-label" for="dialog-input">Quantity</label>
     <input id="dialog-input" type="number" min="1" step="1" value="${item.qty}" class="pos-input" autocomplete="off">`,
    "Enter = save quantity \u00b7 Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        const quantity = Number(document.getElementById("dialog-input").value);

        if (!Number.isInteger(quantity) || quantity < 1) {
          document.getElementById("dialog-input").focus();
          return;
        }

        item.qty = quantity;
        item.amount = item.productPrice * quantity;
        document.getElementById("last-item").innerText = `${item.productName}  x${formatNumber(quantity, 0)}`;
        displayCart();
        closeDialog();
      }
    },
  );

  const quantityInput = document.getElementById("dialog-input");
  quantityInput.focus();
  quantityInput.select();
};

export const voidLine = () => {
  if (state.selected < 0 || state.selected >= state.details.length) {
    return;
  }

  const item = state.details[state.selected];
  const itemDetails = { ...item };

  openSupervisorApprovalDialog(
    "Void line",
    `Void ${escapeHtml(item.productName)} x${formatNumber(item.qty, 0)} - ${formatCurrency(item.amount)}?`,
    async (credentials) => {
      const formData = new FormData();
      formData.append("operation", "authorizePosVoid");
      formData.append("json", JSON.stringify({
        shiftId: state.shift ? state.shift.shift_id : null,
        actionType: "VOID_LINE",
        amount: item.amount,
        details: itemDetails,
        supervisorPin: credentials.supervisorPin,
        reason: credentials.reason,
      }));

      const response = await axios({
        url: `${baseAPI}/shift.php`,
        method: "POST",
        data: formData,
      });

      if (response.data == 1) {
        state.details.splice(state.selected, 1);
        state.selected = Math.min(state.selected, state.details.length - 1);
        displayCart();
        return {
          success: true,
          afterClose: () => openMessageDialog("Line voided", "The supervisor approved this line void."),
        };
      }

      return {
        success: false,
        message: response.data == 3
          ? "Supervisor PIN not recognized. Check that the PIN is active and try again."
          : "The line could not be voided. Confirm the open shift and try again.",
      };
    },
  );

};

export const resetSale = () => {
  state.details = [];
  state.customer = null;
  state.saleType = null;
  state.recallId = null;
  state.selected = -1;

  document.getElementById("last-item").innerText = "-";

  displayCart();
  displayCustomer();
};
