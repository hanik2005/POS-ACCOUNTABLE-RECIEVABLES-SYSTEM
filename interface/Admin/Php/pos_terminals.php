<?php

session_start();

if (!isset($_SESSION['user_id'])) {

    header(
        "Location: http://localhost/POS_AR_SYSTEM/index.html"
    );

    exit;
}


if ((int)($_SESSION['role_id'] ?? 0) !== 1) {

    header(
        "Location: http://localhost/POS_AR_SYSTEM/interface/User/dashboard.php"
    );

    exit;
}


$fullName =
    $_SESSION['full_name'] ?? '';

$roleName =
    $_SESSION['role_name'] ?? '';

?>

<!DOCTYPE html>

<html lang="en">

<head>

    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0"
    >

    <title>
        POS Terminals - POS & Accounts Receivable System
    </title>


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

        <a
            class="navbar-brand"
            href="dashboard.php"
        >
            POS & Accounts Receivable System
        </a>


        <div
            class="d-flex align-items-center text-white"
        >

            <span class="me-3">

                <?php
                echo htmlspecialchars($fullName);
                ?>

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


                <a href="customers.php">
                    Customers
                </a>


                <a href="group_days.php">
                    Group Days
                </a>


                <a href="payment_methods.php">
                    Payment Methods
                </a>


                <a
                    href="pos_terminals.php"
                    class="active"
                >
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


                <a
                    href="#"
                    id="button-logout"
                >
                    Logout
                </a>


            </div>

        </div>


        <!-- MAIN CONTENT -->

        <div class="col-md-10 content">


            <!-- PAGE HEADER -->

            <div
                class="d-flex justify-content-between align-items-center mb-4"
            >

                <div>

                    <h2 class="page-title">
                        POS Terminals
                    </h2>

                    <p class="text-muted mb-0">
                        POS Terminal Master File
                    </p>

                </div>


                <button
                    type="button"
                    class="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#terminalModal"
                >
                    + Add POS Terminal
                </button>

            </div>


            <!-- TABLE -->

            <div class="card">

                <div class="card-body">


                    <input
                        type="text"
                        id="searchTerminal"
                        class="form-control mb-4"
                        style="max-width: 416px;"
                        placeholder="Search terminal..."
                    >


                    <div id="main-div">

                        <div class="text-center py-5">

                            <div
                                class="spinner-border text-primary"
                                role="status"
                            ></div>

                            <p class="mt-2">
                                Loading POS terminals...
                            </p>

                        </div>

                    </div>


                </div>

            </div>


        </div>

    </div>

</div>


<!-- ADD TERMINAL MODAL -->

<div
    class="modal fade"
    id="terminalModal"
    tabindex="-1"
>

    <div class="modal-dialog">

        <div class="modal-content">


            <div class="modal-header">

                <h5 class="modal-title">
                    Add POS Terminal
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
                        Terminal Name
                    </label>

                    <input
                        type="text"
                        class="form-control"
                        id="terminalNameInput"
                        placeholder="Enter terminal name"
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
>

    <div class="modal-dialog">

        <div class="modal-content">


            <div
                class="modal-header"
                id="blank-modal-title"
            ></div>


            <div
                class="modal-body"
                id="blank-modal-body"
            ></div>


            <div
                class="modal-footer"
                id="blank-modal-footer"
            ></div>


        </div>

    </div>

</div>


<!-- DELETE MODAL -->

<div
    class="modal fade"
    id="decisionModal"
    tabindex="-1"
>

    <div class="modal-dialog modal-dialog-centered">

        <div class="modal-content">


            <div class="modal-header">

                <h5 class="modal-title">
                    Delete POS Terminal
                </h5>

                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal"
                ></button>

            </div>


            <div class="modal-body">

                Are you sure you want to delete this POS terminal?

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


<script
    src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"
></script>


<script
    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"
></script>


<script
    type="module"
    src="../../js/pos_terminals.js"
></script>


<script>

document
    .getElementById("button-logout")
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
