<?php
// hours_get.php — devolve os horários do config.json.

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
requireLocalhost();
requireMethod('GET');

if (!is_file(ADMIN_CONFIG_FILE)) {
    jsonError('config_missing', 'Arquivo de configuração não encontrado.', 500);
}

$raw = file_get_contents(ADMIN_CONFIG_FILE);
$json = json_decode($raw, true);
if (!is_array($json)) {
    jsonError('config_invalid', 'JSON inválido em config.json.', 500);
}

$hours = isset($json['hours']) && is_array($json['hours']) ? $json['hours'] : [];

jsonResponse(['ok' => true, 'hours' => $hours]);
