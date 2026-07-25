<?php
// screenshot.php — captura screenshots do site via Edge headless.
//
// Estratégia: para cada hit HTML, injetar um script que faz scrollIntoView
// do <img> alvo + borda vermelha + label, aguarda um tick, e o Edge captura
// o viewport. Resultado: print 1280x800 com a imagem destacada, com label.
// Para hits não-visuais (meta tags, JSON), retorna null.

declare(strict_types=1);

require_once __DIR__ . '/paths.php';

if (!function_exists('adminEdgePath')) {
    function adminEdgePath(): ?string
    {
        $candidates = [
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        ];
        foreach ($candidates as $p) {
            if (is_file($p)) return $p;
        }
        $where = @shell_exec('where msedge 2>NUL');
        if (is_string($where) && trim($where) !== '') {
            $line = strtok($where, "\r\n");
            if (is_file($line)) return $line;
        }
        $where = @shell_exec('where chrome 2>NUL');
        if (is_string($where) && trim($where) !== '') {
            $line = strtok($where, "\r\n");
            if (is_file($line)) return $line;
        }
        return null;
    }
}

if (!function_exists('adminScreenshotCacheDir')) {
    function adminScreenshotCacheDir(): string
    {
        $d = ADMIN_PROJECT_ROOT . DIRECTORY_SEPARATOR . 'admin' . DIRECTORY_SEPARATOR . 'data' . DIRECTORY_SEPARATOR . 'screenshots';
        if (!is_dir($d)) @mkdir($d, 0775, true);
        return $d;
    }
}

if (!function_exists('adminScreenshotAbsPath')) {
    function adminScreenshotAbsPath(string $image, string $anchor): string
    {
        $safe = preg_replace('/[^a-z0-9_\-]/i', '_', $image . '__' . $anchor);
        return adminScreenshotCacheDir() . DIRECTORY_SEPARATOR . $safe . '.png';
    }
}

if (!function_exists('adminFetchIndexHtml')) {
    /**
     * Lê o conteúdo de index.html. Em ambientes onde PHP pode fazer
     * sub-requests HTTP (Apache + mod_php / php-fpm), usa a URL pública.
     * Em outros (cli-server, single-thread), lê direto do disco.
     */
    function adminFetchIndexHtml(string $siteUrl): ?string
    {
        $sapi = php_sapi_name();
        $isSingleThread = ($sapi === 'cli-server');
        if (!$isSingleThread) {
            $ctx = stream_context_create(['http' => ['timeout' => 10, 'ignore_errors' => true]]);
            $html = @file_get_contents($siteUrl, false, $ctx);
            if (is_string($html) && strlen($html) > 200) return $html;
        }
        // fallback: lê do disco
        $abs = ADMIN_PROJECT_ROOT . DIRECTORY_SEPARATOR . 'index.html';
        if (is_file($abs)) {
            $raw = @file_get_contents($abs);
            if (is_string($raw) && strlen($raw) > 200) return $raw;
        }
        return null;
    }
}

