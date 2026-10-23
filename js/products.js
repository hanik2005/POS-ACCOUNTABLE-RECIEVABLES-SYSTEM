import { viewProduct } from "./module/product/view.js";
import { updateProduct } from "./module/product/update.js";
import { deleteProduct } from "./module/product/delete.js";
import { paginate, createPagination } from "./module/pagination.js";
import { baseAPI } from "./config.js";
import { formatCurrency } from "./module/number_format.js";

sessionStorage.setItem("baseAPI", baseAPI);

let products = [];
let units = [];
let categories = [];
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayProducts();
  loadProductOptions();

  document.getElementById("submitBtn").addEventListener("click", () => {
    insertProduct();
  });

  document.getElementById("searchProduct").addEventListener("input", function () {
    const searchValue = this.value.toLowerCase();

    const filtered = products.filter(
      (product) =>
        product.product_name.toLowerCase().includes(searchValue) ||
        product.barcode.toLowerCase().includes(searchValue) ||
        product.unit_price.toLowerCase().includes(searchValue) ||
        (product.unit_name || "").toLowerCase().includes(searchValue) ||
        (product.category_name || "").toLowerCase().includes(searchValue) ||
        product.status.toLowerCase().includes(searchValue),
    );

    currentPage = 1;

    displayProductsTable(filtered);
  });
});

const displayProducts = async () => {
  const response = await axios.get(`${baseAPI}/products.php`, {
    params: {
      operation: "getAllProducts",
    },
  });

  if (response.status == 200) {
    console.log(response.data);

    products = response.data;

    displayProductsTable(response.data);
  } else {
    Swal.fire("ERROR");
  }
};

const displayProductsTable = (products) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(products, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
    <tr>
      <th>Barcode</th>
      <th>Product Name</th>
      <th>Description</th>
      <th>Unit Price</th>
      <th>Unit</th>
      <th>Category</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  rows.forEach((product) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${product.barcode}</td>
      <td>${product.product_name}</td>
      <td>${product.description}</td>
      <td>${formatCurrency(parseFloat(product.unit_price))}</td>
      <td>${product.unit_name || ""}</td>
      <td>${product.category_name || ""}</td>
      <td>${product.status}</td>
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
      viewProduct(product.product_id);
    });

    tr.querySelector(".btn-update").addEventListener("click", () => {
      updateProduct(product.product_id, displayProducts);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      deleteProduct(product.product_id, displayProducts);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(products.length, currentPage, (page) => {
      currentPage = page;

      displayProductsTable(products);
    }),
  );
};

const insertProduct = async () => {
  const jsonData = {
    product: {
      barcode: document.getElementById("barcodeInput").value,
      productName: document.getElementById("productNameInput").value,
      description: document.getElementById("descriptionInput").value,
      unitPrice: document.getElementById("unitPriceInput").value,
      unitId: document.getElementById("unitInput").value,
      categoryId: document.getElementById("categoryInput").value,
      status: "ACTIVE",
    },
  };

  const formData = new FormData();

  formData.append("operation", "insertProduct");

  formData.append("json", JSON.stringify(jsonData));

  try {
    const response = await axios({
      url: `${baseAPI}/products.php`,
      method: "POST",
      data: formData,
    });

    console.log(response.data);

    if (response.data == 1) {
      displayProducts();

      const modalElement = document.getElementById("productModal");

      const modal = bootstrap.Modal.getInstance(modalElement);

      if (modal) {
        modal.hide();
      }

      document.getElementById("productForm").reset();

      Swal.fire("Product successfully saved!");
    } else {
      Swal.fire("ERROR: Product was not saved.");
    }
  } catch (error) {
    console.error(error);

    Swal.fire("ERROR: Unable to save product.");
  }
};

const loadProductOptions = async () => {
  const responses = await Promise.all([
    axios.get(`${baseAPI}/units.php`, { params: { operation: "getAllUnits" } }),
    axios.get(`${baseAPI}/product_categories.php`, { params: { operation: "getAllProductCategories" } }),
  ]);

  units = responses[0].data.filter((unit) => unit.status === "ACTIVE");
  categories = responses[1].data.filter((category) => category.status === "ACTIVE");

  document.getElementById("unitInput").innerHTML = `<option value="">Select unit</option>${units.map((unit) => `<option value="${unit.unit_id}">${unit.unit_name}</option>`).join("")}`;
  document.getElementById("categoryInput").innerHTML = `<option value="">Select category</option>${categories.map((category) => `<option value="${category.category_id}">${category.category_name}</option>`).join("")}`;
};
