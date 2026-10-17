<?php
require_once __DIR__ . "/config-cors.php";


class GroupDays{

    function insertGroupDays($json){
        include "connection-pdo.php";
        $json = json_decode($json, true);
        $sql = "INSERT INTO group_days
                (
                    days_name,
                    days_due,
                    status
                )
                VALUES
                (
                    :daysName,
                    :daysDue,
                    :status
                )";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":daysName",$json["daysName"]);
        $stmt->bindParam(":daysDue",$json["daysDue"]);
        $stmt->bindParam(":status",$json["status"]);

        $stmt->execute();

        return 1;
    }
    function getAllGroupDays(){

        include "connection-pdo.php";

        $sql = "SELECT
                    id,
                    days_name,
                    days_due,
                    status
                FROM group_days
                ORDER BY id DESC";

        $stmt = $conn->prepare($sql);

        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    function getGroupDays($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "SELECT
                    id,
                    days_name,
                    days_due,
                    status
                FROM group_days
                WHERE id = :groupDaysId";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":groupDaysId",$json["groupDaysId"]);

        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }


    function updateGroupDays($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE group_days
                SET
                    days_name = :daysName,
                    days_due = :daysDue,
                    status = :status
                WHERE id = :groupDaysId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":daysName",$json["daysName"]);
        $stmt->bindParam(":daysDue",$json["daysDue"]);
        $stmt->bindParam(":status", $json["status"]);
        $stmt->bindParam(":groupDaysId",$json["groupDaysId"]);

        $stmt->execute();

        return 1;
    }


    
    function deleteGroupDays($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE group_days
                SET status = 'INACTIVE'
                WHERE id = :groupDaysId";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":groupDaysId",$json["groupDaysId"]);

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


$groupDays = new GroupDays();


switch ($operation) {

    case "insertGroupDays":

        echo $groupDays->insertGroupDays($json);

        break;


    case "getAllGroupDays":

        echo $groupDays->getAllGroupDays();

        break;


    case "getGroupDays":

        echo $groupDays->getGroupDays($json);

        break;


    case "updateGroupDays":

        echo $groupDays->updateGroupDays($json);

        break;


    case "deleteGroupDays":

        echo $groupDays->deleteGroupDays($json);

        break;

}
?>
