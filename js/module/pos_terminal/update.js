export const updatePOSTerminal = async (terminalId, refreshFunc) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  const response = await axios.get(`${baseAPI}/pos_terminals.php`, {
    params: {
      operation: "getPOSTerminal",

      json: JSON.stringify({
        terminalId: terminalId,
      }),
    },
  });

  console.log(response.data);

  const terminal = response.data[0];

  if (!terminal) {
    Swal.fire("POS Terminal not found.");

    return;
  }

  document.getElementById("blank-modal-title").innerHTML = `

            <h5 class="modal-title">
                Update POS Terminal
            </h5>

            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
            ></button>

        `;

  document.getElementById("blank-modal-body").innerHTML = `

            <div class="mb-3">

                <label class="form-label">
                    Terminal Name
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="updateTerminalName"
                    value="${terminal.terminal_name}"
                >

            </div>



            <div class="mb-3">

                <label class="form-label">
                    Status
                </label>

                <select
                    class="form-select"
                    id="updateStatus"
                >

                    <option
                        value="ACTIVE"
                        ${terminal.status === "ACTIVE" ? "selected" : ""}
                    >
                        Active
                    </option>


                    <option
                        value="INACTIVE"
                        ${terminal.status === "INACTIVE" ? "selected" : ""}
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
                id="saveUpdateBtn"
            >
                Save Changes
            </button>

        `;

  const modalElement = document.getElementById("blank-modal");

  const modal = new bootstrap.Modal(modalElement);

  modal.show();

  document
    .getElementById("saveUpdateBtn")
    .addEventListener("click", async () => {
      const result = await saveUpdatePOSTerminal(terminalId);

      if (result) {
        refreshFunc();
      }
    });
};

// SAVE UPDATE

const saveUpdatePOSTerminal = async (terminalId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  const jsonData = {
    terminalId: terminalId,

    terminalName: document.getElementById("updateTerminalName").value,

    status: document.getElementById("updateStatus").value,
  };

  const formData = new FormData();

  formData.append("operation", "updatePOSTerminal");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/pos_terminals.php`,

    method: "POST",

    data: formData,
  });

  console.log(response.data);

  if (response.data == 1) {
    const modalElement = document.getElementById("blank-modal");

    const modal = bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    Swal.fire("POS Terminal successfully updated!");

    return true;
  } else {
    Swal.fire("ERROR");

    return false;
  }
};
