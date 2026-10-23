<?php
require_once __DIR__ . "/../api/config-cors.php";

date_default_timezone_set('Asia/Manila');

include "../api/session.php";

class Shift
{
  function isWithinSchedule($assignment, $now)
  {
    $startTime = $assignment['start_time'];
    $endTime = $assignment['end_time'];

    if ($startTime <= $endTime) {
      return $startTime <= $now && $now < $endTime;
    }

    return $now >= $startTime || $now < $endTime;
  }

  function verifySupervisor($conn, $username, $password, $excludeUserId = null)
  {
    if ($username == "" || $password == "") {
      return false;
    }

    $sql = "SELECT u.user_id, u.password_hash
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE u.username = :username AND u.status = 'ACTIVE' AND r.status = 'ACTIVE'
          AND UPPER(r.role_name) = 'SUPERVISOR'
        LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":username", $username);
    $stmt->execute();
    $supervisor = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$supervisor || !password_verify($password, $supervisor['password_hash'])
      || ($excludeUserId && $supervisor['user_id'] == $excludeUserId)) {
      return false;
    }

    return $supervisor;
  }

  function getUserAssignments($conn, $userId)
  {
    $sql = "SELECT t.terminal_id, t.terminal_name, a.schedule_id,
        s.schedule_name, s.start_time, s.end_time
        FROM terminal_assignment a
        INNER JOIN tbl_pos_terminal t ON a.terminal_id = t.terminal_id
        INNER JOIN shift_schedule s ON a.schedule_id = s.schedule_id
        WHERE a.user_id = :userId AND t.status = 'ACTIVE' AND s.status = 'ACTIVE'
        ORDER BY s.start_time, t.terminal_name";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->execute();
    $assignments = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $currentAssignment = null;
    $now = date('H:i:s');

    foreach ($assignments as $assignment) {
      if ($this->isWithinSchedule($assignment, $now)) {
        $currentAssignment = $assignment;
        break;
      }
    }

    return [
      "current" => $currentAssignment,
      "assigned" => count($assignments) > 0 ? $assignments[0] : null
    ];
  }

  function getPosSession()
  {
    include "../api/connection-pdo.php";

    $session = new Session();
    $userId = $session->getUserId();
    $cashier = isset($_SESSION['full_name']) ? $_SESSION['full_name'] : "";
    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");
    $assignments = $this->getUserAssignments($conn, $userId);
    $terminal = $assignments['current'] ? $assignments['current'] : $assignments['assigned'];

    if ($terminal) {
      $terminal['can_start_shift'] = $assignments['current'] ? 1 : 0;
    }

    $sql = "SELECT sh.shift_id, sh.opened_at, sh.schedule_id, sh.float_start,
        sh.float_start
          + IFNULL((SELECT SUM(m.amount) FROM shift_cash_movement m
              WHERE m.shift_id = sh.shift_id AND m.movement_type = 'FLOAT_ADJUST' AND m.status = 'APPROVED'), 0)
          - IFNULL((SELECT SUM(m.amount) FROM shift_cash_movement m
              WHERE m.shift_id = sh.shift_id AND m.movement_type = 'CASH_DROP' AND m.status = 'APPROVED'), 0)
          + IFNULL((SELECT SUM(IFNULL(p.amount_tendered, p.amount) - IFNULL(p.change_amount, 0))
              FROM payments_hdr p
              INNER JOIN payment_methods pm ON p.payment_method_id = pm.payment_method_id
              WHERE p.shift_id = sh.shift_id AND UPPER(pm.method_name) = 'CASH'), 0) AS float_left
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
      "role" => $roleName,
      "terminal" => $terminal ? $terminal : null,
      "shift" => $shift ? $shift : null
    ]);
  }

  function openShift($json)
  {
    include "../api/connection-pdo.php";

    $session = new Session();
    $userId = $session->getUserId();
    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");
    $openedAt = date('Y-m-d H:i:s');
    $json = json_decode($json, true);
    $floatStart = isset($json['floatStart']) && is_numeric($json['floatStart'])
      ? round((float) $json['floatStart'], 2)
      : -1;
    $supervisorUsername = isset($json['supervisorUsername']) ? trim($json['supervisorUsername']) : "";
    $supervisorPassword = isset($json['supervisorPassword']) ? $json['supervisorPassword'] : "";

    if (!$userId || $roleName != 'CASHIER') {
      return json_encode(3);
    }

    if ($floatStart < 0 || $supervisorUsername == "" || $supervisorPassword == "") {
      return json_encode(0);
    }

    $supervisor = $this->verifySupervisor($conn, $supervisorUsername, $supervisorPassword, $userId);

    if (!$supervisor) {
      return json_encode(4);
    }

    try {
      $sql = "SELECT shift_id FROM shifts WHERE user_id = :userId AND status = 'OPEN' LIMIT 1";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":userId", $userId);
      $stmt->execute();
      if ($stmt->fetchColumn()) {
        return json_encode(2);
      }

      $assignments = $this->getUserAssignments($conn, $userId);
      $assignment = $assignments['current'];

      if (!$assignment) {
        return json_encode(2);
      }

      $terminalId = $assignment['terminal_id'];
      $scheduleId = $assignment['schedule_id'];
      $supervisorUserId = $supervisor['user_id'];

      $sql = "INSERT INTO shifts(user_id, terminal_id, schedule_id, opened_at, float_start,
          opening_supervisor_user_id, status)
          VALUES(:userId, :terminalId, :scheduleId, :openedAt, :floatStart,
            :supervisorUserId, 'OPEN')";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":userId", $userId);
      $stmt->bindParam(":terminalId", $terminalId);
      $stmt->bindParam(":scheduleId", $scheduleId);
      $stmt->bindParam(":openedAt", $openedAt);
      $stmt->bindParam(":floatStart", $floatStart);
      $stmt->bindParam(":supervisorUserId", $supervisorUserId);
      $stmt->execute();

      $returnValue = 1;
    } catch (Exception $e) {
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }
  function closeShift($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $session = new Session();
    $cashierUserId = $session->getUserId();
    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");
    $closedAt = date('Y-m-d H:i:s');
    $cashierClosingCash = isset($json['cashierClosingCash']) ? $json['cashierClosingCash'] : null;
    $supervisorClosingCash = isset($json['supervisorClosingCash']) ? $json['supervisorClosingCash'] : null;
    $supervisorUsername = isset($json['supervisorUsername']) ? trim($json['supervisorUsername']) : "";
    $supervisorPassword = isset($json['supervisorPassword']) ? $json['supervisorPassword'] : "";

    if ($roleName != 'CASHIER' || !$cashierUserId) {
      return json_encode(4);
    }

    if (!is_numeric($cashierClosingCash) || !is_numeric($supervisorClosingCash)
      || $cashierClosingCash < 0 || $supervisorClosingCash < 0
      || $supervisorUsername == "" || $supervisorPassword == "") {
      return json_encode(0);
    }

    $sql = "SELECT u.user_id, u.password_hash, r.role_name
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE u.username = :username AND u.status = 'ACTIVE' AND r.status = 'ACTIVE'
        LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":username", $supervisorUsername);
    $stmt->execute();
    $supervisor = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$supervisor || strtoupper($supervisor['role_name']) != 'SUPERVISOR'
      || $supervisor['user_id'] == $cashierUserId
      || !password_verify($supervisorPassword, $supervisor['password_hash'])) {
      return json_encode(3);
    }
    $supervisorUserId = $supervisor['user_id'];

    $sql = "SELECT shift_id FROM shifts
        WHERE shift_id = :shiftId AND user_id = :userId AND status = 'OPEN'
        LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":shiftId", $json['shiftId']);
    $stmt->bindParam(":userId", $cashierUserId);
    $stmt->execute();
    if (!$stmt->fetchColumn()) {
      return json_encode(4);
    }

    //expected cash = float + approved adjustments + tendered cash - change - approved drops
    $sql = "SELECT sh.float_start
        + IFNULL((SELECT SUM(m.amount) FROM shift_cash_movement m
            WHERE m.shift_id = sh.shift_id AND m.movement_type = 'FLOAT_ADJUST' AND m.status = 'APPROVED'), 0)
        - IFNULL((SELECT SUM(m.amount) FROM shift_cash_movement m
            WHERE m.shift_id = sh.shift_id AND m.movement_type = 'CASH_DROP' AND m.status = 'APPROVED'), 0)
        + IFNULL((SELECT SUM(IFNULL(p.amount_tendered, p.amount) - IFNULL(p.change_amount, 0))
            FROM payments_hdr p
            INNER JOIN payment_methods pm ON p.payment_method_id = pm.payment_method_id
            WHERE p.shift_id = sh.shift_id AND UPPER(pm.method_name) = 'CASH'), 0)
        FROM shifts sh
        WHERE sh.shift_id = :shiftId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":shiftId", $json['shiftId']);
    $stmt->execute();
    $expectedCash = $stmt->fetchColumn();

    try {
      $conn->beginTransaction();

      $sql = "UPDATE shift_cash_movement
          SET status = 'REJECTED', approved_by = :supervisorUserId, approved_at = :decidedAt
          WHERE shift_id = :shiftId AND status = 'PENDING'";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":supervisorUserId", $supervisorUserId);
      $stmt->bindParam(":decidedAt", $closedAt);
      $stmt->bindParam(":shiftId", $json['shiftId']);
      $stmt->execute();

      $sql = "UPDATE shifts
          SET closed_at = :closedAt, closing_cash = :supervisorClosingCash,
              cashier_closing_cash = :cashierClosingCash, supervisor_user_id = :supervisorUserId,
              expected_cash = :expectedCash, status = 'CLOSED'
          WHERE shift_id = :shiftId AND user_id = :cashierUserId AND status = 'OPEN'";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":closedAt", $closedAt);
      $stmt->bindParam(":supervisorClosingCash", $supervisorClosingCash);
      $stmt->bindParam(":cashierClosingCash", $cashierClosingCash);
      $stmt->bindParam(":supervisorUserId", $supervisorUserId);
      $stmt->bindParam(":expectedCash", $expectedCash);
      $stmt->bindParam(":shiftId", $json['shiftId']);
      $stmt->bindParam(":cashierUserId", $cashierUserId);
      $stmt->execute();

      $returnValue = 0;
      if ($stmt->rowCount() > 0) {
        $returnValue = 1;
      }

      $conn->commit();
    } catch (Exception $e) {
      $conn->rollBack();
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }

  //A supervisor signs in at the POS and performs each cash movement.
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
    $supervisorUsername = isset($json['supervisorUsername']) ? trim($json['supervisorUsername']) : "";
    $supervisorPassword = isset($json['supervisorPassword']) ? $json['supervisorPassword'] : "";
    $approvedAt = $createdAt;
    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");

    if (!$userId || $roleName != 'CASHIER') {
      return json_encode(2);
    }

    $supervisor = $this->verifySupervisor($conn, $supervisorUsername, $supervisorPassword, $userId);

    if (!$supervisor) {
      return json_encode(3);
    }

    try {
      if (!in_array($movementType, ['FLOAT_ADJUST', 'CASH_DROP']) || $amount == 0
        || trim((string) $reason) == "" || ($movementType == 'CASH_DROP' && $amount < 0)) {
        throw new Exception("Invalid cash movement.");
      }

      $conn->beginTransaction();

      //Only the open shift of the cashier logged in at this terminal.
      $sql = "SELECT float_start FROM shifts
          WHERE shift_id = :shiftId AND user_id = :userId AND status = 'OPEN'
          FOR UPDATE";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":shiftId", $json['shiftId']);
      $stmt->bindParam(":userId", $userId);
      $stmt->execute();
      $floatStart = $stmt->fetchColumn();

      if ($floatStart === false) {
        throw new Exception("Not an open shift of the cashier.");
      }

      $sql = "SELECT IFNULL(SUM(CASE
            WHEN movement_type = 'FLOAT_ADJUST' THEN amount
            WHEN movement_type = 'CASH_DROP' THEN -amount
            ELSE 0
          END), 0)
          FROM shift_cash_movement
          WHERE shift_id = :shiftId AND status = 'APPROVED'";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":shiftId", $json['shiftId']);
      $stmt->execute();
      $movementNet = (float) $stmt->fetchColumn();

      $sql = "SELECT IFNULL(SUM(IFNULL(p.amount_tendered, p.amount) - IFNULL(p.change_amount, 0)), 0)
          FROM payments_hdr p
          INNER JOIN payment_methods pm ON p.payment_method_id = pm.payment_method_id
          WHERE p.shift_id = :shiftId AND UPPER(pm.method_name) = 'CASH'";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":shiftId", $json['shiftId']);
      $stmt->execute();
      $cashSalesNet = (float) $stmt->fetchColumn();
      $floatLeft = round((float) $floatStart + $movementNet + $cashSalesNet, 2);

      if (($movementType == 'CASH_DROP' || $amount < 0) && abs($amount) > $floatLeft) {
        $conn->rollBack();
        return json_encode(4);
      }

      $supervisorUserId = $supervisor['user_id'];
      $approvedStatus = 'APPROVED';
      $sql = "INSERT INTO shift_cash_movement(shift_id, movement_type, amount, reason, status,
          approved_by, approved_at, created_at)
          VALUES(:shiftId, :movementType, :amount, :reason, :status,
            :supervisorUserId, :approvedAt, :createdAt)";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":shiftId", $json['shiftId']);
      $stmt->bindParam(":movementType", $movementType);
      $stmt->bindParam(":amount", $amount);
      $stmt->bindParam(":reason", $reason);
      $stmt->bindParam(":status", $approvedStatus);
      $stmt->bindParam(":supervisorUserId", $supervisorUserId);
      $stmt->bindParam(":approvedAt", $approvedAt);
      $stmt->bindParam(":createdAt", $createdAt);
      $stmt->execute();

      $conn->commit();
      $returnValue = 1;
    } catch (Exception $e) {
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }

  function authorizePosVoid($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $session = new Session();
    $cashierUserId = $session->getUserId();
    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");
    $actionType = isset($json['actionType']) ? strtoupper($json['actionType']) : "";
    $reason = isset($json['reason']) ? trim($json['reason']) : "";
    $amount = isset($json['amount']) ? round((float) $json['amount'], 2) : -1;
    $supervisorUsername = isset($json['supervisorUsername']) ? trim($json['supervisorUsername']) : "";
    $supervisorPassword = isset($json['supervisorPassword']) ? $json['supervisorPassword'] : "";
    $details = json_encode(isset($json['details']) ? $json['details'] : []);
    $salesId = !empty($json['salesId']) ? (int) $json['salesId'] : null;

    if (!$cashierUserId || $roleName != 'CASHIER'
      || !in_array($actionType, ['VOID_LINE', 'VOID_SALE'], true)
      || $reason == "" || $amount < 0) {
      return json_encode(0);
    }

    $supervisor = $this->verifySupervisor($conn, $supervisorUsername, $supervisorPassword, $cashierUserId);

    if (!$supervisor) {
      return json_encode(3);
    }

    try {
      $conn->beginTransaction();

      $sql = "SELECT shift_id FROM shifts
          WHERE shift_id = :shiftId AND user_id = :cashierUserId AND status = 'OPEN'
          FOR UPDATE";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":shiftId", $json['shiftId']);
      $stmt->bindParam(":cashierUserId", $cashierUserId);
      $stmt->execute();
      $shiftId = $stmt->fetchColumn();

      if (!$shiftId) {
        $conn->rollBack();
        return json_encode(4);
      }

      if ($actionType == 'VOID_SALE' && $salesId) {
        $sql = "UPDATE sales_hdr
            SET status = 'VOID'
            WHERE sales_id = :salesId AND created_by = :cashierUserId
              AND shift_id = :shiftId AND status = 'HOLD'";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":salesId", $salesId);
        $stmt->bindParam(":cashierUserId", $cashierUserId);
        $stmt->bindParam(":shiftId", $shiftId);
        $stmt->execute();

        if ($stmt->rowCount() == 0) {
          $conn->rollBack();
          return json_encode(4);
        }
      }

      $supervisorUserId = $supervisor['user_id'];
      $actionAt = date('Y-m-d H:i:s');
      $sql = "INSERT INTO pos_supervisor_actions(shift_id, cashier_user_id, supervisor_user_id,
          action_type, related_sale_id, details_json, reason, amount, action_at)
          VALUES(:shiftId, :cashierUserId, :supervisorUserId, :actionType, :salesId,
            :details, :reason, :amount, :actionAt)";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":shiftId", $shiftId);
      $stmt->bindParam(":cashierUserId", $cashierUserId);
      $stmt->bindParam(":supervisorUserId", $supervisorUserId);
      $stmt->bindParam(":actionType", $actionType);
      $stmt->bindParam(":salesId", $salesId);
      $stmt->bindParam(":details", $details);
      $stmt->bindParam(":reason", $reason);
      $stmt->bindParam(":amount", $amount);
      $stmt->bindParam(":actionAt", $actionAt);
      $stmt->execute();

      $conn->commit();
      return json_encode(1);
    } catch (Exception $e) {
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }
      return json_encode(0);
    }
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

  function getShiftReport($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $session = new Session();
    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");
    $allowedRoles = ['ADMIN', 'ACCOUNTING', 'CASHIER', 'SUPERVISOR'];

    if (!in_array($roleName, $allowedRoles, true)) {
      return json_encode([]);
    }

    if (!empty($json['shiftId'])) {
      $where = "WHERE sh.shift_id = :shiftId";
      $params = [":shiftId" => $json['shiftId']];

      if ($roleName == 'CASHIER') {
        $where .= " AND sh.user_id = :cashierUserId";
        $params[":cashierUserId"] = $session->getUserId();
      }
    } else {
      $where = "WHERE DATE(sh.opened_at) BETWEEN :dateFrom AND :dateTo";
      $params = [":dateFrom" => $json['dateFrom'], ":dateTo" => $json['dateTo']];

      if ($roleName == 'CASHIER') {
        $where .= " AND sh.user_id = :cashierUserId";
        $params[":cashierUserId"] = $session->getUserId();
      } else if (!empty($json['userId'])) {
        $where .= " AND sh.user_id = :userId";
        $params[":userId"] = $json['userId'];
      }
    }

    $sql = "SELECT sh.shift_id, sh.opened_at, sh.closed_at, sh.status,
        sh.float_start, sh.closing_cash, sh.cashier_closing_cash,
        sh.opening_supervisor_user_id, sh.supervisor_user_id,
        IFNULL(sc.schedule_name, 'Full Time') AS schedule_name,
        u.full_name AS cashier, osu.full_name AS opening_supervisor_name,
        su.full_name AS supervisor_name, t.terminal_name,
        IFNULL(sales.transactions, 0) AS transactions,
        IFNULL(sales.gross_sales, 0) AS gross_sales,
        IFNULL(voids.void_transactions, 0) AS void_transactions,
        IFNULL(voids.void_sales, 0) AS void_sales,
        IFNULL(pos_actions.void_line_count, 0) AS void_line_count,
        IFNULL(pos_actions.void_line_amount, 0) AS void_line_amount,
        IFNULL(channels.paid_at_sale, 0) AS paid_at_sale,
        IFNULL(channels.ar_charged, 0) AS ar_charged,
        IFNULL(m.float_added, 0) AS float_added,
        IFNULL(m.float_removed, 0) AS float_removed,
        IFNULL(m.cash_drop_count, 0) AS cash_drop_count,
        IFNULL(m.cash_drop, 0) AS cash_drop,
        IFNULL(pay.cash_received, 0) AS cash_received,
        IFNULL(pay.change_given, 0) AS change_given,
        IFNULL(payment_totals.payment_summary, '-') AS payment_summary,
        IFNULL(sh.expected_cash, sh.float_start + IFNULL(m.float_added, 0)
          - IFNULL(m.float_removed, 0) + IFNULL(pay.cash_received, 0)
          - IFNULL(pay.change_given, 0) - IFNULL(m.cash_drop, 0)) AS expected_cash
        FROM shifts sh
        INNER JOIN users u ON sh.user_id = u.user_id
        LEFT JOIN users osu ON sh.opening_supervisor_user_id = osu.user_id
        LEFT JOIN users su ON sh.supervisor_user_id = su.user_id
        INNER JOIN tbl_pos_terminal t ON sh.terminal_id = t.terminal_id
        LEFT JOIN shift_schedule sc ON sh.schedule_id = sc.schedule_id
        LEFT JOIN (
          SELECT shift_id,
            SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS transactions,
            SUM(CASE WHEN status = 'COMPLETED' THEN total_amount ELSE 0 END) AS gross_sales
          FROM sales_hdr
          WHERE status = 'COMPLETED'
          GROUP BY shift_id
        ) sales ON sh.shift_id = sales.shift_id
        LEFT JOIN (
          SELECT sale_channels.shift_id,
            SUM(sale_channels.paid_at_sale) AS paid_at_sale,
            SUM(sale_channels.ar_charged) AS ar_charged
          FROM (
            SELECT s.shift_id,
              IFNULL(paid.applied_amount, 0) AS paid_at_sale,
              CASE WHEN s.customer_id IS NOT NULL
                THEN GREATEST(i.amount_due - IFNULL(paid.applied_amount, 0), 0)
                ELSE 0 END AS ar_charged
            FROM sales_hdr s
            INNER JOIN invoice i ON i.sales_id = s.sales_id
            LEFT JOIN (
              SELECT d.invoice_id, SUM(d.amount_applied) AS applied_amount
              FROM payments_hdr p
              INNER JOIN payments_dtl d ON p.payment_id = d.payment_id
              WHERE p.remarks = 'Paid at POS'
              GROUP BY d.invoice_id
            ) paid ON paid.invoice_id = i.invoice_id
            WHERE s.status = 'COMPLETED'
          ) sale_channels
          GROUP BY sale_channels.shift_id
        ) channels ON sh.shift_id = channels.shift_id
        LEFT JOIN (
          SELECT void_events.shift_id,
            SUM(void_events.void_transactions) AS void_transactions,
            SUM(void_events.void_sales) AS void_sales
          FROM (
            SELECT s.shift_id, COUNT(*) AS void_transactions,
              SUM(s.total_amount) AS void_sales
            FROM sales_hdr s
            WHERE s.status = 'VOID'
              AND NOT EXISTS (
                SELECT 1 FROM pos_supervisor_actions a
                WHERE a.related_sale_id = s.sales_id AND a.action_type = 'VOID_SALE'
              )
            GROUP BY s.shift_id
            UNION ALL
            SELECT a.shift_id, COUNT(*) AS void_transactions,
              SUM(a.amount) AS void_sales
            FROM pos_supervisor_actions a
            WHERE a.action_type = 'VOID_SALE'
            GROUP BY a.shift_id
          ) void_events
          GROUP BY void_events.shift_id
        ) voids ON sh.shift_id = voids.shift_id
        LEFT JOIN (
          SELECT shift_id,
            SUM(CASE WHEN action_type = 'VOID_LINE' THEN 1 ELSE 0 END) AS void_line_count,
            SUM(CASE WHEN action_type = 'VOID_LINE' THEN amount ELSE 0 END) AS void_line_amount
          FROM pos_supervisor_actions
          GROUP BY shift_id
        ) pos_actions ON sh.shift_id = pos_actions.shift_id
        LEFT JOIN (
          SELECT shift_id,
            SUM(CASE WHEN movement_type = 'FLOAT_ADJUST' AND status = 'APPROVED'
              AND amount > 0 THEN amount ELSE 0 END) AS float_added,
            SUM(CASE WHEN movement_type = 'FLOAT_ADJUST' AND status = 'APPROVED'
              AND amount < 0 THEN -amount ELSE 0 END) AS float_removed,
            SUM(CASE WHEN movement_type = 'CASH_DROP' AND status = 'APPROVED' THEN 1 ELSE 0 END) AS cash_drop_count,
            SUM(CASE WHEN movement_type = 'CASH_DROP' AND status = 'APPROVED' THEN amount ELSE 0 END) AS cash_drop
          FROM shift_cash_movement
          GROUP BY shift_id
        ) m ON sh.shift_id = m.shift_id
        LEFT JOIN (
          SELECT p.shift_id,
            SUM(CASE WHEN UPPER(pm.method_name) = 'CASH'
              THEN IFNULL(p.amount_tendered, p.amount) ELSE 0 END) AS cash_received,
            SUM(CASE WHEN UPPER(pm.method_name) = 'CASH' THEN IFNULL(p.change_amount, 0) ELSE 0 END) AS change_given
          FROM payments_hdr p
          INNER JOIN payment_methods pm ON p.payment_method_id = pm.payment_method_id
          WHERE p.shift_id IS NOT NULL
          GROUP BY p.shift_id
        ) pay ON sh.shift_id = pay.shift_id
        LEFT JOIN (
          SELECT method_totals.shift_id,
            GROUP_CONCAT(CONCAT(method_totals.method_name, ': ', FORMAT(method_totals.amount_applied, 2))
              ORDER BY method_totals.method_name SEPARATOR ' | ') AS payment_summary
          FROM (
            SELECT p.shift_id, pm.method_name, SUM(d.amount_applied) AS amount_applied
            FROM payments_hdr p
            INNER JOIN payment_methods pm ON p.payment_method_id = pm.payment_method_id
            INNER JOIN payments_dtl d ON p.payment_id = d.payment_id
            WHERE p.shift_id IS NOT NULL
            GROUP BY p.shift_id, pm.method_name
          ) method_totals
          GROUP BY method_totals.shift_id
        ) payment_totals ON sh.shift_id = payment_totals.shift_id
        $where
        ORDER BY sh.opened_at DESC";
    $stmt = $conn->prepare($sql);
    foreach ($params as $key => $value) {
      $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
  }

  function getShiftArDetails($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $session = new Session();
    $userId = $session->getUserId();
    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");

    if (!in_array($roleName, ['ADMIN', 'ACCOUNTING', 'CASHIER', 'SUPERVISOR'], true)) {
      return json_encode([]);
    }

    $where = "WHERE s.status = 'COMPLETED' AND s.customer_id IS NOT NULL
        AND (DATE(s.sales_date) BETWEEN :dateFrom AND :dateTo
          OR EXISTS (SELECT 1 FROM payments_hdr period_payment
            INNER JOIN payments_dtl period_detail ON period_payment.payment_id = period_detail.payment_id
            WHERE period_detail.invoice_id = i.invoice_id
              AND (period_payment.remarks IS NULL OR period_payment.remarks <> 'Paid at POS')
              AND DATE(period_payment.payment_date) BETWEEN :collectionFrom AND :collectionTo))";
    $params = [
      ":dateFrom" => $json['dateFrom'],
      ":dateTo" => $json['dateTo'],
      ":paymentFrom" => $json['dateFrom'],
      ":paymentTo" => $json['dateTo'],
      ":collectionFrom" => $json['dateFrom'],
      ":collectionTo" => $json['dateTo'],
    ];

    if ($roleName == 'CASHIER') {
      $where .= " AND s.created_by = :userId";
      $params[":userId"] = $userId;
    } else if (!empty($json['userId'])) {
      $where .= " AND s.created_by = :userId";
      $params[":userId"] = $json['userId'];
    }

    $sql = "SELECT i.invoice_id, i.invoice_number, s.shift_id, s.sales_date,
        t.terminal_name, c.customer_name, u.full_name AS cashier, i.amount_due,
        IFNULL(initial_paid.amount_applied, 0) AS paid_at_sale,
        GREATEST(i.amount_due - IFNULL(initial_paid.amount_applied, 0), 0) AS charged_to_ar,
        IFNULL(period_paid.amount_applied, 0) AS collected_in_period,
        GREATEST(i.amount_due - IFNULL(all_paid.amount_applied, 0), 0) AS current_balance
        FROM sales_hdr s
        INNER JOIN invoice i ON i.sales_id = s.sales_id
        INNER JOIN customers c ON s.customer_id = c.customer_id
        INNER JOIN users u ON s.created_by = u.user_id
        LEFT JOIN tbl_pos_terminal t ON s.terminal_id = t.terminal_id
        LEFT JOIN (
          SELECT d.invoice_id, SUM(d.amount_applied) AS amount_applied
          FROM payments_hdr p
          INNER JOIN payments_dtl d ON p.payment_id = d.payment_id
          WHERE p.remarks = 'Paid at POS'
          GROUP BY d.invoice_id
        ) initial_paid ON initial_paid.invoice_id = i.invoice_id
        LEFT JOIN (
          SELECT d.invoice_id, SUM(d.amount_applied) AS amount_applied
          FROM payments_hdr p
          INNER JOIN payments_dtl d ON p.payment_id = d.payment_id
          GROUP BY d.invoice_id
        ) all_paid ON all_paid.invoice_id = i.invoice_id
        LEFT JOIN (
          SELECT d.invoice_id, SUM(d.amount_applied) AS amount_applied
          FROM payments_hdr p
          INNER JOIN payments_dtl d ON p.payment_id = d.payment_id
          WHERE DATE(p.payment_date) BETWEEN :paymentFrom AND :paymentTo
            AND (p.remarks IS NULL OR p.remarks <> 'Paid at POS')
          GROUP BY d.invoice_id
        ) period_paid ON period_paid.invoice_id = i.invoice_id
        $where
        ORDER BY s.sales_date DESC, i.invoice_id DESC";
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
    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");
    $allowedRoles = ['ADMIN', 'ACCOUNTING', 'SUPERVISOR'];

    if (!in_array($roleName, $allowedRoles, true)) {
      return json_encode([]);
    }

    $userId = null;
    if (!empty($json['userId'])) {
      $userId = $json['userId'];
    }

    $date = $json['date'];
    $shiftJson = [
      "dateFrom" => $date,
      "dateTo" => $date,
      "userId" => $userId,
    ];
    $shifts = json_decode($this->getShiftReport(json_encode($shiftJson)), true);
    $salesWhere = "WHERE DATE(sh.opened_at) = :openedDate
        AND s.status IN ('COMPLETED', 'VOID')";
    $salesParams = [":openedDate" => $date];

    if (!empty($userId)) {
      $salesWhere .= " AND sh.user_id = :shiftUserId";
      $salesParams[":shiftUserId"] = $userId;
    }

    $salesSql = "SELECT
        IFNULL(SUM(CASE WHEN s.status = 'COMPLETED'
          THEN 1 ELSE 0 END), 0) AS transactions,
        IFNULL(SUM(CASE WHEN s.status = 'COMPLETED'
          THEN s.total_amount ELSE 0 END), 0) AS gross_sales,
        IFNULL(SUM(CASE WHEN s.status = 'COMPLETED'
          AND s.customer_id IS NULL THEN 1 ELSE 0 END), 0) AS walk_in_transactions,
        COUNT(DISTINCT CASE WHEN s.status = 'COMPLETED'
          AND s.customer_id IS NOT NULL THEN s.customer_id END) AS ar_customers,
        IFNULL(SUM(CASE WHEN s.status = 'COMPLETED'
          AND s.customer_id IS NOT NULL THEN IFNULL(ar.ar_charged, 0) ELSE 0 END), 0) AS ar_charged,
        IFNULL(SUM(CASE WHEN s.status = 'VOID' THEN 1 ELSE 0 END), 0) AS void_count,
        IFNULL(SUM(CASE WHEN s.status = 'VOID' THEN s.total_amount ELSE 0 END), 0) AS void_sales
        FROM sales_hdr s
        INNER JOIN shifts sh ON s.shift_id = sh.shift_id
        LEFT JOIN (
          SELECT i.sales_id,
            SUM(GREATEST(i.amount_due - IFNULL(paid.amount_applied, 0), 0)) AS ar_charged
          FROM invoice i
          LEFT JOIN (
            SELECT d.invoice_id, SUM(d.amount_applied) AS amount_applied
            FROM payments_hdr p
            INNER JOIN payments_dtl d ON p.payment_id = d.payment_id
            WHERE p.remarks = 'Paid at POS'
            GROUP BY d.invoice_id
          ) paid ON paid.invoice_id = i.invoice_id
          GROUP BY i.sales_id
        ) ar ON ar.sales_id = s.sales_id
        $salesWhere";
    $stmt = $conn->prepare($salesSql);
    foreach ($salesParams as $key => $value) {
      $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    $summary = $stmt->fetch(PDO::FETCH_ASSOC);

    $summary['paid_at_sale'] = 0;
    $summary['ar_charged'] = 0;
    $summary['void_count'] = 0;
    $summary['void_sales'] = 0;
    $summary['void_line_count'] = 0;
    $summary['void_line_amount'] = 0;

    foreach ($shifts as $shift) {
      $summary['paid_at_sale'] += (float) $shift['paid_at_sale'];
      $summary['ar_charged'] += (float) $shift['ar_charged'];
      $summary['void_count'] += (int) $shift['void_transactions'];
      $summary['void_sales'] += (float) $shift['void_sales'];
      $summary['void_line_count'] += (int) $shift['void_line_count'];
      $summary['void_line_amount'] += (float) $shift['void_line_amount'];
    }

    $paymentWhere = "WHERE DATE(sh.opened_at) = :paymentShiftDate
        AND s.status = 'COMPLETED'";
    $paymentParams = [":paymentShiftDate" => $date];
    if (!empty($userId)) {
      $paymentWhere .= " AND sh.user_id = :paymentUserId";
      $paymentParams[":paymentUserId"] = $userId;
    }

    $paymentSql = "SELECT pm.method_name, SUM(payment_totals.amount_applied) AS amount_applied
        FROM (
          SELECT p.payment_id, p.payment_method_id, p.shift_id,
            SUM(d.amount_applied) AS amount_applied
          FROM payments_hdr p
          INNER JOIN payments_dtl d ON p.payment_id = d.payment_id
          INNER JOIN invoice i ON d.invoice_id = i.invoice_id
          INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
          INNER JOIN shifts sh ON p.shift_id = sh.shift_id
          $paymentWhere
          GROUP BY p.payment_id, p.payment_method_id, p.shift_id
        ) payment_totals
        INNER JOIN payment_methods pm ON payment_totals.payment_method_id = pm.payment_method_id
        GROUP BY pm.payment_method_id, pm.method_name
        ORDER BY pm.method_name";
    $stmt = $conn->prepare($paymentSql);
    foreach ($paymentParams as $key => $value) {
      $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    $paymentMethods = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $collectionWhere = "WHERE p.payment_date = :collectionDate
        AND s.status = 'COMPLETED' AND s.customer_id IS NOT NULL
        AND (p.remarks IS NULL OR p.remarks <> 'Paid at POS')";
    $collectionParams = [":collectionDate" => $date];
    if (!empty($userId)) {
      $collectionWhere .= " AND s.created_by = :collectionUserId";
      $collectionParams[":collectionUserId"] = $userId;
    }

    $collectionSql = "SELECT IFNULL(SUM(d.amount_applied), 0) AS ar_collected
        FROM payments_hdr p
        INNER JOIN payments_dtl d ON p.payment_id = d.payment_id
        INNER JOIN invoice i ON d.invoice_id = i.invoice_id
        INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
        $collectionWhere";
    $stmt = $conn->prepare($collectionSql);
    foreach ($collectionParams as $key => $value) {
      $stmt->bindValue($key, $value);
    }
    $stmt->execute();
    $collections = $stmt->fetch(PDO::FETCH_ASSOC);

    $grossSalesCents = (int)round((float)$summary['gross_sales'] * 100);
    $vatCents = (int)round(($grossSalesCents * 12) / 112);
    $summary['vatable_sales'] = ($grossSalesCents - $vatCents) / 100;
    $summary['vat_amount'] = $vatCents / 100;
    $summary['ar_collected'] = (float)$collections['ar_collected'];

    $drawer = [
      "starting_float" => 0,
      "float_added" => 0,
      "float_removed" => 0,
      "cash_received" => 0,
      "change_given" => 0,
      "cash_drop_count" => 0,
      "cash_drop" => 0,
      "expected_cash" => 0,
      "counted_cash" => 0,
      "over_short" => null,
      "closed_shifts" => 0,
      "total_shifts" => count($shifts),
    ];
    $allShiftsClosed = count($shifts) > 0;

    foreach ($shifts as $shift) {
      $drawer['starting_float'] += (float)$shift['float_start'];
      $drawer['float_added'] += (float)$shift['float_added'];
      $drawer['float_removed'] += (float)$shift['float_removed'];
      $drawer['cash_received'] += (float)$shift['cash_received'];
      $drawer['change_given'] += (float)$shift['change_given'];
      $drawer['cash_drop_count'] += (int)$shift['cash_drop_count'];
      $drawer['cash_drop'] += (float)$shift['cash_drop'];
      $drawer['expected_cash'] += (float)$shift['expected_cash'];

      if (!empty($shift['closed_at']) && $shift['closing_cash'] !== null && $shift['closing_cash'] !== "") {
        $drawer['counted_cash'] += (float)$shift['closing_cash'];
        $drawer['closed_shifts']++;
      } else {
        $allShiftsClosed = false;
      }
    }

    if ($allShiftsClosed) {
      $drawer['over_short'] = round($drawer['counted_cash'] - $drawer['expected_cash'], 2);
    }

    return json_encode([
      "date" => $date,
      "summary" => $summary,
      "paymentMethods" => $paymentMethods,
      "drawer" => $drawer,
      "shifts" => $shifts,
    ]);
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
  case "authorizePosVoid":
    echo $shift->authorizePosVoid($json);
    break;
  case "getCashMovements":
    echo $shift->getCashMovements($json);
    break;
  case "getShiftReport":
    echo $shift->getShiftReport($json);
    break;
  case "getShiftArDetails":
    echo $shift->getShiftArDetails($json);
    break;
  case "getDailyReport":
    echo $shift->getDailyReport($json);
    break;
}
