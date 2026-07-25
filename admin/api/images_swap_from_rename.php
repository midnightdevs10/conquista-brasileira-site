<?php
// images_swap_from_rename.php — POST — "Escolher da galeria" COM renomeação.
//
// Comportamento desejado pelo dono:
//   - O slot atual (ex: "logo.png") está em uso em N lugares do site
//   - O dono escolhe uma imagem da galeria (ex: "festa-junina.png")
//   - O slot passa a se chamar "festa-junina.png" (renomeia)
//   - O conteúdo do slot passa a ser o da imagem escolhida
//   - A imagem antiga do slot é preservada na galeria
//     (sempre existe o backup "imagem-A-old-<timestamp>.png" no diretório)
//   - Todas as referências em index.html, data/config.json e js/*.js
//     que apontavam pro nome antigo passam a apontar pro novo nome
//
// Parâmetros POST:
//   slot   — nome do arquivo atual (ex: "conjunto.png")
//   source — nome do arquivo de origem (ex: "festa-junina.png")
//
// Restrição: slot e source precisam ter a MESMA extensão. Trocar
// "conjunto.png" por "festa-junina.svg" mudaria o tipo MIME esperado
// em todos os lugares onde o slot é referenciado — fora do escopo
// deste endpoint. Use "Escolher arquivo" pra essas trocas.
//
// Fluxo atômico:
//   1. Valida nomes e extensões iguais
//   2. Lê conteúdo do source
//   3. Grava source no arquivo <slot>.tmp
//   4. Move slot -> preserved (galeria, com sufixo -old-<ts>)
//   5. Rename <slot>.tmp -> <source> (sobrescreve o source original
//      com o mesmo conteúdo dele mesmo — isso mantém a referência
//      "<source>" existente em outros lugares do site válida)
//   6. Atualiza referências: troca "assets/images/<slot>" por
//      "assets/images/<source>" em index.html, data/config.json, js/*.js
//   7. Regenera thumbs

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

$slotExt   = strtolower(pathinfo($slotNorm, PATHINFO_EXTENSION));
$sourceExt = strtolower(pathinfo($sourceNorm, PATHINFO_EXTENSION));
if ($slotExt !== $sourceExt) {
    jsonError('ext_mismatch',
        "O slot ($slotExt) e a origem ($sourceExt) têm extensões diferentes. " .
        "Use \"Escolher arquivo\" pra trocar por uma imagem de formato diferente.",
        400);
}

$slotAbs   = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $slotNorm;
$sourceAbs = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $sourceNorm;

if (!is_file($slotAbs)) {
    jsonError('slot_not_found', "Slot \"$slotNorm\" não existe.", 404);
}
if (!is_file($sourceAbs)) {
    jsonError('source_not_found', "Arquivo de origem \"$sourceNorm\" não existe.", 404);
}

$finalName = $sourceNorm;
$finalAbs  = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $finalName;

// === Nome "preservado" pra galeria ===
// Formato: "<slotBase>-old-<ts>.<slotExt>"
// Onde slotBase é o nome sem extensão do slot original.
$slotBase = pathinfo($slotNorm, PATHINFO_FILENAME);
$ts = (string) time();
$preservedName = $slotBase . '-old-' . $ts . '.' . $slotExt;
$preservedAbs  = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $preservedName;
// Garante unicidade (improvável colidir)
$counter = 1;
while (is_file($preservedAbs)) {
    $preservedName = $slotBase . '-old-' . $ts . '-' . $counter . '.' . $slotExt;
    $preservedAbs  = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $preservedName;
    $counter++;
}

// Lê conteúdo do source em memória
$sourceContent = @file_get_contents($sourceAbs);
if ($sourceContent === false) {
    jsonError('read_failed', 'Não foi possível ler o arquivo de origem.', 500);
}

// === Sequência atômica ===
// 1. Grava source no tmp (com nome do slot — vai virar o nome do source depois)
$tmpFinal = $finalAbs . '.tmp';
if (@file_put_contents($tmpFinal, $sourceContent) === false) {
    jsonError('write_tmp_failed', 'Não foi possível gravar o arquivo temporário.', 500);
}

