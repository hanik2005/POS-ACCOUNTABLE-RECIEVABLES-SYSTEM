import { baseAPI, baseUrl } from "../config.js";

export const login = async (userData) => {

    console.log(userData);

    const formData = new FormData();

    formData.append("operation", "login");
    formData.append("json", JSON.stringify(userData));

    try {

        const response = await axios.post(`${baseAPI}/login.php`,formData,{
          withCredentials: true
        });
        console.log(response.data);

        if (response.data.success) {
            await Swal.fire("Successfully logged in!");
            if (response.data.user.role_id == 1) {
                window.location.href =
                    `${baseUrl}/interface/Admin/dashboard.html`;
            } else if (response.data.user.role_id == 2) {
                window.location.href =
                    `${baseUrl}/interface/Cashier/pos.html`;
            }else if (response.data.user.role_id == 3) {
                window.location.href =
                    `${baseUrl}/interface/Accounting/invoice.html`;
            } else if (response.data.user.role_name.toUpperCase() == "SUPERVISOR") {
                window.location.href =
                    `${baseUrl}/interface/Supervisor/approvals.html`;
            }  
        } else {
            Swal.fire(
                response.data.message ||
                "Invalid username or password!"
            );
        }
    } catch (error) {
        console.error(error);
        Swal.fire("Unable to connect to the server.");
    }
};
