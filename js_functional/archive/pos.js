const baseUrl = "http://localhost/POS_AR_SYSTEM";
const baseAPI = `${baseUrl}/api_functional`;
const sessionAPI = `${baseUrl}/api/session.php`;
const shiftReportPage = "shift_report.html";
const invoicePage = "invoice.html";

sessionStorage.setItem("baseAPI", baseAPI);

let products = [];
let customers = [];
let paymentMethods = [];
let details = [];
let customer = null;
let recallId = null;
let terminal = null;
let shift = null;
let selected = -1;
let suggestions = [];
let suggestIndex = 0;
let dialog = null;

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

const formatTime = (dateTime) => {
  return new Date(dateTime.replace(" ", "T")).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const entry = () => document.getElementById("entry");

const focusEntry = () => {
  entry().focus();
};

const focusDialogInput = () => {
  const input = document.getElementById("dialog-input");
  input.focus();
  input.select();
};

const goFullScreen = async () => {
  if (document.fullscreenElement || !document.documentElement.requestFullscreen) {
    return;
  }

  try {
    await document.documentElement.requestFullscreen();

    if (navigator.keyboard && navigator.keyboard.lock) {
      await navigator.keyboard.lock(["Escape"]);
    }
  } catch (error) {}
};

const enterFullScreen = (e) => {
  if (e.type == "keydown" && (e.key == "Escape" || e.key == "F11")) {
    return;
  }

  document.removeEventListener("keydown", enterFullScreen);
  document.removeEventListener("click", enterFullScreen);

  goFullScreen();
};

const onPageLoad = async () => {
  displayCart();
  displayCustomer();

  await loadPosOptions();
  await loadPosSession();
};

const loadPosOptions = async () => {
  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: { operation: "getPosOptions" },
  });

  if (response.status == 200) {
    products = response.data.products;
    customers = response.data.customers;
    paymentMethods = response.data.paymentMethods;
  } else {
    Swal.fire("Error!");
  }
};

const displayFloat = () => {
  const pending = shift ? parseInt(shift.pending_requests) : 0;

  document.getElementById("bar-float").innerText = shift
    ? `${formatCurrency(parseFloat(shift.float_left))}${pending > 0 ? ` (${pending} pending)` : ""}`
    : "-";
};

const refreshShift = async () => {
  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: { operation: "getPosSession" },
  });

  shift = response.data.shift;

  displayFloat();
};

const loadPosSession = async () => {
  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: { operation: "getPosSession" },
  });

  terminal = response.data.terminal;
  shift = response.data.shift;

  document.getElementById("bar-cashier").innerText = response.data.cashier;
  document.getElementById("bar-terminal").innerText = terminal ? terminal.terminal_name : "NOT ASSIGNED";
  document.getElementById("bar-shift").innerText = shift ? `Open since ${formatTime(shift.opened_at)}` : "Not started";

  displayFloat();

  if (!terminal) {
    openDialog(
      "No terminal assigned",
      `<p class="dialog-text">This cashier has no terminal. Please ask the admin to assign one.</p>`,
      "",
      () => {},
    );
  } else if (!shift) {
    openStartShiftDialog();
  } else {
    focusEntry();
  }
};

const openDialog = (title, bodyHtml, hint, onKey) => {
  entry().blur();

  document.getElementById("dialog-title").innerText = title;
  document.getElementById("dialog-body").innerHTML = bodyHtml;
  document.getElementById("dialog-hint").innerText = hint;
  document.getElementById("dialog").classList.remove("d-none");

  dialog = { onKey: onKey };
};

const closeDialog = () => {
  dialog = null;

  document.getElementById("dialog").classList.add("d-none");

  focusEntry();
};

const openMessageDialog = (title, text, after) => {
  openDialog(title, `<p class="dialog-text">${text}</p>`, "Press Enter to continue", (e) => {
    if (e.key == "Enter" || e.key == "Escape") {
      e.preventDefault();
      closeDialog();

      if (after) {
        after();
      }
    }
  });
};

const moveIndex = (e, index, length) => {
  if (e.key == "ArrowDown") {
    e.preventDefault();
    return Math.min(index + 1, length - 1);
  }

  if (e.key == "ArrowUp") {
    e.preventDefault();
    return Math.max(index - 1, 0);
  }

  return index;
};

