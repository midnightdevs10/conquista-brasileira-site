<?php
// views/_placeholder.php — view compartilhada para módulos ainda não implementados.
// Variáveis: $module (key), $moduleInfo (array com label/icon).

declare(strict_types=1);

$icon = htmlspecialchars($moduleInfo['icon'] ?? 'soon', ENT_QUOTES, 'UTF-8');
$label = htmlspecialchars($moduleInfo['label'] ?? $module, ENT_QUOTES, 'UTF-8');
?>
<div class="placeholder">
  <div class="placeholder__icon" aria-hidden="true">
    <?php if ($icon === 'book'): ?>
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22.5v-18z"/><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/></svg>
    <?php elseif ($icon === 'phone'): ?>
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
    <?php elseif ($icon === 'clock'): ?>
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
    <?php else: ?>
      <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
    <?php endif; ?>
  </div>
  <h2 class="placeholder__title"><?= $label ?></h2>
  <p class="placeholder__text">Em breve. O módulo de <strong><?= $label ?></strong> está em desenvolvimento.</p>
</div>
