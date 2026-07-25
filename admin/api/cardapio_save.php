<?php
// cardapio_save.php — persiste menu (config.json) e cardapioSections
// (data/cardapio-sections.json) a partir do POST JSON do admin.
//
// Validação:
//   - IDs são slugs [a-z0-9][a-z0-9-]{0,49} (lowercase, hífen).
//   - Limites de tamanho por campo (ver validate_*).
//   - Sanitização (NFC + remove nulos/controle) antes de gravar.
//   - Refs em cardapioSections[].source que não existem no menu final
//     vão para o array 'orphans' (não bloqueiam o save — UI pede re-bind).
//
// Backup: removido (não há mais data/_backups/). Em caso de erro de escrita, rollback.

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';
requireLocalhost();
requireMethod('POST');

if (!is_file(ADMIN_CONFIG_FILE)) {
    jsonError('config_missing', 'Arquivo de configuração não encontrado.', 500);
}

// Carrega o config.json atual (precisamos comparar IDs antigos vs novos
// para auto-corrigir refs gid/sgid em cardapioSections[].source[]).
$prevRaw = file_get_contents(ADMIN_CONFIG_FILE);
$prevJson = json_decode($prevRaw, true);
$prevMenu = (is_array($prevJson) && isset($prevJson['menu']) && is_array($prevJson['menu'])) ? $prevJson['menu'] : ['groups' => []];

$body = file_get_contents('php://input');
$input = json_decode($body, true);
if (!is_array($input)) {
    jsonError('invalid_body', 'Corpo da requisição inválido (JSON esperado).', 400);
}

$menu = isset($input['menu']) && is_array($input['menu']) ? $input['menu'] : null;
$sections = isset($input['cardapioSections']) && is_array($input['cardapioSections']) ? $input['cardapioSections'] : null;
if (!$menu || $sections === null) {
    jsonError('missing_fields', 'Campos "menu" e "cardapioSections" são obrigatórios.', 400);
}

// === helpers ===

function slug_regex() { return '/^[a-z0-9][a-z0-9-]{0,49}$/'; }

/**
 * Sanitiza string de texto: remove nulos, normaliza Unicode NFC, tira
 * caracteres de controle (exceto \n e \t). Não escapa HTML — a render
 * (js/cardapio-pages.js) já escapa.
 */
function sanitize_text(?string $s): string {
    if ($s === null) return '';
    // remove bytes nulos
    $s = str_replace("\0", '', $s);
    // normaliza Unicode para NFC (canonical composition)
    if (class_exists('Normalizer')) {
        $n = \Normalizer::normalize($s, \Normalizer::FORM_C);
        if ($n !== false) $s = $n;
    }
    // tira control chars (exceto \n e \t)
    $s = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $s);
    return trim($s);
}

function check_str(string $field, string $value, int $min, int $max, array $codes): ?array {
    $v = sanitize_text($value);
    $len = mb_strlen($v, 'UTF-8');
    if ($min > 0 && $len === 0) {
        return ['code' => $codes['required'] ?? 'field_required', 'message' => "Campo '$field' é obrigatório.", 'path' => $field];
    }
    if ($len > $max) {
        return ['code' => $codes['too_long'] ?? 'field_too_long', 'message' => "Campo '$field' tem $len caracteres (máx $max).", 'path' => $field];
    }
    return null;
}

function check_slug(string $field, string $value, array $codes): ?array {
    if (!preg_match(slug_regex(), $value)) {
        return ['code' => $codes['invalid'] ?? 'id_invalid', 'message' => "ID '$value' em '$field' é inválido. Use apenas letras minúsculas, números e hífens, começando com letra/número (máx 50).", 'path' => $field];
    }
    return null;
}

function check_optional_str(string $field, string $value, int $max, array $codes): ?array {
    $v = sanitize_text($value);
    $len = mb_strlen($v, 'UTF-8');
    if ($len > $max) {
        return ['code' => $codes['too_long'] ?? 'field_too_long', 'message' => "Campo '$field' tem $len caracteres (máx $max).", 'path' => $field];
    }
    return null;
}

