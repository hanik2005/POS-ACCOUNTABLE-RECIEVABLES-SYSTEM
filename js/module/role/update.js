export const updateRole = async (roleId, refreshFunc) => {
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
                Update Role
            </h5>

            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal">
            </button>

        </div>


        <div class="modal-body">

            <div class="mb-3">

                <label class="form-label">
                    Role Name
                </label>

                <input
                    type="text"
                    id="updateRoleName"
                    class="form-control"
                    value="${role.role_name}">

            </div>


            <div class="mb-3">

                <label class="form-label">
                    Description
                </label>

                <textarea
                    id="updateDescription"
                    class="form-control"
                    rows="3">${role.description ?? ""}</textarea>

            </div>


            <div class="mb-3">

                <label class="form-label">
                    Status
                </label>

                <select
                    id="updateStatus"
                    class="form-select">

                    <option
                        value="ACTIVE"
                        ${role.status == "ACTIVE" ? "selected" : ""}>

                        Active

                    </option>

                    <option
                        value="INACTIVE"
                        ${role.status == "INACTIVE" ? "selected" : ""}>

                        Inactive

                    </option>

                </select>

            </div>

        </div>


        <div class="modal-footer">

            <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal">

                Cancel

            </button>

            <button
                type="button"
                class="btn btn-success"
                id="saveRoleBtn">

                Save Changes

            </button>

        </div>

    `;

  document.getElementById("saveRoleBtn").addEventListener("click", async () => {
    const result = await saveUpdateRole(roleId);

    if (result) {
      refreshFunc();
    }
  });

  modal.show();
};

const saveUpdateRole = async (roleId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  const jsonData = {
    roleId: roleId,

    roleName: document.getElementById("updateRoleName").value,

    description: document.getElementById("updateDescription").value,

    status: document.getElementById("updateStatus").value,
  };

  const formData = new FormData();

  formData.append("operation", "updateRole");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/roles.php`,

    method: "POST",

    data: formData,
  });

  console.log(response.data);

  if (response.data == 1) {
    alert("Role successfully updated!");

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("blank-modal"),
    );

    modal.hide();

    return true;
  }

  alert("ERROR");

  return false;
};
