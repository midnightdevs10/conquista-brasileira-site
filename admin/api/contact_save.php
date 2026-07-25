<?php
// contact_save.php — salva os campos editáveis do módulo "Contato".
// Recebe POST com: whatsapp, phone.
// Normaliza o WhatsApp pra E.164 (55 + DDD + número) aceitando vários formatos
// de entrada: (11) 96380-5855, 11 963805855, +5511963805855, 5511963805855.
// Deriva whatsappDisplay a partir do normalizado.

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
requireLocalhost();
requireMethod('POST');

if (!is_file(ADMIN_CONFIG_FILE)) {
    jsonError('config_missing', 'Arquivo de configuração não encontrado.', 500);
}

$raw = file_get_contents(ADMIN_CONFIG_FILE);
$json = json_decode($raw, true);
if (!is_array($json)) {
    jsonError('config_invalid', 'JSON inválido em config.json.', 500);
}
if (!isset($json['company']) || !is_array($json['company'])) {
    $json['company'] = [];
}

// === Coleta input (aceita form-data ou JSON) ===
$input = $_POST;
if (empty($input)) {
    $body = file_get_contents('php://input');
    $decoded = json_decode($body, true);
    if (is_array($decoded)) $input = $decoded;
}

$whatsappIn = isset($input['whatsapp']) ? (string) $input['whatsapp'] : '';
$phoneIn    = isset($input['phone'])    ? (string) $input['phone']    : '';

// === Normaliza WhatsApp ===
$digits = preg_replace('/\D+/', '', $whatsappIn);
if ($digits === '') {
    jsonError('whatsapp_required', 'Informe o número de WhatsApp.', 400);
}

$local = $digits;
if (strpos($local, '55') === 0 && strlen($local) >= 12) {
    $local = substr($local, 2);
}

if (strlen($local) < 10 || strlen($local) > 11) {
    jsonError('whatsapp_invalid', 'Número de WhatsApp inválido. Use o formato (XX) 9XXXX-XXXX.', 400);
}
$ddd = substr($local, 0, 2);
$num = substr($local, 2);
if (!ctype_digit($ddd) || (int) $ddd < 11 || !ctype_digit($num) || (strlen($num) !== 8 && strlen($num) !== 9)) {
    jsonError('whatsapp_invalid', 'Número de WhatsApp inválido. Use o formato (XX) 9XXXX-XXXX.', 400);
}

$whatsapp        = '55' . $local;
$whatsappDisplay = '(' . $ddd . ') ' . (strlen($num) === 9
    ? substr($num, 0, 5) . '-' . substr($num, 5)
    : substr($num, 0, 4) . '-' . substr($num, 4));

// === Telefone: livre; se vazio, usa o display do wpp ===
$phone = trim($phoneIn);
if ($phone === '') $phone = $whatsappDisplay;

// === Persiste (escrita atômica: arquivo temporário + rename) ===
$json['company']['whatsapp']        = $whatsapp;
$json['company']['whatsappDisplay'] = $whatsappDisplay;
$json['company']['phone']           = $phone;

$encoded = json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($encoded === false) {
    jsonError('encode_failed', 'Falha ao codificar JSON: ' . json_last_error_msg(), 500);
}

$tmp = ADMIN_CONFIG_FILE . '.tmp';
if (file_put_contents($tmp, $encoded, LOCK_EX) === false) {
    jsonError('write_failed', 'Não consegui escrever no arquivo temporário.', 500);
}
if (!rename($tmp, ADMIN_CONFIG_FILE)) {
    @unlink($tmp);
    jsonError('write_failed', 'Não consegui substituir o config.json.', 500);
}

jsonResponse([
    'ok' => true,
    'contact' => [
        'whatsapp'        => $whatsapp,
        'whatsappDisplay' => $whatsappDisplay,
        'phone'           => $phone,
    ],
    'message' => 'Contato atualizado com sucesso.',
]);
