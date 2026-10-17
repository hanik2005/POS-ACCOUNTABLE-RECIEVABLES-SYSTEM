const baseAPI = sessionStorage.getItem("baseAPI");

// ========================================
// UPDATE PRODUCT
// ========================================

export const updateProduct = async (productId, refreshFunc) => {
  const response = await axios.get(`${baseAPI}/products.php`, {
    params: {
      operation: "getProduct",
      json: JSON.stringify({
        productId: productId,
      }),
    },
  });

  const product = response.data[0];

  document.getElementById("blank-modal-title").innerText = "Update Product";

  document.getElementById("blank-main-div").innerHTML = `

    <div class="col-12">

      <label class="form-label">
        Barcode
      </label>

      <input
        type="text"
        class="form-control mb-3"
        id="updateBarcode"
        value="${product.barcode ?? ""}"
      >


      <label class="form-label">
        Product Name
      </label>

      <input
        type="text"
        class="form-control mb-3"
        id="updateProductName"
        value="${product.product_name ?? ""}"
      >


      <label class="form-label">
        Description
      </label>

      <textarea
        class="form-control mb-3"
        id="updateDescription"
        rows="3"
      >${product.description ?? ""}</textarea>


      <label class="form-label">
        Unit Price
      </label>

      <input
        type="number"
        class="form-control mb-3"
        id="updateUnitPrice"
        value="${product.unit_price ?? ""}"
        step="0.01"
        min="0"
      >


      <label class="form-label">
        Unit
      </label>

      <select
        class="form-select mb-3"
        id="updateUnit"
      >

        <option value="">
          Select unit
        </option>

      </select>


      <label class="form-label">
        Category
      </label>

      <select
        class="form-select mb-3"
        id="updateCategory"
      >

        <option value="">
          Select category
        </option>

      </select>


      <label class="form-label">
        Status
      </label>

      <select
        class="form-select mb-3"
        id="updateStatus"
      >

        <option
          value="ACTIVE"
          ${product.status == "ACTIVE" ? "selected" : ""}
        >
          Active
        </option>

        <option
          value="INACTIVE"
          ${product.status == "INACTIVE" ? "selected" : ""}
        >
          Inactive
        </option>

      </select>

    </div>

  `;

  document.getElementById("blank-modal-footer").innerHTML = `

    <button
      type="button"
      class="btn btn-secondary"
      data-bs-dismiss="modal"
    >
      Cancel
    </button>

    <button
      type="button"
      class="btn btn-success"
      id="saveUpdateProduct"
    >
      Save Changes
    </button>

  `;

  // Load units and categories
  await loadUpdateUnits(product.unit_id);

  await loadUpdateCategories(product.category_id);

  const myModal = new bootstrap.Modal(document.getElementById("blank-modal"));

  myModal.show();

  document
    .getElementById("saveUpdateProduct")
    .addEventListener("click", async () => {
      const success = await saveUpdateProduct(productId);

      if (success) {
        myModal.hide();

        refreshFunc();
      }
    });
};

// ========================================
// LOAD UNITS
// ========================================

const loadUpdateUnits = async (selectedUnitId) => {
  const response = await axios.get(`${baseAPI}/units.php`, {
    params: {
      operation: "getAllUnits",
    },
  });

  const unitInput = document.getElementById("updateUnit");

  unitInput.innerHTML = `<option value="">Select unit</option>`;

  response.data.forEach((unit) => {
    if (unit.status === "ACTIVE" || unit.unit_id == selectedUnitId) {
      const selected = unit.unit_id == selectedUnitId ? "selected" : "";

      unitInput.innerHTML += `

        <option
          value="${unit.unit_id}"
          ${selected}
        >
          ${unit.unit_name}
        </option>

      `;
    }
  });
};

// ========================================
// LOAD CATEGORIES
// ========================================

const loadUpdateCategories = async (selectedCategoryId) => {
  const response = await axios.get(`${baseAPI}/product_categories.php`, {
    params: {
      operation: "getAllProductCategories",
    },
  });

  const categoryInput = document.getElementById("updateCategory");

  categoryInput.innerHTML = `<option value="">Select category</option>`;

  response.data.forEach((category) => {
    if (
      category.status === "ACTIVE" ||
      category.category_id == selectedCategoryId
    ) {
      const selected =
        category.category_id == selectedCategoryId ? "selected" : "";

      categoryInput.innerHTML += `

        <option
          value="${category.category_id}"
          ${selected}
        >
          ${category.category_name}
        </option>

      `;
    }
  });
};

// ========================================
// SAVE UPDATED PRODUCT
// ========================================

const saveUpdateProduct = async (productId) => {
  const jsonData = {
    product: {
      productId: productId,

      barcode: document.getElementById("updateBarcode").value,

      productName: document.getElementById("updateProductName").value,

      description: document.getElementById("updateDescription").value,

      unitPrice: document.getElementById("updateUnitPrice").value,

      unitId: document.getElementById("updateUnit").value,

      categoryId: document.getElementById("updateCategory").value,

      status: document.getElementById("updateStatus").value,
    },
  };

  const formData = new FormData();

  formData.append("operation", "updateProduct");

  formData.append("json", JSON.stringify(jsonData));

  try {
    const response = await axios({
      url: `${baseAPI}/products.php`,

      method: "POST",

      data: formData,
    });

    console.log(response.data);

    if (response.data == 1) {
      Swal.fire("Product successfully updated!");

      return true;
    } else {
      Swal.fire("ERROR: Product was not updated.");

      return false;
    }
  } catch (error) {
    console.error(error);

    Swal.fire("Unable to update product.");

    return false;
  }
};
