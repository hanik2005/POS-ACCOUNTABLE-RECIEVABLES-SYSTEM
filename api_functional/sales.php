<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

date_default_timezone_set('Asia/Manila');

//session.php starts the session
include "../api/session.php";

class Sales
{
  function getPosOptions()
  {
    include "../api/connection-pdo.php";

    //customers with their credit terms, every customer has days due
    $sql = "SELECT c.customer_id, c.customer_name, c.credit_limit, g.days_name
        FROM customers c
        INNER JOIN group_days g ON c.group_days_id = g.id
        WHERE c.status = 'ACTIVE'
        ORDER BY c.customer_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    //active products
    $sql = "SELECT product_id, barcode, product_name, unit_price
        FROM products
        WHERE status = 'ACTIVE'
        ORDER BY product_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

    //active payment methods (the customer can pay right away)
    $sql = "SELECT payment_method_id, method_name
        FROM payment_methods
        WHERE status = 'ACTIVE'
        ORDER BY payment_method_id";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $paymentMethods = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode([
      "customers" => $customers,
      "products" => $products,
      "paymentMethods" => $paymentMethods
    ]);
  }

  //status: HOLD (customer will come back) or COMPLETED (checkout, goes directly to Accounts Receivable)
  //header.payment: the customer pays right away, the invoice is paid and the change comes from the cash drawer
  function insertSale($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    //get header and details data separately
    $header = $json['header'];
    $details = $json['details'];

    //the cashier is the logged-in user (from the session)
    $session = new Session();
    $userId = $session->getUserId();

    //a held sale may not have a customer yet, a completed sale must have one
    $customerId = !empty($header['customerId']) ? $header['customerId'] : null;
    $recallId = !empty($header['recallId']) ? $header['recallId'] : null;
    $salesDate = date('Y-m-d');

    try {
      $conn->beginTransaction();

      //the open shift of the cashier tells the shift and the terminal of the sale
      $sql = "SELECT shift_id, terminal_id
          FROM shifts
          WHERE user_id = :userId AND status = 'OPEN'
          ORDER BY shift_id DESC
          LIMIT 1";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":userId", $userId);
      $stmt->execute();
      $shift = $stmt->fetch(PDO::FETCH_ASSOC);
      $shiftId = $shift ? $shift['shift_id'] : null;
      $terminalId = $shift ? $shift['terminal_id'] : null;

      //save the header
      $sql = "INSERT INTO sales_hdr(customer_id, terminal_id, shift_id, sales_date, total_amount, created_by, status)
          VALUES(:customerId, :terminalId, :shiftId, :salesDate, :amount, :userId, :status)";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":customerId", $customerId);
      $stmt->bindParam(":terminalId", $terminalId);
      $stmt->bindParam(":shiftId", $shiftId);
      $stmt->bindParam(":salesDate", $salesDate);
      $stmt->bindParam(":amount", $header['amount']);
      $stmt->bindParam(":userId", $userId);
      $stmt->bindParam(":status", $header['status']);
      $stmt->execute();
      //get the newly inserted record's Auto-Increment value
      $newId = $conn->lastInsertId();

      //iterate thru the details array and save each record
      //which now includes the header id
      $sqlDtl = "INSERT INTO sales_dtl(sales_id, product_id, quantity, unit_price, line_total)
          VALUES(:salesId, :productId, :qty, :price, :amount)";
      $stmtDtl = $conn->prepare($sqlDtl);
      foreach ($details as $row) {
        $stmtDtl->bindParam(":salesId", $newId);
        $stmtDtl->bindParam(":productId", $row['productId']);
        $stmtDtl->bindParam(":qty", $row['qty']);
        $stmtDtl->bindParam(":price", $row['productPrice']);
        $stmtDtl->bindParam(":amount", $row['amount']);
        $stmtDtl->execute();
      }

      //a completed sale goes directly to Accounts Receivable
      if ($header['status'] == 'COMPLETED') {
        //due date = sales date + the days due of the customer
        $sql = "SELECT g.days_due
            FROM customers c
            INNER JOIN group_days g ON c.group_days_id = g.id
            WHERE c.customer_id = :customerId";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":customerId", $customerId);
        $stmt->execute();
        $daysDue = $stmt->fetchColumn();

        //no customer or no days due: the sale cannot be completed
        if ($daysDue === false) {
          throw new Exception("The customer has no days due.");
        }

        $dueDate = date('Y-m-d', strtotime($salesDate . " +" . (int) $daysDue . " days"));

        //invoice number
        $stmt = $conn->prepare("SELECT IFNULL(MAX(invoice_id), 0) + 1 FROM invoice");
        $stmt->execute();
        $invoiceNumber = sprintf("INV-%s-%04d", date('Y'), $stmt->fetchColumn());

        //the customer pays right away: the invoice is created already paid
        $payment = !empty($header['payment']) ? $header['payment'] : null;
        $invoiceStatus = $payment ? 'PAID' : 'UNPAID';

        $sql = "INSERT INTO invoice(sales_id, invoice_number, due_date, amount_due, status)
            VALUES(:salesId, :invoiceNumber, :dueDate, :amountDue, :invoiceStatus)";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":salesId", $newId);
        $stmt->bindParam(":invoiceNumber", $invoiceNumber);
        $stmt->bindParam(":dueDate", $dueDate);
        $stmt->bindParam(":amountDue", $header['amount']);
        $stmt->bindParam(":invoiceStatus", $invoiceStatus);
        $stmt->execute();
        $invoiceId = $conn->lastInsertId();

        if ($payment) {
          $stmt = $conn->prepare("SELECT method_name FROM payment_methods WHERE payment_method_id = :methodId AND status = 'ACTIVE'");
          $stmt->bindParam(":methodId", $payment['paymentMethodId']);
          $stmt->execute();
          $methodName = $stmt->fetchColumn();

          if ($methodName === false) {
            throw new Exception("Invalid payment method.");
          }

          //only cash can be more than the total, the difference is the change from the cash drawer
          $total = round((float) $header['amount'], 2);
          $amountTendered = strtoupper($methodName) == 'CASH' ? round((float) $payment['amountTendered'], 2) : $total;
          $changeAmount = round($amountTendered - $total, 2);

          if ($changeAmount < 0) {
            throw new Exception("The payment is less than the total.");
          }

          $reference = !empty($payment['referenceNumber']) ? $payment['referenceNumber'] : null;
          $remarks = "Paid at POS";

          $stmt = $conn->prepare("SELECT IFNULL(MAX(payment_id), 0) + 1 FROM payments_hdr");
          $stmt->execute();
          $paymentNumber = sprintf("PAY-%s-%04d", date('Y'), $stmt->fetchColumn());

          $sql = "INSERT INTO payments_hdr(payment_number, customer_id, payment_method_id, shift_id, payment_date,
              amount, amount_tendered, change_amount, reference_number, remarks)
              VALUES(:paymentNumber, :customerId, :methodId, :shiftId, :paymentDate, :amount, :amountTendered, :changeAmount, :reference, :remarks)";
          $stmt = $conn->prepare($sql);
          $stmt->bindParam(":paymentNumber", $paymentNumber);
          $stmt->bindParam(":customerId", $customerId);
          $stmt->bindParam(":methodId", $payment['paymentMethodId']);
          $stmt->bindParam(":shiftId", $shiftId);
          $stmt->bindParam(":paymentDate", $salesDate);
          $stmt->bindParam(":amount", $total);
          $stmt->bindParam(":amountTendered", $amountTendered);
          $stmt->bindParam(":changeAmount", $changeAmount);
          $stmt->bindParam(":reference", $reference);
          $stmt->bindParam(":remarks", $remarks);
          $stmt->execute();
          $paymentId = $conn->lastInsertId();

          $sql = "INSERT INTO payments_dtl(payment_id, invoice_id, amount_applied)
              VALUES(:paymentId, :invoiceId, :amountApplied)";
          $stmt = $conn->prepare($sql);
          $stmt->bindParam(":paymentId", $paymentId);
          $stmt->bindParam(":invoiceId", $invoiceId);
          $stmt->bindParam(":amountApplied", $total);
          $stmt->execute();
        }
      }

      //a recalled held sale is replaced by the new sale
      if ($recallId) {
        $sql = "DELETE d FROM sales_dtl d
            INNER JOIN sales_hdr h ON d.sales_id = h.sales_id
            WHERE h.sales_id = :recallId AND h.status = 'HOLD'";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":recallId", $recallId);
        $stmt->execute();

        $sql = "DELETE FROM sales_hdr WHERE sales_id = :recallId AND status = 'HOLD'";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":recallId", $recallId);
        $stmt->execute();
      }

      //commit changes, return the new sales id
      $conn->commit();
      $returnValue = (int) $newId;
    } catch (Exception $e) {
      $conn->rollBack();
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }

  //held sales of the logged-in cashier
  function getHeldSales()
  {
    include "../api/connection-pdo.php";

    $session = new Session();
    $userId = $session->getUserId();

    $sql = "SELECT s.sales_id, s.total_amount, s.customer_id, c.customer_name,
        (SELECT IFNULL(SUM(d.quantity), 0) FROM sales_dtl d WHERE d.sales_id = s.sales_id) AS item_count
        FROM sales_hdr s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        WHERE s.status = 'HOLD' AND s.created_by = :userId
        ORDER BY s.sales_id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
  }

  //the lines of a held sale
  function getHeldSale($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $sql = "SELECT d.product_id, p.product_name, d.unit_price, d.quantity, d.line_total
        FROM sales_dtl d
        INNER JOIN products p ON d.product_id = p.product_id
        WHERE d.sales_id = :salesId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":salesId", $json['salesId']);
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
  }

  function voidSale($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $sql = "UPDATE sales_hdr SET status = 'VOID' WHERE sales_id = :salesId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":salesId", $json['salesId']);
    $stmt->execute();

    $returnValue = 0;
    if ($stmt->rowCount() > 0) {
      $returnValue = 1;
    }
    return json_encode($returnValue);
  }

  //completed sales with their invoice (used by the sales return page)
  function getAllSales()
  {
    include "../api/connection-pdo.php";

    $sql = "SELECT s.*, c.customer_name, i.invoice_number
        FROM sales_hdr s
        INNER JOIN customers c ON s.customer_id = c.customer_id
        INNER JOIN invoice i ON s.sales_id = i.sales_id
        WHERE s.status = 'COMPLETED'
        ORDER BY s.sales_id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
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

$sales = new Sales();
switch ($operation) {
  case "getPosOptions":
    echo $sales->getPosOptions();
    break;
  case "insertSale":
    echo $sales->insertSale($json);
    break;
  case "getHeldSales":
    echo $sales->getHeldSales();
    break;
  case "getHeldSale":
    echo $sales->getHeldSale($json);
    break;
  case "voidSale":
    echo $sales->voidSale($json);
    break;
  case "getAllSales":
    echo $sales->getAllSales();
    break;
}