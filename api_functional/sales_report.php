<?php
require_once __DIR__ . "/../api/config-cors.php";

include "../api/session.php";

class SalesReport
{
  function getSalesReport($json)
  {
    include "../api/connection-pdo.php";

    $roleName = strtoupper(isset($_SESSION['role_name']) ? $_SESSION['role_name'] : "");

    if (!in_array($roleName, ['ADMIN', 'ACCOUNTING'], true)) {
      return json_encode([]);
    }

    $json = json_decode($json, true);
    $sql = "SELECT s.sales_id, s.sales_date, s.total_amount, s.status,
        CASE WHEN s.customer_id IS NULL THEN 'WALK_IN' ELSE 'AR' END AS sale_type,
        CASE WHEN s.status = 'VOID' OR i.status = 'VOID' THEN 'VOID' ELSE i.status END AS invoice_status,
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
        WHERE s.status IN ('COMPLETED', 'VOID') AND s.sales_date BETWEEN :dateFrom AND :dateTo
        ORDER BY s.sales_date DESC, s.sales_id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":dateFrom", $json['dateFrom']);
    $stmt->bindParam(":dateTo", $json['dateTo']);
    $stmt->bindParam(":collectionFrom", $json['dateFrom']);
    $stmt->bindParam(":collectionTo", $json['dateTo']);
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
    $stmt->bindParam(":dateFrom", $json['dateFrom']);
    $stmt->bindParam(":dateTo", $json['dateTo']);
    $stmt->execute();
    $collectionsInPeriod = (float) $stmt->fetchColumn();

    return json_encode([
      "sales" => $rs,
      "collections_in_period" => $collectionsInPeriod,
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

$salesReport = new SalesReport();
switch ($operation) {
  case "getSalesReport":
    echo $salesReport->getSalesReport($json);
    break;
}
