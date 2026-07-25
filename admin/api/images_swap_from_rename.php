<?php
// images_swap_from_rename.php — POST — "Escolher da galeria" COM renomeação.
//
// Comportamento desejado pelo dono:
//   - O slot atual (ex: "logo.png") está em uso em N lugares do site
//   - O dono escolhe uma imagem da galeria (ex: "festa-junina.png")
//   - O admin digita o NOME FINAL (default = nome do source) que o slot
//     vai passar a ter — ex: "marca.png"
//   - O conteúdo do slot passa a ser o da imagem escolhida
//   - A imagem antiga do slot é preservada na galeria
//     (sempre existe o backup "imagem-A-old-<timestamp>.<ext>")
//   - Todas as referências em index.html, data/config.json e js/**/*.js
//     que apontavam pro nome antigo passam a apontar pro novo nome
//
// Parâmetros POST:
//   slot   — nome do arquivo atual (ex: "conjunto.png")
//   source — nome do arquivo de origem (ex: "festa-junina.png")
//   name   — (opcional) nome final que o slot vai passar a ter.
//            Se vazio, default = nome do source. Deve ter a MESMA
//            extensão do slot. Se for igual ao source, é no-op
//            (o slot só ganha o conteúdo do source).
//
// Restrição: o nome final (seja o do source ou o digitado) precisa
// ter a MESMA extensão do slot. Use "Escolher arquivo" pra trocar
// por uma imagem de formato diferente.
//
// Fluxo atômico:
//   1. Valida nomes e extensões
//   2. Calcula nome final (source OU name digitado)
//   3. Lê conteúdo do source
//   4. Move slot -> preserved (galeria, com sufixo -old-<ts>)
//   5. Grava source no arquivo com nome final
//      (se nome final == source, sobrescreve ele mesmo — no-op)
//   6. Atualiza referências em index.html, data/**/*.json, js/**/*.js
//      (helper updateImageReferences)
//   7. Regenera thumbs

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

requireLocalhost();
requireMethod('POST');

$slot   = (string) ($_POST['slot']   ?? '');
$source = (string) ($_POST['source'] ?? '');
$name   = (string) ($_POST['name']   ?? '');

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

$slotExt = strtolower(pathinfo($slotNorm, PATHINFO_EXTENSION));

// Define nome final: parâmetro `name` se fornecido, senão nome do source
if ($name !== '') {
    $finalName = adminNormalizeName($name);
    if ($finalName === null) {
        jsonError('bad_name', 'Nome final inválido.', 400);
    }
    $finalExt = strtolower(pathinfo($finalName, PATHINFO_EXTENSION));
    if ($finalExt !== $slotExt) {
        jsonError('ext_mismatch',
            "O nome final ($finalExt) e o slot ($slotExt) têm extensões diferentes. " .
            "Mantenha a mesma extensão do slot original.",
            400);
    }
    if ($finalName === $slotNorm) {
        jsonError('same_as_slot', 'O nome final é igual ao nome atual do slot. Nada a fazer.', 400);
    }
} else {
    // Sem `name` → default = source. Ainda assim valida extensão.
    $sourceExt = strtolower(pathinfo($sourceNorm, PATHINFO_EXTENSION));
    if ($sourceExt !== $slotExt) {
        jsonError('ext_mismatch',
            "O slot ($slotExt) e a origem ($sourceExt) têm extensões diferentes. " .
            "Use \"Escolher arquivo\" pra trocar por uma imagem de formato diferente.",
            400);
    }
    $finalName = $sourceNorm;
}

$slotAbs   = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $slotNorm;
$sourceAbs = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $sourceNorm;
$finalAbs  = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $finalName;

if (!is_file($slotAbs)) {
    jsonError('slot_not_found', "Slot \"$slotNorm\" não existe.", 404);
}
if (!is_file($sourceAbs)) {
    jsonError('source_not_found', "Arquivo de origem \"$sourceNorm\" não existe.", 404);
}
if (is_file($finalAbs) && $finalAbs !== $sourceAbs) {
    jsonError('target_exists', "Já existe um arquivo chamado \"$finalName\".", 409);
}

// === Nome "preservado" pra galeria ===
// Formato: "<slotBase>-old-<ts>.<slotExt>"
$slotBase = pathinfo($slotNorm, PATHINFO_FILENAME);
$ts = (string) time();
$preservedName = $slotBase . '-old-' . $ts . '.' . $slotExt;
$preservedAbs  = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $preservedName;
$counter = 1;
while (is_file($preservedAbs)) {
    $preservedName = $slotBase . '-old-' . $ts . '-' . $counter . '.' . $slotExt;
    $preservedAbs  = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $preservedName;
    $counter++;
}

// Lê conteúdo do source
$sourceContent = @file_get_contents($sourceAbs);
if ($sourceContent === false) {
    jsonError('read_failed', 'Não foi possível ler o arquivo de origem.', 500);
}

// === Sequência atômica ===
// Grava source no arquivo final (com nome final — pode ser o source mesmo,
// ou um nome novo se o admin digitou um diferente)
$tmpFinal = $finalAbs . '.tmp';
if (@file_put_contents($tmpFinal, $sourceContent) === false) {
    jsonError('write_tmp_failed', 'Não foi possível gravar o arquivo temporário.', 500);
}

// Move slot -> preserved
if (!@rename($slotAbs, $preservedAbs)) {
    @unlink($tmpFinal);
    jsonError('move_slot_failed', 'Não foi possível mover o slot antigo pra galeria.', 500);
}

// Rename tmp -> final. Se final == source, sobrescreve ele mesmo (no-op em conteúdo).
if (!@rename($tmpFinal, $finalAbs)) {
    @rename($preservedAbs, $slotAbs);
    @unlink($tmpFinal);
    jsonError('swap_failed', 'Falha ao finalizar a substituição.', 500);
}

// === Atualiza refs em index.html, data/**/*.json, js/**/*.js ===
$updatedFiles = updateImageReferences($slotNorm, $finalName);

// === Regenera thumbs ===
adminDeleteThumb($slotNorm);
adminDeleteThumb($sourceNorm);
adminMakeThumb($finalAbs, $finalName);
adminMakeThumb($preservedAbs, $preservedName);

$size  = (int) filesize($finalAbs);
$mtime = (int) filemtime($finalAbs);

$note = $name !== '' && $name !== $source
    ? "A imagem \"$slotNorm\" foi preservada na galeria como \"$preservedName\". O slot agora se chama \"$finalName\"."
    : "A imagem \"$slotNorm\" foi preservada na galeria como \"$preservedName\". O slot agora se chama \"$finalName\".";

jsonResponse([
    'ok'             => true,
    'name'           => $finalName,
    'oldName'        => $slotNorm,
    'preservedName'  => $preservedName,
    'sourceName'     => $sourceNorm,
    'path'           => 'assets/images/' . $finalName,
    'size'           => $size,
    'mtime'          => $mtime,
    'thumb'          => 'admin/api/image_serve.php?f=' . rawurlencode($finalName) . '&t=thumb&v=' . $mtime,
    'full'           => 'admin/api/image_serve.php?f=' . rawurlencode($finalName) . '&t=full&v=' . $mtime,
    'updatedFiles'   => $updatedFiles,
    'note'           => $note,
]);
