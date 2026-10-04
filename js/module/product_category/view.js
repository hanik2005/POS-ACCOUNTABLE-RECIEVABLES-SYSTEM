
const baseAPI = sessionStorage.getItem("baseAPI");


export const viewProductCategory = async (categoryId) => {

    const response = await axios.get(
        `${baseAPI}/product_categories.php`,
        {
            params: {
                operation: "getProductCategory",
                json: JSON.stringify({
                    categoryId: categoryId
                })
            }
        }
    );

    const category = response.data[0];

    document.getElementById("blank-modal-title").innerText =
        "View Product Category Details";


    document.getElementById("blank-main-div").innerHTML = `

        <table class="table table-sm">

            <tr>
                <td><strong>Category ID</strong></td>
                <td>${category.category_id}</td>
            </tr>

            <tr>
                <td><strong>Category Name</strong></td>
                <td>${category.category_name}</td>
            </tr>

            <tr>
                <td><strong>Description</strong></td>
                <td>${category.description || ""}</td>
            </tr>

            <tr>
                <td><strong>Status</strong></td>
                <td>${category.status}</td>
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