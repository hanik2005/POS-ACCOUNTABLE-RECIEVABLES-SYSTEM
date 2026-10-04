import { paginate, createPagination } from "../js/module/pagination.js";

const baseAPI = "http://localhost/POS_AR_SYSTEM/api_functional";

sessionStorage.setItem("baseAPI", baseAPI);

let currentPage = 1;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

const formatTime = (dateTime) => {
  return new Date(dateTime.replace(" ", "T")).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

document.addEventListener("DOMContentLoaded", () => {
  displayRequests();
});

const displayRequests = async () => {
  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: { operation: "getFloatRequests" },
  });

  if (response.status == 200) {
    displayRequestsTable(response.data);
  } else {
    alert("Error!");
  }
};

const displayRequestsTable = (requests) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(requests, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-sm");

  table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Cashier</th>
                <th>Terminal</th>
                <th>Request</th>
                <th>Amount</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Decided By</th>
                <th>Action</th>
            </tr>
        </thead>
    `;

  const tBody = document.createElement("tbody");

  rows.forEach((request) => {
    const amount = parseFloat(request.amount);

    const tr = document.createElement("tr");

    if (request.status == "PENDING") {
      tr.classList.add("table-warning");
    }

    tr.innerHTML = `
            <td>${formatTime(request.created_at)}</td>
            <td>${request.cashier}</td>
            <td>${request.terminal_name}</td>
            <td>${amount > 0 ? "Add float" : "Remove float"}</td>
            <td>${formatCurrency(Math.abs(amount))}</td>
            <td>${request.reason || ""}</td>
            <td>${request.status}</td>
            <td>${request.approver_name || ""}</td>
            <td>
                ${
                  request.status == "PENDING"
                    ? `<button type="button" class="btn btn-success btn-sm btn-approve">APPROVE</button>
                       <button type="button" class="btn btn-danger btn-sm btn-reject">REJECT</button>`
                    : ""
                }
            </td>
        `;

    tBody.appendChild(tr);

    const approveBtn = tr.querySelector(".btn-approve");

    if (approveBtn) {
      approveBtn.addEventListener("click", () => {
        updateRequest(request, "APPROVED");
      });

      tr.querySelector(".btn-reject").addEventListener("click", () => {
        updateRequest(request, "REJECTED");
      });
    }
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(requests.length, currentPage, (page) => {
      currentPage = page;

      displayRequestsTable(requests);
    }),
  );
};

const updateRequest = async (request, status) => {
  const jsonData = { movementId: request.movement_id, status: status };

  const formData = new FormData();
  formData.append("operation", "updateFloatRequest");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/shift.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    const amount = formatCurrency(Math.abs(parseFloat(request.amount)));

    if (status == "REJECTED") {
      alert("Float request has been rejected!");
    } else if (parseFloat(request.amount) > 0) {
      alert(`Float request has been approved! Send ${amount} to the cash drawer of ${request.cashier}.`);
    } else {
      alert(`Float request has been approved! Take ${amount} out of the cash drawer of ${request.cashier}.`);
    }

    displayRequests();
  } else if (response.data == 3) {
    alert("ERROR! Only the admin and accounting can decide a float request.");
  } else {
    alert("ERROR!");
  }
};