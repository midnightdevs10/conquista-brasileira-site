<?php
// debug.php — mostra EXATAMENTE o que o servidor está respondendo para o images_list.
declare(strict_types=1);
require_once dirname(__DIR__) . '/includes/bootstrap.php';
requireLocalhost();

header('Content-Type: text/html; charset=utf-8');
?>
<!DOCTYPE html>
<html>
<head>
<title>Debug — o que o servidor retorna</title>
<style>body{font:14px monospace;padding:20px;background:#fff;color:#000}pre{background:#f0f0f0;padding:10px;overflow:auto}.ok{color:green}.err{color:red;font-weight:bold}</style>
</head>
<body>
<h1>Debug do images_list.php</h1>

<h2>1. Resposta bruta do images_list.php</h2>
<pre id="raw">carregando...</pre>

<h2>2. Teste direto de cada thumb</h2>
<div id="tests"></div>

<h2>3. Imagens no disco</h2>
<pre><?php
$thumbs = glob(ADMIN_THUMBS_DIR . '/*');
foreach ($thumbs as $t) {
  echo basename($t) . ' (' . filesize($t) . " bytes)\n";
}
?></pre>

<script>
fetch('images_list.php').then(r => r.json()).then(d => {
  document.getElementById('raw').textContent = JSON.stringify(d, null, 2);
  const out = document.getElementById('tests');
  if (!d.images) return;
  d.images.forEach(img => {
    const div = document.createElement('div');
    div.style.cssText = 'padding:8px;border-bottom:1px solid #ccc;';
    const u = '../' + img.thumb;
    div.innerHTML = `<strong>${img.name}</strong> → <a href="${u}" target="_blank">${img.thumb}</a><br><img src="${u}" style="max-width:100px;max-height:100px;background:#eee" /><span class="status"> testando...</span>`;
    out.appendChild(div);
    const im = div.querySelector('img');
    const st = div.querySelector('.status');
    im.onload = () => { st.textContent = ' OK ' + im.naturalWidth + 'x' + im.naturalHeight; st.className = 'status ok'; };
    im.onerror = () => { st.textContent = ' FAILED'; st.className = 'status err'; };
  });
}).catch(e => {
  document.getElementById('raw').textContent = 'ERRO: ' + e.message;
});
</script>
</body>
</html>
