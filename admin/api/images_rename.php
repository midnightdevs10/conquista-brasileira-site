<?php
// images_rename.php — POST — renomeia arquivo + thumb. NÃO toca config/html/js.

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

requireLocalhost();
requireMethod('POST');

$from = (string) ($_POST['from'] ?? '');
$to   = (string) ($_POST['to']   ?? '');

$nFrom = adminNormalizeName($from);
$nTo   = adminNormalizeName($to);
if ($nFrom === null || $nTo === null) {
    jsonError('bad_name', 'Nome inválido (origem ou destino).', 400);
}
if ($nFrom === $nTo) {
    jsonError('same_name', 'Origem e destino são iguais.', 400);
}
$fromAbs = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $nFrom;
$toAbs   = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $nTo;
if (!is_file($fromAbs)) {
    jsonError('from_not_found', "Arquivo \"$nFrom\" não existe.", 404);
}
if (is_file($toAbs)) {
    jsonError('to_exists', "Já existe um arquivo chamado \"$nTo\".", 409);
}

// .bak do original antes de renomear
$bakAbs = $fromAbs . '.bak';
if (is_file($bakAbs)) @unlink($bakAbs);
@copy($fromAbs, $bakAbs);

if (!@rename($fromAbs, $toAbs)) {
    jsonError('rename_failed', 'Falha ao renomear.', 500);
}
adminMoveThumb($nFrom, $nTo);

// Atualiza referências em index.html, data/**/*.json, js/**/*.js
$updatedFiles = updateImageReferences($nFrom, $nTo);

jsonResponse([
    'ok'           => true,
    'from'         => $nFrom,
    'to'           => $nTo,
    'usage'        => scanUsage('assets/images/' . $nTo),
    'updatedFiles' => $updatedFiles,
    'note'         => 'Arquivo renomeado' . (count($updatedFiles) > 0
        ? ' e referências atualizadas em ' . count($updatedFiles) . ' arquivo(s).'
        : '.'),
]);
