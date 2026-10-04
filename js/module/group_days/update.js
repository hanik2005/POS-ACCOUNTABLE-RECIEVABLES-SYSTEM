export const updateGroupDays = async (groupDaysId, refreshFunc) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  // GET GROUP DAYS

  const response = await axios.get(`${baseAPI}/group_days.php`, {
    params: {
      operation: "getGroupDays",

      json: JSON.stringify({
        groupDaysId: groupDaysId,
      }),
    },
  });

  console.log(response.data);

  const group = response.data[0];

  if (!group) {
    alert("Group Days not found.");

    return;
  }

  // MODAL TITLE

  document.getElementById("blank-modal-title").innerHTML = `

            <h5 class="modal-title">
                Update Group Days
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
                    Days Name
                </label>

                <input
                    type="text"
                    class="form-control"
                    id="updateDaysName"
                    value="${group.days_name}"
                >

            </div>


            <div class="mb-3">

                <label class="form-label">
                    Days Due
                </label>

                <input
                    type="number"
                    class="form-control"
                    id="updateDaysDue"
                    value="${group.days_due}"
                    min="0"
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
                        ${group.status === "ACTIVE" ? "selected" : ""}
                    >
                        Active
                    </option>

                    <option
                        value="INACTIVE"
                        ${group.status === "INACTIVE" ? "selected" : ""}
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

  // SAVE

  document
    .getElementById("saveUpdateBtn")
    .addEventListener("click", async () => {
      const result = await saveUpdateGroupDays(groupDaysId);

      if (result) {
        refreshFunc();
      }
    });
};

// SAVE UPDATE

const saveUpdateGroupDays = async (groupDaysId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  const jsonData = {
    groupDaysId: groupDaysId,

    daysName: document.getElementById("updateDaysName").value,

    daysDue: document.getElementById("updateDaysDue").value,

    status: document.getElementById("updateStatus").value,
  };

  const formData = new FormData();

  formData.append("operation", "updateGroupDays");

  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/group_days.php`,

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

    alert("Group Days successfully updated!");

    return true;
  } else {
    alert("ERROR");

    return false;
  }
};
