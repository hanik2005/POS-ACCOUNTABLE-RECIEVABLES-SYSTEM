export const deletePaymentMethod = async (paymentMethodId, refreshFunc) => {
  const modalElement = document.getElementById("decisionModal");

  const decisionModal = new bootstrap.Modal(modalElement);

  decisionModal.show();

  document.getElementById("confirmYes").addEventListener("click", async () => {
    const payment = await getPaymentMethodDetails(paymentMethodId);

    console.log("API Response:", payment);

    refreshFunc();

    decisionModal.hide();
  });

  document.getElementById("confirmNo").addEventListener("click", () => {
    decisionModal.hide();
  });
};

const getPaymentMethodDetails = async (paymentMethodId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  console.log(paymentMethodId);

  const response = await axios.get(`${baseAPI}/payment_methods.php`, {
    params: {
      operation: "deletePaymentMethod",

      json: JSON.stringify({
        paymentMethodId: paymentMethodId,
      }),
    },
  });

  console.log(response.data);

  return response.data;
};
