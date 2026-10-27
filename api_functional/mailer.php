<?php
require_once __DIR__ . "/../vendor/autoload.php";

class PosMailer
{
  private $settings;

  function __construct()
  {
    $this->settings = require __DIR__ . "/../mailer_details.php";
  }

  function send($recipient, $recipientName, $subject, $html, $attachment = null)
  {
    $missingSettings = [];
    if (empty($this->settings['host']) || $this->settings['host'] == 'smtp.example.com') {
      $missingSettings[] = 'SMTP host';
    }
    if (empty($this->settings['username'])) {
      $missingSettings[] = 'SMTP username';
    }
    if (empty($this->settings['password'])) {
      $missingSettings[] = 'SMTP password';
    }
    if (empty($this->settings['from_email'])
      || !filter_var($this->settings['from_email'], FILTER_VALIDATE_EMAIL)) {
      $missingSettings[] = 'sender email';
    }
    if ($missingSettings) {
      throw new RuntimeException(
        "Mailer settings missing/invalid: " . implode(', ', $missingSettings)
        . ". Set them in mailer_details.local.php or the POS_AR_* environment variables."
      );
    }

    if (!filter_var($recipient, FILTER_VALIDATE_EMAIL)) {
      throw new RuntimeException("The customer does not have a valid email address.");
    }

    $smtpPassword = preg_replace('/\s+/', '', trim($this->settings['password']));
    if (strtolower($this->settings['host']) == 'smtp.gmail.com'
      && !preg_match('/^[A-Za-z0-9]{16}$/', $smtpPassword)) {
      throw new RuntimeException(
        "Gmail requires a 16-character Google App Password. Generate a new App Password and enter all 16 characters; spaces are ignored."
      );
    }

    $mail = new \PHPMailer\PHPMailer\PHPMailer(true);
    $mail->isSMTP();
    $mail->Host = $this->settings['host'];
    $mail->SMTPAuth = true;
    $mail->Username = $this->settings['username'];
    $mail->Password = $smtpPassword;
    $mail->Port = $this->settings['port'];
    $mail->CharSet = 'UTF-8';

    if ($this->settings['encryption'] == 'tls') {
      $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_STARTTLS;
    } else if ($this->settings['encryption'] == 'ssl') {
      $mail->SMTPSecure = \PHPMailer\PHPMailer\PHPMailer::ENCRYPTION_SMTPS;
    } else if ($this->settings['encryption'] != '') {
      throw new RuntimeException("SMTP encryption must be tls, ssl, or blank.");
    }

    $mail->setFrom($this->settings['from_email'], $this->settings['from_name']);
    $mail->addAddress($recipient, $recipientName);
    $mail->isHTML(true);
    $mail->Subject = $subject;
    $mail->Body = $html;
    $mail->AltBody = trim(strip_tags(str_replace(['<br>', '<br/>', '<br />'], "\n", $html)));

    if ($attachment !== null) {
      if (!is_file($attachment) || !is_readable($attachment)) {
        throw new RuntimeException("The invoice PDF is unavailable.");
      }
      $mail->addAttachment($attachment);
    }

    $mail->send();
  }
}
