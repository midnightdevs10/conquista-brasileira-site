<?php
// usage_scanner.php — auto-detecta onde uma imagem é usada no site.
// Varre index.html, js/*.js, data/config.json (read-only).

declare(strict_types=1);

require_once __DIR__ . '/paths.php';

if (!function_exists('scanUsage')) {
    /**
     * Varre o projeto procurando onde $needle aparece.
     * $needle é o caminho relativo, ex: "assets/images/logo.png".
     * Retorna lista de hits: [{category, file, line, snippet, detail}, ...]
     */
    function scanUsage(string $needle, ?string $projectRoot = null): array
    {
        $root = $projectRoot ?? ADMIN_PROJECT_ROOT;
        $basename = basename($needle); // "logo.png"
        $ext = pathinfo($basename, PATHINFO_EXTENSION);
        $stem = pathinfo($basename, PATHINFO_FILENAME);

        $variants = [$needle];
        if ($needle[0] !== '/') $variants[] = '/' . $needle;
        if ($ext !== '') $variants[] = 'assets/images/' . $stem;

        $variants = array_values(array_unique($variants));

        $hits = [];
        $hits = array_merge($hits, scanHtml($needle, $variants, $root));
        $hits = array_merge($hits, scanJs($needle, $variants, $root));
        $hits = array_merge($hits, scanJson($needle, $variants, $root));
        $hits = array_merge($hits, scanMissingFields($basename, $root));

        // Classifica cada hit numa sessão legível
        $hits = array_map('classifyHit', $hits);

        // Ordena por categoria (html, js, json, missing) e depois arquivo + linha
        $catOrder = ['html' => 0, 'js' => 1, 'json' => 2, 'missing' => 3];
        usort($hits, function ($a, $b) use ($catOrder) {
            $ca = $catOrder[$a['category']] ?? 9;
            $cb = $catOrder[$b['category']] ?? 9;
            if ($ca !== $cb) return $ca - $cb;
            $fa = $a['file'] ?? '';
            $fb = $b['file'] ?? '';
            if ($fa !== $fb) return strcmp($fa, $fb);
            return ($a['line'] ?? 0) - ($b['line'] ?? 0);
        });
        return $hits;
    }

    if (!function_exists('scanHtml')) {
        function scanHtml(string $needle, array $variants, string $root): array
        {
            $path = $root . DIRECTORY_SEPARATOR . 'index.html';
            return scanLineByLine($path, 'index.html', $variants, 'html');
        }
    }

    if (!function_exists('scanJs')) {
        function scanJs(string $needle, array $variants, string $root): array
        {
            $dir = $root . DIRECTORY_SEPARATOR . 'js';
            $hits = [];
            if (!is_dir($dir)) return $hits;
            foreach (glob($dir . DIRECTORY_SEPARATOR . '*.js') ?: [] as $file) {
                $rel = 'js/' . basename($file);
                $hits = array_merge($hits, scanJsFile($file, $rel, $variants));
            }
            return $hits;
        }
    }

    if (!function_exists('scanJsFile')) {
        function scanJsFile(string $abs, string $rel, array $variants): array
        {
            $raw = @file_get_contents($abs);
            if ($raw === false) return [];
            $lines = preg_split('/\r\n|\r|\n/', $raw) ?: [];
            $hits = [];
            for ($i = 0; $i < count($lines); $i++) {
                $line = $lines[$i];
                $matched = null;
                foreach ($variants as $v) {
                    if ($v !== '' && strpos($line, $v) !== false) { $matched = $v; break; }
                }
                if ($matched === null) continue;
                $func = detectEnclosingFunction($lines, $i);
                $snippet = trim($line);
                if (strlen($snippet) > 200) $snippet = substr($snippet, 0, 200) . '…';
                $detail = $rel . ':' . ($i + 1);
                if ($func) $detail = "$func — $detail";
                // Detecta fallback literal
                if (preg_match('/(\|\||&&|\?) *[\'"]' . preg_quote($matched, '/') . '[\'"]/', $line)) {
                    $detail .= ' (fallback literal)';
                }
                $hits[] = [
                    'category' => 'js',
                    'file'     => $rel,
                    'line'     => $i + 1,
                    'snippet'  => $snippet,
                    'detail'   => $detail,
                ];
            }
            return $hits;
        }
    }

    if (!function_exists('detectEnclosingFunction')) {
        function detectEnclosingFunction(array $lines, int $atLine): ?string
        {
            // olha até 30 linhas para cima
            $start = max(0, $atLine - 30);
            for ($i = $atLine - 1; $i >= $start; $i--) {
                $t = trim($lines[$i]);
                if ($t === '' || strpos($t, '//') === 0) continue;
                if (preg_match('/function\s+([A-Za-z_$][\w$]*)\s*\(/', $t, $m)) return $m[1] . '()';
                if (preg_match('/(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:function|\(|async\s*\(|\\?$)/', $t, $m)) {
                    return $m[1] . '()';
                }
                if (preg_match('/^([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{/', $t, $m)) {
                    return $m[1] . '()';
                }
            }
            return null;
        }
    }

    if (!function_exists('scanJson')) {
        function scanJson(string $needle, array $variants, string $root): array
        {
            $path = ADMIN_CONFIG_FILE;
            if (!is_file($path)) return [];
            $raw = @file_get_contents($path);
            if ($raw === false) return [];
            $data = json_decode($raw, true);
            if (!is_array($data)) return [];
            $hits = [];
            walkJsonForPaths($data, '', $variants, $hits);
            return $hits;
        }
    }

    if (!function_exists('walkJsonForPaths')) {
        function walkJsonForPaths($node, string $path, array $variants, array &$hits): void
        {
            if (is_string($node)) {
                foreach ($variants as $v) {
                    if ($v !== '' && $node === $v) {
                        $hits[] = [
                            'category' => 'json',
                            'file'     => 'data/config.json',
                            'line'     => null,
                            'snippet'  => '"' . $path . '": "' . $node . '"',
                            'detail'   => $path === '' ? '(root)' : $path,
                        ];
                        return;
                    }
                }
                return;
            }
            if (is_array($node)) {
                $isList = $node === array_values($node);
                foreach ($node as $k => $v) {
                    $key = is_int($k) ? "[$k]" : ($path === '' ? $k : ".$k");
                    $next = $path . $key;
                    walkJsonForPaths($v, $next, $variants, $hits);
                }
            }
        }
    }

    if (!function_exists('scanMissingFields')) {
        /**
         * Campos que o JS lê mas o config.json NÃO tem hoje.
         * Mapeamos: campo esperado -> arquivo JS onde é lido.
         * Só emite hit se o basename da imagem fizer sentido pra esse campo.
         */
        function scanMissingFields(string $basename, string $root): array
        {
            $stem = pathinfo($basename, PATHINFO_FILENAME);
            $hits = [];
            $map = [
                'company'        => ['main.js', 'js/main.js',  801, 'c.company.logo'],
                'seo.favicon'    => ['main.js', 'js/main.js',  837, 'seo.favicon'],
                'seo.og.image'   => ['main.js', 'js/main.js',  848, 'seo.og.image'],
                'seo.twitter'    => ['main.js', 'js/main.js',  860, 'seo.twitter.image'],
            ];
            // só emitimos hits para logo.* (company), ou se basename for favicon.* (seo.favicon)
            $expected = [];
            if (in_array(strtolower($stem), ['logo', 'logomarca', 'marca'], true)) {
                $expected[] = 'company';
            }
            if (strtolower($stem) === 'favicon') {
                $expected[] = 'seo.favicon';
            }
            foreach ($expected as $key) {
                $info = $map[$key];
                $hits[] = [
                    'category' => 'missing',
                    'file'     => $info[1],
                    'line'     => $info[2],
                    'snippet'  => '(campo ausente no config.json)',
                    'detail'   => "(campo ausente) {$info[3]} — usado como fallback",
                ];
            }
            return $hits;
        }
    }

    if (!function_exists('scanLineByLine')) {
        function scanLineByLine(string $abs, string $rel, array $variants, string $category): array
        {
            if (!is_file($abs)) return [];
            $raw = @file_get_contents($abs);
            if ($raw === false) return [];
            $lines = preg_split('/\r\n|\r|\n/', $raw) ?: [];
            $hits = [];
            for ($i = 0; $i < count($lines); $i++) {
                $line = $lines[$i];
                $matched = null;
                foreach ($variants as $v) {
                    if ($v !== '' && strpos($line, $v) !== false) { $matched = $v; break; }
                }
                if ($matched === null) continue;
                $snippet = trim($line);
                if (strlen($snippet) > 220) $snippet = substr($snippet, 0, 220) . '…';
                $detail = describeHtmlLine($line) ?: ('<linha ' . ($i + 1) . '>');
                $hits[] = [
                    'category' => $category,
                    'file'     => $rel,
                    'line'     => $i + 1,
                    'snippet'  => $snippet,
                    'detail'   => $detail,
                ];
            }
            return $hits;
        }
    }

    if (!function_exists('describeHtmlLine')) {
        function describeHtmlLine(string $line): ?string
        {
            $trim = trim($line);
            if (preg_match('/<link\b[^>]*rel\s*=\s*["\']icon["\']/i', $trim)) return '<link rel="icon">';
            if (preg_match('/<link\b[^>]*rel\s*=\s*["\'](?:shortcut )?icon["\']/i', $trim)) return '<link rel="icon">';
            if (preg_match('/<meta\b[^>]*property\s*=\s*["\']og:image["\']/i', $trim)) return '<meta property="og:image">';
            if (preg_match('/<meta\b[^>]*name\s*=\s*["\']twitter:image["\']/i', $trim)) return '<meta name="twitter:image">';
            if (preg_match('/<img\b/i', $trim)) return '<img>';
            if (preg_match('/<meta\b/i', $trim)) return '<meta>';
            if (preg_match('/<link\b/i', $trim)) return '<link>';
            return null;
        }
    }
}
