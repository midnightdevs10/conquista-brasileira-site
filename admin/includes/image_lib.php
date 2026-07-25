<?php
// image_lib.php — validação de upload, geração de thumbs, EXIF strip.
// GD é a engine de fato (Imagick não está instalado neste ambiente).

declare(strict_types=1);

require_once __DIR__ . '/paths.php';
require_once __DIR__ . '/svg_sanitize.php';

if (!function_exists('adminAllowedMimes')) {
    function adminAllowedMimes(): array
    {
        return [
            'image/png'    => 'png',
            'image/jpeg'   => 'jpg',
            'image/svg+xml' => 'svg',
            'image/webp'   => 'webp',
        ];
    }
}

if (!function_exists('adminAllowedExts')) {
    function adminAllowedExts(): array
    {
        return ['png', 'jpg', 'jpeg', 'svg', 'webp'];
    }
}

if (!function_exists('adminMaxUploadBytes')) {
    function adminMaxUploadBytes(): int
    {
        return 8 * 1024 * 1024; // 8 MB
    }
}

if (!function_exists('adminMaxDimensions')) {
    function adminMaxDimensions(): array
    {
        return ['w' => 6000, 'h' => 6000];
    }
}

if (!function_exists('adminMinDimensions')) {
    function adminMinDimensions(): array
    {
        return ['w' => 100, 'h' => 100];
    }
}

if (!function_exists('adminNormalizeName')) {
    /**
     * Normaliza o nome do arquivo: lowercase extension, sem path, ASCII only.
     * Retorna null se inválido.
     */
    function adminNormalizeName(string $name): ?string
    {
        $name = str_replace('\\', '/', $name);
        $name = basename($name);
        if ($name === '' || $name === '.' || $name === '..') return null;
        if (!preg_match('/^[a-z0-9._\-]+$/', $name)) return null;
        // extensão minúscula
        $dot = strrpos($name, '.');
        if ($dot === false) return null;
        $base = substr($name, 0, $dot);
        $ext  = strtolower(substr($name, $dot + 1));
        if (!in_array($ext, adminAllowedExts(), true)) return null;
        if ($base === '') return null;
        return $base . '.' . $ext;
    }
}

if (!function_exists('adminDetectMime')) {
    function adminDetectMime(string $absPath): ?string
    {
        if (!is_file($absPath)) return null;
        $f = @finfo_open(FILEINFO_MIME_TYPE);
        if ($f === false) return null;
        $m = @finfo_file($f, $absPath);
        @finfo_close($f);
        return is_string($m) ? $m : null;
    }
}

if (!function_exists('adminImageDimensions')) {
    /**
     * Retorna ['w' => int, 'h' => int] ou null se não der pra ler.
     * Para SVG, lê o viewBox.
     */
    function adminImageDimensions(string $absPath, string $mime): ?array
    {
        if ($mime === 'image/svg+xml') {
            $raw = @file_get_contents($absPath);
            if ($raw === false) return null;
            $raw = sanitizeSvg($raw);
            if (preg_match('/\bviewBox\s*=\s*["\']\s*[\-\d.\s]+\s*["\']/i', $raw, $m)) {
                $parts = preg_split('/[\s,]+/', trim(strip_tags($m[0])));
                // parts: ['viewBox', '=', '"', minX, minY, w, h, '"']
                if (count($parts) >= 4) {
                    $w = (int) $parts[count($parts) - 2];
                    $h = (int) $parts[count($parts) - 1];
                    if ($w > 0 && $h > 0) return ['w' => $w, 'h' => $h];
                }
            }
            // fallback: lê width/height
            if (preg_match('/\bwidth\s*=\s*["\']\s*(\d+)/i', $raw, $w)
             && preg_match('/\bheight\s*=\s*["\']\s*(\d+)/i', $raw, $h)) {
                return ['w' => (int) $w[1], 'h' => (int) $h[1]];
            }
            return ['w' => 0, 'h' => 0]; // SVG sem dimensões explícitas — aceito
        }
        $info = @getimagesize($absPath);
        if ($info === false) return null;
        return ['w' => (int) $info[0], 'h' => (int) $info[1]];
    }
}

