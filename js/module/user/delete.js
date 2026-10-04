export const deleteUser = async (userId, refreshFunc) => {
  const modalElement = document.getElementById("decisionModal");

  const decisionModal = new bootstrap.Modal(modalElement);

  decisionModal.show();

  document.getElementById("confirmYes").addEventListener("click", async () => {
    const user = await getUserDetails(userId);

    console.log("API Response:", user);

    refreshFunc();

    decisionModal.hide();
  });

  document.getElementById("confirmNo").addEventListener("click", () => {
    decisionModal.hide();
  });
};

const getUserDetails = async (userId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  console.log(userId);

  const response = await axios.get(`${baseAPI}/users.php`, {
    params: {
      operation: "deleteUser",

      json: JSON.stringify({
        userId: userId,
      }),
    },
  });

  console.log(response.data);

  return response.data;
};
