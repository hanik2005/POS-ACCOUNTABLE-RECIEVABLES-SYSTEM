export const viewUser = async (userId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  const response = await axios.get(`${baseAPI}/users.php`, {
    params: {
      operation: "getUser",

      json: JSON.stringify({
        userId: userId,
      }),
    },
  });

  console.log(response.data);

  const user = response.data[0];

  const modalElement = document.getElementById("blank-modal");

  const modal = new bootstrap.Modal(modalElement);

  document.getElementById("blank-modal-body").innerHTML = `

        <div class="modal-header">

            <h5 class="modal-title">
                User Details
            </h5>

            <button
                class="btn-close"
                data-bs-dismiss="modal">
            </button>

        </div>


        <div class="modal-body">

            <table class="table table-bordered">

                <tr>
                    <th>User ID</th>
                    <td>${user.user_id}</td>
                </tr>

                <tr>
                    <th>Username</th>
                    <td>${user.username}</td>
                </tr>

                <tr>
                    <th>Full Name</th>
                    <td>${user.full_name}</td>
                </tr>

                <tr>
                    <th>Email</th>
                    <td>${user.email ?? ""}</td>
                </tr>

                <tr>
                    <th>Role</th>
                    <td>${user.role_name ?? ""}</td>
                </tr>

                <tr>
                    <th>Status</th>
                    <td>${user.status}</td>
                </tr>

            </table>

        </div>


        <div class="modal-footer">

            <button
                class="btn btn-secondary"
                data-bs-dismiss="modal">

                Close

            </button>

        </div>

    `;

  modal.show();
};
