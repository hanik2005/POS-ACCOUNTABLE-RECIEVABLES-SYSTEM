export const addPrintSummaryTables = () => {
  document.querySelectorAll(".report-summary-cards").forEach((container) => {
    if (container.nextElementSibling?.classList.contains("report-print-summary")) {
      return;
    }

    const rows = [...container.querySelectorAll(".card")].map((card) => {
      const label = card.querySelector("small, .small")?.textContent.trim() || "Summary";
      const value = card.querySelector("h4, h5, .fs-4")?.textContent.trim() || "-";

      return [label, value];
    });

    if (rows.length === 0) {
      return;
    }

    const table = document.createElement("table");
    table.classList.add("table", "table-sm", "report-print-summary");

    const head = document.createElement("thead");
    const headingRow = document.createElement("tr");
    ["Summary", "Value"].forEach((label) => {
      const cell = document.createElement("th");
      cell.textContent = label;
      headingRow.appendChild(cell);
    });
    head.appendChild(headingRow);

    const body = document.createElement("tbody");
    rows.forEach(([label, value]) => {
      const row = document.createElement("tr");
      const labelCell = document.createElement("th");
      const valueCell = document.createElement("td");

      labelCell.scope = "row";
      labelCell.textContent = label;
      valueCell.classList.add("text-end");
      valueCell.textContent = value;
      row.append(labelCell, valueCell);
      body.appendChild(row);
    });

    table.append(head, body);
    container.insertAdjacentElement("afterend", table);
  });
};

export const removePrintSummaryTables = () => {
  document.querySelectorAll(".report-print-summary").forEach((table) => table.remove());
};
