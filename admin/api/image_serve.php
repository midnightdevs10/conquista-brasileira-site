<?php
// image_serve.php — GET — serve uma imagem (full ou thumb) com cache headers.

declare(strict_types=1);

require_once dirname(__DIR__) . '/includes/bootstrap.php';

requireLocalhost();

$f = (string) ($_GET['f'] ?? '');
$t = (string) ($_GET['t'] ?? 'full');
$line = (int) ($_GET['line'] ?? 0);
$name = adminNormalizeName($f);
if ($name === null) {
    http_response_code(400);
    exit('Bad name');
}

$ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
if ($t === 'thumb') {
    $abs = adminThumbAbs($name);
} elseif ($t === 'screenshot' && $line > 0) {
    // screenshot cacheado por (imagem, linha)
    $anchor = 'html-index-' . $line;
    $abs = adminScreenshotAbsPath($name, $anchor);
    $t = 'screenshot';
} else {
    $abs = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $name;
    $t = 'full';
}
if (!is_file($abs) && !(($t === 'thumb' && is_link($abs)))) {
    if ($t === 'thumb') {
        $src = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $name;
        if (is_file($src)) {
            @adminMakeThumb($src, $name);
        }
    }
    if (!is_file($abs)) {
        http_response_code(404);
        exit('Not found');
    }
}

$mime = adminDetectMime($abs) ?: 'application/octet-stream';
$size = (int) filesize($abs);
$mtime = (int) filemtime($abs);

header('Content-Type: ' . $mime);
header('Content-Length: ' . $size);
header('Cache-Control: public, max-age=86400');
header('ETag: "' . $mtime . '-' . $size . '"');
header('Last-Modified: ' . gmdate('D, d M Y H:i:s', $mtime) . ' GMT');

readfile($abs);
exit;
