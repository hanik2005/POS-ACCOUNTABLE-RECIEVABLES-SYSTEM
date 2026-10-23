import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { formatCurrency, toCents, isCashMethod, moveIndex } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";
import { getTotalSales, getTotalQty, resetSale, displayCustomer } from "./cart.js";
import { openCustomerDialog } from "./customer.js";
import { refreshShift } from "./shift.js";
import { prepareInvoice, openPrintDialog } from "./invoice.js";

const showCreditLimitDialog = (message) => {
  openMessageDialog("Credit limit reached", message);
};

export const startWalkInCheckout = () => {
  if (state.details.length == 0) {
    return;
  }

  state.saleType = "WALK_IN";
  state.customer = null;
  displayCustomer();
  openPayDialog();
};

export const startArCheckout = () => {
  if (state.details.length == 0) {
    return;
  }

  state.saleType = "AR";

  if (!state.customer) {
    openCustomerDialog(openCheckoutDialog, () => {
      state.saleType = null;
    });
    return;
  }

  openCheckoutDialog();
};

export const openCheckoutDialog = () => {
  const customer = state.customer;

  if (!customer) {
    openCustomerDialog(openCheckoutDialog);
    return;
  }

  state.saleType = "AR";
  const terms = state.customers.find((item) => item.customer_id == customer.customerId);
  const creditLimit = terms ? toCents(terms.credit_limit) : 0;
  const outstandingBalance = terms ? toCents(terms.outstanding_balance) : 0;
  const availableCredit = Math.max(creditLimit - outstandingBalance, 0);

  openDialog(
    "Checkout - Accounts Receivable",
    `<div class="pay-total">${formatCurrency(getTotalSales())}</div>
     <div class="side-row"><span>Customer</span><span>${customer.customerName}</span></div>
     <div class="side-row"><span>Terms</span><span>${terms ? terms.days_name : "-"}</span></div>
     <div class="side-row"><span>Outstanding / limit</span><span>${formatCurrency(outstandingBalance / 100)} / ${formatCurrency(creditLimit / 100)}</span></div>
     <div class="side-row"><span>Available credit</span><span>${formatCurrency(availableCredit / 100)}</span></div>
     <div class="side-row"><span>Items</span><span>${getTotalQty()}</span></div>`,
    "Enter = charge to Accounts Receivable · Esc = back",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();

        if (toCents(getTotalSales()) > availableCredit) {
          showCreditLimitDialog(
            `This sale exceeds the customer's available credit of ${formatCurrency(availableCredit / 100)}. Adjust the sale or ask the admin to increase the credit limit.`,
          );
          return;
        }

        closeDialog();
        saveSale("COMPLETED");
      }
    },
  );
};

