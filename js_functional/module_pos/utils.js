export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);
};

export const formatTime = (dateTime) => {
  return new Date(dateTime.replace(" ", "T")).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const printMoney = (amount) => {
  const number = new Intl.NumberFormat("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(parseFloat(amount));

  return `PHP ${number}`;
};

export const toCents = (amount) => Math.round(amount * 100);

export const isCashMethod = (method) => method.method_name.toUpperCase() == "CASH";

export const entry = () => document.getElementById("entry");

export const focusEntry = () => {
  entry().focus();
};

export const focusDialogInput = () => {
  const input = document.getElementById("dialog-input");
  input.focus();
  input.select();
};

export const showStatus = (text) => {
  document.getElementById("entry-message").innerText = text;
};

export const moveIndex = (e, index, length) => {
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