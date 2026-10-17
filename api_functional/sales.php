<?php
require_once __DIR__ . "/../api/config-cors.php";

date_default_timezone_set('Asia/Manila');

include "../api/session.php";

class Sales
{
  function getPosOptions()
  {
    include "../api/connection-pdo.php";

    $sql = "SELECT c.customer_id, c.customer_name, c.credit_limit, g.days_name,
        IFNULL(ar.outstanding_balance, 0) AS outstanding_balance,
        GREATEST(c.credit_limit - IFNULL(ar.outstanding_balance, 0), 0) AS available_credit
        FROM customers c
        INNER JOIN group_days g ON c.group_days_id = g.id
        LEFT JOIN (
          SELECT s.customer_id, SUM(GREATEST(i.amount_due - IFNULL(pd.total_paid, 0), 0)) AS outstanding_balance
          FROM sales_hdr s
          INNER JOIN invoice i ON i.sales_id = s.sales_id
          LEFT JOIN (
            SELECT invoice_id, SUM(amount_applied) AS total_paid
            FROM payments_dtl
            GROUP BY invoice_id
          ) pd ON pd.invoice_id = i.invoice_id
          WHERE s.status = 'COMPLETED'
          GROUP BY s.customer_id
        ) ar ON ar.customer_id = c.customer_id
        WHERE c.status = 'ACTIVE'
        ORDER BY c.customer_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $sql = "SELECT product_id, barcode, product_name, unit_price
        FROM products
        WHERE status = 'ACTIVE'
        ORDER BY product_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);

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

  function insertSale($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);

    $header = $json['header'];
    $details = $json['details'];

    $session = new Session();
    $userId = $session->getUserId();

    $customerId = !empty($header['customerId']) ? $header['customerId'] : null;
    $saleType = !empty($header['saleType']) ? strtoupper($header['saleType']) : ($customerId ? 'AR' : 'WALK_IN');
    $recallId = !empty($header['recallId']) ? $header['recallId'] : null;
    $salesDate = date('Y-m-d');