// === validate menu ===

$errors = [];
$groups = isset($menu['groups']) && is_array($menu['groups']) ? $menu['groups'] : null;
if ($groups === null) {
    $errors[] = ['code' => 'menu_invalid', 'message' => "menu.groups deve ser um array.", 'path' => 'menu.groups'];
    $groups = [];
}
if (count($groups) > 50) {
    $errors[] = ['code' => 'menu_too_many_groups', 'message' => 'No máximo 50 grupos.', 'path' => 'menu.groups'];
}

$seenGroupIds = [];
foreach ($groups as $gi => $g) {
    $base = "menu.groups[$gi]";
    if (!is_array($g)) {
        $errors[] = ['code' => 'group_invalid', 'message' => "Grupo deve ser um objeto.", 'path' => $base];
        continue;
    }
    // id
    $gid = isset($g['id']) && is_string($g['id']) ? $g['id'] : '';
    if ($e = check_slug("$base.id", $gid, ['invalid' => 'group_id_invalid'])) $errors[] = $e;
    elseif (isset($seenGroupIds[$gid])) {
        $errors[] = ['code' => 'group_id_duplicate', 'message' => "ID de grupo duplicado: '$gid'.", 'path' => "$base.id"];
    } else {
        $seenGroupIds[$gid] = true;
    }
    // name
    $name = isset($g['name']) && is_string($g['name']) ? $g['name'] : '';
    if ($e = check_str("$base.name", $name, 1, 100, ['required' => 'group_name_required', 'too_long' => 'group_name_too_long'])) $errors[] = $e;
    // description
    if (isset($g['description']) && is_string($g['description'])) {
        if ($e = check_optional_str("$base.description", $g['description'], 500, ['too_long' => 'group_description_too_long'])) $errors[] = $e;
    }
    // subgroups
    $subgroups = isset($g['subgroups']) && is_array($g['subgroups']) ? $g['subgroups'] : [];
    if (count($subgroups) > 30) {
        $errors[] = ['code' => 'group_too_many_subgroups', 'message' => "Grupo '$gid' tem mais de 30 subgrupos.", 'path' => "$base.subgroups"];
    }
    $seenSgIds = [];
    foreach ($subgroups as $si => $sg) {
        $sbase = "$base.subgroups[$si]";
        if (!is_array($sg)) {
            $errors[] = ['code' => 'subgroup_invalid', 'message' => "Subgrupo deve ser um objeto.", 'path' => $sbase];
            continue;
        }
        $sgid = isset($sg['id']) && is_string($sg['id']) ? $sg['id'] : '';
        if ($e = check_slug("$sbase.id", $sgid, ['invalid' => 'subgroup_id_invalid'])) $errors[] = $e;
        elseif (isset($seenSgIds[$sgid])) {
            $errors[] = ['code' => 'subgroup_id_duplicate', 'message' => "ID de subgrupo duplicado em '$gid': '$sgid'.", 'path' => "$sbase.id"];
        } else {
            $seenSgIds[$sgid] = true;
        }
        $sgname = isset($sg['name']) && is_string($sg['name']) ? $sg['name'] : '';
        if ($e = check_str("$sbase.name", $sgname, 1, 100, ['required' => 'subgroup_name_required', 'too_long' => 'subgroup_name_too_long'])) $errors[] = $e;
        $items = isset($sg['items']) && is_array($sg['items']) ? $sg['items'] : [];
        if (count($items) > 500) {
            $errors[] = ['code' => 'subgroup_too_many_items', 'message' => "Subgrupo '$sgid' tem mais de 500 itens.", 'path' => "$sbase.items"];
        }
        foreach ($items as $ii => $it) {
            $ibase = "$sbase.items[$ii]";
            if (!is_array($it)) {
                $errors[] = ['code' => 'item_invalid', 'message' => "Item deve ser um objeto.", 'path' => $ibase];
                continue;
            }
            $iname = isset($it['name']) && is_string($it['name']) ? $it['name'] : '';
            if ($e = check_str("$ibase.name", $iname, 1, 120, ['required' => 'item_name_required', 'too_long' => 'item_name_too_long'])) $errors[] = $e;
            if (isset($it['description']) && is_string($it['description'])) {
                if ($e = check_optional_str("$ibase.description", $it['description'], 300, ['too_long' => 'item_description_too_long'])) $errors[] = $e;
            }
            if (isset($it['tag']) && is_string($it['tag'])) {
                if ($e = check_optional_str("$ibase.tag", $it['tag'], 30, ['too_long' => 'item_tag_too_long'])) $errors[] = $e;
            }
            if (isset($it['includes']) && is_array($it['includes'])) {
                if (count($it['includes']) > 20) {
                    $errors[] = ['code' => 'item_includes_too_many', 'message' => "Item '$iname' tem mais de 20 itens inclusos.", 'path' => "$ibase.includes"];
                } else {
                    foreach ($it['includes'] as $li => $line) {
                        if (!is_string($line)) {
                            $errors[] = ['code' => 'item_includes_invalid', 'message' => "Cada item incluso deve ser string.", 'path' => "$ibase.includes[$li]"];
                            continue;
                        }
                        if (mb_strlen(sanitize_text($line), 'UTF-8') > 120) {
                            $errors[] = ['code' => 'item_includes_too_long', 'message' => "Linha $li dos inclusos de '$iname' passa de 120 chars.", 'path' => "$ibase.includes[$li]"];
                        }
                    }
                }
            }
        }
    }
}

