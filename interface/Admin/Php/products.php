<?php

session_start();

if (!isset($_SESSION['user_id'])) {
    header("Location: http://10.75.140.143/pos_ar_system/index.html");
    exit;
}

// Optional: Admin-only protection
if ((int)($_SESSION['role_id'] ?? 0) !== 1) {
    header("Location: http://10.75.140.143/pos_ar_system/interface/User/dashboard.php");
    exit;
}

$fullName = $_SESSION['full_name'] ?? '';
$roleName = $_SESSION['role_name'] ?? '';

?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Products - POS & Accounts Receivable System</title>


    <!-- Bootstrap CSS -->
    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
    >


    <style>

        body {
            background-color: #f5f6fa;
        }

        .navbar-brand {
            font-weight: bold;
        }

        .sidebar {
            min-height: calc(100vh - 56px);
            background-color: #212529;
        }

        .sidebar a {
            color: #ffffff;
            text-decoration: none;
            display: block;
            padding: 12px 20px;
        }

        .sidebar a:hover {
            background-color: #343a40;
        }

        .sidebar .active {
            background-color: #0d6efd;
        }

        .content {
            padding: 25px;
        }

        .page-title {
            font-weight: 600;
        }

        .card {
            border: none;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        #main-div {
            overflow-x: auto;
        }

        table {
            white-space: nowrap;
        }

    </style>

<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    <link href="../../Design/Functional_Files/sweetalert-dark.css" rel="stylesheet">
</head>


<body>


<!-- NAVBAR -->
<nav class="navbar navbar-dark bg-dark">

    <div class="container-fluid">

        <a class="navbar-brand" href="dashboard.php">
            POS & Accounts Receivable System
        </a>


        <div class="d-flex align-items-center text-white">

            <span class="me-3">
                <?php echo htmlspecialchars($fullName); ?>
            </span>

            <a
                href="dashboard.php"
                class="btn btn-outline-light btn-sm"
            >
                Dashboard
            </a>

        </div>

    </div>

</nav>



<div class="container-fluid">

    <div class="row">


        <!-- SIDEBAR -->
        <div class="col-md-2 sidebar p-0">

            <div class="py-3">

                <h6 class="text-white px-3 mb-3">
                    MASTER FILES
                </h6>


                <a href="dashboard.php">
                    Dashboard
                </a>


                <a href="products.php" class="active">
                    Products
                </a>


                <a href="customers.php">
                    Customers
                </a>


                <a href="group_days.php">
                    Group Days
                </a>


                <a href="payment_methods.php">
                    Payment Methods
                </a>


                <a href="pos_terminals.php">
                    POS Terminals
                </a>


                <hr class="text-secondary">


                <h6 class="text-white px-3 mb-3">
                    SYSTEM
                </h6>


                <a href="roles.php">
                    Roles
                </a>


                <a href="users.php">
                    Users
                </a>


                <hr class="text-secondary">


                <a href="#" id="button-logout">
                    Logout
                </a>

            </div>

        </div>



        <!-- MAIN CONTENT -->
        <div class="col-md-10 content">


            <!-- PAGE HEADER -->
            <div class="d-flex justify-content-between align-items-center mb-4">

                <div>

                    <h2 class="page-title">
                        Products
                    </h2>

                    <p class="text-muted mb-0">
                        Product Master File
                    </p>

                </div>


                <button
                    type="button"
                    class="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#productModal"
                >
                    + Add Product
                </button>

            </div>



            <!-- PRODUCT TABLE CARD -->
            <div class="card">

                <div class="card-body">


                    <!-- SEARCH -->
                    <div class="row mb-3">

                        <div class="col-md-5">

                            <input
                                type="text"
                                id="searchProduct"
                                class="form-control"
                                placeholder="Search product..."
                            >

                        </div>

                    </div>


                    <!-- TABLE -->
                    <div id="main-div">

                        <div class="text-center p-4">

                            <div
                                class="spinner-border text-primary"
                                role="status"
                            >
                            </div>

                            <p class="mt-2">
                                Loading products...
                            </p>

                        </div>

                    </div>


                </div>

            </div>


        </div>

    </div>

</div>



<!-- ADD PRODUCT MODAL -->
<div
    class="modal fade"
    id="productModal"
    tabindex="-1"
    aria-labelledby="productModalLabel"
    aria-hidden="true"
