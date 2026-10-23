import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { formatCurrency, formatNumber, formatTime, focusEntry, focusDialogInput } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";

export const displayFloat = () => {
  const shift = state.shift;

  document.getElementById("bar-float").innerText = shift
    ? formatCurrency(parseFloat(shift.float_left))
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

  if (response.data.role == "SUPERVISOR") {
    document.getElementById("bar-cashier").innerText = response.data.cashier;
    document.getElementById("bar-terminal").innerText = "Cashier terminal required";
    document.getElementById("bar-shift").innerText = "Supervisor sign-in";
    document.getElementById("bar-float").innerText = "-";
    openMessageDialog(
      "Supervisor at POS",
      "Cash drawer and void approvals happen on the active cashier POS. "
        + "Log out, let the cashier open their shift, then enter your credentials in the approval prompt.",
    );
    return;
  }

  state.terminal = response.data.terminal;
  state.shift = response.data.shift;

  const terminal = state.terminal;
  const shift = state.shift;

  document.getElementById("bar-cashier").innerText = response.data.cashier;
  document.getElementById("bar-terminal").innerText = terminal ? terminal.terminal_name : "NOT ASSIGNED";
  document.getElementById("bar-shift").innerText = shift ? `Open since ${formatTime(shift.opened_at)}` : "Not started";

  displayFloat();

  if (!shift) {
    openStartShiftDialog();
  } else {
    focusEntry();
  }
};

export const openStartShiftDialog = () => {
  const terminal = state.terminal;
  const canStartShift = terminal && parseInt(terminal.can_start_shift) == 1;
  let details = `
    <p class="dialog-text">
      This cashier has no active terminal assignment. Ask the admin to assign a terminal and schedule.
    </p>`;

  if (terminal) {
    const scheduleHours = `${terminal.start_time.slice(0, 5)}–${terminal.end_time.slice(0, 5)}`;
    const scheduleMessage = canStartShift
      ? "The supervisor must count and approve a new starting float for this shift."
      : `Your assigned ${terminal.schedule_name} schedule is ${scheduleHours}.
        You cannot start outside those hours. Ask the admin to assign a schedule that covers this shift.`;

    details = `
      <div class="side-row"><span>Terminal</span><span>${terminal.terminal_name}</span></div>
      <div class="side-row"><span>Schedule</span><span>${terminal.schedule_name} (${scheduleHours})</span></div>
      <p class="dialog-text mt-2">${scheduleMessage}</p>
      ${canStartShift ? `
        <label class="dialog-label" for="dialog-input">Supervisor-approved starting float</label>
        <input id="dialog-input" type="number" step="0.01" min="0" class="pos-input"
          placeholder="Starting float" autocomplete="off">
        <label class="dialog-label" for="supervisor-username">Supervisor username</label>
        <input id="supervisor-username" type="text" class="pos-input"
          placeholder="Supervisor username" autocomplete="username">
        <label class="dialog-label" for="supervisor-password">Supervisor password</label>
        <input id="supervisor-password" type="password" class="pos-input"
          placeholder="Supervisor password" autocomplete="current-password">`
        : ""}`;
  }

  openDialog(
    terminal ? "Start shift" : "Shift unavailable",
    `${details}
     <div class="dialog-actions">
       <button type="button" id="start-shift-button" class="pos-action-button"
         ${canStartShift ? "" : "disabled"}>Start Shift</button>
       <button type="button" id="start-shift-logout" class="pos-action-button secondary">Log Out</button>
     </div>`,
    canStartShift ? "Enter = start shift · Choose Log Out to leave" : "Choose Log Out or ask the admin to update your assignment",
    (e) => {
      if (e.key == "Enter") {
        e.preventDefault();
        if (canStartShift) {
          const nextField = {
            "dialog-input": "supervisor-username",
            "supervisor-username": "supervisor-password",
          }[document.activeElement.id];

          if (nextField) {
            document.getElementById(nextField).focus();
          } else {
            submitOpenShift();
          }
        }
      }
    },
  );

  const startButton = document.getElementById("start-shift-button");

  if (startButton && canStartShift) {
    startButton.addEventListener("click", () => {
      submitOpenShift();
    });
  }

  document.getElementById("start-shift-logout").addEventListener("click", () => {
    closeDialog();
    document.getElementById("btn-logout").click();
  });

  if (canStartShift) {
    focusDialogInput();
  }
};

