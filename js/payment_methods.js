import { viewPaymentMethod } from "./module/payment_method/view.js";
import { updatePaymentMethod } from "./module/payment_method/update.js";
import { deletePaymentMethod } from "./module/payment_method/delete.js";
import { paginate, createPagination } from "./module/pagination.js";

const baseAPI = "http://localhost/POS_AR_SYSTEM/api";

sessionStorage.setItem("baseAPI", baseAPI);

let paymentMethods = [];
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayPaymentMethods();

  document.getElementById("submitBtn").addEventListener("click", () => {
    insertPaymentMethod();
  });

  document
    .getElementById("searchPaymentMethod")
    .addEventListener("input", function () {
      const searchValue = this.value.toLowerCase();

      const filtered = paymentMethods.filter(
        (payment) =>
          payment.method_name.toLowerCase().includes(searchValue) ||
          payment.status.toLowerCase().includes(searchValue),
      );

      currentPage = 1;

      displayPaymentMethodsTable(filtered);
    });
});

const displayPaymentMethods = async () => {
  const response = await axios.get(`${baseAPI}/payment_methods.php`, {
    params: {
      operation: "getAllPaymentMethods",
    },
  });

  if (response.status == 200) {
    console.log(response.data);

    paymentMethods = response.data;

    displayPaymentMethodsTable(response.data);
  } else {
    alert("ERROR");
  }
};

const displayPaymentMethodsTable = (paymentMethods) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(paymentMethods, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
    <tr>
      <th>Method Name</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  rows.forEach((payment) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${payment.method_name}</td>
      <td>${payment.status}</td>
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
      viewPaymentMethod(payment.payment_method_id);
    });

    tr.querySelector(".btn-update").addEventListener("click", () => {
      updatePaymentMethod(payment.payment_method_id, displayPaymentMethods);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      deletePaymentMethod(payment.payment_method_id, displayPaymentMethods);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(paymentMethods.length, currentPage, (page) => {
      currentPage = page;

      displayPaymentMethodsTable(paymentMethods);
    }),
  );
};

const insertPaymentMethod = async () => {
  const jsonData = {
    methodName: document.getElementById("paymentNameInput").value,

    status: "ACTIVE",
  };

  const formData = new FormData();

  formData.append("operation", "insertPaymentMethod");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/payment_methods.php`,

    method: "POST",

    data: formData,
  });

  console.log(response.data);

  if (response.data == 1) {
    console.log("WORKINH");

    displayPaymentMethods();

    const modalElement = document.getElementById("paymentMethodModal");

    const modal = bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    alert("Payment Method successfully saved!");
  } else {
    alert("ERROR");
  }
};