const openStartShiftDialog = () => {
  openDialog(
    "Start shift",
    `<div class="pay-total">${formatCurrency(parseFloat(terminal.float_start))}</div>
     <div class="side-row"><span>Terminal</span><span>${terminal.terminal_name}</span></div>
     <div class="side-row"><span>Schedule</span><span>${terminal.schedule_name}</span></div>
     <p class="dialog-text">This is the float start (fund for change) of the terminal. Check that the cash drawer has it.</p>`,
    "Enter = start shift",
    (e) => {
      if (e.key == "Enter") {
        e.preventDefault();
        closeDialog();
        openShift();
      }
    },
  );
};

const openShift = async () => {
  const formData = new FormData();
  formData.append("operation", "openShift");
  formData.append("json", JSON.stringify({}));

  const response = await axios({
    url: `${baseAPI}/shift.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    await loadPosSession();
  } else {
    openMessageDialog("ERROR", "The shift was not started.", openStartShiftDialog);
  }
};

const openCloseShiftDialog = async () => {
  if (!shift) {
    openMessageDialog("Close shift", "There is no open shift yet.");
    return;
  }

  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: {
      operation: "getShiftReport",
      json: JSON.stringify({ shiftId: shift.shift_id }),
    },
  });

  const report = response.data[0];
  const gross = parseFloat(report.gross_sales);

  openDialog(
    "Close shift",
    `<table class="report-table">
        <tr><td>Cashier</td><td>${report.cashier}</td></tr>
        <tr><td>Terminal</td><td>${report.terminal_name}</td></tr>
        <tr><td>Schedule</td><td>${report.schedule_name}</td></tr>
        <tr><td>Opened</td><td>${formatTime(report.opened_at)}</td></tr>
        <tr><td>Transactions</td><td>${report.transactions}</td></tr>
        <tr><td>Sales</td><td>${formatCurrency(gross)}</td></tr>
        <tr class="expected"><td>Net sales</td><td>${formatCurrency(gross)}</td></tr>
        <tr><td>Float start</td><td>${formatCurrency(parseFloat(report.float_start))}</td></tr>
        <tr><td>Float adjust</td><td>${formatCurrency(parseFloat(report.float_adjust))}</td></tr>
        <tr><td>Change given</td><td>${formatCurrency(parseFloat(report.change_given))}</td></tr>
        <tr><td>Cash drop</td><td>${formatCurrency(parseFloat(report.cash_drop))}</td></tr>
      </table>
      <p class="dialog-text mt-2">Count the cash drawer after the cash drop. The closing cash is the float left for the next shift.</p>
      <input id="dialog-input" type="number" step="0.01" min="0" class="pos-input" placeholder="Closing cash (float left)" autocomplete="off">`,
    "Enter = close shift · Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();

        const closingCash = parseFloat(document.getElementById("dialog-input").value);

        if (closingCash >= 0) {
          closeShift(closingCash);
        } else {
          focusDialogInput();
        }
      }
    },
  );

  focusDialogInput();
};

const closeShift = async (closingCash) => {
  closeDialog();

  const jsonData = { shiftId: shift.shift_id, closingCash: closingCash };

  const formData = new FormData();
  formData.append("operation", "closeShift");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/shift.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    openMessageDialog("Shift closed", `Float left for the next shift: ${formatCurrency(closingCash)}`, () => {
      window.location.reload();
    });
  } else if (response.data == 2) {
    openMessageDialog("Float request pending", "Wait for the accountant to approve or reject the float adjust request first.");
  } else {
    openMessageDialog("ERROR", "The shift was not closed.");
  }
};

const drawerTypes = [
  { label: "Float adjust - request add", movementType: "FLOAT_ADJUST", sign: 1 },
  { label: "Float adjust - request remove", movementType: "FLOAT_ADJUST", sign: -1 },
  { label: "Cash drop", movementType: "CASH_DROP", sign: 1 },
];

const movementLabel = (item) => {
  if (item.movement_type == "CASH_DROP") {
    return "Cash drop";
  }

  return parseFloat(item.amount) > 0 ? "Float add" : "Float remove";
};

const openDrawerDialog = async () => {
  if (dialog) {
    return;
  }

  await refreshShift();

  if (dialog || !shift) {
    return;
  }

  const response = await axios.get(`${baseAPI}/shift.php`, {
    params: {
      operation: "getCashMovements",
      json: JSON.stringify({ shiftId: shift.shift_id }),
    },
  });

  let index = 0;

  const render = () => {
    document.getElementById("dialog-list").innerHTML = drawerTypes
      .map((type, i) => `<div class="list-row ${i == index ? "active" : ""}"><span>${type.label}</span></div>`)
      .join("");
  };

  openDialog(
    "Cash drawer",
    `<div class="side-row"><span>Float left</span><span>${formatCurrency(parseFloat(shift.float_left))}</span></div>
     <div id="dialog-list" class="mt-2"></div>
     <input id="dialog-input" type="number" step="0.01" min="0.01" class="pos-input mt-2" placeholder="Amount">
     <input id="dialog-reason" type="text" class="pos-input mt-2" placeholder="Reason (optional)" autocomplete="off">
     ${response.data
       .slice(0, 5)
       .map(
         (item) => `
           <div class="list-row">
             <span>${movementLabel(item)}</span>
             <span>${item.status}</span>
             <span>${formatCurrency(Math.abs(parseFloat(item.amount)))}</span>
           </div>
         `,
       )
       .join("")}`,
    "↑↓ select · Enter = next / save · Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "ArrowDown" || e.key == "ArrowUp") {
        index = moveIndex(e, index, drawerTypes.length);
        render();
      } else if (e.key == "Enter") {
        e.preventDefault();

        const amount = parseFloat(document.getElementById("dialog-input").value);

        if (!(amount > 0)) {
          focusDialogInput();
        } else if (document.activeElement.id == "dialog-input") {
          document.getElementById("dialog-reason").focus();
        } else {
          saveMovement(drawerTypes[index], amount, document.getElementById("dialog-reason").value);
        }
      }
    },
  );

  render();
  focusDialogInput();
};

const saveMovement = async (type, amount, reason) => {
  closeDialog();

  const jsonData = { shiftId: shift.shift_id, movementType: type.movementType, amount: amount * type.sign, reason: reason };

  const formData = new FormData();
  formData.append("operation", "saveCashMovement");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/shift.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1 && type.movementType == "FLOAT_ADJUST") {
    openMessageDialog("Float adjust requested", `${type.sign > 0 ? "Add" : "Remove"} ${formatCurrency(amount)}. Waiting for the accountant to approve.`);
  } else if (response.data == 1) {
    openMessageDialog("Cash dropped", formatCurrency(amount));
  } else {
    openMessageDialog("ERROR", "The cash movement was not saved.");
  }

  refreshShift();
};

const parseEntry = () => {
  const value = entry().value.trim();
  const match = value.match(/^(\d+)\s*\*\s*(.*)$/);

  if (match) {
    return { qty: parseInt(match[1]) || 1, text: match[2].trim() };
  }

  return { qty: 1, text: value };
};

const showStatus = (text) => {
  document.getElementById("entry-message").innerText = text;
};

const displaySuggestions = () => {
  const box = document.getElementById("suggest");
  const search = parseEntry().text.toLowerCase();

  if (search == "") {
    suggestions = [];
    box.innerHTML = "";
    return;
  }

  suggestions = products
    .filter((product) => product.product_name.toLowerCase().includes(search) || (product.barcode || "").toLowerCase().includes(search))
    .slice(0, 6);

  suggestIndex = Math.min(suggestIndex, Math.max(suggestions.length - 1, 0));

  box.innerHTML = suggestions
    .map(
      (product, i) => `
        <div class="suggest-item ${i == suggestIndex ? "active" : ""}">
          <span>${product.product_name}</span>
          <span>${formatCurrency(parseFloat(product.unit_price))}</span>
        </div>
      `,
    )
    .join("");
};

const addEntry = () => {
  const { qty, text } = parseEntry();

  let product = products.find((product) => product.barcode == text);

  if (!product) {
    product = suggestions[suggestIndex];
  }

  if (!product) {
    showStatus(`Product not found: ${text}`);
    return;
  }

  addToCart(product, qty);

  entry().value = "";
  suggestIndex = 0;
  displaySuggestions();
  showStatus("");
};

const addToCart = (product, qty) => {
  const price = parseFloat(product.unit_price);
  const index = details.findIndex((item) => item.productId == product.product_id);

  if (index >= 0) {
    details[index].qty += qty;
    details[index].amount = details[index].productPrice * details[index].qty;
    selected = index;
  } else {
    details.push({
      productId: product.product_id,
      productName: product.product_name,
      productPrice: price,
      qty: qty,
      amount: price * qty,
    });
    selected = details.length - 1;
  }

  document.getElementById("last-item").innerText = `${product.product_name}  x${qty}`;

  displayCart();
};

const moveSelected = (step) => {
  if (details.length == 0) {
    return;
  }

  selected = Math.min(Math.max(selected + step, 0), details.length - 1);

  displayCart();
};

const changeQty = (step) => {
  if (selected < 0 || selected >= details.length) {
    return;
  }

  const item = details[selected];

  item.qty = Math.max(item.qty + step, 1);
  item.amount = item.productPrice * item.qty;

  displayCart();
};

const voidLine = () => {
  if (selected < 0 || selected >= details.length) {
    return;
  }

  details.splice(selected, 1);

  selected = Math.min(selected, details.length - 1);

  displayCart();
};

const getTotalSales = () => {
  const totalSales = details.reduce((sum, item) => {
    return sum + item.amount;
  }, 0);

  return totalSales;
};

const getTotalQty = () => {
  return details.reduce((sum, item) => sum + item.qty, 0);
};

const displayCart = () => {
  const tbody = document.getElementById("cart-body");

  tbody.innerHTML = details
    .map(
      (item, i) => `
        <tr class="${i == selected ? "selected" : ""}">
          <td>${item.productName}</td>
          <td class="text-end">${formatCurrency(item.productPrice)}</td>
          <td class="text-end">${item.qty}</td>
          <td class="text-end">${formatCurrency(item.amount)}</td>
        </tr>
      `,
    )
    .join("");

  const row = tbody.querySelector(".selected");

  if (row) {
    row.scrollIntoView({ block: "nearest" });
  }

  document.getElementById("total").innerText = formatCurrency(getTotalSales());
  document.getElementById("count").innerText = getTotalQty();
};

const displayCustomer = () => {
  const name = customer ? customer.customerName : "-";

  document.getElementById("bar-customer").innerText = name;
  document.getElementById("side-customer").innerText = name;
};

const resetSale = () => {
  details = [];
  customer = null;
  recallId = null;
  selected = -1;

  document.getElementById("last-item").innerText = "-";

  displayCart();
  displayCustomer();
};

const openCustomerDialog = (after) => {
  let list = [];
  let index = 0;

  const render = () => {
    const search = document.getElementById("dialog-input").value.toLowerCase();

    list = customers.filter((item) => item.customer_name.toLowerCase().includes(search));

    index = Math.min(index, Math.max(list.length - 1, 0));

    document.getElementById("dialog-list").innerHTML =
      list.length == 0
        ? `<div class="list-row">No customer found.</div>`
        : list
            .map((item, i) => `<div class="list-row ${i == index ? "active" : ""}"><span>${item.customer_name}</span><span>${item.days_name}</span></div>`)
            .join("");
  };

  openDialog(
    "Customer",
    `<input id="dialog-input" type="text" class="pos-input" placeholder="Type the customer name" autocomplete="off">
     <div id="dialog-list"></div>`,
    "↑↓ select · Enter choose · Esc cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();

        const item = list[index];

        if (item) {
          customer = { customerId: item.customer_id, customerName: item.customer_name };

          displayCustomer();
          closeDialog();

          if (after) {
            after();
          }
        }
      } else {
        index = moveIndex(e, index, list.length);
        render();
      }
    },
  );

  document.getElementById("dialog-input").addEventListener("input", () => {
    index = 0;
    render();
  });

  render();
  focusDialogInput();
};

const startCheckout = () => {
  if (details.length == 0) {
    return;
  }

  if (!customer) {
    openCustomerDialog(() => openCheckoutDialog());
    return;
  }

  openCheckoutDialog();
};

const openCheckoutDialog = () => {
  const terms = customers.find((item) => item.customer_id == customer.customerId);

  openDialog(
    "Checkout - Accounts Receivable",
    `<div class="pay-total">${formatCurrency(getTotalSales())}</div>
     <div class="side-row"><span>Customer</span><span>${customer.customerName}</span></div>
     <div class="side-row"><span>Terms</span><span>${terms ? terms.days_name : "-"}</span></div>
     <div class="side-row"><span>Items</span><span>${getTotalQty()}</span></div>`,
    "Enter = charge to Accounts Receivable · F9 = pay now · Esc = back",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        closeDialog();
        saveSale("COMPLETED");
      } else if (e.key == "F9") {
        e.preventDefault();
        closeDialog();
        openPayDialog();
      }
    },
  );
};

const toCents = (amount) => Math.round(amount * 100);

const isCashMethod = (method) => method.method_name.toUpperCase() == "CASH";

const openPayDialog = () => {
  if (paymentMethods.length == 0) {
    openMessageDialog("Pay now", "There is no payment method. Please ask the admin to add one.");
    return;
  }

  const total = getTotalSales();
  let index = Math.max(paymentMethods.findIndex(isCashMethod), 0);

  // Amount the cashier typed. Blank on a non-cash method means "pay in full".
  const getReceived = () => {
    const cash = isCashMethod(paymentMethods[index]);
    const raw = parseFloat(document.getElementById("dialog-input").value);

    if (isNaN(raw)) {
      return cash ? 0 : total;
    }

    return raw;
  };

  const render = () => {
    const cash = isCashMethod(paymentMethods[index]);
    const received = getReceived();
    const applied = Math.min(toCents(received), toCents(total)) / 100;
    const balance = (toCents(total) - toCents(applied)) / 100;
    const change = cash && toCents(received) > toCents(total) ? (toCents(received) - toCents(total)) / 100 : 0;
    const floatLeft = parseFloat(shift.float_left);

    document.getElementById("dialog-list").innerHTML = paymentMethods
      .map((method, i) => `<div class="list-row ${i == index ? "active" : ""}"><span>${method.method_name}</span></div>`)
      .join("");

    document.getElementById("dialog-input").placeholder = cash
      ? "Amount received (less than total = partial)"
      : "Amount to pay (blank = full, less = partial)";
    document.getElementById("pay-reference").classList.toggle("d-none", cash);
    document.getElementById("pay-balance").innerText = formatCurrency(balance);
    document.getElementById("pay-change").innerText = formatCurrency(change);
    document.getElementById("pay-float").innerText = formatCurrency(floatLeft - change);
    document.getElementById("pay-message").innerText = change > floatLeft ? "Not enough float for this change." : "";
  };

  const focusPayInput = () => {
    document.getElementById("dialog-input").focus();
  };

  openDialog(
    "Pay now",
    `<div class="pay-total">${formatCurrency(total)}</div>
     <div class="side-row"><span>Customer</span><span>${customer.customerName}</span></div>
     <div id="dialog-list" class="mt-2"></div>
     <input id="dialog-input" type="number" step="0.01" min="0" class="pos-input mt-2" autocomplete="off">
     <input id="pay-reference" type="text" class="pos-input mt-2 d-none" placeholder="Reference number (optional)" autocomplete="off">
     <div class="side-row"><span>Balance to Accounts Receivable</span><span id="pay-balance">${formatCurrency(total)}</span></div>
     <div class="side-row"><span>Change</span><span id="pay-change">${formatCurrency(0)}</span></div>
     <div class="side-row"><span>Float left after change</span><span id="pay-float">${formatCurrency(0)}</span></div>
     <p class="dialog-text" id="pay-message"></p>`,
    "↑↓ payment method · Enter = pay (partial allowed) · Esc = cancel",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "ArrowDown" || e.key == "ArrowUp") {
        index = moveIndex(e, index, paymentMethods.length);
        render();
        focusPayInput();
      } else if (e.key == "Enter") {
        e.preventDefault();

        const method = paymentMethods[index];
        const cash = isCashMethod(method);
        const received = getReceived();
        const reference = document.getElementById("pay-reference").value;

        if (!(toCents(received) > 0)) {
          document.getElementById("pay-message").innerText = "Enter the amount received.";
          return;
        }

        if (!cash && toCents(received) > toCents(total)) {
          document.getElementById("pay-message").innerText = "A non-cash payment cannot be more than the total.";
          return;
        }

        const applied = Math.min(toCents(received), toCents(total)) / 100;

        closeDialog();
        saveSale("COMPLETED", {
          paymentMethodId: method.payment_method_id,
          amountTendered: received,
          amountApplied: applied,
          referenceNumber: reference,
        });
      }
    },
  );

  document.getElementById("dialog-input").addEventListener("input", render);

  render();
  focusPayInput();
};

const printMoney = (amount) => {
  const number = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount));

  return `PHP ${number}`;
};

const loadPdfLibrary = () => {
  return new Promise((resolve, reject) => {
    if (window.jspdf) {
      resolve(window.jspdf.jsPDF);
      return;
    }

    const script = document.createElement("script");

    script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    script.onload = () => resolve(window.jspdf.jsPDF);
    script.onerror = () => reject(new Error("The PDF library was not loaded."));

    document.head.appendChild(script);
  });
};

const buildInvoicePdf = (jsPDF, data) => {
  const { sale, items, payments } = data;

  const paid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount_applied), 0);
  const tendered = payments.reduce((sum, payment) => sum + parseFloat(payment.amount_tendered), 0);
  const change = payments.reduce((sum, payment) => sum + parseFloat(payment.change_amount), 0);
  const balance = Math.max(toCents(parseFloat(sale.amount_due)) - toCents(paid), 0) / 100;
  const title = balance > 0 ? "SALES INVOICE" : "SALES RECEIPT";

  const printed = new Date().toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const width = 80;
  const margin = 4;

  const draw = (doc) => {
    let y = 7;

    const setText = (size, style) => {
      doc.setFont("courier", style);
      doc.setFontSize(size);
    };

    const next = (size) => {
      y += size * 0.46;
    };

    const center = (value, size = 8, style = "normal") => {
      setText(size, style);
      doc.text(String(value), width / 2, y, { align: "center" });
      next(size);
    };

    const row = (left, right, size = 8, style = "normal") => {
      setText(size, style);
      doc.text(String(left), margin, y);
      doc.text(String(right), width - margin, y, { align: "right" });
      next(size);
    };

    const wrap = (value, size = 8, style = "normal") => {
      setText(size, style);

      doc.splitTextToSize(String(value), width - margin * 2).forEach((part) => {
        doc.text(part, margin, y);
        next(size);
      });
    };

    const line = () => {
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([0.8, 0.8], 0);
      doc.line(margin, y - 2.6, width - margin, y - 2.6);
      doc.setLineDashPattern([], 0);
      y += 1.5;
    };

    center("POS INC.", 10, "bold");
    center(title, 12, "bold");
    line();
    row("Invoice No.", sale.invoice_number);
    row("Date", sale.sales_date);
    row("Printed", printed);
    row("Cashier", sale.cashier || "-");
    row("Terminal", sale.terminal_name || "-");
    line();
    wrap(sale.customer_name, 8, "bold");

    if (sale.address) {
      wrap(sale.address, 7);
    }

    row("Terms", sale.days_name);
    row("Due Date", sale.due_date);
    line();

    items.forEach((item) => {
      wrap(item.product_name);
      row(`${item.quantity} x ${printMoney(item.unit_price)}`, printMoney(item.line_total));
    });

    line();
    row("TOTAL", printMoney(sale.amount_due), 9, "bold");

    payments.forEach((payment) => {
      row(`Paid - ${payment.method_name}`, printMoney(payment.amount_applied));

      if (payment.reference_number) {
        wrap(`Ref: ${payment.reference_number}`, 7);
      }
    });

    if (change > 0) {
      row("Cash received", printMoney(tendered));
      row("Change", printMoney(change));
    }

    row("BALANCE (AR)", printMoney(balance), 9, "bold");
    line();

    if (balance > 0) {
      y += 8;
      doc.line(margin + 6, y, width - margin - 6, y);
      y += 3.5;
      center("Customer signature", 7);
    } else {
      center("*** PAID ***", 9, "bold");
    }

    y += 1;
    center("Thank you!", 7);

    return y;
  };

  const measure = new jsPDF({ unit: "mm", format: [width, 1000] });
  const height = Math.max(draw(measure) + 6, 100);

  const doc = new jsPDF({ unit: "mm", format: [width, height] });
  draw(doc);

  return doc.output("blob");
};

const saveInvoiceFile = async (invoiceNumber, blob) => {
  const formData = new FormData();
  formData.append("operation", "saveInvoiceFile");
  formData.append("json", JSON.stringify({ invoiceNumber: invoiceNumber }));
  formData.append("file", blob, `${invoiceNumber}.pdf`);

  const response = await axios({
    url: `${baseAPI}/invoice_print.php`,
    method: "POST",
    data: formData,
  });

  return response.data == 1;
};

const prepareInvoice = async (salesId) => {
  try {
    const jsPDF = await loadPdfLibrary();

    const response = await axios.get(`${baseAPI}/invoice_print.php`, {
      params: {
        operation: "getInvoicePrint",
        json: JSON.stringify({ salesId: salesId }),
      },
    });

    if (response.data == 0) {
      return null;
    }

    const invoiceNumber = response.data.sale.invoice_number;
    const blob = buildInvoicePdf(jsPDF, response.data);
    const saved = await saveInvoiceFile(invoiceNumber, blob);

    return { invoiceNumber: invoiceNumber, blob: blob, saved: saved };
  } catch (error) {
    return null;
  }
};

const printPdf = (blob) => {
  const url = URL.createObjectURL(blob);
  const frame = document.createElement("iframe");

  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";

  frame.onload = () => {
    setTimeout(() => {
      frame.contentWindow.focus();
      frame.contentWindow.print();
      focusEntry();
    }, 500);

    setTimeout(() => {
      frame.remove();
      URL.revokeObjectURL(url);
    }, 60000);
  };

  frame.src = url;

  document.body.appendChild(frame);
};

const openPrintDialog = async (invoice) => {
  const pdf = await invoice;

  if (!pdf) {
    openMessageDialog("ERROR", "The invoice was not created.");
    return;
  }

  openDialog(
    "Print invoice",
    `<p class="dialog-text">${pdf.invoiceNumber} ${pdf.saved ? "was saved to the invoices folder." : "was not saved to the invoices folder."}</p>
     <p class="dialog-text">Do you want to print it?</p>`,
    "Enter = Yes · Esc = No",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        closeDialog();
        printPdf(pdf.blob);
      }
    },
  );
};

const saveSale = async (status, payment) => {
  if (!shift) {
    openMessageDialog("ERROR", "The shift was not started.");
    return;
  }

  const header = {
    customerId: customer ? customer.customerId : "",
    status: status,
    recallId: recallId,
    amount: getTotalSales(),
    payment: payment || null,
  };

  const jsonData = { header: header, details: details };

  const formData = new FormData();
  formData.append("operation", "insertSale");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/sales.php`,
    method: "POST",
    data: formData,
  });

  if (response.data > 0) {
    const total = getTotalSales();
    const text = `${customer ? customer.customerName : ""} - ${formatCurrency(total)}`;
    const change = payment ? Math.max(toCents(payment.amountTendered) - toCents(total), 0) / 100 : 0;
    const balance = payment ? Math.max(toCents(total) - toCents(payment.amountApplied), 0) / 100 : total;

    resetSale();

    let afterDialog = null;

    if (status == "COMPLETED") {
      const invoice = prepareInvoice(response.data);

      afterDialog = () => openPrintDialog(invoice);
    }

    if (status == "HOLD") {
      openMessageDialog("Sale on hold", "Press F8 to recall it when the customer comes back.");
    } else if (payment && balance > 0) {
      openMessageDialog(
        "Partial payment",
        `${text}<br>Paid ${formatCurrency(payment.amountApplied)} · Balance ${formatCurrency(balance)} posted to Accounts Receivable`,
        afterDialog,
      );
    } else if (payment) {
      openMessageDialog(change > 0 ? `Change ${formatCurrency(change)}` : "Paid", text, afterDialog);
    } else {
      openMessageDialog("Posted to Accounts Receivable", text, afterDialog);
    }

    refreshShift();
  } else {
    openMessageDialog("ERROR", "The sale was not saved.");
  }
};

