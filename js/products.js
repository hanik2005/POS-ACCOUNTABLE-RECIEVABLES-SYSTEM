import { viewProduct } from "./module/product/view.js";
import { updateProduct } from "./module/product/update.js";
import { deleteProduct } from "./module/product/delete.js";
import { paginate, createPagination } from "./module/pagination.js";
import { baseAPI, functionalAPI } from "./config.js";
import { formatCurrency } from "./module/number_format.js";
import { startBarcodeCamera } from "./module/barcode_camera.js";


sessionStorage.setItem("baseAPI", baseAPI);

let products = [];
let units = [];
let categories = [];
let currentPage = 1;
let barcodeCameraControls = null;
let phoneBarcodePairingCode = "";
let phoneBarcodePollTimer = null;
let phoneBarcodePollActive = false;
let phoneBarcodeRequestId = 0;

document.addEventListener("DOMContentLoaded", () => {
  displayProducts();
  loadProductOptions();

  document.getElementById("submitBtn").addEventListener("click", () => {
    insertProduct();
  });

  document.getElementById("scanBarcodeButton").addEventListener("click", () => {
    openBarcodeCamera();
  });

  document.getElementById("phoneBarcodeButton").addEventListener("click", () => {
    openPhoneBarcodeScanner();
  });

  document.getElementById("stopBarcodeCamera").addEventListener("click", () => {
    stopBarcodeCamera();
  });

  document.getElementById("stopPhoneBarcodeButton").addEventListener("click", () => {
    stopPhoneBarcodeScanner();
    document.getElementById("phoneBarcodeStatus").innerText = "Phone scanner stopped.";
  });

  document.getElementById("productModal").addEventListener("hidden.bs.modal", () => {
    stopBarcodeCamera();
    stopPhoneBarcodeScanner();
    document.getElementById("barcodeCameraPanel").classList.add("d-none");
    document.getElementById("phoneBarcodePanel").classList.add("d-none");
  });

  document.getElementById("searchProduct").addEventListener("input", function () {
    const searchValue = this.value.toLowerCase();

    const filtered = products.filter(
      (product) =>
        product.product_name.toLowerCase().includes(searchValue) ||
        product.barcode.toLowerCase().includes(searchValue) ||
        product.unit_price.toLowerCase().includes(searchValue) ||
        (product.unit_name || "").toLowerCase().includes(searchValue) ||
        (product.category_name || "").toLowerCase().includes(searchValue) ||
        product.status.toLowerCase().includes(searchValue),
    );

    currentPage = 1;

    displayProductsTable(filtered);
  });
});

const openBarcodeCamera = () => {
  stopBarcodeCamera();
  stopPhoneBarcodeScanner();

  const panel = document.getElementById("barcodeCameraPanel");
  const status = document.getElementById("barcodeCameraStatus");
  let barcodeFound = false;

  panel.classList.remove("d-none");
  status.innerText = "Starting camera...";

  startBarcodeCamera(
    document.getElementById("barcodeCameraPreview"),
    (barcode) => {
      barcodeFound = true;
      document.getElementById("barcodeInput").value = barcode;
      status.innerText = `Scanned barcode: ${barcode}`;
      stopBarcodeCamera();
    },
    (message) => {
      status.innerText = message;
    },
    (message) => {
      status.innerText = message;
    },
  ).then((controls) => {
    barcodeCameraControls = controls;

    if (barcodeFound && controls) {
      stopBarcodeCamera();
    }
  });
};

const postPhoneBarcodeRequest = (operation, data = {}) => {
  const formData = new FormData();
  formData.append("operation", operation);
  formData.append("json", JSON.stringify(data));

  return axios.post(`${functionalAPI}/barcode_scanner.php`, formData);
};

const setPhoneBarcodeButton = (label) => {
  document.getElementById("phoneBarcodeButton").innerText = label;
};

const stopPhoneBarcodeScanner = () => {
  phoneBarcodeRequestId += 1;

  if (phoneBarcodePollTimer) {
    clearInterval(phoneBarcodePollTimer);
    phoneBarcodePollTimer = null;
  }

  const pairingCode = phoneBarcodePairingCode;
  phoneBarcodePairingCode = "";

  if (pairingCode != "") {
    postPhoneBarcodeRequest("closeSession", { pairingCode }).catch(() => {});
  }

  setPhoneBarcodeButton("Scan with Phone");
};

