import { baseAPI } from "./config.js";
import { toCents, printMoney, formatNumber, focusEntry } from "./utils.js";
import { openDialog, closeDialog, openMessageDialog } from "./dialog.js";

const VAT_RATE_PERCENT = 12;

const getVatBreakdown = (totalAmount) => {
  const totalCents = toCents(Number(totalAmount) || 0);
  const vatCents = Math.round(
    (totalCents * VAT_RATE_PERCENT) / (100 + VAT_RATE_PERCENT),
  );

  return {
    vatableSales: (totalCents - vatCents) / 100,
    vatAmount: vatCents / 100,
    totalSales: totalCents / 100,
  };
};

export const loadPdfLibrary = () => {
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

export const buildInvoicePdf = (jsPDF, data) => {
  const { sale, items, payments } = data;

  const paid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount_applied), 0);
  const tendered = payments.reduce((sum, payment) => sum + parseFloat(payment.amount_tendered), 0);
  const change = payments.reduce((sum, payment) => sum + parseFloat(payment.change_amount), 0);
  const balance = Math.max(toCents(parseFloat(sale.amount_due)) - toCents(paid), 0) / 100;
  const vat = getVatBreakdown(sale.amount_due);
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
      row(`${formatNumber(item.quantity, 0)} x ${printMoney(item.unit_price)}`, printMoney(item.line_total));
    });

    line();
    row("VATABLE SALES", printMoney(vat.vatableSales));
    row(`VAT (${VAT_RATE_PERCENT}%)`, printMoney(vat.vatAmount));
    row("TOTAL (VAT INCLUSIVE)", printMoney(vat.totalSales), 9, "bold");

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

export const saveInvoiceFile = async (invoiceNumber, blob) => {
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

export const prepareInvoice = async (salesId) => {
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

export const printPdf = (blob) => {
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

export const openPrintDialog = async (invoice) => {
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
