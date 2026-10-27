<?php
require_once __DIR__ . "/../api/config-cors.php";

date_default_timezone_set('Asia/Manila');

include "../api/session.php";

class Invoice
{
  function getAllInvoices()
  {
    include "../api/connection-pdo.php";

    if (!in_array(strtoupper($_SESSION['role_name'] ?? ''), ['ADMIN', 'ACCOUNTING'], true)) {
      return json_encode([]);
    }

    $sql = "SELECT i.*, s.sales_date, s.customer_id, c.customer_name,
        IFNULL(pd.total_paid, 0) AS total_paid,
        GREATEST(0, i.amount_due - IFNULL(pd.total_paid, 0)) AS balance,
        DATEDIFF(CURDATE(), i.due_date) AS days_past_due
        FROM invoice i
        INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN (
          SELECT invoice_id, SUM(amount_applied) AS total_paid
          FROM payments_dtl
          GROUP BY invoice_id
        ) pd ON i.invoice_id = pd.invoice_id
        WHERE i.status IN ('UNPAID', 'PARTIAL')
        HAVING balance > 0
        ORDER BY i.invoice_id DESC";
    $stmt = $conn->prepare($sql);
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

$invoice = new Invoice();
switch ($operation) {
  case "getAllInvoices":
    echo $invoice->getAllInvoices();
    break;
}
