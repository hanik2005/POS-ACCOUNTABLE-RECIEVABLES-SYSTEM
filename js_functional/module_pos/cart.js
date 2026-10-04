import { state } from "./state.js";
import { entry, formatCurrency, showStatus } from "./utils.js";

export const parseEntry = () => {
  const value = entry().value.trim();
  const match = value.match(/^(\d+)\s*\*\s*(.*)$/);

  if (match) {
    return { qty: parseInt(match[1]) || 1, text: match[2].trim() };
  }

  return { qty: 1, text: value };
};

export const displaySuggestions = () => {
  const box = document.getElementById("suggest");
  const search = parseEntry().text.toLowerCase();

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
        <div class="suggest-item ${i == state.suggestIndex ? "active" : ""}">
          <span>${product.product_name}</span>
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
          <td class="text-end">${item.qty}</td>
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
  document.getElementById("count").innerText = getTotalQty();
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

  document.getElementById("last-item").innerText = `${product.product_name}  x${qty}`;

  displayCart();
};

export const addEntry = () => {
  const { qty, text } = parseEntry();

  let product = state.products.find((product) => product.barcode == text);

  if (!product) {
    product = state.suggestions[state.suggestIndex];
  }

  if (!product) {
    showStatus(`Product not found: ${text}`);
    return;
  }

  addToCart(product, qty);

  entry().value = "";
  state.suggestIndex = 0;
  displaySuggestions();
  showStatus("");
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
  state.details = [];
  state.customer = null;
  state.recallId = null;
  state.selected = -1;

  document.getElementById("last-item").innerText = "-";

  displayCart();
  displayCustomer();
};