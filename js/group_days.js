import { viewGroupDays } from "./module/group_days/view.js";
import { updateGroupDays } from "./module/group_days/update.js";
import { deleteGroupDays } from "./module/group_days/delete.js";
import { paginate, createPagination } from "./module/pagination.js";

const baseAPI = "http://localhost/POS_AR_SYSTEM/api";

sessionStorage.setItem("baseAPI", baseAPI);

let groupDays = [];
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayGroupDays();

  document.getElementById("submitBtn").addEventListener("click", () => {
    insertGroupDays();
  });

  document
    .getElementById("searchGroupDays")
    .addEventListener("input", function () {
      const searchValue = this.value.toLowerCase();

      const filtered = groupDays.filter(
        (group) =>
          group.days_name.toLowerCase().includes(searchValue) ||
          group.days_due.toString().includes(searchValue) ||
          group.status.toLowerCase().includes(searchValue),
      );

      currentPage = 1;

      displayGroupDaysTable(filtered);
    });
});

const displayGroupDays = async () => {
  const response = await axios.get(`${baseAPI}/group_days.php`, {
    params: {
      operation: "getAllGroupDays",
    },
  });

  if (response.status == 200) {
    console.log(response.data);

    groupDays = response.data;

    displayGroupDaysTable(response.data);
  } else {
    alert("ERROR");
  }
};

const displayGroupDaysTable = (groupDays) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(groupDays, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
    <tr>
      <th>Days Name</th>
      <th>Days Due</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  rows.forEach((group) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${group.days_name}</td>
      <td>${group.days_due} Days</td>
      <td>${group.status}</td>
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
      viewGroupDays(group.id);
    });

    tr.querySelector(".btn-update").addEventListener("click", () => {
      updateGroupDays(group.id, displayGroupDays);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      deleteGroupDays(group.id, displayGroupDays);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(groupDays.length, currentPage, (page) => {
      currentPage = page;

      displayGroupDaysTable(groupDays);
    }),
  );
};

const insertGroupDays = async () => {
  const jsonData = {
    daysName: document.getElementById("daysNameInput").value,

    daysDue: document.getElementById("daysDueInput").value,

    status: "ACTIVE",
  };

  const formData = new FormData();

  formData.append("operation", "insertGroupDays");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/group_days.php`,

    method: "POST",

    data: formData,
  });

  if (response.data == 1) {
    console.log("WORKING");

    displayGroupDays();

    const modalElement = document.getElementById("groupDaysModal");

    const modal = bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    alert("Group Days successfully saved!");
  } else {
    alert("ERROR");
  }
};