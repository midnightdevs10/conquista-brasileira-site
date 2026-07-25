<?php
// guard.php — exige que o request venha de localhost.
// Chamado no topo de index.php e de cada arquivo em api/.

declare(strict_types=1);

require_once __DIR__ . '/paths.php';

if (!function_exists('requireLocalhost')) {
    function requireLocalhost(): void
    {
        $ip   = $_SERVER['REMOTE_ADDR']          ?? '';
        $host = $_SERVER['HTTP_HOST']             ?? '';
        $xff  = $_SERVER['HTTP_X_FORWARDED_FOR']  ?? '';

        $isLoopback      = in_array($ip, ['127.0.0.1', '::1'], true);
        $isLocalhostHost = stripos($host, 'localhost')   !== false
                        || stripos($host, '127.0.0.1')   !== false;

        if (!$isLoopback || !$isLocalhostHost || $xff !== '') {
            http_response_code(403);
            header('Content-Type: text/plain; charset=utf-8');
            echo "Forbidden: admin is only accessible from localhost.";
            exit;
        }
    }
}
