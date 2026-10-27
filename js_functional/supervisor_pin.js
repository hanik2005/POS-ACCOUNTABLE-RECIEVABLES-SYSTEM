import { baseAPI } from "../js/config.js";

const form = document.getElementById("supervisor-pin-form");
const status = document.getElementById("pin-status");
const saveButton = document.getElementById("save-pin");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const password = document.getElementById("current-password").value;
  const pin = document.getElementById("new-pin").value;
  const confirmPin = document.getElementById("confirm-pin").value;

  if (!/^\d{4,6}$/.test(pin)) {
    status.className = "mb-3 text-danger";
    status.textContent = "The PIN must contain 4-6 digits.";
    return;
  }

  if (pin !== confirmPin) {
    status.className = "mb-3 text-danger";
    status.textContent = "The PIN entries do not match.";
    return;
  }

  saveButton.disabled = true;
  status.className = "mb-3";
  status.textContent = "Updating PIN...";

  try {
    const formData = new FormData();
    formData.append("operation", "updateSupervisorPin");
    formData.append("json", JSON.stringify({
      password: password,
      pin: pin,
      confirmPin: confirmPin,
    }));

    const response = await axios({
      url: `${baseAPI}/supervisor.php`,
      method: "POST",
      data: formData,
    });

    const messages = {
      1: "Your supervisor PIN has been updated.",
      2: "Only an active supervisor can update a PIN. Sign in again and retry.",
      3: "The account password is incorrect.",
      4: "That PIN is already assigned to another supervisor. Choose a different PIN.",
      5: "Enter matching PINs containing 4-6 digits.",
    };
    const message = messages[response.data] || "The PIN could not be updated. Please try again.";

    status.className = response.data == 1 ? "mb-3 text-success" : "mb-3 text-danger";
    status.textContent = message;

    if (response.data == 1) {
      form.reset();
    }
  } catch {
    status.className = "mb-3 text-danger";
    status.textContent = "The PIN could not be updated because the server request failed.";
  } finally {
    saveButton.disabled = false;
  }
});
