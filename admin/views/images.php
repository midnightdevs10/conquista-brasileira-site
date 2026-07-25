<?php
// views/images.php — view do módulo "Imagens do site".
// Esta view é server-rendered mas o conteúdo é dinâmico (carregado via fetch).

declare(strict_types=1);
?>
<div class="images-view">
  <section class="dropzone" id="dropzone" aria-label="Enviar nova imagem">
    <div class="dropzone__inner">
      <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      <h3>Enviar nova imagem</h3>
      <p>Arraste um arquivo aqui ou <button type="button" class="link-button" id="dropzone-browse">escolha um arquivo</button></p>
      <p class="dropzone__small">PNG, JPG, SVG ou WebP — até 8 MB</p>
      <input type="file" id="dropzone-input" accept="image/png,image/jpeg,image/svg+xml,image/webp" hidden />
      <div class="dropzone__progress" id="dropzone-progress" hidden>
        <div class="dropzone__progress-bar"><div class="dropzone__progress-fill" id="dropzone-progress-fill"></div></div>
        <p id="dropzone-progress-text">Enviando…</p>
      </div>
    </div>
  </section>

  <nav class="images-tabs" id="images-tabs" role="tablist" aria-label="Aba de visualização das imagens">
    <button type="button" class="images-tabs__tab is-active" role="tab" aria-selected="true" data-tab="site">Site</button>
    <button type="button" class="images-tabs__tab" role="tab" aria-selected="false" data-tab="galeria">Galeria</button>
    <div class="images-search" role="search">
      <svg class="images-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <input type="search" id="images-search-input" placeholder="Buscar imagem…" aria-label="Buscar imagem pelo nome" autocomplete="off" />
      <button type="button" class="images-search__clear" id="images-search-clear" aria-label="Limpar busca" hidden>×</button>
    </div>
  </nav>

  <section class="images-grid" id="images-grid" aria-live="polite">
    <div class="images-grid__loading" id="images-grid-loading">Carregando…</div>
  </section>
</div>

<!-- Template para um card de imagem -->
<template id="tpl-image-card">
  <article class="image-card" data-name="">
    <div class="image-card__media">
      <img alt="" decoding="async" />
      <span class="image-card__orphan-badge" hidden>Não utilizado</span>
    </div>
    <div class="image-card__body">
      <h3 class="image-card__name"></h3>
    </div>
    <div class="image-card__meta">
      <span class="image-card__section-badge" hidden></span>
      <span class="image-card__usage-count" hidden></span>
    </div>
    <footer class="image-card__actions">
      <button type="button" class="btn btn--primary" data-action="swap">Substituir</button>
      <button type="button" class="btn btn--ghost"   data-action="rename">Renomear</button>
      <button type="button" class="btn btn--danger"  data-action="delete">Excluir</button>
    </footer>
  </article>
</template>

<!-- Modal genérico (reutilizado para upload-collision, swap, delete-confirm, rename) -->
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

<!-- Lightbox para visualizar a imagem ampliada -->
<div class="lightbox" id="lightbox" role="dialog" aria-modal="true" aria-label="Imagem ampliada" hidden>
  <div class="lightbox__backdrop" data-lightbox-close></div>
  <button type="button" class="lightbox__close" data-lightbox-close aria-label="Fechar">×</button>
  <figure class="lightbox__content">
    <div class="lightbox__viewport" id="lightbox-viewport">
      <img id="lightbox-img" src="" alt="" />
      <div class="lightbox__loading" id="lightbox-loading" hidden>
        <div class="lightbox__spinner" aria-hidden="true"></div>
        <p>Carregando…</p>
      </div>
    </div>
  </figure>
</div>

<!-- Toast -->
<div class="toast" id="toast" hidden role="status" aria-live="polite"></div>
