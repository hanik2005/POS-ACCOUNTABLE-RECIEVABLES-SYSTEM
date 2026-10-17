<?php
require_once __DIR__ . "/config-cors.php";

//start the session only once, even if this file is included by another api
if (session_status() == PHP_SESSION_NONE) {
  session_start();
}

class Session
{
  function saveSession($user)
  {
    //new session id after login
    session_regenerate_id(true);

    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['full_name'] = $user['full_name'];
    $_SESSION['email'] = $user['email'];
    $_SESSION['role_id'] = $user['role_id'];
    $_SESSION['role_name'] = $user['role_name'];
  }
  function getUserId()
  {
    return isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
  }

  function getSession()
  {
    if (!isset($_SESSION['user_id'])) {
      return json_encode([
        "success" => false,
        "message" => "Not logged in"
      ]);
    }

    return json_encode([
      "success" => true,
      "user" => [
        "user_id" => $_SESSION['user_id'],
        "username" => $_SESSION['username'],
        "full_name" => $_SESSION['full_name'],
        "email" => $_SESSION['email'],
        "role_id" => $_SESSION['role_id'],
        "role_name" => $_SESSION['role_name']
      ]
    ]);
  }

  function logout()
  {
    $_SESSION = [];
    session_destroy();

    return json_encode([
      "success" => true,
      "message" => "Logged out"
    ]);
  }
}

//run the request only when session.php is called directly, not when it is included
if (basename($_SERVER['SCRIPT_FILENAME']) == basename(__FILE__)) {

  //submitted by the client - operation
  if ($_SERVER['REQUEST_METHOD'] == 'GET') {
    $operation = $_GET['operation'] ?? '';
  } else if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $operation = $_POST['operation'] ?? '';
  } else {
    $operation = '';
  }

  $session = new Session();
  switch ($operation) {
    case "getSession":
      echo $session->getSession();
      break;
    case "logout":
      echo $session->logout();
      break;
  }
}