<?php
// http.php — helpers de resposta HTTP, JSON, validação de método.
// Toda resposta da API passa por aqui, então os headers anti-cache são uniformes.

declare(strict_types=1);

if (!function_exists('sendNoStoreHeaders')) {
    function sendNoStoreHeaders(): void
    {
        header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
        header('Pragma: no-cache');
        header('Expires: 0');
    }
}

if (!function_exists('jsonResponse')) {
    /**
     * Emite uma resposta JSON com status HTTP e os headers anti-cache.
     * @param array $payload
     */
    function jsonResponse(array $payload, int $status = 200): void
    {
        sendNoStoreHeaders();
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
}

if (!function_exists('jsonError')) {
    function jsonError(string $code, string $message, int $status = 400, array $extra = []): void
    {
        jsonResponse(['ok' => false, 'code' => $code, 'message' => $message] + $extra, $status);
    }
}

if (!function_exists('requireMethod')) {
    function requireMethod(string $expected): void
    {
        $m = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
        if ($m !== strtoupper($expected)) {
            jsonError('method_not_allowed', "Método esperado: $expected, recebido: $m", 405);
        }
    }
}
