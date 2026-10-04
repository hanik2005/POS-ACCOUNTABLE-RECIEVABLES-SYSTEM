<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

date_default_timezone_set('Asia/Manila');

include "../api/session.php";

class Payment
{
  function getPaymentMethods()
  {
    include "../api/connection-pdo.php";

    $sql = "SELECT payment_method_id, method_name
        FROM payment_methods
        WHERE status = 'ACTIVE'
        ORDER BY method_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
  }

  //1 = saved, 2 = amount is more than the balance
  function savePayment($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $header = $json['header'];
    $details = $json['details'];

    //payment date, empty reference and remarks are saved as null
    $paymentDate = date('Y-m-d');
    $reference = !empty($header['referenceNumber']) ? $header['referenceNumber'] : null;
    $remarks = !empty($header['remarks']) ? $header['remarks'] : null;

    $session = new Session();
    $userId = $session->getUserId();

    //paid and returned amounts of an invoice
    $paid = "IFNULL((SELECT SUM(amount_applied) FROM payments_dtl
        WHERE invoice_id = i.invoice_id), 0)";
    $returned = "IFNULL((SELECT SUM(total_amount) FROM sales_return_hdr
        WHERE sales_id = i.sales_id AND status = 'APPROVED'), 0)";

    try {
      $conn->beginTransaction();

      //a cashier with an open shift receives the payment in that shift
      $stmt = $conn->prepare("SELECT shift_id FROM shifts WHERE user_id = :userId AND status = 'OPEN' ORDER BY shift_id DESC LIMIT 1");
      $stmt->bindParam(":userId", $userId);
      $stmt->execute();
      $shiftId = $stmt->fetchColumn();
      $shiftId = $shiftId ? $shiftId : null;

      $stmt = $conn->prepare("SELECT IFNULL(MAX(payment_id), 0) + 1 FROM payments_hdr");
      $stmt->execute();
      $paymentNumber = sprintf("PAY-%s-%04d", date('Y'), $stmt->fetchColumn());

      $sql = "INSERT INTO payments_hdr(payment_number, customer_id, payment_method_id, shift_id, payment_date,
          amount, amount_tendered, change_amount, reference_number, remarks)
          VALUES(:paymentNumber, :customerId, :methodId, :shiftId, :paymentDate, :amount, :amountTendered, 0, :reference, :remarks)";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":paymentNumber", $paymentNumber);
      $stmt->bindParam(":customerId", $header['customerId']);
      $stmt->bindParam(":methodId", $header['paymentMethodId']);
      $stmt->bindParam(":shiftId", $shiftId);
      $stmt->bindParam(":paymentDate", $paymentDate);
      $stmt->bindParam(":amount", $header['amount']);
      $stmt->bindParam(":amountTendered", $header['amount']);
      $stmt->bindParam(":reference", $reference);
      $stmt->bindParam(":remarks", $remarks);
      $stmt->execute();

      $newId = $conn->lastInsertId();

      $sqlBalance = "SELECT GREATEST(0, i.amount_due - $paid - $returned)
          FROM invoice i
          WHERE i.invoice_id = :invoiceId";
      $stmtBalance = $conn->prepare($sqlBalance);

      $sqlDtl = "INSERT INTO payments_dtl(payment_id, invoice_id, amount_applied)
          VALUES(:paymentId, :invoiceId, :amountApplied)";
      $stmtDtl = $conn->prepare($sqlDtl);
      $sqlStatus = "UPDATE invoice i
          SET i.status = CASE
            WHEN i.amount_due - $paid - $returned <= 0 THEN 'PAID'
            WHEN $paid + $returned > 0 THEN 'PARTIAL'
            ELSE 'UNPAID'
          END
          WHERE i.invoice_id = :invoiceId";
      $stmtStatus = $conn->prepare($sqlStatus);
      foreach ($details as $row) {
        $stmtBalance->bindParam(":invoiceId", $row['invoiceId']);
        $stmtBalance->execute();
        if (round((float) $row['amountApplied'], 2) > round((float) $stmtBalance->fetchColumn(), 2)) {
          throw new Exception("balance");
        }

        $stmtDtl->bindParam(":paymentId", $newId);
        $stmtDtl->bindParam(":invoiceId", $row['invoiceId']);
        $stmtDtl->bindParam(":amountApplied", $row['amountApplied']);
        $stmtDtl->execute();

        $stmtStatus->bindParam(":invoiceId", $row['invoiceId']);
        $stmtStatus->execute();
      }
      //commit changes
      $conn->commit();
      $returnValue = 1;
    } catch (Exception $e) {
      $conn->rollBack();
      $returnValue = $e->getMessage() == "balance" ? 2 : 0;
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

$payment = new Payment();
switch ($operation) {
  case "getPaymentMethods":
    echo $payment->getPaymentMethods();
    break;
  case "savePayment":
    echo $payment->savePayment($json);
    break;
}