const holdSale = () => {
  if (details.length == 0) {
    return;
  }

  saveSale("HOLD");
};

const openRecallDialog = async () => {
  if (details.length > 0) {
    openMessageDialog("Recall", "Finish or hold the current sale first.");
    return;
  }

  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: { operation: "getHeldSales" },
  });

  const held = response.data;
  let index = 0;

  if (held.length == 0) {
    openMessageDialog("Recall", "There are no held sales.");
    return;
  }

  const render = () => {
    document.getElementById("dialog-list").innerHTML = held
      .map(
        (sale, i) => `
          <div class="list-row ${i == index ? "active" : ""}">
            <span>${sale.customer_name || "No customer yet"}</span>
            <span>${sale.item_count} item(s)</span>
            <span>${formatCurrency(parseFloat(sale.total_amount))}</span>
          </div>
        `,
      )
      .join("");
  };

  openDialog("Held sales", `<div id="dialog-list"></div>`, "↑↓ select · Enter recall · Esc cancel", (e) => {
    if (e.key == "Escape") {
      e.preventDefault();
      closeDialog();
    } else if (e.key == "Enter") {
      e.preventDefault();
      recallSale(held[index]);
    } else {
      index = moveIndex(e, index, held.length);
      render();
    }
  });

  render();
};

