/* ================================================================
   CARDÁPIO - Conquista Brasileira Pastelaria
   Entry point. Escuta o evento `site:config-ready` (disparado por
   data.js após o config.json ser carregado) e inicializa o livro.

   Dependências (carregadas antes):
     - js/data.js           (expõe window.SITE_CONFIG + evento)
     - js/cardapio-data.js  (window.CardapioData)
     - js/cardapio-pages.js (window.CardapioPages)
     - js/cardapio-flip.js  (window.CardapioFlip)
     - CDN page-flip        (window.St.PageFlip)
   ================================================================ */

(function () {
  'use strict';

  function start() {
    const config = window.SITE_CONFIG;
    if (!config) {
      console.warn('[Cardápio] SITE_CONFIG indisponível; abortando.');
      return;
    }
    if (!window.CardapioFlip) {
      console.warn('[Cardápio] CardapioFlip não carregou; abortando.');
      return;
    }
    window.CardapioFlip.init(config);
  }

  // IMPORTANTE: SEMPRE escutamos o evento, mesmo se o SITE_CONFIG já existir.
  // O data.js seta o SITE_CONFIG como FALLBACK_CONFIG inicialmente (linha 60),
  // antes do fetch resolver. Se o cardápio lesse direto de window.SITE_CONFIG,
  // pegaria o FALLBACK (sem menu) e mostraria "em breve". Por isso, o evento
  // é a única fonte confiável: o data.js só o dispara DEPOIS do fetch completar
  // (no `finally`), com o SITE_CONFIG já populado pelo config.json.
  function init() {
    if (window.SITE_CONFIG) {
      start();
    } else {
      // Espera o evento chegar
      window.addEventListener('site:config-ready', start, { once: true });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
