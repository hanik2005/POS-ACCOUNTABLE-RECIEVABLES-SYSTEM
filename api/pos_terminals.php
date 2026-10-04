<?php

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");


class POSTerminals{
    function insertPOSTerminal($json){
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "INSERT INTO tbl_pos_terminal
                (
                    terminal_name,
                    float_start,
                    status
                )
                VALUES
                (
                    :terminalName,
                    :floatStart,
                    :status
                )";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":terminalName", $json["terminalName"]);
        $stmt->bindParam(":floatStart", $json["floatStart"]);
        $stmt->bindParam(":status",$json["status"]);
        $stmt->execute();

        return 1;
    }


    // GET ALL POS TERMINALS
    function getAllPOSTerminals()
    {
        include "connection-pdo.php";
        $sql = "SELECT
                    terminal_id,
                    terminal_name,
                    float_start,
                    status
                FROM tbl_pos_terminal
                ORDER BY terminal_id DESC";

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }


    // GET ONE POS TERMINAL
    function getPOSTerminal($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "SELECT
                    terminal_id,
                    terminal_name,
                    float_start,
                    status
                FROM tbl_pos_terminal
                WHERE terminal_id = :terminalId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":terminalId",$json["terminalId"]);

        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    function updatePOSTerminal($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $floatStart = isset($json["floatStart"]) ? $json["floatStart"] : null;

        $sql = "UPDATE tbl_pos_terminal
                SET
                    terminal_name = :terminalName,
                    float_start = COALESCE(:floatStart, float_start),
                    status = :status
                WHERE terminal_id = :terminalId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":terminalName", $json["terminalName"]);
        $stmt->bindParam(":floatStart", $floatStart);
        $stmt->bindParam(":status", $json["status"]);
        $stmt->bindParam(":terminalId", $json["terminalId"]);

        $stmt->execute();

        return 1;
    }


    function deletePOSTerminal($json)
    {

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE tbl_pos_terminal
                SET status = 'INACTIVE'
                WHERE terminal_id = :terminalId";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":terminalId",$json["terminalId"]);

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


$posTerminals = new POSTerminals();


switch ($operation) {

    case "insertPOSTerminal":

        echo $posTerminals->insertPOSTerminal($json);

        break;


    case "getAllPOSTerminals":

        echo $posTerminals->getAllPOSTerminals();

        break;


    case "getPOSTerminal":

        echo $posTerminals->getPOSTerminal($json);

        break;


    case "updatePOSTerminal":

        echo $posTerminals->updatePOSTerminal($json);

        break;


    case "deletePOSTerminal":

        echo $posTerminals->deletePOSTerminal($json);

        break;

}
?>