const recallSale = async (held) => {
  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: {
      operation: "getHeldSale",
      json: JSON.stringify({ salesId: held.sales_id }),
    },
  });

  details = response.data.map((line) => ({
    productId: line.product_id,
    productName: line.product_name,
    productPrice: parseFloat(line.unit_price),
    qty: parseInt(line.quantity),
    amount: parseFloat(line.line_total),
  }));

  customer = held.customer_id ? { customerId: held.customer_id, customerName: held.customer_name } : null;
  recallId = held.sales_id;
  selected = details.length - 1;

  closeDialog();
  displayCart();
  displayCustomer();
};

const voidSale = async (salesId) => {
  const jsonData = { salesId: salesId };

  const formData = new FormData();
  formData.append("operation", "voidSale");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/sales.php`,
    method: "POST",
    data: formData,
  });

  return response.data;
};

const openVoidSaleDialog = () => {
  if (details.length == 0) {
    return;
  }

  openDialog(
    "Void sale",
    `<p class="dialog-text">Void this sale? ${getTotalQty()} item(s) - ${formatCurrency(getTotalSales())}</p>`,
    "Enter = Yes · Esc = No",
    async (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();
        closeDialog();

        if (recallId) {
          await voidSale(recallId);
        }

        resetSale();
      }
    },
  );
};

const leavePage = (action) => {
  if (details.length > 0) {
    openMessageDialog("Sale in progress", "Checkout, hold or void the current sale first.");
    return;
  }

  action();
};

const logout = async () => {
  const formData = new FormData();
  formData.append("operation", "logout");

  const response = await axios({
    url: sessionAPI,
    method: "POST",
    data: formData,
  });

  if (response.data.success) {
    window.location.href = `${baseUrl}/index.html`;
  } else {
    openMessageDialog("ERROR", "Unable to log out.");
  }
};

const openShiftReport = () => {
  window.location.href = shiftReportPage;
};

const openAccountsReceivable = () => {
  window.location.href = invoicePage;
};

document.addEventListener("keydown", (e) => {
  if (e.repeat && (["Enter", "Escape", "Delete"].includes(e.key) || /^F\d+$/.test(e.key))) {
    e.preventDefault();
    return;
  }

  if (e.key == "F1") {
    e.preventDefault();
    leavePage(openAccountsReceivable);
    return;
  }

  if (e.key == "F3") {
    e.preventDefault();
    leavePage(logout);
    return;
  }

  if (e.key == "F6") {
    e.preventDefault();
    leavePage(openShiftReport);
    return;
  }

  if (dialog) {
    dialog.onKey(e);
    return;
  }

  switch (e.key) {
    case "F2":
      e.preventDefault();
      openCustomerDialog();
      break;
    case "F4":
      e.preventDefault();
      holdSale();
      break;
    case "F7":
      e.preventDefault();
      openDrawerDialog();
      break;
    case "F8":
      e.preventDefault();
      openRecallDialog();
      break;
    case "F9":
      e.preventDefault();
      startCheckout();
      break;
    case "F10":
      e.preventDefault();
      openCloseShiftDialog();
      break;
    case "Escape":
      e.preventDefault();

      if (entry().value != "") {
        entry().value = "";
        suggestIndex = 0;
        displaySuggestions();
      } else {
        openVoidSaleDialog();
      }
      break;
    case "Delete":
      e.preventDefault();
      voidLine();
      break;
    case "ArrowDown":
    case "ArrowUp":
      e.preventDefault();

      if (suggestions.length > 0) {
        suggestIndex = e.key == "ArrowDown" ? Math.min(suggestIndex + 1, suggestions.length - 1) : Math.max(suggestIndex - 1, 0);
        displaySuggestions();
      } else {
        moveSelected(e.key == "ArrowDown" ? 1 : -1);
      }
      break;
    case "+":
    case "-":
      if (entry().value == "") {
        e.preventDefault();
        changeQty(e.key == "+" ? 1 : -1);
      }
      break;
    case "Enter":
      e.preventDefault();

      if (entry().value.trim() == "") {
        startCheckout();
      } else {
        addEntry();
      }
      break;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  entry().addEventListener("input", () => {
    suggestIndex = 0;
    showStatus("");
    displaySuggestions();
  });

  document.getElementById("btn-invoice").addEventListener("click", () => {
    leavePage(openAccountsReceivable);
  });

  document.getElementById("btn-drawer").addEventListener("click", () => {
    openDrawerDialog();
  });

  document.getElementById("btn-logout").addEventListener("click", () => {
    leavePage(logout);
  });

  document.getElementById("btn-report").addEventListener("click", () => {
    leavePage(openShiftReport);
  });

  document.addEventListener("click", () => {
    if (!dialog) {
      focusEntry();
    }
  });

  setInterval(refreshShift, 30000);

  goFullScreen();

  document.addEventListener("keydown", enterFullScreen);
  document.addEventListener("click", enterFullScreen);

  onPageLoad();
});
