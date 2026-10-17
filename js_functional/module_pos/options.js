import { baseAPI } from "./config.js";
import { state } from "./state.js";

export const loadPosOptions = async () => {
  const response = await axios.get(`${baseAPI}/sales.php`, {
    params: { operation: "getPosOptions" },
  });

  if (response.status == 200) {
    state.products = response.data.products;
    state.customers = response.data.customers;
    state.paymentMethods = response.data.paymentMethods;
  } else {
    Swal.fire("Error!");
  }
};