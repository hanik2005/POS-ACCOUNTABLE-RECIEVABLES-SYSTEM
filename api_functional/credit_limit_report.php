<?php
require_once __DIR__ . "/../api/config-cors.php";

date_default_timezone_set('Asia/Manila');

require_once __DIR__ . "/../api/session.php";

class CreditLimitReport
{
  function isAuthorized()
  {
    $roleName = strtoupper($_SESSION['role_name'] ?? "");

    return in_array($roleName, ['ADMIN', 'ACCOUNTING'], true);
  }

  function resolveCompletedCreditLimitNotices($conn)
  {
    $sql = "UPDATE email_notification_state email_state
        INNER JOIN customers c ON email_state.customer_id = c.customer_id
        LEFT JOIN (
          SELECT s.customer_id,
            SUM(GREATEST(i.amount_due - IFNULL(pd.total_paid, 0), 0)) AS outstanding_balance
          FROM sales_hdr s
          INNER JOIN invoice i ON i.sales_id = s.sales_id
          LEFT JOIN (
            SELECT invoice_id, SUM(amount_applied) AS total_paid
            FROM payments_dtl
            GROUP BY invoice_id
          ) pd ON pd.invoice_id = i.invoice_id
          WHERE s.status = 'COMPLETED' AND i.status IN ('UNPAID', 'PARTIAL')
          GROUP BY s.customer_id
        ) ar ON ar.customer_id = c.customer_id
        SET email_state.resolved_at = NOW()
        WHERE email_state.notification_key = CONCAT('credit-limit-', c.customer_id)
          AND email_state.notification_type = 'CREDIT_LIMIT'
          AND email_state.resolved_at IS NULL
          AND (IFNULL(ar.outstanding_balance, 0) < c.credit_limit
            OR IFNULL(ar.outstanding_balance, 0) = 0)";
    $conn->exec($sql);
  }

  function getCreditLimitReport()
  {
    include __DIR__ . "/../api/connection-pdo.php";

    if (!$this->isAuthorized()) {
      return json_encode([]);
    }

    $this->resolveCompletedCreditLimitNotices($conn);

    $sql = "SELECT c.customer_id, c.customer_name, c.email, c.credit_limit, c.status,
        IFNULL(ar.outstanding_balance, 0) AS outstanding_balance,
        GREATEST(c.credit_limit - IFNULL(ar.outstanding_balance, 0), 0) AS available_credit,
        GREATEST(IFNULL(ar.outstanding_balance, 0) - c.credit_limit, 0) AS over_limit_amount,
        CASE
          WHEN IFNULL(ar.outstanding_balance, 0) >= c.credit_limit
            AND IFNULL(ar.outstanding_balance, 0) > 0
            AND email_state.notification_type = 'CREDIT_LIMIT'
            AND email_state.resolved_at IS NULL THEN 'SENT'
          WHEN IFNULL(ar.outstanding_balance, 0) >= c.credit_limit
            AND IFNULL(ar.outstanding_balance, 0) > 0
            AND email_state.notification_type = 'CREDIT_LIMIT_PENDING'
            AND email_state.resolved_at IS NULL
            AND TIMESTAMPDIFF(MINUTE, email_state.notified_at, NOW()) < 15 THEN 'PENDING'
          WHEN IFNULL(ar.outstanding_balance, 0) >= c.credit_limit
            AND IFNULL(ar.outstanding_balance, 0) > 0 THEN 'NOT_SENT'
          ELSE 'NOT_REQUIRED'
        END AS credit_email_status,
        CASE
          WHEN IFNULL(ar.outstanding_balance, 0) > c.credit_limit THEN 'OVER LIMIT'
          WHEN c.credit_limit = 0 AND IFNULL(ar.outstanding_balance, 0) = 0 THEN 'NO CREDIT'
          WHEN IFNULL(ar.outstanding_balance, 0) >= c.credit_limit THEN 'LIMIT REACHED'
          ELSE 'AVAILABLE'
        END AS credit_status
        FROM customers c
        LEFT JOIN (
          SELECT s.customer_id, SUM(GREATEST(i.amount_due - IFNULL(pd.total_paid, 0), 0)) AS outstanding_balance
          FROM sales_hdr s
          INNER JOIN invoice i ON i.sales_id = s.sales_id
          LEFT JOIN (
            SELECT invoice_id, SUM(amount_applied) AS total_paid
            FROM payments_dtl
            GROUP BY invoice_id
          ) pd ON pd.invoice_id = i.invoice_id
          WHERE s.status = 'COMPLETED' AND i.status IN ('UNPAID', 'PARTIAL')
          GROUP BY s.customer_id
        ) ar ON ar.customer_id = c.customer_id
        LEFT JOIN email_notification_state email_state
          ON email_state.notification_key = CONCAT('credit-limit-', c.customer_id)
        ORDER BY c.customer_name";
    $stmt = $conn->prepare($sql);
    $stmt->execute();

    return json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
  }

