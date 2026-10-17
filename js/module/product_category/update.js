
const baseAPI = sessionStorage.getItem("baseAPI");


export const updateProductCategory = async (categoryId, refreshFunc) => {

  try {

    const response = await axios.get(
      `${baseAPI}/product_categories.php`,
      {
        params: {
          operation: "getProductCategory",
          json: JSON.stringify({
            categoryId: categoryId,
          }),
        },
      }
    );


    const category = response.data[0];


    document.getElementById("blank-modal-title").innerText =
      "Update Product Category";


    document.getElementById("blank-main-div").innerHTML = `

        <div class="col-12">

            <label class="form-label">
                Category Name
            </label>

            <input
                type="text"
                class="form-control mb-3"
                id="updateCategoryName"
                value="${category.category_name ?? ""}"
            >


            <label class="form-label">
                Description
            </label>

            <textarea
                class="form-control mb-3"
                id="updateDescription"
                rows="4"
            >${category.description ?? ""}</textarea>


            <label class="form-label">
                Status
            </label>

            <select
                class="form-select mb-3"
                id="updateStatus"
            >

                <option
                    value="ACTIVE"
                    ${category.status == "ACTIVE" ? "selected" : ""}
                >
                    Active
                </option>

                <option
                    value="INACTIVE"
                    ${category.status == "INACTIVE" ? "selected" : ""}
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
            id="saveUpdateProductCategory"
        >
            Save Changes
        </button>

    `;


    const myModal = new bootstrap.Modal(
      document.getElementById("blank-modal")
    );


    document
      .getElementById("saveUpdateProductCategory")
      .addEventListener("click", async () => {

        await saveUpdateProductCategory(categoryId);

        refreshFunc();

        myModal.hide();

      });


    myModal.show();

  } catch (error) {

    console.error(error);

    Swal.fire("Unable to load product category.");

  }

};


const saveUpdateProductCategory = async (categoryId) => {

  const jsonData = {

    categoryId: categoryId,

    categoryName: document.getElementById("updateCategoryName").value,

    description: document.getElementById("updateDescription").value,

    status: document.getElementById("updateStatus").value,

  };


  if (jsonData.categoryName.trim() === "") {

    Swal.fire("Category name is required.");
    return;

  }


  const formData = new FormData();

  formData.append("operation", "updateProductCategory");

  formData.append("json", JSON.stringify(jsonData));


  try {

    const response = await axios({

      url: `${baseAPI}/product_categories.php`,

      method: "POST",

      data: formData,

    });


    console.log(response.data);


    if (response.data == 1) {

      Swal.fire("Product category successfully updated!");

    } else {

      Swal.fire("ERROR: Product category was not updated.");

    }

  } catch (error) {

    console.error(error);

    Swal.fire("Unable to update product category.");

  }

};