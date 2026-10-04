export const updatePaymentMethod = async (paymentMethodId, refreshFunc) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  const response = await axios.get(`${baseAPI}/payment_methods.php`, {
    params: {
      operation: "getPaymentMethod",

      json: JSON.stringify({
        paymentMethodId: paymentMethodId,
      }),
    },
  });

  console.log(response.data);

  const payment = response.data[0];

  if (!payment) {
    alert("Payment Method not found.");

    return;
  }

  // MODAL TITLE

  document.getElementById("blank-modal-title").innerHTML = `

            <h5 class="modal-title">
                Update Payment Method
            </h5>

            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
            ></button>

        `;

  // MODAL BODY

  document.getElementById("blank-modal-body").innerHTML = `

            <div class="mb-3">

                <label class="form-label">
                    Method Name
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="updateMethodName"
                    value="${payment.method_name}"
                >

            </div>


            <div class="mb-3">

                <label class="form-label">
                    Status
                </label>

                <select
                    class="form-select"
                    id="updateStatus"
                >

                    <option
                        value="ACTIVE"
                        ${payment.status === "ACTIVE" ? "selected" : ""}
                    >
                        Active
                    </option>

                    <option
                        value="INACTIVE"
                        ${payment.status === "INACTIVE" ? "selected" : ""}
                    >
                        Inactive
                    </option>

                </select>

            </div>

        `;

  // MODAL FOOTER

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
                id="saveUpdateBtn"
            >
                Save Changes
            </button>

        `;

  // SHOW MODAL

  const modalElement = document.getElementById("blank-modal");

  const modal = new bootstrap.Modal(modalElement);

  modal.show();

  // SAVE UPDATE

  document
    .getElementById("saveUpdateBtn")
    .addEventListener("click", async () => {
      const result = await saveUpdatePaymentMethod(paymentMethodId);

      if (result) {
        refreshFunc();
      }
    });
};

// SAVE UPDATE PAYMENT METHOD

const saveUpdatePaymentMethod = async (paymentMethodId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  const jsonData = {
    paymentMethodId: paymentMethodId,

    methodName: document.getElementById("updateMethodName").value,

    status: document.getElementById("updateStatus").value,
  };

  const formData = new FormData();

  formData.append("operation", "updatePaymentMethod");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/payment_methods.php`,

    method: "POST",

    data: formData,
  });

  console.log(response.data);

  if (response.data == 1) {
    const modalElement = document.getElementById("blank-modal");

    const modal = bootstrap.Modal.getInstance(modalElement);

    if (modal) {
      modal.hide();
    }

    alert("Payment Method successfully updated!");

    return true;
  } else {
    alert("ERROR");

    return false;
  }
};