if (!function_exists('adminStripExif')) {
    /**
     * Strippa EXIF usando GD (round-trip re-encode). JPEG e WebP.
     * Para PNG não há EXIF pra strippar (mas mantém o formato).
     * Retorna true se strippou, false se a engine falhou.
     */
    function adminStripExif(string $absPath, string $mime): bool
    {
        if ($mime === 'image/png' || $mime === 'image/svg+xml') {
            return true; // nada a fazer
        }
        if (!function_exists('imagecreatefromjpeg') || !function_exists('imagecreatefromwebp')) {
            return false;
        }
        $tmp = $absPath . '.noexif';
        $img = null;
        if ($mime === 'image/jpeg') {
            $img = @imagecreatefromjpeg($absPath);
            if ($img === false) return false;
            imagealphablending($img, true);
            imagesavealpha($img, true);
            // quality 92 — perda mínima, sem EXIF
            $ok = imagejpeg($img, $tmp, 92);
            imagedestroy($img);
        } elseif ($mime === 'image/webp') {
            $img = @imagecreatefromwebp($absPath);
            if ($img === false) return false;
            imagealphablending($img, true);
            imagesavealpha($img, true);
            $ok = imagewebp($img, $tmp, 92);
            imagedestroy($img);
        } else {
            return false;
        }
        if (!$ok || !@rename($tmp, $absPath)) {
            @unlink($tmp);
            return false;
        }
        return true;
    }
}

if (!function_exists('adminValidateUpload')) {
    /**
     * Valida um arquivo já em disco (após move_uploaded_file).
     * Retorna ['ok' => true, 'mime' => ..., 'ext' => ..., 'w' => ..., 'h' => ...]
     * ou ['ok' => false, 'code' => ..., 'message' => ...].
     */
    function adminValidateUpload(string $absPath, string $originalName): array
    {
        if (!is_file($absPath)) {
            return ['ok' => false, 'code' => 'no_file', 'message' => 'Arquivo não encontrado no servidor.'];
        }
        $size = @filesize($absPath);
        if ($size === false || $size === 0) {
            return ['ok' => false, 'code' => 'empty_file', 'message' => 'Arquivo vazio.'];
        }
        if ($size > adminMaxUploadBytes()) {
            return [
                'ok' => false,
                'code' => 'too_large',
                'message' => 'Arquivo excede o limite de ' . (adminMaxUploadBytes() / 1024 / 1024) . ' MB.',
            ];
        }
        $mime = adminDetectMime($absPath);
        if ($mime === null || !isset(adminAllowedMimes()[$mime])) {
            return ['ok' => false, 'code' => 'bad_mime', 'message' => 'Tipo de arquivo não permitido.'];
        }
        $expectedExt = adminAllowedMimes()[$mime];
        $normalized   = adminNormalizeName($originalName);
        if ($normalized === null) {
            return ['ok' => false, 'code' => 'bad_name', 'message' => 'Nome de arquivo inválido.'];
        }
        $actualExt = strtolower(pathinfo($normalized, PATHINFO_EXTENSION));
        // jpeg normaliza pra jpg
        if ($expectedExt === 'jpg' && $actualExt === 'jpeg') $actualExt = 'jpg';
        if ($expectedExt !== $actualExt) {
            return [
                'ok' => false,
                'code' => 'ext_mime_mismatch',
                'message' => "Extensão ($actualExt) não corresponde ao tipo real ($expectedExt).",
            ];
        }
        $dims = adminImageDimensions($absPath, $mime);
        if ($dims === null) {
            return ['ok' => false, 'code' => 'bad_dimensions', 'message' => 'Não foi possível ler dimensões.'];
        }
        if ($mime !== 'image/svg+xml') {
            $max = adminMaxDimensions();
            if ($dims['w'] > $max['w'] || $dims['h'] > $max['h']) {
                return [
                    'ok' => false,
                    'code' => 'too_big',
                    'message' => "Dimensões excedem o máximo ({$max['w']}×{$max['h']}).",
                ];
            }
            $min = adminMinDimensions();
            if ($dims['w'] < $min['w'] || $dims['h'] < $min['h']) {
                return [
                    'ok' => false,
                    'code' => 'too_small',
                    'message' => "Dimensões abaixo do mínimo ({$min['w']}×{$min['h']}).",
                ];
            }
        }
        if ($mime === 'image/svg+xml') {
            // Sanitiza o SVG in-place.
            $raw = @file_get_contents($absPath);
            if ($raw === false) {
                return ['ok' => false, 'code' => 'svg_read_fail', 'message' => 'Falha ao ler SVG.'];
            }
            $clean = sanitizeSvg($raw);
            if ($clean !== $raw) {
                @file_put_contents($absPath, $clean);
            }
        } else {
            // Strippa EXIF (best-effort, não bloqueia).
            adminStripExif($absPath, $mime);
        }
        return [
            'ok'   => true,
            'mime' => $mime,
            'ext'  => $expectedExt,
            'w'    => $dims['w'],
            'h'    => $dims['h'],
        ];
    }
}