const receivePhoneBarcode = () => {
  const pairingCode = phoneBarcodePairingCode;

  if (pairingCode == "" || phoneBarcodePollActive) {
    return;
  }

  phoneBarcodePollActive = true;

  axios
    .get(`${functionalAPI}/barcode_scanner.php`, {
      params: {
        operation: "getScans",
        json: JSON.stringify({ pairingCode }),
      },
    })
    .then((response) => {
      if (phoneBarcodePairingCode != pairingCode) {
        return;
      }

      if (!response.data.success) {
        document.getElementById("phoneBarcodeStatus").innerText =
          response.data.message || "Phone scanner session ended.";
        stopPhoneBarcodeScanner();
        return;
      }

      if (response.data.paired) {
        document.getElementById("phoneBarcodeStatus").innerText =
          "Phone connected. Point it at the product barcode.";
      }

      if (response.data.scans.length == 0) {
        return;
      }

      const barcode = String(response.data.scans[0].barcode || "").trim();

      if (barcode == "") {
        return;
      }

      document.getElementById("barcodeInput").value = barcode;
      document.getElementById("phoneBarcodeStatus").innerText =
        `Barcode captured: ${barcode}. Continue filling in the product details.`;
      stopPhoneBarcodeScanner();
    })
    .catch(() => {
      if (phoneBarcodePairingCode == pairingCode) {
        document.getElementById("phoneBarcodeStatus").innerText =
          "Connection interrupted. Reconnecting to the phone...";
      }
    })
    .finally(() => {
      phoneBarcodePollActive = false;
    });
};

const openPhoneBarcodeScanner = () => {
  if (phoneBarcodePairingCode != "") {
    stopPhoneBarcodeScanner();
    document.getElementById("phoneBarcodeStatus").innerText = "Phone scanner stopped.";
    return;
  }

  stopBarcodeCamera();
  document.getElementById("barcodeCameraPanel").classList.add("d-none");
  document.getElementById("phoneBarcodePanel").classList.remove("d-none");
  document.getElementById("phoneBarcodeStatus").innerText = "Creating a pairing code...";
  const requestId = ++phoneBarcodeRequestId;

  postPhoneBarcodeRequest("createSession")
    .then((response) => {
      if (requestId != phoneBarcodeRequestId) {
        if (response.data.success) {
          postPhoneBarcodeRequest("closeSession", {
            pairingCode: response.data.pairingCode,
          }).catch(() => {});
        }

        return;
      }

      if (!response.data.success) {
        document.getElementById("phoneBarcodeStatus").innerText =
          response.data.message || "Could not start the phone scanner.";
        return;
      }

      phoneBarcodePairingCode = response.data.pairingCode;
      document.getElementById("phoneBarcodeCode").innerText = phoneBarcodePairingCode;
      document.getElementById("phoneBarcodeStatus").innerText =
        "Waiting for the phone scanner...";

      const scannerUrl = new URL("../interface/Cashier/barcode_scanner.html", import.meta.url);
      const scannerHost = scannerUrl.hostname.toLowerCase().replace("[", "").replace("]", "");

      if (["localhost", "127.0.0.1", "::1"].includes(scannerHost)) {
        scannerUrl.hostname = "PC-LAN-IP";
      }

      const scannerLink = document.getElementById("phoneBarcodeLink");
      scannerLink.href = scannerUrl.href;
      scannerLink.innerText = scannerUrl.href;

      setPhoneBarcodeButton("Stop Phone Scanner");
      phoneBarcodePollTimer = setInterval(receivePhoneBarcode, 1000);
      receivePhoneBarcode();
    })
    .catch(() => {
      if (requestId == phoneBarcodeRequestId) {
        document.getElementById("phoneBarcodeStatus").innerText =
          "Could not connect to the barcode scanner service.";
      }
    });
};

const stopBarcodeCamera = () => {
  if (barcodeCameraControls) {
    barcodeCameraControls.stop();
    barcodeCameraControls = null;
  }

  document.getElementById("barcodeCameraPreview").srcObject = null;
};

