<?php

session_start();


if (!isset($_SESSION['user_id'])) {

    header(
        "Location: http://localhost/POS_AR_SYSTEM/index.html"
    );

    exit;

}


$userId =
    $_SESSION['user_id'];

$username =
    $_SESSION['username'] ?? '';

$fullName =
    $_SESSION['full_name'] ?? '';

$roleId =
    $_SESSION['role_id'] ?? '';

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
        Dashboard - POS & Accounts Receivable Management System
    </title>


    <!-- Bootstrap -->

    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet"
    >


    <!-- Axios -->

    <script
        src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"
    ></script>


    <style>

        body {

            background-color: #f5f6fa;

        }


        /* =========================================
           NAVBAR
        ========================================= */

        .navbar {

            min-height: 60px;

        }


        .navbar-brand {

            font-weight: 600;

        }


        /* =========================================
           SIDEBAR
        ========================================= */

        .sidebar {

            min-height: calc(100vh - 60px);

            background-color: #212529;

        }


        .sidebar-title {

            color: #adb5bd;

            font-size: 12px;

            font-weight: 600;

            letter-spacing: 1px;

            margin-top: 25px;

            margin-bottom: 8px;

        }


        .sidebar a {

            color: #dee2e6;

            text-decoration: none;

            display: block;

            padding: 10px 15px;

            border-radius: 6px;

            margin-bottom: 3px;

            transition: 0.2s;

        }


        .sidebar a:hover {

            background-color: #343a40;

            color: white;

        }


        .sidebar .active {

            background-color: #0d6efd;

            color: white;

        }


        /* =========================================
           CONTENT
        ========================================= */

        .content {

            padding: 30px;

        }


        .page-title {

            font-weight: 600;

        }


        .page-subtitle {

            color: #6c757d;

        }


        /* =========================================
           USER CARD
        ========================================= */

        .user-card {

            border: none;

            border-radius: 10px;

            box-shadow:
                0 2px 8px rgba(0, 0, 0, 0.06);

        }


        .user-label {

            color: #6c757d;

            font-size: 13px;

            margin-bottom: 3px;

        }


        .user-value {

            font-weight: 500;

        }


        /* =========================================
           DASHBOARD CARDS
        ========================================= */

        .dashboard-card {

            border: none;

            border-radius: 10px;

            box-shadow:
                0 2px 8px rgba(0, 0, 0, 0.06);

            transition: 0.2s;

            height: 100%;

        }


        .dashboard-card:hover {

            transform: translateY(-2px);

            box-shadow:
                0 5px 15px rgba(0, 0, 0, 0.10);

        }


        .card-label {

            color: #6c757d;

            font-size: 14px;

        }


        .card-number {

            font-size: 30px;

            font-weight: 600;

            margin: 5px 0 15px 0;

        }


        .card-link {

            font-size: 13px;

            text-decoration: none;

        }


        /* =========================================
           SECTION CARD
        ========================================= */

        .section-card {

            border: none;

            border-radius: 10px;

            box-shadow:
                0 2px 8px rgba(0, 0, 0, 0.06);

        }


        .management-btn {

            padding: 12px;

        }


    </style>

</head>


<body>


<!-- =====================================================
     NAVBAR
===================================================== -->

<nav class="navbar navbar-dark bg-primary">

    <div class="container-fluid">


        <span class="navbar-brand">

            POS & Accounts Receivable Management System

        </span>


        <div class="d-flex align-items-center">

            <span class="text-white me-3">

                Welcome,

                <strong>

                    <?php

                    echo htmlspecialchars(
                        $fullName
                    );

                    ?>

                </strong>

            </span>


            <button
                class="btn btn-light btn-sm"
                id="button-logout"
            >

                Logout

            </button>

        </div>

    </div>

</nav>



<!-- =====================================================
     MAIN LAYOUT
===================================================== -->

