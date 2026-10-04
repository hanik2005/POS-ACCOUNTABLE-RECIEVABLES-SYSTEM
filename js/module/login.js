export const login = async (userData) => {

    const baseUrl = sessionStorage.getItem("baseAPI");

    console.log(userData);

    const formData = new FormData();

    formData.append("operation", "login");
    formData.append("json", JSON.stringify(userData));

    try {

        const response = await axios.post(`${baseUrl}/login.php`,formData,{
          withCredentials: true
        });
        console.log(response.data);

        if (response.data.success) {
            alert("Successfully logged in!");
            if (response.data.user.role_id == 1) {
                window.location.href =
                    "http://localhost/POS_AR_SYSTEM/interface/Admin/dashboard.html";
            } else if (response.data.user.role_id == 2) {
                window.location.href =
                    "http://localhost/POS_AR_SYSTEM/interface/Cashier/pos.html";
            }else if (response.data.user.role_id == 3) {
                window.location.href =
                    "http://localhost/POS_AR_SYSTEM/interface/Accounting/invoice.html";
            }  
        } else {
            alert(
                response.data.message ||
                "Invalid username or password!"
            );
        }
    } catch (error) {
        console.error(error);
        alert("Unable to connect to the server.");
    }
};