const displayProducts = async () => {
  const response = await axios.get(`${baseAPI}/products.php`, {
    params: {
      operation: "getAllProducts",
    },
  });

  if (response.status == 200) {
    console.log(response.data);

    products = response.data;

    displayProductsTable(response.data);
  } else {
    Swal.fire("ERROR");
  }
};

const displayProductsTable = (products) => {
  const main = document.getElementById("main-div");

  main.innerHTML = "";

  const { rows, current } = paginate(products, currentPage);

  currentPage = current;

  const table = document.createElement("table");

  table.classList.add("table", "table-hover", "table-striped", "table-sm");

  const tHead = document.createElement("thead");

  tHead.innerHTML = `
    <tr>
      <th>Barcode</th>
      <th>Product Name</th>
      <th>Description</th>
      <th>Unit Price</th>
      <th>Unit</th>
      <th>Category</th>
      <th>Status</th>
      <th>Action</th>
    </tr>
  `;

  table.appendChild(tHead);

  const tBody = document.createElement("tbody");

  rows.forEach((product) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${product.barcode}</td>
      <td>${product.product_name}</td>
      <td>${product.description}</td>
      <td>${formatCurrency(parseFloat(product.unit_price))}</td>
      <td>${product.unit_name || ""}</td>
      <td>${product.category_name || ""}</td>
      <td>${product.status}</td>
      <td>
        <button type="button" class="btn btn-primary btn-sm btn-view">
          VIEW
        </button>

        <button type="button" class="btn btn-success btn-sm btn-update">
          UPDATE
        </button>

        <button type="button" class="btn btn-danger btn-sm btn-delete">
          DEACTIVATE
        </button>
      </td>
    `;

    tBody.appendChild(tr);

    tr.querySelector(".btn-view").addEventListener("click", () => {
      viewProduct(product.product_id);
    });

    tr.querySelector(".btn-update").addEventListener("click", () => {
      updateProduct(product.product_id, displayProducts);
    });

    tr.querySelector(".btn-delete").addEventListener("click", () => {
      deleteProduct(product.product_id, displayProducts);
    });
  });

  table.appendChild(tBody);

  main.appendChild(table);

  main.appendChild(
    createPagination(products.length, currentPage, (page) => {
      currentPage = page;

      displayProductsTable(products);
    }),
  );
};

const insertProduct = async () => {
  const jsonData = {
    product: {
      barcode: document.getElementById("barcodeInput").value,
      productName: document.getElementById("productNameInput").value,
      description: document.getElementById("descriptionInput").value,
      unitPrice: document.getElementById("unitPriceInput").value,
      unitId: document.getElementById("unitInput").value,
      categoryId: document.getElementById("categoryInput").value,
      status: "ACTIVE",
    },
  };

  const formData = new FormData();

  formData.append("operation", "insertProduct");

  formData.append("json", JSON.stringify(jsonData));

  try {
    const response = await axios({
      url: `${baseAPI}/products.php`,
      method: "POST",
      data: formData,
    });

    console.log(response.data);

    if (response.data == 1) {
      displayProducts();

      const modalElement = document.getElementById("productModal");

      const modal = bootstrap.Modal.getInstance(modalElement);

      if (modal) {
        modal.hide();
      }

      document.getElementById("productForm").reset();

      Swal.fire("Product successfully saved!");
    } else {
      Swal.fire("ERROR: Product was not saved.");
    }
  } catch (error) {
    console.error(error);

    Swal.fire("ERROR: Unable to save product.");
  }
};

const loadProductOptions = async () => {
  const responses = await Promise.all([
    axios.get(`${baseAPI}/units.php`, { params: { operation: "getAllUnits" } }),
    axios.get(`${baseAPI}/product_categories.php`, { params: { operation: "getAllProductCategories" } }),
  ]);

  units = responses[0].data.filter((unit) => unit.status === "ACTIVE");
  categories = responses[1].data.filter((category) => category.status === "ACTIVE");

  document.getElementById("unitInput").innerHTML = `<option value="">Select unit</option>${units.map((unit) => `<option value="${unit.unit_id}">${unit.unit_name}</option>`).join("")}`;
  document.getElementById("categoryInput").innerHTML = `<option value="">Select category</option>${categories.map((category) => `<option value="${category.category_id}">${category.category_name}</option>`).join("")}`;
};
