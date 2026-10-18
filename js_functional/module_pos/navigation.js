import { baseUrl, sessionAPI, cashierReportPage } from "./config.js";
import { state } from "./state.js";
import { openMessageDialog } from "./dialog.js";
import { openCloseShiftDialog } from "./shift.js";

export const leavePage = (action) => {
  if (state.details.length > 0) {
    openMessageDialog("Sale in progress", "Checkout, hold or void the current sale first.");
    return;
  }

  action();
};

const completeLogout = async () => {
  const formData = new FormData();
  formData.append("operation", "logout");

  const response = await axios({
    url: sessionAPI,
    method: "POST",
    data: formData,
  });

  if (response.data.success) {
    window.location.href = `${baseUrl}/index.html`;
  } else {
    openMessageDialog("ERROR", "Unable to log out.");
  }
};

export const logout = async () => {
  if (state.shift) {
    await openCloseShiftDialog(completeLogout);
    return;
  }

  await completeLogout();
};

export const openCashierReport = () => {
  window.location.href = cashierReportPage;
};
