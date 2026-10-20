import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { addToCart } from "./cart.js";
import { openDialog, closeDialog } from "./dialog.js";
import { showStatus } from "./utils.js";

let pairingCode = "";
let pollTimer = null;
let pairDialogOpen = false;

const setScannerButton = (label) => {
  const button = document.getElementById("btn-phone-scanner");

  if (button) {
    button.innerText = label;
  }
};

const escapeHtml = (value) => {
  return String(value || "").replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character];
  });
};

const postScannerRequest = (operation, data = {}) => {
  const formData = new FormData();
  formData.append("operation", operation);
  formData.append("json", JSON.stringify(data));

  return axios.post(`${baseAPI}/barcode_scanner.php`, formData);
};

const stopPhoneScanner = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  if (pairingCode != "") {
    postScannerRequest("closeSession", { pairingCode }).catch(() => {});
  }

  pairingCode = "";

  if (pairDialogOpen) {
    pairDialogOpen = false;
    closeDialog();
  }

  setScannerButton("Phone Scanner");
};

const closePairDialog = () => {
  if (!pairDialogOpen) {
    return;
  }

  pairDialogOpen = false;
  closeDialog();
  showStatus("Phone scanner connected. Continue using the POS.");
};

const updateScannerStatus = (text) => {
  const status = document.getElementById("phone-scanner-status");

  if (status) {
    status.innerText = text;
  }
};

const normalizeNumericBarcode = (barcode) => {
  const value = String(barcode || "").trim();

  if (!/^\d+$/.test(value)) {
    return "";
  }

  return value.replace(/^0+(?=\d)/, "");
};

const findProductByBarcode = (barcode) => {
  const value = String(barcode || "").trim();
  const exactMatch = state.products.find((item) => String(item.barcode || "").trim() == value);

  if (exactMatch) {
    return exactMatch;
  }

  const normalized = normalizeNumericBarcode(value);

  if (normalized == "") {
    return null;
  }

  const matches = state.products.filter((item) => {
    return normalizeNumericBarcode(item.barcode) == normalized;
  });

  return matches.length == 1 ? matches[0] : null;
};

const receiveScans = () => {
  const activePairingCode = pairingCode;

  if (activePairingCode == "") {
    return;
  }

  axios
    .get(`${baseAPI}/barcode_scanner.php`, {
      params: {
        operation: "getScans",
        json: JSON.stringify({ pairingCode: activePairingCode }),
      },
    })
    .then((response) => {
      if (pairingCode != activePairingCode) {
        return;
      }

      if (!response.data.success) {
        updateScannerStatus(response.data.message || "Scanner session ended.");
        clearInterval(pollTimer);
        pollTimer = null;
        return;
      }

      if (response.data.paired) {
        closePairDialog();
      }

      response.data.scans.forEach((scan) => {
        const barcode = String(scan.barcode).trim();
        const product = findProductByBarcode(barcode);

        if (!product) {
          updateScannerStatus(`Barcode ${barcode} was not found in the product list.`);
          showStatus(`Unknown barcode: ${barcode}`);
          return;
        }

        addToCart(product, 1);
        showStatus(`Scanned ${product.product_name}`);
        updateScannerStatus(`Added ${product.product_name} (${barcode}) to the cart.`);
      });
    })
    .catch(() => {
      if (pairingCode == activePairingCode) {
        updateScannerStatus("Connection to the phone scanner was interrupted. Reconnecting...");
      }
    });
};

export const openPhoneScanner = () => {
  if (pairingCode != "") {
    stopPhoneScanner();
    showStatus("Phone scanner stopped.");
    return;
  }

  if (state.shift == null) {
    showStatus("Start your shift before pairing a phone scanner.");
    return;
  }

  postScannerRequest("createSession")
    .then((response) => {
      if (!response.data.success) {
        showStatus(response.data.message || "Could not start the phone scanner.");
        return;
      }

      pairingCode = response.data.pairingCode;
      setScannerButton("Stop Phone Scanner");
      const scannerUrl = new URL("../../interface/Cashier/barcode_scanner.html", import.meta.url);

      const scannerHost = scannerUrl.hostname.toLowerCase().replace(/^\[|\]$/g, "");

      if (["localhost", "127.0.0.1", "::1"].includes(scannerHost)) {
        scannerUrl.hostname = "PC-LAN-IP";
      }

      scannerUrl.searchParams.set("code", pairingCode);

      openDialog(
        "Phone Barcode Scanner",
        `
          <div class="dialog-text">
            <p>
              Scan this QR code with your phone to open the scanner. The pairing code will fill automatically.
            </p>
            <div
              id="phone-scanner-qr"
              class="phone-scanner-qr"
              role="img"
              aria-label="QR code for the phone barcode scanner"
            ></div>
            <p
              id="phone-scanner-qr-fallback"
              class="phone-scanner-qr-fallback d-none"
            ></p>
            <p>Pairing code fallback:</p>
            <div class="phone-scanner-pairing-code">${escapeHtml(pairingCode)}</div>
            <p id="phone-scanner-status">Waiting for phone scanner...</p>
            <button type="button" class="btn btn-secondary" id="stop-phone-scanner">Stop Scanner</button>
          </div>
        `,
        "Pairing code expires in 10 minutes | Esc stops scanner",
        (event) => {
          if (event.key == "Escape") {
            event.preventDefault();
            stopPhoneScanner();
          }
        },
      );

      pairDialogOpen = true;
      const qrContainer = document.getElementById("phone-scanner-qr");
      const qrFallback = document.getElementById("phone-scanner-qr-fallback");

      if (window.QRCode && scannerUrl.hostname != "PC-LAN-IP") {
        new window.QRCode(qrContainer, {
          text: scannerUrl.href,
          width: 220,
          height: 220,
          colorDark: "#111827",
          colorLight: "#ffffff",
          correctLevel: window.QRCode.CorrectLevel.M,
        });
      } else {
        qrFallback.classList.remove("d-none");
        qrFallback.innerText = scannerUrl.hostname == "PC-LAN-IP"
          ? `Replace PC-LAN-IP with this computer's local network address, then open: ${scannerUrl.href}`
          : `QR generator is unavailable. Open this page on your phone: ${scannerUrl.href}`;
      }

      document.getElementById("stop-phone-scanner").addEventListener("click", stopPhoneScanner);
      pollTimer = setInterval(receiveScans, 1000);
      receiveScans();
    })
    .catch(() => {
      setScannerButton("Phone Scanner");
      showStatus("Could not connect to the barcode scanner service.");
    });
};
