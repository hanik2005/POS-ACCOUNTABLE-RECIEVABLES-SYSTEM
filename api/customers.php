<?php
require_once __DIR__ . "/config-cors.php";



class Customer{

    function insertCustomer($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "INSERT INTO customers
                (
                    customer_name,
                    contact_number,
                    email,
                    address,
                    credit_limit,
                    group_days_id,
                    status
                )
                VALUES
                (
                    :customerName,
                    :contactNumber,
                    :email,
                    :address,
                    :creditLimit,
                    :groupDaysId,
                    :status
                )";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":customerName",$json["customerName"]);
        $stmt->bindParam(":contactNumber",$json["contactNumber"]);
        $stmt->bindParam(":email",$json["email"]);
        $stmt->bindParam(":address",$json["address"]);
        $stmt->bindParam(":creditLimit", $json["creditLimit"]);
        $stmt->bindParam(":groupDaysId",$json["groupDaysId"]);
        $stmt->bindParam( ":status", $json["status"]);
        $stmt->execute();

        return 1;
    }

    function getAllCustomers(){

        include "connection-pdo.php";

        $sql = "SELECT
                    c.customer_id,
                    c.customer_name,
                    c.contact_number,
                    c.email,
                    c.address,
                    c.credit_limit,
                    c.group_days_id,
                    g.days_name,
                    g.days_due,
                    c.status
                FROM customers c
                LEFT JOIN group_days g
                    ON c.group_days_id = g.id
                ORDER BY c.customer_id DESC";

        $stmt = $conn->prepare($sql);

        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }


    // GET ONE CUSTOMER
    function getCustomer($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "SELECT
                    c.customer_id,
                    c.customer_name,
                    c.contact_number,
                    c.email,
                    c.address,
                    c.credit_limit,
                    c.group_days_id,
                    g.days_name,
                    g.days_due,
                    c.status
                FROM customers c
                LEFT JOIN group_days g
                    ON c.group_days_id = g.id
                WHERE c.customer_id = :customerId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(
            ":customerId",
            $json["customerId"]
        );

        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }


    // UPDATE CUSTOMER
    function updateCustomer($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE customers
                SET
                    customer_name = :customerName,
                    contact_number = :contactNumber,
                    email = :email,
                    address = :address,
                    credit_limit = :creditLimit,
                    group_days_id = :groupDaysId,
                    status = :status
                WHERE customer_id = :customerId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":customerName",$json["customerName"]);
        $stmt->bindParam(":contactNumber",$json["contactNumber"]);
        $stmt->bindParam(":email",$json["email"]);
        $stmt->bindParam(":address",$json["address"]);
        $stmt->bindParam(":creditLimit",$json["creditLimit"]);
        $stmt->bindParam( ":groupDaysId",$json["groupDaysId"]);
        $stmt->bindParam(":status", $json["status"]);
        $stmt->bindParam(":customerId",$json["customerId"]);
        $stmt->execute();

        return 1;
    }

    function deleteCustomer($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE customers
                SET status = 'INACTIVE'
                WHERE customer_id = :customerId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":customerId",$json["customerId"]);

        $stmt->execute();

        return 1;
    }


    
    function getGroupDays(){

        include "connection-pdo.php";

        $sql = "SELECT
                    id,
                    days_name,
                    days_due,
                    status
                FROM group_days
                WHERE status = 'ACTIVE'
                ORDER BY days_due ASC";

        $stmt = $conn->prepare($sql);

        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {

    $operation = $_GET['operation'];

    $json = isset($_GET['json']) ? $_GET['json'] : "";

} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {

    $operation = $_POST['operation'];

    $json = isset($_POST['json']) ? $_POST['json'] : "";

}


$customer = new Customer();


switch ($operation) {

    case "insertCustomer":
        echo $customer->insertCustomer($json);
        break;


    case "getAllCustomers":
        echo $customer->getAllCustomers();
        break;

    case "getCustomer":
        echo $customer->getCustomer($json);
        break;


    case "updateCustomer":
        echo $customer->updateCustomer($json);
        break;

    case "deleteCustomer":
        echo $customer->deleteCustomer($json);
        break;

    case "getGroupDays":
        echo $customer->getGroupDays();
        break;

}
?>
