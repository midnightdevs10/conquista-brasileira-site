<?php
// cardapio_get.php — devolve o menu (config.json) e as seções do livro
// (data/cardapio-sections.json) para o admin renderizar e editar.

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

$menu = isset($json['menu']) && is_array($json['menu']) ? $json['menu'] : ['groups' => []];

// cardapio-sections.json é opcional. Se não existir, devolve um array vazio
// (a UI do admin oferece "criar inicial").
$sections = [];
if (is_file(ADMIN_CARDAPIO_SECTIONS_FILE)) {
    $sRaw = file_get_contents(ADMIN_CARDAPIO_SECTIONS_FILE);
    $sJson = json_decode($sRaw, true);
    if (is_array($sJson) && isset($sJson['sections']) && is_array($sJson['sections'])) {
        $sections = $sJson['sections'];
    }
}

jsonResponse(['ok' => true, 'menu' => $menu, 'cardapioSections' => $sections]);
