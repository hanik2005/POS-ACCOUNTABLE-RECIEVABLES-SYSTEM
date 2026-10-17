import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { formatCurrency, focusDialogInput, moveIndex } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";
import { refreshShift } from "./shift.js";

export const drawerTypes = [
  { label: "Float adjust - request add", movementType: "FLOAT_ADJUST", sign: 1 },
  { label: "Float adjust - request remove", movementType: "FLOAT_ADJUST", sign: -1 },
  { label: "Cash drop", movementType: "CASH_DROP", sign: 1 },
];

export const movementLabel = (item) => {
  if (item.movement_type == "CASH_DROP") {
    return "Cash drop";
  }

  return parseFloat(item.amount) > 0 ? "Float add" : "Float remove";
};

export const openDrawerDialog = async () => {
  if (state.dialog) {
    return;
  }

  await refreshShift();

  if (state.dialog || !state.shift) {
    return;
  }

  const shift = state.shift;

  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: {
      operation: "getCashMovements",
      json: JSON.stringify({ shiftId: shift.shift_id }),
    },
  });

  let index = 0;

  const render = () => {
    document.getElementById("dialog-list").innerHTML = drawerTypes
      .map((type, i) => `<div class="list-row ${i == index ? "active" : ""}"><span>${type.label}</span></div>`)
      .join("");
  };

  openDialog(
    "Cash drawer",
    `<div class="side-row"><span>Float left</span><span>${formatCurrency(parseFloat(shift.float_left))}</span></div>
     <div id="dialog-list" class="mt-2"></div>
     <input id="dialog-input" type="number" step="0.01" min="0.01" class="pos-input mt-2" placeholder="Amount">
     <input id="dialog-reason" type="text" class="pos-input mt-2" placeholder="Reason (optional)" autocomplete="off">
     ${response.data
       .slice(0, 5)
       .map(
         (item) => `
           <div class="list-row">
             <span>${movementLabel(item)}</span>
             <span>${item.status}</span>
             <span>${formatCurrency(Math.abs(parseFloat(item.amount)))}</span>
           </div>
         `,
       )
       .join("")}`,
    "↑↓ select · Enter = next / save · Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "ArrowDown" || e.key == "ArrowUp") {
        index = moveIndex(e, index, drawerTypes.length);
        render();
      } else if (e.key == "Enter") {
        e.preventDefault();

        const amount = parseFloat(document.getElementById("dialog-input").value);

        if (!(amount > 0)) {
          focusDialogInput();
        } else if (document.activeElement.id == "dialog-input") {
          document.getElementById("dialog-reason").focus();
        } else {
          saveMovement(drawerTypes[index], amount, document.getElementById("dialog-reason").value);
        }
      }
    },
  );

  render();
  focusDialogInput();
};

export const saveMovement = async (type, amount, reason) => {
  closeDialog();

  const jsonData = { shiftId: state.shift.shift_id, movementType: type.movementType, amount: amount * type.sign, reason: reason };

  const formData = new FormData();
  formData.append("operation", "saveCashMovement");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/shift.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1 && type.movementType == "FLOAT_ADJUST") {
    openMessageDialog("Float adjustment requested", `${type.sign > 0 ? "Add" : "Remove"} ${formatCurrency(amount)}. Waiting for a supervisor to approve and handle the drawer.`);
  } else if (response.data == 1) {
    openMessageDialog("Cash drop requested", `${formatCurrency(amount)}. A supervisor must approve the request and handle the cash drawer.`);
  } else {
    openMessageDialog("ERROR", "The cash movement was not saved.");
  }

  refreshShift();
};
