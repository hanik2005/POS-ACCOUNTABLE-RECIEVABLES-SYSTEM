<?php
include "session.php";

class User {

    function login($json) {

        include "connection-pdo.php";

        $json = json_decode($json, true);

        $username = $json['username'] ?? '';
        $password = $json['password'] ?? '';

        $sql = "SELECT 
                    u.user_id,
                    u.username,
                    u.password_hash,
                    u.full_name,
                    u.email,
                    u.role_id,
                    u.status,
                    r.role_name
                FROM users u
                INNER JOIN roles r
                    ON u.role_id = r.role_id
                WHERE u.username = :username
                AND u.status = 'ACTIVE'
                LIMIT 1";

        $stmt = $conn->prepare($sql);

        $stmt->bindParam(':username', $username);

        $stmt->execute();

        $user = $stmt->fetch(PDO::FETCH_ASSOC);


        if (!$user) {

            return json_encode([
                "success" => false,
                "message" => "Invalid username or password"
            ]);

        }

        if (!password_verify($password, $user['password_hash'])) {

            return json_encode([
                "success" => false,
                "message" => "Invalid username or password"
            ]);

        }


        //save the session (see session.php)
        $session = new Session();
        $session->saveSession($user);


        unset($user['password_hash']);


        return json_encode([
            "success" => true,
            "message" => "Login successful",
            "user" => $user
        ]);
    }
}


if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? '';
    $json = isset($_GET['json']) ? $_GET['json']: "";

} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? '';
    $json = isset($_POST['json']) ? $_POST['json']: "";
} else {
    echo json_encode([
        "success" => false,
        "message" => "Invalid request method"
    ]);
    exit;
}
$user = new User();

switch ($operation) {

    case "login":

        echo $user->login($json);

        break;

    default:

        echo json_encode([
            "success" => false,
            "message" => "Invalid operation"
        ]);

        break;
}
?>