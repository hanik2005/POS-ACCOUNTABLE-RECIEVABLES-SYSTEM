import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { formatCurrency, focusDialogInput, moveIndex } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";
import { refreshShift } from "./shift.js";

export const drawerTypes = [
  { label: "Add float", movementType: "FLOAT_ADJUST", sign: 1 },
  { label: "Remove float", movementType: "FLOAT_ADJUST", sign: -1 },
  { label: "Cash drop", movementType: "CASH_DROP", sign: 1 },
];

export const movementLabel = (item) => {
  if (item.movement_type == "CASH_DROP") {
    return "Cash drop";
  }

  return parseFloat(item.amount) > 0 ? "Float add" : "Float remove";
};

const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}[character]));

export const openDrawerDialog = async () => {
  if (state.dialog) {
    return;
  }

  try {
    await refreshShift();
  } catch {
    openMessageDialog("Shift unavailable", "The active shift could not be loaded. Check the connection and try again.");
    return;
  }

  if (state.dialog || !state.shift) {
    return;
  }

  const shift = state.shift;

  let movements = [];

  try {
    const response = await axios.get(`${baseAPI}/shift.php`, {
      params: {
        operation: "getCashMovements",
        json: JSON.stringify({ shiftId: shift.shift_id }),
      },
    });
    movements = Array.isArray(response.data) ? response.data.slice(0, 5) : [];
  } catch {
    openMessageDialog("Cash drawer unavailable", "Cash movement history could not be loaded. Check the connection and try again.");
    return;
  }

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
     <input id="dialog-reason" type="text" class="pos-input mt-2" placeholder="Reason for movement" autocomplete="off">
     ${movements
       .map(
         (item) => `
           <div class="list-row">
             <span>${escapeHtml(movementLabel(item))}</span>
             <span>${escapeHtml(item.status)}</span>
             <span>${formatCurrency(Math.abs(Number(item.amount) || 0))}</span>
             <span>${escapeHtml(item.approver_name || "Supervisor not recorded")}</span>
           </div>
         `,
       )
       .join("")}
     <label class="dialog-label" for="supervisor-pin">Supervisor PIN</label>
     <input id="supervisor-pin" type="password" inputmode="numeric" maxlength="6" class="pos-input mt-2"
       placeholder="Enter 4-6 digit PIN" autocomplete="off">
     <p id="drawer-error" class="dialog-text" role="alert"></p>`,
    "↑↓ select · Enter = next / record with supervisor PIN · Esc = cancel",
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
        } else {
          const nextField = {
            "dialog-input": "dialog-reason",
            "dialog-reason": "supervisor-pin",
          }[document.activeElement.id];

          if (nextField) {
            document.getElementById(nextField).focus();
          } else {
            saveMovement(
              drawerTypes[index],
              amount,
              document.getElementById("dialog-reason").value,
              document.getElementById("supervisor-pin").value.trim(),
            );
          }
        }
      }
    },
  );

  render();
  focusDialogInput();
};

export const saveMovement = async (type, amount, reason, supervisorPin) => {
  if (reason.trim() == "") {
    document.getElementById("drawer-error").innerText = "Enter a reason for the cash movement.";
    document.getElementById("dialog-reason").focus();
    return;
  }

  if (!/^\d{4,6}$/.test(supervisorPin)) {
    document.getElementById("drawer-error").innerText = "Enter a 4-6 digit supervisor PIN.";
    document.getElementById("supervisor-pin").focus();
    return;
  }

  if (!state.shift || !Number.isFinite(amount) || amount <= 0) {
    document.getElementById("drawer-error").innerText = "Enter a valid amount for an active shift.";
    document.getElementById("dialog-input").focus();
    return;
  }

  closeDialog();

  const jsonData = {
    shiftId: state.shift.shift_id,
    movementType: type.movementType,
    amount: amount * type.sign,
    reason: reason,
    supervisorPin: supervisorPin,
  };

  const formData = new FormData();
  formData.append("operation", "saveCashMovement");
  formData.append("json", JSON.stringify(jsonData));

  let response;

  try {
    response = await axios({
      url: `${baseAPI}/shift.php`,
      method: "POST",
      data: formData,
    });
  } catch {
    openMessageDialog("Cash movement not saved", "The server request failed. Check the connection and try again.");
    return;
  }

  let shiftRefreshFailed = false;
  if (response.data == 1) {
    try {
      await refreshShift();
    } catch {
      shiftRefreshFailed = true;
    }
  }

  const refreshMessage = shiftRefreshFailed
    ? " The movement was saved, but the current shift summary could not be refreshed."
    : "";

  if (response.data == 1 && type.movementType == "FLOAT_ADJUST") {
    openMessageDialog(
      "Float updated",
      `${type.sign > 0 ? "Added" : "Removed"} ${formatCurrency(amount)}. The supervisor recorded the change at this POS.${refreshMessage}`,
    );
  } else if (response.data == 1) {
    openMessageDialog(
      "Cash dropped",
      `${formatCurrency(amount)} was recorded by the supervisor at this POS.${refreshMessage}`,
    );
  } else if (response.data == 3) {
    openMessageDialog("Supervisor PIN not recognized", "Check that the supervisor PIN is active and try again.");
  } else if (response.data == 4) {
    openMessageDialog(
      "Not enough cash",
      "The float adjustment or cash drop is greater than the cash currently in the drawer.",
    );
  } else {
    openMessageDialog("ERROR", "The cash movement was not saved. Check the open shift and try again.");
  }

};
