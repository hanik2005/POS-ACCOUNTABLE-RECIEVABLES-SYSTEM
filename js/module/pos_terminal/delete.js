export const deletePOSTerminal = async (terminalId, refreshFunc) => {
  const modalElement = document.getElementById("decisionModal");

  const decisionModal = new bootstrap.Modal(modalElement);

  decisionModal.show();

  document.getElementById("confirmYes").addEventListener("click", async () => {
    const terminal = await getPOSTerminalDetails(terminalId);

    console.log("API Response:", terminal);

    refreshFunc();

    decisionModal.hide();
  });

  document.getElementById("confirmNo").addEventListener("click", () => {
    decisionModal.hide();
  });
};

const getPOSTerminalDetails = async (terminalId) => {
  const baseAPI = sessionStorage.getItem("baseAPI");

  console.log(terminalId);

  const response = await axios.get(`${baseAPI}/pos_terminals.php`, {
    params: {
      operation: "deletePOSTerminal",

      json: JSON.stringify({
        terminalId: terminalId,
      }),
    },
  });

  console.log(response.data);

  return response.data;
};
