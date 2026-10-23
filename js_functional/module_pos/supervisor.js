import { openDialog, closeDialog } from "./dialog.js";

export const openSupervisorApprovalDialog = (title, description, onApprove) => {
  let submitting = false;

  openDialog(
    title,
    `<p class="dialog-text">${description}</p>
     <label class="dialog-label" for="supervisor-username">Supervisor username</label>
     <input id="supervisor-username" type="text" class="pos-input" autocomplete="username" placeholder="Supervisor username">
     <label class="dialog-label" for="supervisor-password">Supervisor password</label>
     <input id="supervisor-password" type="password" class="pos-input"
       autocomplete="current-password" placeholder="Supervisor password">
     <label class="dialog-label" for="supervisor-reason">Reason</label>
     <input id="supervisor-reason" type="text" class="pos-input" autocomplete="off" placeholder="Reason for this action">
     <p id="supervisor-approval-error" class="dialog-text" role="alert"></p>`,
    "Supervisor sign-in · Enter = approve · Esc = cancel",
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
        "supervisor-username": "supervisor-password",
        "supervisor-password": "supervisor-reason",
      }[document.activeElement.id];

      if (nextField) {
        document.getElementById(nextField).focus();
        return;
      }

      const supervisorUsername = document.getElementById("supervisor-username").value.trim();
      const supervisorPassword = document.getElementById("supervisor-password").value;
      const reason = document.getElementById("supervisor-reason").value.trim();

      if (supervisorUsername == "" || supervisorPassword == "" || reason == "") {
        document.getElementById("supervisor-approval-error").innerText =
          "Enter the supervisor username, password, and reason.";
        return;
      }

      submitting = true;
      const result = await onApprove({
        supervisorUsername: supervisorUsername,
        supervisorPassword: supervisorPassword,
        reason: reason,
      });
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

  document.getElementById("supervisor-username").focus();
};
