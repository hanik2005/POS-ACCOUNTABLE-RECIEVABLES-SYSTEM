import { baseUrl, sessionAPI, cashierReportPage, invoicePage } from "./config.js";
import { state } from "./state.js";
import { openMessageDialog } from "./dialog.js";

export const leavePage = (action) => {
  if (state.details.length > 0) {
    openMessageDialog("Sale in progress", "Checkout, hold or void the current sale first.");
    return;
  }

  action();
};

export const logout = async () => {
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

export const openCashierReport = () => {
  window.location.href = cashierReportPage;
};

export const openAccountsReceivable = () => {
  window.location.href = invoicePage;
};