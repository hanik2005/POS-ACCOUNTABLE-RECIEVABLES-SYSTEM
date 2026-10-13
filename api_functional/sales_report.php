<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class SalesReport
{
  function getSalesReport($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $sql = "SELECT s.sales_id, s.sales_date, s.total_amount, s.status,
        c.customer_name, t.terminal_name, u.full_name AS cashier, i.invoice_number,
        IFNULL(pd.total_paid, 0) AS total_paid
        FROM sales_hdr s
        INNER JOIN customers c ON s.customer_id = c.customer_id
        INNER JOIN invoice i ON s.sales_id = i.sales_id
        LEFT JOIN tbl_pos_terminal t ON s.terminal_id = t.terminal_id
        LEFT JOIN users u ON s.created_by = u.user_id
        LEFT JOIN (
          SELECT invoice_id, SUM(amount_applied) AS total_paid
          FROM payments_dtl
          GROUP BY invoice_id
        ) pd ON i.invoice_id = pd.invoice_id
        WHERE s.status = 'COMPLETED' AND s.sales_date BETWEEN :dateFrom AND :dateTo
        ORDER BY s.sales_date DESC, s.sales_id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":dateFrom", $json['dateFrom']);
    $stmt->bindParam(":dateTo", $json['dateTo']);
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

$salesReport = new SalesReport();
switch ($operation) {
  case "getSalesReport":
    echo $salesReport->getSalesReport($json);
    break;
}
