<?php
require_once __DIR__ . "/../api/config-cors.php";

date_default_timezone_set('Asia/Manila');

require_once __DIR__ . "/../api/session.php";
require_once __DIR__ . "/mailer.php";

class AgingReport
{
  function getBuckets()
  {
    return [
      "days1to30" => [
        "code" => "1-30",
        "type" => "AGING_1_30",
        "label" => "1–30 days",
        "minimum" => 1,
        "maximum" => 30,
      ],
      "days31to60" => [
        "code" => "31-60",
        "type" => "AGING_31_60",
        "label" => "31–60 days",
        "minimum" => 31,
        "maximum" => 60,
      ],
      "days61to90" => [
        "code" => "61-90",
        "type" => "AGING_61_90",
        "label" => "61–90 days",
        "minimum" => 61,
        "maximum" => 90,
      ],
      "over90" => [
        "code" => "over-90",
        "type" => "AGING_OVER_90",
        "label" => "over 90 days",
        "minimum" => 91,
        "maximum" => null,
      ],
    ];
  }

  function getBucketForDays($days)
  {
    foreach ($this->getBuckets() as $key => $bucket) {
      if ($days >= $bucket["minimum"]
        && ($bucket["maximum"] === null || $days <= $bucket["maximum"])) {
        return ["key" => $key, "bucket" => $bucket];
      }
    }

    return null;
  }

  function getAgingReport()
  {
    include __DIR__ . "/../api/connection-pdo.php";

    $roleName = strtoupper($_SESSION['role_name'] ?? "");

    if (!in_array($roleName, ['ADMIN', 'ACCOUNTING'], true)) {
      return json_encode([]);
    }

    $sql = "SELECT c.customer_id, c.customer_name, c.email, i.invoice_id, i.invoice_number,
        i.due_date, s.sales_date, i.amount_due,
        IFNULL(pd.total_paid, 0) AS total_paid,
        GREATEST(0, i.amount_due - IFNULL(pd.total_paid, 0)) AS balance,
        DATEDIFF(CURDATE(), i.due_date) AS days_past_due
        FROM invoice i
        INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
        INNER JOIN customers c ON s.customer_id = c.customer_id
        LEFT JOIN (
          SELECT invoice_id, SUM(amount_applied) AS total_paid
          FROM payments_dtl
          GROUP BY invoice_id
        ) pd ON pd.invoice_id = i.invoice_id
        WHERE s.status = 'COMPLETED' AND i.status IN ('UNPAID', 'PARTIAL')
        HAVING balance > 0
        ORDER BY c.customer_name, i.due_date, i.invoice_id";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $stmt = $conn->prepare("SELECT notification_key, notification_type,
        TIMESTAMPDIFF(MINUTE, notified_at, NOW()) < 15 AS pending_active
        FROM email_notification_state
        WHERE notification_type LIKE 'AGING_%'");
    $stmt->execute();
    $notifications = [];

    foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $notification) {
      $notifications[$notification['notification_key']] = $notification;
    }

    foreach ($invoices as &$invoice) {
      $aging = $this->getBucketForDays((int) $invoice['days_past_due']);
      $invoice['aging_email_status'] = "NOT_APPLICABLE";

      if ($aging) {
        $bucket = $aging['bucket'];
        $notificationKey = "aging-" . $invoice['customer_id'] . "-" . $bucket['code'];
        $notification = $notifications[$notificationKey] ?? null;

        if ($notification && $notification['notification_type'] == $bucket['type']) {
          $invoice['aging_email_status'] = "SENT";
        } else if ($notification
          && $notification['notification_type'] == $bucket['type'] . "_PENDING"
          && (int) $notification['pending_active'] == 1) {
          $invoice['aging_email_status'] = "PENDING";
        }
      }
    }
    unset($invoice);

