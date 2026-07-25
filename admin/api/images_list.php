<?php
// images_list.php — GET — lista arquivos em assets/images/ com auto-detect de uso.

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

requireLocalhost();
requireMethod('GET');

if (!is_dir(ADMIN_IMAGES_DIR)) {
    jsonError('images_dir_missing', 'Diretório assets/images/ não existe.', 500);
}
if (!is_dir(ADMIN_THUMBS_DIR)) {
    @mkdir(ADMIN_THUMBS_DIR, 0775, true);
}

if (!function_exists('sitePublicUrl')) {
    /**
     * URL pública do site (que o cliente final vê). O site roda em
     * http://127.0.0.1:8080/ via python -m http.server; o admin roda em :8000
     * via php -m. Apontar pro :8080 garante que os prints do admin reflitam
     * o site exatamente como o usuário final vê.
     */
    function sitePublicUrl(): string
    {
        return 'http://127.0.0.1:8080/';
    }
}

$exts = ['png', 'jpg', 'jpeg', 'svg', 'webp'];
$pattern = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . '*.{'.implode(',', $exts).'}';
$files = glob($pattern, GLOB_BRACE) ?: [];

$images = [];
$siteUrl = sitePublicUrl();
foreach ($files as $abs) {
    $name = basename($abs);
    if (strpos($name, '.') === false) continue;
    if (substr($name, 0, 1) === '.') continue; // dotfiles
    $relPath = 'assets/images/' . $name;
    $size  = (int) @filesize($abs);
    $mtime = (int) @filemtime($abs);
    $mime  = adminDetectMime($abs) ?: 'application/octet-stream';
    $dims  = adminImageDimensions($abs, $mime) ?? ['w' => 0, 'h' => 0];

    $usage = scanUsage($relPath);

    // Para hits HTML, monta a URL do screenshot (lazy — só gera quando acessado).
    foreach ($usage as &$h) {
        $h['screenshot'] = null;
        if (($h['category'] ?? '') === 'html' && strpos($h['snippet'] ?? '', '<img') !== false && (int) ($h['line'] ?? 0) > 0) {
            // Relativa à página /admin/ (mesmo padrão de full/thumb acima)
            $h['screenshot'] = 'api/images_shot.php?f=' . rawurlencode($name)
                . '&line=' . (int) $h['line'];
        }
    }
    unset($h);

    $images[] = [
        'name'   => $name,
        'path'   => $relPath,
        'size'   => $size,
        'mtime'  => $mtime,
        'mime'   => $mime,
        'width'  => $dims['w'],
        'height' => $dims['h'],
        'thumb'  => '../assets/images/thumbs/' . rawurlencode($name) . (strtolower(pathinfo($name, PATHINFO_EXTENSION)) === 'svg' ? '.thumb.svg' : '.thumb.jpg') . '?v=' . $mtime,
        'full'   => 'api/image_serve.php?f=' . rawurlencode($name) . '&t=full&v=' . $mtime,
        'usage'  => $usage,
    ];
}

usort($images, fn($a, $b) => strcmp($a['name'], $b['name']));

jsonResponse(['ok' => true, 'images' => $images, 'count' => count($images)]);
