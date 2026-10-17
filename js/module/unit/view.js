
const baseAPI = sessionStorage.getItem("baseAPI");


export const viewUnit = async (unitId) => {

  try {

    const response = await axios.get(
      `${baseAPI}/units.php`,
      {
        params: {
          operation: "getUnit",
          json: JSON.stringify({
            unitId: unitId
          })
        }
      }
    );


    const unit = response.data[0];


    document.getElementById("blank-modal-title").innerText =
      "View Unit Details";


    document.getElementById("blank-main-div").innerHTML = `

        <table class="table table-sm">

            <tr>
                <td><strong>Unit ID</strong></td>
                <td>${unit.unit_id}</td>
            </tr>

            <tr>
                <td><strong>Unit Name</strong></td>
                <td>${unit.unit_name}</td>
            </tr>

            <tr>
                <td><strong>Unit Code</strong></td>
                <td>${unit.unit_code}</td>
            </tr>

            <tr>
                <td><strong>Status</strong></td>
                <td>${unit.status}</td>
            </tr>

        </table>

    `;


    document.getElementById("blank-modal-footer").innerHTML = `

        <button
            type="button"
            class="btn btn-secondary btn-sm w-100"
            data-bs-dismiss="modal"
        >
            Close
        </button>

    `;


    const myModal = new bootstrap.Modal(
      document.getElementById("blank-modal")
    );

    myModal.show();

  } catch (error) {

    console.error(error);

    Swal.fire("Unable to load unit details.");

  }

};

