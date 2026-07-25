<?php
// bootstrap.php — carrega todos os includes do admin num único require.
// Cada endpoint PHP faz: require __DIR__ . '/../includes/bootstrap.php';

declare(strict_types=1);

require_once __DIR__ . '/paths.php';
require_once __DIR__ . '/guard.php';
require_once __DIR__ . '/http.php';
require_once __DIR__ . '/svg_sanitize.php';
require_once __DIR__ . '/image_lib.php';
require_once __DIR__ . '/usage_scanner.php';
require_once __DIR__ . '/session_map.php';
require_once __DIR__ . '/screenshot.php';

// Erros viram JSON (em vez de HTML), para não quebrar o frontend.
ini_set('display_errors', '0');
ini_set('html_errors', '0');
ini_set('max_execution_time', '120');
error_reporting(E_ALL);
set_error_handler(function ($severity, $message, $file, $line) {
    if (!(error_reporting() & $severity)) return false;
    if (function_exists('jsonError')) {
        jsonError('php_error', "$message em $file:$line", 500);
    }
    return false;
});
set_exception_handler(function ($e) {
    if (function_exists('jsonError')) {
        jsonError('exception', $e->getMessage(), 500);
    }
    return false;
});

// Sessão mínima (o módulo de imagens não usa hoje, mas o shell pode usar).
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
