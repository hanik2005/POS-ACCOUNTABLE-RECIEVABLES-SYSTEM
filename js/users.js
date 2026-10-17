import { viewUser } from "./module/user/view.js";
import { updateUser } from "./module/user/update.js";
import { deleteUser } from "./module/user/delete.js";
import { paginate, createPagination } from "./module/pagination.js";
import { baseAPI } from "./config.js";


sessionStorage.setItem("baseAPI", baseAPI);

let users = [];
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayUsers();

  displayRoles();

  document.getElementById("submitBtn").addEventListener("click", () => {
    insertUser();
  });

  document.getElementById("searchUser").addEventListener("input", function () {
    const searchValue = this.value.toLowerCase();

    const filtered = users.filter(
      (user) =>
        user.username.toLowerCase().includes(searchValue) ||
        user.full_name.toLowerCase().includes(searchValue) ||
        user.email.toLowerCase().includes(searchValue),
    );

    currentPage = 1;

    displayUsersTable(filtered);
  });
});

const displayUsers = async () => {
  const response = await axios.get(`${baseAPI}/users.php`, {
    params: {
      operation: "getAllUsers",
    },
  });

  if (response.status == 200) {
    console.log(response.data);

    users = response.data;

    displayUsersTable(response.data);
  } else {
    Swal.fire("ERROR");
  }
};

const displayUsersTable = (users) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(users, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
    <tr>
      <th>Username</th>
      <th>Full Name</th>
      <th>Email</th>
      <th>Role</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  rows.forEach((user) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${user.username}</td>
      <td>${user.full_name}</td>
      <td>${user.email ?? ""}</td>
      <td>${user.role_name ?? ""}</td>
      <td>${user.status}</td>
      <td>
        <button type="button" class="btn btn-primary btn-sm btn-view">
          VIEW
        </button>

        <button type="button" class="btn btn-success btn-sm btn-update">
          UPDATE
        </button>

        <button type="button" class="btn btn-danger btn-sm btn-delete">
          DEACTIVATE
        </button>
      </td>
    `;

    tBody.appendChild(tr);

    tr.querySelector(".btn-view").addEventListener("click", () => {
      viewUser(user.user_id);
    });

    tr.querySelector(".btn-update").addEventListener("click", () => {
      updateUser(user.user_id, displayUsers);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      deleteUser(user.user_id, displayUsers);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(users.length, currentPage, (page) => {
      currentPage = page;

      displayUsersTable(users);
    }),
  );
};

const displayRoles = async () => {
  const response = await axios.get(`${baseAPI}/users.php`, {
    params: {
      operation: "getRoles",
    },
  });

  const roleInput = document.getElementById("roleInput");

  response.data.forEach((role) => {
    const option = document.createElement("option");

    option.value = role.role_id;

    option.textContent = role.role_name;

    roleInput.appendChild(option);
  });
};

const insertUser = async () => {
  const jsonData = {
    username: document.getElementById("usernameInput").value,

    fullName: document.getElementById("fullNameInput").value,

    email: document.getElementById("emailInput").value,

    roleId: document.getElementById("roleInput").value,

    status: "ACTIVE",
  };

  const formData = new FormData();

  formData.append("operation", "insertUser");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/users.php`,

    method: "POST",

    data: formData,
  });

  console.log(response.data);

  if (response.data == 1) {
    displayUsers();

    Swal.fire("User successfully saved!");

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("userModal"),
    );

    modal.hide();
  } else {
    Swal.fire("ERROR");
  }
};