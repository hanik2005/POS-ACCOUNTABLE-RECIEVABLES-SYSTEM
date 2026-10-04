import { paginate, createPagination } from "../js/module/pagination.js";

const baseAPI = "http://localhost/POS_AR_SYSTEM/api_functional";

sessionStorage.setItem("baseAPI", baseAPI);

let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayAssignments();
});

const displayAssignments = async () => {
  const response = await axios.get(`${baseAPI}/terminal_assignment.php`, {
    params: { operation: "getAssignments" },
  });

  if (response.status == 200) {
    displayAssignmentsTable(response.data);
  } else {
    alert("Error!");
  }
};

const displayAssignmentsTable = (data) => {
  const { assignments, cashiers, terminals, schedules } = data;

  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const cashierOptions = cashiers.map((cashier) => `<option value="${cashier.user_id}">${cashier.full_name} (${cashier.username})</option>`).join("");

  const terminalOptions = terminals.map((terminal) => `<option value="${terminal.terminal_id}">${terminal.terminal_name}</option>`).join("");

  const scheduleOptions = schedules
    .map((schedule) => `<option value="${schedule.schedule_id}">${schedule.schedule_name} (${schedule.start_time.slice(0, 5)} - ${schedule.end_time.slice(0, 5)})</option>`)
    .join("");

  const form = document.createElement("div");

  form.classList.add("row", "g-2", "mb-3");

  form.innerHTML = `
        <div class="col-md-4">
            <select class="form-select form-select-sm new-cashier">
                <option value="">-- SELECT CASHIER --</option>
                ${cashierOptions}
            </select>
        </div>
        <div class="col-md-3">
            <select class="form-select form-select-sm new-terminal">
                <option value="">-- SELECT TERMINAL --</option>
                ${terminalOptions}
            </select>
        </div>
        <div class="col-md-3">
            <select class="form-select form-select-sm new-schedule">
                <option value="">-- SELECT SCHEDULE --</option>
                ${scheduleOptions}
            </select>
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-primary btn-sm btn-add">ASSIGN</button>
        </div>
    `;

  form.querySelector(".btn-add").addEventListener("click", () => {
    saveAssignment("", form.querySelector(".new-cashier").value, form.querySelector(".new-terminal").value, form.querySelector(".new-schedule").value);
  });

  main.appendChild(form);

  const { rows, current } = paginate(assignments, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  table.innerHTML = `
        <thead>
            <tr>
                <th>Cashier</th>
                <th>Username</th>
                <th>Terminal</th>
                <th>Schedule</th>
                <th>Action</th>
            </tr>
        </thead>
    `;

  const tBody = document.createElement("tbody");

  rows.forEach((assignment) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
            <td>${assignment.full_name}${assignment.user_status == "ACTIVE" ? "" : " (INACTIVE)"}</td>
            <td>${assignment.username}</td>
            <td>
                <select class="form-select form-select-sm terminal-select">
                    ${terminalOptions}
                </select>
            </td>
            <td>
                <select class="form-select form-select-sm schedule-select">
                    ${scheduleOptions}
                </select>
            </td>
            <td>
                <button type="button" class="btn btn-success btn-sm btn-save">SAVE</button>
                <button type="button" class="btn btn-danger btn-sm btn-remove">REMOVE</button>
            </td>
        `;

    tBody.appendChild(tr);

    const terminalSelect = tr.querySelector(".terminal-select");
    const scheduleSelect = tr.querySelector(".schedule-select");

    terminalSelect.value = assignment.terminal_id;
    scheduleSelect.value = assignment.schedule_id;

    tr.querySelector(".btn-save").addEventListener("click", () => {
      saveAssignment(assignment.ter_ass_id, assignment.user_id, terminalSelect.value, scheduleSelect.value);
    });

    tr.querySelector(".btn-remove").addEventListener("click", () => {
      removeAssignment(assignment.ter_ass_id);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(assignments.length, currentPage, (page) => {
      currentPage = page;

      displayAssignmentsTable(data);
    }),
  );
};

const saveAssignment = async (assignmentId, userId, terminalId, scheduleId) => {
  if (userId == "" || terminalId == "" || scheduleId == "") {
    alert("Please select a cashier, a terminal and a schedule.");
    return;
  }

  const jsonData = { assignmentId: assignmentId, userId: userId, terminalId: terminalId, scheduleId: scheduleId };

  const formData = new FormData();
  formData.append("operation", "saveAssignment");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/terminal_assignment.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    alert("Terminal assignment has been successfully saved!");

    displayAssignments();
  } else if (response.data == 2) {
    alert("ERROR! This terminal already has a cashier in this time.");
  } else if (response.data == 3) {
    alert("ERROR! This cashier already has a terminal in this time.");
  } else {
    alert("ERROR!");
  }
};

const removeAssignment = async (assignmentId) => {
  const jsonData = { assignmentId: assignmentId };

  const formData = new FormData();
  formData.append("operation", "deleteAssignment");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/terminal_assignment.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    alert("Terminal assignment has been successfully removed!");

    displayAssignments();
  } else {
    alert("ERROR!");
  }
};