import { viewProductCategory } from "./module/product_category/view.js";
import { updateProductCategory } from "./module/product_category/update.js";
import { deleteProductCategory } from "./module/product_category/delete.js";
import { paginate, createPagination } from "./module/pagination.js";
import { baseAPI } from "./config.js";


sessionStorage.setItem("baseAPI", baseAPI);

let productCategories = [];
let currentPage = 1;

document.addEventListener("DOMContentLoaded", () => {
  displayProductCategories();

  document.getElementById("submitBtn").addEventListener("click", () => {
    insertProductCategory();
  });

  document
    .getElementById("searchProductCategory")
    .addEventListener("input", function () {
      const searchValue = this.value.toLowerCase();

      const filtered = productCategories.filter(
        (category) =>
          String(category.category_name).toLowerCase().includes(searchValue) ||
          String(category.description ?? "")
            .toLowerCase()
            .includes(searchValue) ||
          String(category.status).toLowerCase().includes(searchValue),
      );

      currentPage = 1;

      displayProductCategoriesTable(filtered);
    });
});

const displayProductCategories = async () => {
  try {
    const response = await axios.get(`${baseAPI}/product_categories.php`, {
      params: {
        operation: "getAllProductCategories",
      },
    });

    if (response.status == 200) {
      console.log(response.data);

      productCategories = response.data;

      displayProductCategoriesTable(response.data);
    } else {
      Swal.fire("ERROR");
    }
  } catch (error) {
    console.error(error);

    document.getElementById("main-div").innerHTML = `
      <div class="alert alert-danger">
        Error loading product categories.
      </div>
    `;
  }
};

const displayProductCategoriesTable = (productCategories) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(productCategories, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
    <tr>
      <th>Category Name</th>
      <th>Description</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  rows.forEach((category) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${category.category_name}</td>
      <td>${category.description ?? ""}</td>
      <td>${category.status}</td>
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
      viewProductCategory(category.category_id);
    });

    tr.querySelector(".btn-update").addEventListener("click", () => {
      updateProductCategory(category.category_id, displayProductCategories);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      deleteProductCategory(category.category_id, displayProductCategories);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(productCategories.length, currentPage, (page) => {
      currentPage = page;

      displayProductCategoriesTable(productCategories);
    }),
  );
};

const insertProductCategory = async () => {
  const categoryName = document
    .getElementById("categoryNameInput")
    .value.trim();

  const description = document.getElementById("descriptionInput").value.trim();

  if (categoryName === "") {
    Swal.fire("Please enter a category name.");

    return;
  }

  const jsonData = {
    categoryName: categoryName,

    description: description,

    status: "ACTIVE",
  };

  const formData = new FormData();

  formData.append("operation", "insertProductCategory");

  formData.append("json", JSON.stringify(jsonData));

  try {
    const response = await axios({
      url: `${baseAPI}/product_categories.php`,

      method: "POST",

      data: formData,
    });

    console.log(response.data);

    if (response.data == 1) {
      Swal.fire("Product category successfully added.");

      displayProductCategories();

      const modalElement = document.getElementById("productCategoryModal");

      const modal = bootstrap.Modal.getInstance(modalElement);

      if (modal) {
        modal.hide();
      }

      const form = document.getElementById("categoryForm");

      if (form) {
        form.reset();
      }
    } else {
      Swal.fire("Failed to add product category.");
    }
  } catch (error) {
    console.error(error);

    Swal.fire("An error occurred while adding the product category.");
  }
};