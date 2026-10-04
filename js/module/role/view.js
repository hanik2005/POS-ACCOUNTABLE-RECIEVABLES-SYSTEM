export const viewRole = async (roleId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  const response = await axios.get(`${baseAPI}/roles.php`, {
    params: {
      operation: "getRole",

      json: JSON.stringify({
        roleId: roleId,
      }),
    },
  });

  console.log(response.data);

  const role = response.data[0];

  const modalElement = document.getElementById("blank-modal");

  const modal = new bootstrap.Modal(modalElement);

  document.getElementById("blank-modal-body").innerHTML = `

        <div class="modal-header">

            <h5 class="modal-title">
                Role Details
            </h5>

            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal">
            </button>

        </div>


        <div class="modal-body">

            <table class="table table-bordered">

                <tr>
                    <th>Role ID</th>
                    <td>${role.role_id}</td>
                </tr>

                <tr>
                    <th>Role Name</th>
                    <td>${role.role_name}</td>
                </tr>

                <tr>
                    <th>Description</th>
                    <td>${role.description ?? ""}</td>
                </tr>

                <tr>
                    <th>Status</th>
                    <td>${role.status}</td>
                </tr>

            </table>

        </div>


        <div class="modal-footer">

            <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal">

                Close

            </button>

        </div>

    `;

  modal.show();
};
