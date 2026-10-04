export const viewPOSTerminal = async (terminalId) => {
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
    alert("POS Terminal not found.");

    return;
  }

  document.getElementById("blank-modal-title").innerHTML = `

            <h5 class="modal-title">
                POS Terminal Details
            </h5>

            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
            ></button>

        `;

  document.getElementById("blank-modal-body").innerHTML = `

            <table class="table table-bordered">

                <tr>

                    <th>
                        Terminal ID
                    </th>

                    <td>
                        ${terminal.terminal_id}
                    </td>

                </tr>


                <tr>

                    <th>
                        Terminal Name
                    </th>

                    <td>
                        ${terminal.terminal_name}
                    </td>

                </tr>



                <tr>

                    <th>
                        Status
                    </th>

                    <td>
                        ${terminal.status}
                    </td>

                </tr>

            </table>

        `;

  document.getElementById("blank-modal-footer").innerHTML = `

            <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
            >
                Close
            </button>

        `;

  const modalElement = document.getElementById("blank-modal");

  const modal = new bootstrap.Modal(modalElement);

  modal.show();
};
