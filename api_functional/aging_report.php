<?php
require_once __DIR__ . "/../api/config-cors.php";

include "../api/session.php";

class AgingReport
{
  function getAgingReport()
  {
    include "../api/connection-pdo.php";

    $roleName = strtoupper($_SESSION['role_name'] ?? "");

    if (!in_array($roleName, ['ADMIN', 'ACCOUNTING'], true)) {
      return json_encode([]);
    }

    $sql = "SELECT c.customer_id, c.customer_name, i.invoice_id, i.invoice_number,
        i.due_date, s.sales_date, i.amount_due,
        IFNULL(pd.total_paid, 0) AS total_paid,
        GREATEST(0, i.amount_due - IFNULL(pd.total_paid, 0)) AS balance,
        DATEDIFF(CURDATE(), i.due_date) AS days_past_due
        FROM invoice i
        INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
        INNER JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN (
          SELECT invoice_id, SUM(amount_applied) AS total_paid
          FROM payments_dtl
          GROUP BY invoice_id
        ) pd ON pd.invoice_id = i.invoice_id
        WHERE s.status = 'COMPLETED' AND i.status IN ('UNPAID', 'PARTIAL')
        HAVING balance > 0
        ORDER BY c.customer_name, i.due_date, i.invoice_id";
    $stmt = $conn->prepare($sql);
    $stmt->execute();

    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
  }
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  $operation = $_GET['operation'] ?? '';
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $operation = $_POST['operation'] ?? '';
} else {
  $operation = '';
}

$report = new AgingReport();

switch ($operation) {
  case "getAgingReport":
    echo $report->getAgingReport();
    break;
}
