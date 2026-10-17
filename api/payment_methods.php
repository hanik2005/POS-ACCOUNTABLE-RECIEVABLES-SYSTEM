<?php
require_once __DIR__ . "/config-cors.php";


class PaymentMethods{

    function insertPaymentMethod($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "INSERT INTO payment_methods
                (
                    method_name,
                    status
                )
                VALUES
                (
                    :methodName,
                    :status
                )";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":methodName",$json["methodName"]);
        $stmt->bindParam(":status", $json["status"]);
        $stmt->execute();

        return 1;
    }

    function getAllPaymentMethods(){
        include "connection-pdo.php";

        $sql = "SELECT
                    payment_method_id,
                    method_name,
                    status
                FROM payment_methods
                ORDER BY payment_method_id DESC";

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    function getPaymentMethod($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "SELECT
                    payment_method_id,
                    method_name,
                    status
                FROM payment_methods
                WHERE payment_method_id = :paymentMethodId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":paymentMethodId", $json["paymentMethodId"]);

        $stmt->execute();
        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    function updatePaymentMethod($json){
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE payment_methods
                SET
                    method_name = :methodName,
                    status = :status
                WHERE payment_method_id = :paymentMethodId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":methodName",$json["methodName"]);
        $stmt->bindParam( ":status", $json["status"]);
        $stmt->bindParam(":paymentMethodId", $json["paymentMethodId"]);

        $stmt->execute();

        return 1;
    }

    function deletePaymentMethod($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE payment_methods
                SET status = 'INACTIVE'
                WHERE payment_method_id = :paymentMethodId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":paymentMethodId", $json["paymentMethodId"]);

        $stmt->execute();

        return 1;
    }

}


if ($_SERVER['REQUEST_METHOD'] == 'GET') {

    $operation = $_GET['operation'];
    $json = isset($_GET['json']) ? $_GET['json'] : "";

} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {

    $operation = $_POST['operation'];
    $json = isset($_POST['json']) ? $_POST['json'] : "";

}


$paymentMethods = new PaymentMethods();


switch ($operation) {

    case "insertPaymentMethod":

        echo $paymentMethods->insertPaymentMethod($json);

        break;

    case "getAllPaymentMethods":

        echo $paymentMethods->getAllPaymentMethods();

        break;

    case "getPaymentMethod":

        echo $paymentMethods->getPaymentMethod($json);

        break;

    case "updatePaymentMethod":

        echo $paymentMethods->updatePaymentMethod($json);

        break;

    case "deletePaymentMethod":

        echo $paymentMethods->deletePaymentMethod($json);

        break;

}
?>
