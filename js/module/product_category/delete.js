
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

      Swal.fire("Product category successfully deactivated!");

    } else {

      Swal.fire("ERROR: Product category was not deactivated.");

    }


    return response.data;

  } catch (error) {

    console.error(error);

    Swal.fire("Unable to deactivate product category.");

  }

};