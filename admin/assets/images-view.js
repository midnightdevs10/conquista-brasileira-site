// images-view.js — módulo "Imagens do site".
// Carrega lista via API, renderiza grid, lida com upload/swap/rename/delete.
//
// Modelo de dados:
//   - Aba "Galeria": lista TODAS as imagens em assets/images/ (currentList, vinda
//     de images_list.php). Cada card = 1 imagem única.
//   - Aba "Site": lista os 18 SLOTS do site (derivados de data/config.json via
//     buildSlotSectionMap). Cada card = 1 slot. A mesma imagem pode aparecer
//     em vários cards (repetições permitidas pelo usuário).
(function () {
  'use strict';

  const A = window.Admin;
  const grid      = document.getElementById('images-grid');
  const dropzone  = document.getElementById('dropzone');
  const dzInput   = document.getElementById('dropzone-input');
  const dzBrowse  = document.getElementById('dropzone-browse');
  const dzProg    = document.getElementById('dropzone-progress');
  const dzProgFill= document.getElementById('dropzone-progress-fill');
  const dzProgTxt = document.getElementById('dropzone-progress-text');
  const tpl       = document.getElementById('tpl-image-card');
  const lightbox  = document.getElementById('lightbox');
  const lbImg     = document.getElementById('lightbox-img');
  const lbLoading = document.getElementById('lightbox-loading');
  const tabsEl    = document.getElementById('images-tabs');
  const searchInput = document.getElementById('images-search-input');
  const searchClear = document.getElementById('images-search-clear');

  if (!grid || !dropzone || !tpl) {
    return; // não é a página de imagens
  }

  // Pega só o nome base, sem extensão. O admin não precisa ver nem lidar com extensão.
  const baseName = (fullName) => {
    const s = String(fullName || '');
    const i = s.lastIndexOf('.');
    return i > 0 ? s.slice(0, i) : s;
  };
  const getExt = (fullName) => {
    const s = String(fullName || '');
    const i = s.lastIndexOf('.');
    return i > 0 ? s.slice(i) : '';
  };

  // ===============================================================
  // ESTADO
  // ===============================================================

  let currentList = [];           // imagens em disco (aba Galeria)
  let slotMap = { slots: [], byFile: {} }; // 18 slots derivados do config (aba Site)
  let currentConfig = null;
  let currentTab = 'site';        // 'site' | 'galeria'
  let searchQuery = '';           // termo de busca (lowercase)

  // Imagem "em uso" = tem pelo menos 1 referência real (HTML/JS/config.json).
  // Referências da categoria 'missing' são as quebradas/orfãs do scanner.
  const isInUse = (img) => {
    const real = (img.usage || []).filter(h => h.category !== 'missing');
    return real.length > 0;
  };

  // ===============================================================
  // CONFIG MAP — deriva os 18 slots do config.json
  // ===============================================================

  // Ordem canônica das seções (e como aparecem na nav-bar do site público)
  const SECTION_ORDER = ['Logo', 'Início', 'Quem somos', 'Nosso espaço', 'Serviços'];

  // Varre o config e devolve { slots: [{section, key, file}], byFile: { file: [{section, key}] } }
  // Cada entrada em "slots" é um SLOT (uma posição no site), não uma imagem.
  // A mesma imagem pode aparecer em N slots.
  function buildSlotSectionMap(cfg) {
    const slots = [];
    const byFile = {};

    const addSlot = (section, key, file) => {
      if (!file) return;
      // Extrai só o basename (caso venha com /assets/images/...)
      const base = String(file).split('/').pop();
      if (!base) return;
      slots.push({ section, key, file: base });
      if (!byFile[base]) byFile[base] = [];
      byFile[base].push({ section, key });
    };

    if (cfg && typeof cfg === 'object') {
      // 1) Logo (company.logo — 1 slot)
      if (cfg.company && cfg.company.logo) {
        addSlot('Logo', 'company.logo', cfg.company.logo);
      }
      // 2) Início (hero.image — 1 slot)
      if (cfg.hero && cfg.hero.image) {
        addSlot('Início', 'hero.image', cfg.hero.image);
      }
      // 3) Quem somos (about.images.main.src + sub.src — 2 slots)
      if (cfg.about && cfg.about.images) {
        if (cfg.about.images.main && cfg.about.images.main.src) {
          addSlot('Quem somos', 'about.images.main.src', cfg.about.images.main.src);
        }
        if (cfg.about.images.sub && cfg.about.images.sub.src) {
          addSlot('Quem somos', 'about.images.sub.src', cfg.about.images.sub.src);
        }
      }
      // 4) Nosso espaço (gallery[].src — 6 slots)
      if (Array.isArray(cfg.gallery)) {
        cfg.gallery.forEach((g, i) => {
          if (g && g.src) addSlot('Nosso espaço', 'gallery[' + i + '].src', g.src);
        });
      }
      // 5) Serviços (services[].image — 8 slots)
      if (Array.isArray(cfg.services)) {
        cfg.services.forEach((s, i) => {
          if (s && s.image) addSlot('Serviços', 'services[' + i + '].image', s.image);
        });
      }
    }

    return { slots, byFile };
  }

  // ===============================================================
  // LISTAGEM
  // ===============================================================

  function loadList() {
    return Promise.all([
      A.api('api/images_list.php').catch(() => ({ images: [] })),
      A.api('api/config_get.php').catch(() => ({ config: null })),
    ]).then(([listData, cfgData]) => {
      currentList = (listData && listData.images) || [];
      currentConfig = (cfgData && cfgData.config) || null;
      slotMap = buildSlotSectionMap(currentConfig);
      render();
    }).catch((e) => {
      grid.innerHTML = '<div class="images-grid__empty">Erro ao carregar: ' + A.esc(e.message) + '</div>';
    });
  }

  // Recarrega só o config (chamado após rename/swap pra refletir o estado novo)
  function reloadConfig() {
    return A.api('api/config_get.php').then((cfgData) => {
      currentConfig = (cfgData && cfgData.config) || null;
      slotMap = buildSlotSectionMap(currentConfig);
    }).catch(() => {});
  }

  // ===============================================================
  // ABAS (Site / Galeria)
  // ===============================================================

  if (tabsEl) {
    tabsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.images-tabs__tab');
      if (!btn) return;
      const tab = btn.dataset.tab;
      if (tab && tab !== currentTab) setTab(tab);
    });
  }

  function setTab(tab) {
    currentTab = tab;
    if (tabsEl) {
      for (const btn of tabsEl.querySelectorAll('.images-tabs__tab')) {
        const isActive = btn.dataset.tab === tab;
        btn.classList.toggle('is-active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
      }
    }
    render();
  }

  // ===============================================================
  // SEARCH
  // ===============================================================

  if (searchInput) {
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      if (searchClear) searchClear.hidden = !searchQuery;
      render();
    });
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && searchInput.value) {
        e.stopPropagation();
        searchInput.value = '';
        searchQuery = '';
        if (searchClear) searchClear.hidden = true;
        render();
      }
    });
  }
  if (searchClear) {
    searchClear.addEventListener('click', () => {
      if (!searchInput) return;
      searchInput.value = '';
      searchQuery = '';
      searchClear.hidden = true;
      searchInput.focus();
      render();
    });
  }

  // ===============================================================
  // LIGHTBOX
  // ===============================================================

  let lightboxLastFocus = null;

  function openLightbox(img) {
    if (!lightbox || !lbImg) return;
    const fullSrc = (img.full || img.thumb) + '&r=' + img.mtime;

    lbImg.alt = baseName(img.name);
    lbImg.src = fullSrc;
    if (lbLoading) lbLoading.hidden = false;

    lightboxLastFocus = document.activeElement;
    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    const closeBtn = lightbox.querySelector('.lightbox__close');
    if (closeBtn) closeBtn.focus();
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lbImg.src = '';
    lbImg.alt = '';
    document.body.style.overflow = '';
    if (lightboxLastFocus && typeof lightboxLastFocus.focus === 'function') {
      lightboxLastFocus.focus();
    }
  }

  if (lightbox) {
    if (lbImg) {
      lbImg.addEventListener('load', () => {
        if (lbLoading) lbLoading.hidden = true;
      });
      lbImg.addEventListener('error', () => {
        if (lbLoading) lbLoading.hidden = true;
      });
    }
    lightbox.addEventListener('click', (e) => {
      if (e.target.matches('[data-lightbox-close]')) closeLightbox();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
    });
  }

  // ===============================================================
  // RENDER
  // ===============================================================

  // Encontra a imagem em currentList pelo nome do arquivo (pra aba Site)
  function findImageByName(name) {
    return currentList.find(x => x.name === name) || null;
  }

  function render() {
    grid.innerHTML = '';
    if (currentTab === 'site') {
      renderSiteTab();
    } else {
      renderGaleriaTab();
    }
  }

  // === ABA SITE: 18 slots agrupados por seção (com repetições) ===
  function renderSiteTab() {
    grid.classList.add('images-grid--grouped');

    // Filtra slots por busca
    let slots = slotMap.slots.slice();
    if (searchQuery) {
      const q = searchQuery;
      slots = slots.filter(s => s.file.toLowerCase().includes(q) || s.section.toLowerCase().includes(q));
    }

    if (slotMap.slots.length === 0) {
      grid.innerHTML = '<div class="images-grid__empty">Nenhum slot do site encontrado. Verifique se <code>data/config.json</code> existe e tem as chaves esperadas.</div>';
      return;
    }
    if (slots.length === 0) {
      grid.innerHTML = '<div class="images-grid__empty">Nenhum slot encontrado para "<strong>' + A.esc(searchQuery) + '</strong>".</div>';
      return;
    }

    // Agrupa por seção na ordem canônica
    const groups = new Map();
    SECTION_ORDER.forEach(s => groups.set(s, []));
    for (const slot of slots) {
      if (!groups.has(slot.section)) groups.set(slot.section, []);
      groups.get(slot.section).push(slot);
    }

    // Permissões da aba Site: Swap + Rename, sem Delete
    const perms = { allowSwap: true, allowDelete: false };

    for (const section of SECTION_ORDER) {
      const groupSlots = groups.get(section);
      if (!groupSlots || groupSlots.length === 0) continue;

      const groupEl = document.createElement('section');
      groupEl.className = 'images-group';

      const titleEl = document.createElement('h3');
      titleEl.className = 'images-group__title';
      const titleText = document.createElement('span');
      titleText.textContent = section;
      const countEl = document.createElement('span');
      countEl.className = 'images-group__count';
      countEl.textContent = groupSlots.length + (groupSlots.length === 1 ? ' imagem' : ' imagens');
      titleEl.appendChild(titleText);
      titleEl.appendChild(countEl);
      groupEl.appendChild(titleEl);

      const gridEl = document.createElement('div');
      gridEl.className = 'images-group__grid';
      for (const slot of groupSlots) {
        // Cada slot renderiza um card. O card aponta pro arquivo em disco.
        const img = findImageByName(slot.file);
        if (img) {
          // Marca o card com a chave do slot pra sabermos qual slot está sendo editado
          const card = renderCard(img, perms, { section: slot.section, key: slot.key });
          card.dataset.slotKey = slot.key;
          gridEl.appendChild(card);
        } else {
          // Slot referencia arquivo que não está em disco (quebrado/ausente)
          const brokenCard = renderBrokenSlot(slot, perms);
          gridEl.appendChild(brokenCard);
        }
      }
      groupEl.appendChild(gridEl);
      grid.appendChild(groupEl);
    }
  }

  // Card pra um slot que referencia arquivo ausente (ex: copa.svg)
  function renderBrokenSlot(slot, perms) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.name = slot.file;
    node.dataset.broken = '1';
    const imgel = node.querySelector('img');
    imgel.alt = baseName(slot.file);
    imgel.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="#f3eee5"/><text x="100" y="65" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#9a8e7a">arquivo ausente</text></svg>'
    );
    node.querySelector('.image-card__name').textContent = baseName(slot.file);

    // Section badge
    const sectionBadge = node.querySelector('.image-card__section-badge');
    if (sectionBadge) {
      sectionBadge.textContent = slot.section;
      sectionBadge.hidden = false;
    }

    // Action: só permite Swap (pra substituir o arquivo ausente)
    const swapBtn = node.querySelector('[data-action="swap"]');
    const renameBtn = node.querySelector('[data-action="rename"]');
    const deleteBtn = node.querySelector('[data-action="delete"]');
    if (renameBtn) renameBtn.hidden = true; // não dá pra renomear o que não existe
    if (deleteBtn) deleteBtn.hidden = true;
    if (swapBtn) {
      // Cria um objeto img fake pra satisfazer onSwap/onRename
      const fakeImg = { name: slot.file, usage: [], mtime: 0, thumb: imgel.src, full: imgel.src };
      swapBtn.addEventListener('click', () => onSwap(fakeImg));
    }

    return node;
  }

  // === ABA GALERIA: lista única flat ===
  function renderGaleriaTab() {
    grid.classList.remove('images-grid--grouped');

    let list = currentList.slice();
    if (searchQuery) {
      const q = searchQuery;
      list = list.filter(img => baseName(img.name).toLowerCase().includes(q));
    }

    if (currentList.length === 0) {
      grid.innerHTML = '<div class="images-grid__empty">Nenhuma imagem em <code>assets/images/</code>.</div>';
      return;
    }
    if (list.length === 0) {
      grid.innerHTML = '<div class="images-grid__empty">Nenhuma imagem encontrada para "<strong>' + A.esc(searchQuery) + '</strong>".</div>';
      return;
    }

    // Galeria: Rename + Delete condicional, sem Swap
    const perms = { allowSwap: false, allowDelete: true };
    for (const img of list) {
      grid.appendChild(renderCard(img, perms, null));
    }
  }

  function renderCard(img, perms, sectionInfo) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.name = img.name;

    // Media
    const imgel = node.querySelector('img');
    imgel.src = img.thumb + '&r=' + img.mtime; // bust cache
    imgel.alt = baseName(img.name);
    imgel.addEventListener('click', () => openLightbox(img));

    // Orphan badge: aparece na aba Galeria quando a imagem NÃO está em uso
    if (currentTab === 'galeria') {
      const real = (img.usage || []).filter(h => h.category !== 'missing');
      if (real.length === 0) {
        const orphan = node.querySelector('.image-card__orphan-badge');
        if (orphan) orphan.hidden = false;
      }
    }

    // Body
    node.querySelector('.image-card__name').textContent = baseName(img.name);

    // Meta (section + usage)
    if (sectionInfo && sectionInfo.section) {
      const sectionBadge = node.querySelector('.image-card__section-badge');
      if (sectionBadge) {
        sectionBadge.textContent = sectionInfo.section;
        sectionBadge.hidden = false;
      }
    }
    const realRefs = (img.usage || []).filter(h => h.category !== 'missing');
    if (realRefs.length > 0) {
      const usageEl = node.querySelector('.image-card__usage-count');
      if (usageEl) {
        usageEl.textContent = 'Em uso em ' + realRefs.length + (realRefs.length === 1 ? ' lugar' : ' lugares');
        usageEl.hidden = false;
      }
    }

    // Actions
    const swapBtn   = node.querySelector('[data-action="swap"]');
    const deleteBtn = node.querySelector('[data-action="delete"]');
    const renameBtn = node.querySelector('[data-action="rename"]');

    if (perms.allowSwap === false) {
      swapBtn.hidden = true;
    } else {
      swapBtn.addEventListener('click', () => onSwap(img, sectionInfo));
    }
    if (perms.allowDelete === false) {
      deleteBtn.hidden = true;
    } else {
      deleteBtn.addEventListener('click', () => onDelete(img));
    }
    renameBtn.addEventListener('click', () => onRename(img));

    return node;
  }

  // ===============================================================
  // UPLOAD NOVO
  // ===============================================================

  dropzone.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    dzInput.click();
  });
  dzBrowse.addEventListener('click', (e) => { e.stopPropagation(); dzInput.click(); });
  dzInput.addEventListener('change', () => {
    if (dzInput.files && dzInput.files[0]) handleUpload(dzInput.files[0], null);
  });
  ['dragenter', 'dragover'].forEach(ev => dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); dropzone.classList.add('is-dragover');
  }));
  ['dragleave', 'drop'].forEach(ev => dropzone.addEventListener(ev, (e) => {
    e.preventDefault(); dropzone.classList.remove('is-dragover');
  }));
  dropzone.addEventListener('drop', (e) => {
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleUpload(f, null);
  });

  function setProgress(visible, pct, txt) {
    if (!visible) { dzProg.hidden = true; dropzone.classList.remove('is-uploading'); return; }
    dzProg.hidden = false;
    dropzone.classList.add('is-uploading');
    dzProgFill.style.width = Math.min(100, Math.max(0, pct)) + '%';
    if (txt) dzProgTxt.textContent = txt;
  }

  function handleUpload(file, slot /* or null for new */) {
    const allowed = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
    if (!allowed.includes(file.type)) {
      A.toast('Tipo de arquivo não permitido.', 'error');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      A.toast('Arquivo excede 8 MB.', 'error');
      return;
    }
    if (slot) {
      doUpload(file, slot, false);
    } else {
      const fileBase = baseName(sanitizeForName(file.name));
      const fileExt  = (file.name.match(/\.[a-z0-9]+$/i) || [''])[0].toLowerCase();
      A.openModal({
        title: 'Salvar nova imagem',
        body:
          '<p>Escolha um nome para a imagem. A extensão é detectada automaticamente.</p>' +
          '<label>Nome da imagem:</label>' +
          '<div class="name-with-ext">' +
            '<input type="text" id="modal-name" value="' + A.esc(fileBase) + '" />' +
            '<span class="name-with-ext__ext" id="modal-name-ext">' + A.esc(fileExt) + '</span>' +
          '</div>' +
          '<p class="hint">Se já existir uma imagem com esse nome, você poderá substituí-la na próxima etapa.</p>',
        confirmLabel: 'Enviar',
        onConfirm: async () => {
          const base = (document.getElementById('modal-name').value || '').trim();
          if (!base) throw new Error('Informe um nome.');
          if (!/^[a-z0-9._\-]+$/i.test(base)) {
            throw new Error('Use apenas letras, números, . _ - no nome.');
          }
          const name = base + fileExt;
          await doUpload(file, null, false, name);
        },
      });
    }
  }

  function sanitizeForName(name) {
    let n = name.toLowerCase();
    n = n.replace(/[^a-z0-9._\-]/g, '-');
    n = n.replace(/-+/g, '-').replace(/^-|-$/g, '');
    return n;
  }

  function doUpload(file, slot, asSwap, customName) {
    const fd = new FormData();
    fd.append('file', file);
    if (slot) fd.append('slot', slot);
    if (customName) fd.append('name', customName);

    setProgress(true, 0, slot ? 'Substituindo…' : 'Enviando…');
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', 'api/' + (asSwap ? 'images_swap.php' : (slot ? 'images_swap.php' : 'images_upload.php')));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setProgress(true, (e.loaded / e.total) * 100, 'Enviando… ' + Math.round((e.loaded / e.total) * 100) + '%');
        }
      };
      xhr.onload = () => {
        setProgress(false);
        let data = null;
        try { data = JSON.parse(xhr.responseText); } catch (_) {}
        if (xhr.status >= 200 && xhr.status < 300 && data && data.ok) {
          A.toast(slot ? 'Imagem substituída.' : 'Imagem enviada.', 'success');
          loadList().then(resolve);
        } else if (data && data.code === 'collision') {
          A.openModal({
            title: 'Arquivo já existe',
            body:
              '<p>Já existe <code>' + A.esc(data.existing) + '</code> em <code>assets/images/</code>.</p>' +
              '<p>Quer substituí-lo? O arquivo atual será movido para <code>.bak</code>.</p>',
            confirmLabel: 'Substituir existente',
            danger: true,
            onConfirm: async () => {
              await doUpload(file, data.existing, true);
            },
          });
        } else {
          A.toast((data && data.message) || ('Erro HTTP ' + xhr.status), 'error');
          reject(new Error((data && data.message) || 'erro'));
        }
      };
      xhr.onerror = () => {
        setProgress(false);
        A.toast('Erro de rede.', 'error');
        reject(new Error('network'));
      };
      xhr.send(fd);
    });
  }

  // ===============================================================
  // SWAP (botão "Substituir" no card)
  // ===============================================================

  function onSwap(img, sectionInfo) {
    const slotExt = getExt(img.name);
    A.openModal({
      titleHtml: 'Substituir <span class="text-red">' + A.esc(baseName(img.name)) + '</span>',
      body:
        '<p>O arquivo atual será substituído. A versão antiga volta pra galeria com o mesmo nome original.</p>' +
        '<div class="swap-source-tabs" role="tablist" aria-label="Origem da imagem">' +
          '<button type="button" class="swap-source-tab is-active" data-source-tab="file" role="tab" aria-selected="true">Enviar arquivo novo</button>' +
          '<button type="button" class="swap-source-tab" data-source-tab="galeria" role="tab" aria-selected="false">Escolher da galeria</button>' +
        '</div>' +
        // Painel "Enviar arquivo novo"
        '<div class="swap-source-pane" data-source-pane="file">' +
          '<div class="file-picker">' +
            '<label class="file-picker__btn" for="modal-swap-file">' +
              '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>' +
              '</svg>' +
              'Escolher arquivo' +
            '</label>' +
            '<input type="file" id="modal-swap-file" accept="image/png,image/jpeg,image/svg+xml,image/webp" />' +
            '<span class="file-picker__name" id="modal-swap-name">Nenhum arquivo escolhido</span>' +
          '</div>' +
        '</div>' +
        // Painel "Escolher da galeria" — grid populado por JS
        '<div class="swap-source-pane" data-source-pane="galeria" hidden>' +
          '<div class="swap-galeria-grid" id="modal-swap-galeria-grid" role="listbox" aria-label="Imagens da galeria"></div>' +
        '</div>' +
        // Campo de nome final — aparece só quando aba galeria está ativa
        '<div class="swap-name-field" id="swap-name-field" hidden style="margin-top:16px;">' +
          '<label>Nome final da imagem no site:</label>' +
          '<div class="name-with-ext">' +
            '<input type="text" id="modal-swap-finalname" value="" />' +
            '<span class="name-with-ext__ext" id="modal-swap-finalname-ext">' + A.esc(slotExt) + '</span>' +
          '</div>' +
          '<p class="hint">Padrão: o nome da imagem escolhida. Pode editar pra dar outro nome (mesma extensão <code>' + A.esc(slotExt) + '</code>).</p>' +
        '</div>',
      confirmLabel: 'Substituir',
      danger: true,
      onOpen: () => {
        // === Tab switching interno ===
        const tabs = document.querySelectorAll('.swap-source-tab');
        const panes = document.querySelectorAll('.swap-source-pane');
        const nameField = document.getElementById('swap-name-field');

        const updateNameField = () => {
          if (!nameField) return;
          const galeriaActive = document.querySelector('.swap-source-pane:not([hidden])').dataset.sourcePane === 'galeria';
          nameField.hidden = !galeriaActive;
          if (galeriaActive) {
            const sel = document.querySelector('#modal-swap-galeria-grid [data-galeria-name].is-selected');
            const input = document.getElementById('modal-swap-finalname');
            if (sel && input && !input.dataset.userEdited) {
              input.value = baseName(sel.dataset.galeriaName);
            }
          }
        };

        tabs.forEach(tab => {
          tab.addEventListener('click', () => {
            const which = tab.dataset.sourceTab;
            tabs.forEach(t => {
              const on = t === tab;
              t.classList.toggle('is-active', on);
              t.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            panes.forEach(p => {
              p.hidden = p.dataset.sourcePane !== which;
            });
            updateNameField();
          });
        });

        // === File picker ===
        const inp = document.getElementById('modal-swap-file');
        const out = document.getElementById('modal-swap-name');
        if (inp && out) {
          inp.addEventListener('change', () => {
            const f = inp.files && inp.files[0];
            if (f) {
              out.textContent = f.name;
              out.classList.add('has-file');
            } else {
              out.textContent = 'Nenhum arquivo escolhido';
              out.classList.remove('has-file');
            }
          });
        }

        // === Galeria grid ===
        const grid = document.getElementById('modal-swap-galeria-grid');
        if (grid) renderSwapGaleriaGrid(grid, img, updateNameField);

        // === Marca "editado pelo usuário" no nome final ===
        const finalNameInput = document.getElementById('modal-swap-finalname');
        if (finalNameInput) {
          finalNameInput.addEventListener('input', () => {
            finalNameInput.dataset.userEdited = '1';
          });
        }
      },
      onConfirm: async () => {
        const activePane = document.querySelector('.swap-source-pane:not([hidden])');
        if (activePane && activePane.dataset.sourcePane === 'galeria') {
          const sel = document.querySelector('#modal-swap-galeria-grid [data-galeria-name].is-selected');
          if (!sel) throw new Error('Escolha uma imagem da galeria antes de continuar.');
          const sourceName = sel.dataset.galeriaName;
          const finalBase = (document.getElementById('modal-swap-finalname').value || '').trim();
          if (!finalBase) throw new Error('Informe o nome final da imagem.');
          if (!/^[a-z0-9._\-]+$/i.test(finalBase)) {
            throw new Error('Use apenas letras, números, . _ - no nome.');
          }
          const finalName = finalBase + slotExt;
          const data = await A.api('api/images_swap_from_rename.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'slot=' + encodeURIComponent(img.name) +
                  '&source=' + encodeURIComponent(sourceName) +
                  '&name=' + encodeURIComponent(finalName),
          });
          const updatedTxt = (data.updatedFiles || []).length
            ? ' Refs atualizadas em: ' + data.updatedFiles.join(', ') + '.'
            : '';
          A.toast('Trocado: slot agora é "' + baseName(data.name) + '". "' + baseName(data.oldName) + '" foi pra galeria como "' + baseName(data.preservedName) + '".' + updatedTxt, 'success');
          await loadList();
        } else {
          const inp = document.getElementById('modal-swap-file');
          if (!inp.files || !inp.files[0]) throw new Error('Escolha um arquivo antes de continuar.');
          await doUpload(inp.files[0], img.name, true);
        }
      },
    });
  }

  // Renderiza o grid da galeria dentro do modal de Substituir.
  // Exclui o próprio slot do grid (não faz sentido escolher ele mesmo).
  function renderSwapGaleriaGrid(grid, currentImg, onSelect) {
    grid.innerHTML = '';
    if (!currentList.length) {
      grid.innerHTML = '<p class="hint">A galeria está vazia.</p>';
      return;
    }
    let rendered = 0;
    for (const candidate of currentList) {
      if (candidate.name === currentImg.name) continue;
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'swap-galeria-cell';
      cell.dataset.galeriaName = candidate.name;
      cell.setAttribute('role', 'option');
      cell.setAttribute('aria-selected', 'false');
      cell.innerHTML =
        '<img alt="" />' +
        '<span class="swap-galeria-cell__name"></span>';
      const imgel = cell.querySelector('img');
      imgel.src = candidate.thumb + '&r=' + candidate.mtime;
      imgel.alt = baseName(candidate.name);
      cell.querySelector('.swap-galeria-cell__name').textContent = baseName(candidate.name);
      cell.addEventListener('click', () => {
        grid.querySelectorAll('.is-selected').forEach(el => {
          el.classList.remove('is-selected');
          el.setAttribute('aria-selected', 'false');
        });
        cell.classList.add('is-selected');
        cell.setAttribute('aria-selected', 'true');
        if (typeof onSelect === 'function') onSelect();
      });
      grid.appendChild(cell);
      rendered++;
    }
    if (rendered === 0) {
      grid.innerHTML = '<p class="hint">Nenhuma outra imagem disponível na galeria.</p>';
    }
  }

  // ===============================================================
  // RENAME
  // ===============================================================

  function onRename(img) {
    const oldBase = baseName(img.name);
    const ext = img.name.slice(oldBase.length);
    A.openModal({
      titleHtml: 'Renomear <span class="text-red">' + A.esc(oldBase) + '</span>',
      body:
        '<label>Novo nome:</label>' +
        '<div class="name-with-ext">' +
          '<input type="text" id="modal-newname" value="' + A.esc(oldBase) + '" />' +
          '<span class="name-with-ext__ext">' + A.esc(ext) + '</span>' +
        '</div>' +
        '<p class="hint">A extensão é mantida. As referências ao nome antigo em <code>index.html</code>, <code>data/config.json</code> e <code>js/*.js</code> são atualizadas automaticamente.</p>',
      confirmLabel: 'Renomear',
      onConfirm: async () => {
        const to = (document.getElementById('modal-newname').value || '').trim();
        if (!to) throw new Error('Informe um nome.');
        if (!/^[a-z0-9._\-]+$/i.test(to)) {
          throw new Error('Use apenas letras, números, . _ - no nome.');
        }
        const finalName = to + ext;
        const data = await A.api('api/images_rename.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'from=' + encodeURIComponent(img.name) + '&to=' + encodeURIComponent(finalName),
        });
        const updatedTxt = (data.updatedFiles && data.updatedFiles.length)
          ? ' Refs atualizadas em: ' + data.updatedFiles.join(', ') + '.'
          : '';
        A.toast('Renomeado para ' + baseName(data.to) + '.' + updatedTxt, 'success');
        await loadList();
      },
    });
  }

  // ===============================================================
  // DELETE
  // ===============================================================

  function onDelete(img) {
    const inUse = isInUse(img);
    const realCount = (img.usage || []).filter(h => h.category !== 'missing').length;

    if (inUse) {
      A.openModal({
        title: 'Não dá pra apagar ainda',
        body:
          '<p>A imagem <strong>' + A.esc(baseName(img.name)) + '</strong> ainda está sendo usada em <strong>' + realCount + '</strong> lugar(es) do site.</p>' +
          '<p>Se apagá-la agora, esses lugares vão ficar sem imagem. Pra excluí-la com segurança:</p>' +
          '<ol style="padding-left:20px; margin:8px 0 0;">' +
            '<li>Vá na aba <strong>Site</strong> (ela aparece lá porque está em uso);</li>' +
            '<li>Clique em <strong>Substituir</strong> e escolha outra imagem pra ocupar o lugar;</li>' +
            '<li>Volte aqui na aba <strong>Galeria</strong> e exclua esta versão.</li>' +
          '</ol>',
        confirmLabel: 'Entendi',
        onConfirm: () => A.closeModal(),
      });
      return;
    }

    A.openModal({
      title: 'Apagar ' + baseName(img.name),
      body:
        '<p>Tem certeza que quer apagar <strong>' + A.esc(baseName(img.name)) + '</strong>?</p>' +
        '<p class="hint">A imagem não está sendo usada em lugar nenhum do site. Ela será movida para a lixeira e pode ser restaurada depois se precisar.</p>',
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: async () => {
        await A.api('api/images_delete.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'name=' + encodeURIComponent(img.name),
        });
        A.toast('Movido para a lixeira.', 'success');
        await loadList();
      },
    });
  }

  // ===============================================================
  // START
  // ===============================================================

  loadList();
})();
