<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

class Invoice
{
  function saveInvoice($json)
  {
    include "connection-pdo.php";

    $json = json_decode($json, true);

    //get header and details data separately
    $header = $json['header'];
    $details = $json['details'];

    try {
      $conn->beginTransaction();

      //save the header
      $sql = "INSERT INTO tbl_invoice_header(hdr_student_id, hdr_date, hdr_user_id, hdr_total_amount)
          VALUES(:studentId, :invoiceDate, :userId, :amount)";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":studentId", $header['studentId']);
      $stmt->bindParam(":invoiceDate", $header['invoiceDate']);
      $stmt->bindParam(":userId", $header['userId']);
      $stmt->bindParam(":amount", $header['amount']);
      $stmt->execute();
      //get the newly inserted record's Auto-Increment value
      $newId = $conn->lastInsertId();

      //iterate thru the details array and save each record
      //which now includes the header id
      $sqlDtl = "INSERT INTO tbl_invoice_details(dtl_header_id, dtl_product_id, dtl_price,
          dtl_qty, dtl_amount) VALUES(:headerId, :productId, :price, :qty, :amount)
        ";
      $stmtDtl = $conn->prepare($sqlDtl);
      foreach ($details as $row) {
        $stmtDtl->bindParam(":headerId", $newId);
        $stmtDtl->bindParam(":productId", $row['productId']);
        $stmtDtl->bindParam(":price", $row['productPrice']);
        $stmtDtl->bindParam(":qty", $row['qty']);
        $stmtDtl->bindParam(":amount", $row['amount']);
        $stmtDtl->execute();
      }
      //commit changes
      $conn->commit();
      $returnValue = 1;
    } catch (Exception $e) {
      $conn->rollBack();
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }
}

//submitted by the client - operation and json
if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  $operation = $_GET['operation'];
  $json = isset($_GET['json']) ? $_GET['json'] : "";
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $operation = $_POST['operation'];
  $json = isset($_POST['json']) ? $_POST['json'] : "";
}

$invoice = new Invoice();
switch ($operation) {
  case "saveInvoice":
    echo $invoice->saveInvoice($json);
    break;
}