    try {
      $conn->beginTransaction();

      if ($header['status'] == 'COMPLETED') {
        if (!in_array($saleType, ['AR', 'WALK_IN'], true)) {
          throw new Exception("The sale type is invalid.");
        }

        if ($saleType == 'WALK_IN') {
          $customerId = null;
        } else {
          if ($customerId === null) {
            throw new Exception("A customer is required for an Accounts Receivable sale.");
          }

          $stmt = $conn->prepare("SELECT credit_limit FROM customers WHERE customer_id = :customerId FOR UPDATE");
          $stmt->bindParam(":customerId", $customerId);
          $stmt->execute();
          $creditLimit = $stmt->fetchColumn();

          if ($creditLimit === false) {
            throw new Exception("The selected customer was not found.");
          }

          $stmt = $conn->prepare("SELECT IFNULL(SUM(GREATEST(i.amount_due - IFNULL(pd.total_paid, 0), 0)), 0)
              FROM sales_hdr s
              INNER JOIN invoice i ON i.sales_id = s.sales_id
              LEFT JOIN (
                SELECT invoice_id, SUM(amount_applied) AS total_paid
                FROM payments_dtl
                GROUP BY invoice_id
              ) pd ON pd.invoice_id = i.invoice_id
              WHERE s.customer_id = :customerId AND s.status = 'COMPLETED'");
          $stmt->bindParam(":customerId", $customerId);
          $stmt->execute();
          $outstandingBalance = (float) $stmt->fetchColumn();
          $creditLimit = round((float) $creditLimit, 2);
          $saleTotal = round((float) $header['amount'], 2);
          $payment = !empty($header['payment']) ? $header['payment'] : null;
          $amountApplied = $payment ? round(min((float) $payment['amountApplied'], $saleTotal), 2) : 0;
          $newReceivable = max($saleTotal - $amountApplied, 0);

          if (round($outstandingBalance + $newReceivable, 2) > $creditLimit) {
            $availableCredit = max($creditLimit - $outstandingBalance, 0);
            $conn->rollBack();
            return json_encode([
              "success" => false,
              "message" => "Credit limit reached. The customer has " . number_format($availableCredit, 2) . " available credit. Pay at least " . number_format(max($saleTotal - $availableCredit, 0), 2) . " now or cancel the sale."
            ]);
          }
        }

        $payment = !empty($header['payment']) ? $header['payment'] : null;

        if ($saleType == 'WALK_IN') {
          $saleTotal = round((float) $header['amount'], 2);
          $amountApplied = $payment ? round((float) $payment['amountApplied'], 2) : 0;

          if (!$payment || $amountApplied != $saleTotal) {
            throw new Exception("A walk-in sale must be paid in full.");
          }
        }
      }

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
      $newId = $conn->lastInsertId();

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

      if ($header['status'] == 'COMPLETED') {
        if ($saleType == 'WALK_IN') {
          $daysDue = 0;
        } else {
          $sql = "SELECT g.days_due
              FROM customers c
              INNER JOIN group_days g ON c.group_days_id = g.id
              WHERE c.customer_id = :customerId";
          $stmt = $conn->prepare($sql);
          $stmt->bindParam(":customerId", $customerId);
          $stmt->execute();
          $daysDue = $stmt->fetchColumn();

          if ($daysDue === false) {
            throw new Exception("The customer has no days due.");
          }
        }

        $dueDate = date('Y-m-d', strtotime($salesDate . " +" . (int) $daysDue . " days"));

        $stmt = $conn->prepare("SELECT IFNULL(MAX(invoice_id), 0) + 1 FROM invoice");
        $stmt->execute();
        $invoiceNumber = sprintf("INV-%s-%04d", date('Y'), $stmt->fetchColumn());

        $payment = !empty($header['payment']) ? $header['payment'] : null;
        $total = round((float) $header['amount'], 2);
        $amountApplied = 0;

        if ($payment) {
          $amountApplied = round(min((float) $payment['amountApplied'], $total), 2);

          if ($amountApplied <= 0) {
            throw new Exception("The payment amount is invalid.");
          }
        }

        $invoiceStatus = 'UNPAID';
        if ($payment && $amountApplied >= $total) {
          $invoiceStatus = 'PAID';
        } else if ($payment) {
          $invoiceStatus = 'PARTIAL';
        }

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

          $amountTendered = strtoupper($methodName) == 'CASH' ? round((float) $payment['amountTendered'], 2) : $amountApplied;
          $changeAmount = round($amountTendered - $amountApplied, 2);

          if ($changeAmount < 0) {
            throw new Exception("The payment is less than the amount applied.");
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
          $stmt->bindParam(":amount", $amountApplied);
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
          $stmt->bindParam(":amountApplied", $amountApplied);
          $stmt->execute();
        }
      }

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

      $conn->commit();
      $returnValue = (int) $newId;
    } catch (Exception $e) {
      $conn->rollBack();
      $returnValue = 0;
    }
    return json_encode($returnValue);
  }

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
    $session = new Session();
    $userId = $session->getUserId();

    $sql = "UPDATE sales_hdr
        SET status = 'VOID'
        WHERE sales_id = :salesId AND created_by = :userId AND status = 'HOLD'";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":salesId", $json['salesId']);
    $stmt->bindParam(":userId", $userId);
    $stmt->execute();

