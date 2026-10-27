<?php
require_once __DIR__ . "/../api/config-cors.php";

date_default_timezone_set('Asia/Manila');

require_once __DIR__ . "/../api/session.php";
require_once __DIR__ . "/mailer.php";

class InvoiceEmail
{
  function sendInvoice($json)
  {
    if ($_SERVER['REQUEST_METHOD'] != 'POST') {
      http_response_code(405);
      return json_encode(["success" => false, "message" => "Send invoice requests must use POST."]);
    }

    if (empty($_SESSION['user_id'])) {
      http_response_code(401);
      return json_encode(["success" => false, "message" => "Sign in before sending an invoice email."]);
    }

    if (strtoupper($_SESSION['role_name'] ?? '') != 'CASHIER') {
      http_response_code(403);
      return json_encode(["success" => false, "message" => "Only the cashier who created the sale can email its invoice."]);
    }

    $data = json_decode($json, true);
    $salesId = isset($data['salesId']) ? (int) $data['salesId'] : 0;

    if ($salesId < 1) {
      http_response_code(400);
      return json_encode(["success" => false, "message" => "The sale was not found."]);
    }

    try {
      include __DIR__ . "/../api/connection-pdo.php";

      $sql = "SELECT i.invoice_id, i.invoice_number, i.due_date, i.amount_due,
          c.customer_name, c.email
          FROM invoice i
          INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
          INNER JOIN customers c ON s.customer_id = c.customer_id
          WHERE s.sales_id = :salesId AND s.created_by = :userId
            AND s.status = 'COMPLETED'";
      $stmt = $conn->prepare($sql);
      $stmt->bindValue(":salesId", $salesId, PDO::PARAM_INT);
      $stmt->bindValue(":userId", (int) $_SESSION['user_id'], PDO::PARAM_INT);
      $stmt->execute();
      $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

      if (!$invoice) {
        http_response_code(404);
        return json_encode(["success" => false, "message" => "An AR invoice could not be found for this sale."]);
      }

      $notificationKey = "ar-invoice-" . $invoice['invoice_id'];
      $stmt = $conn->prepare("SELECT notification_key FROM email_notification_state WHERE notification_key = :notificationKey");
      $stmt->bindValue(":notificationKey", $notificationKey);
      $stmt->execute();

      if ($stmt->fetchColumn() !== false) {
        return json_encode(["success" => true, "message" => "The invoice was already emailed."]);
      }

      $fileName = preg_replace('/[^A-Za-z0-9_-]/', '', $invoice['invoice_number']) . ".pdf";
      $filePath = __DIR__ . "/../invoices/" . $fileName;

      if (!is_file($filePath) || !is_readable($filePath)) {
        return json_encode(["success" => false, "message" => "The invoice PDF was not saved, so it could not be emailed."]);
      }

      $escape = function ($value) {
        return htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
      };
      $amount = number_format((float) $invoice['amount_due'], 2);
      $html = "<p>Dear " . $escape($invoice['customer_name']) . ",</p>"
        . "<p>Please find your Accounts Receivable invoice attached.</p>"
        . "<p><strong>Invoice:</strong> " . $escape($invoice['invoice_number']) . "<br>"
        . "<strong>Due date:</strong> " . $escape($invoice['due_date']) . "<br>"
        . "<strong>Amount due:</strong> PHP " . $escape($amount) . "</p>";

      $mailer = new PosMailer();
      $mailer->send(
        $invoice['email'],
        $invoice['customer_name'],
        "Accounts Receivable Invoice " . $invoice['invoice_number'],
        $html,
        $filePath
      );

      $sql = "INSERT INTO email_notification_state
          (notification_key, notification_type, customer_id, invoice_id, notified_at)
          SELECT :notificationKey, 'AR_INVOICE', s.customer_id, i.invoice_id, NOW()
          FROM invoice i
          INNER JOIN sales_hdr s ON i.sales_id = s.sales_id
          WHERE i.invoice_id = :invoiceId
          ON DUPLICATE KEY UPDATE notified_at = VALUES(notified_at)";
      $stmt = $conn->prepare($sql);
      $stmt->bindValue(":notificationKey", $notificationKey);
      $stmt->bindValue(":invoiceId", (int) $invoice['invoice_id'], PDO::PARAM_INT);
      $stmt->execute();

      return json_encode(["success" => true, "message" => "Invoice emailed to the customer."]);
    } catch (Throwable $e) {
      error_log("AR invoice email failed: " . $e->getMessage());
      http_response_code(500);
      return json_encode(["success" => false, "message" => "The invoice email could not be sent. Check the mail and database configuration, then try again."]);
    }
  }
}

if ($_SERVER['REQUEST_METHOD'] != 'POST') {
  http_response_code(405);
  echo json_encode(["success" => false, "message" => "Send invoice requests must use POST."]);
  exit;
}

$operation = $_POST['operation'] ?? '';
$json = $_POST['json'] ?? "";

if ($operation != 'sendInvoice') {
  http_response_code(400);
  echo json_encode(["success" => false, "message" => "Invalid operation."]);
  exit;
}

$invoiceEmail = new InvoiceEmail();
echo $invoiceEmail->sendInvoice($json);
