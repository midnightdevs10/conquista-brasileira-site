<?php
require 'admin/includes/bootstrap.php';
ini_set('display_errors', 1);
error_reporting(E_ALL);

echo 'php_sapi: ' . php_sapi_name() . PHP_EOL;

$edge = adminEdgePath();
echo 'edge: ' . $edge . PHP_EOL;
echo 'edge is_file: ' . (is_file($edge) ? 'YES' : 'NO') . PHP_EOL;

$html = file_get_contents('http://localhost:8765/');
echo 'fetched html: ' . (is_string($html) ? strlen($html) . ' bytes' : 'FAIL') . PHP_EOL;

$tmpHtml = sys_get_temp_dir() . '/admin_shot_test.html';
file_put_contents($tmpHtml, $html);
$tmpPng = sys_get_temp_dir() . '/admin_shot_test.png';
$fileUrl = 'file:///' . str_replace('\\', '/', $tmpHtml);

$cmd = sprintf('"%s" --headless=new --disable-gpu --no-sandbox --hide-scrollbars --window-size=1280,800 --virtual-time-budget=5000 --screenshot="%s" "%s" 2>NUL', $edge, $tmpPng, $fileUrl);
echo 'cmd: ' . $cmd . PHP_EOL;
$out = [];
$rc = 0;
$start = microtime(true);
exec($cmd, $out, $rc);
$dur = microtime(true) - $start;
echo 'rc: ' . $rc . ' (em ' . round($dur, 2) . 's)' . PHP_EOL;
echo 'png exists: ' . (is_file($tmpPng) ? 'YES (' . filesize($tmpPng) . ' bytes)' : 'NO') . PHP_EOL;
echo 'png content-type: ' . (is_file($tmpPng) ? (getimagesize($tmpPng) ? getimagesize($tmpPng)['mime'] : 'invalid') : '-') . PHP_EOL;
