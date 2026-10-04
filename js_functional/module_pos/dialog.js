import { state } from "./state.js";
import { entry, focusEntry } from "./utils.js";

export const openDialog = (title, bodyHtml, hint, onKey) => {
  entry().blur();

  document.getElementById("dialog-title").innerText = title;
  document.getElementById("dialog-body").innerHTML = bodyHtml;
  document.getElementById("dialog-hint").innerText = hint;
  document.getElementById("dialog").classList.remove("d-none");

  state.dialog = { onKey: onKey };
};

export const closeDialog = () => {
  state.dialog = null;

  document.getElementById("dialog").classList.add("d-none");

  focusEntry();
};

export const openMessageDialog = (title, text, after) => {
  openDialog(title, `<p class="dialog-text">${text}</p>`, "Press Enter to continue", (e) => {
    if (e.key == "Enter" || e.key == "Escape") {
      e.preventDefault();
      closeDialog();

      if (after) {
        after();
      }
    }
  });
};