<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

date_default_timezone_set('Asia/Manila');

include "../api/session.php";

class Shift
{
  function getPosSession()
  {
    include "../api/connection-pdo.php";

    $session = new Session();
    $userId = $session->getUserId();
    $cashier = isset($_SESSION['full_name']) ? $_SESSION['full_name'] : "";
    $now = date('H:i:s');

    //a cashier can have a terminal for each schedule, the one of the current time comes first
    $sql = "SELECT t.terminal_id, t.terminal_name, t.float_start, a.schedule_id, s.schedule_name
        FROM terminal_assignment a
        INNER JOIN tbl_pos_terminal t ON a.terminal_id = t.terminal_id
        INNER JOIN shift_schedule s ON a.schedule_id = s.schedule_id
        WHERE a.user_id = :userId
        ORDER BY (s.start_time <= :timeFrom AND :timeTo < s.end_time) DESC, s.start_time
        LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->bindParam(":timeFrom", $now);
    $stmt->bindParam(":timeTo", $now);
    $stmt->execute();
    $terminal = $stmt->fetch(PDO::FETCH_ASSOC);

    //float left = float start + approved float adjusts - the change given to the customers
    $sql = "SELECT sh.shift_id, sh.opened_at, sh.schedule_id, sh.float_start,
        sh.float_start
          + IFNULL((SELECT SUM(m.amount) FROM shift_cash_movement m
              WHERE m.shift_id = sh.shift_id AND m.movement_type = 'FLOAT_ADJUST' AND m.status = 'APPROVED'), 0)
          - IFNULL((SELECT SUM(p.change_amount) FROM payments_hdr p
              WHERE p.shift_id = sh.shift_id), 0) AS float_left,
        (SELECT COUNT(*) FROM shift_cash_movement m
          WHERE m.shift_id = sh.shift_id AND m.status = 'PENDING') AS pending_requests
        FROM shifts sh
        WHERE sh.user_id = :userId AND sh.status = 'OPEN'
        ORDER BY sh.shift_id DESC
        LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->execute();
    $shift = $stmt->fetch(PDO::FETCH_ASSOC);

    return json_encode([
      "cashier" => $cashier,
      "terminal" => $terminal ? $terminal : null,
      "shift" => $shift ? $shift : null
    ]);
  }

  function openShift($json)
  {
    include "../api/connection-pdo.php";

    $session = new Session();
    $userId = $session->getUserId();
    $openedAt = date('Y-m-d H:i:s');
    $now = date('H:i:s');

    try {
      //the terminal and the schedule of the current time, the shift starts with the float start of the terminal
      $sql = "SELECT a.terminal_id, a.schedule_id, t.float_start
          FROM terminal_assignment a
          INNER JOIN tbl_pos_terminal t ON a.terminal_id = t.terminal_id
          INNER JOIN shift_schedule s ON a.schedule_id = s.schedule_id
          WHERE a.user_id = :userId
          ORDER BY (s.start_time <= :timeFrom AND :timeTo < s.end_time) DESC, s.start_time
          LIMIT 1";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":userId", $userId);
      $stmt->bindParam(":timeFrom", $now);
      $stmt->bindParam(":timeTo", $now);
      $stmt->execute();
      $assignment = $stmt->fetch(PDO::FETCH_ASSOC);
      $terminalId = $assignment ? $assignment['terminal_id'] : null;
      $scheduleId = $assignment ? $assignment['schedule_id'] : null;
      $floatStart = $assignment ? $assignment['float_start'] : 0.00;

      $sql = "INSERT INTO shifts(user_id, terminal_id, schedule_id, opened_at, float_start, status)
          VALUES(:userId, :terminalId, :scheduleId, :openedAt, :floatStart, 'OPEN')";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":userId", $userId);
      $stmt->bindParam(":terminalId", $terminalId);
      $stmt->bindParam(":scheduleId", $scheduleId);
      $stmt->bindParam(":openedAt", $openedAt);
      $stmt->bindParam(":floatStart", $floatStart);
      $stmt->execute();

      $returnValue = 1;
    } catch (Exception $e) {
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }

  //1 = closed, 2 = a float adjust request is not decided yet
  function closeShift($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $closedAt = date('Y-m-d H:i:s');
    $closingCash = isset($json['closingCash']) ? $json['closingCash'] : null;

    //the cashier counts the drawer when closing the shift
    if ($closingCash === null || $closingCash === "" || $closingCash < 0) {
      return json_encode(0);
    }

    $sql = "SELECT COUNT(*) FROM shift_cash_movement WHERE shift_id = :shiftId AND status = 'PENDING'";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":shiftId", $json['shiftId']);
    $stmt->execute();
    if ($stmt->fetchColumn() > 0) {
      return json_encode(2);
    }

    //expected cash = float start + float adjust + cash received - cash drop
    $sql = "SELECT sh.float_start
        + IFNULL((SELECT SUM(m.amount) FROM shift_cash_movement m
            WHERE m.shift_id = sh.shift_id AND m.movement_type = 'FLOAT_ADJUST' AND m.status = 'APPROVED'), 0)
        - IFNULL((SELECT SUM(m.amount) FROM shift_cash_movement m
            WHERE m.shift_id = sh.shift_id AND m.movement_type = 'CASH_DROP' AND m.status = 'APPROVED'), 0)
        + IFNULL((SELECT SUM(p.amount) FROM payments_hdr p
            INNER JOIN payment_methods pm ON p.payment_method_id = pm.payment_method_id
            WHERE p.shift_id = sh.shift_id AND pm.method_name = 'Cash'), 0)
        FROM shifts sh
        WHERE sh.shift_id = :shiftId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":shiftId", $json['shiftId']);
    $stmt->execute();
    $expectedCash = $stmt->fetchColumn();

