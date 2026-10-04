
const baseAPI = sessionStorage.getItem("baseAPI");


export const updateUnit = async (unitId, refreshFunc) => {

  try {

    const response = await axios.get(
      `${baseAPI}/units.php`,
      {
        params: {
          operation: "getUnit",
          json: JSON.stringify({
            unitId: unitId,
          }),
        },
      }
    );


    const unit = response.data[0];


    document.getElementById("blank-modal-title").innerText =
      "Update Unit";


    document.getElementById("blank-main-div").innerHTML = `

        <div class="col-12">

            <label class="form-label">
                Unit Name
            </label>

            <input
                type="text"
                class="form-control mb-3"
                id="updateUnitName"
                value="${unit.unit_name ?? ""}"
            >
            <input
                type="text"
                class="form-control mb-3"
                id="updateCodeName"
                value="${unit.unit_code ?? ""}"
            >


            <label class="form-label">
                Status
            </label>

            <select
                class="form-select mb-3"
                id="updateStatus"
            >

                <option
                    value="ACTIVE"
                    ${unit.status == "ACTIVE" ? "selected" : ""}
                >
                    Active
                </option>

                <option
                    value="INACTIVE"
                    ${unit.status == "INACTIVE" ? "selected" : ""}
                >
                    Inactive
                </option>

            </select>

        </div>

    `;


    document.getElementById("blank-modal-footer").innerHTML = `

        <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
        >
            Cancel
        </button>

        <button
            type="button"
            class="btn btn-success"
            id="saveUpdateUnit"
        >
            Save Changes
        </button>

    `;


    const myModal = new bootstrap.Modal(
      document.getElementById("blank-modal")
    );


    document
      .getElementById("saveUpdateUnit")
      .addEventListener("click", async () => {

        await saveUpdateUnit(unitId);

        refreshFunc();

        myModal.hide();

      });


    myModal.show();

  } catch (error) {

    console.error(error);

    alert("Unable to load unit.");

  }

};


const saveUpdateUnit = async (unitId) => {

  const jsonData = {

    unitId: unitId,

    unitName: document.getElementById("updateUnitName").value,

    unitCode: document.getElementById("updateCodeName").value,

    status: document.getElementById("updateStatus").value,

  };


  if (jsonData.unitName.trim() === "") {

    alert("Unit name is required.");
    return;

  }


  const formData = new FormData();

  formData.append("operation", "updateUnit");

  formData.append("json", JSON.stringify(jsonData));


  try {

    const response = await axios({

      url: `${baseAPI}/units.php`,

      method: "POST",

      data: formData,

    });


    console.log(response.data);


    if (response.data == 1) {

      alert("Unit successfully updated!");

    } else {

      alert("ERROR: Unit was not updated.");

    }

  } catch (error) {

    console.error(error);

    alert("Unable to update unit.");

  }

};

