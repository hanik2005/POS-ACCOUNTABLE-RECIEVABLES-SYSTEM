<?php
require_once __DIR__ . "/../api/config-cors.php";

include "../api/session.php";

class CreditLimitReport
{
  function getCreditLimitReport()
  {
    include "../api/connection-pdo.php";

    $roleName = strtoupper($_SESSION['role_name'] ?? "");

    if (!in_array($roleName, ['ADMIN', 'ACCOUNTING'], true)) {
      return json_encode([]);
    }

    $sql = "SELECT c.customer_id, c.customer_name, c.credit_limit, c.status,
        IFNULL(ar.outstanding_balance, 0) AS outstanding_balance,
        GREATEST(c.credit_limit - IFNULL(ar.outstanding_balance, 0), 0) AS available_credit,
        GREATEST(IFNULL(ar.outstanding_balance, 0) - c.credit_limit, 0) AS over_limit_amount,
        CASE
          WHEN IFNULL(ar.outstanding_balance, 0) > c.credit_limit THEN 'OVER LIMIT'
          WHEN c.credit_limit = 0 AND IFNULL(ar.outstanding_balance, 0) = 0 THEN 'NO CREDIT'
          WHEN IFNULL(ar.outstanding_balance, 0) >= c.credit_limit THEN 'LIMIT REACHED'
          ELSE 'AVAILABLE'
        END AS credit_status
        FROM customers c
        LEFT JOIN (
          SELECT s.customer_id, SUM(GREATEST(i.amount_due - IFNULL(pd.total_paid, 0), 0)) AS outstanding_balance
          FROM sales_hdr s
          INNER JOIN invoice i ON i.sales_id = s.sales_id
          LEFT JOIN (
            SELECT invoice_id, SUM(amount_applied) AS total_paid
            FROM payments_dtl
            GROUP BY invoice_id
          ) pd ON pd.invoice_id = i.invoice_id
          WHERE s.status = 'COMPLETED'
          GROUP BY s.customer_id
        ) ar ON ar.customer_id = c.customer_id
        ORDER BY c.customer_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();

    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
  }
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  $operation = $_GET['operation'];
  $json = isset($_GET['json']) ? $_GET['json'] : "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $operation = $_POST['operation'];
  $json = isset($_POST['json']) ? $_POST['json'] : "";
}
$report = new CreditLimitReport();
switch ($operation) {
  case "getCreditLimitReport":
    echo $report->getCreditLimitReport();
    break;
}
