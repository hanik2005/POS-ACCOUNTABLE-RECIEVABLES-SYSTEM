<?php
session_start();

if (!isset($_SESSION['user_id'])) {
    header("Location: ../../index.html");
    exit();
}
?>

<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Roles | POS AR System</title>

    <link
        href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css"
        rel="stylesheet">

    <style>
        body {
            background-color: #f5f6fa;
        }

        .sidebar {
            min-height: 100vh;
            background-color: #212529;
        }

        .sidebar a {
            color: #fff;
            text-decoration: none;
            display: block;
            padding: 12px 20px;
        }

        .sidebar a:hover,
        .sidebar .active {
            background-color: #343a40;
        }

        .main-content {
            padding: 30px;
        }

        .card {
            border: none;
            box-shadow: 0 2px 10px rgba(0,0,0,0.08);
        }

        .page-title {
            font-weight: 600;
        }
    </style>
<script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
</head>

<body>

<nav class="navbar navbar-dark bg-dark">
    <div class="container-fluid">
        <span class="navbar-brand mb-0 h1">
            POS AR SYSTEM
        </span>

        <span class="text-white">
            <?php echo $_SESSION['full_name']; ?>
        </span>
    </div>
</nav>

<div class="container-fluid">

    <div class="row">
        <div class="col-md-2 sidebar p-0">

            <div class="p-3 text-white">
                <h5>MASTER FILES</h5>
            </div>

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

            <a href="pos_terminals.php">
                POS Terminals
            </a>

            <a href="roles.php" class="active">
                Roles
            </a>

            <a href="users.php">
                Users
            </a>

            <div class="mt-4 px-3">
                <button
                    type="button"
                    class="btn btn-danger w-100"
                    id="logoutBtn">
                    Logout
                </button>
            </div>

        </div>


        <!-- MAIN CONTENT -->
        <div class="col-md-10 main-content">

            <div class="d-flex justify-content-between align-items-center mb-4">

                <div>
                    <h2 class="page-title">
                        Roles
                    </h2>

                    <p class="text-muted">
                        Role Master File
                    </p>
                </div>

                <button
                    type="button"
                    class="btn btn-primary"
                    data-bs-toggle="modal"
                    data-bs-target="#roleModal">

                    + Add Role

                </button>

            </div>


            <!-- SEARCH -->
            <div class="card mb-3">

                <div class="card-body">

                    <input
                        type="text"
                        id="searchRole"
                        class="form-control"
                        placeholder="Search role...">

                </div>

            </div>


            <!-- TABLE -->
            <div class="card">

                <div class="card-body">

                    <div id="main-div">

                        <div class="text-center p-4">
                            Loading roles...
                        </div>

                    </div>

                </div>

            </div>

        </div>

    </div>

</div>


<!-- ADD ROLE MODAL -->

<div
    class="modal fade"
    id="roleModal"
    tabindex="-1">

    <div class="modal-dialog">

        <div class="modal-content">

            <div class="modal-header">

                <h5 class="modal-title">
                    Add Role
                </h5>

                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal">
                </button>

            </div>


            <div class="modal-body">

                <div class="mb-3">

                    <label class="form-label">
                        Role Name
                    </label>

                    <input
                        type="text"
                        id="roleNameInput"
                        class="form-control">

                </div>


                <div class="mb-3">

                    <label class="form-label">
                        Description
                    </label>

                    <textarea
                        id="descriptionInput"
                        class="form-control"
                        rows="3">
                    </textarea>

                </div>


                <div class="mb-3">

                    <label class="form-label">
                        Status
                    </label>

                    <select
                        id="statusInput"
                        class="form-select">

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
                    data-bs-dismiss="modal">

                    Cancel

                </button>

                <button
                    type="button"
                    class="btn btn-primary"
                    id="submitBtn">

                    Save Role

                </button>

            </div>

        </div>

    </div>

</div>


<!-- VIEW / UPDATE MODAL -->

<div
    class="modal fade"
    id="blank-modal"
    tabindex="-1">

    <div class="modal-dialog modal-lg">

        <div class="modal-content">

            <div id="blank-modal-body"></div>

        </div>

    </div>

</div>


<!-- DELETE MODAL -->

<div
    class="modal fade"
    id="decisionModal"
    tabindex="-1">

    <div class="modal-dialog">

        <div class="modal-content">

            <div class="modal-header">

                <h5 class="modal-title">
                    Delete Role
                </h5>

                <button
                    type="button"
                    class="btn-close"
                    data-bs-dismiss="modal">
                </button>

            </div>

            <div class="modal-body">

                Are you sure you want to delete this role?

            </div>

            <div class="modal-footer">

                <button
                    type="button"
                    class="btn btn-secondary"
                    id="confirmNo">

                    No

                </button>

                <button
                    type="button"
                    class="btn btn-danger"
                    id="confirmYes">

                    Yes

                </button>

            </div>

        </div>

    </div>

</div>


<script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>

<script
    src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js">
</script>

<script
    type="module"
    src="../../js/roles.js">
</script>


<script>

document.getElementById("logoutBtn").addEventListener("click", async () => {

    try {

        await axios.get("../../api/logout.php");

    } catch (error) {

        console.log(error);

    }

    window.location.href = "../../index.html";

});

</script>

</body>

</html>