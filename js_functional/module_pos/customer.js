import { state } from "./state.js";
import { focusDialogInput, moveIndex } from "./utils.js";
import { openDialog, closeDialog } from "./dialog.js";
import { displayCustomer } from "./cart.js";

export const openCustomerDialog = (after, onCancel) => {
  let list = [];
  let index = 0;

  const render = () => {
    const search = document.getElementById("dialog-input").value.toLowerCase();

    list = state.customers.filter((item) => item.customer_name.toLowerCase().includes(search));

    index = Math.min(index, Math.max(list.length - 1, 0));

    document.getElementById("dialog-list").innerHTML =
      list.length == 0
        ? `<div class="list-row">No customer found.</div>`
        : list
            .map((item, i) => `<div class="list-row ${i == index ? "active" : ""}"><span>${item.customer_name}</span><span>${item.days_name}</span></div>`)
            .join("");
  };

  openDialog(
    "Customer",
    `<input id="dialog-input" type="text" class="pos-input" placeholder="Type the customer name" autocomplete="off">
     <div id="dialog-list"></div>`,
    "↑↓ select · Enter choose · Esc cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();

        if (onCancel) {
          onCancel();
        }
      } else if (e.key == "Enter") {
        e.preventDefault();

        const item = list[index];

        if (item) {
          state.customer = { customerId: item.customer_id, customerName: item.customer_name };

          displayCustomer();
          closeDialog();

          if (after) {
            after();
          }
        }
      } else {
        index = moveIndex(e, index, list.length);
        render();
      }
    },
  );

  document.getElementById("dialog-input").addEventListener("input", () => {
    index = 0;
    render();
  });

  render();
  focusDialogInput();
};