// 2. Move slot -> preserved (a imagem antiga vai pra galeria)
if (!@rename($slotAbs, $preservedAbs)) {
    @unlink($tmpFinal);
    jsonError('move_slot_failed', 'Não foi possível mover o slot antigo pra galeria.', 500);
}

// 3. Rename tmp -> final (sobrescreve o source original com seu próprio conteúdo —
//    no-op em conteúdo, mas garante que o arquivo "festa-junina.png" existe e
//    está com o conteúdo certo).
if (!@rename($tmpFinal, $finalAbs)) {
    // Tenta reverter
    @rename($preservedAbs, $slotAbs);
    @unlink($tmpFinal);
    jsonError('swap_failed', 'Falha ao finalizar a substituição.', 500);
}

// === Atualiza referências em index.html, data/config.json, js/*.js ===
// Estratégia: trocar todas as ocorrências de:
//   "assets/images/<slotNorm>"   por   "assets/images/<finalName>"
//   "/assets/images/<slotNorm>"  por   "/assets/images/<finalName>"
//
// Isso é seguro porque:
//   - O source "finalName" JÁ existia e continua existindo (com mesmo nome)
//   - As referências que apontavam pro source continuam válidas (mesmo arquivo)
//   - As referências que apontavam pro slot agora apontam pro source
//     (que tem o conteúdo que o usuário quer ver no slot)

$oldNeedleRel = 'assets/images/' . $slotNorm;
$newNeedleRel = 'assets/images/' . $finalName;
$oldNeedleAbs = '/' . $oldNeedleRel;
$newNeedleAbs = '/' . $newNeedleRel;

$updatedFiles = [];

$replaceInFile = function (string $absPath, string $relPath) use (
    $oldNeedleRel, $newNeedleRel, $oldNeedleAbs, $newNeedleAbs, &$updatedFiles
) {
    if (!is_file($absPath)) return;
    $raw = @file_get_contents($absPath);
    if ($raw === false) return;
    $updated = str_replace(
        [$oldNeedleRel, $oldNeedleAbs],
        [$newNeedleRel, $newNeedleAbs],
        $raw,
        $count
    );
    if ($count > 0 && @file_put_contents($absPath, $updated) !== false) {
        $updatedFiles[] = $relPath . ' (' . $count . ' substituição(ões))';
    }
};

$replaceInFile(ADMIN_PROJECT_ROOT . DIRECTORY_SEPARATOR . 'index.html', 'index.html');
$replaceInFile(ADMIN_CONFIG_FILE, 'data/config.json');

$jsDir = ADMIN_PROJECT_ROOT . DIRECTORY_SEPARATOR . 'js';
if (is_dir($jsDir)) {
    foreach (glob($jsDir . DIRECTORY_SEPARATOR . '*.js') ?: [] as $jsFile) {
        $replaceInFile($jsFile, 'js/' . basename($jsFile));
    }
}

// === Regenera thumbs ===
// O slot antigo sumiu (virou preserved), o source é o mesmo arquivo
// com mesmo conteúdo — não precisa mexer no thumb. Mas limpamos o
// thumb do slot antigo (caso exista orfão) e garantimos que o thumb
// do preserved existe (caso precise visualizar no admin).
adminDeleteThumb($slotNorm);
adminDeleteThumb($sourceNorm);
adminMakeThumb($finalAbs, $finalName);
adminMakeThumb($preservedAbs, $preservedName);

$size  = (int) filesize($finalAbs);
$mtime = (int) filemtime($finalAbs);

jsonResponse([
    'ok'             => true,
    'name'           => $finalName,
    'oldName'        => $slotNorm,
    'preservedName'  => $preservedName,
    'path'           => 'assets/images/' . $finalName,
    'size'           => $size,
    'mtime'          => $mtime,
    'thumb'          => 'admin/api/image_serve.php?f=' . rawurlencode($finalName) . '&t=thumb&v=' . $mtime,
    'full'           => 'admin/api/image_serve.php?f=' . rawurlencode($finalName) . '&t=full&v=' . $mtime,
    'updatedFiles'   => $updatedFiles,
    'note'           => 'A imagem "' . $slotNorm . '" foi preservada na galeria como "' . $preservedName . '". O slot agora se chama "' . $finalName . '".',
]);