export const openPayDialog = () => {
  const paymentMethods = state.paymentMethods;
  const isWalkIn = state.saleType == "WALK_IN";

  if (!isWalkIn) {
    openMessageDialog(
      "Accounts Receivable",
      "AR sales are charged to the customer's account. Choose a walk-in sale to accept payment now.",
    );
    return;
  }

  if (paymentMethods.length == 0) {
    openMessageDialog("Pay now", "There is no payment method. Please ask the admin to add one.");
    return;
  }

  const total = getTotalSales();
  let index = Math.max(paymentMethods.findIndex(isCashMethod), 0);

  // A blank amount on a non-cash method means "pay in full".
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
    const floatLeft = state.shift ? parseFloat(state.shift.float_left) : 0;
    const floatAfterPayment = floatLeft + (cash ? applied : 0);

    document.getElementById("dialog-list").innerHTML = paymentMethods
      .map((method, i) => `<div class="list-row ${i == index ? "active" : ""}"><span>${method.method_name}</span></div>`)
      .join("");

    document.getElementById("dialog-input").placeholder = cash
      ? "Cash received"
      : "Amount paid (blank = full total)";
    document.getElementById("pay-reference").classList.toggle("d-none", cash);
    document.getElementById("pay-balance").innerText = formatCurrency(balance);
    document.getElementById("pay-change").innerText = formatCurrency(change);
    document.getElementById("pay-float").innerText = formatCurrency(floatAfterPayment);
    document.getElementById("pay-message").innerText = "";
  };

  const focusPayInput = () => {
    document.getElementById("dialog-input").focus();
  };

  openDialog(
    "Pay now",
    `<div class="pay-total">${formatCurrency(total)}</div>
     <div class="side-row"><span>Customer</span><span>Walk-in customer</span></div>
     <div id="dialog-list" class="mt-2"></div>
     <input id="dialog-input" type="number" step="0.01" min="0" class="pos-input mt-2" autocomplete="off">
     <input id="pay-reference" type="text" class="pos-input mt-2 d-none" placeholder="Reference number (optional)" autocomplete="off">
     <div class="side-row"><span>Balance due</span><span id="pay-balance">${formatCurrency(total)}</span></div>
     <div class="side-row"><span>Change</span><span id="pay-change">${formatCurrency(0)}</span></div>
     <div class="side-row"><span>Drawer after sale</span><span id="pay-float">${formatCurrency(0)}</span></div>
     <p class="dialog-text" id="pay-message"></p>`,
    "Arrow keys = payment method | Enter = pay in full | Esc = cancel",
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

        if (toCents(received) < toCents(total)) {
          document.getElementById("pay-message").innerText = "Walk-in sales must be paid in full. Choose Accounts Receivable for partial or unpaid sales.";
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

export const saveSale = async (status, payment) => {
  if (!state.shift) {
    openMessageDialog("ERROR", "The shift was not started.");
    return;
  }

  if (state.details.length == 0) {
    openMessageDialog("Cannot save sale", "Add at least one product before holding or completing a sale.");
    return;
  }

  const invalidItem = state.details.some((item) => {
    const qty = Number(item.qty);
    const priceCents = toCents(Number(item.productPrice));
    const amountCents = toCents(Number(item.amount));

    return !Number.isInteger(qty) || qty < 1
      || !Number.isFinite(priceCents) || priceCents < 0
      || !Number.isFinite(amountCents) || amountCents < 0
      || amountCents !== priceCents * qty;
  });
  const detailTotal = state.details.reduce((sum, item) => {
    return sum + toCents(Number(item.amount));
  }, 0);

  if (invalidItem || detailTotal !== toCents(getTotalSales())) {
    openMessageDialog("Invalid sale items", "Check the item quantities and amounts before saving this sale.");
    return;
  }

  const header = {
    customerId: state.saleType == "WALK_IN" ? null : state.customer ? state.customer.customerId : null,
    saleType: state.saleType,
    status: status,
    recallId: state.recallId,
    amount: getTotalSales(),
    payment: payment || null,
  };

  const jsonData = { header: header, details: state.details };

  const formData = new FormData();
  formData.append("operation", "insertSale");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseAPI}/sales.php`,
    method: "POST",
    data: formData,
  });

  if (response.data && response.data.success === false) {
    showCreditLimitDialog(response.data.message);
  } else if ((typeof response.data == "number" ? response.data : parseInt(response.data, 10)) > 0) {
    const total = getTotalSales();
    const text = `${state.customer ? state.customer.customerName : "Walk-in customer"} - ${formatCurrency(total)}`;
    const change = payment ? Math.max(toCents(payment.amountTendered) - toCents(total), 0) / 100 : 0;
    const balance = payment ? Math.max(toCents(total) - toCents(payment.amountApplied), 0) / 100 : total;
    const customerTerms = state.customers.find((item) => item.customer_id == state.customer?.customerId);

    if (customerTerms && status == "COMPLETED") {
      customerTerms.outstanding_balance = Number(customerTerms.outstanding_balance) + balance;
      customerTerms.available_credit = Math.max(Number(customerTerms.credit_limit) - customerTerms.outstanding_balance, 0);
    }

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
