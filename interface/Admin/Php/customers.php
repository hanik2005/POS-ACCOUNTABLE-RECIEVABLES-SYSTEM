<?php

session_start();

if (!isset($_SESSION['user_id'])) {
    header("Location: http://localhost/POS_AR_SYSTEM/index.html");
    exit;
}

// Admin-only protection
if ((int)($_SESSION['role_id'] ?? 0) !== 1) {
    header("Location: http://localhost/POS_AR_SYSTEM/interface/User/dashboard.php");
    exit;
}

$fullName = $_SESSION['full_name'] ?? '';
$roleName = $_SESSION['role_name'] ?? '';

?>

<!DOCTYPE html>
<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>Customers - POS & Accounts Receivable System</title>


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


                <a href="products.php">
                    Products
                </a>


                <a href="customers.php" class="active">
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
                        Customers
                    </h2>

                    <p class="text-muted mb-0">
                        Customer Master File
                    </p>

                </div>


                <button
                    type="button"
                    class="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#customerModal"
                >
                    + Add Customer
                </button>

            </div>



            <!-- CUSTOMER TABLE CARD -->

            <div class="card">

                <div class="card-body">


                    <!-- SEARCH -->

                    <div class="row mb-3">

                        <div class="col-md-5">

                            <input
                                type="text"
                                id="searchCustomer"
                                class="form-control"
                                placeholder="Search customer..."
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
                                Loading customers...
                            </p>

                        </div>

                    </div>


                </div>

            </div>


        </div>

    </div>

</div>



<!-- ADD CUSTOMER MODAL -->

<div
    class="modal fade"
    id="customerModal"
    tabindex="-1"
    aria-labelledby="customerModalLabel"
    aria-hidden="true"
>

    <div class="modal-dialog modal-lg">

        <div class="modal-content">


            <!-- MODAL HEADER -->

            <div class="modal-header">

                <h5
                    class="modal-title"
                    id="customerModalLabel"
                >
                    Add Customer
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


                <form id="customerForm">


                    <!-- CUSTOMER CODE / CUSTOMER NAME -->

                    <div class="row">


                        <div class="col-md-6 mb-3">

                            <label
                                for="customerNameInput"
                                class="form-label"
                            >
                                Customer Name
                            </label>

                            <input
                                type="text"
                                class="form-control"
                                id="customerNameInput"
                                placeholder="Enter customer name"
                                required
                            >

                        </div>


                    </div>



                    <!-- CONTACT NUMBER / EMAIL -->

                    <div class="row">


                        <div class="col-md-6 mb-3">

                            <label
                                for="contactNumberInput"
                                class="form-label"
                            >
                                Contact Number
                            </label>

                            <input
                                type="text"
                                class="form-control"
                                id="contactNumberInput"
                                placeholder="Enter contact number"
                            >

                        </div>



                        <div class="col-md-6 mb-3">

                            <label
                                for="emailInput"
                                class="form-label"
                            >
                                Email
                            </label>

                            <input
                                type="email"
                                class="form-control"
                                id="emailInput"
                                placeholder="Enter email address"
                            >

                        </div>


                    </div>



                    <!-- ADDRESS -->

                    <div class="mb-3">

                        <label
                            for="addressInput"
                            class="form-label"
                        >
                            Address
                        </label>

                        <textarea
                            class="form-control"
                            id="addressInput"
                            rows="3"
                            placeholder="Enter customer address"
                        ></textarea>

                    </div>



                    <!-- CREDIT LIMIT / GROUP DAYS -->

                    <div class="row">


                        <div class="col-md-6 mb-3">

                            <label
                                for="creditLimitInput"
                                class="form-label"
                            >
                                Credit Limit
                            </label>

                            <div class="input-group">

                                <span class="input-group-text">
                                    ₱
                                </span>

                                <input
                                    type="number"
                                    class="form-control"
                                    id="creditLimitInput"
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    value="0"
                                >

                            </div>

                        </div>



                        <div class="col-md-6 mb-3">

                            <label
                                for="groupDaysInput"
                                class="form-label"
                            >
                                Group Days
                            </label>

                            <select
                                class="form-select"
                                id="groupDaysInput"
                                required
                            >

                                <option value="">
                                    Select group days
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
                    Save Customer
                </button>

            </div>


        </div>

    </div>

</div>



<!-- BLANK MODAL -->

<div
    class="modal fade"
    id="blank-modal"
    role="modal"
>

    <div class="modal-dialog modal-md">

        <div class="modal-content">


            <div
                class="modal-header text-white"
                style="background-color: green;"
            >

                <h5
                    class="modal-title"
                    id="blank-modal-title"
                >
                    Modal Title
                </h5>

                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                    id=""
                ></button>

            </div>


            <div
                class="modal-body"
                id="blank-modal-body"
            >

                <div
                    class="row"
                    id="blank-main-div"
                    style="padding: 5px;"
                ></div>

            </div>


            <div
                class="modal-footer"
                id="blank-modal-footer"
            >

                <button
                    type="button"
                    class="btn btn-secondary btn-sm w-100"
                    data-bs-dismiss="modal"
                >
                    Close
                </button>

            </div>


        </div>

    </div>

</div>



<!-- DECISION BOX -->

<div
    class="modal fade"
    id="decisionModal"
    tabindex="-1"
    aria-hidden="true"
>

    <div class="modal-dialog">

        <div class="modal-content">


            <div class="modal-header">

                <h5 class="modal-title">
                    Make a Decision
                </h5>

                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                ></button>

            </div>


            <div class="modal-body">

                <p>
                    Do you want to proceed with this action?
                </p>

            </div>


            <div class="modal-footer">

                <button
                    type="button"
                    class="btn btn-secondary"
                    id="confirmNo"
                >
                    Cancel
                </button>


                <button
                    type="button"
                    class="btn btn-primary"
                    id="confirmYes"
                >
                    Confirm
                </button>

            </div>


        </div>

    </div>

</div>



<script
    src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"
></script>


<script
    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
></script>


<script
    type="module"
    src="../../js/customers.js"
></script>



<script>

document
    .getElementById("button-logout")
    .addEventListener(
        "click",
        async (event) => {

            event.preventDefault();


            if (!confirm(
                "Are you sure you want to logout?"
            )) {
                return;
            }


            const baseAPI =
                sessionStorage.getItem(
                    "baseAPI"
                );


            try {

                const response =
                    await axios.post(

                        `${baseAPI}/logout.php`,

                        {},

                        {
                            withCredentials: true
                        }

                    );


                if (
                    response.data.success
                ) {

                    window.location.href =
                        "http://localhost/POS_AR_SYSTEM/index.html";

                } else {

                    alert(
                        "Logout failed."
                    );

                }

            } catch (error) {

                console.error(error);

                alert(
                    "Unable to logout."
                );

            }

        }
    );

</script>


</body>

</html>
