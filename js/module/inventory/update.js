
const baseAPI = sessionStorage.getItem("baseAPI");


export const updateInventory = async (inventoryId, refreshFunc) => {

  try {

    const response = await axios.get(
      `${baseAPI}/inventory.php`,
      {
        params: {
          operation: "getInventory",
          json: JSON.stringify({
            inventoryId: inventoryId,
          }),
        },
      }
    );


    const inventory = response.data[0];


    document.getElementById("blank-modal-title").innerText =
      "Update Inventory";


    document.getElementById("blank-main-div").innerHTML = `

        <div class="col-12">

            <label class="form-label">
                Product
            </label>

            <select
                class="form-select mb-3"
                id="updateProduct"
            >

                <option value="">
                    Select Product
                </option>

            </select>


            <label class="form-label">
                Quantity on Hand
            </label>

            <input
                type="number"
                step="0.01"
                class="form-control mb-3"
                id="updateQuantityOnHand"
                value="${inventory.quantity_on_hand}"
            >


            <label class="form-label">
                Reorder Level
            </label>

            <input
                type="number"
                step="0.01"
                class="form-control mb-3"
                id="updateReorderLevel"
                value="${inventory.reorder_level}"
            >


            <label class="form-label">
                Status
            </label>

            <select
                class="form-select mb-3"
                id="updateStatus"
            >

                <option
                    value="ACTIVE"
                    ${inventory.status == "ACTIVE" ? "selected" : ""}
                >
                    Active
                </option>

                <option
                    value="INACTIVE"
                    ${inventory.status == "INACTIVE" ? "selected" : ""}
                >
                    Inactive
                </option>

            </select>

        </div>

    `;


    await loadUpdateProducts(inventory.product_id);


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
            id="saveUpdateInventory"
        >
            Save Changes
        </button>

    `;


    const myModal = new bootstrap.Modal(
      document.getElementById("blank-modal")
    );


    document
      .getElementById("saveUpdateInventory")
      .addEventListener("click", async () => {

        await saveUpdateInventory(inventoryId);

        refreshFunc();

        myModal.hide();

      });


    myModal.show();

  } catch (error) {

    console.error(error);

    Swal.fire("Unable to load inventory.");

  }

};


const loadUpdateProducts = async (selectedProductId) => {

  try {

    const response = await axios.get(
      `${baseAPI}/products.php`,
      {
        params: {
          operation: "getAllProducts",
        },
      }
    );


    const productInput = document.getElementById("updateProduct");


    response.data.forEach((product) => {

      if (
        product.status === "ACTIVE" ||
        product.product_id == selectedProductId
      ) {

        const selected =
          product.product_id == selectedProductId ? "selected" : "";


        productInput.innerHTML += `

            <option
                value="${product.product_id}"
                ${selected}
            >
                ${product.product_name}
            </option>

        `;

      }

    });

  } catch (error) {

    console.error(error);

    Swal.fire("Unable to load products.");

  }

};


const saveUpdateInventory = async (inventoryId) => {

  const jsonData = {

    inventoryId: inventoryId,

    productId: document.getElementById("updateProduct").value,

    quantityOnHand: document.getElementById("updateQuantityOnHand").value,

    reorderLevel: document.getElementById("updateReorderLevel").value,

    status: document.getElementById("updateStatus").value,

  };


  const formData = new FormData();

  formData.append("operation", "updateInventory");

  formData.append("json", JSON.stringify(jsonData));


  try {

    const response = await axios({

      url: `${baseAPI}/inventory.php`,

      method: "POST",

      data: formData,

    });


    console.log(response.data);


    if (response.data == 1) {

      Swal.fire("Inventory successfully updated!");

    } else {

      Swal.fire("ERROR: Inventory was not updated.");

    }

  } catch (error) {

    console.error(error);

    Swal.fire("Unable to update inventory.");

  }

};