if (!function_exists('adminCaptureViewport')) {
    /**
     * Captura um print do viewport (1280x800) com a imagem-alvo destacada.
     *
     * Estratégia: usa a URL PÚBLICA do site (http://127.0.0.1:8080/) servida
     * pelo python -m http.server. Garante que:
     *   - fetch('data/config.json') funciona (CORS ok via http://)
     *   - CSS, JS, imagens carregam normalmente
     *   - O print reflete o site exatamente como o usuário final vê
     *
     * Sem hacks de file://, sem injetar JSON inline. A página é a de verdade.
     */
    function adminCaptureViewport(string $imageName, string $siteUrl, string $destAbs): bool
    {
        $edge = adminEdgePath();
        if ($edge === null) return false;

        $tmpPng  = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'admin_shot_' . md5($imageName . microtime()) . '.png';

        // Cria um HTML temporário só com o injetado (CSS pra esconder header
        // e o script de scroll/destaque). Esse HTML usa <iframe> apontando
        // pro site real — assim o Edge faz requests HTTP normais (sem
        // problema de CORS), e a gente injeta o script no contexto do iframe.
        //
        // Espera — iframe não permite controle externo de scroll. E o fetch
        // do data.js vai ser feito dentro do iframe (mesma origem), ok.
        // Mas o <img class="hero-image"> está dentro do iframe — não consigo
        // manipulá-lo de fora.
        //
        // Solução real: usar Page.addScriptToEvaluateOnNewDocument via DevTools
        // pra injetar o script direto no contexto do site. Vou voltar a essa
        // abordagem, mas com a URL do site público (:8080) ao invés de file://.

        $port = adminPickDebugPort();
        $userDataDir = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'admin_shot_user_' . md5($imageName . microtime());
        @rmdir($userDataDir);

        $cmd = sprintf(
            '"%s" --headless=new --disable-gpu --no-sandbox --hide-scrollbars --window-size=1280,800 --user-data-dir="%s" --remote-debugging-port=%d "%s" >NUL 2>&1',
            $edge, $userDataDir, $port, $siteUrl
        );
        $proc = popen('start /B "" ' . $cmd, 'r');
        if ($proc) pclose($proc);

        $ws = adminWaitForPage($port, 20);
        if ($ws === null) {
            adminKillEdgeOnPort($port);
            return false;
        }

        // Esconde o header sticky via CSS injetado
        $styleScript = "(function(){var s=document.createElement('style');s.textContent=" . json_encode(
            'header.nav,header.topbar,.site-header,[data-sticky],.navbar.fixed,.navbar.sticky{position:static !important;}img{content-visibility:visible !important;}'
        ) . ";document.head.appendChild(s);})();";

        // Script de scroll + destaque + ready signal
        $script = <<<'JS'
(function(){
  function tryIt(){
    var hit = Array.prototype.find.call(document.querySelectorAll('img'), function(i){
      return (i.getAttribute('src') || '').indexOf('IMG_NAME') !== -1;
    });
    if (!hit) { setTimeout(tryIt, 200); return; }

    function done(){
      document.querySelectorAll('.reveal').forEach(function(el){ el.classList.add('is-visible'); });
      hit.style.outline = '5px solid #B81E1E';
      hit.style.outlineOffset = '3px';
      window.scrollTo(0, 0);
      requestAnimationFrame(function(){
        requestAnimationFrame(function(){
          var rect = hit.getBoundingClientRect();
          var targetY = Math.max(0, rect.top - 120);
          window.scrollTo(0, targetY);
          requestAnimationFrame(function(){
            requestAnimationFrame(function(){
              window.__shotReady = true;
            });
          });
        });
      });
    }

    // Espera fontes carregarem (Google Fonts via <link>) antes de continuar.
    // Sem isso, o print captura com fonte fallback (sans-serif) e o título
    // "Os Melhores Pastéis" quebra em 3 linhas em vez de 2.
    function afterFonts(){
      if (document.fonts && document.fonts.ready && document.fonts.ready.then) {
        // Espera até 20s pelas fontes. Headless Edge pode demorar pra
        // baixar do Google Fonts. Se timeout, segue mesmo assim.
        var to = setTimeout(scrollStart, 20000);
        document.fonts.ready.then(function(){
          clearTimeout(to);
          // Força reflow pra layout se estabilizar com a fonte nova
          document.body.offsetHeight;
          scrollStart();
        });
      } else {
        scrollStart();
      }
    }
    function scrollStart(){
      // Rola a página em chunks pra acionar lazy loading
      var step = 0;
      var maxSteps = Math.ceil(document.body.scrollHeight / 800);
      function scrollChunk(){
        window.scrollTo(0, step * 800);
        step++;
        if (step < maxSteps) setTimeout(scrollChunk, 100);
        else { window.scrollTo(0, 0); setTimeout(done, 600); }
      }
      scrollChunk();
    }
    afterFonts();
  }
  tryIt();
})();
JS;
        $script = str_replace('IMG_NAME', $imageName, $script);

        adminWsSend($ws, ['id' => 10, 'method' => 'Page.addScriptToEvaluateOnNewDocument',
            'params' => ['source' => $styleScript]]);
        adminWsReadUntilId($ws, 10, 5);

        adminWsSend($ws, ['id' => 11, 'method' => 'Page.addScriptToEvaluateOnNewDocument',
            'params' => ['source' => $script]]);
        adminWsReadUntilId($ws, 11, 5);

        // Recarrega a página pra que os scripts injetados rodem
        adminWsSend($ws, ['id' => 12, 'method' => 'Page.reload', 'params' => ['ignoreCache' => true]]);
        adminWsReadUntilId($ws, 12, 5);

        $ready = adminEvalUntil($ws, 'window.__shotReady === true', 40);
        if (!$ready) {
            fclose($ws);
            adminKillEdgeOnPort($port);
            return false;
        }
        // Espera fontes pintarem E layout estabilizar após o ready
        adminEvalUntil($ws, 'document.fonts && document.fonts.status === "loaded"', 10);
        usleep(1200000); // 1.2s pra garantir

        $png = adminCaptureFullPage($ws);
        fclose($ws);
        adminKillEdgeOnPort($port);

        if (!is_string($png) || strlen($png) < 1000) {
            return false;
        }
        if (file_put_contents($tmpPng, $png) === false) {
            return false;
        }
        if (!@rename($tmpPng, $destAbs)) {
            @copy($tmpPng, $destAbs);
            @unlink($tmpPng);
        }
        return true;
    }
}