    try {
      $conn->beginTransaction();

      $sql = "UPDATE shifts
          SET closed_at = :closedAt, closing_cash = :closingCash, expected_cash = :expectedCash, status = 'CLOSED'
          WHERE shift_id = :shiftId AND status = 'OPEN'";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":closedAt", $closedAt);
      $stmt->bindParam(":closingCash", $closingCash);
      $stmt->bindParam(":expectedCash", $expectedCash);
      $stmt->bindParam(":shiftId", $json['shiftId']);
      $stmt->execute();

      $returnValue = 0;
      if ($stmt->rowCount() > 0) {
        //the closing cash is the float left in the terminal, the next shift starts with it
        $sql = "UPDATE tbl_pos_terminal t
            INNER JOIN shifts sh ON sh.terminal_id = t.terminal_id
            SET t.float_start = :closingCash
            WHERE sh.shift_id = :shiftId";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":closingCash", $closingCash);
        $stmt->bindParam(":shiftId", $json['shiftId']);
        $stmt->execute();

        $returnValue = 1;
      }

      $conn->commit();
    } catch (Exception $e) {
      $conn->rollBack();
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }

  //FLOAT_ADJUST: positive = add float, negative = remove float, it is a request that the accountant decides
  //CASH_DROP: cash taken out of the drawer by the cashier, no approval
  function saveCashMovement($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $session = new Session();
    $userId = $session->getUserId();
    $createdAt = date('Y-m-d H:i:s');
    $movementType = !empty($json['movementType']) ? $json['movementType'] : "";
    $amount = isset($json['amount']) ? (float) $json['amount'] : 0;
    $reason = !empty($json['reason']) ? $json['reason'] : null;
    $status = $movementType == 'FLOAT_ADJUST' ? 'PENDING' : 'APPROVED';

    try {
      if (!in_array($movementType, ['FLOAT_ADJUST', 'CASH_DROP']) || $amount == 0 || ($movementType == 'CASH_DROP' && $amount < 0)) {
        throw new Exception("Invalid cash movement.");
      }

      //only the open shift of the logged-in cashier
      $sql = "SELECT shift_id FROM shifts WHERE shift_id = :shiftId AND user_id = :userId AND status = 'OPEN'";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":shiftId", $json['shiftId']);
      $stmt->bindParam(":userId", $userId);
      $stmt->execute();
      if (!$stmt->fetchColumn()) {
        throw new Exception("Not an open shift of the cashier.");
      }

      $sql = "INSERT INTO shift_cash_movement(shift_id, movement_type, amount, reason, status, created_at)
          VALUES(:shiftId, :movementType, :amount, :reason, :status, :createdAt)";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":shiftId", $json['shiftId']);
      $stmt->bindParam(":movementType", $movementType);
      $stmt->bindParam(":amount", $amount);
      $stmt->bindParam(":reason", $reason);
      $stmt->bindParam(":status", $status);
      $stmt->bindParam(":createdAt", $createdAt);
      $stmt->execute();

      $returnValue = 1;
    } catch (Exception $e) {
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }

