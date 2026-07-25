<?php
// hours_save.php — salva os horários no config.json.
// Recebe POST com hours = array de objetos { day, open, close, isClosed? }.
// Valida: HH:MM, open < close quando não-fechado, dia conhecido.

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

// === Coleta input (aceita form-data com hours[] ou JSON cru) ===
$input = $_POST;
if (empty($input)) {
    $body = file_get_contents('php://input');
    $decoded = json_decode($body, true);
    if (is_array($decoded)) $input = $decoded;
}

if (!isset($input['hours']) || !is_array($input['hours'])) {
    jsonError('hours_required', 'Array de horários ausente.', 400);
}

// Ordem canônica dos dias
$DAY_ORDER = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];

// Indexa input por dia pra aceitar qualquer ordem e lidar com dias faltantes
$byDay = [];
foreach ($input['hours'] as $row) {
    if (!is_array($row) || empty($row['day'])) continue;
    $byDay[(string) $row['day']] = $row;
}

// Monta array final, sempre com os 7 dias (preserva a ordem canônica)
$normalized = [];
foreach ($DAY_ORDER as $day) {
    $row = $byDay[$day] ?? null;
    if (!$row) {
        // Sem input pra esse dia: mantém o que está no config, ou cria padrão fechado
        $existing = null;
        if (isset($json['hours']) && is_array($json['hours'])) {
            foreach ($json['hours'] as $h) {
                if (isset($h['day']) && $h['day'] === $day) { $existing = $h; break; }
            }
        }
        $row = $existing ?: ['open' => '00:00', 'close' => '00:00', 'isClosed' => true, 'open' => 'Fechado'];
    }

    $isClosed = !empty($row['isClosed']);

    if ($isClosed) {
        // Dia fechado: open e close viram texto livre (default: "Fechado")
        $normalized[] = [
            'day'      => $day,
            'open'     => isset($row['open'])  ? (string) $row['open']  : 'Fechado',
            'close'    => isset($row['close']) ? (string) $row['close'] : '',
            'isClosed' => true,
        ];
        continue;
    }

    // Valida formato HH:MM
    $open  = isset($row['open'])  ? (string) $row['open']  : '';
    $close = isset($row['close']) ? (string) $row['close'] : '';
    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $open)) {
        jsonError('hours_invalid', "Horário de abertura inválido para $day: '$open'.", 400);
    }
    if (!preg_match('/^([01]\d|2[0-3]):[0-5]\d$/', $close)) {
        jsonError('hours_invalid', "Horário de fechamento inválido para $day: '$close'.", 400);
    }
    if (strcmp($open, $close) >= 0) {
        jsonError('hours_invalid', "Em $day, o horário de abertura ($open) deve ser menor que o de fechamento ($close).", 400);
    }

    $normalized[] = [
        'day'      => $day,
        'open'     => $open,
        'close'    => $close,
        'isClosed' => false,
    ];
}

// === Persiste ===
$json['hours'] = $normalized;

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

jsonResponse(['ok' => true, 'hours' => $normalized, 'message' => 'Horários atualizados com sucesso.']);
