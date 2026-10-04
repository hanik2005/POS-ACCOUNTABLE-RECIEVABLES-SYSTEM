export const deleteRole = async (roleId, refreshFunc) => {
  const modalElement = document.getElementById("decisionModal");

  const decisionModal = new bootstrap.Modal(modalElement);

  decisionModal.show();

  document.getElementById("confirmYes").addEventListener("click", async () => {
    const role = await getRoleDetails(roleId);

    console.log("API Response:", role);

    refreshFunc();

    decisionModal.hide();
  });

  document.getElementById("confirmNo").addEventListener("click", () => {
    decisionModal.hide();
  });
};

const getRoleDetails = async (roleId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  console.log(roleId);

  const response = await axios.get(`${baseAPI}/roles.php`, {
    params: {
      operation: "deleteRole",

      json: JSON.stringify({
        roleId: roleId,
      }),
    },
  });

  console.log(response.data);

  return response.data;
};
