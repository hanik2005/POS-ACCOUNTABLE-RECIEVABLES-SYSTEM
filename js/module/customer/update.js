const baseAPI = sessionStorage.getItem("baseAPI");

export const updateCustomer = async (customerId, refreshFunc) => {
  // GET CUSTOMER

  const response = await axios.get(`${baseAPI}/customers.php`, {
    params: {
      operation: "getCustomer",

      json: JSON.stringify({
        customerId: customerId,
      }),
    },
  });

  const customer = response.data[0];



  const groupDaysResponse = await axios.get(`${baseAPI}/customers.php`, {
    params: {
      operation: "getGroupDays",
    },
  });

  const groupDays = groupDaysResponse.data;

  let groupDaysOptions = "";

  groupDays.forEach((group) => {
    groupDaysOptions += `

            <option
                value="${group.id}"
                ${customer.group_days_id == group.id ? "selected" : ""}
            >

                ${group.days_name}
                (${group.days_due} Days)

            </option>

        `;
  });

  document.getElementById("blank-modal-title").innerText = "Update Customer";

  document.getElementById("blank-main-div").innerHTML = `

        <div class="col-12">



            <label class="form-label">
                Customer Name
            </label>

            <input
                type="text"
                class="form-control mb-3"
                id="updateCustomerName"
                value="${customer.customer_name}"
            >


            <label class="form-label">
                Contact Number
            </label>

            <input
                type="text"
                class="form-control mb-3"
                id="updateContactNumber"
                value="${customer.contact_number ?? ""}"
            >


            <label class="form-label">
                Email
            </label>

            <input
                type="email"
                class="form-control mb-3"
                id="updateEmail"
                value="${customer.email ?? ""}"
            >


            <label class="form-label">
                Address
            </label>

            <textarea
                class="form-control mb-3"
                id="updateAddress"
                rows="3"
            >${customer.address ?? ""}</textarea>


            <label class="form-label">
                Credit Limit
            </label>

            <input
                type="number"
                class="form-control mb-3"
                id="updateCreditLimit"
                value="${customer.credit_limit}"
                step="0.01"
            >


            <label class="form-label">
                Group Days
            </label>

            <select
                class="form-select mb-3"
                id="updateGroupDays"
            >

                ${groupDaysOptions}

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
                    ${customer.status == "ACTIVE" ? "selected" : ""}
                >
                    Active
                </option>

                <option
                    value="INACTIVE"
                    ${customer.status == "INACTIVE" ? "selected" : ""}
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
            id="saveUpdateCustomer"
        >
            Save Changes
        </button>

    `;

  document
    .getElementById("saveUpdateCustomer")
    .addEventListener("click", async () => {
      const result = await saveUpdateCustomer(customerId);

      if (result) {
        refreshFunc();
      }
    });

  const myModal = new bootstrap.Modal(document.getElementById("blank-modal"));

  myModal.show();
};

const saveUpdateCustomer = async (customerId) => {
  const jsonData = {
    customerId: customerId,

    customerName: document.getElementById("updateCustomerName").value,

    contactNumber: document.getElementById("updateContactNumber").value,

    email: document.getElementById("updateEmail").value,

    address: document.getElementById("updateAddress").value,

    creditLimit: document.getElementById("updateCreditLimit").value,

    groupDaysId: document.getElementById("updateGroupDays").value,

    status: document.getElementById("updateStatus").value,
  };

  const formData = new FormData();

  formData.append("operation", "updateCustomer");

  formData.append("json", JSON.stringify(jsonData));

  try {
    const response = await axios({
      url: `${baseAPI}/customers.php`,

      method: "POST",

      data: formData,
    });

    console.log(response.data);

    if (response.data == 1) {
      alert("Customer successfully updated!");

      const modalElement = document.getElementById("blank-modal");

      const modal = bootstrap.Modal.getInstance(modalElement);

      if (modal) {
        modal.hide();
      }

      return true;
    } else {
      alert("ERROR: Customer was not updated.");

      return false;
    }
  } catch (error) {
    console.error(error);

    alert("Unable to update customer.");

    return false;
  }
};
