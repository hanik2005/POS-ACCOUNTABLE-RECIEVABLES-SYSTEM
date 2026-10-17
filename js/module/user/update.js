export const updateUser = async (userId, refreshFunc) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  const response = await axios.get(`${baseAPI}/users.php`, {
    params: {
      operation: "getUser",

      json: JSON.stringify({
        userId: userId,
      }),
    },
  });

  const user = response.data[0];

  const rolesResponse = await axios.get(`${baseAPI}/users.php`, {
    params: {
      operation: "getRoles",
    },
  });

  let roleOptions = "";

  rolesResponse.data.forEach((role) => {
    roleOptions += `

                <option
                    value="${role.role_id}"
                    ${role.role_id == user.role_id ? "selected" : ""}>

                    ${role.role_name}

                </option>

            `;
  });

  const modalElement = document.getElementById("blank-modal");

  const modal = new bootstrap.Modal(modalElement);

  document.getElementById("blank-modal-body").innerHTML = `

        <div class="modal-header">

            <h5 class="modal-title">
                Update User
            </h5>

            <button
                class="btn-close"
                data-bs-dismiss="modal">
            </button>

        </div>


        <div class="modal-body">


            <div class="mb-3">

                <label class="form-label">
                    Username
                </label>

                <input
                    type="text"
                    id="updateUsername"
                    class="form-control"
                    value="${user.username}">

            </div>



            <div class="mb-3">

                <label class="form-label">
                    Full Name
                </label>

                <input
                    type="text"
                    id="updateFullName"
                    class="form-control"
                    value="${user.full_name}">

            </div>


            <div class="mb-3">

                <label class="form-label">
                    Email
                </label>

                <input
                    type="email"
                    id="updateEmail"
                    class="form-control"
                    value="${user.email ?? ""}">

            </div>


            <div class="mb-3">

                <label class="form-label">
                    Role
                </label>

                <select
                    id="updateRole"
                    class="form-select">

                    ${roleOptions}

                </select>

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
                        ${user.status == "ACTIVE" ? "selected" : ""}>

                        Active

                    </option>

                    <option
                        value="INACTIVE"
                        ${user.status == "INACTIVE" ? "selected" : ""}>

                        Inactive

                    </option>

                </select>

            </div>


        </div>


        <div class="modal-footer">

            <button
                class="btn btn-secondary"
                data-bs-dismiss="modal">

                Cancel

            </button>


            <button
                class="btn btn-success"
                id="saveUserBtn">

                Save Changes

            </button>

        </div>

    `;

  document.getElementById("saveUserBtn").addEventListener("click", async () => {
    const result = await saveUpdateUser(userId);

    if (result) {
      refreshFunc();
    }
  });

  modal.show();
};

const saveUpdateUser = async (userId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  const jsonData = {
    userId: userId,

    username: document.getElementById("updateUsername").value,

    fullName: document.getElementById("updateFullName").value,

    email: document.getElementById("updateEmail").value,

    roleId: document.getElementById("updateRole").value,

    status: document.getElementById("updateStatus").value,
  };

  const formData = new FormData();

  formData.append("operation", "updateUser");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/users.php`,

    method: "POST",

    data: formData,
  });

  console.log(response.data);

  if (response.data == 1) {
    Swal.fire("User successfully updated!");

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("blank-modal"),
    );

    modal.hide();

    return true;
  }

  Swal.fire("ERROR");

  return false;
};