    return json_encode($invoices);
  }

  function sendAgingReminder($json)
  {
    $roleName = strtoupper($_SESSION['role_name'] ?? "");

    if (empty($_SESSION['user_id'])) {
      http_response_code(401);
      return json_encode(["success" => false, "message" => "Sign in before sending an aging reminder."]);
    }

    if (!in_array($roleName, ['ADMIN', 'ACCOUNTING'], true)) {
      http_response_code(403);
      return json_encode(["success" => false, "message" => "You are not allowed to send aging reminders."]);
    }

    $data = json_decode($json, true);
    $customerId = isset($data['customerId']) ? (int) $data['customerId'] : 0;
    $bucketKey = isset($data['bucket']) && is_string($data['bucket']) ? $data['bucket'] : "";
    $buckets = $this->getBuckets();

    if ($customerId < 1 || !isset($buckets[$bucketKey])) {
      http_response_code(400);
      return json_encode(["success" => false, "message" => "Choose a valid customer and aging period."]);
    }

    $bucket = $buckets[$bucketKey];
    $notificationKey = "aging-" . $customerId . "-" . $bucket['code'];
    $pendingType = $bucket['type'] . "_PENDING";
    $claimHeld = false;

    try {
      include __DIR__ . "/../api/connection-pdo.php";

      $stmt = $conn->prepare("SELECT customer_id, customer_name, email
          FROM customers WHERE customer_id = :customerId LIMIT 1");
      $stmt->bindValue(":customerId", $customerId, PDO::PARAM_INT);
      $stmt->execute();
      $customer = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$customer) {
        http_response_code(404);
        return json_encode(["success" => false, "message" => "The customer was not found."]);
      }

      $customerEmail = trim((string) ($customer['email'] ?? ""));

      if (!filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
        http_response_code(422);
        return json_encode(["success" => false, "message" => "Add a valid email address to this customer's account before sending a reminder."]);
      }

      $daysPastDue = "DATEDIFF(CURDATE(), i.due_date)";
      $bucketWhere = $bucket['maximum'] === null
        ? "$daysPastDue >= :minimumDays"
        : "$daysPastDue BETWEEN :minimumDays AND :maximumDays";
      $sql = "SELECT i.invoice_id, i.invoice_number, i.due_date,
          GREATEST(0, i.amount_due - IFNULL(pd.total_paid, 0)) AS balance
          FROM invoice i
          INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
          LEFT JOIN (
            SELECT invoice_id, SUM(amount_applied) AS total_paid
            FROM payments_dtl
            GROUP BY invoice_id
          ) pd ON pd.invoice_id = i.invoice_id
          WHERE s.customer_id = :customerId AND s.status = 'COMPLETED'
            AND i.status IN ('UNPAID', 'PARTIAL')
            AND i.amount_due > IFNULL(pd.total_paid, 0)
            AND $bucketWhere
          ORDER BY i.due_date, i.invoice_id";
      $stmt = $conn->prepare($sql);
      $stmt->bindValue(":customerId", $customerId, PDO::PARAM_INT);
      $stmt->bindValue(":minimumDays", $bucket['minimum'], PDO::PARAM_INT);

      if ($bucket['maximum'] !== null) {
        $stmt->bindValue(":maximumDays", $bucket['maximum'], PDO::PARAM_INT);
      }

      $stmt->execute();
      $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

      if (!$invoices) {
        http_response_code(409);
        return json_encode(["success" => false, "message" => "This customer has no open invoices in that overdue period."]);
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
        $stmt = $conn->prepare("SELECT notification_type FROM email_notification_state
            WHERE notification_key = :notificationKey");
        $stmt->bindValue(":notificationKey", $notificationKey);
        $stmt->execute();
        $existingType = $stmt->fetchColumn();

        if ($existingType == $bucket['type']) {
          return json_encode([
            "success" => true,
            "alreadySent" => true,
            "message" => "The " . $bucket['label'] . " reminder was already sent.",
          ]);
        }

        if ($existingType != $pendingType) {
          http_response_code(409);
          return json_encode(["success" => false, "message" => "The reminder could not be reserved. Refresh and try again."]);
        }

        $stmt = $conn->prepare("UPDATE email_notification_state
            SET notified_at = NOW()
            WHERE notification_key = :notificationKey
              AND notification_type = :notificationType
              AND notified_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)");
        $stmt->bindValue(":notificationKey", $notificationKey);
        $stmt->bindValue(":notificationType", $pendingType);
        $stmt->execute();
        $claimHeld = $stmt->rowCount() == 1;

        if (!$claimHeld) {
          http_response_code(409);
          return json_encode([
            "success" => false,
            "pending" => true,
            "message" => "An aging reminder for this period is already being sent.",
          ]);
        }
      }

      $escape = function ($value) {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
      };
      $totalBalance = 0;
      $invoiceRows = "";

      foreach ($invoices as $invoice) {
        $balance = (float) $invoice['balance'];
        $totalBalance += $balance;
        $invoiceRows .= "<tr><td>" . $escape($invoice['invoice_number']) . "</td>"
          . "<td>" . $escape($invoice['due_date']) . "</td>"
          . "<td style=\"text-align:right\">PHP " . number_format($balance, 2) . "</td></tr>";
      }

      $html = "<p>Dear " . $escape($customer['customer_name']) . ",</p>"
        . "<p>This is a reminder about your open Accounts Receivable invoices "
        . "that are " . $escape($bucket['label']) . " overdue.</p>"
        . "<table border=\"1\" cellpadding=\"6\" cellspacing=\"0\" style=\"border-collapse:collapse\">"
        . "<thead><tr><th>Invoice</th><th>Due date</th><th>Balance</th></tr></thead>"
        . "<tbody>" . $invoiceRows . "</tbody></table>"
        . "<p><strong>Total overdue in this period: PHP " . number_format($totalBalance, 2) . "</strong></p>"
        . "<p>Please contact us if you have already made this payment.</p>";

      $mailer = new PosMailer();
      $mailer->send(
        $customerEmail,
        $customer['customer_name'],
        "Accounts Receivable Aging Reminder — " . $bucket['label'],
        $html
      );

      $stmt = $conn->prepare("UPDATE email_notification_state
          SET notification_type = :sentType, notified_at = NOW()
          WHERE notification_key = :notificationKey AND notification_type = :pendingType");
      $stmt->bindValue(":sentType", $bucket['type']);
      $stmt->bindValue(":notificationKey", $notificationKey);
      $stmt->bindValue(":pendingType", $pendingType);
      $stmt->execute();
      $claimHeld = false;

      return json_encode([
        "success" => true,
        "alreadySent" => false,
        "message" => "The " . $bucket['label'] . " reminder was sent.",
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
          error_log("Aging reminder reservation cleanup failed: " . $cleanupError->getMessage());
        }
      }

      error_log("Aging reminder email failed: " . $e->getMessage());
      http_response_code(500);
      return json_encode(["success" => false, "message" => "The aging reminder could not be sent. Check the mail configuration and try again."]);
    }
  }
}

$report = new AgingReport();
$requestMethod = $_SERVER['REQUEST_METHOD'] ?? '';

if ($requestMethod == 'GET') {
  $operation = $_GET['operation'] ?? '';

  if ($operation == 'getAgingReport') {
    echo $report->getAgingReport();
  } else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid operation."]);
  }
} else if ($requestMethod == 'POST') {
  $operation = $_POST['operation'] ?? '';
  $json = $_POST['json'] ?? "";

  if ($operation == 'sendAgingReminder') {
    echo $report->sendAgingReminder($json);
  } else {
    http_response_code(400);
    echo json_encode(["success" => false, "message" => "Invalid operation."]);
  }
} else {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Method not allowed."]);
}
