const baseAPI = sessionStorage.getItem("baseAPI");

export const viewCustomer = async (customerId) => {
  const response = await axios.get(`${baseAPI}/customers.php`, {
    params: {
      operation: "getCustomer",

      json: JSON.stringify({
        customerId: customerId,
      }),
    },
  });

  const customer = response.data[0];

  document.getElementById("blank-modal-title").innerText = "Customer Details";

  document.getElementById("blank-main-div").innerHTML = `

        <div class="col-12">

            <table class="table table-bordered">

                <tr>
                    <th>Customer ID</th>
                    <td>
                        ${customer.customer_id}
                    </td>
                </tr>

                <tr>
                    <th>Customer Name</th>
                    <td>
                        ${customer.customer_name}
                    </td>
                </tr>

                <tr>
                    <th>Contact Number</th>
                    <td>
                        ${customer.contact_number ?? ""}
                    </td>
                </tr>

                <tr>
                    <th>Email</th>
                    <td>
                        ${customer.email ?? ""}
                    </td>
                </tr>

                <tr>
                    <th>Address</th>
                    <td>
                        ${customer.address ?? ""}
                    </td>
                </tr>

                <tr>
                    <th>Credit Limit</th>
                    <td>
                        ₱${parseFloat(customer.credit_limit).toFixed(2)}
                    </td>
                </tr>

                <tr>
                    <th>Group Days</th>
                    <td>
                        ${customer.days_name ?? ""}
                    </td>
                </tr>

                <tr>
                    <th>Days Due</th>
                    <td>
                        ${customer.days_due ?? ""}
                    </td>
                </tr>

                <tr>
                    <th>Status</th>
                    <td>
                        ${customer.status}
                    </td>
                </tr>

            </table>

        </div>

    `;

  document.getElementById("blank-modal-footer").innerHTML = `

        <button
            type="button"
            class="btn btn-secondary btn-sm w-100"
            data-bs-dismiss="modal"
        >
            Close
        </button>

    `;

  const myModal = new bootstrap.Modal(document.getElementById("blank-modal"));

  myModal.show();
};
