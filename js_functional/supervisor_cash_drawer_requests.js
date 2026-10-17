import { functionalAPI as baseAPI } from "../js/config.js";
import { paginate, createPagination } from "../js/module/pagination.js";

let requests = [];
let currentPage = 1;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(parseFloat(amount) || 0);
};

const formatTime = (dateTime) => {
  return new Date(dateTime.replace(" ", "T")).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const escapeHtml = (value) => {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
};

const movementLabel = (request) => {
  if (request.movement_type == "CASH_DROP") {
    return "Cash drop";
  }

  return parseFloat(request.amount) > 0 ? "Add float" : "Remove float";
};

const loadRequests = async () => {
  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: { operation: "getFloatRequests" },
  });

  if (!Array.isArray(response.data)) {
    Swal.fire("Unable to load requests", "Refresh the page and try again.", "error");
    return;
  }

  requests = response.data;
  displayRequests();
};

const displayRequests = () => {
  const { rows, current } = paginate(requests, currentPage);
  currentPage = current;
  const container = document.getElementById("cash-requests");

  if (requests.length == 0) {
    container.innerHTML = `<p class="text-muted mb-0">No cash drawer requests.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover table-sm align-middle">
        <thead>
          <tr>
            <th>Date</th>
            <th>Cashier</th>
            <th>Terminal</th>
            <th>Request</th>
            <th>Amount</th>
            <th>Reason</th>
            <th>Status</th>
            <th>Decided by</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((request) => `
            <tr class="${request.status == "PENDING" ? "table-warning" : ""}">
              <td>${formatTime(request.created_at)}</td>
              <td>${escapeHtml(request.cashier)}</td>
              <td>${escapeHtml(request.terminal_name)}</td>
              <td>${movementLabel(request)}</td>
              <td>${formatCurrency(Math.abs(parseFloat(request.amount)))}</td>
              <td>${escapeHtml(request.reason || "-")}</td>
              <td>${escapeHtml(request.status)}</td>
              <td>${escapeHtml(request.approver_name || "-")}</td>
              <td>${request.status == "PENDING" ? `
                <button type="button" class="btn btn-success btn-sm" data-movement="${request.movement_id}" data-status="APPROVED">Approve</button>
                <button type="button" class="btn btn-danger btn-sm" data-movement="${request.movement_id}" data-status="REJECTED">Reject</button>
              ` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll("button[data-movement]").forEach((button) => {
    button.addEventListener("click", () => {
      decideRequest(button.dataset.movement, button.dataset.status);
    });
  });

  container.appendChild(createPagination(requests.length, currentPage, (page) => {
    currentPage = page;
    displayRequests();
  }));
};

const decideRequest = async (movementId, status) => {
  const request = requests.find((item) => item.movement_id == movementId);
  const verb = status == "APPROVED" ? "approve" : "reject";
  const confirmation = await Swal.fire({
    title: `${verb} this request?`,
    text: `${movementLabel(request)} for ${formatCurrency(Math.abs(parseFloat(request.amount)))} from ${request.cashier}.`,
    icon: "question",
    showCancelButton: true,
    confirmButtonText: `Yes, ${verb}`,
  });

  if (!confirmation.isConfirmed) {
    return;
  }

  const formData = new FormData();
  formData.append("operation", "updateFloatRequest");
  formData.append("json", JSON.stringify({ movementId: movementId, status: status }));

  const response = await axios.post(`${baseAPI}/shift.php`, formData);

  if (response.data == 1) {
    let message = "The cashier request was rejected.";

    if (status == "APPROVED") {
      const amount = formatCurrency(Math.abs(parseFloat(request.amount)));
      let action = "";

      if (request.movement_type == "CASH_DROP") {
        action = `remove ${amount} from the drawer as a cash drop`;
      } else if (parseFloat(request.amount) > 0) {
        action = `add ${amount} to the drawer float`;
      } else {
        action = `remove ${amount} from the drawer float`;
      }

      message = `Approved. Go to ${request.cashier} at ${request.terminal_name} and ${action}.`;
    }

    await Swal.fire({
      title: status == "APPROVED" ? "Request approved" : "Request rejected",
      text: message,
      icon: "success",
    });
    loadRequests();
  } else {
    Swal.fire("Unable to decide request", "It may already be decided, or the shift is closed.", "error");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadRequests();
});
