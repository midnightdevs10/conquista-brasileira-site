<?php
// images_delete.php — POST — move arquivo (e thumb) para .trash/. Reversível.

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

requireLocalhost();
requireMethod('POST');

$name = (string) ($_POST['name'] ?? '');
$force = !empty($_POST['force']) && $_POST['force'] !== '0';

$normalized = adminNormalizeName($name);
if ($normalized === null) {
    jsonError('bad_name', 'Nome inválido.', 400);
}
$abs = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $normalized;
if (!is_file($abs)) {
    jsonError('not_found', "Arquivo \"$normalized\" não existe.", 404);
}

$usage = scanUsage('assets/images/' . $normalized);
$realUsage = array_filter($usage, fn($h) => $h['category'] !== 'missing');
if (count($realUsage) > 0 && !$force) {
    jsonError('in_use', "Arquivo em uso em " . count($realUsage) . " local(is). Confirme para excluir mesmo assim.", 409, [
        'usage' => array_values($realUsage),
    ]);
}

if (!is_dir(ADMIN_TRASH_DIR)) {
    @mkdir(ADMIN_TRASH_DIR, 0775, true);
}
$ts = date('Ymd-His');
$dest = ADMIN_TRASH_DIR . DIRECTORY_SEPARATOR . $normalized . '.' . $ts;

if (!@rename($abs, $dest)) {
    jsonError('trash_failed', 'Não foi possível mover para a lixeira.', 500);
}
adminDeleteThumb($normalized);

jsonResponse([
    'ok'     => true,
    'name'   => $normalized,
    'trashed'=> basename($dest),
    'usage'  => $usage,
    'note'   => 'Arquivo movido para assets/images/.trash/. Para reverter: mv .trash/'.basename($dest)." assets/images/$normalized",
]);