// === validate sections ===

if (count($sections) > 50) {
    $errors[] = ['code' => 'sections_too_many', 'message' => 'No máximo 50 seções.', 'path' => 'cardapioSections'];
}
$seenSectionIds = [];
$orphanRefs = []; // refs que ficaram órfãs

// === Auto-correção de refs (gid/sgid) após rename ===
// Quando o user edita o nome de um grupo/subgrupo, o id (slug) re-slugifica.
// As refs em cardapioSections[].source[] continuam apontando para o id ANTIGO
// e virariam órfãs. Reescrevemos por 2 heurísticas:
//   1) por NOME (caso simples: user só mudou maiúsc./acento, ou refatorou mantendo o nome);
//   2) por POSIÇÃO dentro do grupo (caso real do rename: o subgrupo é o mesmo,
//      só mudou nome+id; ele está na mesma posição no array).
$gidByName = [];  // groupName   => newGid
$sgidByName = []; // groupName . "\x00" . subgroupName => newSgid
$gidOrder = [];   // groupName   => idx
$sgidOrder = [];  // groupName . "\x00" . subgroupName => idx
foreach ($groups as $gi => $ng) {
    if (!is_array($ng) || !isset($ng['name'], $ng['id'])) continue;
    $gidByName[$ng['name']] = $ng['id'];
    $gidOrder[$ng['name']] = $gi;
    foreach (($ng['subgroups'] ?? []) as $si => $nsg) {
        if (!is_array($nsg) || !isset($nsg['name'], $nsg['id'])) continue;
        $sgidByName[$ng['name'] . "\x00" . $nsg['name']] = $nsg['id'];
        $sgidOrder[$ng['name'] . "\x00" . $nsg['name']] = $si;
    }
}
$prevGidByName = [];
$prevSgidByName = [];
$prevGidOrder = [];
$prevSgidOrder = [];
foreach (($prevMenu['groups'] ?? []) as $gi => $pg) {
    if (!is_array($pg) || !isset($pg['name'], $pg['id'])) continue;
    $prevGidByName[$pg['name']] = $pg['id'];
    $prevGidOrder[$pg['name']] = $gi;
    foreach (($pg['subgroups'] ?? []) as $si => $psg) {
        if (!is_array($psg) || !isset($psg['name'], $psg['id'])) continue;
        $prevSgidByName[$pg['name'] . "\x00" . $psg['name']] = $psg['id'];
        $prevSgidOrder[$pg['name'] . "\x00" . $psg['name']] = $si;
    }
}
// oldGid/oldSgid => newGid/newSgid (só preenche quando o id mudou)
$gidMap = [];   // oldGid => newGid
$sgidMap = [];  // oldSgid => newSgid
// Heurística 1: mesmo name → mesmo id (só mapeia se mudou)
foreach ($prevGidByName as $name => $oldGid) {
    if (isset($gidByName[$name]) && $gidByName[$name] !== $oldGid) {
        $gidMap[$oldGid] = $gidByName[$name];
    }
}
foreach ($prevSgidByName as $key => $oldSgid) {
    if (isset($sgidByName[$key]) && $sgidByName[$key] !== $oldSgid) {
        $sgidMap[$oldSgid] = $sgidByName[$key];
    }
}
// Heurística 2: por POSIÇÃO. Pra cada (oldGid, oldSgid) que ainda não foi
// mapeado, acha o subgrupo novo no mesmo grupo (que pode ter sido renomeado)
// na mesma posição. Procura em todos os grupos novos o subgrupo na mesma
// posição onde o nome do subgrupo antigo bate — não, melhor: a chave de
// busca é (gid, posição) → (gid novo, posição). Pra isso, construímos o
// índice reverso por (gid, pos) → nome.
$prevSubByPos = []; // "oldGid|idx" => ['name' => sgName, 'sgid' => oldSgid]
$newSubByPos  = []; // "newGid|idx" => ['name' => sgName, 'sgid' => newSgid]
foreach (($prevMenu['groups'] ?? []) as $pg) {
    if (!is_array($pg) || !isset($pg['id'], $pg['subgroups']) || !is_array($pg['subgroups'])) continue;
    foreach ($pg['subgroups'] as $si => $psg) {
        if (!is_array($psg) || !isset($psg['name'], $psg['id'])) continue;
        $prevSubByPos[$pg['id'] . '|' . $si] = ['name' => $psg['name'], 'sgid' => $psg['id']];
    }
}
foreach ($groups as $ng) {
    if (!is_array($ng) || !isset($ng['id'], $ng['subgroups']) || !is_array($ng['subgroups'])) continue;
    foreach ($ng['subgroups'] as $si => $nsg) {
        if (!is_array($nsg) || !isset($nsg['name'], $nsg['id'])) continue;
        $newSubByPos[$ng['id'] . '|' . $si] = ['name' => $nsg['name'], 'sgid' => $nsg['id']];
    }
}
// Aplica posição: para cada (oldGid, idx) em prevSubByPos, acha o newGid
// correspondente (via gidMap) e olha newSubByPos[newGid|idx]. Se os nomes
// diferem, ainda assim é o "mesmo" subgrupo (rename): mapeia oldSgid→newSgid.
foreach ($prevSubByPos as $key => $info) {
    [$oldGid, $idx] = explode('|', $key, 2);
    $newGid = $gidMap[$oldGid] ?? $oldGid;
    $newKey = $newGid . '|' . $idx;
    if (isset($newSubByPos[$newKey]) && $newSubByPos[$newKey]['sgid'] !== $info['sgid']) {
        $sgidMap[$info['sgid']] = $newSubByPos[$newKey]['sgid'];
    }
}

