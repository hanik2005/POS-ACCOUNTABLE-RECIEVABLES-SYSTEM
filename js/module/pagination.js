import { formatNumber } from "./number_format.js";

export const pageSize = 10;

export const paginate = (items, page) => {
  const lastPage = Math.max(Math.ceil(items.length / pageSize), 1);
  const current = Math.min(Math.max(page, 1), lastPage);
  const start = (current - 1) * pageSize;

  return {
    rows: items.slice(start, start + pageSize),
    current: current,
  };
};

export const createPagination = (total, current, onChange) => {
  const lastPage = Math.max(Math.ceil(total / pageSize), 1);
  const from = total == 0 ? 0 : (current - 1) * pageSize + 1;
  const to = Math.min(current * pageSize, total);

  const wrapper = document.createElement("div");

  wrapper.classList.add(
    "d-flex",
    "justify-content-between",
    "align-items-center",
    "mt-3",
  );

  const info = document.createElement("small");

  info.classList.add("text-muted", "pagination-summary");
  info.textContent = `Showing ${formatNumber(from, 0)} to ${formatNumber(to, 0)} of ${formatNumber(total, 0)}`;

  const nav = document.createElement("nav");
  const list = document.createElement("ul");

  list.classList.add("pagination", "pagination-sm", "mb-0");

  const addItem = (label, page, disabled, active) => {
    const item = document.createElement("li");

    item.classList.add("page-item");

    if (disabled) {
      item.classList.add("disabled");
    }

    if (active) {
      item.classList.add("active");
    }

    const button = document.createElement("button");

    button.type = "button";
    button.classList.add("page-link");
    button.textContent = label;

    if (!disabled) {
      button.addEventListener("click", () => {
        onChange(page);
      });
    }

    item.appendChild(button);
    list.appendChild(item);
  };

  addItem("Previous", current - 1, current == 1);

  let previous = 0;

  for (let page = 1; page <= lastPage; page++) {
    const show =
      lastPage <= 7 || page == 1 || page == lastPage || Math.abs(page - current) <= 1;

    if (show) {
      if (page - previous > 1) {
        addItem("...", 0, true);
      }

      addItem(formatNumber(page, 0), page, false, page == current);

      previous = page;
    }
  }

  addItem("Next", current + 1, current == lastPage);

  nav.appendChild(list);
  wrapper.appendChild(info);
  wrapper.appendChild(nav);

  return wrapper;
};
