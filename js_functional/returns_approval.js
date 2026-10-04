import { paginate, createPagination } from "../js/module/pagination.js";

const baseAPI = "http://localhost/POS_AR_SYSTEM/api_functional";

sessionStorage.setItem("baseAPI", baseAPI);

let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayReturns();
});

const displayReturns = async () => {
  const response = await axios.get(`${baseAPI}/returns.php`, {
    params: { operation: "getAllReturns" },
  });

  if (response.status == 200) {
    const returns = response.data.sort((a, b) => (b.status == "PENDING") - (a.status == "PENDING"));

    displayReturnsTable(returns);

    return returns;
  } else {
    alert("Error!");
  }
};

const displayReturnsTable = (returns) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(returns, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-sm");

  table.innerHTML = `
        <thead>
            <tr>
                <th>Date</th>
                <th>Customer</th>
                <th>Invoice</th>
                <th>Reason</th>
                <th>Amount</th>
                <th>Refund</th>
                <th>Status</th>
                <th>Action</th>
            </tr>
        </thead>
    `;

  const tBody = document.createElement("tbody");

  rows.forEach((ret) => {
    const tr = document.createElement("tr");

    if (ret.status == "PENDING") {
      tr.classList.add("table-warning");
    }

    tr.innerHTML = `
            <td>${ret.return_date}</td>
            <td>${ret.customer_name || ""}</td>
            <td>${ret.invoice_number}</td>
            <td>${ret.return_reason || ""}</td>
            <td>₱${parseFloat(ret.total_amount).toFixed(2)}</td>
            <td>${ret.refund_amount > 0 ? `₱${parseFloat(ret.refund_amount).toFixed(2)}` : ""}</td>
            <td>${ret.status}</td>
            <td>
                ${
                  ret.status == "PENDING"
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
        updateReturn(ret.return_id, "approveReturn");
      });

      tr.querySelector(".btn-reject").addEventListener("click", () => {
        updateReturn(ret.return_id, "rejectReturn");
      });
    }
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(returns.length, currentPage, (page) => {
      currentPage = page;

      displayReturnsTable(returns);
    }),
  );
};

const updateReturn = async (returnId, operation) => {
  const jsonData = { returnId: returnId };

  const formData = new FormData();
  formData.append("operation", operation);
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/returns.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    const returns = await displayReturns();
    const ret = returns.find((ret) => ret.return_id == returnId);

    if (operation == "approveReturn" && ret && ret.refund_amount > 0) {
      alert(`Return has been approved! Refund ₱${parseFloat(ret.refund_amount).toFixed(2)} to the customer.`);
    } else {
      alert(operation == "approveReturn" ? "Return has been approved!" : "Return has been rejected!");
    }
  } else if (response.data == 3) {
    alert("ERROR! Only the admin and accounting can approve or reject a return.");
  } else {
    alert("ERROR!");
  }
};