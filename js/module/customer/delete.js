export const deleteCustomer = async (customerId, refreshFunc) => {
  const modalElement = document.getElementById("decisionModal");

  const decisionModal = new bootstrap.Modal(modalElement);

  decisionModal.show();

  document.getElementById("confirmYes").addEventListener("click", async () => {
    const customer = await getCustomerDetails(customerId);

    console.log("API Response:", customer);

    refreshFunc();

    decisionModal.hide();
  });

  // Handle 'No' choice

  document.getElementById("confirmNo").addEventListener("click", () => {
    decisionModal.hide();
  });
};

const getCustomerDetails = async (customerId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  console.log(customerId);

  const response = await axios.get(`${baseAPI}/customers.php`, {
    params: {
      operation: "deleteCustomer",

      json: JSON.stringify({
        customerId: customerId,
      }),
    },
  });

  console.log(response.data);

  return response.data;
};
