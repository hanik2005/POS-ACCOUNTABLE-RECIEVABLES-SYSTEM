export const deleteGroupDays = async (groupDaysId, refreshFunc) => {
  const modalElement = document.getElementById("decisionModal");

  const decisionModal = new bootstrap.Modal(modalElement);

  decisionModal.show();

  document.getElementById("confirmYes").addEventListener("click", async () => {
    const group = await getGroupDaysDetails(groupDaysId);

    console.log("API Response:", group);

    refreshFunc();

    decisionModal.hide();
  });

  document.getElementById("confirmNo").addEventListener("click", () => {
    decisionModal.hide();
  });
};

const getGroupDaysDetails = async (groupDaysId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  console.log(groupDaysId);

  const response = await axios.get(`${baseAPI}/group_days.php`, {
    params: {
      operation: "deleteGroupDays",

      json: JSON.stringify({
        groupDaysId: groupDaysId,
      }),
    },
  });

  console.log(response.data);

  return response.data;
};
