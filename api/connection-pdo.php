<?php
$serverName = "localhost";
$dbusername = "root";
$dbpassword = "";
$dbname = "pos_ar_database";


//were using PDO
try {
    $conn = new PDO("mysql:host=$serverName;dbname=$dbname", $dbusername, $dbpassword);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo "Connection Failed: " .$e->getMessage();
}


?>