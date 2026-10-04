const baseApiUrl = "http://localhost/P2/invoice_processing/api";

let details = [];
let products = [];

const saveInvoice = async () => {
  const header = {
    studentId: document.getElementById("students-select").value,
    invoiceDate: document.getElementById("invoice-date").value,
    userId: 1, //the user's primary key (just defaulted to 1)
    amount: getTotalSales(),
  };

  const jsonData = { header: header, details: details };

  const formData = new FormData();
  formData.append("operation", "saveInvoice");
  formData.append("json", JSON.stringify(jsonData));

  const response = await axios({
    url: `${baseApiUrl}/invoice.php`,
    method: "POST",
    data: formData,
  });

  if (response.data == 1) {
    alert("Invoice has been successfully saved!");
  } else {
    alert("ERROR!");
  }
};

const openDetailsModal = async () => {
  document.getElementById("blank-modal-title").innerText = "Add Invoice Details";
  products = await getAllProducts();

  let myHtml = `
      <input type="number" class="form-control input-qty" id="qty" placeholder="qty" value="1" />
      <select class="form-select product-select" id="product">
        <option value="0">SELECT PRODUCT</option>
    `;
  products.forEach((product) => {
    myHtml += `<option value="${product.product_id}">${product.product_name}</option>`;
  });
  myHtml += `</select>`;

  const modalBody = document.getElementById("blank-main-div");
  modalBody.innerHTML = myHtml;

  //listen to change event of the product select
  modalBody.querySelector(".product-select").addEventListener("change", (e) => {
    //get the qty
    const qty = modalBody.querySelector(".input-qty").value;
    //get the selected product id
    const productId = e.target.value;
    //get price
    const product = products.find((product) => product.product_id == productId);
    if (product) {
      const price = product.product_price;
      //add to products list
      const item = {
        productId: product.product_id,
        productName: product.product_name,
        productPrice: product.product_price,
        qty: qty,
        amount: product.product_price * qty,
      };
      details.push(item);
      displayDetails();
    }
  });

  const myModal = new bootstrap.Modal(document.getElementById("blank-modal"), {
    keyboard: true,
    backdrop: "static",
  });

  myModal.show();
};

const displayDetails = () => {
  //get the table body object
  const tbody = document.getElementById("details-body");
  //iterate thru the details list and display each in the table
  let myHtml = ``;
  details.forEach((detail) => {
    myHtml += `
        <tr>
          <td>${detail.productName}</td>
          <td>${detail.qty}</td>
          <td>${detail.productPrice}</td>
          <td style="text-align: right;">${formatCurrency(detail.amount)}</td>
        </tr>
      `;
  });
  tbody.innerHTML = myHtml;
  //display total sales
  document.getElementById("total-sales").innerText = `${formatCurrency(
    getTotalSales()
  )}`;
};

const getTotalSales = () => {
  const totalSales = details.reduce((sum, item) => {
    return sum + item.amount;
  }, 0);

  return totalSales;
};

const onPageLoad = async () => {
  //load students to select element
  const select = document.getElementById("students-select");
  const students = await getAllStudents();

  var html = `<option value="0">-- SELECT STUDENT --</option>`;
  students.forEach((student) => {
    html += `<option value=${student.stud_id}>${student.stud_last_name}, ${student.stud_first_name}</option>`;
  });
  select.innerHTML = html;

  //set the date to today
  document.getElementById("invoice-date").value = formatDateYYYYMMDD();

  //set the onclick event of the details button
  document.getElementById("button-details").addEventListener("click", () => {
    openDetailsModal();
  });

  //set the onclick event of the save button
  document.getElementById("button-save").addEventListener("click", () => {
    saveInvoice();
  });
};

const getAllStudents = async () => {
  const response = await axios.get(`${baseApiUrl}/students.php`, {
    params: { operation: "getAllStudents" },
  });

  if (response.status == 200) {
    return response.data;
  } else {
    alert("Error!");
  }
};

const getAllProducts = async () => {
  const response = await axios.get(`${baseApiUrl}/products.php`, {
    params: { operation: "getAllProducts" },
  });

  if (response.status == 200) {
    return response.data;
  } else {
    alert("Error!");
  }
};

const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);

  return formatted;
};

const formatDateYYYYMMDD = () => {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0"); // Months start at 0
  const dd = String(today.getDate()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}`;
};

document.addEventListener("DOMContentLoaded", () => {
  onPageLoad();
});