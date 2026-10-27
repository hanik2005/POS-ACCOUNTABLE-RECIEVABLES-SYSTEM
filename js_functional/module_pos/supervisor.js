import { openDialog, closeDialog } from "./dialog.js";

export const openSupervisorApprovalDialog = (title, description, onApprove) => {
  let submitting = false;

  openDialog(
    title,
    `<p class="dialog-text">${description}</p>
     <label class="dialog-label" for="supervisor-pin">Supervisor PIN</label>
     <input id="supervisor-pin" type="password" class="pos-input" inputmode="numeric"
       maxlength="6" autocomplete="off" placeholder="Enter 4-6 digit PIN">
     <label class="dialog-label" for="supervisor-reason">Reason</label>
     <input id="supervisor-reason" type="text" class="pos-input" autocomplete="off" placeholder="Reason for this action">
     <p id="supervisor-approval-error" class="dialog-text" role="alert"></p>`,
    "Supervisor PIN · Enter = approve · Esc = cancel",
    async (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
        return;
      }

      if (e.key != "Enter" || submitting) {
        return;
      }

      e.preventDefault();

      const nextField = {
        "supervisor-pin": "supervisor-reason",
      }[document.activeElement.id];

      if (nextField) {
        document.getElementById(nextField).focus();
        return;
      }

      const supervisorPin = document.getElementById("supervisor-pin").value.trim();
      const reason = document.getElementById("supervisor-reason").value.trim();

      if (!/^\d{4,6}$/.test(supervisorPin) || reason == "") {
        document.getElementById("supervisor-approval-error").innerText =
          "Enter a 4-6 digit supervisor PIN and a reason.";
        return;
      }

      submitting = true;
      let result;

      try {
        result = await onApprove({
          supervisorPin: supervisorPin,
          reason: reason,
        });
      } catch {
        submitting = false;
        document.getElementById("supervisor-approval-error").innerText =
          "Approval could not be verified because the server request failed.";
        return;
      }

      submitting = false;

      if (!result.success) {
        document.getElementById("supervisor-approval-error").innerText = result.message;
        return;
      }

      closeDialog();

      if (result.afterClose) {
        result.afterClose();
      }
    },
  );

  document.getElementById("supervisor-pin").focus();
};
