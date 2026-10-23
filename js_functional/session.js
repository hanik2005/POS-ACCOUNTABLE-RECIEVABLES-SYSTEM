import { baseUrl, baseAPI } from "../js/config.js";

const pages = [
  { file: "dashboard.html", title: "Dashboard", roles: ["ADMIN"] },
  { file: "products.html", title: "Products", roles: ["ADMIN"] },
  { file: "customers.html", title: "Customers", roles: ["ADMIN"] },
  { file: "group_days.html", title: "Group Days", roles: ["ADMIN"] },
  { file: "payment_methods.html", title: "Payment Methods", roles: ["ADMIN"] },
  { file: "pos_terminals.html", title: "POS Terminals", roles: ["ADMIN"] },
  { file: "roles.html", title: "Roles", roles: ["ADMIN"] },
  { file: "units.html", title: "Units", roles: ["ADMIN"] },
  { file: "product_categories.html", title: "Product Categories", roles: ["ADMIN"] },
  { file: "users.html", title: "Users", roles: ["ADMIN"] },
  { file: "pos.html", title: "POS", roles: ["CASHIER", "SUPERVISOR"], menu: true },
  { file: "invoice.html", title: "Accounts Receivable", roles: ["ACCOUNTING"], menu: true },
  { file: "sales_report.html", title: "Sales Report", roles: ["ADMIN", "ACCOUNTING"], menu: true },
  { file: "credit_limit_report.html", title: "Credit Limit Report", roles: ["ADMIN"], menu: true },
  {
    file: "shift_report.html",
    title: "Shift Report",
    roles: ["ADMIN", "ACCOUNTING", "CASHIER", "SUPERVISOR"],
    menu: true,
  },
  {
    file: "daily_report.html",
    title: "Daily Z-Report",
    roles: ["ADMIN", "ACCOUNTING", "SUPERVISOR"],
    menu: true,
  },
  { file: "terminal_assignment.html", title: "Terminal Assignment", roles: ["ADMIN"], menu: true },
];

const currentPage = window.location.pathname.split("/").pop();
const currentPath = window.location.pathname.toLowerCase();

const getPageHref = (file) => {
  if (["shift_report.html", "daily_report.html"].includes(file)) {
    if (currentPath.includes("/interface/accounting/")) {
      return `../Cashier/${file}`;
    }

    if (currentPath.includes("/interface/admin/functional/")) {
      return `../../Cashier/${file}`;
    }
  }

  if (currentPath.includes("/interface/cashier/")
    && ["invoice.html", "sales_report.html"].includes(file)) {
    return `../Accounting/${file}`;
  }

  return file;
};

document.documentElement.style.visibility = "hidden";

const checkSession = async () => {
  const response = await axios.get(`${baseAPI}/session.php`, {
    params: { operation: "getSession" },
  });

  if (response.status == 200 && response.data.success) {
    const user = response.data.user;

    displayHeader(user);

    if (!isAuthorized(user)) {
      displayNotAuthorized();
    }

    document.documentElement.style.visibility = "visible";
  } else {
    window.location.href = `${baseUrl}/index.html`;
  }
};

const isAuthorized = (user) => {
  const page = pages.find((page) => page.file == currentPage);
  const pagePath = window.location.pathname.toLowerCase();
  const isAdminFunctionalPage = pagePath.includes("/interface/admin/functional/");

  if (isAdminFunctionalPage && user.role_name.toUpperCase() != "ADMIN") {
    return false;
  }

  if (!page) {
    return true;
  }

  return page.roles.includes(user.role_name.toUpperCase());
};

const userBlockHtml = (hideLogout) => {
  const logoutButton = hideLogout
    ? ""
    : '<button type="button" class="btn btn-outline-light btn-sm" id="button-logout">LOGOUT</button>';

  return `
    <div class="d-flex align-items-center gap-2 text-white ms-lg-3 mt-2 mt-lg-0">
      <span id="header-user"></span>
      <span class="badge bg-light text-dark" id="header-role"></span>
      ${logoutButton}
    </div>
  `;
};

const displayHeader = (user) => {
  const role = user.role_name.toUpperCase();
  const navbar = document.getElementById("mainNavbar");
  const reportPages = [
    "shift_report.html",
    "daily_report.html",
    "sales_report.html",
    "cashier_report.html",
  ];
  const hideLogout = role == "CASHIER" && reportPages.includes(currentPage);
  const userBlock = userBlockHtml(hideLogout);

  if (!navbar && !document.getElementById("app-header")) {
    return;
  }

  if (navbar) {
    navbar.querySelectorAll("a.nav-link").forEach((link) => {
      let file = link.getAttribute("href").split("/").pop();

      if (file == "cashier_report.html") {
        link.href = getPageHref("shift_report.html");
        link.textContent = "Shift Report";
        file = "shift_report.html";
      }

      const page = pages.find((page) => page.file == file);

      link.classList.remove("active");

      if (page && !page.roles.includes(role)) {
        link.closest("li").remove();
      } else if (file == currentPage) {
        link.classList.add("active");
      }
    });

    const navbarContent = navbar.querySelector(".navbar-collapse") || navbar;
    const navbarList = navbarContent.querySelector(".navbar-nav");

    const dailyReport = pages.find((page) => page.file == "daily_report.html");

    if (navbarList && dailyReport.roles.includes(role)
      && !navbarList.querySelector('a[href$="daily_report.html"]')) {
      navbarList.insertAdjacentHTML("beforeend", `
        <li class="nav-item">
          <a
            class="nav-link ${currentPage == "daily_report.html" ? "active" : ""}"
            href="${getPageHref("daily_report.html")}"
          >Daily Z-Report</a>
        </li>
      `);
    }

    navbarContent.insertAdjacentHTML("beforeend", userBlock);
  } else {
    const links = pages
      .filter((page) => page.menu && page.roles.includes(role))
      .map((page) => {
        const active = page.file == currentPage ? "active" : "";
        const href = getPageHref(page.file);

        return `
          <li class="nav-item">
            <a class="nav-link ${active}" href="${href}">${page.title}</a>
          </li>
        `;
      }).join("");

    document.getElementById("app-header").innerHTML = `
        <nav class="navbar navbar-expand-lg navbar-dark bg-dark mb-3 px-3 rounded">
          <span class="navbar-brand">POS &amp; AR</span>
          <button
            class="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#appNavbarContent"
            aria-controls="appNavbarContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="appNavbarContent">
            <ul class="navbar-nav me-auto">${links}</ul>
            ${userBlock}
          </div>
        </nav>
      `;
  }

  document.getElementById("header-user").textContent = user.full_name;
  document.getElementById("header-role").textContent = user.role_name;

  const logoutButton = document.getElementById("button-logout");

  if (logoutButton) {
    logoutButton.addEventListener("click", () => {
      logout();
    });
  }
};

const displayNotAuthorized = () => {
  Array.from(document.body.children).forEach((element) => {
    if (element.id != "app-header" && element.tagName != "NAV" && element.tagName != "SCRIPT") {
      element.remove();
    }
  });

  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="alert alert-danger m-4">You are not authorized to open this page.</div>`,
  );
};

const logout = async () => {
  const formData = new FormData();
  formData.append("operation", "logout");

  const response = await axios({
    url: `${baseAPI}/session.php`,
    method: "POST",
    data: formData,
  });

  if (response.data.success) {
    window.location.href = `${baseUrl}/index.html`;
  } else {
    Swal.fire("ERROR!");
  }
};

document.addEventListener("DOMContentLoaded", () => {
  checkSession();
});
