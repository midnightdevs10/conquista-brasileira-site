<?php
// images_swap.php — POST — substitui um slot existente. Move antigo pra .bak.

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

requireLocalhost();
requireMethod('POST');

$slot = (string) ($_POST['slot'] ?? '');
$normalized = adminNormalizeName($slot);
if ($normalized === null) {
    jsonError('bad_slot', 'Nome de slot inválido.', 400);
}
$destAbs = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $normalized;
if (!is_file($destAbs)) {
    jsonError('slot_not_found', "Slot \"$normalized\" não existe.", 404);
}

if (!isset($_FILES['file']) || !is_array($_FILES['file']) || ($_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_NO_FILE) {
    jsonError('no_file', 'Nenhum arquivo enviado.', 400);
}
$file = $_FILES['file'];
if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
    jsonError('upload_error', 'Falha no upload (código ' . $file['error'] . ').', 400);
}
$tmpAbs = $file['tmp_name'] ?? '';
if (!is_uploaded_file($tmpAbs)) {
    jsonError('not_uploaded', 'Arquivo temporário inválido.', 400);
}
$origName = (string) ($file['name'] ?? $normalized);

$validation = adminValidateUpload($tmpAbs, $origName);
if ($validation['ok'] !== true) {
    jsonError($validation['code'], $validation['message'], 400);
}

// Sequência atômica:
// 1. move novo -> <dest>.tmp
// 2. move <dest> -> <dest>.bak (sobrescreve bak anterior)
// 3. rename <dest>.tmp -> <dest>
$tmpFinal = $destAbs . '.tmp';
$bakAbs   = $destAbs . '.bak';

if (!@move_uploaded_file($tmpAbs, $tmpFinal)) {
    jsonError('move_failed', 'Não foi possível gravar o novo arquivo.', 500);
}
if (is_file($bakAbs)) {
    @unlink($bakAbs);
}
if (!@rename($destAbs, $bakAbs)) {
    // Se o rename falhar (permissão?), aborta
    @unlink($tmpFinal);
    jsonError('backup_failed', 'Não foi possível fazer backup do arquivo atual.', 500);
}
if (!@rename($tmpFinal, $destAbs)) {
    // Tenta reverter
    @rename($bakAbs, $destAbs);
    @unlink($tmpFinal);
    jsonError('swap_failed', 'Falha ao finalizar a substituição.', 500);
}

// Regenera thumb
adminMakeThumb($destAbs, $normalized);

$size  = (int) filesize($destAbs);
$mtime = (int) filemtime($destAbs);

jsonResponse([
    'ok'   => true,
    'name' => $normalized,
    'path' => 'assets/images/' . $normalized,
    'size' => $size,
    'mtime'=> $mtime,
    'mime' => $validation['mime'],
    'width'=> $validation['w'],
    'height'=> $validation['h'],
    'thumb'=> 'admin/api/image_serve.php?f=' . rawurlencode($normalized) . '&t=thumb&v=' . $mtime,
    'full' => 'admin/api/image_serve.php?f=' . rawurlencode($normalized) . '&t=full&v=' . $mtime,
    'usage'=> scanUsage('assets/images/' . $normalized),
    'backup' => is_file($bakAbs),
]);
