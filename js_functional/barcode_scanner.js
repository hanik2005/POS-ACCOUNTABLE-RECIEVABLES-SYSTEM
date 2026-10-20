import { functionalAPI } from "../js/config.js";
import { startBarcodeCamera } from "../js/module/barcode_camera.js";

const pairingInput = document.getElementById("pairing-code");
const video = document.getElementById("barcode-video");
const status = document.getElementById("scanner-status");
const startButton = document.getElementById("start-scanner");
const stopButton = document.getElementById("stop-scanner");
const manualInput = document.getElementById("manual-barcode");

let cameraControls = null;

const sendRequest = (operation, data = {}) => {
  const formData = new FormData();
  formData.append("operation", operation);
  formData.append("json", JSON.stringify(data));

  return axios.post(`${functionalAPI}/barcode_scanner.php`, formData);
};

const sendBarcode = (barcode) => {
  const code = pairingInput.value.trim();
  const value = String(barcode || "").trim();

  if (code.length != 8 || value == "") {
    return;
  }

  status.innerText = `Recognized barcode ${value}. Sending to POS...`;

  sendRequest("addScan", {
    pairingCode: code,
    barcode: value,
  })
    .then((response) => {
      if (!response.data.success) {
        status.innerText = response.data.message || "This pairing code is no longer active.";
        return;
      }

      status.innerText = `Sent barcode ${value} to the POS.`;
      manualInput.value = "";
    })
    .catch(() => {
      status.innerText = "Could not send the barcode. Check the network connection and pairing code.";
    });
};

const stopCamera = () => {
  if (cameraControls) {
    cameraControls.stop();
    cameraControls = null;
  }

  video.srcObject = null;
  startButton.disabled = false;
  stopButton.disabled = true;
};

const startCamera = () => {
  const code = pairingInput.value.trim();

  if (!/^\d{8}$/.test(code)) {
    status.innerText = "Enter the 8-digit pairing code from the POS.";
    pairingInput.focus();
    return;
  }

  startButton.disabled = true;
  status.innerText = "Checking the pairing code...";

  sendRequest("validateSession", { pairingCode: code })
    .then((response) => {
      if (!response.data.success) {
        status.innerText = response.data.message || "Pairing code is not active.";
        startButton.disabled = false;
        return;
      }

      status.innerText = "Camera is starting...";

      startBarcodeCamera(
        video,
        (barcode) => {
          sendBarcode(barcode);
        },
        (message) => {
          status.innerText = message;
          startButton.disabled = false;
        },
        (message) => {
          status.innerText = message;
        },
      ).then((controls) => {
        cameraControls = controls;
        stopButton.disabled = !controls;

        if (!controls) {
          startButton.disabled = false;
        }
      });
    })
    .catch(() => {
      status.innerText = "Could not connect to the POS scanner service.";
      startButton.disabled = false;
    });
};

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", stopCamera);

document.getElementById("send-manual-barcode").addEventListener("click", () => {
  sendBarcode(manualInput.value);
});

manualInput.addEventListener("keydown", (event) => {
  if (event.key == "Enter") {
    event.preventDefault();
    sendBarcode(manualInput.value);
  }
});

window.addEventListener("pagehide", stopCamera);

const pairingCodeFromUrl = new URLSearchParams(window.location.search).get("code") || "";

if (/^\d{8}$/.test(pairingCodeFromUrl)) {
  pairingInput.value = pairingCodeFromUrl;
  status.innerText = "Pairing code loaded from the QR code. Tap Connect and Start Camera.";
}

if (!window.isSecureContext) {
  status.innerText = "Camera access needs HTTPS. You can still send barcodes manually on this connection.";
}
