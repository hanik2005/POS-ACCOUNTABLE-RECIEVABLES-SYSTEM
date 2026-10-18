import { state } from "./state.js";
import { entry, formatCurrency, formatNumber, showStatus } from "./utils.js";

let editingQtyIndex = null;

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
    .filter((product) => product.product_name.toLowerCase().includes(search) || (product.barcode || "").toLowerCase().includes(search))
    .slice(0, 6);

  state.suggestIndex = Math.min(state.suggestIndex, Math.max(state.suggestions.length - 1, 0));

  box.innerHTML = state.suggestions
    .map(
      (product, i) => `
        <button type="button" class="suggest-item ${i == state.suggestIndex ? "active" : ""}" data-product-index="${i}">
          <span>${escapeHtml(product.product_name)}</span>
          <span>${formatCurrency(parseFloat(product.unit_price))}</span>
        </button>
      `,
    )
    .join("");

  box.querySelectorAll("button[data-product-index]").forEach((button) => {
    button.addEventListener("click", () => {
      addProduct(state.suggestions[parseInt(button.dataset.productIndex, 10)]);
    });
  });
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
          <td>${item.productName}</td>
          <td class="text-end">${formatCurrency(item.productPrice)}</td>
          <td class="text-end">
            ${editingQtyIndex == i
              ? `<input type="number" class="cart-qty-input" data-index="${i}" value="${item.qty}" min="1" step="1" aria-label="Change quantity for ${escapeHtml(item.productName)}">`
              : `<button type="button" class="cart-qty-edit" data-index="${i}" aria-label="Edit quantity for ${escapeHtml(item.productName)}" title="Click to edit quantity">${formatNumber(item.qty, 0)}</button>`}
          </td>
          <td class="text-end">${formatCurrency(item.amount)}</td>
        </tr>
      `,
    )
    .join("");

  tbody.querySelectorAll(".cart-qty-edit").forEach((button) => {
    button.addEventListener("click", () => {
      editingQtyIndex = parseInt(button.dataset.index, 10);
      state.selected = editingQtyIndex;
      displayCart();

      const input = tbody.querySelector(".cart-qty-input");
      input.focus();
      input.select();
    });
  });

  const qtyInput = tbody.querySelector(".cart-qty-input");

  if (qtyInput) {
    const index = parseInt(qtyInput.dataset.index, 10);

    qtyInput.addEventListener("keydown", (event) => {
      event.stopPropagation();

      if (event.key == "Enter") {
        event.preventDefault();
        commitQtyEdit(index, true);
      } else if (event.key == "Escape") {
        event.preventDefault();
        cancelQtyEdit(true);
      }
    });

    qtyInput.addEventListener("blur", () => {
      commitQtyEdit(index);
    });
  }

  const row = tbody.querySelector(".selected");

  if (row) {
    row.scrollIntoView({ block: "nearest" });
  }

  document.getElementById("total").innerText = formatCurrency(getTotalSales());
  document.getElementById("count").innerText = formatNumber(getTotalQty(), 0);
};

const commitQtyEdit = (index, focusProduct = false) => {
  if (editingQtyIndex != index) {
    return;
  }

  const input = document.querySelector(`.cart-qty-input[data-index="${index}"]`);
  const quantity = Number(input.value);

  if (!Number.isInteger(quantity) || quantity < 1) {
    editingQtyIndex = null;
    displayCart();
    showStatus("Enter a whole quantity greater than zero.");
    return;
  }

  state.details[index].qty = quantity;
  state.details[index].amount = state.details[index].productPrice * quantity;
  state.selected = index;
  editingQtyIndex = null;
  displayCart();
  showStatus("");

  if (focusProduct) {
    entry().focus();
  }
};

const cancelQtyEdit = (focusProduct = false) => {
  editingQtyIndex = null;
  displayCart();

  if (focusProduct) {
    entry().focus();
  }
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

const addProduct = (product) => {
  addToCart(product, 1);
  entry().value = "";
  state.suggestIndex = 0;
  showStatus("");
  displaySuggestions();
  entry().focus();
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

  addProduct(product);
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

export const voidLine = () => {
  if (state.selected < 0 || state.selected >= state.details.length) {
    return;
  }

  state.details.splice(state.selected, 1);

  state.selected = Math.min(state.selected, state.details.length - 1);

  displayCart();
};

export const resetSale = () => {
  editingQtyIndex = null;
  state.details = [];
  state.customer = null;
  state.saleType = null;
  state.recallId = null;
  state.selected = -1;

  document.getElementById("last-item").innerText = "-";

  displayCart();
  displayCustomer();
};
