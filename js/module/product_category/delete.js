
export const deleteProductCategory = async (categoryId, refreshFunc) => {

  const modalElement = document.getElementById("decisionModal");

  const decisionModal = new bootstrap.Modal(modalElement);

  decisionModal.show();


  document.getElementById("confirmYes").onclick = async () => {

    await deactivateProductCategory(categoryId);

    refreshFunc();

    decisionModal.hide();

  };


  document.getElementById("confirmNo").onclick = () => {

    decisionModal.hide();

  };

};


const deactivateProductCategory = async (categoryId) => {

  try {

    const response = await axios.get(
      `${sessionStorage.getItem("baseAPI")}/product_categories.php`,
      {
        params: {
          operation: "deleteProductCategory",

          json: JSON.stringify({
            categoryId: categoryId,
          }),

        },

      }
    );


    console.log(response.data);


    if (response.data == 1) {

      alert("Product category successfully deactivated!");

    } else {

      alert("ERROR: Product category was not deactivated.");

    }


    return response.data;

  } catch (error) {

    console.error(error);

    alert("Unable to deactivate product category.");

  }

};