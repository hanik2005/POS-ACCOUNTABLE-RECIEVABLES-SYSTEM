import { baseAPI } from "./config.js";
import { state } from "./state.js";
import { formatCurrency, toCents, isCashMethod, moveIndex } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";
import { getTotalSales, getTotalQty, resetSale } from "./cart.js";
import { openCustomerDialog } from "./customer.js";
import { refreshShift } from "./shift.js";
import { prepareInvoice, openPrintDialog } from "./invoice.js";

const showCreditLimitDialog = (message) => {
  openDialog("Credit limit reached", `<p class="dialog-text">${message}</p>`, "Enter = pay now · Esc = return to sale", (e) => {
    if (e.key == "Enter") {
      e.preventDefault();
      closeDialog();
      openPayDialog();
    } else if (e.key == "Escape") {
      e.preventDefault();
      closeDialog();
    }
  });
};

export const startCheckout = () => {
  if (state.details.length == 0) {
    return;
  }

  if (!state.customer) {
    openCustomerDialog(() => openCheckoutDialog());
    return;
  }

  openCheckoutDialog();
};

export const openCheckoutDialog = () => {
  const customer = state.customer;
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
    "Enter = charge to Accounts Receivable · F9 = pay now · Esc = back",
    (e) => {
      if (e.key == "Escape") {
        e.preventDefault();
        closeDialog();
      } else if (e.key == "Enter") {
        e.preventDefault();

        if (toCents(getTotalSales()) > availableCredit) {
          showCreditLimitDialog(`This sale exceeds the customer's available credit of ${formatCurrency(availableCredit / 100)}. Pay the required amount now or cancel the sale.`);
          return;
        }

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

export const openPayDialog = () => {
  const paymentMethods = state.paymentMethods;

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
    const floatLeft = parseFloat(state.shift.float_left);

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
     <div class="side-row"><span>Customer</span><span>${state.customer.customerName}</span></div>
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
        const customer = state.customers.find((item) => item.customer_id == state.customer.customerId);
        const availableCredit = Math.max(
          toCents(customer ? customer.credit_limit : 0) - toCents(customer ? customer.outstanding_balance : 0),
          0,
        );

        if (toCents(total) - toCents(applied) > availableCredit) {
          document.getElementById("pay-message").innerText = `Pay at least ${formatCurrency((toCents(total) - availableCredit) / 100)} to stay within the customer's credit limit.`;
          return;
        }

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

  const header = {
    customerId: state.customer ? state.customer.customerId : "",
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
    const text = `${state.customer ? state.customer.customerName : ""} - ${formatCurrency(total)}`;
    const change = payment ? Math.max(toCents(payment.amountTendered) - toCents(total), 0) / 100 : 0;
    const balance = payment ? Math.max(toCents(total) - toCents(payment.amountApplied), 0) / 100 : total;
    const customerTerms = state.customers.find((item) => item.customer_id == state.customer?.customerId);

    if (customerTerms) {
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
