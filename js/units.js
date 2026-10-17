import { viewUnit } from "./module/unit/view.js";
import { updateUnit } from "./module/unit/update.js";
import { deleteUnit } from "./module/unit/delete.js";
import { paginate, createPagination } from "./module/pagination.js";
import { baseAPI } from "./config.js";


sessionStorage.setItem("baseAPI", baseAPI);

let units = [];
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayUnits();

  document.getElementById("submitBtn").addEventListener("click", () => {
    insertUnit();
  });

  document.getElementById("searchUnit").addEventListener("input", function () {
    const searchValue = this.value.toLowerCase();

    const filtered = units.filter(
      (unit) =>
        unit.unit_name.toLowerCase().includes(searchValue) ||
        unit.status.toLowerCase().includes(searchValue),
    );

    currentPage = 1;

    displayUnitsTable(filtered);
  });
});

const displayUnits = async () => {
  try {
    const response = await axios.get(`${baseAPI}/units.php`, {
      params: {
        operation: "getAllUnits",
      },
    });

    if (response.status == 200) {
      console.log(response.data);

      units = response.data;

      displayUnitsTable(response.data);
    } else {
      Swal.fire("ERROR");
    }
  } catch (error) {
    console.error(error);

    Swal.fire("Unable to load units.");
  }
};

const displayUnitsTable = (units) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(units, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
    <tr>
      <th>Unit Name</th>
      <th>Unit Code</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  rows.forEach((unit) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${unit.unit_name}</td>
      <td>${unit.unit_code}</td>
      <td>${unit.status}</td>
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
      viewUnit(unit.unit_id);
    });

    tr.querySelector(".btn-update").addEventListener("click", () => {
      updateUnit(unit.unit_id, displayUnits);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      deleteUnit(unit.unit_id, displayUnits);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(units.length, currentPage, (page) => {
      currentPage = page;

      displayUnitsTable(units);
    }),
  );
};

const insertUnit = async () => {
  const unitName = document.getElementById("unitNameInput").value;
  const unitCode = document.getElementById("unitCodeInput").value;
  const status = "ACTIVE";

  if (unitName.trim() === "") {
    Swal.fire("Please enter a unit name.");

    return;
  }

  const jsonData = {
    unitName: unitName,
    unitCode: unitCode,
    status: status,
  };

  const formData = new FormData();

  formData.append("operation", "insertUnit");

  formData.append("json", JSON.stringify(jsonData));

  try {
    const response = await axios({
      url: `${baseAPI}/units.php`,

      method: "POST",

      data: formData,
    });

    console.log(response.data);

    if (response.data == 1) {
      displayUnits();

      const modalElement = document.getElementById("unitModal");

      const modal = bootstrap.Modal.getInstance(modalElement);

      if (modal) {
        modal.hide();
      }

      Swal.fire("Unit successfully saved!");
    } else {
      Swal.fire("ERROR");
    }
  } catch (error) {
    console.error(error);

    Swal.fire("Unable to save unit.");
  }
};