// Reescreve as refs em $sections in-place antes da validação
foreach ($sections as &$s) {
    if (!is_array($s) || !isset($s['source']) || !is_array($s['source'])) continue;
    foreach ($s['source'] as &$ref) {
        if (!is_array($ref) || !isset($ref['gid'], $ref['sgid'])) continue;
        if (isset($gidMap[$ref['gid']])) {
            $ref['gid'] = $gidMap[$ref['gid']];
        }
        if (isset($sgidMap[$ref['sgid']])) {
            $ref['sgid'] = $sgidMap[$ref['sgid']];
        }
    }
    unset($ref);
}
unset($s);

foreach ($sections as $ci => $s) {
    $cbase = "cardapioSections[$ci]";
    if (!is_array($s)) {
        $errors[] = ['code' => 'section_invalid', 'message' => "Seção deve ser um objeto.", 'path' => $cbase];
        continue;
    }
    $sid = isset($s['id']) && is_string($s['id']) ? $s['id'] : '';
    if ($e = check_slug("$cbase.id", $sid, ['invalid' => 'section_id_invalid'])) $errors[] = $e;
    elseif (isset($seenSectionIds[$sid])) {
        $errors[] = ['code' => 'section_id_duplicate', 'message' => "ID de seção duplicado: '$sid'.", 'path' => "$cbase.id"];
    } else {
        $seenSectionIds[$sid] = true;
    }
    $sname = isset($s['name']) && is_string($s['name']) ? $s['name'] : '';
    if ($e = check_str("$cbase.name", $sname, 1, 100, ['required' => 'section_name_required', 'too_long' => 'section_name_too_long'])) $errors[] = $e;
    if (isset($s['description']) && is_string($s['description'])) {
        if ($e = check_optional_str("$cbase.description", $s['description'], 500, ['too_long' => 'section_description_too_long'])) $errors[] = $e;
    }
    if (isset($s['tag']) && is_string($s['tag'])) {
        if ($e = check_optional_str("$cbase.tag", $s['tag'], 30, ['too_long' => 'section_tag_too_long'])) $errors[] = $e;
    }
    if (isset($s['split']) && !is_bool($s['split'])) {
        $errors[] = ['code' => 'section_split_invalid', 'message' => "Campo 'split' deve ser boolean.", 'path' => "$cbase.split"];
    }
    if (isset($s['source']) && is_array($s['source'])) {
        foreach ($s['source'] as $ri => $ref) {
            $rbase = "$cbase.source[$ri]";
            if (!is_array($ref) || !isset($ref['gid']) || !isset($ref['sgid'])) {
                $errors[] = ['code' => 'source_ref_invalid', 'message' => "source[$ri] deve ser objeto {gid, sgid}.", 'path' => $rbase];
                continue;
            }
            $refGid = (string) $ref['gid'];
            $refSgid = (string) $ref['sgid'];
            // Verifica se gid/sgid existem no menu final recém-validado
            $g = isset($groups[$refGid]) ? null : ($groups[array_search($refGid, array_column($groups, 'id'), true)] ?? null);
            $gFound = false;
            $sgFound = false;
            foreach ($groups as $gg) {
                if (isset($gg['id']) && $gg['id'] === $refGid) {
                    $gFound = true;
                    if (isset($gg['subgroups']) && is_array($gg['subgroups'])) {
                        foreach ($gg['subgroups'] as $ssg) {
                            if (isset($ssg['id']) && $ssg['id'] === $refSgid) { $sgFound = true; break; }
                        }
                    }
                    break;
                }
            }
            if (!$gFound || !$sgFound) {
                $orphanRefs[] = ['sectionId' => $sid, 'sectionName' => $sname, 'missingRef' => ['gid' => $refGid, 'sgid' => $refSgid]];
            }
        }
    }
}

