export const viewGroupDays = async (groupDaysId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

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
    Swal.fire("Group Days not found.");

    return;
  }

  document.getElementById("blank-modal-title").innerHTML = `

            <h5 class="modal-title">
                Group Days Details
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
                        ID
                    </th>

                    <td>
                        ${group.id}
                    </td>

                </tr>


                <tr>

                    <th>
                        Days Name
                    </th>

                    <td>
                        ${group.days_name}
                    </td>

                </tr>


                <tr>

                    <th>
                        Days Due
                    </th>

                    <td>
                        ${group.days_due} Days
                    </td>

                </tr>


                <tr>

                    <th>
                        Status
                    </th>

                    <td>
                        ${group.status}
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
