export const viewPaymentMethod = async (paymentMethodId) => {
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

  document.getElementById("blank-modal-title").innerHTML = `

            <h5 class="modal-title">
                Payment Method Details
            </h5>

            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
            ></button>

        `;

  document.getElementById("blank-modal-body").innerHTML = `

            <table class="table table-bordered">

                <tr>

                    <th>
                        Payment Method ID
                    </th>

                    <td>
                        ${payment.payment_method_id}
                    </td>

                </tr>


                <tr>

                    <th>
                        Method Name
                    </th>

                    <td>
                        ${payment.method_name}
                    </td>

                </tr>


                <tr>

                    <th>
                        Status
                    </th>

                    <td>
                        ${payment.status}
                    </td>

                </tr>

            </table>

        `;

  document.getElementById("blank-modal-footer").innerHTML = `

            <button
                type="button"
                class="btn btn-secondary"
                data-bs-dismiss="modal"
            >
                Close
            </button>

        `;

  const modalElement = document.getElementById("blank-modal");

  const modal = new bootstrap.Modal(modalElement);

  modal.show();
};
