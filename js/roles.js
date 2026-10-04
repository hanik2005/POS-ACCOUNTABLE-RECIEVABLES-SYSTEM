import { viewRole } from "./module/role/view.js";
import { updateRole } from "./module/role/update.js";
import { deleteRole } from "./module/role/delete.js";
import { paginate, createPagination } from "./module/pagination.js";

const baseAPI = "http://localhost/POS_AR_SYSTEM/api";

sessionStorage.setItem("baseAPI", baseAPI);

let roles = [];
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayRoles();

  document.getElementById("submitBtn").addEventListener("click", () => {
    insertRole();
  });

  document.getElementById("searchRole").addEventListener("input", function () {
    const searchValue = this.value.toLowerCase();

    const filtered = roles.filter(
      (role) =>
        role.role_name.toLowerCase().includes(searchValue) ||
        role.description.toLowerCase().includes(searchValue) ||
        role.status.toLowerCase().includes(searchValue),
    );

    currentPage = 1;

    displayRolesTable(filtered);
  });
});

const displayRoles = async () => {
  const response = await axios.get(`${baseAPI}/roles.php`, {
    params: {
      operation: "getAllRoles",
    },
  });

  if (response.status == 200) {
    console.log(response.data);

    roles = response.data;

    displayRolesTable(response.data);
  } else {
    alert("ERROR");
  }
};

const displayRolesTable = (roles) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(roles, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
    <tr>
      <th>Role Name</th>
      <th>Description</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  rows.forEach((role) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${role.role_name}</td>
      <td>${role.description ?? ""}</td>
      <td>${role.status}</td>
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
      viewRole(role.role_id);
    });

    tr.querySelector(".btn-update").addEventListener("click", () => {
      updateRole(role.role_id, displayRoles);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      deleteRole(role.role_id, displayRoles);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(roles.length, currentPage, (page) => {
      currentPage = page;

      displayRolesTable(roles);
    }),
  );
};

const insertRole = async () => {
  const jsonData = {
    roleName: document.getElementById("roleNameInput").value,

    description: document.getElementById("descriptionInput").value,

    status: "ACTIVE",
  };

  const formData = new FormData();

  formData.append("operation", "insertRole");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/roles.php`,

    method: "POST",

    data: formData,
  });

  console.log(response.data);

  if (response.data == 1) {
    displayRoles();

    alert("Role successfully saved!");

    const modal = bootstrap.Modal.getInstance(
      document.getElementById("roleModal"),
    );

    modal.hide();
  } else {
    alert("ERROR");
  }
};