if (!empty($errors)) {
    jsonError('validation_failed', 'Erros de validação.', 400, ['errors' => $errors]);
}

// === Sanitiza menu (reescreve strings com sanitize_text) ===
$cleanGroups = [];
foreach ($groups as $g) {
    $newG = [
        'id'          => (string) $g['id'],
        'name'        => sanitize_text((string) $g['name']),
        'subgroups'   => [],
    ];
    if (isset($g['description']) && is_string($g['description'])) $newG['description'] = sanitize_text($g['description']);
    foreach ($g['subgroups'] as $sg) {
        $newSg = [
            'id'    => (string) $sg['id'],
            'name'  => sanitize_text((string) $sg['name']),
            'items' => [],
        ];
        foreach ($sg['items'] as $it) {
            $newIt = [
                'name' => sanitize_text((string) $it['name']),
            ];
            if (isset($it['description']) && $it['description'] !== '') $newIt['description'] = sanitize_text((string) $it['description']);
            if (isset($it['tag']) && is_string($it['tag'])) $newIt['tag'] = sanitize_text((string) $it['tag']);
            if (isset($it['includes']) && is_array($it['includes']) && count($it['includes']) > 0) {
                $newIt['includes'] = array_map(fn($l) => sanitize_text((string) $l), $it['includes']);
            }
            $newSg['items'][] = $newIt;
        }
        $newG['subgroups'][] = $newSg;
    }
    $cleanGroups[] = $newG;
}
$cleanMenu = ['groups' => $cleanGroups];

