<?php
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

date_default_timezone_set('Asia/Manila');
class SalesReturn
{
  function getReturnableItems($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $sql = "SELECT d.product_id, p.product_name, d.unit_price, SUM(d.quantity) AS qty_sold,
        IFNULL((SELECT SUM(rd.quantity)
          FROM sales_return_dtl rd
          INNER JOIN sales_return_hdr rh ON rd.return_id = rh.retrun_id
          WHERE rh.sales_id = d.sales_id AND rd.product_id = d.product_id
          AND rh.status IN ('PENDING', 'APPROVED')), 0) AS qty_returned
        FROM sales_dtl d
        INNER JOIN products p ON d.product_id = p.product_id
        WHERE d.sales_id = :salesId
        GROUP BY d.sales_id, d.product_id, p.product_name, d.unit_price";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":salesId", $json['salesId']);
    $stmt->execute();
    $rs = $stmt->fetchAll(PDO::FETCH_ASSOC);

    return json_encode($rs);
  }

  function saveReturn($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    
    $header = $json['header'];
    $details = $json['details'];

    $returnDate = date('Y-m-d');
    $reason = !empty($header['reason']) ? $header['reason'] : null;

    try {
      $conn->beginTransaction();

      $stmt = $conn->prepare("SELECT customer_id FROM sales_hdr WHERE sales_id = :salesId");
      $stmt->bindParam(":salesId", $header['salesId']);
      $stmt->execute();
      $customerId = $stmt->fetchColumn();

      $sql = "INSERT INTO sales_return_hdr(customer_id, sales_id, return_date, return_reason, total_amount, status)
          VALUES(:customerId, :salesId, :returnDate, :reason, :amount, 'PENDING')";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":customerId", $customerId);
      $stmt->bindParam(":salesId", $header['salesId']);
      $stmt->bindParam(":returnDate", $returnDate);
      $stmt->bindParam(":reason", $reason);
      $stmt->bindParam(":amount", $header['amount']);
      $stmt->execute();

      $newId = $conn->lastInsertId();

      $sqlDtl = "INSERT INTO sales_return_dtl(return_id, product_id, quantity, unit_price, subtotal)
          VALUES(:returnId, :productId, :qty, :price, :amount)";
      $stmtDtl = $conn->prepare($sqlDtl);
      foreach ($details as $row) {
        $stmtDtl->bindParam(":returnId", $newId);
        $stmtDtl->bindParam(":productId", $row['productId']);
        $stmtDtl->bindParam(":qty", $row['qty']);
        $stmtDtl->bindParam(":price", $row['productPrice']);
        $stmtDtl->bindParam(":amount", $row['amount']);
        $stmtDtl->execute();
      }
      $conn->commit();
      $returnValue = 1;
    } catch (Exception $e) {
      $conn->rollBack();
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }

  function approveReturn($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $paid = "IFNULL((SELECT SUM(amount_applied) FROM payments_dtl
        WHERE invoice_id = i.invoice_id), 0)";
    $returned = "IFNULL((SELECT SUM(total_amount) FROM sales_return_hdr
        WHERE sales_id = i.sales_id AND status = 'APPROVED'), 0)";

    try {
      $conn->beginTransaction();

      //get the sale of the return
      $stmt = $conn->prepare("SELECT sales_id FROM sales_return_hdr WHERE retrun_id = :returnId");
      $stmt->bindParam(":returnId", $json['returnId']);
      $stmt->execute();
      $salesId = $stmt->fetchColumn();

      $sql = "UPDATE sales_return_hdr SET status = 'APPROVED' WHERE retrun_id = :returnId";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":returnId", $json['returnId']);
      $stmt->execute();

   
      $sql = "UPDATE sales_hdr SET return_id = :returnId WHERE sales_id = :salesId";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":returnId", $json['returnId']);
      $stmt->bindParam(":salesId", $salesId);
      $stmt->execute();

      $sql = "UPDATE invoice i
          SET i.status = CASE
            WHEN i.amount_due - $paid - $returned <= 0 THEN 'PAID'
            WHEN $paid + $returned > 0 THEN 'PARTIAL'
            ELSE 'UNPAID'
          END
          WHERE i.sales_id = :salesId";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":salesId", $salesId);
      $stmt->execute();

      //commit changes
      $conn->commit();
      $returnValue = 1;
    } catch (Exception $e) {
      $conn->rollBack();
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }

  function rejectReturn($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $sql = "UPDATE sales_return_hdr SET status = 'REJECTED' WHERE retrun_id = :returnId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":returnId", $json['returnId']);
    $stmt->execute();

    $returnValue = 0;
    if ($stmt->rowCount() > 0) {
      $returnValue = 1;
    }
    return json_encode($returnValue);
  }

  function getAllReturns()
  {
    include "../api/connection-pdo.php";

    //approved returns of the sale up to this return
    $cum = "(SELECT SUM(x.total_amount) FROM sales_return_hdr x
        WHERE x.sales_id = r.sales_id AND x.status = 'APPROVED' AND x.retrun_id <= r.retrun_id)";

    //refund: every sale has an invoice, so only what was paid more than the invoice after the returns
    $sql = "SELECT r.retrun_id AS return_id, r.sales_id, r.return_date, r.return_reason,
        r.total_amount, r.status, c.customer_name, i.invoice_number,
        CASE
          WHEN r.status <> 'APPROVED' THEN 0
          ELSE GREATEST(0, IFNULL(pd.total_paid, 0) + $cum - i.amount_due)
            - GREATEST(0, IFNULL(pd.total_paid, 0) + $cum - r.total_amount - i.amount_due)
        END AS refund_amount
        FROM sales_return_hdr r
        LEFT JOIN customers c ON r.customer_id = c.customer_id
        INNER JOIN invoice i ON r.sales_id = i.sales_id
        LEFT JOIN (
          SELECT invoice_id, SUM(amount_applied) AS total_paid
          FROM payments_dtl
          GROUP BY invoice_id
        ) pd ON i.invoice_id = pd.invoice_id
        ORDER BY r.retrun_id DESC";
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

$salesReturn = new SalesReturn();
switch ($operation) {
  case "getReturnableItems":
    echo $salesReturn->getReturnableItems($json);
    break;
  case "saveReturn":
    echo $salesReturn->saveReturn($json);
    break;
  case "approveReturn":
    echo $salesReturn->approveReturn($json);
    break;
  case "rejectReturn":
    echo $salesReturn->rejectReturn($json);
    break;
  case "getAllReturns":
    echo $salesReturn->getAllReturns();
    break;
}