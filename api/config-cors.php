<?php
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originParts = parse_url($origin);
$originHost = strtolower(trim(is_array($originParts) ? ($originParts['host'] ?? '') : '', '[]'));
$originScheme = strtolower(is_array($originParts) ? ($originParts['scheme'] ?? '') : '');
$isLocalhost = in_array($originHost, ['localhost', '127.0.0.1', '::1'], true);
$isIpAddress = filter_var($originHost, FILTER_VALIDATE_IP) !== false;
$isAllowedOrigin = in_array($originScheme, ['http', 'https'], true)
    && ($isLocalhost || $isIpAddress);

if ($origin !== '') {
    header('Vary: Origin');
}

if ($isAllowedOrigin) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
} elseif ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(403);
    exit;
}

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}
