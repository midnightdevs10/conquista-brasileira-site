<?php
// images_upload.php — POST — envia nova imagem. Se colidir com existente, 409.

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

requireLocalhost();
requireMethod('POST');

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

// Nome desejado (opcional). Se vazio, usa o basename do arquivo enviado.
$requested = (string) ($_POST['name'] ?? '');
$origName  = $requested !== '' ? $requested : ($file['name'] ?? '');
$normalized = adminNormalizeName($origName);
if ($normalized === null) {
    jsonError('bad_name', 'Nome de arquivo inválido. Use apenas letras minúsculas, números, ponto e hífen, com extensão .png/.jpg/.svg/.webp.', 400);
}

$destAbs = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $normalized;
$collision = is_file($destAbs);

if ($collision) {
    jsonError(
        'collision',
        "Já existe um arquivo chamado \"$normalized\". Use 'Substituir' para trocar pelo slot existente.",
        409,
        ['existing' => $normalized]
    );
}

// Valida
$validation = adminValidateUpload($tmpAbs, $origName);
if ($validation['ok'] !== true) {
    jsonError($validation['code'], $validation['message'], 400);
}

// Move atomicamente: tmp + rename
$tmpFinal = $destAbs . '.tmp';
if (!@move_uploaded_file($tmpAbs, $tmpFinal)) {
    jsonError('move_failed', 'Não foi possível gravar o arquivo.', 500);
}
if (!@rename($tmpFinal, $destAbs)) {
    @unlink($tmpFinal);
    jsonError('rename_failed', 'Falha ao finalizar o upload.', 500);
}

// Gera thumb
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
]);
