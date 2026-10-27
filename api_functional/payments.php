<?php
require_once __DIR__ . "/../api/config-cors.php";

date_default_timezone_set('Asia/Manila');

include "../api/session.php";

class Payment
{
  function getPaymentMethods()
  {
    include "../api/connection-pdo.php";

    if (strtoupper($_SESSION['role_name'] ?? '') != 'ACCOUNTING') {
      return json_encode([]);
    }

    $sql = "SELECT payment_method_id, method_name
        FROM payment_methods
        WHERE status = 'ACTIVE'
        ORDER BY method_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
  }

  function savePayment($json)
  {
    include "../api/connection-pdo.php";

    if (strtoupper($_SESSION['role_name'] ?? '') != 'ACCOUNTING') {
      return json_encode(3);
    }

    $json = json_decode($json, true);

    $header = $json['header'];
    $details = $json['details'];
    if (empty($header['customerId']) || empty($header['paymentMethodId']) || !is_array($details) || count($details) === 0) return json_encode(0);

    $tenderedCents = (int) round((float) ($header['amountTendered'] ?? $header['amount'] ?? 0) * 100);
    $declaredAppliedCents = (int) round((float) ($header['amount'] ?? 0) * 100);
    if ($tenderedCents <= 0 || $declaredAppliedCents <= 0) return json_encode(0);

    $reference = !empty($header['referenceNumber']) ? $header['referenceNumber'] : null;
    $remarks = !empty($header['remarks']) ? $header['remarks'] : null;

    $session = new Session();
    $userId = $session->getUserId();

    $paid = "IFNULL((SELECT SUM(amount_applied) FROM payments_dtl
        WHERE invoice_id = i.invoice_id), 0)";
    try {
      $conn->beginTransaction();
      $stmt = $conn->prepare("SELECT shift_id FROM shifts WHERE user_id = :userId AND status = 'OPEN' ORDER BY shift_id DESC LIMIT 1");
      $stmt->bindParam(":userId", $userId);
      $stmt->execute();
      $shiftId = $stmt->fetchColumn();
      $shiftId = $shiftId ? $shiftId : null;

      $stmt = $conn->prepare("SELECT method_name FROM payment_methods WHERE payment_method_id = :methodId AND status = 'ACTIVE'");
      $stmt->bindParam(":methodId", $header['paymentMethodId']);
      $stmt->execute();
      $methodName = $stmt->fetchColumn();
      if (!$methodName) throw new Exception("method");
      $isCash = strtoupper(trim($methodName)) === 'CASH';

      $stmt = $conn->prepare("SELECT IFNULL(MAX(payment_id), 0) + 1 FROM payments_hdr");
      $stmt->execute();
      $paymentNumber = sprintf("PAY-%s-%04d", date('Y'), $stmt->fetchColumn());

      $appliedTotalCents = 0;
      foreach ($details as $row) {
        $applied = round((float) ($row['amountApplied'] ?? 0), 2);
        if (empty($row['invoiceId']) || $applied <= 0) throw new Exception("details");
        $appliedTotalCents += (int) round($applied * 100);
      }
      if (
        $appliedTotalCents !== $declaredAppliedCents ||
        $tenderedCents < $appliedTotalCents ||
        (!$isCash && $tenderedCents !== $appliedTotalCents)
      ) {
        throw new Exception("amount");
      }

      $appliedTotal = $appliedTotalCents / 100;
      $tendered = $tenderedCents / 100;
      $changeAmount = $isCash ? round($tendered - $appliedTotal, 2) : 0;

      $sql = "INSERT INTO payments_hdr(payment_number, customer_id, payment_method_id, shift_id, created_by, payment_date,
          amount, amount_tendered, change_amount, reference_number, remarks)
          VALUES(:paymentNumber, :customerId, :methodId, :shiftId, :createdBy, :paymentDate, :amount, :amountTendered, :changeAmount, :reference, :remarks)";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":paymentNumber", $paymentNumber);
      $stmt->bindParam(":customerId", $header['customerId']);
      $stmt->bindParam(":methodId", $header['paymentMethodId']);
      $stmt->bindParam(":shiftId", $shiftId);
      $stmt->bindParam(":createdBy", $userId);
      $paymentDate = date('Y-m-d');
      $stmt->bindParam(":paymentDate", $paymentDate);
      $stmt->bindParam(":amount", $appliedTotal);
      $stmt->bindParam(":amountTendered", $tendered);
      $stmt->bindParam(":changeAmount", $changeAmount);
      $stmt->bindParam(":reference", $reference);
      $stmt->bindParam(":remarks", $remarks);
      $stmt->execute();

      $newId = $conn->lastInsertId();

      $sqlBalance = "SELECT GREATEST(0, i.amount_due - $paid)
          FROM invoice i
          INNER JOIN sales_hdr s ON s.sales_id = i.sales_id
          WHERE i.invoice_id = :invoiceId AND s.customer_id = :customerId
            AND s.status = 'COMPLETED' AND i.status IN ('UNPAID', 'PARTIAL')
          FOR UPDATE";
      $stmtBalance = $conn->prepare($sqlBalance);

      $sqlDtl = "INSERT INTO payments_dtl(payment_id, invoice_id, amount_applied)
          VALUES(:paymentId, :invoiceId, :amountApplied)";
      $stmtDtl = $conn->prepare($sqlDtl);
      $sqlStatus = "UPDATE invoice i
          SET i.status = CASE
            WHEN i.amount_due - $paid <= 0 THEN 'PAID'
            WHEN $paid > 0 THEN 'PARTIAL'
            ELSE 'UNPAID'
          END
          WHERE i.invoice_id = :invoiceId";
      $stmtStatus = $conn->prepare($sqlStatus);
      foreach ($details as $row) {
        $stmtBalance->bindParam(":invoiceId", $row['invoiceId']);
        $stmtBalance->bindParam(":customerId", $header['customerId']);
        $stmtBalance->execute();
        $balance = $stmtBalance->fetchColumn();
        if ($balance === false || round((float) $row['amountApplied'], 2) > round((float) $balance, 2)) {
          throw new Exception("balance");
        }

        $stmtDtl->bindParam(":paymentId", $newId);
        $stmtDtl->bindParam(":invoiceId", $row['invoiceId']);
        $stmtDtl->bindParam(":amountApplied", $row['amountApplied']);
        $stmtDtl->execute();

        $stmtStatus->bindParam(":invoiceId", $row['invoiceId']);
        $stmtStatus->execute();
      }
      $conn->commit();
      $returnValue = 1;
    } catch (Exception $e) {
      error_log("AR payment save failed: " . $e->getMessage());
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }
      $returnValue = $e->getMessage() == "balance" ? 2 : 0;
    }
    return json_encode($returnValue);
  }
}

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
