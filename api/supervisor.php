<?php
require_once __DIR__ . "/config-cors.php";
include "session.php";

class Supervisor
{
  function updatePin($json)
  {
    include "connection-pdo.php";

    $json = json_decode($json, true);
    $session = new Session();
    $userId = $session->getUserId();
    $password = isset($json['password']) && is_string($json['password']) ? $json['password'] : "";
    $pin = isset($json['pin']) && is_string($json['pin']) ? $json['pin'] : "";
    $confirmPin = isset($json['confirmPin']) && is_string($json['confirmPin']) ? $json['confirmPin'] : "";

    if (!$userId) {
      return json_encode(2);
    }

    if (!preg_match('/\A[0-9]{4,6}\z/', $pin) || $pin !== $confirmPin || $password == "") {
      return json_encode(5);
    }

    $sql = "SELECT u.user_id, u.password_hash
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = :userId AND u.status = 'ACTIVE' AND r.status = 'ACTIVE'
          AND UPPER(r.role_name) = 'SUPERVISOR'
        LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->execute();
    $supervisor = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$supervisor) {
      return json_encode(2);
    }

    if (!password_verify($password, $supervisor['password_hash'])) {
      return json_encode(3);
    }

    try {
      $conn->beginTransaction();

      $sql = "SELECT u.user_id, u.supervisor_pin_hash
          FROM users u
          INNER JOIN roles r ON u.role_id = r.role_id
          WHERE u.status = 'ACTIVE' AND r.status = 'ACTIVE'
            AND UPPER(r.role_name) = 'SUPERVISOR'
            AND u.supervisor_pin_hash IS NOT NULL
          FOR UPDATE";
      $stmt = $conn->prepare($sql);
      $stmt->execute();

      foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $otherSupervisor) {
        if ($otherSupervisor['user_id'] != $userId
          && password_verify($pin, $otherSupervisor['supervisor_pin_hash'])) {
          $conn->rollBack();
          return json_encode(4);
        }
      }

      $pinHash = password_hash($pin, PASSWORD_DEFAULT);

      if ($pinHash === false) {
        $conn->rollBack();
        return json_encode(0);
      }

      $sql = "UPDATE users SET supervisor_pin_hash = :pinHash WHERE user_id = :userId";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":pinHash", $pinHash);
      $stmt->bindParam(":userId", $userId);
      $stmt->execute();
      $conn->commit();

      return json_encode(1);
    } catch (Throwable $e) {
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }

      error_log("Supervisor PIN update failed: " . $e->getMessage());
      return json_encode(0);
    }
  }
}

if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $operation = isset($_POST['operation']) ? $_POST['operation'] : "";
  $json = isset($_POST['json']) ? $_POST['json'] : "";
} else {
  http_response_code(405);
  echo json_encode(0);
  exit;
}

$supervisor = new Supervisor();
switch ($operation) {
  case "updateSupervisorPin":
    echo $supervisor->updatePin($json);
    break;
  default:
    http_response_code(400);
    echo json_encode(0);
    break;
}
?>