    $returnValue = 0;
    if ($stmt->rowCount() > 0) {
      $returnValue = 1;
    }
    return json_encode($returnValue);
  }

  function getVoidableSales()
  {
    include "../api/connection-pdo.php";

    $session = new Session();
    $userId = $session->getUserId();
    $roleName = isset($_SESSION['role_name']) ? strtoupper($_SESSION['role_name']) : "";

    if ($roleName != 'CASHIER') {
      return json_encode([]);
    }

    $sql = "SELECT shift_id
        FROM shifts
        WHERE user_id = :userId AND status = 'OPEN'
        ORDER BY shift_id DESC
        LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->execute();
    $shiftId = $stmt->fetchColumn();

    if (!$shiftId) {
      return json_encode([]);
    }

    $sql = "SELECT s.sales_id, s.sales_date, s.total_amount, s.customer_id,
        CASE WHEN s.customer_id IS NULL THEN 'WALK_IN' ELSE 'AR' END AS sale_type,
        c.customer_name, i.invoice_number
        FROM sales_hdr s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN invoice i ON s.sales_id = i.sales_id
        WHERE s.status = 'COMPLETED'
          AND s.created_by = :userId
          AND s.shift_id = :shiftId
        ORDER BY s.sales_id DESC
        LIMIT 100";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->bindParam(":shiftId", $shiftId);
    $stmt->execute();

    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
  }

  function getVoidableSaleDetails($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $session = new Session();
    $userId = $session->getUserId();
    $roleName = isset($_SESSION['role_name']) ? strtoupper($_SESSION['role_name']) : "";

    if ($roleName != 'CASHIER') {
      return json_encode(0);
    }

    $sql = "SELECT shift_id
        FROM shifts
        WHERE user_id = :userId AND status = 'OPEN'
        ORDER BY shift_id DESC
        LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->execute();
    $shiftId = $stmt->fetchColumn();

    if (!$shiftId) {
      return json_encode(0);
    }

    $sql = "SELECT s.sales_id, s.sales_date, s.total_amount, s.customer_id,
        CASE WHEN s.customer_id IS NULL THEN 'WALK_IN' ELSE 'AR' END AS sale_type,
        c.customer_name, i.invoice_number
        FROM sales_hdr s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN invoice i ON s.sales_id = i.sales_id
        WHERE s.sales_id = :salesId AND s.status = 'COMPLETED'
          AND s.created_by = :userId AND s.shift_id = :shiftId";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":salesId", $json['salesId']);
    $stmt->bindParam(":userId", $userId);
    $stmt->bindParam(":shiftId", $shiftId);
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

    return json_encode(["sale" => $sale, "items" => $items]);
  }

  function requestSaleVoid($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $session = new Session();
    $userId = $session->getUserId();
    $roleName = isset($_SESSION['role_name']) ? strtoupper($_SESSION['role_name']) : "";
    $salesId = isset($json['salesId']) ? (int) $json['salesId'] : 0;
    $reason = isset($json['reason']) ? trim($json['reason']) : "";

    if ($roleName != 'CASHIER' || $salesId < 1) {
      return json_encode(3);
    }

    try {
      $conn->beginTransaction();

      $sql = "SELECT sales_id
          FROM sales_hdr
          WHERE sales_id = :salesId AND created_by = :userId AND status = 'COMPLETED'
            AND shift_id IN (SELECT shift_id FROM shifts WHERE user_id = :shiftUserId AND status = 'OPEN')
          FOR UPDATE";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":salesId", $salesId);
      $stmt->bindParam(":userId", $userId);
      $stmt->bindParam(":shiftUserId", $userId);
      $stmt->execute();

      if (!$stmt->fetchColumn()) {
        $conn->rollBack();
        return json_encode(3);
      }

      $sql = "SELECT void_request_id
          FROM sale_void_requests
          WHERE sales_id = :salesId AND status = 'PENDING'
          LIMIT 1";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":salesId", $salesId);
      $stmt->execute();

      if ($stmt->fetchColumn()) {
        $conn->commit();
        return json_encode(2);
      }

      $sql = "INSERT INTO sale_void_requests(sales_id, requested_by, reason, status, decision_mode, requested_at)
          VALUES(:salesId, :userId, :reason, 'PENDING', 'REQUEST', :requestedAt)";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":salesId", $salesId);
      $stmt->bindParam(":userId", $userId);
      $stmt->bindParam(":reason", $reason);
      $requestedAt = date('Y-m-d H:i:s');
      $stmt->bindParam(":requestedAt", $requestedAt);
      $stmt->execute();

      $conn->commit();
      return json_encode(1);
    } catch (Exception $e) {
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }
      return json_encode(0);
    }
  }

  function authorizeVoidSale($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $session = new Session();
    $cashierId = $session->getUserId();
    $roleName = isset($_SESSION['role_name']) ? strtoupper($_SESSION['role_name']) : "";
    $salesId = isset($json['salesId']) ? (int) $json['salesId'] : 0;
    $supervisorUsername = isset($json['supervisorUsername']) ? trim($json['supervisorUsername']) : "";
    $supervisorPassword = isset($json['supervisorPassword']) ? $json['supervisorPassword'] : "";
    $reason = isset($json['reason']) ? trim($json['reason']) : "";

    if ($roleName != 'CASHIER' || $salesId < 1 || $supervisorUsername == "" || $supervisorPassword == "") {
      return json_encode(3);
    }

    $sql = "SELECT u.user_id, u.password_hash
        FROM users u
        INNER JOIN roles r ON u.role_id = r.role_id
        WHERE u.username = :username AND u.status = 'ACTIVE' AND r.status = 'ACTIVE'
          AND UPPER(r.role_name) = 'SUPERVISOR'
        LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":username", $supervisorUsername);
    $stmt->execute();
    $supervisor = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$supervisor || !password_verify($supervisorPassword, $supervisor['password_hash'])) {
      return json_encode(3);
    }

    try {
      $conn->beginTransaction();

      $sql = "SELECT sales_id
          FROM sales_hdr
          WHERE sales_id = :salesId AND created_by = :cashierId AND status = 'COMPLETED'
            AND shift_id IN (SELECT shift_id FROM shifts WHERE user_id = :shiftCashierId AND status = 'OPEN')
          FOR UPDATE";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":salesId", $salesId);
      $stmt->bindParam(":cashierId", $cashierId);
      $stmt->bindParam(":shiftCashierId", $cashierId);
      $stmt->execute();

      if (!$stmt->fetchColumn()) {
        $conn->rollBack();
        return json_encode(4);
      }

      $sql = "SELECT void_request_id
          FROM sale_void_requests
          WHERE sales_id = :salesId AND status = 'PENDING'
          LIMIT 1
          FOR UPDATE";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":salesId", $salesId);
      $stmt->execute();
      $requestId = $stmt->fetchColumn();
      $decidedAt = date('Y-m-d H:i:s');
      $supervisorId = $supervisor['user_id'];

      if ($requestId) {
        $sql = "UPDATE sale_void_requests
            SET status = 'APPROVED', decision_mode = 'DIRECT', decided_by = :supervisorId,
              decided_at = :decidedAt, reason = :reason
            WHERE void_request_id = :requestId AND status = 'PENDING'";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":requestId", $requestId);
        $stmt->bindParam(":supervisorId", $supervisorId);
        $stmt->bindParam(":decidedAt", $decidedAt);
        $stmt->bindParam(":reason", $reason);
        $stmt->execute();
      } else {
        $sql = "INSERT INTO sale_void_requests(sales_id, requested_by, reason, status, decision_mode,
            decided_by, requested_at, decided_at)
            VALUES(:salesId, :cashierId, :reason, 'APPROVED', 'DIRECT', :supervisorId, :requestedAt, :decidedAt)";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":salesId", $salesId);
        $stmt->bindParam(":cashierId", $cashierId);
        $stmt->bindParam(":reason", $reason);
        $stmt->bindParam(":supervisorId", $supervisorId);
        $requestedAt = $decidedAt;
        $stmt->bindParam(":requestedAt", $requestedAt);
        $stmt->bindParam(":decidedAt", $decidedAt);
        $stmt->execute();
      }

      $sql = "UPDATE sales_hdr SET status = 'VOID'
          WHERE sales_id = :salesId AND status = 'COMPLETED'";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":salesId", $salesId);
      $stmt->execute();

      $sql = "UPDATE invoice SET status = 'VOID' WHERE sales_id = :salesId";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":salesId", $salesId);
      $stmt->execute();

      $conn->commit();
      return json_encode(1);
    } catch (Exception $e) {
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }
      return json_encode(0);
    }
  }

  function getSaleVoidRequests()
  {
    include "../api/connection-pdo.php";

    $roleName = isset($_SESSION['role_name']) ? strtoupper($_SESSION['role_name']) : "";

    if ($roleName != 'SUPERVISOR') {
      return json_encode([]);
    }

    $sql = "SELECT v.void_request_id, v.sales_id, v.reason, v.status, v.decision_mode,
        v.requested_at, v.decided_at, s.total_amount, s.sales_date,
        i.invoice_number, COALESCE(c.customer_name, 'Walk-in customer') AS customer_name,
        u.full_name AS cashier,
        a.full_name AS approver_name
        FROM sale_void_requests v
        INNER JOIN sales_hdr s ON v.sales_id = s.sales_id
        LEFT JOIN invoice i ON s.sales_id = i.sales_id
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        INNER JOIN users u ON v.requested_by = u.user_id
        LEFT JOIN users a ON v.decided_by = a.user_id
        ORDER BY (v.status = 'PENDING') DESC, v.void_request_id DESC";
    $stmt = $conn->prepare($sql);
    $stmt->execute();

    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
  }

  function decideSaleVoid($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $session = new Session();
    $userId = $session->getUserId();
    $roleName = isset($_SESSION['role_name']) ? strtoupper($_SESSION['role_name']) : "";
    $requestId = isset($json['requestId']) ? (int) $json['requestId'] : 0;
    $status = isset($json['status']) && $json['status'] == 'APPROVED' ? 'APPROVED' : 'REJECTED';

    if ($roleName != 'SUPERVISOR' || $requestId < 1) {
      return json_encode(3);
    }

    try {
      $conn->beginTransaction();

      $sql = "SELECT sales_id
          FROM sale_void_requests
          WHERE void_request_id = :requestId AND status = 'PENDING'
          FOR UPDATE";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":requestId", $requestId);
      $stmt->execute();
      $salesId = $stmt->fetchColumn();

      if (!$salesId) {
        $conn->rollBack();
        return json_encode(2);
      }

      if ($status == 'APPROVED') {
        $sql = "UPDATE sales_hdr SET status = 'VOID'
            WHERE sales_id = :salesId AND status = 'COMPLETED'";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":salesId", $salesId);
        $stmt->execute();

        if ($stmt->rowCount() == 0) {
          $conn->rollBack();
          return json_encode(2);
        }

        $sql = "UPDATE invoice SET status = 'VOID' WHERE sales_id = :salesId";
        $stmt = $conn->prepare($sql);
        $stmt->bindParam(":salesId", $salesId);
        $stmt->execute();
      }

      $decidedAt = date('Y-m-d H:i:s');
      $sql = "UPDATE sale_void_requests
          SET status = :status, decision_mode = 'REQUEST', decided_by = :userId, decided_at = :decidedAt
          WHERE void_request_id = :requestId AND status = 'PENDING'";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":status", $status);
      $stmt->bindParam(":userId", $userId);
      $stmt->bindParam(":decidedAt", $decidedAt);
      $stmt->bindParam(":requestId", $requestId);
      $stmt->execute();

      $conn->commit();
      return json_encode(1);
    } catch (Exception $e) {
      if ($conn->inTransaction()) {
        $conn->rollBack();
      }
      return json_encode(0);
    }
  }

  function getAllSales()
  {
    include "../api/connection-pdo.php";

    $sql = "SELECT s.*, COALESCE(c.customer_name, 'Walk-in customer') AS customer_name, i.invoice_number
        FROM sales_hdr s
        LEFT JOIN customers c ON s.customer_id = c.customer_id
        INNER JOIN invoice i ON s.sales_id = i.sales_id
        WHERE s.status = 'COMPLETED'
        ORDER BY s.sales_id DESC";
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
  case "getVoidableSales":
    echo $sales->getVoidableSales();
    break;
  case "getVoidableSaleDetails":
    echo $sales->getVoidableSaleDetails($json);
    break;
  case "requestSaleVoid":
    echo $sales->requestSaleVoid($json);
    break;
  case "authorizeVoidSale":
    echo $sales->authorizeVoidSale($json);
    break;
  case "getSaleVoidRequests":
    echo $sales->getSaleVoidRequests();
    break;
  case "decideSaleVoid":
    echo $sales->decideSaleVoid($json);
    break;
  case "getAllSales":
    echo $sales->getAllSales();
    break;
}
