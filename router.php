<?php
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// 1. API 路由
if ($uri === '/api/invoke') {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');

    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        http_response_code(405);
        echo json_encode(['ok' => false, 'error' => 'method not allowed']);
        return true;
    }

    $raw  = file_get_contents('php://input');
    $body = json_decode($raw, true);

    if (!is_array($body) || empty($body['action'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'missing action']);
        return true;
    }

    $args = [(string)$body['action']];
    if (isset($body['args']) && is_array($body['args'])) {
        foreach ($body['args'] as $a) {
            if (is_string($a)) $args[] = $a;
        }
    }

    $cmd = 'bash ' . __DIR__ . '/bridge.sh';
    foreach ($args as $a) {
        $cmd .= ' ' . escapeshellarg($a);
    }

    $out = shell_exec($cmd . ' 2>&1');

    if ($out === null || trim($out) === '') {
        http_response_code(500);
        echo json_encode(['ok' => false, 'error' => 'empty output from bridge']);
        return true;
    }

    echo $out;
    return true;
}

// 2. 静态文件直接放行（css/js/图片等）
if ($uri !== '/' && file_exists(__DIR__ . $uri) && !is_dir(__DIR__ . $uri)) {
    return false; // 交给 PHP 内置服务器处理
}

// 3. 其他所有路径（比如 /users/repos 等），全部回退到 index.html
header('Content-Type: text/html; charset=utf-8');
readfile(__DIR__ . '/index.html');
return true;