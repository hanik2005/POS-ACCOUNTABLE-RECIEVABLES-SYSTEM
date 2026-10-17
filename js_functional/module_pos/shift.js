import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { formatCurrency, formatTime, focusEntry, focusDialogInput } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";

export const displayFloat = () => {
  const shift = state.shift;
  const pending = shift ? parseInt(shift.pending_requests) : 0;

  document.getElementById("bar-float").innerText = shift
    ? `${formatCurrency(parseFloat(shift.float_left))}${pending > 0 ? ` (${pending} pending)` : ""}`
    : "-";
};

export const refreshShift = async () => {
  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: { operation: "getPosSession" },
  });

  state.shift = response.data.shift;

  displayFloat();
};

export const loadPosSession = async () => {
  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: { operation: "getPosSession" },
  });

  state.terminal = response.data.terminal;
  state.shift = response.data.shift;

  const terminal = state.terminal;
  const shift = state.shift;

  document.getElementById("bar-cashier").innerText = response.data.cashier;
  document.getElementById("bar-terminal").innerText = terminal ? terminal.terminal_name : "NOT ASSIGNED";
  document.getElementById("bar-shift").innerText = shift ? `Open since ${formatTime(shift.opened_at)}` : "Not started";

  displayFloat();

  if (!terminal) {
    openDialog(
      "No terminal assigned",
      `<p class="dialog-text">This cashier has no terminal. Please ask the admin to assign one.</p>`,
      "",
      () => {},
    );
  } else if (!shift) {
    openStartShiftDialog();
  } else {
    focusEntry();
  }
};

export const openStartShiftDialog = () => {
  const terminal = state.terminal;

  openDialog(
    "Start shift",
    `<div class="pay-total">${formatCurrency(parseFloat(terminal.float_start))}</div>
     <div class="side-row"><span>Terminal</span><span>${terminal.terminal_name}</span></div>
     <div class="side-row"><span>Schedule</span><span>${terminal.schedule_name}</span></div>
     <p class="dialog-text">This is the float start (fund for change) of the terminal. Check that the cash drawer has it.</p>`,
    "Enter = start shift",
    (e) => {
      if (e.key == "Enter") {
        e.preventDefault();
        closeDialog();
        openShift();
      }
    },
  );
};

export const openShift = async () => {
  const formData = new FormData();
  formData.append("operation", "openShift");
  formData.append("json", JSON.stringify({}));

  const response = await axios({
    url: `${baseAPI}/shift.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    await loadPosSession();
  } else {
    openMessageDialog("ERROR", "The shift was not started.", openStartShiftDialog);
  }
};

export const openCloseShiftDialog = async () => {
  if (!state.shift) {
    openMessageDialog("Close shift", "There is no open shift yet.");
    return;
  }

  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: {
      operation: "getShiftReport",
      json: JSON.stringify({ shiftId: state.shift.shift_id }),
    },
  });

  const report = response.data[0];
  const gross = parseFloat(report.gross_sales);

  openDialog(
    "Close shift",
    `<table class="report-table">
        <tr><td>Cashier</td><td>${report.cashier}</td></tr>
        <tr><td>Terminal</td><td>${report.terminal_name}</td></tr>
        <tr><td>Schedule</td><td>${report.schedule_name}</td></tr>
        <tr><td>Opened</td><td>${formatTime(report.opened_at)}</td></tr>
        <tr><td>Transactions</td><td>${report.transactions}</td></tr>
        <tr><td>Sales</td><td>${formatCurrency(gross)}</td></tr>
        <tr class="expected"><td>Net sales</td><td>${formatCurrency(gross)}</td></tr>
        <tr><td>Float start</td><td>${formatCurrency(parseFloat(report.float_start))}</td></tr>
        <tr><td>Float adjust</td><td>${formatCurrency(parseFloat(report.float_adjust))}</td></tr>
        <tr><td>Change given</td><td>${formatCurrency(parseFloat(report.change_given))}</td></tr>
        <tr><td>Cash drop</td><td>${formatCurrency(parseFloat(report.cash_drop))}</td></tr>
      </table>
      <p class="dialog-text mt-2">Count the cash drawer after the cash drop. The closing cash is the float left for the next shift.</p>
      <input id="dialog-input" type="number" step="0.01" min="0" class="pos-input" placeholder="Closing cash (float left)" autocomplete="off">`,
    "Enter = close shift · Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();

        const closingCash = parseFloat(document.getElementById("dialog-input").value);

        if (closingCash >= 0) {
          closeShift(closingCash);
        } else {
          focusDialogInput();
        }
      }
    },
  );

  focusDialogInput();
};

export const closeShift = async (closingCash) => {
  closeDialog();

  const jsonData = { shiftId: state.shift.shift_id, closingCash: closingCash };

  const formData = new FormData();
  formData.append("operation", "closeShift");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/shift.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    openMessageDialog("Shift closed", `Float left for the next shift: ${formatCurrency(closingCash)}`, () => {
      window.location.reload();
    });
  } else if (response.data == 2) {
    openMessageDialog("Cash request pending", "Wait for the supervisor to approve or reject all cash drawer requests first.");
  } else {
    openMessageDialog("ERROR", "The shift was not closed.");
  }
};