>

    <div class="modal-dialog modal-lg">

        <div class="modal-content">


            <!-- MODAL HEADER -->
            <div class="modal-header">

                <h5
                    class="modal-title"
                    id="productModalLabel"
                >
                    Add Product
                </h5>

                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                ></button>

            </div>



            <!-- MODAL BODY -->
            <div class="modal-body">


                <form id="productForm">


                    <!-- PRODUCT CODE / BARCODE -->
                    <div class="row">


                        <div class="col-md-6 mb-3">

                            <label
                                for="barcodeInput"
                                class="form-label"
                            >
                                Barcode
                            </label>

                            <input
                                type="text"
                                class="form-control"
                                id="barcodeInput"
                                placeholder="Enter barcode"
                            >

                        </div>


                    </div>



                    <!-- PRODUCT NAME -->
                    <div class="mb-3">

                        <label
                            for="productNameInput"
                            class="form-label"
                        >
                            Product Name
                        </label>

                        <input
                            type="text"
                            class="form-control"
                            id="productNameInput"
                            placeholder="Enter product name"
                            required
                        >

                    </div>



                    <!-- DESCRIPTION -->
                    <div class="mb-3">

                        <label
                            for="descriptionInput"
                            class="form-label"
                        >
                            Description
                        </label>

                        <textarea
                            class="form-control"
                            id="descriptionInput"
                            rows="3"
                            placeholder="Enter product description"
                        ></textarea>

                    </div>



                    <!-- PRICE / UNIT -->
                    <div class="row">


                        <div class="col-md-6 mb-3">

                            <label
                                for="unitPriceInput"
                                class="form-label"
                            >
                                Unit Price
                            </label>

                            <div class="input-group">

                                <span class="input-group-text">
                                    ₱
                                </span>

                                <input
                                    type="number"
                                    class="form-control"
                                    id="unitPriceInput"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    required
                                >

                            </div>

                        </div>



                        <div class="col-md-6 mb-3">

                            <label
                                for="unitInput"
                                class="form-label"
                            >
                                Unit
                            </label>

                            <select
                                class="form-select"
                                id="unitInput"
                                required
                            >

                                <option value="">
                                    Select unit
                                </option>

                                <option value="pcs">
                                    Pieces (pcs)
                                </option>

                                <option value="box">
                                    Box
                                </option>

                                <option value="pack">
                                    Pack
                                </option>

                                <option value="set">
                                    Set
                                </option>

                                <option value="kg">
                                    Kilogram (kg)
                                </option>

                                <option value="liter">
                                    Liter
                                </option>

                                <option value="meter">
                                    Meter
                                </option>

                            </select>

                        </div>


                    </div>



                    <!-- STATUS -->
                    <div class="mb-3">

                        <label
                            for="statusInput"
                            class="form-label"
                        >
                            Status
                        </label>

                        <select
                            class="form-select"
                            id="statusInput"
                        >

                            <option value="Active">
                                Active
                            </option>

                            <option value="Inactive">
                                Inactive
                            </option>

                        </select>

                    </div>


                </form>


            </div>



            <!-- MODAL FOOTER -->
            <div class="modal-footer">

                <button
                    type="button"
                    class="btn btn-secondary"
                    data-bs-dismiss="modal"
                >
                    Cancel
                </button>


                <button
                    type="button"
                    class="btn btn-primary"
                    id="submitBtn"
                >
                    Save Product
                </button>

            </div>


        </div>

    </div>

</div>


<div class="modal fade" id="blank-modal" role="modal">
        <div class="modal-dialog modal-md">
            <div class="modal-content">
                <div class="modal-header text-white" style="background-color: green;">
                    <h5 class="modal-title" id="blank-modal-title"> Modal Title</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close" id=""></button>
                </div>
                <div class="modal-body" id="blank-modal-body">
                    <div class="row" id="blank-main-div" style="padding: 5px;"></div>
                </div>
                <div class="modal-footer" id="blank-modal-footer">
                    <button type="button" class="btn btn-secondary btn-sm w-100" data-bs-dismiss="modal">Close</button>
                </div>
            </div>
        </div>
    </div>

    <!-- decision box -->
    <div class="modal fade" id="decisionModal" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog">
        <div class="modal-content">
        <div class="modal-header">
            <h5 class="modal-title">Make a Decision</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
            <p>Do you want to proceed with this action?</p>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" id="confirmNo">Cancel</button>
            <button type="button" class="btn btn-primary" id="confirmYes">Confirm</button>
        </div>
        </div>
    </div>
    </div>


<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>


<script
    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
></script>


<script
    type="module"
    src="../../js/products.js"
></script>

<script>

document.getElementById("button-logout").addEventListener("click", async (event) => {

    event.preventDefault();

    if (!confirm("Are you sure you want to logout?")) {
        return;
    }


    const baseAPI = sessionStorage.getItem("baseAPI");


    try {

        const response = await axios.post(
            `${baseAPI}/logout.php`,
            {},
            {
                withCredentials: true
            }
        );


        if (response.data.success) {

            window.location.href =
                "http://10.75.140.143/pos_ar_system/index.html";

        } else {

            Swal.fire("Logout failed.");

        }

    } catch (error) {

        console.error(error);

        Swal.fire("Unable to logout.");

    }

});

</script>


</body>

</html>
