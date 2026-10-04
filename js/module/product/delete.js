export const deleteProduct = async (productId, refreshFunc) => {
  const modalElement = document.getElementById("decisionModal");
  const decisionModal = new bootstrap.Modal(modalElement);

  decisionModal.show();

  document.getElementById("confirmYes").addEventListener("click", async () => {
    const product = await getProductDetails(productId);

    console.log("API Response:", product);

    refreshFunc();
    decisionModal.hide();
  });

  // Handle 'No' choice
  document.getElementById("confirmNo").addEventListener("click", () => {
    refreshFunc();
    decisionModal.hide();
  });
};

const getProductDetails = async (productId) => {
  console.log(productId);

  const response = await axios.get(`${sessionStorage.baseAPI}/products.php`, {
    params: {
      operation: "deleteProduct",
      json: JSON.stringify({
        productId: productId,
      }),
    },
  });

  console.log(response.data);

  return response.data;
};