  function getCashMovements($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $sql = "SELECT m.*, u.full_name AS approver_name
        FROM shift_cash_movement m
        LEFT JOIN users u ON m.approved_by = u.user_id
        WHERE m.shift_id = :shiftId
        ORDER BY m.movement_id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":shiftId", $json['shiftId']);
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
  }

  //the float adjust requests of all the cashiers, the pending ones first (admin and accounting page)
  function getFloatRequests()
  {
    include "../api/connection-pdo.php";

    $sql = "SELECT m.movement_id, m.amount, m.reason, m.status, m.created_at, m.approved_at,
        u.full_name AS cashier, t.terminal_name, a.full_name AS approver_name
        FROM shift_cash_movement m
        INNER JOIN shifts sh ON m.shift_id = sh.shift_id
        INNER JOIN users u ON sh.user_id = u.user_id
        INNER JOIN tbl_pos_terminal t ON sh.terminal_id = t.terminal_id
        LEFT JOIN users a ON m.approved_by = a.user_id
        WHERE m.movement_type = 'FLOAT_ADJUST'
        ORDER BY (m.status = 'PENDING') DESC, m.movement_id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
  }

  //status: APPROVED or REJECTED, 1 = saved, 3 = the user is not admin or accounting
  function updateFloatRequest($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $session = new Session();
    $userId = $session->getUserId();
    $decidedAt = date('Y-m-d H:i:s');
    $status = $json['status'] == 'APPROVED' ? 'APPROVED' : 'REJECTED';

    $sql = "SELECT r.role_name
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE u.user_id = :userId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->execute();
    $roleName = strtoupper((string) $stmt->fetchColumn());

    if (!in_array($roleName, ['ADMIN', 'ACCOUNTING'])) {
      return json_encode(3);
    }

    $sql = "UPDATE shift_cash_movement
        SET status = :status, approved_by = :userId, approved_at = :decidedAt
        WHERE movement_id = :movementId AND movement_type = 'FLOAT_ADJUST' AND status = 'PENDING'";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":status", $status);
    $stmt->bindParam(":userId", $userId);
    $stmt->bindParam(":decidedAt", $decidedAt);
    $stmt->bindParam(":movementId", $json['movementId']);
    $stmt->execute();

    $returnValue = 0;
    if ($stmt->rowCount() > 0) {
      $returnValue = 1;
    }
    return json_encode($returnValue);
  }

  function getShiftReport($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    if (!empty($json['shiftId'])) {
      $where = "WHERE sh.shift_id = :shiftId";
      $params = [":shiftId" => $json['shiftId']];
    } else {
      $where = "WHERE DATE(sh.opened_at) BETWEEN :dateFrom AND :dateTo";
      $params = [":dateFrom" => $json['dateFrom'], ":dateTo" => $json['dateTo']];
      if (!empty($json['userId'])) {
        $where .= " AND sh.user_id = :userId";
        $params[":userId"] = $json['userId'];
      }
    }

    //expected cash is saved when the shift is closed, an open shift shows it so far
    $sql = "SELECT sh.shift_id, sh.opened_at, sh.closed_at, sh.status,
        sh.float_start, sh.closing_cash, IFNULL(sc.schedule_name, 'Full Time') AS schedule_name,
        u.full_name AS cashier, t.terminal_name,
        COUNT(CASE WHEN s.status = 'COMPLETED' THEN 1 END) AS transactions,
        IFNULL(SUM(CASE WHEN s.status = 'COMPLETED' THEN s.total_amount END), 0) AS gross_sales,
        IFNULL(SUM(CASE WHEN s.status = 'COMPLETED' THEN r.total_returned END), 0) AS returns_amount,
        IFNULL(m.float_adjust, 0) AS float_adjust,
        IFNULL(m.cash_drop, 0) AS cash_drop,
        IFNULL(pay.cash_received, 0) AS cash_received,
        IFNULL(pay.change_given, 0) AS change_given,
        IFNULL(sh.expected_cash, sh.float_start + IFNULL(m.float_adjust, 0) + IFNULL(pay.cash_received, 0) - IFNULL(m.cash_drop, 0)) AS expected_cash
        FROM shifts sh
        INNER JOIN users u ON sh.user_id = u.user_id
        INNER JOIN tbl_pos_terminal t ON sh.terminal_id = t.terminal_id
        LEFT JOIN shift_schedule sc ON sh.schedule_id = sc.schedule_id
        LEFT JOIN sales_hdr s ON s.shift_id = sh.shift_id
        LEFT JOIN (
          SELECT sales_id, SUM(total_amount) AS total_returned
          FROM sales_return_hdr
          WHERE status = 'APPROVED'
          GROUP BY sales_id
        ) r ON s.sales_id = r.sales_id
        LEFT JOIN (
          SELECT shift_id,
            SUM(CASE WHEN movement_type = 'FLOAT_ADJUST' AND status = 'APPROVED' THEN amount END) AS float_adjust,
            SUM(CASE WHEN movement_type = 'CASH_DROP' AND status = 'APPROVED' THEN amount END) AS cash_drop
          FROM shift_cash_movement
          GROUP BY shift_id
        ) m ON sh.shift_id = m.shift_id
        LEFT JOIN (
          SELECT p.shift_id,
            SUM(CASE WHEN pm.method_name = 'Cash' THEN p.amount END) AS cash_received,
            SUM(p.change_amount) AS change_given
          FROM payments_hdr p
          INNER JOIN payment_methods pm ON p.payment_method_id = pm.payment_method_id
          WHERE p.shift_id IS NOT NULL
          GROUP BY p.shift_id
        ) pay ON sh.shift_id = pay.shift_id
        $where
        GROUP BY sh.shift_id, sh.opened_at, sh.closed_at, sh.status,
          sh.float_start, sh.closing_cash, sh.expected_cash, sc.schedule_name,
          u.full_name, t.terminal_name, m.float_adjust, m.cash_drop,
          pay.cash_received, pay.change_given
        ORDER BY sh.opened_at DESC";
    $stmt = $conn->prepare($sql);
    foreach ($params as $key => $value) {
      $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
  }

  function getDailyReport($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $where = "WHERE s.sales_date = :date AND s.status = 'COMPLETED'";
    $params = [":date" => $json['date']];
    if (!empty($json['userId'])) {
      $where .= " AND s.created_by = :userId";
      $params[":userId"] = $json['userId'];
    }

    $sql = "SELECT u.full_name AS cashier, t.terminal_name,
        COUNT(CASE WHEN s.status = 'COMPLETED' THEN 1 END) AS transactions,
        IFNULL(SUM(CASE WHEN s.status = 'COMPLETED' THEN s.total_amount END), 0) AS gross_sales,
        IFNULL(SUM(CASE WHEN s.status = 'COMPLETED' THEN r.total_returned END), 0) AS returns_amount
        FROM sales_hdr s
        INNER JOIN users u ON s.created_by = u.user_id
        LEFT JOIN tbl_pos_terminal t ON s.terminal_id = t.terminal_id
        LEFT JOIN (
          SELECT sales_id, SUM(total_amount) AS total_returned
          FROM sales_return_hdr
          WHERE status = 'APPROVED'
          GROUP BY sales_id
        ) r ON s.sales_id = r.sales_id
        $where
        GROUP BY u.user_id, u.full_name, t.terminal_id, t.terminal_name
        ORDER BY u.full_name";
    $stmt = $conn->prepare($sql);
    foreach ($params as $key => $value) {
      $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
  }
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  $operation = $_GET['operation'];
  $json = isset($_GET['json']) ? $_GET['json'] : "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $operation = $_POST['operation'];
  $json = isset($_POST['json']) ? $_POST['json'] : "";
}

$shift = new Shift();
switch ($operation) {
  case "getPosSession":
    echo $shift->getPosSession();
    break;
  case "openShift":
    echo $shift->openShift($json);
    break;
  case "closeShift":
    echo $shift->closeShift($json);
    break;
  case "saveCashMovement":
    echo $shift->saveCashMovement($json);
    break;
  case "getCashMovements":
    echo $shift->getCashMovements($json);
    break;
  case "getFloatRequests":
    echo $shift->getFloatRequests();
    break;
  case "updateFloatRequest":
    echo $shift->updateFloatRequest($json);
    break;
  case "getShiftReport":
    echo $shift->getShiftReport($json);
    break;
  case "getDailyReport":
    echo $shift->getDailyReport($json);
    break;
}