// --- DevTools Protocol helpers (WebSocket minimalista) -------------------------

if (!function_exists('adminPickDebugPort')) {
    function adminPickDebugPort(): int
    {
        $s = @stream_socket_server('tcp://127.0.0.1:0', $errno, $errstr);
        if (!$s) return 9222;
        $name = stream_socket_get_name($s, false);
        fclose($s);
        $port = (int) substr((string) $name, strrpos((string) $name, ':') + 1);
        return $port > 0 ? $port : 9222;
    }
}

if (!function_exists('adminKillEdgeOnPort')) {
    function adminKillEdgeOnPort(int $port): void
    {
        @exec('taskkill /F /IM msedge.exe 2>NUL');
    }
}

if (!function_exists('adminWaitForPage')) {
    function adminWaitForPage(int $port, int $timeoutSec): mixed
    {
        $deadline = microtime(true) + $timeoutSec;
        $targetsUrl = "http://127.0.0.1:$port/json";
        while (microtime(true) < $deadline) {
            $ctx = stream_context_create(['http' => ['timeout' => 1, 'ignore_errors' => true]]);
            $json = @file_get_contents($targetsUrl, false, $ctx);
            if (is_string($json) && $json !== '') {
                $targets = json_decode($json, true);
                if (is_array($targets)) {
                    foreach ($targets as $t) {
                        if (($t['type'] ?? '') === 'page' && !empty($t['webSocketDebuggerUrl'])) {
                            $pageWs = adminWsConnect($t['webSocketDebuggerUrl']);
                            if ($pageWs !== null) {
                                adminWsSend($pageWs, ['id' => 1, 'method' => 'Page.enable']);
                                adminWsReadUntilId($pageWs, 1, 2);
                                adminWsSend($pageWs, ['id' => 2, 'method' => 'Runtime.enable']);
                                adminWsReadUntilId($pageWs, 2, 2);
                                return $pageWs;
                            }
                        }
                    }
                }
            }
            usleep(200000);
        }
        return null;
    }
}

if (!function_exists('adminEvalUntil')) {
    function adminEvalUntil($ws, string $expr, int $timeoutSec): bool
    {
        $deadline = microtime(true) + $timeoutSec;
        $id = 100;
        while (microtime(true) < $deadline) {
            $id++;
            adminWsSend($ws, ['id' => $id, 'method' => 'Runtime.evaluate', 'params' => ['expression' => $expr, 'returnByValue' => true]]);
            $resp = adminWsReadUntilId($ws, $id, 1);
            if (is_array($resp) && !empty($resp['result']['result']['value'])) {
                return true;
            }
            usleep(200000);
        }
        return false;
    }
}

if (!function_exists('adminCaptureFullPage')) {
    function adminCaptureFullPage($ws): ?string
    {
        static $idSeq = 1000;
        $id = ++$idSeq;
        adminWsSend($ws, [
            'id' => $id,
            'method' => 'Page.captureScreenshot',
            'params' => ['format' => 'png', 'captureBeyondViewport' => false],
        ]);
        $resp = adminWsReadUntilId($ws, $id, 10);
        if (!is_array($resp) || empty($resp['result']['data'])) return null;
        $bin = base64_decode($resp['result']['data'], true);
        return is_string($bin) ? $bin : null;
    }
}

if (!function_exists('adminWsConnect')) {
    function adminWsConnect(string $url): mixed
    {
        $u = parse_url($url);
        if (!$u || ($u['scheme'] ?? '') !== 'ws') return null;
        $host = $u['host'] ?? '127.0.0.1';
        $port = (int) ($u['port'] ?? 80);
        $path = $u['path'] ?? '/';
        if (!empty($u['query'])) $path .= '?' . $u['query'];
        $sock = @stream_socket_client("tcp://$host:$port", $errno, $errstr, 5);
        if (!$sock) return null;
        stream_set_timeout($sock, 5);
        $key = base64_encode(random_bytes(16));
        $req = "GET $path HTTP/1.1\r\nHost: $host:$port\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: $key\r\nSec-WebSocket-Version: 13\r\n\r\n";
        fwrite($sock, $req);
        $buf = '';
        while (!feof($sock)) {
            $chunk = fread($sock, 1024);
            if ($chunk === false || $chunk === '') break;
            $buf .= $chunk;
            if (strpos($buf, "\r\n\r\n") !== false) break;
        }
        if (strpos($buf, ' 101 ') === false) { fclose($sock); return null; }
        return $sock;
    }
}

