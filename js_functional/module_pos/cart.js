import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { entry, formatCurrency, formatNumber, showStatus } from "./utils.js";
import { openMessageDialog } from "./dialog.js";
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

const getCartDraftKey = () => {
  const shiftId = Number(state.shift && state.shift.shift_id);

  return Number.isInteger(shiftId) && shiftId > 0 ? `posCartDraft:${shiftId}` : null;
};

const removeCartDraft = (storageKey) => {
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    // Ignore storage errors so an expired or unavailable draft cannot block POS.
  }
};

export const saveCartDraft = () => {
  const storageKey = getCartDraftKey();

  if (!storageKey) {
    return;
  }

  try {
    if (state.details.length == 0) {
      sessionStorage.removeItem(storageKey);
      return;
    }

    sessionStorage.setItem(storageKey, JSON.stringify({
      shiftId: Number(state.shift.shift_id),
      details: state.details.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        productPrice: item.productPrice,
        qty: item.qty,
        amount: item.amount,
      })),
      customer: state.customer,
      saleType: state.saleType,
      recallId: state.recallId,
      selected: state.selected,
    }));
  } catch {
    // Keep the POS usable if browser storage is unavailable or full.
  }
};

export const restoreCartDraft = () => {
  const storageKey = getCartDraftKey();

  if (!storageKey) {
    return false;
  }

  let draft;

  try {
    const savedDraft = sessionStorage.getItem(storageKey);

    if (!savedDraft) {
      return false;
    }

    draft = JSON.parse(savedDraft);
  } catch {
    removeCartDraft(storageKey);
    return false;
  }

  if (!draft || typeof draft != "object"
    || Number(draft.shiftId) != Number(state.shift.shift_id) || !Array.isArray(draft.details)) {
    removeCartDraft(storageKey);
    return false;
  }

  const details = draft.details.map((item) => {
    if (!item || typeof item != "object") {
      return null;
    }

    const productId = Number(item.productId);
    const productPrice = Number(item.productPrice);
    const qty = Number(item.qty);

    if (!Number.isInteger(productId) || productId < 1
      || !Number.isFinite(productPrice) || productPrice < 0
      || !Number.isInteger(qty) || qty < 1) {
      return null;
    }

    const price = Math.round(productPrice * 100) / 100;

    return {
      productId: productId,
      productName: String(item.productName || `Product ${productId}`),
      productPrice: price,
      qty: qty,
      amount: Math.round(price * qty * 100) / 100,
    };
  }).filter(Boolean);

  if (details.length == 0) {
    removeCartDraft(storageKey);
    return false;
  }

  state.details = details;
  state.customer = draft.customer && Number.isInteger(Number(draft.customer.customerId))
    && Number(draft.customer.customerId) > 0
    ? {
      customerId: Number(draft.customer.customerId),
      customerName: String(draft.customer.customerName || ""),
    }
    : null;
  state.saleType = ["AR", "WALK_IN"].includes(draft.saleType) ? draft.saleType : null;
  state.recallId = Number.isInteger(Number(draft.recallId)) && Number(draft.recallId) > 0
    ? Number(draft.recallId)
    : null;
  state.selected = Number.isInteger(Number(draft.selected))
    ? Math.min(Math.max(Number(draft.selected), 0), details.length - 1)
    : details.length - 1;

  return true;
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
        <button type="button" class="suggest-item ${i == state.suggestIndex ? "active" : ""}"
          data-product-index="${i}" aria-label="Select ${escapeHtml(product.product_name)}">
          <span>${escapeHtml(product.product_name)}</span>
          <span>${formatCurrency(parseFloat(product.unit_price))}</span>
        </button>
      `,
    )
    .join("");
};

export const onEntryInput = () => {
  state.pendingProduct = null;
  document.getElementById("entry-qty").value = "1";
  const wasEditingQuantity = state.editingQtyIndex >= 0;
  state.editingQtyIndex = -1;

  if (wasEditingQuantity) {
    displayCart();
  }

  state.suggestIndex = 0;
  showStatus("");
  displaySuggestions();
};

export const clearEntry = () => {
  state.pendingProduct = null;
  document.getElementById("entry-qty").value = "1";
  const wasEditingQuantity = state.editingQtyIndex >= 0;
  state.editingQtyIndex = -1;

  if (wasEditingQuantity) {
    displayCart();
  }

  entry().value = "";
  state.suggestIndex = 0;
  showStatus("");
  displaySuggestions();
  entry().focus();
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
        <tr class="${i == state.selected ? "selected" : ""}" data-cart-index="${i}">
          <td>${escapeHtml(item.productName)}</td>
          <td class="text-end">${formatCurrency(item.productPrice)}</td>
          <td class="text-end">${i == state.editingQtyIndex
            ? `<input id="cart-qty-input" type="number" min="1" step="1" value="${item.qty}"
                class="cart-qty-input" aria-label="Adjust quantity for ${escapeHtml(item.productName)}">`
            : formatNumber(item.qty, 0)}</td>
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
  saveCartDraft();

  const quantityInput = document.getElementById("cart-qty-input");

  if (quantityInput) {
    quantityInput.addEventListener("keydown", (event) => {
      if (event.key == "Enter") {
        event.preventDefault();
        event.stopPropagation();
        saveEditedQuantity(quantityInput.value);
      } else if (event.key == "Escape") {
        event.preventDefault();
        event.stopPropagation();
        state.editingQtyIndex = -1;
        displayCart();
        entry().focus();
      }
    });
  }
};

export const initializeProductSuggestionSelection = () => {
  const suggestionBox = document.getElementById("suggest");

  if (!suggestionBox.dataset.productSelectionBound) {
    suggestionBox.dataset.productSelectionBound = "true";
    suggestionBox.addEventListener("click", (event) => {
      const suggestion = event.target.closest("[data-product-index]");
      const product = suggestion ? state.suggestions[Number(suggestion.dataset.productIndex)] : null;

      if (product) {
        selectProductForQuantity(product);
      }
    });
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

const addProduct = (product, qty) => {
  state.editingQtyIndex = -1;
  addToCart(product, qty);
  state.pendingProduct = null;
  document.getElementById("entry-qty").value = "1";
  entry().value = "";
  state.suggestIndex = 0;
  state.suggestions = [];
  showStatus("");
  displaySuggestions();
  entry().focus();
};

const selectProductForQuantity = (product) => {
  state.pendingProduct = product;
  state.suggestions = [];
  document.getElementById("suggest").innerHTML = "";
  document.getElementById("entry-qty").value = "1";
  showStatus(`${product.product_name} selected. Enter a quantity.`);

  const quantityInput = document.getElementById("entry-qty");
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

  selectProductForQuantity(product);
};

export const submitEntryQuantity = () => {
  if (!state.pendingProduct) {
    if (entry().value.trim() != "") {
      addEntry();
    } else {
      entry().focus();
    }
    return;
  }

  const quantityInput = document.getElementById("entry-qty");
  const qty = Number(quantityInput.value);

  if (!Number.isInteger(qty) || qty < 1) {
    showStatus("Enter a whole quantity of 1 or more.");
    quantityInput.focus();
    quantityInput.select();
    return;
  }

  addProduct(state.pendingProduct, qty);
};

export const moveSelected = (step) => {
  if (state.details.length == 0) {
    return;
  }

  state.editingQtyIndex = -1;
  state.selected = Math.min(Math.max(state.selected + step, 0), state.details.length - 1);

  displayCart();
};

export const changeQty = (step) => {
  if (state.selected < 0 || state.selected >= state.details.length) {
    return;
  }

  if (state.editingQtyIndex >= 0) {
    state.editingQtyIndex = -1;
    displayCart();
  }

  const item = state.details[state.selected];

  if (step < 0) {
    if (item.qty <= 1) {
      voidLine();
      return;
    }

    requestQuantityReduction(item, item.qty - 1);
    return;
  }

  item.qty += step;
  item.amount = item.productPrice * item.qty;

  displayCart();
};

export const editQty = () => {
  if (state.selected < 0 || state.selected >= state.details.length) {
    openMessageDialog("Select a product", "Select a cart line before adjusting its quantity.");
    return;
  }

  state.editingQtyIndex = -1;
  const item = state.details[state.selected];
  state.editingQtyIndex = state.selected;
  displayCart();

  const quantityInput = document.getElementById("cart-qty-input");
  quantityInput.focus();
  quantityInput.select();
};

const saveEditedQuantity = (value) => {
  const quantity = Number(value);
  const item = state.details[state.editingQtyIndex];

  if (!item) {
    state.editingQtyIndex = -1;
    displayCart();
    return;
  }

  if (!Number.isInteger(quantity) || quantity < 1) {
    showStatus("Enter a whole quantity of 1 or more.");
    const quantityInput = document.getElementById("cart-qty-input");
    quantityInput.focus();
    quantityInput.select();
    return;
  }

  if (quantity < item.qty) {
    requestQuantityReduction(item, quantity);
    return;
  }

  applyEditedQuantity(item, quantity);
};

const applyEditedQuantity = (item, quantity) => {
  const itemIndex = state.details.indexOf(item);

  if (itemIndex < 0) {
    return;
  }

  item.qty = quantity;
  item.amount = item.productPrice * quantity;
  state.selected = itemIndex;
  state.editingQtyIndex = -1;
  document.getElementById("last-item").innerText = `${item.productName}  x${formatNumber(quantity, 0)}`;
  displayCart();
  entry().focus();
};

const requestQuantityReduction = (item, quantity) => {
  const quantityBefore = item.qty;
  const quantityReduced = quantityBefore - quantity;
  const reducedAmount = Math.round(item.productPrice * quantityReduced * 100) / 100;
  const details = {
    productId: item.productId,
    productName: item.productName,
    productPrice: item.productPrice,
    qty: quantityReduced,
    quantityBefore: quantityBefore,
    quantityAfter: quantity,
    amount: reducedAmount,
  };

  state.editingQtyIndex = -1;
  displayCart();

  openSupervisorApprovalDialog(
    "Reduce quantity",
    `Reduce ${escapeHtml(item.productName)} from ${formatNumber(quantityBefore, 0)} to ${formatNumber(quantity, 0)}? Amount reduced: ${formatCurrency(reducedAmount)}.`,
    async (credentials) => {
      const formData = new FormData();
      formData.append("operation", "authorizePosVoid");
      formData.append("json", JSON.stringify({
        shiftId: state.shift ? state.shift.shift_id : null,
        actionType: "QUANTITY_REDUCE",
        amount: reducedAmount,
        details: details,
        supervisorPin: credentials.supervisorPin,
        reason: credentials.reason,
      }));

      const response = await axios({
        url: `${baseAPI}/shift.php`,
        method: "POST",
        data: formData,
      });

      if (response.data == 1) {
        applyEditedQuantity(item, quantity);
        return {
          success: true,
          afterClose: () => openMessageDialog("Quantity reduced", "The supervisor approved and recorded the quantity reduction."),
        };
      }

      return {
        success: false,
        message: response.data == 3
          ? "Supervisor PIN not recognized. Check that the PIN is active and try again."
          : "The quantity could not be reduced. Confirm the open shift and try again.",
      };
    },
  );
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
  state.editingQtyIndex = -1;
  state.pendingProduct = null;
  document.getElementById("entry-qty").value = "1";

  document.getElementById("last-item").innerText = "-";

  displayCart();
  displayCustomer();
};
