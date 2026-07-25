<?php
// images_shot.php — GET — gera/cacheia e devolve o screenshot de um hit HTML.
// Lazy: só roda o Edge quando o frontend pede. Cacheia em disco.

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

requireLocalhost();
requireMethod('GET');

if (!function_exists('sitePublicUrl')) {
    function sitePublicUrl(): string
    {
        // O site público (que o cliente final vê) roda em http://127.0.0.1:8080/
        // (servido por python -m http.server 8080 no diretório do projeto).
        // O admin roda em :8000 (php -m). Usar :8080 pra que o print do admin
        // reflita exatamente o site como o usuário final vê.
        return 'http://127.0.0.1:8080/';
    }
}

$name = adminNormalizeName((string) ($_GET['f'] ?? ''));
$line = (int) ($_GET['line'] ?? 0);
if ($name === null || $line <= 0) {
    http_response_code(400);
    exit('Bad params');
}

$hit = [
    'category' => 'html',
    'file'     => 'index.html',
    'line'     => $line,
    'snippet'  => '<img src="..." />', // forçado para passar o filtro de screenshot
];
$abs = adminGetOrCreateScreenshot($name, $hit, sitePublicUrl());
if ($abs === null || !is_file($abs)) {
    http_response_code(404);
    exit('Screenshot unavailable');
}

$mtime = (int) filemtime($abs);
$size  = (int) filesize($abs);
header('Content-Type: image/png');
header('Content-Length: ' . $size);
header('Cache-Control: public, max-age=86400');
header('ETag: "' . $mtime . '"');
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');
readfile($abs);
exit;
