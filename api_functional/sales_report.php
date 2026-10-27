<?php
require_once __DIR__ . "/../api/config-cors.php";

include "../api/session.php";

class SalesReport
{
  function isValidDate($value)
  {
    if (!is_string($value) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
      return false;
    }

    [$year, $month, $day] = array_map('intval', explode('-', $value));

    return checkdate($month, $day, $year);
  }

  function getSalesReport($json)
  {
    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");

    if (!in_array($roleName, ['ADMIN', 'ACCOUNTING', 'SUPERVISOR'], true)) {
      return json_encode([]);
    }

    $data = json_decode($json, true);
    $dateFrom = $data['dateFrom'] ?? null;
    $dateTo = $data['dateTo'] ?? null;

    if (!$this->isValidDate($dateFrom) || !$this->isValidDate($dateTo) || $dateFrom > $dateTo) {
      http_response_code(400);
      return json_encode(["success" => false, "message" => "Enter a valid report date range."]);
    }

    include __DIR__ . "/../api/connection-pdo.php";

    $sql = "SELECT s.sales_id, s.sales_date, s.total_amount, s.status,
        CASE WHEN s.customer_id IS NULL THEN 'WALK_IN' ELSE 'AR' END AS sale_type,
        COALESCE(c.customer_name, 'Walk-in customer') AS customer_name,
        t.terminal_name, u.full_name AS cashier, i.invoice_number,
        IFNULL(pay.paid_at_pos, 0) AS paid_at_pos,
        CASE WHEN s.status = 'COMPLETED' AND s.customer_id IS NOT NULL
          THEN GREATEST(s.total_amount - IFNULL(pay.paid_at_pos, 0), 0)
          ELSE 0 END AS charged_to_ar,
        CASE WHEN s.status = 'COMPLETED' AND s.customer_id IS NOT NULL
          THEN IFNULL(pay.collected_in_period, 0)
          ELSE 0 END AS collected_in_period,
        CASE WHEN s.status = 'COMPLETED' AND s.customer_id IS NOT NULL
          THEN GREATEST(s.total_amount - IFNULL(pay.total_paid, 0), 0)
          ELSE 0 END AS current_balance
        FROM sales_hdr s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN invoice i ON s.sales_id = i.sales_id
        LEFT JOIN tbl_pos_terminal t ON s.terminal_id = t.terminal_id
        LEFT JOIN users u ON s.created_by = u.user_id
        LEFT JOIN (
          SELECT d.invoice_id,
            SUM(d.amount_applied) AS total_paid,
            SUM(CASE WHEN p.remarks = 'Paid at POS' THEN d.amount_applied ELSE 0 END) AS paid_at_pos,
            SUM(CASE WHEN (p.remarks IS NULL OR p.remarks <> 'Paid at POS')
              AND DATE(p.payment_date) BETWEEN :collectionFrom AND :collectionTo
              THEN d.amount_applied ELSE 0 END) AS collected_in_period
          FROM payments_hdr p
          INNER JOIN payments_dtl d ON p.payment_id = d.payment_id
          GROUP BY d.invoice_id
        ) pay ON i.invoice_id = pay.invoice_id
        WHERE s.status = 'COMPLETED' AND (i.status IS NULL OR i.status <> 'VOID')
          AND s.sales_date BETWEEN :dateFrom AND :dateTo
        ORDER BY s.sales_date DESC, s.sales_id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(":dateFrom", $dateFrom);
    $stmt->bindValue(":dateTo", $dateTo);
    $stmt->bindValue(":collectionFrom", $dateFrom);
    $stmt->bindValue(":collectionTo", $dateTo);
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sql = "SELECT IFNULL(SUM(d.amount_applied), 0)
        FROM payments_hdr p
        INNER JOIN payments_dtl d ON p.payment_id = d.payment_id
        INNER JOIN invoice i ON d.invoice_id = i.invoice_id
        INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
        WHERE s.customer_id IS NOT NULL AND s.status = 'COMPLETED'
          AND i.status <> 'VOID'
          AND (p.remarks IS NULL OR p.remarks <> 'Paid at POS')
          AND DATE(p.payment_date) BETWEEN :dateFrom AND :dateTo";
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(":dateFrom", $dateFrom);
    $stmt->bindValue(":dateTo", $dateTo);
    $stmt->execute();
    $collectionsInPeriod = (float) $stmt->fetchColumn();

    $sql = "SELECT psa.action_id, psa.shift_id, psa.reason, psa.amount, psa.action_at,
        t.terminal_name, cashier.full_name AS cashier, supervisor.full_name AS supervisor
        FROM pos_supervisor_actions psa
        INNER JOIN shifts sh ON psa.shift_id = sh.shift_id
        INNER JOIN users cashier ON psa.cashier_user_id = cashier.user_id
        INNER JOIN users supervisor ON psa.supervisor_user_id = supervisor.user_id
        LEFT JOIN tbl_pos_terminal t ON sh.terminal_id = t.terminal_id
        WHERE psa.action_type = 'VOID_SALE' AND DATE(psa.action_at) BETWEEN :dateFrom AND :dateTo
        ORDER BY psa.action_at DESC, psa.action_id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(":dateFrom", $dateFrom);
    $stmt->bindValue(":dateTo", $dateTo);
    $stmt->execute();
    $voidSaleActions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sql = "SELECT COUNT(*) AS void_line_count, IFNULL(SUM(amount), 0) AS void_line_amount
        FROM pos_supervisor_actions
        WHERE action_type = 'VOID_LINE' AND DATE(action_at) BETWEEN :dateFrom AND :dateTo";
    $stmt = $conn->prepare($sql);
    $stmt->bindValue(":dateFrom", $dateFrom);
    $stmt->bindValue(":dateTo", $dateTo);
    $stmt->execute();
    $voidLineSummary = $stmt->fetch(PDO::FETCH_ASSOC);

    return json_encode([
      "sales" => $rs,
      "collections_in_period" => $collectionsInPeriod,
      "void_sale_actions" => $voidSaleActions,
      "void_line_count" => (int) $voidLineSummary['void_line_count'],
      "void_line_amount" => (float) $voidLineSummary['void_line_amount'],
    ]);
  }
}
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  $operation = $_GET['operation'] ?? '';
  $json = $_GET['json'] ?? "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $operation = $_POST['operation'] ?? '';
  $json = $_POST['json'] ?? "";
}

$salesReport = new SalesReport();
switch ($operation) {
  case "getSalesReport":
    echo $salesReport->getSalesReport($json);
    break;
}
