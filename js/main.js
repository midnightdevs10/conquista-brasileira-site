/* ================================================================
   MAIN - Conquista Brasileira Ind e Com de Doces e Salgados Ltda
   Lógica principal: navegação, animações, galeria (lightbox),
   FAQ, horários, carrosséis, contato, header.
   (Cardápio: ver js/cardapio*.js)
   ================================================================ */

(function () {
  'use strict';

  /* ============== Estado ============== */
  const state = {
    config: null,
    gallery: [],
    galleryIndex: 0,
    servicesCarousel: null,
    galleryCarousel: null
  };

  /* ============== Helpers ============== */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const escapeHtml = (str = '') => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // Permite apenas tags inline simples (<strong>, <em>, <br>, <a>, <b>, <i>, <u>, <span>).
  // Qualquer outra tag é escapada. Atributos perigosos (onclick, javascript:) são removidos.
  // Também processa **palavra** → <span class="text-red">palavra</span> (apenas as letras, sem os **).
  const sanitizeInlineHtml = (str = '') => {
    let s = escapeHtml(String(str));
    // Processa ** antes das tags (mais cedo): **texto** → <span class="text-red">texto</span>
    // Aplica de forma não-aninhada e não-gulosa (sem cruzar múltiplos **).
    s = s.replace(/\*\*([^*\n][^*\n]*?)\*\*/g, '<span class="text-red">$1</span>');
    // Desescapa tags permitidas, com seus atributos (usa [\s\S]*? lazy até &gt;).
    // Tolera &quot; e &#039; nos atributos.
    s = s.replace(/&lt;(\/?(?:strong|em|b|i|u|br|a|span))((?:\s(?:[^&]|&(?!gt;))*?)?)&gt;/gi, '<$1$2>');
    // Em <a>:
    //   1) decodifica aspas da attrs
    //   2) remove handlers on* (onclick, onerror, ...)
    //   3) remove hrefs javascript:
    //   4) força target/rel seguros (sobrescreve qualquer target do user)
    s = s.replace(/<a\s+([^>]*)>/gi, (m, attrs) => {
      // decodifica &quot; -> " e &#039; -> ' para os regex casarem
      const decoded = attrs
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'");
      // remove on* handlers (atributo vazio ou com valor)
      // Pode ou não ter espaço antes (caso de tag só com onclick: <a onclick=foo>)
      let cleaned = decoded
        .replace(/\s+on\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\s+on\w+\s*=\s*'[^']*'/gi, '')
        .replace(/^on\w+\s*=\s*"[^"]*"/i, '')
        .replace(/^on\w+\s*=\s*'[^']*'/i, '')
        .replace(/\s+on\w+/gi, '')
        .replace(/^on\w+/i, '')
        // remove hrefs javascript: (com ou sem aspas)
        .replace(/\s+href\s*=\s*"javascript:[^"]*"/gi, '')
        .replace(/\s+href\s*=\s*'javascript:[^']*'/gi, '')
        .replace(/\s+href\s*=\s*javascript:[^\s>]*/gi, '')
        .replace(/^href\s*=\s*"javascript:[^"]*"/i, '')
        .replace(/^href\s*=\s*'javascript:[^']*'/i, '')
        .replace(/^href\s*=\s*javascript:[^\s>]*/i, '');
      // limpa sobras de "=valor" sem nome de atributo (edge case: <a onclick=foo>)
      cleaned = cleaned.replace(/^=\S+/, '').replace(/\s=\S+/g, '').trim();
      return `<a ${cleaned} target="_blank" rel="noopener noreferrer">`;
    });
    return s;
  };

  const cn = {
    whatsapp: () => `https://wa.me/${state.config.company.whatsapp}`,
    whatsappText: (text) => {
      // Aceita: chave de whatsappMessages (string) ou texto literal
      if (text && state.config.whatsappMessages && state.config.whatsappMessages[text]) {
        text = state.config.whatsappMessages[text];
      }
      text = text || (state.config.whatsappMessages && state.config.whatsappMessages.default) ||
             'Olá, gostaria de fazer um pedido na Conquista Brasileira';
      return `https://wa.me/${state.config.company.whatsapp}?text=${encodeURIComponent(text)}`;
    },
    mapsEmbed: () => {
      const c = state.config.company;
      // Se config tem embed URL explícita, usa ela
      if (c.googleMaps && c.googleMaps.embed) return c.googleMaps.embed;
      const addr = encodeURIComponent(c.address);
      return `https://www.google.com/maps?q=${addr}&hl=pt-BR&z=16&output=embed`;
    },
    mapsDir: () => {
      const c = state.config.company;
      if (c.googleMaps && c.googleMaps.lat && c.googleMaps.lng) {
        return `https://www.google.com/maps/dir/?api=1&destination=${c.googleMaps.lat},${c.googleMaps.lng}`;
      }
      const addr = encodeURIComponent(`${c.address}, ${c.city} - ${c.state}, ${c.zipCode}`);
      return `https://www.google.com/maps/dir/?api=1&destination=${addr}`;
    }
  };

  // Ícones SVG inline (puro SVG, sem dependência)
  const ICONS = {
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96c.43 5.21-.3 9.79-3.36 12.85C13.36 18.61 9.68 19.5 5.5 19.5c-.5 0-.97-.05-1.42-.13L11 20Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    award: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
    tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    'shopping-bag': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1-5h16l1 5"/><path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M9 22V12h6v10"/></svg>',
    bike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><path d="M15 6h3l3 6"/><path d="M5.5 17.5 9 9h3l3 4h3"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>',
    gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    coffee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>',
    cake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16h16"/><path d="M12 11V7"/><circle cx="12" cy="5" r="1"/><path d="M9 11h6v0"/></svg>',
    party: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="M14 14l7-7"/><path d="M11 6l2 2"/><path d="m19 9 2 2"/><path d="M9 11l2 2"/><path d="m13 7 2 2"/></svg>',
    star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
  };

  /* ============== Render: Diferenciais ============== */
  function renderDifferentials() {
    const grid = $('#differentials-grid');
    if (!grid) return;
    const items = state.config.differentials || [];
    grid.innerHTML = items.map((d, i) => `
      <li class="diff-card reveal" data-reveal data-reveal-delay="${(i % 3) * 100}">
        <div class="diff-card-icon">${ICONS[d.icon] || ICONS.star}</div>
        <h3>${escapeHtml(d.title)}</h3>
        <p>${escapeHtml(d.description)}</p>
      </li>
    `).join('');
    initScrollReveal();
  }

  /* ============== Render: Galeria (MARQUEE INFINITO) ============== */
  function renderGallery() {
    const container = $('#gallery-masonry');
    if (!container) return;
    state.gallery = state.config.gallery || [];
    if (!state.gallery.length) {
      container.innerHTML = '<p style="text-align:center; padding:2rem; opacity:0.6">Em breve novas fotos.</p>';
      return;
    }

    // Duplica a lista pra ter loop contínuo perfeito
    const doubled = state.gallery.concat(state.gallery);

    container.classList.add('marquee');
    container.innerHTML = `
      <div class="marquee-track" id="gallery-track">
        ${doubled.map((item, i) => {
          const realIndex = i % state.gallery.length; // índice real pra abrir lightbox
          return `
          <div class="marquee-slide" data-gallery-index="${realIndex}">
            <figure class="gallery-item" tabindex="0" role="button" aria-label="Ampliar imagem: ${escapeHtml(item.alt)}">
              <img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.alt)}" loading="eager" decoding="async" />
              <!-- eager: o item vive num marquee que rola sozinho — lazy fazia a foto
                   entrar em preto no celular (só carregava quando chegava perto) -->
              <figcaption class="gallery-item-caption">
                <span class="gallery-item-title">${escapeHtml(item.caption || item.alt || '')}</span>
                <span class="gallery-item-desc">${escapeHtml(item.description || '')}</span>
              </figcaption>
            </figure>
          </div>
        `;}).join('')}
      </div>
    `;

    // Lightbox: cada item continua clicável (mas não dispara após drag)
    $$('.gallery-item', container).forEach(el => {
      const slide = el.closest('.marquee-slide');
      const open = () => {
        // Se o track acabou de sair de um drag, ignora o click sintético
        if (slide.closest('.marquee-track')?.dataset.dragging === '1') return;
        openLightbox(parseInt(slide.dataset.galleryIndex, 10));
      };
      el.addEventListener('click', open);
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  /* ============== Render: Serviços (MARQUEE INFINITO COM IMAGENS) ============== */
  function renderServices() {
    const grid = $('#services-grid');
    if (!grid) return;
    const items = state.config.services || [];
    if (!items.length) return;

    // Duplica pra loop infinito perfeito
    const doubled = items.concat(items);

    grid.classList.add('marquee');
    grid.innerHTML = `
      <div class="marquee-track" id="services-track">
        ${doubled.map((s, i) => {
          // índice real na lista original (a duplicata começa na metade)
          const realIndex = i % items.length;
          return `
            <article class="service-card" tabindex="0" role="button"
                     aria-label="Ver detalhes de ${escapeHtml(s.title)}"
                     data-service-index="${realIndex}">
              <img src="${escapeHtml(s.image || 'assets/images/copa.svg')}" alt="" loading="lazy" decoding="async" />
              <div class="service-card-content">
                <h3>${escapeHtml(s.title)}</h3>
                <p>${escapeHtml(s.description)}</p>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;

    // === Modal de detalhes do serviço (com navegação prev/next) ===
    const modal = $('#service-modal');
    const mImage = $('#service-modal-image');
    const mTitle = $('#service-modal-title');
    const mDesc = $('#service-modal-desc');
    const mPrev = $('#service-modal-prev');
    const mNext = $('#service-modal-next');

    let currentServiceIndex = 0;

    const renderService = (idx) => {
      const item = items[idx];
      if (!item) return;
      mTitle.textContent = item.title;
      mDesc.textContent = item.description || '';
      mImage.innerHTML = '';
      if (item.image) {
        const img = document.createElement('img');
        img.src = item.image;
        img.alt = item.title;
        img.loading = 'lazy';
        mImage.appendChild(img);
      } else {
        mImage.style.display = 'none';
      }
    };

    const openServiceModal = (idx) => {
      currentServiceIndex = idx;
      renderService(currentServiceIndex);
      modal.removeAttribute('hidden');
      document.body.style.overflow = 'hidden';
      const closeBtn = modal.querySelector('.service-modal-close');
      if (closeBtn) setTimeout(() => closeBtn.focus(), 50);
    };

    const closeServiceModal = () => {
      modal.setAttribute('hidden', '');
      document.body.style.overflow = '';
    };

    const navService = (delta) => {
      currentServiceIndex = (currentServiceIndex + delta + items.length) % items.length;
      renderService(currentServiceIndex);
    };

    // Fechar: backdrop, X
    $$('[data-service-modal-close]', modal).forEach(el => el.addEventListener('click', closeServiceModal));

    // Setas
    if (mPrev) mPrev.addEventListener('click', (e) => { e.stopPropagation(); navService(-1); });
    if (mNext) mNext.addEventListener('click', (e) => { e.stopPropagation(); navService(1); });

    // Teclado: ESC fecha, setas navegam (só quando modal aberto)
    document.addEventListener('keydown', (e) => {
      if (modal.hasAttribute('hidden')) return;
      if (e.key === 'Escape') { e.preventDefault(); closeServiceModal(); }
      else if (e.key === 'ArrowLeft')  { e.preventDefault(); navService(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navService(1); }
    });

    // Click/teclado em cada service-card
    $$('.service-card', grid).forEach(card => {
      const open = () => {
        // Suprime click sintético após drag no marquee
        if (card.closest('.marquee-track')?.dataset.dragging === '1') return;
        const idx = parseInt(card.dataset.serviceIndex, 10);
        if (Number.isNaN(idx)) return;
        openServiceModal(idx);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
      });
    });
  }

  /* ============== Carrossel Genérico ============== */
  function initCarousel({ trackId, prevId, nextId, dotsId, auto = false, autoInterval = 5000 }) {
    const track = $('#' + trackId);
    const prevBtn = $('#' + prevId);
    const nextBtn = $('#' + nextId);
    const dotsContainer = $('#' + dotsId);
    if (!track) return null;

    const slides = $$('.carousel-slide', track);
    let current = 0;
    let timer = null;

    // Determina slides visíveis pelo CSS — mas aqui usamos 1 para simplificar
    const total = slides.length;
    const getVisible = () => {
      const w = window.innerWidth;
      if (w < 600) return 1;
      if (w < 1000) return 2;
      if (w < 1300) return 3;
      return 4;
    };

    const goTo = (idx) => {
      const visible = getVisible();
      const max = Math.max(0, total - visible);
      current = Math.max(0, Math.min(idx, max));
      const offset = -(current * (100 / visible));
      track.style.transform = `translateX(${offset}%)`;
      updateDots();
    };

    const next = () => {
      const visible = getVisible();
      const max = Math.max(0, total - visible);
      current = current >= max ? 0 : current + 1;
      goTo(current);
    };
    const prev = () => {
      const visible = getVisible();
      const max = Math.max(0, total - visible);
      current = current <= 0 ? max : current - 1;
      goTo(current);
    };

    // Dots
    const buildDots = () => {
      if (!dotsContainer) return;
      const visible = getVisible();
      const pages = Math.max(1, total - visible + 1);
      dotsContainer.innerHTML = '';
      for (let i = 0; i < pages; i++) {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Ir para slide ${i + 1}`);
        dot.addEventListener('click', () => goTo(i));
        dotsContainer.appendChild(dot);
      }
    };

    const updateDots = () => {
      if (!dotsContainer) return;
      $$('.carousel-dot', dotsContainer).forEach((d, i) => {
        d.classList.toggle('active', i === current);
      });
    };

    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restartAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { next(); restartAuto(); });

    const startAuto = () => {
      if (!auto) return;
      stopAuto();
      timer = setInterval(next, autoInterval);
    };
    const stopAuto = () => { if (timer) { clearInterval(timer); timer = null; } };
    const restartAuto = () => { stopAuto(); startAuto(); };

    // Pausa no hover
    const root = track.parentElement;
    root.addEventListener('mouseenter', stopAuto);
    root.addEventListener('mouseleave', startAuto);
    // Pausa em foco
    root.addEventListener('focusin', stopAuto);
    root.addEventListener('focusout', startAuto);

    // Swipe
    let startX = 0, dx = 0, isDragging = false;
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; stopAuto(); }, { passive: true });
    track.addEventListener('touchend', (e) => {
      dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 50) { dx > 0 ? prev() : next(); }
      startAuto();
    }, { passive: true });

    // Teclado
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { prev(); restartAuto(); }
      if (e.key === 'ArrowRight') { next(); restartAuto(); }
    });

    window.addEventListener('resize', () => { buildDots(); goTo(Math.min(current, Math.max(0, total - getVisible()))); });

    buildDots();
    goTo(0);
    startAuto();
    return { next, prev, goTo };
  }

  /* ============== Lightbox ============== */
  const lightbox = () => $('#lightbox');
  function openLightbox(index) {
    if (!state.gallery[index]) return;
    state.galleryIndex = index;
    updateLightbox();
    lightbox().hidden = false;
    document.body.style.overflow = 'hidden';
  }
  function closeLightbox() {
    lightbox().hidden = true;
    document.body.style.overflow = '';
  }
  function updateLightbox() {
    const item = state.gallery[state.galleryIndex];
    if (!item) return;
    $('#lightbox-img').src = item.src;
    $('#lightbox-img').alt = item.alt;
    $('#lightbox-caption').textContent = item.alt;
  }
  function navLightbox(dir) {
    state.galleryIndex = (state.galleryIndex + dir + state.gallery.length) % state.gallery.length;
    updateLightbox();
  }

  function initLightbox() {
    $('#lightbox-close').addEventListener('click', closeLightbox);
    $('#lightbox-prev').addEventListener('click', () => navLightbox(-1));
    $('#lightbox-next').addEventListener('click', () => navLightbox(1));
    lightbox().addEventListener('click', (e) => {
      if (e.target === lightbox()) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (lightbox().hidden) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') navLightbox(-1);
      if (e.key === 'ArrowRight') navLightbox(1);
    });
  }

  /* ============== Render: Horários ============== */
  function renderHours() {
    const list = $('#hours-list');
    if (!list) return;
    const hours = state.config.hours || [];
    const today = new Date().getDay();
    list.innerHTML = hours.map(h => {
      const dayIndex = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'].indexOf(h.day);
      const isToday = dayIndex === today;
      const time = h.isClosed
        ? `<span class="time closed-text">${escapeHtml(h.open)}</span>`
        : `<span class="time">${escapeHtml(h.open)} — ${escapeHtml(h.close)}</span>`;
      const highlight = h.highlight ? `<span class="highlight-tag">${escapeHtml(h.highlight)}</span>` : '';
      return `<li class="${isToday ? 'today' : ''}">
        <span class="day">${escapeHtml(h.day)} ${highlight}</span>
        ${time}
      </li>`;
    }).join('');
    updateOpenBadge();
  }

  function updateOpenBadge() {
    const badge = $('#hours-badge');
    if (!badge) return;
    const open = isOpenNow(state.config.hours || []);
    badge.textContent = open ? 'Aberto agora' : 'Fechado';
    badge.classList.toggle('closed', !open);
  }

  function isOpenNow(hours) {
    const now = new Date();
    const dayIndex = now.getDay();
    const dayNames = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
    const cur = hours.find(h => dayNames[dayIndex] === h.day);
    if (!cur || cur.isClosed) return false;
    const [oH, oM] = cur.open.split(':').map(Number);
    const [cH, cM] = cur.close.split(':').map(Number);
    const curMin = now.getHours() * 60 + now.getMinutes();
    return curMin >= oH * 60 + oM && curMin < cH * 60 + cM;
  }

  /* ============== Render: FAQ ============== */
  function renderFAQ() {
    const list = $('#faq-list');
    if (!list) return;
    const faq = state.config.faq || [];
    list.innerHTML = faq.map((f, i) => `
      <details class="faq-item reveal" data-reveal data-reveal-delay="${(i % 4) * 80}" ${i === 0 ? 'open' : ''}>
        <summary class="faq-question">
          <span>${escapeHtml(f.question)}</span>
          <span class="faq-icon" aria-hidden="true">+</span>
        </summary>
        <div class="faq-answer">
          <p>${escapeHtml(f.answer)}</p>
        </div>
      </details>
    `).join('');
    initScrollReveal();
  }

  /* ============== Render: Contato ============== */
  function renderContact() {
    const c = state.config.company;
    const ct = state.config.contact || {};
    const labels = ct.labels || {};
    const safe = (key, fallback) => (labels[key] != null ? labels[key] : fallback);

    // Endereço
    const addrEl = $('#contact-address');
    if (addrEl) addrEl.textContent = c.address;

    // WhatsApp
    const wppLink = $('#contact-whatsapp');
    if (wppLink) {
      wppLink.href = cn.whatsapp();
      wppLink.textContent = c.whatsappDisplay;
    }

    // Telefone (usa phone se existir, senão whatsapp)
    const phoneLink = $('#contact-phone');
    if (phoneLink) {
      phoneLink.href = `tel:+${c.phone || c.whatsapp}`;
      phoneLink.textContent = c.phone || c.whatsappDisplay;
    }

    // Mapa
    const gmap = $('#gmap');
    if (gmap) gmap.src = cn.mapsEmbed();

    // "Como Chegar"
    const howArrive = $('#btn-how-to-arrive');
    if (howArrive) howArrive.href = cn.mapsDir();

    // Labels customizadas (se o HTML tiver data-contact-label="...")
    $$('[data-contact-label]').forEach(el => {
      const key = el.getAttribute('data-contact-label');
      const val = safe(key, el.textContent);
      el.textContent = val;
    });

    // Texto do horário
    const hoursLabelEl = $('[data-contact-hours-label]');
    if (hoursLabelEl && ct.hoursLabel) {
      hoursLabelEl.textContent = ct.hoursLabel;
    }
  }

  /* ============== Render: Schema.org ============== */
  function renderSchema() {
    const node = $('#schema-org');
    if (!node || !state.config.seo || !state.config.seo.schema) return;
    node.textContent = JSON.stringify(state.config.seo.schema, null, 2);
  }

  /* ============== Render: Hero (campos editáveis do config.hero) ==============
     Adicionado pelo painel CMS. Cada bloco é opcional — se a chave não existir
     no JSON, mantém o HTML hardcoded original (fallback inline).             */
  function renderHero(c) {
    if (!c || !c.hero) return;
    const h = c.hero;

    // Eyebrow (preserva a bolinha piscante .dot se já existir)
    const eyebrow = $('.hero-eyebrow');
    if (eyebrow && h.eyebrow != null) {
      // Garante que o .dot esteja presente (ele é puramente visual, não vem do config)
      let dot = eyebrow.querySelector('.dot');
      if (!dot) {
        dot = document.createElement('span');
        dot.className = 'dot';
        eyebrow.insertBefore(dot, eyebrow.firstChild);
      }
      // Atualiza apenas o text node que segue o .dot (sem mexer nos outros elementos)
      // Estratégia: recria um text node solto depois do .dot, removendo os text nodes/textos antigos.
      // Pega tudo que NÃO é o .dot e remove.
      Array.from(eyebrow.childNodes).forEach(n => { if (n !== dot) n.remove(); });
      eyebrow.appendChild(document.createTextNode(h.eyebrow));
    }

    // Título (parte 1, accent e sufixo)
    const titleMain = $('.hero-title .title-main, .hero-title > span:not(.text-accent)');
    const titleAccent = $('.hero-title .text-accent, .hero-title > .text-accent');
    const titleSuffix = $('.hero-title .title-suffix, .hero-title > .title-suffix');
    if (titleMain && h.title != null) titleMain.textContent = h.title;
    if (titleAccent && h.titleAccent != null) titleAccent.textContent = h.titleAccent;
    if (titleSuffix) {
      // Render sufixo como texto puro (escape). Suporta \n como <br>.
      titleSuffix.innerHTML = escapeHtml(h.titleSuffix || '').replace(/\n/g, '<br>');
    }

    // Subtítulo (suporta \n → <br>)
    const subtitle = $('.hero-subtitle');
    if (subtitle && h.subtitle != null) {
      subtitle.innerHTML = escapeHtml(h.subtitle).replace(/\n/g, '<br>');
    }

    // Imagem flutuante
    if (h.image) {
      $$('.hero-floating img, .hero-image').forEach(img => { img.src = h.image; });
    }

    // Floating tag (+30 / sabores)
    if (h.floatingTag) {
      const tagStrong = $('.hero-floating-tag .tag-strong, .hero-floating-tag strong');
      const tagLabel  = $('.hero-floating-tag .tag-label, .hero-floating-tag span:not(.tag-strong):not(strong)');
      if (tagStrong && h.floatingTag.strong != null) tagStrong.textContent = h.floatingTag.strong;
      if (tagLabel && h.floatingTag.label != null)   tagLabel.textContent  = h.floatingTag.label;
    }

    // Badges (lista). SEMPRE reconstrói a partir do config para garantir
    // consistência (caso o user tenha removido/adicionado selos, ou trocado ícones).
    if (Array.isArray(h.badges) && h.badges.length) {
      const list = $('.hero-badges');
      if (list) {
        list.innerHTML = h.badges.map(b => {
          const raw = (b.icon || '').toString();
          // Se o ícone já é um <svg>...</svg>, injeta como HTML.
          // Caso contrário, escapa como texto (emoji/char curto).
          const iconHtml = /^\s*<svg[\s>]/i.test(raw)
            ? raw
            : (raw ? escapeHtml(raw) : escapeHtml('★'));
          const text = escapeHtml(b.text || '');
          return `
            <li class="hero-badge reveal" data-reveal>
              <span class="hero-badge-icon" aria-hidden="true">${iconHtml}</span>
              <span class="hero-badge-text">${text}</span>
            </li>`;
        }).join('');
        initScrollReveal(list.parentElement);
      }
    }
  }

  /* ============== Render: About (parágrafos, features, sticker, imagens) ============== */
  function renderAbout(c) {
    if (!c || !c.about) return;
    const a = c.about;

    // Parágrafos — substitui apenas os <p> dentro de .about-text, preservando
    // o eyebrow, h2 e outros filhos (como a .about-features).
    if (Array.isArray(a.paragraphs) && a.paragraphs.length) {
      const textContainer = $('.about-text');
      if (textContainer) {
        const htmls = a.paragraphs.filter(p => p && p.trim()).map(p => `<p>${sanitizeInlineHtml(p)}</p>`);
        // Substitui cada <p> existente; se houver mais no config, adiciona antes do <ul> ou appenda.
        const ps = textContainer.querySelectorAll('p');
        ps.forEach((p, i) => {
          if (htmls[i] != null) p.outerHTML = htmls[i];
        });
        // Sobras: adiciona após o último <p>
        if (htmls.length > ps.length) {
          const tail = htmls.slice(ps.length).join('');
          const lastP = textContainer.querySelector('p:last-of-type');
          if (lastP) lastP.insertAdjacentHTML('afterend', tail);
          else {
            const features = textContainer.querySelector('.about-features');
            if (features) features.insertAdjacentHTML('beforebegin', tail);
            else textContainer.insertAdjacentHTML('beforeend', tail);
          }
        }
      }
    }

    // Features (3 cards)
    if (Array.isArray(a.features) && a.features.length) {
      const grid = $('.about-features, .about-features-list');
      if (grid) {
        grid.innerHTML = a.features
          .filter(f => f && (f.title || f.description))
          .map(f => `
            <li>
              <span class="check">✓</span>
              <div>
                <strong>${escapeHtml(f.title || '')}</strong>
                <span>${escapeHtml(f.description || '')}</span>
              </div>
            </li>
          `).join('');
        initScrollReveal(grid);
      }
    }

    // Sticker (desde / ano / suffix)
    if (a.sticker) {
      const sinceEl  = $('.about-card-stamp .stamp-since, .about-stamp-since');
      const yearEl   = $('.about-card-stamp .stamp-year, .about-stamp-year');
      const suffixEl = $('.about-card-stamp .stamp-suffix, .about-stamp-suffix');
      if (sinceEl  && a.sticker.prefix != null) sinceEl.textContent  = a.sticker.prefix;
      if (yearEl   && a.sticker.year != null)   yearEl.textContent   = String(a.sticker.year);
      if (suffixEl && a.sticker.suffix != null) suffixEl.textContent = a.sticker.suffix;
    }

    // Imagens
    if (a.images) {
      if (a.images.main && a.images.main.src) {
        const main = $('.about-img-main, .about-image-main img, .about-image-main');
        if (main) { main.src = a.images.main.src; if (a.images.main.alt) main.alt = a.images.main.alt; }
      }
      if (a.images.sub && a.images.sub.src) {
        const sub = $('.about-img-sub, .about-image-sub img, .about-image-sub');
        if (sub) { sub.src = a.images.sub.src; if (a.images.sub.alt) sub.alt = a.images.sub.alt; }
      }
    }
  }

  /* ============== Render: Footer (brand, trust badges, address short, credits) ============== */
  function renderFooter(c) {
    if (!c || !c.footer) return;
    const f = c.footer;

    // Brand
    const brandStrong = $('.footer-brand strong, .site-footer .brand strong');
    const brandDesc   = $('.footer-brand p, .site-footer .brand p');
    if (f.brand) {
      if (brandStrong && f.brand.name) brandStrong.textContent = f.brand.name;
      if (brandDesc && f.brand.description) brandDesc.textContent = f.brand.description;
    }

    // Trust badges
    if (Array.isArray(f.trustBadges) && f.trustBadges.length) {
      const container = $('.footer-trust-badges, .footer-badges');
      if (container) {
        container.innerHTML = f.trustBadges.map(b => `
          <div class="footer-badge">
            <span class="footer-badge-icon" aria-hidden="true">${escapeHtml(b.icon || '★')}</span>
            <span class="footer-badge-text">${escapeHtml(b.text || '')}</span>
          </div>
        `).join('');
      }
    }

    // Endereço curto (se configurado)
    if (c.company && c.company.addressShort) {
      const addrEl = $('[data-footer-address]');
      if (addrEl) addrEl.textContent = c.company.addressShort;
    }

    // Horário curto
    if (f.hoursShort) {
      const hoursEl = $('[data-footer-hours]');
      if (hoursEl) hoursEl.textContent = f.hoursShort;
    }

    // Créditos
    if (f.credits) {
      const creditsEl = $('[data-footer-credits]');
      if (creditsEl) {
        creditsEl.innerHTML = '';
        const text = document.createTextNode(f.credits.text || '');
        creditsEl.appendChild(text);
        if (f.credits.url) {
          creditsEl.appendChild(document.createTextNode(' '));
          const a = document.createElement('a');
          a.href = f.credits.url;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = f.credits.url.replace(/^https?:\/\//, '');
          creditsEl.appendChild(a);
        }
      }
    }
  }

  /* ============== Render: Page Content (eyebrow, h2, accent, lead de cada seção) ============== */
  function renderPageContent(c) {
    if (!c || !c.sections) return;
    const map = c.sections;
    // Tenta casar por id na URL (#diferenciais, #cardapio, #espaco, #servicos, #faq, #contato, #cta-final)
    const keys = Object.keys(map);
    keys.forEach((key) => {
      const sec = map[key];
      if (!sec) return;
      // Encontra a <section> cujo id contém a key OU cujo eyebrow tem o texto padrão
      const section = $(`#${key}`) || $(`section[data-section="${key}"]`) || $(`#${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`);
      if (!section) return;

      // Eyebrow
      if (sec.eyebrow != null) {
        const eyebrow = section.querySelector('.section-eyebrow');
        if (eyebrow) eyebrow.textContent = sec.eyebrow;
      }
      // Title
      if (sec.title != null) {
        const titleMain = section.querySelector('.section-title .title-main, .section-title > span:not(.text-accent)');
        if (titleMain) titleMain.textContent = sec.title;
      }
      // Title accent
      if (sec.titleAccent != null) {
        const titleAccent = section.querySelector('.section-title .text-accent, .section-title > .text-accent');
        if (titleAccent) titleAccent.textContent = sec.titleAccent;
      }
      // Lead
      if (sec.lead != null) {
        const lead = section.querySelector('.section-lead');
        if (lead) lead.textContent = sec.lead;
      }
    });
  }

  /* ============== Render: Logo (header + footer) ============== */
  function renderLogo(c) {
    if (!c || !c.company || !c.company.logo) return;
    const src = c.company.logo;
    $$('.logo img, .site-footer .logo img').forEach(img => { img.src = src; });
  }

  /* ============== Render: WhatsApp (todos os wa.me do DOM) ==============
     Troca o href de TODOS os <a href="https://wa.me/..."> do site público
     (hero CTA, header CTA, cardápio CTA, CTA final, whatsapp-float, footer)
     e o texto visível onde estiver em formato de telefone.

     Aceita ser chamado com o config completo ou só com o company,
     e preserva a query string (?text=...) que cada link possa ter.
     ===================================================================== */
  function renderWhatsApp(input) {
    if (!input) return;
    const company = input.company || input;
    const wpp       = company.whatsapp;
    const wppDisp   = company.whatsappDisplay;
    if (!wpp) return;

    const newBase = 'https://wa.me/' + wpp;

    // Regex pra extrair a query string atual de um link wa.me (preserva ?text=...)
    const WAPP_RE = /^https?:\/\/(?:api\.)?wa\.me\/(\d+)(.*)$/i;

    // 1) Reescreve todos os <a href="wa.me/...">
    $$('a[href*="wa.me/"]').forEach(a => {
      const href = a.getAttribute('href') || '';
      const m = href.match(WAPP_RE);
      if (m) {
        // mantém a query (?text=...) que veio no link original
        a.setAttribute('href', newBase + (m[2] || ''));
      } else if (/^https?:\/\/(?:api\.)?wa\.me\//i.test(href)) {
        // caso degenerado: link com formato levemente diferente
        a.setAttribute('href', newBase);
      }
    });

    // 2) Texto visível — onde aparece um telefone no formato (XX) XXXXX-XXXX
    //    dentro de um link wa.me OU ao lado (no <span> irmão), troca pelo whatsappDisplay.
    if (wppDisp) {
      // a) dentro do próprio link: <a href="wa.me/..."><span>(11) 96380-5855</span></a>
      $$('a[href*="wa.me/"] span').forEach(span => {
        const t = (span.textContent || '').trim();
        if (/^\(\d{2}\)\s*\d{4,5}-\d{4}$/.test(t)) {
          span.textContent = wppDisp;
        }
      });
      // b) texto solto (sem link): ex: o rodapé tem "📱 <a>WhatsApp</a>" e o "Seg a Sáb ..."
      //    Procuramos QUALQUER text node com telefone brasileiro visível e trocamos.
      const telRe = /^\(\d{2}\)\s*\d{4,5}-\d{4}$/;
      const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
      const toUpdate = [];
      let node;
      while ((node = walk.nextNode())) {
        // ignora textos dentro de <script>/<style>
        const p = node.parentElement;
        if (!p) continue;
        const tag = p.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') continue;
        // se está dentro de um link wa.me, já tratamos acima
        if (p.closest('a[href*="wa.me/"]')) continue;
        if (telRe.test((node.nodeValue || '').trim())) {
          toUpdate.push(node);
        }
      }
      toUpdate.forEach(n => { n.nodeValue = wppDisp; });
    }
  }

  /* ============== Render: SEO meta tags (<title>, description, OG, Twitter) ============== */
  function renderSeoMeta(c) {
    if (!c || !c.seo) return;
    const s = c.seo;

    // <title>
    if (s.title) {
      const titleEl = document.querySelector('title');
      if (titleEl) titleEl.textContent = s.title;
    }

    // Helper: atualiza ou cria uma <meta name="X"> ou <meta property="X">
    const setMeta = (selector, attr, key, value) => {
      if (value == null) return;
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        if (attr === 'name') el.setAttribute('name', key);
        else el.setAttribute('property', key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    setMeta('meta[name="description"]', 'name', 'description', s.description);
    setMeta('meta[name="keywords"]',    'name', 'keywords',    s.keywords);
    setMeta('meta[name="author"]',      'name', 'author',      s.author);
    setMeta('meta[name="robots"]',      'name', 'robots',      s.robots);
    setMeta('meta[name="theme-color"]', 'name', 'theme-color', s.themeColor);
    setMeta('link[rel="canonical"]',    'rel',  'canonical',   s.canonical);
    // link rel="icon" / "shortcut icon"
    if (s.favicon) {
      let link = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
      if (!link) { link = document.createElement('link'); link.setAttribute('rel', 'icon'); document.head.appendChild(link); }
      link.setAttribute('href', s.favicon);
    }

    if (s.og) {
      const o = s.og;
      setMeta('meta[property="og:title"]',       'property', 'og:title',       o.title);
      setMeta('meta[property="og:description"]', 'property', 'og:description', o.description);
      setMeta('meta[property="og:url"]',         'property', 'og:url',         o.url);
      setMeta('meta[property="og:image"]',       'property', 'og:image',       o.image);
      setMeta('meta[property="og:image:alt"]',   'property', 'og:image:alt',   o.imageAlt);
      setMeta('meta[property="og:site_name"]',   'property', 'og:site_name',   o.siteName);
      setMeta('meta[property="og:locale"]',      'property', 'og:locale',      o.locale);
      setMeta('meta[property="og:type"]',        'property', 'og:type',        o.type);
    }

    if (s.twitter) {
      const t = s.twitter;
      setMeta('meta[name="twitter:card"]',        'name', 'twitter:card',        t.card);
      setMeta('meta[name="twitter:title"]',       'name', 'twitter:title',       t.title);
      setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', t.description);
      setMeta('meta[name="twitter:image"]',       'name', 'twitter:image',       t.image);
    }
  }

  /* ============== Header scrolled ============== */
  function initHeader() {
    const header = $('#site-header');
    const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const toggle = $('#menu-toggle');
    const nav = $('#main-nav');
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
    });
    $$('.nav-link', nav).forEach(link => link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    }));

    // Scrollspy — usa getBoundingClientRect (independente de offsetParent)
    const sections = $$('section[id]');
    const links = $$('.nav-link');
    const spy = () => {
      // Threshold: quando o topo da seção passa desta linha (a partir do topo do viewport)
      const threshold = 120;
      let current = '';
      sections.forEach(s => {
        // Posição absoluta da seção no documento
        const sectionTop = s.getBoundingClientRect().top + window.scrollY;
        if (sectionTop - threshold <= window.scrollY) current = s.id;
      });
      links.forEach(l => {
        // 'diferenciais' é parte visual de 'sobre' — destaca o link "Quem Somos"
        const isActive = l.getAttribute('href') === '#' + current
          || (current === 'diferenciais' && l.getAttribute('href') === '#sobre');
        l.classList.toggle('active', isActive);
      });
    };
    window.addEventListener('scroll', spy, { passive: true });
    spy(); // garante estado inicial correto
  }

  /* ============== Scroll Reveal ============== */
  function initScrollReveal(root = document) {
    const els = $$('.reveal:not(.is-visible)', root);
    if (!('IntersectionObserver' in window)) {
      els.forEach(el => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  }

  /* ============== Smooth scroll ============== */
  function initSmoothScroll() {
    $$('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const href = a.getAttribute('href');
        if (href.length <= 1) return;
        const target = $(href);
        if (!target) return;
        e.preventDefault();
        const top = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }

  function setYear() {
    const y = $('#year');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* ============== Marquee: scroll com inércia (mouse + touch) ==============
     Substitui a animação CSS por um loop de requestAnimationFrame. Permite:
       • auto-scroll constante quando ninguém interage
       • arraste 1:1 com cursor/dedo (cards acompanham em tempo real)
       • inércia ao soltar (cards continuam se movendo e desaceleram suavemente,
         igual ao scroll nativo de celular) antes de voltar ao auto-scroll
     ======================================================================== */
  function initMarqueeScroll(root = document) {
    $$('.marquee', root).forEach(container => {
      const track = $('.marquee-track', container);
      if (!track) return;

      // Desliga o keyframe CSS — o JS passa a controlar a posição
      track.style.animation = 'none';

      // === a11y: respeita prefers-reduced-motion ===
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // === Estado da animação ===
      let position = 0;              // translateX (px). Negativo = rola pra esquerda
      let velocity = 0;              // inércia atual (px/frame @ 60fps)
      let isDragging = false;
      let didDrag = false;
      let pointerId = null;
      let dragStartX = 0;
      let dragStartPosition = 0;
      let lastMoveX = 0;
      let lastMoveT = 0;
      let lastFrameTime = performance.now();
      let rafId = null;

      // Amostras de velocidade (janela curta) pra calcular inércia no release
      const velocitySamples = [];
      const MAX_SAMPLE_AGE_MS = 100;

      // === Tuning ===
      const DRAG_THRESHOLD = 5;            // px antes de virar drag (evita click fantasma)
      const FRICTION = 0.95;                // atrito da inércia por frame @ 60fps
      const MIN_VELOCITY = 0.05;            // abaixo disso, volta pro auto-scroll
      const MAX_VELOCITY = 40;              // limite (px/frame) — evita "fuga" exagerada
      const LOOP_DURATION_S = 40;           // tempo de um ciclo completo do auto-scroll

      // === Helpers ===
      const getHalfWidth = () => track.scrollWidth / 2;
      const getAutoSpeed = () => {
        if (reducedMotion) return 0;
        const hw = getHalfWidth();
        return hw > 0 ? hw / (LOOP_DURATION_S * 60) : 0;
      };
      const applyTransform = () => {
        track.style.transform = `translate3d(${position}px, 0, 0)`;
      };

      // === Loop principal (requestAnimationFrame) ===
      const tick = (now) => {
        const elapsed = now - lastFrameTime;
        // Clamp: se a aba ficou em background, evita fast-forward gigante
        const dt = Math.min(elapsed, 100) / 16.6667;
        lastFrameTime = now;

        if (!isDragging) {
          if (Math.abs(velocity) > MIN_VELOCITY) {
            // Inércia: aplica velocidade com decaimento exponencial (framerate-independent)
            position += velocity * dt;
            velocity *= Math.pow(FRICTION, dt);
          } else {
            // Auto-scroll constante (ou parado se prefers-reduced-motion)
            position -= getAutoSpeed() * dt;
            velocity = 0;
          }
        }

        // Wrap pra loop infinito: mantém position em [-halfWidth, 0)
        const halfWidth = getHalfWidth();
        if (halfWidth > 0) {
          if (position <= -halfWidth) position += halfWidth;
          else if (position > 0) position -= halfWidth;
        }

        applyTransform();
        rafId = requestAnimationFrame(tick);
      };

      // === Handlers de pointer (mouse + touch + pen unificados) ===
      const onPointerDown = (e) => {
        // NÃO bloqueia drag em cards interativos: o track precisa rolar mesmo
        // se o pointer-down caiu num .gallery-item ou .service-card.
        // Também NÃO capturamos o pointer aqui — capturar o pointer rouba o
        // click sintético subsequente em desktop (mouse), fazendo com que o
        // click no card não chegue no listener. Capturamos SÓ se virar drag
        // de verdade, lá no onPointerMove.
        isDragging = true;
        didDrag = false;
        pointerId = e.pointerId;
        dragStartX = e.clientX;
        dragStartPosition = position;
        lastMoveX = e.clientX;
        lastMoveT = performance.now();
        velocitySamples.length = 0;
        velocity = 0; // zera inércia durante o drag
      };

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const dx = e.clientX - dragStartX;

        // Tolerância: abaixo do threshold ainda é "click", não drag
        if (!didDrag && Math.abs(dx) < DRAG_THRESHOLD) return;

        if (!didDrag) {
          didDrag = true;
          track.classList.add('is-dragging');
          velocity = 0;
          // AGORA sim captura o pointer — virou drag de verdade
          try { track.setPointerCapture(pointerId); } catch (_) { /* noop */ }
        }

        // Tracking direto 1:1 com o cursor
        position = dragStartPosition + dx;

        // Acumula amostra de velocidade (px + ms) — descarta amostras > 100ms
        const now = performance.now();
        const sampleDt = now - lastMoveT;
        if (sampleDt > 0) {
          velocitySamples.push({ dx: e.clientX - lastMoveX, dt: sampleDt, t: now });
          while (velocitySamples.length > 1 && now - velocitySamples[0].t > MAX_SAMPLE_AGE_MS) {
            velocitySamples.shift();
          }
        }
        lastMoveX = e.clientX;
        lastMoveT = now;

        e.preventDefault();
      };

      const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        // Libera captura só se ela foi feita (caso tenha virado drag)
        if (didDrag) {
          try { track.releasePointerCapture(pointerId); } catch (_) { /* noop */ }
        }
        pointerId = null;

        if (didDrag) {
          track.classList.remove('is-dragging');

          // Calcula velocidade média das amostras recentes (px/ms → px/frame)
          let totalDx = 0;
          let totalDt = 0;
          for (const s of velocitySamples) {
            totalDx += s.dx;
            totalDt += s.dt;
          }
          if (totalDt > 0) {
            const pxPerMs = totalDx / totalDt;
            let v = pxPerMs * 16.6667; // 60fps
            v = Math.max(-MAX_VELOCITY, Math.min(MAX_VELOCITY, v));
            velocity = v;
          }

          // Marca no DOM por um tick pra que handlers de click de descendentes
          // (ex.: gallery-item abrindo lightbox) possam suprimir o click sintético.
          track.dataset.dragging = '1';
          requestAnimationFrame(() => { delete track.dataset.dragging; });
        }
      };

      track.addEventListener('pointerdown', onPointerDown);
      track.addEventListener('pointermove', onPointerMove);
      track.addEventListener('pointerup', onPointerUp);
      track.addEventListener('pointercancel', onPointerUp);

      // Suprime click sintético depois de drag (não abre lightbox por engano)
      track.addEventListener('click', (e) => {
        if (didDrag) {
          e.preventDefault();
          e.stopPropagation();
          didDrag = false;
        }
      }, true);

      // Inicia o loop
      rafId = requestAnimationFrame(tick);
    });
  }

  /* ============== Init ============== */
  window.addEventListener('site:config-ready', (e) => {
    state.config = e.detail;
    renderSchema();
    renderDifferentials();
    renderGallery();
    renderServices();
    renderHours();
    renderFAQ();
    renderContact();
    // === CMS-patch: novos renderers (todos com fallback inline) ===
    renderHero(state.config);
    renderAbout(state.config);
    renderFooter(state.config);
    renderPageContent(state.config);
    renderSeoMeta(state.config);
    renderLogo(state.config);
    renderWhatsApp(state.config);
    // === Fim CMS-patch ===
    initHeader();
    initSmoothScroll();
    initLightbox();
    initMarqueeScroll();
    setYear();
    initScrollReveal();

    setInterval(updateOpenBadge, 60000);
  });
})();