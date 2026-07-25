<?php
// config_get.php — GET — devolve data/config.json parseado.
// Usado pelo frontend do admin pra construir o mapa slot→seção.
// Read-only, com cache de 60s no browser.

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

requireLocalhost();
requireMethod('GET');

if (!is_file(ADMIN_CONFIG_FILE)) {
    jsonError('config_missing', 'Arquivo data/config.json não encontrado.', 404);
}

$raw = @file_get_contents(ADMIN_CONFIG_FILE);
if ($raw === false) {
    jsonError('read_failed', 'Não foi possível ler data/config.json.', 500);
}

$data = json_decode($raw, true);
if (!is_array($data)) {
    jsonError('config_invalid', 'data/config.json contém JSON inválido.', 500);
}

$mtime = (int) filemtime(ADMIN_CONFIG_FILE);
header('Cache-Control: public, max-age=60');
header('ETag: "' . $mtime . '"');

jsonResponse([
    'ok'    => true,
    'mtime' => $mtime,
    'config'=> $data,
]);
