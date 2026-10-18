<?php
require_once __DIR__ . "/../api/config-cors.php";

include "../api/session.php";

class BarcodeScanner
{
  function getRequestJson()
  {
    if ($_SERVER['REQUEST_METHOD'] == 'GET') {
      return isset($_GET['json']) ? $_GET['json'] : "";
    }

    return isset($_POST['json']) ? $_POST['json'] : "";
  }

  function createSession()
  {
    include "../api/connection-pdo.php";

    $session = new Session();
    $userId = $session->getUserId();
    $roleName = strtoupper($_SESSION['role_name'] ?? '');

    if (!$userId || !in_array($roleName, ['ADMIN', 'CASHIER'], true)) {
      return json_encode([
        "success" => false,
        "message" => "Sign in as an admin or cashier to pair a barcode scanner."
      ]);
    }

    $stmt = $conn->prepare("UPDATE barcode_scanner_sessions SET status = 'CLOSED'
        WHERE user_id = :userId AND status IN ('ACTIVE', 'PAIRED')");
    $stmt->bindParam(":userId", $userId);
    $stmt->execute();

    do {
      $pairingCode = str_pad((string) random_int(0, 99999999), 8, "0", STR_PAD_LEFT);
      $stmt = $conn->prepare("SELECT scanner_session_id FROM barcode_scanner_sessions WHERE pairing_code = :pairingCode LIMIT 1");
      $stmt->bindParam(":pairingCode", $pairingCode);
      $stmt->execute();
    } while ($stmt->fetchColumn());

    $sql = "INSERT INTO barcode_scanner_sessions(user_id, pairing_code, status, created_at, expires_at)
        VALUES(:userId, :pairingCode, 'ACTIVE', NOW(), DATE_ADD(NOW(), INTERVAL 10 MINUTE))";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->bindParam(":pairingCode", $pairingCode);
    $stmt->execute();

    return json_encode([
      "success" => true,
      "pairingCode" => $pairingCode
    ]);
  }

  function validateSession($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $pairingCode = trim($json['pairingCode'] ?? '');
    $stmt = $conn->prepare("SELECT scanner_session_id FROM barcode_scanner_sessions
        WHERE pairing_code = :pairingCode AND status IN ('ACTIVE', 'PAIRED') AND expires_at > NOW()
        ORDER BY scanner_session_id DESC LIMIT 1");
    $stmt->bindParam(":pairingCode", $pairingCode);
    $stmt->execute();

    $scannerSessionId = $stmt->fetchColumn();

    if (!$scannerSessionId) {
      return json_encode([
        "success" => false,
        "message" => "Pairing code is invalid or expired. Create a new code on the POS."
      ]);
    }

    $stmt = $conn->prepare("UPDATE barcode_scanner_sessions SET status = 'PAIRED'
        WHERE scanner_session_id = :scannerSessionId AND status = 'ACTIVE'");
    $stmt->bindParam(":scannerSessionId", $scannerSessionId);
    $stmt->execute();

    return json_encode(["success" => true]);
  }

  function addScan($json)
  {
    include "../api/connection-pdo.php";

    $json = json_decode($json, true);
    $pairingCode = trim($json['pairingCode'] ?? '');
    $barcode = trim($json['barcode'] ?? '');

    if (!preg_match('/^\d{8}$/', $pairingCode) || $barcode == '' || strlen($barcode) > 128) {
      return json_encode([
        "success" => false,
        "message" => "Enter a valid pairing code and barcode."
      ]);
    }

    $sql = "SELECT scanner_session_id FROM barcode_scanner_sessions
        WHERE pairing_code = :pairingCode AND status IN ('ACTIVE', 'PAIRED') AND expires_at > NOW()
        ORDER BY scanner_session_id DESC LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":pairingCode", $pairingCode);
    $stmt->execute();
    $scannerSessionId = $stmt->fetchColumn();

    if (!$scannerSessionId) {
      return json_encode([
        "success" => false,
        "message" => "Pairing code is invalid or expired. Create a new code on the POS."
      ]);
    }

    $sql = "INSERT INTO barcode_scanner_scans(scanner_session_id, barcode, created_at)
        VALUES(:scannerSessionId, :barcode, NOW())";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":scannerSessionId", $scannerSessionId);
    $stmt->bindParam(":barcode", $barcode);
    $stmt->execute();

    return json_encode(["success" => true]);
  }

  function getScans($json)
  {
    include "../api/connection-pdo.php";

    $session = new Session();
    $userId = $session->getUserId();
    $json = json_decode($json, true);
    $pairingCode = trim($json['pairingCode'] ?? '');

    if (!$userId) {
      return json_encode([
        "success" => false,
        "message" => "Cashier session ended."
      ]);
    }

    $sql = "SELECT scanner_session_id, status FROM barcode_scanner_sessions
        WHERE user_id = :userId AND pairing_code = :pairingCode
          AND status IN ('ACTIVE', 'PAIRED') AND expires_at > NOW()
        ORDER BY scanner_session_id DESC LIMIT 1";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->bindParam(":pairingCode", $pairingCode);
    $stmt->execute();
    $scannerSession = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$scannerSession) {
      return json_encode([
        "success" => false,
        "message" => "Scanner pairing expired. Start a new scanner session."
      ]);
    }

    $scannerSessionId = $scannerSession['scanner_session_id'];
    $paired = $scannerSession['status'] == 'PAIRED';

    $conn->beginTransaction();
    try {
      $sql = "SELECT scan_id, barcode FROM barcode_scanner_scans
          WHERE scanner_session_id = :scannerSessionId AND consumed_at IS NULL
          ORDER BY scan_id FOR UPDATE";
      $stmt = $conn->prepare($sql);
      $stmt->bindParam(":scannerSessionId", $scannerSessionId);
      $stmt->execute();
      $scans = $stmt->fetchAll(PDO::FETCH_ASSOC);

      if (count($scans) > 0) {
        $scanIds = array_column($scans, 'scan_id');
        $placeholders = implode(',', array_fill(0, count($scanIds), '?'));
        $stmt = $conn->prepare("UPDATE barcode_scanner_scans SET consumed_at = NOW() WHERE scan_id IN ($placeholders)");
        $stmt->execute($scanIds);
      }

      $conn->commit();
      $scans = array_map(function ($scan) {
        return ["barcode" => $scan['barcode']];
      }, $scans);

      return json_encode([
        "success" => true,
        "paired" => $paired,
        "scans" => $scans
      ]);
    } catch (Exception $error) {
      $conn->rollBack();

      return json_encode([
        "success" => false,
        "message" => "Could not read scanned barcodes."
      ]);
    }
  }

  function closeSession($json)
  {
    include "../api/connection-pdo.php";

    $session = new Session();
    $userId = $session->getUserId();
    $json = json_decode($json, true);
    $pairingCode = trim($json['pairingCode'] ?? '');

    if (!$userId) {
      return json_encode(["success" => false]);
    }

    $sql = "UPDATE barcode_scanner_sessions SET status = 'CLOSED'
        WHERE user_id = :userId AND pairing_code = :pairingCode
          AND status IN ('ACTIVE', 'PAIRED')";
    $stmt = $conn->prepare($sql);
    $stmt->bindParam(":userId", $userId);
    $stmt->bindParam(":pairingCode", $pairingCode);
    $stmt->execute();

    return json_encode(["success" => true]);
  }
}

if ($_SERVER['REQUEST_METHOD'] == 'GET') {
  $operation = $_GET['operation'] ?? '';
} else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
  $operation = $_POST['operation'] ?? '';
} else {
  $operation = '';
}

$scanner = new BarcodeScanner();
$json = $scanner->getRequestJson();

switch ($operation) {
  case "createSession":
    echo $scanner->createSession();
    break;
  case "validateSession":
    echo $scanner->validateSession($json);
    break;
  case "addScan":
    echo $scanner->addScan($json);
    break;
  case "getScans":
    echo $scanner->getScans($json);
    break;
  case "closeSession":
    echo $scanner->closeSession($json);
    break;
}
