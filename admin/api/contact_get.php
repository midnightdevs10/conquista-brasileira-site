<?php
// contact_get.php — devolve os campos editáveis do módulo "Contato".
// Lê direto do config.json (mesma fonte de verdade do site público).

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

$company = isset($json['company']) && is_array($json['company']) ? $json['company'] : [];

jsonResponse([
    'ok' => true,
    'contact' => [
        'whatsapp'        => isset($company['whatsapp'])        ? (string) $company['whatsapp']        : '',
        'whatsappDisplay' => isset($company['whatsappDisplay']) ? (string) $company['whatsappDisplay'] : '',
        'phone'           => isset($company['phone'])           ? (string) $company['phone']           : '',
    ],
]);