const submitOpenShift = () => {
  const floatStart = document.getElementById("dialog-input").value;
  const supervisorUsername = document.getElementById("supervisor-username").value.trim();
  const supervisorPassword = document.getElementById("supervisor-password").value;

  if (floatStart == "" || !Number.isFinite(Number(floatStart)) || Number(floatStart) < 0
    || supervisorUsername == "" || supervisorPassword == "") {
    openMessageDialog(
      "Starting float required",
      "Enter the float counted by the supervisor and the supervisor's username and password.",
      openStartShiftDialog,
    );
    return;
  }

  closeDialog();
  openShift(Number(floatStart), supervisorUsername, supervisorPassword);
};

export const openShift = async (floatStart, supervisorUsername, supervisorPassword) => {
  const formData = new FormData();
  formData.append("operation", "openShift");
  formData.append("json", JSON.stringify({
    floatStart: floatStart,
    supervisorUsername: supervisorUsername,
    supervisorPassword: supervisorPassword,
  }));

  const response = await axios({
    url: `${baseAPI}/shift.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    await loadPosSession();
  } else if (response.data == 2) {
    openMessageDialog(
      "Outside assigned schedule",
      "Ask the admin to assign you to the current schedule before starting the shift.",
      openStartShiftDialog,
    );
  } else if (response.data == 4) {
    openMessageDialog(
      "Supervisor verification failed",
      "Check that the username and password belong to an active supervisor.",
      openStartShiftDialog,
    );
  } else {
    openMessageDialog("ERROR", "The shift was not started.", openStartShiftDialog);
  }
};

export const openCloseShiftDialog = async (afterClose) => {
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

  if (!report) {
    openMessageDialog("Close shift", "The shift report could not be loaded.");
    return;
  }

  const gross = parseFloat(report.gross_sales);

  openDialog(
    "Close shift",
    `<table class="report-table">
        <tr><td>Cashier</td><td>${report.cashier}</td></tr>
        <tr><td>Terminal</td><td>${report.terminal_name}</td></tr>
        <tr><td>Schedule</td><td>${report.schedule_name}</td></tr>
        <tr><td>Opened</td><td>${formatTime(report.opened_at)}</td></tr>
        <tr><td>Transactions</td><td>${formatNumber(report.transactions, 0)}</td></tr>
        <tr><td>Gross sales</td><td>${formatCurrency(gross)}</td></tr>
        <tr><td>Paid at sale (POS)</td><td>${formatCurrency(parseFloat(report.paid_at_sale))}</td></tr>
        <tr><td>Charged to AR</td><td>${formatCurrency(parseFloat(report.ar_charged))}</td></tr>
        <tr><td>Voided sales (count)</td><td>${formatNumber(report.void_transactions, 0)}</td></tr>
        <tr><td>Voided sales (amount)</td><td>${formatCurrency(parseFloat(report.void_sales))}</td></tr>
        <tr><td>Voided lines (count)</td><td>${formatNumber(report.void_line_count, 0)}</td></tr>
        <tr><td>Voided lines (amount)</td><td>${formatCurrency(parseFloat(report.void_line_amount))}</td></tr>
        <tr><td>Float start</td><td>${formatCurrency(parseFloat(report.float_start))}</td></tr>
        <tr><td>Float added</td><td>${formatCurrency(parseFloat(report.float_added))}</td></tr>
        <tr><td>Float removed</td><td>${formatCurrency(parseFloat(report.float_removed))}</td></tr>
        <tr><td>Cash received</td><td>${formatCurrency(parseFloat(report.cash_received))}</td></tr>
        <tr><td>Change given</td><td>${formatCurrency(parseFloat(report.change_given))}</td></tr>
        <tr><td>Cash drops (count)</td><td>${formatNumber(report.cash_drop_count, 0)}</td></tr>
        <tr><td>Cash drops (amount)</td><td>${formatCurrency(parseFloat(report.cash_drop))}</td></tr>
        <tr><td>Payments by method</td><td>${report.payment_summary}</td></tr>
        <tr class="expected"><td>Expected cash</td><td>${formatCurrency(parseFloat(report.expected_cash))}</td></tr>
      </table>
       <p class="dialog-text mt-2">
          The cashier and supervisor count separately. The next shift starts with a new float approved by its supervisor.
       </p>
      <label class="dialog-label" for="dialog-input">Cashier counted cash</label>
       <input id="dialog-input" type="number" step="0.01" min="0" class="pos-input"
         placeholder="Cashier count" autocomplete="off">
      <label class="dialog-label" for="supervisor-closing-cash">Supervisor counted cash</label>
       <input id="supervisor-closing-cash" type="number" step="0.01" min="0" class="pos-input"
         placeholder="Supervisor count" autocomplete="off">
      <label class="dialog-label" for="supervisor-username">Supervisor username</label>
       <input id="supervisor-username" type="text" class="pos-input"
         placeholder="Supervisor username" autocomplete="username">
      <label class="dialog-label" for="supervisor-password">Supervisor password</label>
       <input id="supervisor-password" type="password" class="pos-input"
         placeholder="Supervisor password" autocomplete="current-password">
      <div class="dialog-actions">
        <button type="button" id="confirm-close-shift" class="pos-action-button">Confirm Close Shift</button>
        <button type="button" id="cancel-close-shift" class="pos-action-button secondary">Cancel</button>
      </div>`,
    "Enter = confirm close · Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        const nextField = {
          "dialog-input": "supervisor-closing-cash",
          "supervisor-closing-cash": "supervisor-username",
          "supervisor-username": "supervisor-password",
        }[document.activeElement.id];

        if (nextField) {
          document.getElementById(nextField).focus();
        } else {
          submitCloseShift(afterClose);
        }
      }
    },
  );

  focusDialogInput();

  document.getElementById("confirm-close-shift").addEventListener("click", () => {
    submitCloseShift(afterClose);
  });

  document.getElementById("cancel-close-shift").addEventListener("click", () => {
    closeDialog();
  });
};

const submitCloseShift = (afterClose) => {
  const cashierClosingCash = document.getElementById("dialog-input").value;
  const supervisorClosingCash = document.getElementById("supervisor-closing-cash").value;
  const supervisorUsername = document.getElementById("supervisor-username").value.trim();
  const supervisorPassword = document.getElementById("supervisor-password").value;

  if (
    cashierClosingCash == "" || supervisorClosingCash == ""
    || !Number.isFinite(Number(cashierClosingCash)) || !Number.isFinite(Number(supervisorClosingCash))
    || Number(cashierClosingCash) < 0 || Number(supervisorClosingCash) < 0
    || supervisorUsername == "" || supervisorPassword == ""
  ) {
    openMessageDialog(
      "Complete the closing count",
      "Enter both cash counts and the supervisor credentials.",
      () => openCloseShiftDialog(afterClose),
    );
    return;
  }

  closeShift({
    cashierClosingCash: Number(cashierClosingCash),
    supervisorClosingCash: Number(supervisorClosingCash),
    supervisorUsername: supervisorUsername,
    supervisorPassword: supervisorPassword,
  }, afterClose);
};

const closeShift = async (closingData, afterClose) => {
  closeDialog();

  const jsonData = { shiftId: state.shift.shift_id, ...closingData };

  const formData = new FormData();
  formData.append("operation", "closeShift");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/shift.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    const after = afterClose || (() => window.location.reload());
    state.shift = null;
    displayFloat();
    openMessageDialog(
      "Shift closed",
      `Cashier count: ${formatCurrency(closingData.cashierClosingCash)}.
        Supervisor count: ${formatCurrency(closingData.supervisorClosingCash)}.`,
      after,
    );
  } else if (response.data == 3) {
    openMessageDialog(
      "Supervisor verification failed",
      "Check that the username and password belong to an active supervisor.",
      () => openCloseShiftDialog(afterClose),
    );
  } else if (response.data == 4) {
    openMessageDialog("Shift unavailable", "This open shift does not belong to the logged-in cashier.");
  } else {
    openMessageDialog("ERROR", "The shift was not closed.", () => openCloseShiftDialog(afterClose));
  }
};
