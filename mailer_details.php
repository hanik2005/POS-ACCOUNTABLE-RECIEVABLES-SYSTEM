<?php
$settings = [
  'host' => getenv('POS_AR_SMTP_HOST') ?: 'smtp.gmail.com',
  'port' => (int) (getenv('POS_AR_SMTP_PORT') ?: 465),
  'encryption' => strtolower(getenv('POS_AR_SMTP_ENCRYPTION') ?: 'ssl'),
  'username' => getenv('POS_AR_SMTP_USERNAME') ?: '',
  'password' => getenv('POS_AR_SMTP_PASSWORD') ?: '',
  'from_email' => getenv('POS_AR_MAIL_FROM') ?: '',
  'from_name' => getenv('POS_AR_MAIL_NAME') ?: 'POS & Accounts Receivable',
];

$localSettingsFile = __DIR__ . "/mailer_details.local.php";
if (is_file($localSettingsFile)) {
  $localSettings = require $localSettingsFile;
  if (!is_array($localSettings)) {
    throw new RuntimeException("mailer_details.local.php must return an array.");
  }
  $settings = array_merge($settings, $localSettings);
}

return $settings;
