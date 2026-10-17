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

const loadRequests = async () => {
  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: { operation: "getSaleVoidRequests" },
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
  const container = document.getElementById("void-requests");

  if (requests.length == 0) {
    container.innerHTML = `<p class="text-muted mb-0">No paid-sale void requests.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-hover table-sm align-middle">
        <thead>
          <tr>
            <th>Requested</th>
            <th>Invoice</th>
            <th>Customer</th>
            <th>Cashier</th>
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
              <td>${formatTime(request.requested_at)}</td>
              <td>${escapeHtml(request.invoice_number || `Sale ${request.sales_id}`)}</td>
              <td>${escapeHtml(request.customer_name || "Walk-in")}</td>
              <td>${escapeHtml(request.cashier)}</td>
              <td>${formatCurrency(request.total_amount)}</td>
              <td>${escapeHtml(request.reason || "-")}</td>
              <td>${escapeHtml(request.status)}</td>
              <td>${escapeHtml(request.approver_name || "-")}</td>
              <td>${request.status == "PENDING" ? `
                <button type="button" class="btn btn-success btn-sm" data-void="${request.void_request_id}" data-status="APPROVED">Approve void</button>
                <button type="button" class="btn btn-danger btn-sm" data-void="${request.void_request_id}" data-status="REJECTED">Reject</button>
              ` : ""}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  container.querySelectorAll("button[data-void]").forEach((button) => {
    button.addEventListener("click", () => {
      decideRequest(button.dataset.void, button.dataset.status);
    });
  });

  container.appendChild(createPagination(requests.length, currentPage, (page) => {
    currentPage = page;
    displayRequests();
  }));
};

const decideRequest = async (requestId, status) => {
  const request = requests.find((item) => item.void_request_id == requestId);
  const confirmation = await Swal.fire({
    title: status == "APPROVED" ? "Approve sale void?" : "Reject sale void?",
    text: `${request.invoice_number || `Sale ${request.sales_id}`} for ${formatCurrency(request.total_amount)}. Approval marks the sale and invoice VOID but does not issue a refund.`,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: status == "APPROVED" ? "Approve void" : "Reject request",
  });

  if (!confirmation.isConfirmed) {
    return;
  }

  const formData = new FormData();
  formData.append("operation", "decideSaleVoid");
  formData.append("json", JSON.stringify({ requestId: requestId, status: status }));

  const response = await axios.post(`${baseAPI}/sales.php`, formData);

  if (response.data == 1) {
    await Swal.fire(
      status == "APPROVED" ? "Sale voided" : "Void request rejected",
      status == "APPROVED" ? "The sale and its invoice are now marked VOID." : "The sale remains completed.",
      "success",
    );
    loadRequests();
  } else {
    Swal.fire("Unable to decide request", "It may already be decided or the sale is no longer completed.", "error");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadRequests();
});
