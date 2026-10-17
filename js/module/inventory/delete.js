
export const deleteInventory = async (inventoryId, refreshFunc) => {

  const modalElement = document.getElementById("decisionModal");

  const decisionModal = new bootstrap.Modal(modalElement);

  decisionModal.show();


  document.getElementById("confirmYes").onclick = async () => {

    await deactivateInventory(inventoryId);

    refreshFunc();

    decisionModal.hide();

  };


  document.getElementById("confirmNo").onclick = () => {

    decisionModal.hide();

  };

};


const deactivateInventory = async (inventoryId) => {

  try {

    const response = await axios.get(
      `${sessionStorage.getItem("baseAPI")}/inventory.php`,
      {
        params: {
          operation: "deleteInventory",

          json: JSON.stringify({
            inventoryId: inventoryId,
          }),

        },

      }
    );


    console.log(response.data);


    if (response.data == 1) {

      Swal.fire("Inventory successfully deactivated!");

    } else {

      Swal.fire("ERROR: Inventory was not deactivated.");

    }


    return response.data;

  } catch (error) {

    console.error(error);

    Swal.fire("Unable to deactivate inventory.");

  }

};