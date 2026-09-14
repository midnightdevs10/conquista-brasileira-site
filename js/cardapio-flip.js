/* ================================================================
   CARDAPIO-FLIP - Conquista Brasileira Ind e Com de Doces e Salgados Ltda
   Wrapper do StPageFlip. Inicializa o livro, conecta controles
   (botões, teclado, swipe via lib, links do sumário), reusa o
   modal #paste-modal, e gerencia resize / reduced-motion.
   ================================================================ */

(function () {
  'use strict';

  const { escapeHtml } = window.CardapioData;

  // ============== MODO DE VISUALIZAÇÃO ==============
  // LIVRO (flipbook): StPageFlip com animação de folhear.
  //  • Desktop/tablet (≥560px): livro aberto, 2 páginas lado a lado.
  //  • Mobile (<560px): MESMA animação e MESMO lugar fixo do livro,
  //    mas em modo retrato — só UMA página aparece por vez.
  // O flag SCROLL_MODE=true empilhava todas as páginas como cartões
  // roláveis (sem flip). Foi revertido a pedido: o cardápio voltou a
  // folhear. O código do modo scroll continua aqui embaixo, morto,
  // pra reativar rápido se o formato mudar de novo — basta o flag.
  const SCROLL_MODE = false;

  let pageFlipInstance = null;
  let currentPages = [];
  let currentSection = 'cardapio';
  let lastIndex = 0;
  let resizeDebounce = null;
  let prevBtnEl = null;
  let nextBtnEl = null;
  let indicatorEl = null;
  let currentBreakpoint = null;
  let lastScrollPageWidth = 0;

  // ============== Modal reuso (mesmo padrão do main.js antigo) ==============
  // order = frase do produto (ex: "um pastel de") que a página carrega no
  // data-item-order — vira "gostaria de pedir um pastel de X" no WhatsApp.
  function openItemModal({ name, description, includes, category, order }) {
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
    mCta.href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(buildOrderMessage(order, name))}`;
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    const closeBtn = modal.querySelector('.paste-modal-close');
    if (closeBtn) setTimeout(() => closeBtn.focus(), 50);
  }

  function buildOrderMessage(order, name) {
    return order
      ? 'Olá, gostaria de pedir ' + order + ' ' + name
      : 'Olá, gostaria de pedir: ' + name;
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
        order: card.dataset.itemOrder || '',
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
          window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(buildOrderMessage(data.order, data.name))}`, '_blank', 'noopener');
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
  // O indicador e o estado (disabled) dos botões contam SPREADS (duplas
  // de páginas no desktop; 1 página por spread no mobile). Antes usávamos
  // índice de PÁGINA: com o livro 2-up, flip(página+1) caía no MESMO
  // spread já visível e a lib ignorava o comando — as setas do
  // computador "não respondiam".
  function updateIndicator(idx) {
    if (!indicatorEl) return;
    let cur = idx; // fallback: índice de página (mobile 1-up = spread)
    let total = pageFlipInstance ? pageFlipInstance.getPageCount() : currentPages.length;
    // StPageFlip expõe a coleção de páginas: getSpread() devolve as
    // duplas e getCurrentSpreadIndex() a posição atual — com eles o
    // indicador e o disable batem exatamente com o que flipNext/
    // flipPrev percorrem (1 spread por clique).
    try {
      const col = pageFlipInstance && pageFlipInstance.getPageCollection ? pageFlipInstance.getPageCollection() : null;
      if (col && typeof col.getSpread === 'function') {
        cur = col.getCurrentSpreadIndex();
        total = col.getSpread().length;
      }
    } catch (_) { /* mantém fallback por página */ }
    indicatorEl.innerHTML = `<strong>${String(cur + 1).padStart(2, '0')}</strong> / ${String(total).padStart(2, '0')}`;
    if (prevBtnEl) prevBtnEl.disabled = (cur <= 0);
    if (nextBtnEl) nextBtnEl.disabled = (cur >= total - 1);
  }

  // Centraliza o `.book` na viewport quando uma página vira. Sem isso, em
  // viewports curtos (mobile 375x667), o livro fica parcialmente abaixo da
  // dobra — o usuário vê só o topo da página e pensa que o conteúdo está
  // sendo cortado pelo livro (mas na verdade cabe, é só scroll). Auto-scroll
  // resolve a percepção sem alterar layout/paginação.
  function centerBookInViewport() {
    const book = document.getElementById('cardapio-book');
    if (!book) return;
    // Só auto-scroll em viewports com altura limitada (mobile/tablet) e
    // quando o livro realmente não cabe inteiro na viewport.
    const r = book.getBoundingClientRect();
    const vh = window.innerHeight;
    if (r.height > vh - 40) {
      // livro maior que viewport: garante topo do livro visível
      if (r.top < 0 || r.top > 80) {
        const targetY = window.scrollY + r.top - Math.max(40, (vh - r.height) / 2);
        window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
      }
    } else {
      // livro cabe: centraliza verticalmente na viewport
      const targetY = window.scrollY + r.top - (vh - r.height) / 2;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }
  }

  function bindNav() {
    prevBtnEl = document.getElementById('book-prev');
    nextBtnEl = document.getElementById('book-next');
    indicatorEl = document.getElementById('book-indicator');

    // Handler único baseado em flipNext/flipPrev — a lib avança/retorna
    // 1 SPREAD por chamada. (flip(página) era no-op quando a página-alvo
    // pertencia ao spread já visível — causa das setas mortas no PC.)
    // flipNext/flipPrev são no-ops seguros nos extremos (checkDirection).
    const go = (delta) => (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!pageFlipInstance) return;
      try {
        if (delta < 0) pageFlipInstance.flipPrev();
        else pageFlipInstance.flipNext();
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

        // Modo página única: o "flip" vira ROLAGEM até o cartão da seção.
        if (SCROLL_MODE) {
          const wrappers = book.querySelectorAll('.book-page-wrapper');
          const target = wrappers[idx];
          if (target) {
            // Compensa a altura do header fixo pra seção não ficar escondida
            const header = document.querySelector('.site-header, .header, header.site-header');
            const navH = header ? header.offsetHeight : 0;
            const y = target.getBoundingClientRect().top + window.scrollY - navH - 12;
            window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
          }
          return;
        }

        if (pageFlipInstance) {
          // Mesma raiz do bug das setas: flip(página) é no-op quando a
          // página-alvo pertence ao spread já visível. Convertemos o
          // índice de página pro índice da 1ª página do spread dele
          // antes de flip().
          try {
            const col = pageFlipInstance.getPageCollection();
            const targetSpread = col.getSpreadIndexByPage(idx);
            if (targetSpread !== null && targetSpread !== undefined && targetSpread !== col.getCurrentSpreadIndex()) {
              const spread = col.getSpread()[targetSpread];
              if (spread && typeof spread[0] === 'number') idx = spread[0];
            }
          } catch (_) { /* usa o idx original */ }
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
    // Em mobile/portrait, medimos a largura real do container `.book`
    // e usamos pra dimensionar a StPageFlip. Sem isso, a lib fixa
    // a página em ~449×629 (calc baseado em minHeight: 380 + ratio
    // 5:7 da config) e ela vaza em viewports ≤ 480px.
    const bookEl = document.getElementById('cardapio-book');
    let pageW, pageH, pageMaxW, pageMinH;
    if (usePortrait && bookEl) {
      // Mobile: 1 página retrato 5:7
      const rect = bookEl.getBoundingClientRect();
      const containerW = Math.max(280, Math.floor(rect.width || 0));
      pageW = containerW;
      pageH = Math.round(containerW * 7 / 5); // 5:7 retrato
      pageMaxW = containerW;
      pageMinH = pageH;
    } else {
      // Desktop/tablet: 2 páginas landscape (10:7) → cada página = 5:7
      // Largura do container `.book` divide por 2 (= largura de 1 página
      // quando stretched). Usamos isso pra derivar `pageH` com ratio 5:7.
      // Sem essa derivação, `pageHeight` ficava 700px (default antigo) e
      // o container era forçado a 700px durante o build() — o que NÃO
      // combinava com o `aspect-ratio: 10/7` do CSS (que resultaria em
      // ~595px). Isso fazia o rebalanceamento medir folga onde o StPageFlip
      // depois detectaria overflow real (ex: X-Egg Duplo cortado).
      const containerW = bookEl ? Math.max(560, Math.floor(bookEl.getBoundingClientRect().width || 0)) : 1000;
      const halfW = Math.floor(containerW / 2);
      pageW = halfW;
      pageH = Math.round(halfW * 7 / 5); // 5:7 retrato por página
      pageMaxW = halfW;
      pageMinH = pageH;
    }
    const mobileW = pageW, mobileH = pageH, mobileMaxW = pageMaxW, mobileMinH = pageMinH;
    return {
      // Páginas com proporção 5:7 (≈0.714, retrato de cardápio real).
      // O `.book` pai tem `aspect-ratio: 10/7` em landscape (2 páginas
      // 5:7 lado a lado) e `5/7` em mobile/portrait — a StPageFlip
      // precisa que a config bata com isso pra calcular a largura da
      // capa/páginas corretamente. Antes estava 1:1 (600x600, quadrado)
      // e a 1:1 (500x680), e a StPageFlip dimensionava errado a largura
      // da capa (35% em vez de 50%), gerando o gap visual.
      width: mobileW,
      height: mobileH,
      size: 'stretch',
      minWidth: 280,
      maxWidth: mobileMaxW, // alinhado ao max-width do .book (CSS) — evita o livro estourar o container
      minHeight: mobileMinH,
      maxHeight: 1400,
      drawShadow: true,
      // 500ms em retrato (celular): aparelhos mais fracos não acompanham
      // os 700ms sem engasgar — fica mais leve E mais ágil de folhear.
      // Desktop/tablet mantém 700ms.
      flippingTime: reduced ? 0 : (usePortrait ? 500 : 700),
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

  // Espera as webfonts estarem PRONTAS pra serem usadas antes de continuar.
  // O CSS usa `font-display: swap`, então o browser renderiza inicialmente
  // com a fonte fallback (menor) e troca pelo webfont quando termina de
  // baixar — se medirmos o header DURANTE o fallback, calculamos folga
  // onde a renderização final (com webfont maior) não vai caber.
  // Sintoma observado: DURING head.h=87.1, RENDER head.h=102.9, diferença
  // de 15.8px → X-Contra Filé cortado embaixo mesmo com "folga" no build.
  // Solução: `document.fonts.load()` força o browser a baixar e aplicar o
  // webfont ANTES de medir. Aceita uma string opcionalmente; quando vazio,
  // já retorna a lista de todas as fontes no `document.fonts`.
  function fontsReady() {
    if (document.fonts && typeof document.fonts.ready?.then === 'function') {
      // Força o carregamento das duas famílias que o cardápio usa (a
      // display do título e o body do lead). Sem o `.load()` explícito,
      // algumas engines só materializam o webfont quando o glifo entra
      // na viewport — como nosso livro começa fora da viewport durante
      // o build, a fonte só seria trocada depois.
      const loadPromises = [
        document.fonts.load('400 1.2rem "Lilita One"').catch(() => {}),
        document.fonts.load('400 0.7rem "Nunito Sans"').catch(() => {}),
        document.fonts.ready,
      ];
      return Promise.all(loadPromises);
    }
    return Promise.resolve();
  }

  // Aplica o rebalanceamento e — se criou páginas novas — re-sincroniza o
  // array pages JS com o DOM. Chamado em 2 momentos: DURANTE o build (após
  // fonts.ready) e em uma 2ª passada após o StPageFlip terminar de
  // processar (pega edge cases onde a fonte efetiva só estabiliza depois
  // do primeiro paint com StPageFlip aplicado — observado com Chrome).
  function applyRebalanceAndSync(wrappers, pages) {
    const rebalance = window.CardapioPages.rebalancePages(wrappers);
    if (rebalance.newPagesCreated > 0) {
      const synced = window.CardapioPages.syncPagesFromWrappers(wrappers, pages);
      currentPages = synced;
      return { rebalance, wrappers, pages: synced };
    }
    return { rebalance, wrappers, pages };
  }

  // ============== ESCALA DAS PÁGINAS ==============
  // As páginas são paginadas no tamanho canônico do PC (425×595) e o
  // conteúdo fica FIXO nesse tamanho dentro do .book-page. Pra caber no
  // display (celular 351px, tablet 360px por página, etc.), aplicamos um
  // transform: scale(display/canônico) — o layout interno NUNCA muda,
  // então o celular mostra exatamente a mesma página do PC.
  function applyPageScale() {
    const bookEl = document.getElementById('cardapio-book');
    if (!bookEl) return;
    const bookW = bookEl.getBoundingClientRect().width;
    if (!bookW) return;
    // Retrato (mobile): o livro exibe 1 página → escala = livro/425.
    // Landscape (tablet/desktop): livro exibe 2 páginas → livro/850.
    const portrait = getBreakpoint() === 'mobile';
    const scale = bookW / (portrait ? 425 : 850);
    bookEl.querySelectorAll('.book-page').forEach(p => {
      p.style.setProperty('width', '425px', 'important');
      p.style.setProperty('height', '595px', 'important');
      p.style.setProperty('transform', `scale(${scale})`, 'important');
      p.style.setProperty('transform-origin', '0 0', 'important');
      p.style.setProperty('overflow', 'hidden', 'important');
    });
  }

  // ============== MODO PÁGINA ÚNICA (SCROLL_MODE) ==============
  // Empilha todas as páginas como cartões verticais, sem StPageFlip.
  // O rebalanceamento por medição de DOM continua rodando com a página
  // em tamanho fixo (largura do container, teto 500px, proporção 5:7),
  // então cada cartão tem exatamente o conteúdo que cabe nele — nada
  // é cortado, independentemente do viewport.
  function buildScrollMode(bookEl, pages) {
    // 1) Tamanho do cartão: largura real do container com teto de 500px
    //    (cartões mais largos que isso ficam desconfortáveis de ler).
    const rect = bookEl.getBoundingClientRect();
    const pageWidth = Math.max(280, Math.min(500, Math.floor(rect.width || 360)));
    const pageHeight = Math.round(pageWidth * 7 / 5);
    lastScrollPageWidth = pageWidth;

    bookEl.classList.remove('book--scroll');
    bookEl.innerHTML = '';

    // 2) Monta os wrappers e aplica tamanho FIXO em cada um — mesma
    //    disciplina do modo livro (sem isso a medição de overflow mente).
    const setSize = (w) => {
      w.style.setProperty('height', pageHeight + 'px', 'important');
      w.style.setProperty('width', pageWidth + 'px', 'important');
      const page = w.querySelector('.book-page');
      if (page) {
        page.style.setProperty('height', '100%', 'important');
        page.style.setProperty('width', '100%', 'important');
      }
    };
    const mount = (list) => {
      bookEl.innerHTML = '';
      const arr = list.map(p => {
        const d = document.createElement('div');
        d.className = 'book-page-wrapper';
        d.innerHTML = p.html;
        return d;
      });
      arr.forEach(w => bookEl.appendChild(w));
      arr.forEach(setSize);
      return arr;
    };

    let wrappers = mount(pages);
    void bookEl.offsetHeight; // reflow antes de medir

    // 3) Rebalanceamento por medição (mesma função do modo livro) —
    //    move o último item que estourou pro próximo cartão / cria cartão novo.
    const r1 = applyRebalanceAndSync(wrappers, pages);
    if (r1.pages !== pages) {
      // Rebance criou páginas novas — remonta do array sincronizado.
      wrappers = mount(r1.pages);
      void bookEl.offsetHeight;
    }

    // 4) Liga o modo scroll — o CSS empilha os cartões. Os estilos inline
    //    de tamanho são MANTIDOS (não há StPageFlip pra assumir o tamanho).
    bookEl.classList.add('book--scroll');

    // 5) Esconde a navegação de livro (setas + indicador) — sem páginas pra
    //    virar, ela não tem função.
    const nav = document.querySelector('.menu-stage .book-nav');
    if (nav) nav.hidden = true;

    // 6) Interações (modal de sabores + sumário como âncora de rolagem)
    bindFlavorClicks();
    bindFlipTargets();
  }

  async function build(pages) {
    const bookEl = document.getElementById('cardapio-book');
    if (!bookEl) return;
    if (!SCROLL_MODE && (typeof St === 'undefined' || !St.PageFlip)) {
      // CDN falhou — fallback: páginas empilhadas (mesmo visual do modo
      // scroll), pra o cardápio continuar legível sem a animação.
      bookEl.classList.add('book--scroll');
      const nav = document.querySelector('.menu-stage .book-nav');
      if (nav) nav.hidden = true;
      bookEl.innerHTML = pages.map(p => p.html).join('');
      return;
    }

    // Espera as webfonts carregarem ANTES de montar/medir. Sem isso, a
    // medição de overflow usa fontes fallback (menores) e a renderização
    // final usa webfont (maior) — folga falsa que vira overflow visual.
    await fontsReady();

    destroyInstance();
    currentPages = pages;
    currentBreakpoint = getBreakpoint();

    // Modo página única: empilha os cartões e retorna — nada de StPageFlip.
    if (SCROLL_MODE) {
      buildScrollMode(bookEl, pages);
      return;
    }

    // Calcula o tamanho do livro ANTES de montar as páginas — assim o
    // rebalanceamento (que precisa de altura de página bem definida)
    // consegue medir overflow corretamente.
    const settings = buildSettings();
    // Tamanho CANÔNICO de página (o do PC, livro de 850px → 425×595).
    // A paginação acontece UMA vez só, sempre nesse tamanho, pra que as
    // quebras de página sejam IDÊNTICAS em todos os dispositivos — o
    // celular mostra a mesma página do PC, levemente reduzida pra caber
    // (applyPageScale, logo após o loadFromHTML). Antes, cada breakpoint
    // repaginava na própria largura e o conteúdo "misturava" entre as
    // páginas ao mudar de dispositivo.
    const pageWidth = 425;
    const pageHeight = 595;
    if (settings.usePortrait) {
      // Mobile: força aspect-ratio 5/7 no container pra que as páginas
      // herdem a altura certa quando o rebalanceamento medir.
      bookEl.style.aspectRatio = '5 / 7';
      bookEl.style.height = pageHeight + 'px';
    } else {
      // Desktop: 10/7 (2 páginas 5:7 lado a lado)
      bookEl.style.aspectRatio = '10 / 7';
      bookEl.style.height = pageHeight + 'px';
    }

    // Monta o DOM primeiro
    const wrappers = mountPages(bookEl, pages);

    // Força altura E LARGURA explícitas em CADA wrapper e book-page antes
    // de medir. Sem isso, dois problemas:
    //  (a) `height:100%` colapsa (StPageFlip ainda não instanciou) → página
    //      cresce pra acomodar conteúdo → impossível medir overflow.
    //  (b) Sem largura fixa, cada wrapper estica pra largura TOTAL do
    //      container (850px desktop), e o `lead` do cabeçalho cabe em
    //      1 linha (folga falsa de ~17px). Quando o StPageFlip depois
    //      aplica `position:absolute; width:425px`, o lead quebra pra 2
    //      linhas e empurra os items pra baixo, estourando o fundo.
    //      Medir na largura correta ANTES do rebalance elimina esse gap.
    // Usamos !important pra sobrescrever o CSS.
    wrappers.forEach(w => {
      w.style.setProperty('height', pageHeight + 'px', 'important');
      w.style.setProperty('width', pageWidth + 'px', 'important');
      const page = w.querySelector('.book-page');
      if (page) {
        page.style.setProperty('height', '100%', 'important');
        page.style.setProperty('width', '100%', 'important');
      }
    });
    // Força reflow pra o browser aplicar os novos tamanhos antes da medição
    void bookEl.offsetHeight;

    // 1ª passada: rebalanceamento baseado em DOM (mede com fontes prontas).
    // Move o último item que estourou pra próxima página (criando nova
    // página se necessário). Resolve o bug "último item cortado embaixo"
    // e blinda contra crescimento dinâmico do cardápio (admin acrescenta
    // sabores). Ver memory/conquista-brasileira-site.md pra detalhes.
    let activePages = pages;
    const r1 = applyRebalanceAndSync(wrappers, activePages);
    // Sempre usa o array de wrappers retornado pelo rebalance — ele contém
    // eventuais novos wrappers criados pelo moveLastFlavorToNext.
    const finalWrappersEarly = r1.wrappers;
    if (r1.pages !== pages) {
      // syncPagesFromWrappers devolveu um novo array — re-monta pra que
      // o StPageFlip instancie já com a estrutura finalizada.
      bookEl.innerHTML = '';
      r1.pages.forEach(p => {
        const w = document.createElement('div');
        w.className = 'book-page-wrapper';
        w.innerHTML = p.html;
        bookEl.appendChild(w);
      });
      activePages = r1.pages;
      // Re-aplica tamanho nos NOVOS wrappers (mountPages com html novo não
      // tem mais o !important setado lá em cima, então o build mediria
      // errado no safety-net do requestAnimationFrame).
      finalWrappersEarly.forEach(w => {
        w.style.setProperty('height', pageHeight + 'px', 'important');
        w.style.setProperty('width', pageWidth + 'px', 'important');
        const page = w.querySelector('.book-page');
        if (page) {
          page.style.setProperty('height', '100%', 'important');
          page.style.setProperty('width', '100%', 'important');
        }
      });
      void bookEl.offsetHeight;
    }

    // Limpa os estilos inline — a StPageFlip vai aplicar os seus próprios
    // quando instanciar (a config settings.width/height vai definir o
    // tamanho real). Se sobrar inline, pode brigar com o size:'stretch'.
    bookEl.style.aspectRatio = '';
    bookEl.style.height = '';
    finalWrappersEarly.forEach(w => {
      w.style.removeProperty('height');
      w.style.removeProperty('width');
      const page = w.querySelector('.book-page');
      if (page) {
        page.style.removeProperty('height');
        page.style.removeProperty('width');
      }
    });

    // Re-coleta os wrappers atualizados (caso o rebalance tenha inserido
    // um novo) pra passar pro StPageFlip.
    const finalWrappers = Array.from(bookEl.querySelectorAll('.book-page-wrapper'));

    // Instancia o StPageFlip
    pageFlipInstance = new St.PageFlip(bookEl, buildSettings());
    pageFlipInstance.loadFromHTML(finalWrappers);

    // Conteúdo fixo em 425×595, escalado pro display (ver applyPageScale).
    applyPageScale();

    // Restaura o índice anterior (após resize)
    if (lastIndex > 0) {
      try { pageFlipInstance.turnToPage(Math.min(lastIndex, activePages.length - 1)); } catch (_) { /* noop */ }
    }

    pageFlipInstance.on('flip', (e) => {
      updateIndicator(e.data);
      centerBookInViewport();
    });
    pageFlipInstance.on('changeOrientation', (e) => {
      // nada a fazer — o stretch cuida
    });

    // 2ª passada (safety net): re-mede o conteúdo RENDERIZADO dentro do
    // spread atual, já com StPageFlip aplicado e fontes estáveis. Se o
    // último item visível estiver estourando, dispara um rebuild
    // completo. Cobre o caso onde fonts.ready resolveu cedo demais
    // (antes da font display trocar pro webfont real) ou onde a fonte
    // só estabiliza depois do primeiro paint com StPageFlip.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        try {
          const visibleSpreads = Array.from(bookEl.querySelectorAll('.stf__item'))
            .filter(it => it.offsetParent !== null); // só as visíveis
          let anyOverflow = false;
          visibleSpreads.forEach(it => {
            const page = it.querySelector('.book-page');
            const lists = it.querySelectorAll('.menu-flavor-list');
            let lastFlavor = null;
            lists.forEach(list => {
              const items = list.querySelectorAll('.menu-flavor');
              if (items.length) {
                const c = items[items.length - 1];
                if (!lastFlavor || (c.compareDocumentPosition(lastFlavor) & Node.DOCUMENT_POSITION_PRECEDING)) {
                  lastFlavor = c;
                }
              }
            });
            if (page && lastFlavor) {
              const pr = page.getBoundingClientRect();
              const lr = lastFlavor.getBoundingClientRect();
              // Tolerância maior aqui (8px) — é só safety net pra pegar
              // overflows claros, não micro-folgas. Se bater isso, rebuild.
              if (lr.bottom > pr.bottom + 8) anyOverflow = true;
            }
          });
          if (anyOverflow) {
            console.warn('[Cardápio] overflow detectado pós-render — rebuild');
            window.CardapioFlip.rebuild();
          }
          applyPageScale(); // re-aplica (a lib pode ter reajustado tamanhos)
          updateIndicator(pageFlipInstance.getCurrentPageIndex() || 0);
        } catch (_) { /* noop */ }
      });
    });

    // Liga interações das páginas (modal, links)
    bindFlavorClicks();
    bindFlipTargets();
  }

  function handleResize() {
    clearTimeout(resizeDebounce);
    resizeDebounce = setTimeout(() => {
      // Modo página única: os cartões são dimensionados pela largura do
      // container — se ela mudou de verdade, remonta pra re-medir.
      if (SCROLL_MODE) {
        if (!currentPages.length) return;
        const bookEl = document.getElementById('cardapio-book');
        if (!bookEl) return;
        const w = Math.max(280, Math.min(500, Math.floor(bookEl.getBoundingClientRect().width || 0)));
        if (Math.abs(w - lastScrollPageWidth) > 40) build(currentPages);
        return;
      }
      const newBp = getBreakpoint();
      if (newBp !== currentBreakpoint && currentPages.length) {
        // Quebrou breakpoint — recria
        build(currentPages);
      } else {
        // Mesmo breakpoint, mas o container mudou de tamanho — StPageFlip já
        // se ajusta via size:'stretch'. A escala do conteúdo (fixo em 425×595)
        // precisa acompanhar o novo tamanho do livro.
        if (pageFlipInstance) {
          try { applyPageScale(); } catch (_) {}
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
