const baseAPI = sessionStorage.getItem("baseAPI");


export const viewInventory = async (inventoryId) => {

    const response = await axios.get(
        `${baseAPI}/inventory.php`,
        {
            params: {
                operation: "getInventory",
                json: JSON.stringify({
                    inventoryId: inventoryId
                })
            }
        }
    );

    const inventory = response.data[0];

    document.getElementById("blank-modal-title").innerText =
        "View Inventory Details";


    document.getElementById("blank-main-div").innerHTML = `

        <table class="table table-sm">

            <tr>
                <td><strong>Inventory ID</strong></td>
                <td>${inventory.inventory_id}</td>
            </tr>

            <tr>
                <td><strong>Product</strong></td>
                <td>${inventory.product_name || ""}</td>
            </tr>

            <tr>
                <td><strong>Quantity On Hand</strong></td>
                <td>${inventory.quantity_on_hand}</td>
            </tr>

            <tr>
                <td><strong>Reorder Level</strong></td>
                <td>${inventory.reorder_level}</td>
            </tr>

            <tr>
                <td><strong>Status</strong></td>
                <td>${inventory.status}</td>
            </tr>

        </table>

    `;


    // Reset footer
    document.getElementById("blank-modal-footer").innerHTML = `

        <button
            type="button"
            class="btn btn-secondary btn-sm w-100"
            data-bs-dismiss="modal"
        >
            Close
        </button>

    `;


    const myModal = new bootstrap.Modal(
        document.getElementById("blank-modal")
    );

    myModal.show();
};