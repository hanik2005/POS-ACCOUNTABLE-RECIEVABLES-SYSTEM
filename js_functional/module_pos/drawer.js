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
     <input id="dialog-reason" type="text" class="pos-input mt-2" placeholder="Reason for movement" autocomplete="off">
     ${response.data
       .slice(0, 5)
       .map(
         (item) => `
           <div class="list-row">
             <span>${movementLabel(item)}</span>
             <span>${item.status}</span>
             <span>${formatCurrency(Math.abs(parseFloat(item.amount)))}</span>
            <span>${item.approver_name || "Supervisor not recorded"}</span>
           </div>
         `,
       )
       .join("")}
     <label class="dialog-label" for="supervisor-username">Supervisor username</label>
     <input id="supervisor-username" type="text" class="pos-input mt-2"
       placeholder="Supervisor username" autocomplete="username">
     <label class="dialog-label" for="supervisor-password">Supervisor password</label>
     <input id="supervisor-password" type="password" class="pos-input mt-2"
       placeholder="Supervisor password" autocomplete="current-password">`,
    "↑↓ select · Enter = next / record with supervisor sign-in · Esc = cancel",
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
            "dialog-reason": "supervisor-username",
            "supervisor-username": "supervisor-password",
          }[document.activeElement.id];

          if (nextField) {
            document.getElementById(nextField).focus();
          } else {
            saveMovement(
              drawerTypes[index],
              amount,
              document.getElementById("dialog-reason").value,
              document.getElementById("supervisor-username").value.trim(),
              document.getElementById("supervisor-password").value,
            );
          }
        }
      }
    },
  );

  render();
  focusDialogInput();
};

export const saveMovement = async (type, amount, reason, supervisorUsername, supervisorPassword) => {
  if (reason.trim() == "") {
    document.getElementById("dialog-reason").focus();
    return;
  }

  closeDialog();

  const jsonData = {
    shiftId: state.shift.shift_id,
    movementType: type.movementType,
    amount: amount * type.sign,
    reason: reason,
    supervisorUsername: supervisorUsername,
    supervisorPassword: supervisorPassword,
  };

  const formData = new FormData();
  formData.append("operation", "saveCashMovement");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/shift.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1 && type.movementType == "FLOAT_ADJUST") {
    openMessageDialog(
      "Float updated",
      `${type.sign > 0 ? "Added" : "Removed"} ${formatCurrency(amount)}. The supervisor recorded the change at this POS.`,
    );
  } else if (response.data == 1) {
    openMessageDialog(
      "Cash dropped",
      `${formatCurrency(amount)} was recorded by the supervisor at this POS.`,
    );
  } else if (response.data == 3) {
    openMessageDialog("Supervisor verification failed", "Check the supervisor username and password.");
  } else if (response.data == 4) {
    openMessageDialog(
      "Not enough cash",
      "The float adjustment or cash drop is greater than the cash currently in the drawer.",
    );
  } else {
    openMessageDialog("ERROR", "The cash movement was not saved. Check the open shift and try again.");
  }

  refreshShift();
};
