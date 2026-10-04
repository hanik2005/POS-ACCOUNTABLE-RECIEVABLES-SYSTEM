import { paginate, createPagination } from "../js/module/pagination.js";

const baseAPI = "http://localhost/POS_AR_SYSTEM/api_functional";

sessionStorage.setItem("baseAPI", baseAPI);

let sales = [];
let items = [];
let selectedSalesId = "";
let itemsPage = 1;
let returnsPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  loadSales();
  displayReturns();

  document.getElementById("invoice-search").addEventListener("input", () => {
    selectedSalesId = "";
    items = [];
    itemsPage = 1;

    displayItems();
    displayInvoiceResults();
  });

  document.getElementById("button-save-return").addEventListener("click", () => {
    saveReturn();
  });
});

const loadSales = async () => {
  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: { operation: "getAllSales" },
  });

  if (response.status == 200) {
    sales = response.data;
  } else {
    alert("Error!");
  }
};

const displayInvoiceResults = () => {
  const main = document.getElementById("invoice-results");
  const searchValue = document.getElementById("invoice-search").value.toLowerCase();

  main.innerHTML = "";

  if (searchValue == "" || selectedSalesId != "") {
    return;
  }

  const filtered = sales
    .filter((sale) => sale.invoice_number.toLowerCase().includes(searchValue) || (sale.customer_name || "").toLowerCase().includes(searchValue))
    .slice(0, 8);

  if (filtered.length == 0) {
    main.innerHTML = `<div class="list-group-item">No invoice found.</div>`;
    return;
  }

  filtered.forEach((sale) => {
    const button = document.createElement("button");

    button.type = "button";
    button.classList.add("list-group-item", "list-group-item-action");
    button.innerText = `${sale.invoice_number} - ${sale.customer_name} (₱${parseFloat(sale.total_amount).toFixed(2)})`;

    button.addEventListener("click", () => {
      selectInvoice(sale);
    });

    main.appendChild(button);
  });
};

const selectInvoice = (sale) => {
  selectedSalesId = sale.sales_id;
  itemsPage = 1;

  document.getElementById("invoice-search").value = `${sale.invoice_number} - ${sale.customer_name}`;

  displayInvoiceResults();
  loadItems(sale.sales_id);
};

const loadItems = async (salesId) => {
  if (salesId == "") {
    items = [];
    displayItems();
    return;
  }

  const response = await axios.get(`${baseAPI}/returns.php`, {
    params: {
      operation: "getReturnableItems",
      json: JSON.stringify({ salesId: salesId }),
    },
  });

  if (response.status == 200) {
    items = response.data.map((item) => ({
      ...item,
      returnable: item.qty_sold - item.qty_returned,
      returnQty: 0,
    }));

    displayItems();
  } else {
    alert("Error!");
  }
};

const displayItems = () => {
  const main = document.getElementById("items-div");

  main.innerHTML = "";

  const { rows, current } = paginate(items, itemsPage);

  itemsPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-sm");

  table.innerHTML = `
        <thead>
            <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Sold</th>
                <th>Returned</th>
                <th>Qty to Return</th>
            </tr>
        </thead>
    `;

  const tBody = document.createElement("tbody");

  rows.forEach((item) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
            <td>${item.product_name}</td>
            <td>₱${parseFloat(item.unit_price).toFixed(2)}</td>
            <td>${item.qty_sold}</td>
            <td>${item.qty_returned}</td>
            <td>
                <input
                    type="number"
                    min="0"
                    max="${item.returnable}"
                    value="${item.returnQty}"
                    ${item.returnable <= 0 ? "disabled" : ""}
                    class="form-control form-control-sm qty-input"
                    style="width: 80px;">
            </td>
        `;

    tBody.appendChild(tr);

    tr.querySelector(".qty-input").addEventListener("change", function () {
      const qty = parseInt(this.value) || 0;

      item.returnQty = Math.min(Math.max(qty, 0), item.returnable);
      this.value = item.returnQty;
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(items.length, itemsPage, (page) => {
      itemsPage = page;

      displayItems();
    }),
  );
};

const saveReturn = async () => {
  const details = items
    .filter((item) => item.returnQty > 0)
    .map((item) => ({
      productId: item.product_id,
      productName: item.product_name,
      productPrice: parseFloat(item.unit_price),
      qty: item.returnQty,
      amount: parseFloat(item.unit_price) * item.returnQty,
    }));

  if (selectedSalesId == "" || details.length == 0) {
    alert("Please search and select an invoice, then enter the qty to return.");
    return;
  }

  const header = {
    salesId: selectedSalesId,
    reason: document.getElementById("return-reason").value,
    amount: details.reduce((sum, item) => sum + item.amount, 0),
  };

  const jsonData = { header: header, details: details };

  const formData = new FormData();
  formData.append("operation", "saveReturn");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/returns.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    alert("Return has been successfully saved! Waiting for approval.");
    document.getElementById("return-reason").value = "";
    loadItems(selectedSalesId);
    displayReturns();
  } else if (response.data == 2) {
    alert("ERROR! Quantity is more than what can be returned.");
  } else {
    alert("ERROR!");
  }
};

const displayReturns = async () => {
  const response = await axios.get(`${baseAPI}/returns.php`, {
    params: { operation: "getAllReturns" },
  });

  if (response.status == 200) {
    displayReturnsTable(response.data);

    return response.data;
  } else {
    alert("Error!");
  }
};

const displayReturnsTable = (returns) => {
  const main = document.getElementById("returns-div");

  main.innerHTML = "";

  const { rows, current } = paginate(returns, returnsPage);

  returnsPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

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
            </tr>
        </thead>
    `;

  const tBody = document.createElement("tbody");

  rows.forEach((ret) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
            <td>${ret.return_date}</td>
            <td>${ret.customer_name || ""}</td>
            <td>${ret.invoice_number}</td>
            <td>${ret.return_reason || ""}</td>
            <td>₱${parseFloat(ret.total_amount).toFixed(2)}</td>
            <td>${ret.refund_amount > 0 ? `₱${parseFloat(ret.refund_amount).toFixed(2)}` : ""}</td>
            <td>${ret.status}</td>
        `;

    tBody.appendChild(tr);
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(returns.length, returnsPage, (page) => {
      returnsPage = page;

      displayReturnsTable(returns);
    }),
  );
};