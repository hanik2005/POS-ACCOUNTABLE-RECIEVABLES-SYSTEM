import { viewCustomer } from "./module/customer/view.js";
import { updateCustomer } from "./module/customer/update.js";
import { deleteCustomer } from "./module/customer/delete.js";
import { paginate, createPagination } from "./module/pagination.js";
import { baseAPI } from "./config.js";


sessionStorage.setItem("baseAPI", baseAPI);

let customers = [];
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayCustomers();

  displayGroupDays();

  document.getElementById("submitBtn").addEventListener("click", () => {
    insertCustomer();
  });

  document
    .getElementById("searchCustomer")
    .addEventListener("input", function () {
      const searchValue = this.value.toLowerCase();

      const filtered = customers.filter(
        (customer) =>
          customer.customer_name.toLowerCase().includes(searchValue) ||
          customer.contact_number.toString().includes(searchValue) ||
          customer.days_name.toLowerCase().includes(searchValue) ||
          customer.credit_limit.toLowerCase().includes(searchValue),
      );

      currentPage = 1;

      displayCustomersTable(filtered);
    });
});

const displayCustomers = async () => {
  const response = await axios.get(`${baseAPI}/customers.php`, {
    params: {
      operation: "getAllCustomers",
    },
  });

  if (response.status == 200) {
    console.log(response.data);

    customers = response.data;

    displayCustomersTable(response.data);
  } else {
    Swal.fire("ERROR");
  }
};

const displayCustomersTable = (customers) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(customers, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
    <tr>
      <th>Customer Name</th>
      <th>Contact Number</th>
      <th>Email</th>
      <th>Address</th>
      <th>Credit Limit</th>
      <th>Group Days</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  rows.forEach((customer) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${customer.customer_name}</td>
      <td>${customer.contact_number ?? ""}</td>
      <td>${customer.email ?? ""}</td>
      <td>${customer.address ?? ""}</td>
      <td>₱${parseFloat(customer.credit_limit).toFixed(2)}</td>
      <td>${customer.days_name ?? ""}</td>
      <td>${customer.status}</td>
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
      viewCustomer(customer.customer_id);
    });

    tr.querySelector(".btn-update").addEventListener("click", () => {
      updateCustomer(customer.customer_id, displayCustomers);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      deleteCustomer(customer.customer_id, displayCustomers);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(customers.length, currentPage, (page) => {
      currentPage = page;

      displayCustomersTable(customers);
    }),
  );
};

const insertCustomer = async () => {
  const jsonData = {
    customerName: document.getElementById("customerNameInput").value,

    contactNumber: document.getElementById("contactNumberInput").value,

    email: document.getElementById("emailInput").value,

    address: document.getElementById("addressInput").value,

    creditLimit: document.getElementById("creditLimitInput").value,

    groupDaysId: document.getElementById("groupDaysInput").value,

    status: "ACTIVE",
  };

  const formData = new FormData();

  formData.append("operation", "insertCustomer");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/customers.php`,

    method: "POST",

    data: formData,
  });

  console.log(response.data);

  if (response.data == 1) {
    displayCustomers();

    const modalElement = document.getElementById("customerModal");

    const modal = bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    Swal.fire("Customer successfully saved!");
  } else {
    Swal.fire("ERROR");
  }
};

const displayGroupDays = async () => {
  const response = await axios.get(`${baseAPI}/customers.php`, {
    params: {
      operation: "getGroupDays",
    },
  });

  console.log(response.data);

  const select = document.getElementById("groupDaysInput");

  response.data.forEach((group) => {
    const option = document.createElement("option");

    option.value = group.id;

    option.textContent = `${group.days_name} (${group.days_due} Days)`;

    select.appendChild(option);
  });
};
