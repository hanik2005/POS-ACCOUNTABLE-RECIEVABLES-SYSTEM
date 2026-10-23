import { baseUrl, functionalAPI, sessionAPI } from "../../js/config.js";

export { baseUrl, sessionAPI };
export const baseAPI = functionalAPI;
export const shiftReportPage = "shift_report.html";

sessionStorage.setItem("baseAPI", baseAPI);
