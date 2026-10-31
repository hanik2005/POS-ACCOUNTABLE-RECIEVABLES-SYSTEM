import { state } from "./module_pos/state.js";
import { entry } from "./module_pos/utils.js";
import { goFullScreen, enterFullScreen } from "./module_pos/fullscreen.js";
import { loadPosOptions } from "./module_pos/options.js";
import { loadPosSession, refreshShift, openCloseShiftDialog } from "./module_pos/shift.js";
import { openDrawerDialog } from "./module_pos/drawer.js";
import {
  displayCart,
  displayCustomer,
  addEntry,
  submitEntryQuantity,
  clearEntry,
  moveSuggestion,
  onEntryInput,
  initializeProductSuggestionSelection,
  moveSelected,
  changeQty,
  editQty,
  voidLine,
  restoreCartDraft,
} from "./module_pos/cart.js";
import { openCustomerDialog } from "./module_pos/customer.js";
import { startArCheckout, startWalkInCheckout } from "./module_pos/checkout.js";
import { holdSale, openRecallDialog, openVoidSaleDialog } from "./module_pos/hold.js";
import { leavePage, logout, openShiftReport } from "./module_pos/navigation.js";

const onPageLoad = async () => {
  displayCart();
  displayCustomer();

  await loadPosOptions();
  await loadPosSession();

  if (restoreCartDraft()) {
    displayCart();
    displayCustomer();
    const selectedItem = state.details[state.selected];
    document.getElementById("last-item").innerText = `${selectedItem.productName}  x${selectedItem.qty}`;
  }
};

document.addEventListener("keydown", (e) => {
  if (e.repeat && (["Enter", "Escape", "Delete"].includes(e.key) || /^F\d+$/.test(e.key))) {
    e.preventDefault();
    return;
  }

  if (state.dialog) {
    state.dialog.onKey(e);
    return;
  }

  if (e.key == "F5") {
    e.preventDefault();
    startArCheckout();
    return;
  }

  if (e.key == "F3") {
    e.preventDefault();
    leavePage(logout);
    return;
  }

  if (e.key == "F6") {
    e.preventDefault();
    leavePage(openShiftReport);
    return;
  }

  switch (e.key) {
    case "F2":
      e.preventDefault();
      openCustomerDialog();
      break;
    case "F4":
      e.preventDefault();
      holdSale();
      break;
    case "F7":
      e.preventDefault();
      openDrawerDialog();
      break;
    case "F8":
      e.preventDefault();
      openRecallDialog();
      break;
    case "F10":
      e.preventDefault();
      openCloseShiftDialog();
      break;
    case "F12":
      e.preventDefault();
      editQty();
      break;
    case "Escape":
      e.preventDefault();

      if (document.activeElement.id == "entry-qty") {
        if (state.pendingProduct) {
          clearEntry();
        } else {
          entry().focus();
        }
      } else if (entry().value != "") {
        clearEntry();
      } else {
        openVoidSaleDialog();
      }
      break;
    case "Delete":
      e.preventDefault();
      voidLine();
      break;
    case "ArrowDown":
    case "ArrowUp":
      if (["entry-qty", "cart-qty-input"].includes(document.activeElement.id)) {
        return;
      }

      e.preventDefault();

      if (state.suggestions.length > 0) {
        moveSuggestion(e.key == "ArrowDown" ? 1 : -1);
      } else {
        moveSelected(e.key == "ArrowDown" ? 1 : -1);
      }
      break;
    case "+":
    case "-":
      if (entry().value == "" && !["entry-qty", "cart-qty-input"].includes(document.activeElement.id)) {
        e.preventDefault();
        changeQty(e.key == "+" ? 1 : -1);
      }
      break;
    case "Enter":
      e.preventDefault();

      if (document.activeElement.id == "entry-qty") {
        submitEntryQuantity();
        return;
      }

      if (entry().value.trim() == "") {
        startWalkInCheckout();
      } else {
        addEntry();
      }
      break;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  entry().addEventListener("input", onEntryInput);
  initializeProductSuggestionSelection();

  document.getElementById("btn-drawer").addEventListener("click", () => {
    openDrawerDialog();
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    leavePage(logout);
  });

  document.getElementById("btn-report").addEventListener("click", () => {
    leavePage(openShiftReport);
  });

  document.addEventListener("click", (e) => {
    if (!state.dialog && !e.target.closest(".entry-wrap") && !e.target.closest("#cart-qty-input")) {
      entry().focus();
    }
  });

  setInterval(refreshShift, 30000);

  goFullScreen();

  document.addEventListener("keydown", enterFullScreen);
  document.addEventListener("click", enterFullScreen);

  onPageLoad();
});