if (!function_exists('adminThumbPath')) {
    /**
     * Converte "logo.png" -> "logo.png.thumb.jpg".
     * SVG: "logo.svg" -> "logo.svg.thumb.svg" (será symlink, não jpg).
     */
    function adminThumbPath(string $name): string
    {
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if ($ext === 'svg') {
            return $name . '.thumb.svg';
        }
        return $name . '.thumb.jpg';
    }
}

if (!function_exists('adminThumbAbs')) {
    function adminThumbAbs(string $name): string
    {
        return ADMIN_THUMBS_DIR . DIRECTORY_SEPARATOR . adminThumbPath($name);
    }
}

if (!function_exists('adminMakeThumb')) {
    /**
     * Gera thumb 480px de largura usando GD.
     * SVG: symlink do original (não rasteriza).
     * Raster (PNG/JPG/WebP): SEMPRE salva como JPEG, exceto se original é
     * WebP (salva WebP) ou se quer preservar transparência (PNG).
     * Falha não é fatal — o admin continua funcionando.
     */
    function adminMakeThumb(string $srcAbs, string $name): bool
    {
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        $dest = adminThumbAbs($name);
        @mkdir(ADMIN_THUMBS_DIR, 0775, true);
        if ($ext === 'svg') {
            // symlink relativo; em Windows pode falhar sem priv admin — copia nesse caso
            if (!@symlink($srcAbs, $dest)) {
                return @copy($srcAbs, $dest);
            }
            return true;
        }
        if (!function_exists('imagecreatefromstring')) return false;
        $raw = @file_get_contents($srcAbs);
        if ($raw === false) return false;
        $src = @imagecreatefromstring($raw);
        if ($src === false) return false;
        $w = imagesx($src);
        $h = imagesy($src);
        if ($w <= 0 || $h <= 0) { imagedestroy($src); return false; }
        $maxW = 480;
        if ($w <= $maxW) {
            // já é menor — copia direto convertendo pro formato do thumb
            $ok = adminSaveThumb($src, $ext, $dest);
            imagedestroy($src);
            return (bool) $ok;
        }
        $newW = $maxW;
        $newH = (int) round($h * ($newW / $w));
        $dst = imagecreatetruecolor($newW, $newH);
        // fundo branco para JPEG (evita preto em transparência)
        if ($ext === 'jpg' || $ext === 'jpeg' || $ext === 'webp') {
            $white = imagecolorallocate($dst, 255, 255, 255);
            imagefilledrectangle($dst, 0, 0, $newW, $newH, $white);
        } else {
            imagealphablending($dst, false);
            imagesavealpha($dst, true);
            $trans = imagecolorallocatealpha($dst, 0, 0, 0, 127);
            imagefilledrectangle($dst, 0, 0, $newW, $newH, $trans);
        }
        imagecopyresampled($dst, $src, 0, 0, 0, 0, $newW, $newH, $w, $h);
        $ok = adminSaveThumb($dst, $ext, $dest);
        imagedestroy($src);
        imagedestroy($dst);
        return (bool) $ok;
    }
}

if (!function_exists('adminSaveThumb')) {
    /**
     * Salva o thumb no formato correto baseado na extensão do thumb (.jpg ou .svg).
     * Importante: o nome do thumb é `<name>.thumb.jpg` para raster e
     * `<name>.thumb.svg` para SVG. O `$srcExt` é a extensão do original
     * (png/jpg/webp/svg) — usada para decidir fundo (transparência ou branco).
     */
    function adminSaveThumb(\GdImage $img, string $srcExt, string $dest): bool
    {
        $destExt = strtolower(pathinfo($dest, PATHINFO_EXTENSION));
        if ($destExt === 'svg') {
            // Não deveria cair aqui (svg vai pelo symlink), mas defensivo
            return @imagepng($img, $dest);
        }
        // dest = .thumb.jpg → sempre JPEG (coerente com Content-Type que o
        // Apache vai enviar baseado na extensão).
        if ($srcExt === 'webp') {
            return @imagewebp($img, $dest, 85);
        }
        // Para PNG/JPG originais → JPEG (compatibilidade universal)
        return @imagejpeg($img, $dest, 88);
    }
}

if (!function_exists('adminDeleteThumb')) {
    function adminDeleteThumb(string $name): void
    {
        $abs = adminThumbAbs($name);
        if (is_file($abs) || is_link($abs)) {
            @unlink($abs);
        }
    }
}

if (!function_exists('adminMoveThumb')) {
    /** Move/renomeia o thumb junto com o original. */
    function adminMoveThumb(string $fromName, string $toName): void
    {
        $from = adminThumbAbs($fromName);
        $to   = adminThumbAbs($toName);
        if (is_file($from) || is_link($from)) {
            @rename($from, $to);
        }
    }
}
