
<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

class Unit
{
    function insertUnit($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "INSERT INTO unit_tbl
                (unit_name, unit_code, status)
                VALUES
                (:unitName, :unitCode, :status)";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":unitName", $json['unitName']);
        $stmt->bindParam(":unitCode", $json['unitCode']);
        $stmt->bindParam(":status", $json['status']);

        $stmt->execute();

        $returnValue = 0;

        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }

        echo json_encode($returnValue);
    }


    function getAllUnits()
    {
        include "connection-pdo.php";

        $sql = "SELECT *
                FROM unit_tbl
                ORDER BY unit_name";

        $stmt = $conn->prepare($sql);
        $stmt->execute();

        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }


    function getUnit($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "SELECT *
                FROM unit_tbl
                WHERE unit_id = :unitId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":unitId", $json['unitId']);

        $stmt->execute();

        $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        echo json_encode($rs);
    }


    function updateUnit($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE unit_tbl
                SET unit_name = :unitName, unit_code = :unitCode,
                    status = :status
                WHERE unit_id = :unitId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":unitName", $json['unitName']);
        $stmt->bindParam(":unitCode", $json['unitCode']);
        $stmt->bindParam(":status", $json['status']);
        $stmt->bindParam(":unitId", $json['unitId']);

        $stmt->execute();

        $returnValue = 0;

        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }

        echo json_encode($returnValue);
    }


    function deleteUnit($json)
    {
        include "connection-pdo.php";

        $json = json_decode($json, true);

        // Soft delete
        $sql = "UPDATE unit_tbl
                SET status = 'INACTIVE'
                WHERE unit_id = :unitId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":unitId", $json['unitId']);

        $stmt->execute();

        $returnValue = 0;

        if ($stmt->rowCount() > 0) {
            $returnValue = 1;
        }

        echo json_encode($returnValue);
    }
}


// GET
if ($_SERVER['REQUEST_METHOD'] == 'GET') {

    $operation = isset($_GET['operation']) ? $_GET['operation'] : "";
    $json = isset($_GET['json']) ? $_GET['json'] : "";


// POST
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {

    $operation = isset($_POST['operation']) ? $_POST['operation'] : "";
    $json = isset($_POST['json']) ? $_POST['json'] : "";
}


$unit = new Unit();

switch ($operation) {

    case "getAllUnits":
        $unit->getAllUnits();
        break;

    case "getUnit":
        $unit->getUnit($json);
        break;

    case "insertUnit":
        $unit->insertUnit($json);
        break;

    case "updateUnit":
        $unit->updateUnit($json);
        break;

    case "deleteUnit":
        $unit->deleteUnit($json);
        break;

    default:
        echo json_encode([
            "error" => "Invalid operation"
        ]);
        break;
}

?>

