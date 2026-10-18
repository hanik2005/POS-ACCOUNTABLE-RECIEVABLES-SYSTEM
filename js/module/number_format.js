export const formatNumber = (value, maximumFractionDigits = 2) => {
  const number = Number(value);

  return new Intl.NumberFormat("en-PH", {
    maximumFractionDigits: maximumFractionDigits,
  }).format(Number.isFinite(number) ? number : 0);
};

export const formatCurrency = (value) => {
  const number = Number(value);

  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number.isFinite(number) ? number : 0);
};
