import { viewPOSTerminal } from "./module/pos_terminal/view.js";
import { updatePOSTerminal } from "./module/pos_terminal/update.js";
import { deletePOSTerminal } from "./module/pos_terminal/delete.js";
import { paginate, createPagination } from "./module/pagination.js";
import { baseAPI } from "./config.js";


sessionStorage.setItem("baseAPI", baseAPI);

let posTerminals = [];
let currentPage = 1;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

document.addEventListener("DOMContentLoaded", () => {
  displayPOSTerminals();

  document.getElementById("submitBtn").addEventListener("click", () => {
    insertPOSTerminal();
  });

  document
    .getElementById("searchTerminal")
    .addEventListener("input", function () {
      const searchValue = this.value.toLowerCase();

      const filtered = posTerminals.filter(
        (terminal) =>
          terminal.terminal_name.toLowerCase().includes(searchValue) ||
          String(terminal.float_start).includes(searchValue) ||
          terminal.status.toLowerCase().includes(searchValue),
      );

      currentPage = 1;

      displayPOSTerminalsTable(filtered);
    });
});

const displayPOSTerminals = async () => {
  const response = await axios.get(`${baseAPI}/pos_terminals.php`, {
    params: {
      operation: "getAllPOSTerminals",
    },
  });

  if (response.status == 200) {
    console.log(response.data);

    posTerminals = response.data;

    displayPOSTerminalsTable(response.data);
  } else {
    Swal.fire("ERROR");
  }
};

const displayPOSTerminalsTable = (posTerminals) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(posTerminals, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
    <tr>
      <th>Terminal Name</th>
      <th>Float Start</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  rows.forEach((terminal) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${terminal.terminal_name}</td>
      <td>${formatCurrency(parseFloat(terminal.float_start))}</td>
      <td>${terminal.status}</td>
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
      viewPOSTerminal(terminal.terminal_id);
    });

    tr.querySelector(".btn-update").addEventListener("click", () => {
      updatePOSTerminal(terminal.terminal_id, displayPOSTerminals);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      deletePOSTerminal(terminal.terminal_id, displayPOSTerminals);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(posTerminals.length, currentPage, (page) => {
      currentPage = page;

      displayPOSTerminalsTable(posTerminals);
    }),
  );
};

const insertPOSTerminal = async () => {
  const floatStart = parseFloat(document.getElementById("floatStartInput").value);

  if (!(floatStart >= 0)) {
    Swal.fire("Please enter a valid float start.");
    return;
  }

  const jsonData = {
    terminalName: document.getElementById("terminalNameInput").value,

    floatStart: floatStart,

    status: "ACTIVE",
  };

  const formData = new FormData();

  formData.append("operation", "insertPOSTerminal");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/pos_terminals.php`,

    method: "POST",

    data: formData,
  });

  console.log(response.data);

  if (response.data == 1) {
    displayPOSTerminals();

    const modalElement = document.getElementById("terminalModal");

    const modal = bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    Swal.fire("POS Terminal successfully saved!");
  } else {
    Swal.fire("ERROR");
  }
};