if (!function_exists('adminWsSend')) {
    function adminWsSend($sock, array $payload): void
    {
        $data = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $len = strlen($data);
        $header = chr(0x81);
        if ($len < 126) $header .= chr(0x80 | $len);
        elseif ($len < 65536) $header .= chr(0x80 | 126) . pack('n', $len);
        else $header .= chr(0x80 | 127) . pack('J', $len);
        $mask = random_bytes(4);
        $header .= $mask;
        $masked = $data;
        for ($i = 0; $i < $len; $i++) $masked[$i] = chr(ord($data[$i]) ^ ord($mask[$i % 4]));
        fwrite($sock, $header . $masked);
    }
}

if (!function_exists('adminWsReadUntilId')) {
    function adminWsReadUntilId($sock, int $wantedId, int $timeoutSec): mixed
    {
        $deadline = microtime(true) + $timeoutSec;
        $buf = '';
        stream_set_blocking($sock, false);
        while (microtime(true) < $deadline) {
            $chunk = fread($sock, 65536);
            if ($chunk !== false && $chunk !== '') $buf .= $chunk;
            while (strlen($buf) >= 2) {
                $b0 = ord($buf[0]); $b1 = ord($buf[1]);
                $opcode = $b0 & 0x0F;
                $masked = ($b1 & 0x80) !== 0;
                $len = $b1 & 0x7F; $offset = 2;
                if ($len === 126) { if (strlen($buf) < 4) break; $len = unpack('n', substr($buf, 2, 2))[1]; $offset = 4; }
                elseif ($len === 127) { if (strlen($buf) < 10) break; $len = unpack('J', substr($buf, 2, 8))[1]; $offset = 10; }
                $mask = '';
                if ($masked) { if (strlen($buf) < $offset + 4) break; $mask = substr($buf, $offset, 4); $offset += 4; }
                if (strlen($buf) < $offset + $len) break;
                $payload = substr($buf, $offset, $len);
                $buf = substr($buf, $offset + $len);
                if ($masked) {
                    $unmasked = '';
                    for ($i = 0; $i < $len; $i++) $unmasked .= chr(ord($payload[$i]) ^ ord($mask[$i % 4]));
                    $payload = $unmasked;
                }
                if ($opcode === 1) {
                    $obj = json_decode($payload, true);
                    if (is_array($obj) && (int) ($obj['id'] ?? 0) === $wantedId) {
                        stream_set_blocking($sock, true);
                        return $obj;
                    }
                }
            }
            usleep(50000);
        }
        stream_set_blocking($sock, true);
        return null;
    }
}

if (!function_exists('adminGetOrCreateScreenshot')) {
    /**
     * Devolve o caminho absoluto de um print do site destacando a imagem-alvo.
     * Cacheia em admin/data/screenshots/. Regenera se cache ausente ou
     * mais antigo que index.html / a própria imagem.
     * Retorna null para hits sem âncora visual (meta tags, JSON, missing).
     */
    function adminGetOrCreateScreenshot(string $imageName, array $hit, string $siteUrl): ?string
    {
        if (($hit['category'] ?? '') !== 'html') return null;
        if (($hit['file'] ?? '') !== 'index.html') return null;
        $snippet = $hit['snippet'] ?? '';
        if (strpos($snippet, '<img') === false) return null;
        $line = (int) ($hit['line'] ?? 0);
        if ($line <= 0) return null;

        $anchor = 'html-index-' . $line;
        $cached = adminScreenshotAbsPath($imageName, $anchor);
        $indexAbs = ADMIN_PROJECT_ROOT . DIRECTORY_SEPARATOR . 'index.html';
        $imageAbs = ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . $imageName;
        $indexMtime = is_file($indexAbs) ? filemtime($indexAbs) : 0;
        $imageMtime = is_file($imageAbs) ? filemtime($imageAbs) : 0;
        $cacheMtime = is_file($cached) ? filemtime($cached) : 0;

        $fresh = $cacheMtime > 0 && $cacheMtime >= $indexMtime && $cacheMtime >= $imageMtime;
        if (!$fresh) {
            if (!adminCaptureViewport($imageName, $siteUrl, $cached)) {
                return null;
            }
        }
        return $cached;
    }
}
