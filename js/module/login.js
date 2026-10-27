import { baseAPI, baseUrl } from "../config.js";

export const login = async (userData) => {
  const formData = new FormData();
  formData.append("operation", "login");
  formData.append("json", JSON.stringify(userData));

  try {
    const response = await axios.post(`${baseAPI}/login.php`, formData, {
      withCredentials: true,
    });
    const user = response.data?.user;

    if (!response.data?.success || !user) {
      Swal.fire(response.data?.message || "Invalid username or password!");
      return;
    }

    await Swal.fire("Successfully logged in!");
    const roleName = String(user.role_name || "").toUpperCase();

    if (roleName == "SUPERVISOR") {
      window.location.href = `${baseUrl}/interface/Supervisor/supervisor_pin.html`;
    } else if (roleName == "ADMIN") {
      window.location.href = `${baseUrl}/interface/Admin/dashboard.html`;
    } else if (roleName == "CASHIER") {
      window.location.href = `${baseUrl}/interface/Cashier/pos.html`;
    } else if (roleName == "ACCOUNTING") {
      window.location.href = `${baseUrl}/interface/Accounting/invoice.html`;
    } else {
      Swal.fire("This account does not have an available workspace.");
    }
  } catch {
    Swal.fire("Unable to connect to the server.");
  }
};
