<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class TerminalAssignment
{
  //the assignments (a cashier can have a terminal for each schedule), and the cashiers, terminals and schedules to choose from
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

    $sql = "SELECT schedule_id, schedule_name, start_time, end_time
        FROM shift_schedule
        WHERE status = 'ACTIVE'
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

  //1 = saved, 2 = the terminal already has a cashier in this time, 3 = the cashier already has a terminal in this time
  function saveAssignment($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    try {
      if (empty($json['assignmentId'])) {
        $sql = "INSERT INTO terminal_assignment(user_id, terminal_id, schedule_id)
            VALUES(:userId, :terminalId, :scheduleId)";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":userId", $json['userId']);
        $stmt->bindParam(":terminalId", $json['terminalId']);
        $stmt->bindParam(":scheduleId", $json['scheduleId']);
      } else {
        $sql = "UPDATE terminal_assignment
            SET terminal_id = :terminalId, schedule_id = :scheduleId
            WHERE ter_ass_id = :assignmentId";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":terminalId", $json['terminalId']);
        $stmt->bindParam(":scheduleId", $json['scheduleId']);
        $stmt->bindParam(":assignmentId", $json['assignmentId']);
      }
      $stmt->execute();

      $returnValue = 1;
    } catch (Exception $e) {
      //the triggers of the table stop the assignments that overlap in time
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

//submitted by the client - operation and json
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  $operation = $_GET['operation'];
  $json = isset($_GET['json']) ? $_GET['json'] : "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $operation = $_POST['operation'];
  $json = isset($_POST['json']) ? $_POST['json'] : "";
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