<?php
// router.php - PHP 内置服务器路由
// 用法: php -S 127.0.0.1:8080 router.php
//
// 只处理 /api/invoke，其余路径返回 false 交给内置服务器托管静态文件。

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// 非 API 路径 → 交给静态文件处理（index.html 等）
if ($uri !== '/api/invoke') {
    return false;
}

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

// 只接受 POST
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method not allowed']);
    return true;
}

// 解析请求体
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);

if (!is_array($body) || empty($body['action'])) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'missing action']);
    return true;
}

// 组装 argv: [action, arg1, arg2, ...]
$args = [(string)$body['action']];
if (isset($body['args']) && is_array($body['args'])) {
    foreach ($body['args'] as $a) {
        if (is_string($a)) $args[] = $a;
    }
}

// 调 bash，每个参数 escapeshellarg，杜绝注入
$cmd = 'bash ' . __DIR__ . '/bridge.sh';
foreach ($args as $a) {
    $cmd .= ' ' . escapeshellarg($a);
}

$out = shell_exec($cmd);

if ($out === null || trim($out) === '') {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'empty output from bridge']);
    return true;
}

// 脚本已输出 {"ok":...}，原样透传
echo $out;
return true;