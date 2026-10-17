<?php
require_once __DIR__ . "/config-cors.php";

class User{

    function insertUser($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $password = password_hash("12345",PASSWORD_DEFAULT);

        $sql = "INSERT INTO users
                (
                    username,
                    password_hash,
                    full_name,
                    email,
                    role_id,
                    status
                )
                VALUES
                (
                    :username,
                    :password,
                    :fullName,
                    :email,
                    :roleId,
                    :status
                )";

        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":username", $json["username"]);
        $stmt->bindParam(":password", $password);
        $stmt->bindParam(":fullName", $json["fullName"]);
        $stmt->bindParam(":email", $json["email"]);
        $stmt->bindParam(":roleId", $json["roleId"]);
        $stmt->bindParam(":status", $json["status"]);

        $stmt->execute();

        return 1;
    }

    function getAllUsers(){

        include "connection-pdo.php";

        $sql = "SELECT
                    u.user_id,
                    u.username,
                    u.full_name,
                    u.email,
                    u.role_id,
                    r.role_name,
                    u.status
                FROM users u
                LEFT JOIN roles r
                    ON u.role_id = r.role_id
                ORDER BY u.user_id DESC";

        $stmt = $conn->prepare($sql);

        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }

    function getUser($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "SELECT
                    u.user_id,
                    u.username,
                    u.full_name,
                    u.email,
                    u.role_id,
                    r.role_name,
                    u.status
                FROM users u
                LEFT JOIN roles r
                    ON u.role_id = r.role_id
                WHERE u.user_id = :userId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":userId",$json["userId"]);

        $stmt->execute();

        return json_encode(
            $stmt->fetchAll(PDO::FETCH_ASSOC)
        );
    }
    function updateUser($json){

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE users
                SET
                    username = :username,
                    full_name = :fullName,
                    email = :email,
                    role_id = :roleId,
                    status = :status
                WHERE user_id = :userId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":username", $json["username"]);
        $stmt->bindParam(":fullName", $json["fullName"]);
        $stmt->bindParam(":email", $json["email"]);
        $stmt->bindParam(":roleId", $json["roleId"]);
        $stmt->bindParam(":status", $json["status"]);
        $stmt->bindParam(":userId", $json["userId"]);

        $stmt->execute();

        return 1;
    }

    function deleteUser($json)
    {

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $sql = "UPDATE users
                SET status = 'INACTIVE'
                WHERE user_id = :userId";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(":userId",$json["userId"]);

        $stmt->execute();

        return 1;
    }

    function getRoles()
    {

        include "connection-pdo.php";

        $sql = "SELECT
                    role_id,
                    role_name,
                    description,
                    status
                FROM roles
                WHERE status = 'ACTIVE'
                ORDER BY role_name ASC";

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


$user = new User();


switch ($operation) {

    case "insertUser":

        echo $user->insertUser($json);

        break;


    case "getAllUsers":

        echo $user->getAllUsers();

        break;
    case "getUser":

        echo $user->getUser($json);

        break;
    case "updateUser":

        echo $user->updateUser($json);

        break;
    case "deleteUser":

        echo $user->deleteUser($json);

        break;
    case "getRoles":

        echo $user->getRoles();

        break;

}
?>
