<?php
require_once __DIR__ . "/config-cors.php";


class Role{

    function insertRole($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "INSERT INTO roles
                (
                    role_name,
                    description,
                    status
                )
                VALUES
                (
                    :roleName,
                    :description,
                    :status
                )";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":roleName", $json["roleName"]);
        $stmt->bindParam(":description", $json["description"]);
        $stmt->bindParam(":status", $json["status"]);
        $stmt->execute();

        return 1;
    }

    function getAllRoles(){

        include "connection-pdo.php";
        $sql = "SELECT
                    role_id,
                    role_name,
                    description,
                    status
                FROM roles
                ORDER BY role_id DESC";

        $stmt = $conn->prepare($sql);
        $stmt->execute();
        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    function getRole($json){
        include "connection-pdo.php";
        $json = json_decode($json, true);

        $sql = "SELECT
                    role_id,
                    role_name,
                    description,
                    status
                FROM roles
                WHERE role_id = :roleId";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":roleId", $json["roleId"]);

        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    function updateRole($json){
        include "connection-pdo.php";
        $json = json_decode($json, true);

        $sql = "UPDATE roles
                SET
                    role_name = :roleName,
                    description = :description,
                    status = :status
                WHERE role_id = :roleId";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":roleName", $json["roleName"]);
        $stmt->bindParam(":description", $json["description"]);
        $stmt->bindParam(":status", $json["status"]);
        $stmt->bindParam(":roleId", $json["roleId"]);
        $stmt->execute();

        return 1;
    }

    function deleteRole($json){
        include "connection-pdo.php";
        $json = json_decode($json, true);

        $sql = "UPDATE roles
                SET status = 'INACTIVE'
                WHERE role_id = :roleId";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":roleId",$json["roleId"]);

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


$role = new Role();


switch ($operation) {

    case "insertRole":

        echo $role->insertRole($json);

        break;


    case "getAllRoles":

        echo $role->getAllRoles();

        break;


    case "getRole":

        echo $role->getRole($json);

        break;


    case "updateRole":

        echo $role->updateRole($json);

        break;


    case "deleteRole":

        echo $role->deleteRole($json);

        break;

}
?>
