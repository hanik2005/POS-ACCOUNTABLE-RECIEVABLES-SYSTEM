<?php
require_once __DIR__ . "/../api/config-cors.php";

include "../api/session.php";

class PosActivityReport
{
  function isValidDate($value)
  {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
      return false;
    }

    [$year, $month, $day] = array_map('intval', explode('-', $value));

    return checkdate($month, $day, $year);
  }

  function getPosActivityReport($json)
  {
    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");

    if (!in_array($roleName, ['ADMIN', 'ACCOUNTING'], true)) {
      http_response_code(403);
      return json_encode(["success" => false, "message" => "You do not have permission to view POS activity."]);
    }

    $data = json_decode($json, true);
    $dateFrom = $data['dateFrom'] ?? null;
    $dateTo = $data['dateTo'] ?? null;

    if (!$this->isValidDate($dateFrom) || !$this->isValidDate($dateTo) || $dateFrom > $dateTo) {
      http_response_code(400);
      return json_encode(["success" => false, "message" => "Enter a valid report date range."]);
    }

    include __DIR__ . "/../api/connection-pdo.php";

    $sql = "SELECT activity.activity_id, activity.activity_type, activity.shift_id,
        activity.terminal_id, activity.terminal_name, activity.activity_at, activity.amount,
        activity.reason, activity.details_json, activity.cashier_user_id, activity.cashier,
        activity.supervisor_user_id, activity.supervisor, activity.status,
        activity.shift_status, activity.opened_at, activity.closed_at, activity.starting_cash,
        activity.expected_cash, activity.cashier_count, activity.opening_supervisor_user_id,
        activity.opening_supervisor, activity.closing_supervisor_user_id,
        activity.closing_supervisor, activity.supervisor_count
        FROM (
          SELECT psa.action_id AS activity_id, psa.action_type AS activity_type,
            psa.shift_id, sh.terminal_id, t.terminal_name, psa.action_at AS activity_at,
            psa.amount, psa.reason, psa.details_json, psa.cashier_user_id,
            cashier.full_name AS cashier, psa.supervisor_user_id,
            supervisor.full_name AS supervisor, 'APPROVED' AS status,
            sh.status AS shift_status, sh.opened_at, sh.closed_at,
            sh.float_start AS starting_cash,
            COALESCE(sh.expected_cash, IFNULL(sh.float_start, 0)
              + IFNULL((SELECT SUM(CASE
                  WHEN movement.movement_type = 'FLOAT_ADJUST' THEN movement.amount
                  WHEN movement.movement_type = 'CASH_DROP' THEN -movement.amount
                  ELSE 0
                END)
                FROM shift_cash_movement movement
                WHERE movement.shift_id = sh.shift_id AND movement.status = 'APPROVED'), 0)
              + IFNULL((SELECT SUM(IFNULL(payment.amount_tendered, payment.amount)
                  - IFNULL(payment.change_amount, 0))
                FROM payments_hdr payment
                INNER JOIN payment_methods method
                  ON payment.payment_method_id = method.payment_method_id
                WHERE payment.shift_id = sh.shift_id AND UPPER(method.method_name) = 'CASH'), 0)
            ) AS expected_cash,
            sh.cashier_closing_cash AS cashier_count,
            sh.opening_supervisor_user_id,
            opening_supervisor.full_name AS opening_supervisor,
            sh.supervisor_user_id AS closing_supervisor_user_id,
            closing_supervisor.full_name AS closing_supervisor,
            sh.closing_cash AS supervisor_count
          FROM pos_supervisor_actions psa
          INNER JOIN shifts sh ON psa.shift_id = sh.shift_id
          LEFT JOIN tbl_pos_terminal t ON sh.terminal_id = t.terminal_id
          LEFT JOIN users cashier ON psa.cashier_user_id = cashier.user_id
          LEFT JOIN users supervisor ON psa.supervisor_user_id = supervisor.user_id
          LEFT JOIN users opening_supervisor ON sh.opening_supervisor_user_id = opening_supervisor.user_id
          LEFT JOIN users closing_supervisor ON sh.supervisor_user_id = closing_supervisor.user_id
          WHERE psa.action_type IN ('VOID_SALE', 'VOID_LINE', 'QUANTITY_REDUCE')
            AND DATE(psa.action_at) BETWEEN :voidDateFrom AND :voidDateTo

          UNION ALL

          SELECT movement.movement_id AS activity_id,
            CASE
              WHEN movement.movement_type = 'CASH_DROP' THEN 'CASH_DROP'
              WHEN movement.amount > 0 THEN 'FLOAT_ADD'
              ELSE 'FLOAT_REMOVE'
            END AS activity_type,
            movement.shift_id, sh.terminal_id, t.terminal_name,
            COALESCE(movement.approved_at, movement.created_at) AS activity_at,
            ABS(movement.amount) AS amount, movement.reason, NULL AS details_json,
            sh.user_id AS cashier_user_id, cashier.full_name AS cashier,
            movement.approved_by AS supervisor_user_id, supervisor.full_name AS supervisor,
            movement.status, sh.status AS shift_status, sh.opened_at, sh.closed_at,
            sh.float_start AS starting_cash,
            COALESCE(sh.expected_cash, IFNULL(sh.float_start, 0)
              + IFNULL((SELECT SUM(CASE
                  WHEN approved_movement.movement_type = 'FLOAT_ADJUST' THEN approved_movement.amount
                  WHEN approved_movement.movement_type = 'CASH_DROP' THEN -approved_movement.amount
                  ELSE 0
                END)
                FROM shift_cash_movement approved_movement
                WHERE approved_movement.shift_id = sh.shift_id
                  AND approved_movement.status = 'APPROVED'), 0)
              + IFNULL((SELECT SUM(IFNULL(payment.amount_tendered, payment.amount)
                  - IFNULL(payment.change_amount, 0))
                FROM payments_hdr payment
                INNER JOIN payment_methods method
                  ON payment.payment_method_id = method.payment_method_id
                WHERE payment.shift_id = sh.shift_id AND UPPER(method.method_name) = 'CASH'), 0)
            ) AS expected_cash,
            sh.cashier_closing_cash AS cashier_count,
            sh.opening_supervisor_user_id,
            opening_supervisor.full_name AS opening_supervisor,
            sh.supervisor_user_id AS closing_supervisor_user_id,
            closing_supervisor.full_name AS closing_supervisor,
            sh.closing_cash AS supervisor_count
          FROM shift_cash_movement movement
          INNER JOIN shifts sh ON movement.shift_id = sh.shift_id
          LEFT JOIN tbl_pos_terminal t ON sh.terminal_id = t.terminal_id
          LEFT JOIN users cashier ON sh.user_id = cashier.user_id
          LEFT JOIN users supervisor ON movement.approved_by = supervisor.user_id
          LEFT JOIN users opening_supervisor ON sh.opening_supervisor_user_id = opening_supervisor.user_id
          LEFT JOIN users closing_supervisor ON sh.supervisor_user_id = closing_supervisor.user_id
          WHERE movement.movement_type IN ('CASH_DROP', 'FLOAT_ADJUST')
            AND DATE(COALESCE(movement.approved_at, movement.created_at))
              BETWEEN :movementDateFrom AND :movementDateTo
        ) activity
        ORDER BY activity.activity_at DESC, activity.activity_id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(":voidDateFrom", $dateFrom);
    $stmt->bindValue(":voidDateTo", $dateTo);
    $stmt->bindValue(":movementDateFrom", $dateFrom);
    $stmt->bindValue(":movementDateTo", $dateTo);
    $stmt->execute();

    return json_encode(["activities" => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
  }
}

$operation = $_SERVER['REQUEST_METHOD'] == 'GET'
  ? ($_GET['operation'] ?? '')
  : ($_POST['operation'] ?? '');
$json = $_SERVER['REQUEST_METHOD'] == 'GET'
  ? ($_GET['json'] ?? "")
  : ($_POST['json'] ?? "");

if ($operation == "getPosActivityReport") {
  $report = new PosActivityReport();
  echo $report->getPosActivityReport($json);
}
