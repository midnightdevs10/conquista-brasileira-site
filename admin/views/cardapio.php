<?php
// views/cardapio.php — view do módulo "Cardápio".
// Server-rendered shell: tree de grupos/subgrupos/itens populado via fetch.
// Inclui o modal genérico e o toast (mesmo padrão de images.php).

declare(strict_types=1);
?>
<div class="cardapio-view">
  <header class="cardapio-view__header">
    <h2>Cardápio</h2>
    <p class="cardapio-view__hint">
      Edite os grupos, subgrupos e itens do cardápio. As alterações ficam em <code>data/config.json</code>.
      A paginação do livro é gerada automaticamente em <code>data/cardapio-sections.json</code> a partir
      da estrutura do cardápio, e sempre fica em número par de páginas.
    </p>
  </header>

  <div class="cardapio-toolbar">
    <button type="button" class="btn btn--primary cardapio-save" id="cardapio-save-btn">
      <span class="cardapio-save__dot" aria-hidden="true"></span>
      Salvar tudo
    </button>
  </div>

  <section class="cardapio-pane is-active" id="pane-menu" role="tabpanel">
    <div class="cardapio-tree" id="cardapio-tree" aria-live="polite">
      <div class="cardapio-tree__loading">Carregando cardápio…</div>
    </div>
  </section>
</div>

<!-- Modal genérico (reaproveita o binding do Admin.openModal) -->
<div class="modal" id="modal" hidden role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <div class="modal__backdrop" data-modal-close></div>
  <div class="modal__card">
    <h3 id="modal-title" class="modal__title">Título</h3>
    <div class="modal__body" id="modal-body">…</div>
    <div class="modal__actions">
      <button type="button" class="btn btn--ghost"   data-modal-close>Cancelar</button>
      <button type="button" class="btn btn--primary" id="modal-confirm">Confirmar</button>
    </div>
  </div>
</div>

<!-- Toast -->
<div class="toast" id="toast" hidden role="status" aria-live="polite"></div>