  function sendCreditLimitEmail($json)
  {
    if (empty($_SESSION['user_id'])) {
      http_response_code(401);
      return json_encode(["success" => false, "message" => "Sign in before sending a credit-limit notice."]);
    }

    if (!$this->isAuthorized()) {
      http_response_code(403);
      return json_encode(["success" => false, "message" => "You are not allowed to send credit-limit notices."]);
    }

    $data = json_decode($json, true);
    $customerId = isset($data['customerId']) ? (int) $data['customerId'] : 0;

    if ($customerId < 1) {
      http_response_code(400);
      return json_encode(["success" => false, "message" => "Choose a valid customer."]);
    }

    $notificationKey = "credit-limit-" . $customerId;
    $pendingType = "CREDIT_LIMIT_PENDING";
    $claimHeld = false;

    try {
      include __DIR__ . "/../api/connection-pdo.php";

      $sql = "SELECT c.customer_id, c.customer_name, c.email, c.credit_limit,
          IFNULL(ar.outstanding_balance, 0) AS outstanding_balance
          FROM customers c
          LEFT JOIN (
            SELECT s.customer_id,
              SUM(GREATEST(i.amount_due - IFNULL(pd.total_paid, 0), 0)) AS outstanding_balance
            FROM sales_hdr s
            INNER JOIN invoice i ON i.sales_id = s.sales_id
            LEFT JOIN (
              SELECT invoice_id, SUM(amount_applied) AS total_paid
              FROM payments_dtl
              GROUP BY invoice_id
            ) pd ON pd.invoice_id = i.invoice_id
            WHERE s.status = 'COMPLETED' AND i.status IN ('UNPAID', 'PARTIAL')
            GROUP BY s.customer_id
          ) ar ON ar.customer_id = c.customer_id
          WHERE c.customer_id = :customerId
          LIMIT 1";
      $stmt = $conn->prepare($sql);
      $stmt->bindValue(":customerId", $customerId, PDO::PARAM_INT);
      $stmt->execute();
      $customer = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$customer) {
        http_response_code(404);
        return json_encode(["success" => false, "message" => "The customer was not found."]);
      }

      $outstanding = (float) $customer['outstanding_balance'];
      $creditLimit = (float) $customer['credit_limit'];

      if ($outstanding <= 0 || $outstanding < $creditLimit) {
        http_response_code(409);
        return json_encode(["success" => false, "message" => "This customer's balance is no longer at or above the credit limit."]);
      }

      $customerEmail = trim((string) ($customer['email'] ?? ""));

      if (!filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        return json_encode(["success" => false, "message" => "Add a valid email address to this customer's account before sending a notice."]);
      }

      $stmt = $conn->prepare("INSERT IGNORE INTO email_notification_state
          (notification_key, notification_type, customer_id, invoice_id, notified_at, resolved_at)
          VALUES(:notificationKey, :notificationType, :customerId, NULL, NOW(), NULL)");
      $stmt->bindValue(":notificationKey", $notificationKey);
      $stmt->bindValue(":notificationType", $pendingType);
      $stmt->bindValue(":customerId", $customerId, PDO::PARAM_INT);
      $stmt->execute();
      $claimHeld = $stmt->rowCount() == 1;

      if (!$claimHeld) {
        $stmt = $conn->prepare("SELECT notification_type, resolved_at,
            TIMESTAMPDIFF(MINUTE, notified_at, NOW()) < 15 AS pending_active
            FROM email_notification_state
            WHERE notification_key = :notificationKey");
        $stmt->bindValue(":notificationKey", $notificationKey);
        $stmt->execute();
        $existing = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($existing
          && $existing['notification_type'] == 'CREDIT_LIMIT'
          && $existing['resolved_at'] === null) {
          return json_encode([
            "success" => true,
            "alreadySent" => true,
            "message" => "The credit-limit notice was already sent for this limit-reached or over-limit period.",
          ]);
        }

        if ($existing
          && $existing['notification_type'] == $pendingType
          && (int) $existing['pending_active'] == 1) {
          http_response_code(409);
          return json_encode([
            "success" => false,
            "pending" => true,
            "message" => "A credit-limit notice is already being sent.",
          ]);
        }

        $stmt = $conn->prepare("UPDATE email_notification_state
            SET notification_type = :pendingType, notified_at = NOW(), resolved_at = NULL
            WHERE notification_key = :notificationKey
              AND (resolved_at IS NOT NULL
                OR (notification_type = :existingPendingType
                  AND notified_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)))");
        $stmt->bindValue(":pendingType", $pendingType);
        $stmt->bindValue(":existingPendingType", $pendingType);
        $stmt->bindValue(":notificationKey", $notificationKey);
        $stmt->execute();
        $claimHeld = $stmt->rowCount() == 1;

        if (!$claimHeld) {
          http_response_code(409);
          return json_encode(["success" => false, "message" => "The notice could not be reserved. Refresh the report and try again."]);
        }
      }

      $escape = function ($value) {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
      };
      $atLimit = round($outstanding, 2) == round($creditLimit, 2);
      $html = "<p>Dear " . $escape($customer['customer_name']) . ",</p>"
        . ($atLimit
          ? "<p>Your outstanding Accounts Receivable balance has reached your credit limit.</p>"
          : "<p>Your outstanding Accounts Receivable balance is above your credit limit.</p>")
        . "<p><strong>Outstanding balance:</strong> PHP " . number_format($outstanding, 2) . "<br>"
        . "<strong>Credit limit:</strong> PHP " . number_format($creditLimit, 2)
        . ($atLimit
          ? "<br><strong>Available credit:</strong> PHP 0.00</p>"
          : "<br><strong>Amount over limit:</strong> PHP " . number_format($outstanding - $creditLimit, 2) . "</p>")
        . "<p>Please contact us to discuss your account.</p>";

      require_once __DIR__ . "/mailer.php";
      $mailer = new PosMailer();
      $mailer->send(
        $customerEmail,
        $customer['customer_name'],
        "Accounts Receivable Credit Limit Notice",
        $html
      );

      $stmt = $conn->prepare("UPDATE email_notification_state
          SET notification_type = 'CREDIT_LIMIT', notified_at = NOW(), resolved_at = NULL
          WHERE notification_key = :notificationKey AND notification_type = :pendingType");
      $stmt->bindValue(":notificationKey", $notificationKey);
      $stmt->bindValue(":pendingType", $pendingType);
      $stmt->execute();

      if ($stmt->rowCount() != 1) {
        throw new RuntimeException("The sent credit-limit notice could not be recorded.");
      }

      $claimHeld = false;

      return json_encode([
        "success" => true,
        "alreadySent" => false,
        "message" => "The credit-limit notice was sent.",
      ]);
    } catch (Throwable $e) {
      if ($claimHeld && isset($conn)) {
        try {
          $stmt = $conn->prepare("DELETE FROM email_notification_state
              WHERE notification_key = :notificationKey AND notification_type = :pendingType");
          $stmt->bindValue(":notificationKey", $notificationKey);
          $stmt->bindValue(":pendingType", $pendingType);
          $stmt->execute();
        } catch (Throwable $cleanupError) {
          error_log("Credit-limit email reservation cleanup failed: " . $cleanupError->getMessage());
        }
      }

      error_log("Credit-limit email failed for customer " . $customerId . ": " . $e->getMessage());
      http_response_code(500);
      return json_encode(["success" => false, "message" => "The credit-limit notice could not be sent. Check the mail configuration and try again."]);
    }
  }
}

$report = new CreditLimitReport();
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? '';

if ($requestMethod == 'GET') {
  $operation = $_GET['operation'] ?? '';

  if ($operation == 'getCreditLimitReport') {
    echo $report->getCreditLimitReport();
  } else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid operation."]);
  }
} else if ($requestMethod == 'POST') {
  $operation = $_POST['operation'] ?? '';
  $json = $_POST['json'] ?? "";

  if ($operation == 'sendCreditLimitEmail') {
    echo $report->sendCreditLimitEmail($json);
  } else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid operation."]);
  }
} else {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed."]);
}
