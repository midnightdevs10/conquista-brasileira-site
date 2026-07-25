<?php
// images_swap_from.php — POST — substitui um slot existente copiando o
// conteúdo de OUTRO arquivo que já está em assets/images/ (a "galeria").
// O arquivo-fonte é PRESERVADO (a galeria é uma biblioteca de imagens
// reutilizáveis; copiar para um slot não deve esgotá-la).
//
// Parâmetros POST:
//   slot     — nome do arquivo a ser substituído (ex: "logo.png")
//   source   — nome do arquivo de origem (ex: "festa-junina.png")
//
// Fluxo atômico:
//   1. Lê conteúdo do source para memória
//   2. Move slot atual -> slot.bak
//   3. Grava conteúdo do source no slot
//   4. NÃO remove o source (permanece na galeria)
//   5. Regenera thumb do slot

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

requireLocalhost();
requireMethod('POST');

$slot   = (string) ($_POST['slot']   ?? '');
$source = (string) ($_POST['source'] ?? '');

$slotNorm = adminNormalizeName($slot);
if ($slotNorm === null) {
    jsonError('bad_slot', 'Nome de slot inválido.', 400);
}
$sourceNorm = adminNormalizeName($source);
if ($sourceNorm === null) {
    jsonError('bad_source', 'Nome de origem inválido.', 400);
}
if ($slotNorm === $sourceNorm) {
    jsonError('same_file', 'O slot e a origem são o mesmo arquivo.', 400);
}

$slotAbs   = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $slotNorm;
$sourceAbs = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $sourceNorm;

if (!is_file($slotAbs)) {
    jsonError('slot_not_found', "Slot \"$slotNorm\" não existe.", 404);
}
if (!is_file($sourceAbs)) {
    jsonError('source_not_found', "Arquivo de origem \"$sourceNorm\" não existe.", 404);
}

// Lê conteúdo do source em memória. As imagens do site são tipicamente
// pequenas (logo ~50KB, fotos ~300KB), então cabe em RAM sem stress.
$content = @file_get_contents($sourceAbs);
if ($content === false) {
    jsonError('read_failed', 'Não foi possível ler o arquivo de origem.', 500);
}

$tmpFinal = $slotAbs . '.tmp';
$bakAbs   = $slotAbs . '.bak';

// 1. Grava source -> slot.tmp
if (@file_put_contents($tmpFinal, $content) === false) {
    jsonError('write_tmp_failed', 'Não foi possível gravar o arquivo temporário.', 500);
}

// 2. Backup do slot atual (.bak)
if (is_file($bakAbs)) {
    @unlink($bakAbs);
}
if (!@rename($slotAbs, $bakAbs)) {
    @unlink($tmpFinal);
    jsonError('backup_failed', 'Não foi possível fazer backup do slot atual.', 500);
}

// 3. Renomeia slot.tmp -> slot
if (!@rename($tmpFinal, $slotAbs)) {
    // Tenta reverter
    @rename($bakAbs, $slotAbs);
    @unlink($tmpFinal);
    jsonError('swap_failed', 'Falha ao finalizar a substituição.', 500);
}

// 4. O arquivo de origem permanece na galeria (não removemos).

// 5. Regenera thumb do slot (caso tenha vindo de um formato diferente)
adminMakeThumb($slotAbs, $slotNorm);

$size  = (int) filesize($slotAbs);
$mtime = (int) filemtime($slotAbs);

jsonResponse([
    'ok'    => true,
    'name'  => $slotNorm,
    'path'  => 'assets/images/' . $slotNorm,
    'size'  => $size,
    'mtime' => $mtime,
    'thumb' => 'admin/api/image_serve.php?f=' . rawurlencode($slotNorm) . '&t=thumb&v=' . $mtime,
    'full'  => 'admin/api/image_serve.php?f=' . rawurlencode($slotNorm) . '&t=full&v=' . $mtime,
    'usage' => scanUsage('assets/images/' . $slotNorm),
    'backup'=> is_file($bakAbs),
]);
