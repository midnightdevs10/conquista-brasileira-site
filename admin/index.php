<?php
// index.php — shell do admin. Sidebar + roteamento de módulo + view server-rendered.

declare(strict_types=1);

require_once __DIR__ . '/includes/bootstrap.php';
requireLocalhost();

$modules = [
    'imagens'  => ['label' => 'Imagens',  'title' => 'Imagens do site', 'icon' => 'image',  'enabled' => true,  'view' => 'images'],
    'cardapio' => ['label' => 'Cardápio', 'title' => 'Cardápio', 'icon' => 'book',   'enabled' => true,  'view' => 'cardapio'],
    'contato'  => ['label' => 'Contato',  'title' => 'Contato',  'icon' => 'phone',  'enabled' => true,  'view' => 'contato'],
    'horarios' => ['label' => 'Horários', 'title' => 'Horário de funcionamento', 'icon' => 'clock',  'enabled' => true,  'view' => 'horarios'],
];

$active = isset($_GET['module']) ? (string) $_GET['module'] : 'imagens';
if (!isset($modules[$active])) $active = 'imagens';
$moduleInfo = $modules[$active];
$moduleKey  = $active;

// Versão do admin (para cache-busting dos assets)
$adminVersion = '25';

// Site público
$publicBase = '../';
$siteTitle  = 'Conquista Brasileira — Admin';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#B81E1E">
  <meta name="robots" content="noindex, nofollow">
  <title><?= htmlspecialchars($siteTitle) ?></title>

  <!-- Reusa tokens do site público -->
  <link rel="stylesheet" href="../css/tokens.css?v=1">
  <link rel="stylesheet" href="../css/reset.css?v=1">
  <link rel="stylesheet" href="../css/typography.css?v=1">
  <link rel="stylesheet" href="assets/admin.css?v=<?= $adminVersion ?>">
</head>
<body class="admin">
  <aside class="admin-sidebar" aria-label="Módulos do admin">
    <div class="admin-sidebar__brand">
      <span class="admin-sidebar__brand-mark" aria-hidden="true">CB</span>
      <span class="admin-sidebar__brand-text">Admin</span>
    </div>
    <nav class="admin-sidebar__nav">
      <ul>
        <?php foreach ($modules as $key => $info): ?>
          <?php
            $isActive = $key === $moduleKey;
            $cls = 'admin-sidebar__link';
            if ($isActive) $cls .= ' is-active';
            if (!$info['enabled']) $cls .= ' is-disabled';
            $href = $info['enabled'] ? '?module=' . urlencode($key) : '#';
            $aria = $info['enabled'] ? null : 'true';
          ?>
          <li>
            <a class="<?= $cls ?>" href="<?= htmlspecialchars($href) ?>" <?= $aria !== null ? 'aria-disabled="' . $aria . '"' : '' ?>>
              <span class="admin-sidebar__icon" aria-hidden="true">
                <?php if ($info['icon'] === 'image'): ?>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <?php elseif ($info['icon'] === 'book'): ?>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5v-18z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>
                <?php elseif ($info['icon'] === 'phone'): ?>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                <?php elseif ($info['icon'] === 'clock'): ?>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                <?php else: ?>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/></svg>
                <?php endif; ?>
              </span>
              <span class="admin-sidebar__label"><?= htmlspecialchars($info['label']) ?></span>
              <?php if (!$info['enabled']): ?>
                <span class="admin-sidebar__soon">Em breve</span>
              <?php endif; ?>
            </a>
          </li>
        <?php endforeach; ?>
      </ul>
    </nav>
    <div class="admin-sidebar__footer">
      <a class="admin-sidebar__link" href="../" target="_blank" rel="noopener">
        <span class="admin-sidebar__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </span>
        <span class="admin-sidebar__label">Ver site público</span>
      </a>
    </div>
  </aside>

  <main class="admin-main">
    <header class="admin-topbar">
      <h1 class="admin-topbar__title"><?= htmlspecialchars($moduleInfo['title'] ?? $moduleInfo['label']) ?></h1>
      <div class="admin-topbar__meta">
        <span class="admin-topbar__project">Conquista Brasileira Pastelaria</span>
      </div>
    </header>

    <div class="admin-content">
      <?php
        $viewFile = __DIR__ . '/views/' . $moduleInfo['view'] . '.php';
        if (is_file($viewFile)) {
            include $viewFile;
        } else {
            echo '<p class="admin-error">View não encontrada: ' . htmlspecialchars($moduleInfo['view']) . '</p>';
        }
      ?>
    </div>
  </main>

  <script>
    window.ADMIN = {
      module: <?= json_encode($moduleKey) ?>,
      publicBase: <?= json_encode($publicBase) ?>,
    };
  </script>
  <script src="assets/admin.js?v=<?= $adminVersion ?>"></script>
  <?php if ($moduleKey === 'imagens'): ?>
    <script src="assets/images-view.js?v=<?= $adminVersion ?>"></script>
  <?php elseif ($moduleKey === 'contato'): ?>
    <script src="assets/contact-view.js?v=<?= $adminVersion ?>"></script>
  <?php elseif ($moduleKey === 'horarios'): ?>
    <script src="assets/hours-view.js?v=<?= $adminVersion ?>"></script>
  <?php elseif ($moduleKey === 'cardapio'): ?>
    <script src="assets/cardapio-view.js?v=<?= $adminVersion ?>"></script>
  <?php endif; ?>
</body>
</html>
