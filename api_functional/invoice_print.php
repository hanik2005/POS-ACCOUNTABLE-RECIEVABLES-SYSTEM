<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

date_default_timezone_set('Asia/Manila');

include "../api/session.php";

class InvoicePrint
{
  function getInvoicePrint($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $sql = "SELECT s.sales_id, s.sales_date, s.total_amount,
        c.customer_name, c.address, g.days_name,
        u.full_name AS cashier, t.terminal_name,
        i.invoice_id, i.invoice_number, i.due_date, i.amount_due
        FROM sales_hdr s
        INNER JOIN customers c ON s.customer_id = c.customer_id
        INNER JOIN group_days g ON c.group_days_id = g.id
        INNER JOIN invoice i ON s.sales_id = i.sales_id
        LEFT JOIN users u ON s.created_by = u.user_id
        LEFT JOIN tbl_pos_terminal t ON s.terminal_id = t.terminal_id
        WHERE s.sales_id = :salesId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":salesId", $json['salesId']);
    $stmt->execute();
    $sale = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$sale) {
      return json_encode(0);
    }

    $sql = "SELECT p.product_name, d.quantity, d.unit_price, d.line_total
        FROM sales_dtl d
        INNER JOIN products p ON d.product_id = p.product_id
        WHERE d.sales_id = :salesId
        ORDER BY d.sales_detail_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":salesId", $json['salesId']);
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sql = "SELECT m.method_name, h.amount_tendered, h.change_amount, h.reference_number, d.amount_applied
        FROM payments_dtl d
        INNER JOIN payments_hdr h ON d.payment_id = h.payment_id
        INNER JOIN payment_methods m ON h.payment_method_id = m.payment_method_id
        WHERE d.invoice_id = :invoiceId
        ORDER BY d.payment_detail_id";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":invoiceId", $sale['invoice_id']);
    $stmt->execute();
    $payments = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode([
      "sale" => $sale,
      "items" => $items,
      "payments" => $payments
    ]);
  }

  function saveInvoiceFile($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $returnValue = 0;

    $sql = "SELECT invoice_id FROM invoice WHERE invoice_number = :invoiceNumber";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":invoiceNumber", $json['invoiceNumber']);
    $stmt->execute();

    $file = isset($_FILES['file']) ? $_FILES['file'] : null;

    if ($stmt->fetchColumn() !== false && $file && $file['error'] == UPLOAD_ERR_OK && $file['size'] <= 2097152) {
      $folder = $this->getFolder();
      $isPdf = file_get_contents($file['tmp_name'], false, null, 0, 4) === "%PDF";

      if ($isPdf && (is_dir($folder) || mkdir($folder, 0777, true))) {
        $filePath = $folder . $this->getFileName($json['invoiceNumber']);

        if (file_exists($filePath) || move_uploaded_file($file['tmp_name'], $filePath)) {
          $returnValue = 1;
        }
      }
    }
    return json_encode($returnValue);
  }

  function getFolder()
  {
    return __DIR__ . "/../invoices/";
  }

  function getFileName($invoiceNumber)
  {
    return preg_replace('/[^A-Za-z0-9_-]/', '', $invoiceNumber) . ".pdf";
  }
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  $operation = $_GET['operation'];
  $json = isset($_GET['json']) ? $_GET['json'] : "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $operation = $_POST['operation'];
  $json = isset($_POST['json']) ? $_POST['json'] : "";
}

$invoicePrint = new InvoicePrint();
switch ($operation) {
  case "getInvoicePrint":
    echo $invoicePrint->getInvoicePrint($json);
    break;
  case "saveInvoiceFile":
    echo $invoicePrint->saveInvoiceFile($json);
    break;
}