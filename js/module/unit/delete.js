
export const deleteUnit = async (unitId, refreshFunc) => {

  const modalElement = document.getElementById("decisionModal");

  const decisionModal = new bootstrap.Modal(modalElement);

  decisionModal.show();


  document.getElementById("confirmYes").onclick = async () => {

    await deactivateUnit(unitId);

    refreshFunc();

    decisionModal.hide();

  };


  document.getElementById("confirmNo").onclick = () => {

    decisionModal.hide();

  };

};


const deactivateUnit = async (unitId) => {

  try {

    const response = await axios.get(
      `${sessionStorage.getItem("baseAPI")}/units.php`,
      {
        params: {
          operation: "deleteUnit",

          json: JSON.stringify({
            unitId: unitId,
          }),

        },

      }
    );


    console.log(response.data);


    if (response.data == 1) {

      alert("Unit successfully deactivated!");

    } else {

      alert("ERROR: Unit was not deactivated.");

    }


    return response.data;

  } catch (error) {

    console.error(error);

    alert("Unable to deactivate unit.");

  }

};