<div class="container-fluid">

    <div class="row">


        <!-- =================================================
             SIDEBAR
        ================================================== -->

        <div
            class="col-md-3 col-lg-2 sidebar p-3"
        >


            <h5 class="text-white mb-4">

                MENU

            </h5>



            <!-- DASHBOARD -->

            <a
                href="dashboard.php"
                class="active"
            >

                Dashboard

            </a>



            <!-- MASTER FILES -->

            <div class="sidebar-title">

                MASTER FILES

            </div>


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


            <a href="pos_terminals.php">

                POS Terminals

            </a>


            <a href="roles.php">

                Roles

            </a>


            <a href="users.php">

                Users

            </a>



            <!-- TRANSACTIONS -->

            <div class="sidebar-title">

                TRANSACTIONS

            </div>


            <a href="#">

                Sales / POS

            </a>


            <a href="#">

                Accounts Receivable

            </a>



            <!-- REPORTS -->

            <div class="sidebar-title">

                REPORTS

            </div>


            <a href="#">

                Sales Reports

            </a>


            <a href="#">

                AR Reports

            </a>


        </div>



        <!-- =================================================
             CONTENT
        ================================================== -->

        <div class="col-md-9 col-lg-10 content">


            <!-- PAGE HEADER -->

            <div class="mb-4">

                <h2 class="page-title">

                    Dashboard

                </h2>


                <p class="page-subtitle">

                    System overview and master file management

                </p>

            </div>



            <!-- =================================================
                 USER INFORMATION
            ================================================== -->

            <div class="card user-card mb-4">

                <div class="card-body">


                    <h5 class="mb-3">

                        Logged-in User

                    </h5>


                    <div class="row">


                        <div class="col-md-4">

                            <div class="user-label">

                                Name

                            </div>


                            <div class="user-value">

                                <?php

                                echo htmlspecialchars(
                                    $fullName
                                );

                                ?>

                            </div>

                        </div>


                        <div class="col-md-4">

                            <div class="user-label">

                                Username

                            </div>


                            <div class="user-value">

                                <?php

                                echo htmlspecialchars(
                                    $username
                                );

                                ?>

                            </div>

                        </div>


                        <div class="col-md-4">

                            <div class="user-label">

                                Role

                            </div>


                            <div class="user-value">

                                <?php

                                echo htmlspecialchars(
                                    $roleName
                                );

                                ?>

                            </div>

                        </div>


                    </div>

                </div>

            </div>



            <!-- =================================================
                 MASTER FILE COUNTS
            ================================================== -->

            <div class="mb-3">

                <h5>

                    Master File Overview

                </h5>


                <p class="text-muted">

                    Current records available in the system.

                </p>

            </div>


            <div class="row g-4 mb-4">


                <!-- PRODUCTS -->

                <div class="col-md-6 col-xl-3">

                    <div class="card dashboard-card">

                        <div class="card-body">


                            <div class="card-label">

                                Products

                            </div>


                            <div
                                class="card-number"
                                id="product-count"
                            >

                                0

                            </div>


                            <a
                                href="products.php"
                                class="btn btn-outline-primary btn-sm card-link"
                            >

                                Manage Products

                            </a>


                        </div>

                    </div>

                </div>



                <!-- CUSTOMERS -->

                <div class="col-md-6 col-xl-3">

                    <div class="card dashboard-card">

                        <div class="card-body">


                            <div class="card-label">

                                Customers

                            </div>


                            <div
                                class="card-number"
                                id="customer-count"
                            >

                                0

                            </div>


                            <a
                                href="customers.php"
                                class="btn btn-outline-primary btn-sm card-link"
                            >

                                Manage Customers

                            </a>


                        </div>

                    </div>

                </div>



                <!-- GROUP DAYS -->

                <div class="col-md-6 col-xl-3">

                    <div class="card dashboard-card">

                        <div class="card-body">


                            <div class="card-label">

                                Group Days

                            </div>


                            <div
                                class="card-number"
                                id="group-days-count"
                            >

                                0

                            </div>


                            <a
                                href="group_days.php"
                                class="btn btn-outline-primary btn-sm card-link"
                            >

                                Manage Group Days

                            </a>


                        </div>

                    </div>

                </div>



                <!-- PAYMENT METHODS -->

                <div class="col-md-6 col-xl-3">

                    <div class="card dashboard-card">

                        <div class="card-body">


                            <div class="card-label">

                                Payment Methods

                            </div>


                            <div
                                class="card-number"
                                id="payment-method-count"
                            >

                                0

                            </div>


                            <a
                                href="payment_methods.php"
                                class="btn btn-outline-primary btn-sm card-link"
                            >

                                Manage Payments

                            </a>


                        </div>

                    </div>

                </div>



                <!-- POS TERMINALS -->

                <div class="col-md-6 col-xl-3">

                    <div class="card dashboard-card">

                        <div class="card-body">


                            <div class="card-label">

                                POS Terminals

                            </div>


                            <div
                                class="card-number"
                                id="terminal-count"
                            >

                                0

                            </div>


                            <a
                                href="pos_terminals.php"
                                class="btn btn-outline-primary btn-sm card-link"
                            >

                                Manage Terminals

                            </a>


                        </div>

                    </div>

                </div>



                <!-- ROLES -->

                <div class="col-md-6 col-xl-3">

                    <div class="card dashboard-card">

                        <div class="card-body">


                            <div class="card-label">

                                Roles

                            </div>


                            <div
                                class="card-number"
                                id="role-count"
                            >

                                0

                            </div>


                            <a
                                href="roles.php"
                                class="btn btn-outline-primary btn-sm card-link"
                            >

                                Manage Roles

                            </a>


                        </div>

                    </div>

                </div>



                <!-- USERS -->

                <div class="col-md-6 col-xl-3">

                    <div class="card dashboard-card">

                        <div class="card-body">


                            <div class="card-label">

                                Users

                            </div>


                            <div
                                class="card-number"
                                id="user-count"
                            >

                                0

                            </div>


                            <a
                                href="users.php"
                                class="btn btn-outline-primary btn-sm card-link"
                            >

                                Manage Users

                            </a>


                        </div>

                    </div>

                </div>


            </div>



            <!-- =================================================
                 MASTER FILE MANAGEMENT
            ================================================== -->

            <div class="card section-card">

                <div class="card-body">


                    <h5 class="mb-1">

                        Master File Management

                    </h5>


                    <p class="text-muted mb-4">

                        Manage the reference data used by the
                        POS and Accounts Receivable modules.

                    </p>


                    <div class="row g-3">


                        <div class="col-md-4 col-lg-3">

                            <a
                                href="products.php"
                                class="btn btn-outline-primary w-100 management-btn"
                            >

                                Products

                            </a>

                        </div>


                        <div class="col-md-4 col-lg-3">

                            <a
                                href="customers.php"
                                class="btn btn-outline-primary w-100 management-btn"
                            >

                                Customers

                            </a>

                        </div>


                        <div class="col-md-4 col-lg-3">

                            <a
                                href="group_days.php"
                                class="btn btn-outline-primary w-100 management-btn"
                            >

                                Group Days

                            </a>

                        </div>


                        <div class="col-md-4 col-lg-3">

                            <a
                                href="payment_methods.php"
                                class="btn btn-outline-primary w-100 management-btn"
                            >

                                Payment Methods

                            </a>

                        </div>


                        <div class="col-md-4 col-lg-3">

                            <a
                                href="pos_terminals.php"
                                class="btn btn-outline-primary w-100 management-btn"
                            >

                                POS Terminals

                            </a>

                        </div>


                        <div class="col-md-4 col-lg-3">

                            <a
                                href="roles.php"
                                class="btn btn-outline-primary w-100 management-btn"
                            >

                                Roles

                            </a>

                        </div>


                        <div class="col-md-4 col-lg-3">

                            <a
                                href="users.php"
                                class="btn btn-outline-primary w-100 management-btn"
                            >

                                Users

                            </a>

                        </div>


                    </div>

                </div>

            </div>


        </div>

    </div>

</div>



<script>

document
    .getElementById("button-logout")
    .addEventListener(
        "click",
        async function() {

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


<script
    src="../../js/dashboard.js"
    defer
></script>


</body>

</html>