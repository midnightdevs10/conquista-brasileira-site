/* ================================================================
   CARDAPIO-FLIP - Conquista Brasileira Pastelaria
   Wrapper do StPageFlip. Inicializa o livro, conecta controles
   (botões, teclado, swipe via lib, links do sumário), reusa o
   modal #paste-modal, e gerencia resize / reduced-motion.
   ================================================================ */

(function () {
  'use strict';

  const { escapeHtml } = window.CardapioData;

  let pageFlipInstance = null;
  let currentPages = [];
  let currentSection = 'cardapio';
  let lastIndex = 0;
  let resizeDebounce = null;
  let prevBtnEl = null;
  let nextBtnEl = null;
  let indicatorEl = null;
  let currentBreakpoint = null;

  // ============== Modal reuso (mesmo padrão do main.js antigo) ==============
  function openItemModal({ name, description, includes, category }) {
    const modal = document.getElementById('paste-modal');
    if (!modal) return;
    const mTitle = document.getElementById('paste-modal-title');
    const mDesc = document.getElementById('paste-modal-desc');
    const mCategory = document.getElementById('paste-modal-category');
    const mIncludes = document.getElementById('paste-modal-includes');
    const mCta = document.getElementById('paste-modal-cta');
    if (!mTitle) return;
    const whatsapp = (window.SITE_CONFIG && window.SITE_CONFIG.company && window.SITE_CONFIG.company.whatsapp) || '';

    mTitle.textContent = name;
    mCategory.textContent = category || '';
    if (description) {
      mDesc.textContent = description;
      mDesc.hidden = false;
    } else {
      mDesc.textContent = '';
      mDesc.hidden = true;
    }
    if (includes && includes.length) {
      mIncludes.innerHTML = includes.map(i =>
        `<li><span class="check-mini" aria-hidden="true">✓</span><span>${escapeHtml(i)}</span></li>`
      ).join('');
      mIncludes.hidden = false;
    } else {
      mIncludes.innerHTML = '';
      mIncludes.hidden = true;
    }
    mCta.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá, gostaria de pedir: ' + name)}`;
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    const closeBtn = modal.querySelector('.paste-modal-close');
    if (closeBtn) setTimeout(() => closeBtn.focus(), 50);
  }

  function closeItemModal() {
    const modal = document.getElementById('paste-modal');
    if (!modal) return;
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  // Fecha modal com ESC / clique no X / clique no backdrop
  function setupModalClose() {
    const modal = document.getElementById('paste-modal');
    if (!modal) return;
    modal.querySelectorAll('[data-paste-modal-close]').forEach(el => {
      el.addEventListener('click', closeItemModal);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hasAttribute('hidden')) closeItemModal();
    });
  }

  // ============== Click em sabores (reusa padrão do main.js antigo) ==============
  function bindFlavorClicks() {
    document.querySelectorAll('.menu-flavor').forEach(card => {
      const data = {
        name: card.dataset.itemName,
        description: card.dataset.itemDesc,
        category: card.dataset.itemCategory,
        includes: card.dataset.itemIncludes ? JSON.parse(card.dataset.itemIncludes) : null,
        hasContext: card.dataset.itemContext === '1',
        tag: card.dataset.itemTag || ''
      };
      // Handler único — usado tanto pra click quanto pra mousedown/keydown.
      // O segredo pra NÃO virar a página ao clicar num sabor é capturar o
      // evento em FASE DE CAPTURA (capture: true) e chamar stopPropagation
      // no mousedown ANTES do page-flip processar. Sem isso, o page-flip
      // (que escuta mousedown no container .book) inicia o flip.
      const open = (e) => {
        // Se for um link/button interno (ex: WhatsApp), não intercepta
        if (e && e.target.closest('a, button.menu-flavor-tag')) return;
        if (e) {
          e.stopPropagation();
          e.preventDefault();
        }
        if (data.hasContext) {
          openItemModal(data);
        } else {
          const whatsapp = (window.SITE_CONFIG && window.SITE_CONFIG.company && window.SITE_CONFIG.company.whatsapp) || '';
          window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent('Olá, gostaria de pedir: ' + data.name)}`, '_blank', 'noopener');
        }
      };
      // Fase de captura (true) — recebe o evento antes do page-flip.
      // mousedown é o evento que o page-flip usa pra iniciar o flip.
      card.addEventListener('mousedown', open, true);
      card.addEventListener('touchstart', open, true);
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(e);
        }
      });
    });
  }

  // ============== Botões e indicador ==============
  function updateIndicator(idx) {
    if (!indicatorEl) return;
    const cur = idx + 1; // humano (1-based)
    const total = pageFlipInstance ? pageFlipInstance.getPageCount() : currentPages.length;
    indicatorEl.innerHTML = `<strong>${String(cur).padStart(2, '0')}</strong> / ${String(total).padStart(2, '0')}`;
    if (prevBtnEl) prevBtnEl.disabled = (idx <= 0);
    if (nextBtnEl) nextBtnEl.disabled = (idx >= total - 1);
  }

  function bindNav() {
    prevBtnEl = document.getElementById('book-prev');
    nextBtnEl = document.getElementById('book-next');
    indicatorEl = document.getElementById('book-indicator');

    // Handler único que usa flip(idx) — método mais robusto que flipPrev/flipNext
    // pois vai direto pra um índice, sem depender de eventos internos da página
    // (que podem ter timing variável após o build). Lemos o índice atual e
    // saltamos pra +/-1.
    const go = (delta) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!pageFlipInstance) return;
      try {
        const cur = pageFlipInstance.getCurrentPageIndex() || 0;
        const total = pageFlipInstance.getPageCount();
        const next = Math.max(0, Math.min(total - 1, cur + delta));
        if (next !== cur) pageFlipInstance.flip(next);
      } catch (err) {
        console.warn('[Cardápio] erro ao virar página:', err);
      }
    };

    // Re-bind limpo: clonar o botão remove listeners antigos (importante no
    // rebuild por resize/breakpoint, senão acumula handlers).
    if (prevBtnEl) {
      const clone = prevBtnEl.cloneNode(true);
      prevBtnEl.parentNode.replaceChild(clone, prevBtnEl);
      prevBtnEl = clone;
      prevBtnEl.addEventListener('click', go(-1));
    }
    if (nextBtnEl) {
      const clone = nextBtnEl.cloneNode(true);
      nextBtnEl.parentNode.replaceChild(clone, nextBtnEl);
      nextBtnEl = clone;
      nextBtnEl.addEventListener('click', go(1));
    }
  }

  // ============== Teclado (← → Home End) ==============
  function bindKeyboard() {
    document.addEventListener('keydown', (e) => {
      // Não intercepta se o foco está num input ou textarea
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      // Não intercepta se o modal está aberto (deixa o ESC cuidar)
      const modal = document.getElementById('paste-modal');
      if (modal && !modal.hasAttribute('hidden')) return;
      if (!pageFlipInstance) return;

      if (e.key === 'ArrowLeft') { e.preventDefault(); pageFlipInstance.flipPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); pageFlipInstance.flipNext(); }
      else if (e.key === 'Home') { e.preventDefault(); pageFlipInstance.turnToPage(0); }
      else if (e.key === 'End') { e.preventDefault(); pageFlipInstance.turnToPage(pageFlipInstance.getPageCount() - 1); }
    });
  }

  // ============== Links do sumário e botão "Abrir cardápio" ==============
  function bindFlipTargets() {
    // Event delegation: pega cliques em qualquer descendente do livro
    document.querySelectorAll('.book').forEach(book => {
      book.addEventListener('click', (e) => {
        const t = e.target.closest('[data-flip-target]');
        if (!t) return;
        // Não vira página se clicou em outra coisa interativa dentro do card
        if (e.target.closest('.menu-flavor, a, button.btn, button.menu-flavor-tag')) return;
        const idx = parseInt(t.dataset.flipTarget, 10);
        if (Number.isNaN(idx)) return;
        e.preventDefault();
        e.stopPropagation();
        if (pageFlipInstance) {
          pageFlipInstance.flip(idx);
        }
      }, true);
    });
  }

  // ============== StPageFlip init / rebuild ==============
  function getBreakpoint() {
    const w = window.innerWidth;
    if (w < 560) return 'mobile';
    if (w < 900) return 'tablet';
    return 'desktop';
  }

  function isReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function buildSettings() {
    const bp = getBreakpoint();
    const usePortrait = bp === 'mobile';
    const reduced = isReducedMotion();
    return {
      // Páginas com proporção 5:7 (≈0.714, retrato de cardápio real).
      // O `.book` pai tem `aspect-ratio: 10/7` em landscape (2 páginas
      // 5:7 lado a lado) e `5/7` em mobile/portrait — a StPageFlip
      // precisa que a config bata com isso pra calcular a largura da
      // capa/páginas corretamente. Antes estava 1:1 (600x600, quadrado)
      // e a 1:1 (500x680), e a StPageFlip dimensionava errado a largura
      // da capa (35% em vez de 50%), gerando o gap visual.
      width: 500,
      height: 700,
      size: 'stretch',
      minWidth: 280,
      maxWidth: 850,     // alinhado ao max-width do .book (CSS) — evita o livro estourar o container
      minHeight: 380,
      maxHeight: 1400,
      drawShadow: true,
      flippingTime: reduced ? 0 : 700,
      usePortrait,
      startZIndex: 0,
      // autoSize DESLIGADO: a StPageFlip estava recalculando errado a
      // largura quando a `width/height` da config não batia com o
      // `aspect-ratio` do `.book`. Sem autoSize, ela usa o stretch
      // puro e respeita o container.
      autoSize: false,
      maxShadowOpacity: 0.5,
      showCover: true,
      mobileScrollSupport: true,
      // Swipe (touch) continua liberado no mobile/tablet.
      swipeDistance: 30,
      clickEventForward: true,
      // Mantemos useMouseEvents ligado para que o page-flip processe eventos
      // de mouse internamente (necessário para flipPrev/flipNext funcionarem
      // corretamente em alguns navegadores e para o swipe no touch).
      // O "bug" que o usuário relatava (mouse virando página sozinho) era na
      // verdade cliques acidentais ao navegar pelos sabores — já resolvido
      // pelo stopPropagation no bindFlavorClicks (linha ~93).
      useMouseEvents: true,
      disableFlipByClick: false
    };
  }

  function destroyInstance() {
    if (pageFlipInstance) {
      try { lastIndex = pageFlipInstance.getCurrentPageIndex() || 0; } catch (_) { lastIndex = 0; }
      try { pageFlipInstance.destroy(); } catch (_) { /* noop */ }
      pageFlipInstance = null;
    }
  }

  function mountPages(bookEl, pages) {
    // Limpa tudo
    bookEl.innerHTML = '';
    // Cria um wrapper para cada página
    const wrappers = pages.map(p => {
      const div = document.createElement('div');
      div.className = 'book-page-wrapper';
      div.innerHTML = p.html;
      return div;
    });
    wrappers.forEach(w => bookEl.appendChild(w));
    return wrappers;
  }

  function build(pages) {
    const bookEl = document.getElementById('cardapio-book');
    if (!bookEl) return;
    if (typeof St === 'undefined' || !St.PageFlip) {
      // CDN falhou — fallback: mostra páginas empilhadas, sem efeito
      bookEl.innerHTML = pages.map(p => p.html).join('');
      return;
    }

    destroyInstance();
    currentPages = pages;
    currentBreakpoint = getBreakpoint();

    // Monta o DOM primeiro
    const wrappers = mountPages(bookEl, pages);

    // Instancia o StPageFlip
    pageFlipInstance = new St.PageFlip(bookEl, buildSettings());
    pageFlipInstance.loadFromHTML(wrappers);

    // Restaura o índice anterior (após resize)
    if (lastIndex > 0) {
      try { pageFlipInstance.turnToPage(Math.min(lastIndex, pages.length - 1)); } catch (_) { /* noop */ }
    }

    pageFlipInstance.on('flip', (e) => {
      updateIndicator(e.data);
    });
    pageFlipInstance.on('changeOrientation', (e) => {
      // nada a fazer — o stretch cuida
    });

    // StPageFlip pode demorar um frame pra popular o getPageCount após
    // loadFromHTML. Pede pro browser repintar antes do primeiro updateIndicator.
    requestAnimationFrame(() => {
      updateIndicator(pageFlipInstance.getCurrentPageIndex() || 0);
    });

    // Liga interações das páginas (modal, links)
    bindFlavorClicks();
    bindFlipTargets();
  }

  function handleResize() {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      const newBp = getBreakpoint();
      if (newBp !== currentBreakpoint && currentPages.length) {
        // Quebrou breakpoint — recria
        build(currentPages);
      } else {
        // Mesmo breakpoint, mas o container mudou de tamanho — StPageFlip já
        // se ajusta via size:'stretch'. Indicador precisa atualizar se a
        // contagem mudou (improvável).
        if (pageFlipInstance) {
          try { updateIndicator(pageFlipInstance.getCurrentPageIndex() || 0); } catch (_) {}
        }
      }
    }, 200);
  }

  // ============== API pública ==============
  function init(config) {
    const section = document.getElementById('cardapio');
    if (!section) return;
    const menu = (config && config.menu) || { groups: [] };

    // 1) Garante que existem containers
    let bookEl = document.getElementById('cardapio-book');
    if (!bookEl) {
      // Cria fallback
      bookEl = document.createElement('div');
      bookEl.id = 'cardapio-book';
      bookEl.className = 'book';
      const stage = section.querySelector('.menu-stage') || section.querySelector('.container');
      if (stage) {
        // Tenta inserir antes do CTA, ou no final
        const cta = section.querySelector('.menu-cta');
        if (cta) stage.insertBefore(bookEl, cta);
        else stage.appendChild(bookEl);
      } else {
        section.appendChild(bookEl);
      }
    }

    // 2) Monta as seções
    const sections = window.CardapioData.buildSections(menu);
    if (!sections.length) {
      bookEl.innerHTML = '<div class="menu-loading">Em breve, novidades no cardápio.</div>';
      return;
    }

    // 3) Gera as páginas
    const pages = window.CardapioPages.buildPages(config, sections);

    // 4) Constrói o livro
    build(pages);

    // 5) Liga controles externos
    bindNav();
    bindKeyboard();
    setupModalClose();

    // 6) Resize
    window.addEventListener('resize', handleResize);
  }

  window.CardapioFlip = {
    init,
    // Re-monta currentPages a partir do menu atual + sections recém-carregadas,
    // depois reconstrói o livro. Usado pelo live-reload do admin.
    rebuild: () => {
      if (!window.SITE_CONFIG) return;
      const menu = window.SITE_CONFIG.menu || { groups: [] };
      const sections = window.CardapioData.buildSections(menu);
      if (!sections.length) return;
      currentPages = window.CardapioPages.buildPages(window.SITE_CONFIG, sections);
      build(currentPages);
    }
  };

  // Live-reload: quando o admin salva e dispara site:cardapio-sections-ready
  // (junto com a recarga do config.json via main.js), rebuildamos o livro.
  window.addEventListener('site:cardapio-sections-ready', () => {
    if (currentPages.length) window.CardapioFlip.rebuild();
  });
})();
