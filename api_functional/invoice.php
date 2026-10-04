<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

date_default_timezone_set('Asia/Manila');

class Invoice
{
  function getAllInvoices()
  {
    include "../api/connection-pdo.php";

    $sql = "SELECT i.*, s.sales_date, s.customer_id, c.customer_name,
        IFNULL(pd.total_paid, 0) AS total_paid,
        IFNULL(r.total_returned, 0) AS total_returned,
        GREATEST(0, i.amount_due - IFNULL(pd.total_paid, 0) - IFNULL(r.total_returned, 0)) AS balance
        FROM invoice i
        INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN (
          SELECT invoice_id, SUM(amount_applied) AS total_paid
          FROM payments_dtl
          GROUP BY invoice_id
        ) pd ON i.invoice_id = pd.invoice_id
        LEFT JOIN (
          SELECT sales_id, SUM(total_amount) AS total_returned
          FROM sales_return_hdr
          WHERE status = 'APPROVED'
          GROUP BY sales_id
        ) r ON i.sales_id = r.sales_id
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