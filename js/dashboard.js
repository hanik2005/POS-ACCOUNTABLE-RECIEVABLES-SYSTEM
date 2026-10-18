import { baseAPI } from "./config.js";
import { formatNumber } from "./module/number_format.js";

sessionStorage.setItem("baseAPI", baseAPI);

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardCounts();
});

const loadDashboardCounts = async () => {
  await loadProductCount();

  await loadCustomerCount();

  await loadGroupDaysCount();

  await loadPaymentMethodCount();

  await loadTerminalCount();

  await loadRoleCount();

  await loadUnitCount();

  await loadProductCategoryCount();

  await loadInventoryCount();

  await loadUserCount();
};

const loadProductCount = async () => {
  try {
    const response = await axios.get(`${baseAPI}/products.php`, {
      params: {
        operation: "getAllProducts",
      },
    });

    if (response.status == 200) {
      document.getElementById("product-count").textContent =
        formatNumber(response.data.length, 0);
    }
  } catch (error) {
    console.error("Product Count Error:", error);
  }
};

const loadCustomerCount = async () => {
  try {
    const response = await axios.get(`${baseAPI}/customers.php`, {
      params: {
        operation: "getAllCustomers",
      },
    });

    if (response.status == 200) {
      document.getElementById("customer-count").textContent =
        formatNumber(response.data.length, 0);
    }
  } catch (error) {
    console.error("Customer Count Error:", error);
  }
};

const loadGroupDaysCount = async () => {
  try {
    const response = await axios.get(`${baseAPI}/group_days.php`, {
      params: {
        operation: "getAllGroupDays",
      },
    });

    if (response.status == 200) {
      document.getElementById("group-days-count").textContent =
        formatNumber(response.data.length, 0);
    }
  } catch (error) {
    console.error("Group Days Count Error:", error);
  }
};

const loadPaymentMethodCount = async () => {
  try {
    const response = await axios.get(`${baseAPI}/payment_methods.php`, {
      params: {
        operation: "getAllPaymentMethods",
      },
    });

    if (response.status == 200) {
      document.getElementById("payment-method-count").textContent =
        formatNumber(response.data.length, 0);
    }
  } catch (error) {
    console.error("Payment Method Count Error:", error);
  }
};

const loadTerminalCount = async () => {
  try {
    const response = await axios.get(`${baseAPI}/pos_terminals.php`, {
      params: {
        operation: "getAllPOSTerminals",
      },
    });

    if (response.status == 200) {
      document.getElementById("terminal-count").textContent =
        formatNumber(response.data.length, 0);
    }
  } catch (error) {
    console.error("Terminal Count Error:", error);
  }
};

const loadRoleCount = async () => {
  try {
    const response = await axios.get(`${baseAPI}/roles.php`, {
      params: {
        operation: "getAllRoles",
      },
    });

    if (response.status == 200) {
      document.getElementById("role-count").textContent = formatNumber(response.data.length, 0);
    }
  } catch (error) {
    console.error("Role Count Error:", error);
  }
};

const loadUnitCount = async () => {
  try {
    const response = await axios.get(`${baseAPI}/units.php`, {
      params: {
        operation: "getAllUnits",
      },
    });

    if (response.status == 200) {
      document.getElementById("unit-count").textContent = formatNumber(response.data.length, 0);
    }
  } catch (error) {
    console.error("Unit Count Error:", error);
  }
};

const loadProductCategoryCount = async () => {
  try {
    const response = await axios.get(`${baseAPI}/product_categories.php`, {
      params: {
        operation: "getAllProductCategories",
      },
    });

    if (response.status == 200) {
      document.getElementById("product-category-count").textContent =
        formatNumber(response.data.length, 0);
    }
  } catch (error) {
    console.error("Product Category Count Error:", error);
  }
};

const loadInventoryCount = async () => {
  try {
    const response = await axios.get(`${baseAPI}/inventory.php`, {
      params: {
        operation: "getAllInventory",
      },
    });

    if (response.status == 200) {
      document.getElementById("inventory-count").textContent =
        formatNumber(response.data.length, 0);
    }
  } catch (error) {
    console.error("Inventory Count Error:", error);
  }
};

const loadUserCount = async () => {
  try {
    const response = await axios.get(`${baseAPI}/users.php`, {
      params: {
        operation: "getAllUsers",
      },
    });

    if (response.status == 200) {
      document.getElementById("user-count").textContent = formatNumber(response.data.length, 0);
    }
  } catch (error) {
    console.error("User Count Error:", error);
  }
};
