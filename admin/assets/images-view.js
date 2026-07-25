// images-view.js — módulo "Imagens do site".
// Carrega lista via API, renderiza grid, lida com upload/swap/rename/delete.
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

  // ===============================================================
  // LISTAGEM
  // ===============================================================

  let currentList = [];
  let currentTab = 'site'; // 'site' | 'galeria'
  let searchQuery = '';    // termo de busca atual (lowercase)

  // Imagem "em uso" = tem pelo menos 1 referência real (HTML/JS/config.json).
  // Referências da categoria 'missing' são as quebradas/orfãs do scanner.
  const isInUse = (img) => {
    const real = (img.usage || []).filter(h => h.category !== 'missing');
    return real.length > 0;
  };

  function loadList() {
    return A.api('api/images_list.php')
      .then((data) => {
        currentList = data.images || [];
        render();
      })
      .catch((e) => {
        grid.innerHTML = '<div class="images-grid__empty">Erro ao carregar: ' + A.esc(e.message) + '</div>';
      });
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

  function filterForTab() {
    let list = (currentTab === 'galeria') ? currentList : currentList.filter(isInUse);
    if (searchQuery) {
      const q = searchQuery;
      list = list.filter(img => baseName(img.name).toLowerCase().includes(q));
    }
    return list;
  }

  // Search bar: filtra em tempo real conforme o admin digita
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
    // Usa a versão "full" (sem thumb). Bust de cache via mtime.
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

  function render() {
    const list = filterForTab();
    if (currentList.length === 0) {
      grid.innerHTML = '<div class="images-grid__empty">Nenhuma imagem em <code>assets/images/</code>.</div>';
      return;
    }
    if (list.length === 0) {
      let msg;
      if (searchQuery) {
        msg = 'Nenhuma imagem encontrada para "<strong>' + A.esc(searchQuery) + '</strong>".';
      } else if (currentTab === 'site') {
        msg = 'Nenhuma imagem do site está cadastrada ainda. As que você enviar pela Galeria aparecerão aqui quando forem usadas no site.';
      } else {
        msg = 'Nenhuma imagem na galeria.';
      }
      grid.innerHTML = '<div class="images-grid__empty">' + msg + '</div>';
      return;
    }
    // Permissões por aba:
    //   Site    → Substituir + Renomear (sem Excluir — imagem tá em uso, deletar quebraria o site)
    //   Galeria → Renomear + Excluir    (sem Substituir — é a galeria, não a versão "ativa" do site)
    const perms = currentTab === 'site'
      ? { allowSwap: true,  allowDelete: false }
      : { allowSwap: false, allowDelete: true  };
    grid.innerHTML = '';
    for (const img of list) {
      const card = renderCard(img, perms);
      grid.appendChild(card);
    }
  }

  function renderCard(img, perms) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.name = img.name;

    // Media
    const media = node.querySelector('.image-card__media');
    const imgel = node.querySelector('img');
    imgel.src = img.thumb + '&r=' + img.mtime; // bust cache
    imgel.alt = baseName(img.name);
    imgel.addEventListener('click', () => openLightbox(img));

    // Orphan badge
    const real = (img.usage || []).filter(h => h.category !== 'missing');
    const isOrphan = real.length === 0;
    const orphan = node.querySelector('.image-card__orphan-badge');
    if (isOrphan) orphan.hidden = false;

    // Body
    node.querySelector('.image-card__name').textContent = baseName(img.name);

    // Actions (perms vem do render() conforme a aba ativa)
    const swapBtn   = node.querySelector('[data-action="swap"]');
    const deleteBtn = node.querySelector('[data-action="delete"]');
    if (perms.allowSwap === false) {
      swapBtn.hidden = true;
    } else {
      swapBtn.addEventListener('click', () => onSwap(img));
    }
    if (perms.allowDelete === false) {
      deleteBtn.hidden = true;
    } else {
      deleteBtn.addEventListener('click', () => onDelete(img));
    }
    node.querySelector('[data-action="rename"]').addEventListener('click', () => onRename(img));

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
    // Validação client-side básica
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
      // direto pra swap
      doUpload(file, slot, false);
    } else {
      // Pede nome ao admin; a extensão vem do próprio arquivo (mostrada como chip, sem digitar).
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
          // Junta o nome digitado com a extensão do arquivo original
          const name = base + fileExt;
          await doUpload(file, null, false, name);
        },
      });
    }
  }

  function sanitizeForName(name) {
    // lowercase, troca espaços/acentos, mantém nome base
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

  function onSwap(img) {
    // Modal de Substituir com duas fontes:
    //   1) "Escolher arquivo"  — upload novo (a imagem já aparece na Galeria
    //      automaticamente, porque a Galeria lista tudo em assets/images/).
    //   2) "Escolher da galeria" — pega uma imagem já existente da galeria.
    //      O slot é RENOMEADO pro nome do source (imagem B), a imagem
    //      antiga do slot (imagem A) é preservada na galeria como
    //      "<slot>-old-<timestamp>.<ext>", e as referências em
    //      index.html / data/config.json / js/*.js são atualizadas.
    A.openModal({
      titleHtml: 'Substituir <span class="text-red">' + A.esc(baseName(img.name)) + '</span>',
      body:
        '<p>O arquivo atual será substituído. O backup fica em <code>.bak</code>.</p>' +
        '<div class="swap-source-tabs" role="tablist" aria-label="Origem da imagem">' +
          '<button type="button" class="swap-source-tab is-active" data-source-tab="file" role="tab" aria-selected="true">Escolher arquivo</button>' +
          '<button type="button" class="swap-source-tab" data-source-tab="galeria" role="tab" aria-selected="false">Escolher da galeria</button>' +
        '</div>' +
        // Painel "Escolher arquivo"
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
        '</div>',
      confirmLabel: 'Substituir',
      danger: true,
      onOpen: () => {
        // === Tab switching interno ===
        const tabs = document.querySelectorAll('.swap-source-tab');
        const panes = document.querySelectorAll('.swap-source-pane');
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
        if (grid) renderSwapGaleriaGrid(grid, img);
      },
      onConfirm: async () => {
        const activePane = document.querySelector('.swap-source-pane:not([hidden])');
        if (activePane && activePane.dataset.sourcePane === 'galeria') {
          // Galeria: pega a imagem selecionada no grid e troca com renomeação.
          // O slot vira com o nome do source, a imagem antiga vai pra galeria.
          const sel = document.querySelector('#modal-swap-galeria-grid [data-galeria-name].is-selected');
          if (!sel) throw new Error('Escolha uma imagem da galeria antes de continuar.');
          const sourceName = sel.dataset.galeriaName;
          const data = await A.api('api/images_swap_from_rename.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'slot=' + encodeURIComponent(img.name) + '&source=' + encodeURIComponent(sourceName),
          });
          A.toast('Trocado: slot agora é "' + baseName(data.name) + '". "' + baseName(data.oldName) + '" foi pra galeria como "' + baseName(data.preservedName) + '".', 'success');
          await loadList();
        } else {
          // Arquivo: upload novo
          const inp = document.getElementById('modal-swap-file');
          if (!inp.files || !inp.files[0]) throw new Error('Escolha um arquivo antes de continuar.');
          await doUpload(inp.files[0], img.name, true);
        }
      },
    });
  }

  // Renderiza o grid da galeria dentro do modal de Substituir.
  // Exclui o próprio slot do grid (não faz sentido escolher ele mesmo).
  function renderSwapGaleriaGrid(grid, currentImg) {
    grid.innerHTML = '';
    if (!currentList.length) {
      grid.innerHTML = '<p class="hint">A galeria está vazia.</p>';
      return;
    }
    let rendered = 0;
    for (const candidate of currentList) {
      if (candidate.name === currentImg.name) continue; // pula o próprio slot
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
    const ext = img.name.slice(oldBase.length); // ".png", ".svg", etc.
    A.openModal({
      titleHtml: 'Renomear <span class="text-red">' + A.esc(oldBase) + '</span>',
      body:
        '<label>Novo nome:</label>' +
        '<input type="text" id="modal-newname" value="' + A.esc(oldBase) + '" />',
      confirmLabel: 'Renomear',
      onConfirm: async () => {
        const to = (document.getElementById('modal-newname').value || '').trim();
        if (!to) throw new Error('Informe um nome.');
        // Junta a extensão original (o admin não mexe com extensão)
        const finalName = to + ext;
        const data = await A.api('api/images_rename.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'from=' + encodeURIComponent(img.name) + '&to=' + encodeURIComponent(finalName),
        });
        A.toast('Renomeado para ' + baseName(data.to) + '.', 'success');
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

    // Imagem em uso no site → não dá pra excluir direto. O admin precisa
    // ir na aba "Site", substituir por outra imagem, e só depois voltar
    // aqui pra excluir.
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

    // Imagem sem uso no site → confirmação normal, vai pra lixeira.
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