// === Sanitiza sections ===
$cleanSections = [];
foreach ($sections as $s) {
    $newS = [
        'id'          => (string) $s['id'],
        'name'        => sanitize_text((string) $s['name']),
        'source'      => [],
    ];
    if (isset($s['description']) && is_string($s['description'])) $newS['description'] = sanitize_text($s['description']);
    if (isset($s['tag']) && is_string($s['tag'])) $newS['tag'] = sanitize_text((string) $s['tag']);
    if (isset($s['split']) && $s['split'] === true) $newS['split'] = true;
    if (isset($s['source']) && is_array($s['source'])) {
        foreach ($s['source'] as $ref) {
            if (is_array($ref) && isset($ref['gid']) && isset($ref['sgid'])) {
                $newS['source'][] = ['gid' => (string) $ref['gid'], 'sgid' => (string) $ref['sgid']];
            }
        }
    }
    $cleanSections[] = $newS;
}

// === Lê config.json atual, atualiza menu, persiste ===
$raw = file_get_contents(ADMIN_CONFIG_FILE);
$json = json_decode($raw, true);
if (!is_array($json)) {
    jsonError('config_invalid', 'JSON inválido em config.json atual.', 500);
}
$json['menu'] = $cleanMenu;

// === Escreve config.json atômico ===
$encoded = json_encode($json, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($encoded === false) {
    jsonError('encode_failed', 'Falha ao codificar config.json: ' . json_last_error_msg(), 500);
}
$tmp = ADMIN_CONFIG_FILE . '.tmp';
if (file_put_contents($tmp, $encoded, LOCK_EX) === false) {
    @unlink($tmp);
    jsonError('write_failed', 'Não consegui escrever no temporário de config.json.', 500);
}
if (!rename($tmp, ADMIN_CONFIG_FILE)) {
    @unlink($tmp);
    jsonError('write_failed', 'Não consegui substituir config.json.', 500);
}

// === Escreve cardapio-sections.json atômico ===
$secOut = ['version' => 1, 'sections' => $cleanSections];
$secEncoded = json_encode($secOut, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
if ($secEncoded === false) {
    // rollback do config.json (best-effort)
    jsonError('encode_failed', 'Falha ao codificar cardapio-sections.json: ' . json_last_error_msg(), 500);
}
$secTmp = ADMIN_CARDAPIO_SECTIONS_FILE . '.tmp';
if (file_put_contents($secTmp, $secEncoded, LOCK_EX) === false) {
    @unlink($secTmp);
    jsonError('write_failed', 'Não consegui escrever no temporário de cardapio-sections.json.', 500);
}
if (!rename($secTmp, ADMIN_CARDAPIO_SECTIONS_FILE)) {
    @unlink($secTmp);
    jsonError('write_failed', 'Não consegui substituir cardapio-sections.json.', 500);
}

jsonResponse([
    'ok' => true,
    'menu' => $cleanMenu,
    'cardapioSections' => $cleanSections,
    'orphans' => $orphanRefs,
    'message' => 'Cardápio salvo com sucesso.',
]);
