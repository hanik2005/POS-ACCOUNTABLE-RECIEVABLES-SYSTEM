const baseAPI = sessionStorage.getItem("baseAPI");


export const viewProduct = async (productId) => {

    const response = await axios.get(
        `${baseAPI}/products.php`,
        {
            params: {
                operation: "getProduct",
                json: JSON.stringify({
                    productId: productId
                })
            }
        }
    );

    const product = response.data[0];

    document.getElementById("blank-modal-title").innerText =
        "View Product Details";


    document.getElementById("blank-main-div").innerHTML = `

        <table class="table table-sm">

            <tr>
                <td><strong>Barcode</strong></td>
                <td>${product.barcode}</td>
            </tr>

            <tr>
                <td><strong>Product Name</strong></td>
                <td>${product.product_name}</td>
            </tr>

            <tr>
                <td><strong>Description</strong></td>
                <td>${product.description}</td>
            </tr>

            <tr>
                <td><strong>Unit Price</strong></td>
                <td>₱${parseFloat(product.unit_price).toFixed(2)}</td>
            </tr>

            <tr>
                <td><strong>Unit</strong></td>
                <td>${product.unit_name || ""}</td>
            </tr>

            <tr>
                <td><strong>Category</strong></td>
                <td>${product.category_name || ""}</td>
            </tr>

            <tr>
                <td><strong>Status</strong></td>
                <td>${product.status}</td>
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
