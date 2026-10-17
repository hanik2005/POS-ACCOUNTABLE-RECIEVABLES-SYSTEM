<?php

session_start();

if (!isset($_SESSION['user_id'])) {
    header("Location: http://10.75.140.143/pos_ar_system/index.html");
    exit;
}

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

    <title>Payment Methods - POS & Accounts Receivable System</title>

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
            background-color: #212529;
            min-height: calc(100vh - 62px);
        }

        .sidebar h6 {
            color: white;
            font-weight: bold;
            padding: 20px 17px 10px;
        }

        .sidebar a {
            color: white;
            text-decoration: none;
            display: block;
            padding: 14px 22px;
        }

        .sidebar a:hover {
            background-color: #343a40;
        }

        .sidebar a.active {
            background-color: #0d6efd;
        }

        .content {
            padding: 25px;
        }

        .page-title {
            font-size: 36px;
            font-weight: 500;
            color: #1f2937;
        }

        .page-subtitle {
            color: #64748b;
            font-size: 18px;
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

        table th {
            font-weight: bold;
        }

        .search-box {
            max-width: 416px;
        }

    </style>

<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>

<body>


<!-- NAVBAR -->

<nav class="navbar navbar-dark bg-dark px-3">

    <a class="navbar-brand" href="#">
        POS & Accounts Receivable System
    </a>

    <div class="d-flex align-items-center gap-3">

        <span class="text-white">
            <?= htmlspecialchars($fullName) ?>
        </span>

        <a
            href="dashboard.php"
            class="btn btn-outline-light"
        >
            Dashboard
        </a>

    </div>

</nav>


<div class="container-fluid">

    <div class="row">


        <!-- SIDEBAR -->

        <div class="col-md-2 p-0 sidebar">

            <h6>MASTER FILES</h6>

            <a href="dashboard.php">
                Dashboard
            </a>

            <a href="products.php">
                Products
            </a>

            <a href="customers.php">
                Customers
            </a>

            <a href="group_days.php">
                Group Days
            </a>

            <a
                href="payment_methods.php"
                class="active"
            >
                Payment Methods
            </a>

            <a href="pos_terminals.php">
                POS Terminals
            </a>


            <h6>SYSTEM</h6>

            <a href="roles.php">
                Roles
            </a>

            <a href="users.php">
                Users
            </a>

            <a href="#" id="logoutBtn">
                Logout
            </a>

        </div>


        <!-- CONTENT -->

        <div class="col-md-10 content">


            <!-- PAGE HEADER -->

            <div class="d-flex justify-content-between align-items-center mb-4">

                <div>

                    <div class="page-title">
                        Payment Methods
                    </div>

                    <div class="page-subtitle">
                        Payment Methods Master File
                    </div>

                </div>


                <button
                    type="button"
                    class="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#paymentMethodModal"
                >
                    + Add Payment Method
                </button>

            </div>


            <!-- TABLE CARD -->

            <div class="card">

                <div class="card-body">


                    <input
                        type="text"
                        id="searchPaymentMethod"
                        class="form-control search-box mb-4"
                        placeholder="Search payment method..."
                    >


                    <div id="main-div">

                        <div class="text-center py-5">

                            <div
                                class="spinner-border text-primary"
                                role="status"
                            ></div>

                            <p class="mt-2">
                                Loading payment methods...
                            </p>

                        </div>

                    </div>

                </div>

            </div>

        </div>

    </div>

</div>


<!-- ADD PAYMENT METHOD MODAL -->

<div
    class="modal fade"
    id="paymentMethodModal"
    tabindex="-1"
    aria-hidden="true"
>

    <div class="modal-dialog">

        <div class="modal-content">


            <div class="modal-header">

                <h5 class="modal-title">
                    Add Payment Method
                </h5>

                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal"
                ></button>

            </div>


            <div class="modal-body">


                <div class="mb-3">

                    <label class="form-label">
                        Payment Name
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="paymentNameInput"
                        placeholder="Enter payment method"
                    >

                </div>


                <div class="mb-3">

                    <label class="form-label">
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


            </div>


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
                    Save
                </button>

            </div>


        </div>

    </div>

</div>


<!-- VIEW / UPDATE MODAL -->

<div
    class="modal fade"
    id="blank-modal"
    tabindex="-1"
    aria-hidden="true"
>

    <div class="modal-dialog">

        <div class="modal-content">


            <div
                class="modal-header"
                id="blank-modal-title"
            >
            </div>


            <div
                class="modal-body"
                id="blank-modal-body"
            >
            </div>


            <div
                class="modal-footer"
                id="blank-modal-footer"
            >
            </div>


        </div>

    </div>

</div>


<!-- DELETE MODAL -->

<div
    class="modal fade"
    id="decisionModal"
    tabindex="-1"
    aria-hidden="true"
>

    <div class="modal-dialog modal-dialog-centered">

        <div class="modal-content">


            <div class="modal-header">

                <h5 class="modal-title">
                    Delete Payment Method
                </h5>

                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal"
                ></button>

            </div>


            <div class="modal-body">

                Are you sure you want to delete this payment method?

            </div>


            <div class="modal-footer">

                <button
                    type="button"
                    class="btn btn-secondary"
                    id="confirmNo"
                >
                    No
                </button>

                <button
                    type="button"
                    class="btn btn-danger"
                    id="confirmYes"
                >
                    Yes
                </button>

            </div>


        </div>

    </div>

</div>


<!-- AXIOS -->

<script
    src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js">
</script>


<!-- BOOTSTRAP -->

<script
    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js">
</script>


<!-- PAYMENT METHODS JS -->

<script
    type="module"
    src="../../js/payment_methods.js">
</script>


<!-- LOGOUT -->

<script>

document
    .getElementById("logoutBtn")
    .addEventListener(
        "click",
        async function(event) {

            event.preventDefault();

            try {

                await axios.post(
                    "../../api/logout.php",
                    {},
                    {
                        withCredentials: true
                    }
                );

            } catch (error) {

                console.log(error);

            }

            window.location.href =
                "../../index.html";

        }
    );

</script>


</body>

</html>