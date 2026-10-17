<?php
require_once __DIR__ . "/../api/config-cors.php";

class TerminalAssignment
{
  function getAssignments()
  {
    include "../api/connection-pdo.php";

    $sql = "SELECT a.ter_ass_id, a.user_id, a.terminal_id, a.schedule_id,
        u.full_name, u.username, u.status AS user_status
        FROM terminal_assignment a
        INNER JOIN users u ON a.user_id = u.user_id
        INNER JOIN shift_schedule s ON a.schedule_id = s.schedule_id
        ORDER BY u.full_name, s.start_time";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sql = "SELECT u.user_id, u.full_name, u.username
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE r.role_name = 'CASHIER' AND u.status = 'ACTIVE'
        ORDER BY u.full_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $cashiers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sql = "SELECT terminal_id, terminal_name
        FROM tbl_pos_terminal
        WHERE status = 'ACTIVE'
        ORDER BY terminal_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $terminals = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sql = "SELECT schedule_id, schedule_name, start_time, end_time, status
        FROM shift_schedule
        ORDER BY start_time, end_time";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode([
      "assignments" => $assignments,
      "cashiers" => $cashiers,
      "terminals" => $terminals,
      "schedules" => $schedules
    ]);
  }

  function saveAssignment($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $userId = $json['userId'];
    $terminalId = $json['terminalId'];
    $scheduleId = $json['scheduleId'];
    $assignmentId = empty($json['assignmentId']) ? null : $json['assignmentId'];
    $overlap = "s_old.start_time < s_new.end_time AND s_new.start_time < s_old.end_time";
    $excludeCurrent = $assignmentId ? " AND a.ter_ass_id <> :assignmentId" : "";

    try {
      $sql = "SELECT COUNT(*)
          FROM terminal_assignment a
          INNER JOIN shift_schedule s_old ON a.schedule_id = s_old.schedule_id
          INNER JOIN shift_schedule s_new ON s_new.schedule_id = :scheduleId
          WHERE a.terminal_id = :terminalId AND {$overlap}{$excludeCurrent}";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":scheduleId", $scheduleId);
      $stmt->bindParam(":terminalId", $terminalId);
      if ($assignmentId) $stmt->bindParam(":assignmentId", $assignmentId);
      $stmt->execute();
      if ($stmt->fetchColumn() > 0) {
        return json_encode(2);
      }

      $sql = "SELECT COUNT(*)
          FROM terminal_assignment a
          INNER JOIN shift_schedule s_old ON a.schedule_id = s_old.schedule_id
          INNER JOIN shift_schedule s_new ON s_new.schedule_id = :scheduleId
          WHERE a.user_id = :userId AND {$overlap}{$excludeCurrent}";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":scheduleId", $scheduleId);
      $stmt->bindParam(":userId", $userId);
      if ($assignmentId) $stmt->bindParam(":assignmentId", $assignmentId);
      $stmt->execute();
      if ($stmt->fetchColumn() > 0) {
        return json_encode(3);
      }

      if (empty($json['assignmentId'])) {
        $sql = "INSERT INTO terminal_assignment(user_id, terminal_id, schedule_id)
            VALUES(:userId, :terminalId, :scheduleId)";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":userId", $userId);
        $stmt->bindParam(":terminalId", $terminalId);
        $stmt->bindParam(":scheduleId", $scheduleId);
      } else {
        $sql = "UPDATE terminal_assignment
            SET terminal_id = :terminalId, schedule_id = :scheduleId
            WHERE ter_ass_id = :assignmentId AND user_id = :userId";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":terminalId", $terminalId);
        $stmt->bindParam(":scheduleId", $scheduleId);
        $stmt->bindParam(":assignmentId", $assignmentId);
        $stmt->bindParam(":userId", $userId);
      }
      $stmt->execute();

      $returnValue = 1;
    } catch (Exception $e) {
      $returnValue = 0;
      if (strpos($e->getMessage(), "terminal already") !== false) {
        $returnValue = 2;
      } else if (strpos($e->getMessage(), "cashier already") !== false) {
        $returnValue = 3;
      }
    }
    return json_encode($returnValue);
  }

  function deleteAssignment($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $sql = "DELETE FROM terminal_assignment WHERE ter_ass_id = :assignmentId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":assignmentId", $json['assignmentId']);
    $stmt->execute();

    $returnValue = 0;
    if ($stmt->rowCount() > 0) {
      $returnValue = 1;
    }
    return json_encode($returnValue);
  }
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  $operation = $_GET['operation'] ?? '';
  $json = isset($_GET['json']) ? $_GET['json'] : "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $operation = $_POST['operation'] ?? '';
  $json = isset($_POST['json']) ? $_POST['json'] : "";
} else {
  $operation = '';
  $json = '';
}

$terminalAssignment = new TerminalAssignment();
switch ($operation) {
  case "getAssignments":
    echo $terminalAssignment->getAssignments();
    break;
  case "saveAssignment":
    echo $terminalAssignment->saveAssignment($json);
    break;
  case "deleteAssignment":
    echo $terminalAssignment->deleteAssignment($json);
    break;
}
