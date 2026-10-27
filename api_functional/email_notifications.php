<?php
if (PHP_SAPI !== 'cli') {
  http_response_code(403);
  exit("This notification task can only be run from the command line.");
}

date_default_timezone_set('Asia/Manila');

include __DIR__ . "/../api/connection-pdo.php";
require_once __DIR__ . "/mailer.php";

$lock = $conn->query("SELECT GET_LOCK('pos_ar_email_notifications', 0)")->fetchColumn();
if ((int) $lock !== 1) {
  fwrite(STDERR, "Another AR email notification task is already running.\n");
  exit(1);
}

$sendFailures = 0;

function notificationSent($conn, $key)
{
  $stmt = $conn->prepare("SELECT notification_key FROM email_notification_state
      WHERE notification_key = :notificationKey AND resolved_at IS NULL");
  $stmt->bindParam(":notificationKey", $key);
  $stmt->execute();
  return $stmt->fetchColumn() !== false;
}

function saveNotification($conn, $key, $type, $customerId, $invoiceId = null)
{
  $sql = "INSERT INTO email_notification_state
      (notification_key, notification_type, customer_id, invoice_id, notified_at, resolved_at)
      VALUES(:notificationKey, :notificationType, :customerId, :invoiceId, NOW(), NULL)
      ON DUPLICATE KEY UPDATE notified_at = VALUES(notified_at), resolved_at = NULL";
  $stmt = $conn->prepare($sql);
  $stmt->bindParam(":notificationKey", $key);
  $stmt->bindParam(":notificationType", $type);
  $stmt->bindValue(":customerId", $customerId, PDO::PARAM_INT);
  $stmt->bindValue(":invoiceId", $invoiceId, $invoiceId === null ? PDO::PARAM_NULL : PDO::PARAM_INT);
  $stmt->execute();
}

try {
  $sql = "SELECT i.invoice_id, i.invoice_number, i.due_date, i.amount_due,
      c.customer_id, c.customer_name, c.email,
      GREATEST(i.amount_due - IFNULL(pd.total_paid, 0), 0) AS balance
      FROM invoice i
      INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
      INNER JOIN customers c ON s.customer_id = c.customer_id
      LEFT JOIN (
        SELECT invoice_id, SUM(amount_applied) AS total_paid
        FROM payments_dtl
        GROUP BY invoice_id
      ) pd ON pd.invoice_id = i.invoice_id
      WHERE s.status = 'COMPLETED'
        AND i.status IN ('UNPAID', 'PARTIAL')
        AND i.due_date <= CURDATE()
        AND i.amount_due > IFNULL(pd.total_paid, 0)
      ORDER BY i.due_date, i.invoice_id";
  $stmt = $conn->prepare($sql);
  $stmt->execute();
  $invoices = $stmt->fetchAll(PDO::FETCH_ASSOC);

  foreach ($invoices as $invoice) {
    $key = "invoice-due-" . $invoice['invoice_id'];
    if (notificationSent($conn, $key)) {
      continue;
    }

    try {
      $escape = function ($value) {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
      };
      $dueMessage = $invoice['due_date'] < date('Y-m-d') ? "is past due" : "is due today";
      $html = "<p>Dear " . $escape($invoice['customer_name']) . ",</p>"
        . "<p>This is a reminder that invoice <strong>" . $escape($invoice['invoice_number']) . "</strong> " . $dueMessage . ".</p>"
        . "<p><strong>Due date:</strong> " . $escape($invoice['due_date']) . "<br>"
        . "<strong>Remaining balance:</strong> PHP " . number_format((float) $invoice['balance'], 2) . "</p>"
        . "<p>Please contact us if you have already made this payment.</p>";
      $mailer = new PosMailer();
      $mailer->send(
        $invoice['email'],
        $invoice['customer_name'],
        "Payment Due: Invoice " . $invoice['invoice_number'],
        $html
      );
      saveNotification($conn, $key, 'INVOICE_DUE', $invoice['customer_id'], $invoice['invoice_id']);
      echo "Sent due-date reminder for " . $invoice['invoice_number'] . ".\n";
    } catch (\PHPMailer\PHPMailer\Exception $e) {
      $sendFailures++;
      error_log("Invoice due email failed for invoice " . $invoice['invoice_id'] . ": " . $e->getMessage());
      fwrite(STDERR, "Could not send due-date reminder for " . $invoice['invoice_number'] . ".\n");
    } catch (RuntimeException $e) {
      $sendFailures++;
      error_log("Invoice due email failed for invoice " . $invoice['invoice_id'] . ": " . $e->getMessage());
      fwrite(STDERR, "Could not send due-date reminder for " . $invoice['invoice_number'] . ": " . $e->getMessage() . "\n");
    }
  }
} finally {
  $conn->query("SELECT RELEASE_LOCK('pos_ar_email_notifications')");
}

if ($sendFailures > 0) {
  exit(1);
}
