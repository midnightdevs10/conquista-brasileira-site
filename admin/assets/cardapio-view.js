/* ================================================================
   cardapio-view.js — view do módulo "Cardápio" do admin.

   Features:
   - Carrega menu + cardapioSections via GET.
   - Renderiza 3 níveis (grupo / subgrupo / item) como cards editáveis.
   - Inputs editáveis para name/description/tag em todos os níveis.
   - Auto-slug (id) a partir do name, editável.
   - Modal "Editar itens inclusos" para combos (tag === 'combo').
   - Add / Delete com modal de confirmação (cascata conta itens).
   - Reorder via HTML5 drag-and-drop.
   - Validação client-side: regex de slug, max-length, .is-invalid.
   - Save: POST único via Admin.api. Sucesso → toast verde + emitConfigReload.
   - Cross-tab reload: BroadcastChannel + localStorage (mesmo padrão de
     contact-view.js e hours-view.js).
   ================================================================ */

(function () {
  'use strict';

  const root = document.getElementById('cardapio-tree');
  if (!root) return;

  const saveBtn = document.getElementById('cardapio-save-btn');

  // === State ===
  const state = {
    menu:     { groups: [] },
    sections: [],
    dirty:    false,
  };

  // === Helpers ===
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function slugify(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50);
  }

  function slugRegex() { return /^[a-z0-9][a-z0-9-]{0,49}$/; }

  function markDirty() {
    state.dirty = true;
    if (saveBtn) saveBtn.classList.add('is-dirty');
  }
  function markClean() {
    state.dirty = false;
    if (saveBtn) saveBtn.classList.remove('is-dirty');
  }

  // === Cross-tab reload ===
  const channel = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('conquista-brasileira') : null;
  function emitConfigReload() {
    if (channel) channel.postMessage({ type: 'site:config-reload-request' });
    try { localStorage.setItem('cb:config-reload', String(Date.now())); } catch (_) {}
  }

  // === Mutation helpers (operam em state.menu.groups) ===
  function findGroup(gid)   { return state.menu.groups.findIndex(g => g.id === gid); }
  function findSubgroup(gi, sgid) { const g = state.menu.groups[gi]; return g ? g.subgroups.findIndex(s => s.id === sgid) : -1; }

  function moveInArray(arr, fromIdx, toIdx) {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= arr.length || toIdx >= arr.length) return;
    const [item] = arr.splice(fromIdx, 1);
    arr.splice(toIdx, 0, item);
  }

  function countItemsInGroup(g) {
    return g.subgroups.reduce((sum, sg) => sum + sg.items.length, 0);
  }
  function countItemsInSubgroup(sg) { return sg.items.length; }

  // === Render ===

  function renderItem(it, gi, si, ii) {
    const isCombo = it.tag === 'combo';
    const tagClass = isCombo ? 'cardapio-item__tag cardapio-item__tag--combo' : 'cardapio-item__tag';
    return `
      <li class="cardapio-item" data-g="${gi}" data-s="${si}" data-i="${ii}">
        <div class="cardapio-item__row">
          <input class="field__input cardapio-item__name-input" data-field="name"  type="text" maxlength="120" placeholder="Nome do item" value="${esc(it.name)}" aria-label="Nome do item">
          <select class="field__input cardapio-item__tag" data-field="tag" aria-label="Tag">
            <option value=""          ${!it.tag ? 'selected' : ''}>— Sem tag —</option>
            <option value="combo"     ${it.tag === 'combo' ? 'selected' : ''}>Combo</option>
            <option value="Mais pedidos" ${it.tag === 'Mais pedidos' ? 'selected' : ''}>Mais pedidos</option>
            <option value="Completo"  ${it.tag === 'Completo' ? 'selected' : ''}>Completo</option>
          </select>
          <span class="cardapio-item__tag-display ${isCombo ? 'cardapio-item__tag--combo' : ''}" data-tag-display>${isCombo ? 'combo' : (it.tag ? esc(it.tag) : 'Sem tag')}</span>
          <input class="field__input cardapio-item__desc" data-field="description" type="text" maxlength="300" placeholder="Descrição (opcional)" value="${esc(it.description)}" aria-label="Descrição">
          <button type="button" class="btn btn--ghost cardapio-item__includes-btn" data-action="edit-includes" ${isCombo ? '' : 'hidden'}>Editar inclusos</button>
          <button type="button" class="btn btn--danger cardapio-item__del"  data-action="delete">Excluir</button>
        </div>
        ${Array.isArray(it.includes) && it.includes.length ? `
          <ul class="cardapio-item__includes">
            ${it.includes.map(line => `<li>— ${esc(line)}</li>`).join('')}
          </ul>` : ''}
      </li>
    `;
  }

  function renderSubgroup(sg, gi, si) {
    const items = sg.items.map((it, ii) => renderItem(it, gi, si, ii)).join('');
    const n = sg.items.length;
    return `
      <li class="cardapio-subgroup" data-g="${gi}" data-s="${si}">
        <details class="cardapio-subgroup__details" data-cardapio-collapsible>
          <summary class="cardapio-subgroup__summary">
            <span class="cardapio-handle" draggable="true" aria-label="Reordenar subgrupo">⋮⋮</span>
            <span class="cardapio-subgroup__title">${esc(sg.name || '(sem nome)')}</span>
            <span class="cardapio-subgroup__count">${n} ${n === 1 ? 'item' : 'itens'}</span>
            <span class="cardapio-subgroup__chevron" aria-hidden="true">▸</span>
          </summary>
          <div class="cardapio-subgroup__body">
            <div class="cardapio-subgroup__row">
              <input class="field__input cardapio-subgroup__name-input" data-field="name" type="text" maxlength="100" placeholder="Nome do subgrupo" value="${esc(sg.name)}" aria-label="Nome do subgrupo">
              <button type="button" class="btn btn--ghost" data-action="add-item">+ Item</button>
              <button type="button" class="btn btn--danger" data-action="delete">Excluir subgrupo</button>
            </div>
            <ul class="cardapio-item-list">${items || '<li class="cardapio-empty">Vazio. Clique em "+ Item" para adicionar.</li>'}</ul>
          </div>
        </details>
      </li>
    `;
  }

  function renderGroup(g, gi) {
    const subgroups = g.subgroups.map((sg, si) => renderSubgroup(sg, gi, si)).join('');
    const ns = g.subgroups.length;
    const ni = countItemsInGroup(g);
    return `
      <li class="cardapio-group" data-g="${gi}">
        <details class="cardapio-group__details" data-cardapio-collapsible>
          <summary class="cardapio-group__summary">
            <span class="cardapio-handle" draggable="true" aria-label="Reordenar grupo">⋮⋮</span>
            <span class="cardapio-group__title">${esc(g.name || '(sem nome)')}</span>
            <span class="cardapio-group__counts">${ns} ${ns === 1 ? 'subgrupo' : 'subgrupos'} · ${ni} ${ni === 1 ? 'item' : 'itens'}</span>
            <span class="cardapio-group__chevron" aria-hidden="true">▸</span>
          </summary>
          <div class="cardapio-group__body">
            <div class="cardapio-group__row">
              <input class="field__input cardapio-group__name-input" data-field="name" type="text" maxlength="100" placeholder="Nome do grupo" value="${esc(g.name)}" aria-label="Nome do grupo">
            </div>
            <div class="cardapio-group__row">
              <input class="field__input cardapio-group__desc-input" data-field="description" type="text" maxlength="500" placeholder="Descrição (opcional)" value="${esc(g.description)}" aria-label="Descrição do grupo">
            </div>
            <ul class="cardapio-subgroup-list">${subgroups || '<li class="cardapio-empty">Sem subgrupos. Clique em "+ Subgrupo".</li>'}</ul>
            <div class="cardapio-group__actions">
              <button type="button" class="btn btn--ghost" data-action="add-subgroup">+ Subgrupo</button>
              <button type="button" class="btn btn--danger" data-action="delete">Excluir grupo</button>
            </div>
          </div>
        </details>
      </li>
    `;
  }

  // Captura quais <details> (de grupo ou subgrupo) estão abertos no DOM atual.
  // Usado por render() pra preservar o estado depois de re-render.
  function captureOpenCollapsibles() {
    const out = { groups: new Set(), subgroups: new Set() };
    if (!root) return out;
    root.querySelectorAll('.cardapio-group__details[open]').forEach(d => {
      const li = d.closest('[data-g]');
      if (li) out.groups.add(+li.dataset.g);
    });
    root.querySelectorAll('.cardapio-subgroup__details[open]').forEach(d => {
      const li = d.closest('[data-g][data-s]');
      if (li) out.subgroups.add(`${li.dataset.g}/${li.dataset.s}`);
    });
    return out;
  }

  function applyOpenCollapsibles(state) {
    if (!root || !state) return;
    state.groups.forEach(gi => {
      const d = root.querySelector(`.cardapio-group[data-g="${gi}"] > details`);
      if (d) d.open = true;
    });
    state.subgroups.forEach(key => {
      const [g, s] = key.split('/');
      const d = root.querySelector(`.cardapio-subgroup[data-g="${g}"][data-s="${s}"] > details`);
      if (d) d.open = true;
    });
  }

  function render() {
    const openState = captureOpenCollapsibles();
    if (!state.menu || !Array.isArray(state.menu.groups) || !state.menu.groups.length) {
      root.innerHTML = `
        <div class="cardapio-tree__empty">
          Nenhum grupo ainda.
          <button type="button" class="btn btn--primary" data-action="add-group" style="margin-left: 8px;">+ Adicionar grupo</button>
        </div>
      `;
      return;
    }
    root.innerHTML = `
      <ul class="cardapio-group-list">
        ${state.menu.groups.map(renderGroup).join('')}
      </ul>
      <div class="cardapio-tree__add">
        <button type="button" class="btn btn--primary" data-action="add-group">+ Adicionar grupo</button>
      </div>
    `;
    annotateFlipKeys();
    applyOpenCollapsibles(openState);
  }

  // Anota data-flip-key em todos os elementos reordenáveis, para que o
  // FLIP animation após o drop saiba medir a posição de cada um.
  function annotateFlipKeys() {
    root.querySelectorAll('.cardapio-group').forEach((el, i) => {
      el.dataset.flipKey = 'g:' + i;
    });
    root.querySelectorAll('.cardapio-subgroup').forEach((el) => {
      el.dataset.flipKey = 's:' + el.dataset.g + '/' + el.dataset.s;
    });
    root.querySelectorAll('.cardapio-item').forEach((el) => {
      el.dataset.flipKey = 'i:' + el.dataset.g + '/' + el.dataset.s + '/' + el.dataset.i;
    });
  }

  // === Tabs ===
  // (Removido: o admin agora tem só a aba "Cardápio"; a paginação do
  // livro é gerada automaticamente a partir da estrutura do cardápio.)

  // === Auto-slug em inputs name → id (aplicado direto no state) ===
  // Removido: o id é fixo a partir do momento da criação (definido pelo
  // handler de "novo grupo/subgrupo" via slugify). Renomear não muda o id,
  // o que mantém refs externas (sections do cardapio-sections.json) intactas.
  function bindAutoSlug() {}

  // === Bind dos inputs (name/desc/tag) → state ===
  function bindFieldUpdates() {
    root.addEventListener('input', (e) => {
      const t = e.target;
      const field = t.dataset.field;
      if (!field) return;
      const li = t.closest('[data-g]');
      if (!li) return;
      const gi = +li.dataset.g;
      const si = li.dataset.s;
      const ii = li.dataset.i;
      const g = state.menu.groups[gi];
      if (!g) return;
      const target = (si === undefined) ? g
        : (ii === undefined) ? g.subgroups[+si]
        : g.subgroups[+si].items[+ii];
      target[field] = t.value;

      // tratamento especial: tag em item → mostra/esconde botão "Editar inclusos"
      if (field === 'tag' && ii !== undefined) {
        const isCombo = t.value.trim() === 'combo';
        const itemLi = t.closest('.cardapio-item');
        const btn = itemLi && itemLi.querySelector('[data-action="edit-includes"]');
        if (btn) btn.hidden = !isCombo;
        const display = itemLi && itemLi.querySelector('[data-tag-display]');
        if (display) {
          display.textContent = isCombo ? 'combo' : (t.value || 'Sem tag');
          display.classList.toggle('cardapio-item__tag--combo', isCombo);
        }
        if (isCombo && !Array.isArray(target.includes)) target.includes = [];
      }

      markDirty();
    });
  }

  // === Reorder (setas + drag-and-drop) ===
  function bindReorder() {
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const li = btn.closest('[data-g]');
      if (!li) return;
      const gi = +li.dataset.g;
      const si = li.dataset.s;
      const ii = li.dataset.i;
      const g = state.menu.groups[gi];
      if (!g) return;

      if (action === 'delete') {
        if (ii !== undefined) {
          const item = g.subgroups[+si].items[+ii];
          Admin.openModal({
            title: 'Excluir item?',
            body: `<p>Tem certeza que deseja excluir o item <strong>${esc(item.name)}</strong>?</p>`,
            confirmLabel: 'Excluir',
            danger: true,
            onConfirm: () => {
              g.subgroups[+si].items.splice(+ii, 1);
              render(); markDirty();
            }
          });
        } else if (si !== undefined) {
          const sg = g.subgroups[+si];
          const n = countItemsInSubgroup(sg);
          Admin.openModal({
            title: 'Excluir subgrupo?',
            body: `<p>Tem certeza que deseja excluir o subgrupo <strong>${esc(sg.name)}</strong>?<br>Ele contém <strong>${n}</strong> ${n === 1 ? 'item' : 'itens'} que também serão removidos.</p>`,
            confirmLabel: 'Excluir',
            danger: true,
            onConfirm: () => {
              g.subgroups.splice(+si, 1);
              render(); markDirty();
            }
          });
        } else {
          const n = countItemsInGroup(g);
          const ns = g.subgroups.length;
          Admin.openModal({
            title: 'Excluir grupo?',
            body: `<p>Tem certeza que deseja excluir o grupo <strong>${esc(g.name)}</strong>?<br>Ele contém <strong>${ns}</strong> ${ns === 1 ? 'subgrupo' : 'subgrupos'} e <strong>${n}</strong> ${n === 1 ? 'item' : 'itens'} que também serão removidos.</p>`,
            confirmLabel: 'Excluir',
            danger: true,
            onConfirm: () => {
              state.menu.groups.splice(gi, 1);
              render(); markDirty();
            }
          });
        }
        return;
      }

      if (action === 'add-item') {
        const sg = g.subgroups[+si];
        sg.items.push({ name: 'Novo item', description: '', tag: '', includes: [] });
        render(); markDirty();
        // foca o input do novo item
        setTimeout(() => {
          const last = root.querySelector(`.cardapio-item[data-g="${gi}"][data-s="${si}"][data-i="${sg.items.length - 1}"] [data-field="name"]`);
          if (last) { last.focus(); last.select(); }
        }, 0);
        return;
      }

      if (action === 'add-subgroup') {
        Admin.openModal({
          title: 'Novo subgrupo',
          body: `
            <label for="cs-sg-name">Nome</label>
            <input type="text" id="cs-sg-name" maxlength="100" placeholder="Ex: Tradicionais">
            <p class="hint">O ID é gerado automaticamente a partir do nome.</p>
          `,
          confirmLabel: 'Criar',
          onConfirm: () => {
            const name = document.getElementById('cs-sg-name').value.trim();
            if (!name) { throw new Error('Informe um nome.'); }
            const id = slugify(name);
            if (!slugRegex().test(id)) { throw new Error('Nome inválido para gerar ID. Use letras, números e hífens (após slugify).'); }
            if (g.subgroups.some(s => s.id === id)) { throw new Error('Já existe um subgrupo com esse ID neste grupo.'); }
            g.subgroups.push({ id, name, items: [] });
            render(); markDirty();
          }
        });
        return;
      }

      if (action === 'add-group') {
        Admin.openModal({
          title: 'Novo grupo',
          body: `
            <label for="cs-g-name">Nome</label>
            <input type="text" id="cs-g-name" maxlength="100" placeholder="Ex: Bebidas">
            <label for="cs-g-desc">Descrição (opcional)</label>
            <input type="text" id="cs-g-desc" maxlength="500" placeholder="Descrição breve">
            <p class="hint">O ID é gerado automaticamente a partir do nome.</p>
          `,
          confirmLabel: 'Criar',
          onConfirm: () => {
            const name = document.getElementById('cs-g-name').value.trim();
            const desc = document.getElementById('cs-g-desc').value.trim();
            if (!name) { throw new Error('Informe um nome.'); }
            const id = slugify(name);
            if (!slugRegex().test(id)) { throw new Error('Nome inválido para gerar ID. Use letras, números e hífens (após slugify).'); }
            if (state.menu.groups.some(g2 => g2.id === id)) { throw new Error('Já existe um grupo com esse ID.'); }
            state.menu.groups.push({ id, name, description: desc, subgroups: [] });
            render(); markDirty();
          }
        });
        return;
      }

      if (action === 'edit-includes') {
        const item = g.subgroups[+si].items[+ii];
        openIncludesModal(item, () => { render(); markDirty(); });
        return;
      }
    });
  }

  // === Modal de "Editar inclusos" (combos) ===
  function openIncludesModal(item, onChange) {
    const lines = Array.isArray(item.includes) ? item.includes.slice() : [];
    function renderBody() {
      const rows = lines.map((line, idx) => `
        <div class="cardapio-includes-row" data-idx="${idx}" style="display: flex; gap: 8px; margin-bottom: 6px;">
          <input type="text" data-line-idx="${idx}" value="${esc(line)}" maxlength="120" style="flex: 1;" placeholder="ex: 1 Dolly guaraná">
          <button type="button" class="btn btn--danger" data-remove-idx="${idx}" aria-label="Remover linha">×</button>
        </div>
      `).join('');
      return `
        <p>Edite os itens inclusos deste combo (uma linha por item):</p>
        <div id="cardapio-includes-list">${rows}</div>
        <button type="button" class="btn btn--ghost" id="cardapio-includes-add" style="margin-top: 8px;">+ Adicionar linha</button>
      `;
    }
    function bindBody() {
      const list = document.getElementById('cardapio-includes-list');
      if (list) {
        list.addEventListener('input', (e) => {
          const t = e.target;
          if (!t.matches('[data-line-idx]')) return;
          const idx = +t.dataset.lineIdx;
          lines[idx] = t.value;
        });
        list.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-remove-idx]');
          if (!btn) return;
          const idx = +btn.dataset.removeIdx;
          lines.splice(idx, 1);
          refreshBody();
        });
      }
      const addBtn = document.getElementById('cardapio-includes-add');
      if (addBtn) addBtn.addEventListener('click', () => {
        if (lines.length >= 20) { Admin.toast('Máximo 20 linhas.', 'error'); return; }
        lines.push('');
        refreshBody();
      });
    }
    function refreshBody() {
      // O Admin.openModal substitui o body, mas o botão Confirmar mantém o
      // onConfirm original. Reabrimos o modal com body novo.
      Admin.closeModal();
      Admin.openModal({
        title: `Inclui — ${esc(item.name)}`,
        body: renderBody(),
        confirmLabel: 'Salvar',
        onOpen: bindBody,
        onConfirm: () => {
          // limpa strings vazias e atualiza
          const cleaned = lines.map(s => String(s).trim()).filter(Boolean);
          item.includes = cleaned;
          if (cleaned.length === 0) delete item.includes;
          if (typeof onChange === 'function') onChange();
        }
      });
    }
    Admin.openModal({
      title: `Inclui — ${esc(item.name)}`,
      body: renderBody(),
      confirmLabel: 'Salvar',
      onOpen: bindBody,
      onConfirm: () => {
        const cleaned = lines.map(s => String(s).trim()).filter(Boolean);
        item.includes = cleaned;
        if (cleaned.length === 0) delete item.includes;
        if (typeof onChange === 'function') onChange();
      }
    });
  }

  // === Drag-and-drop (HTML5 nativo + visual feedback) ===
  // - Linha de drop aparece EXATAMENTE entre dois itens adjacentes,
  //   seguindo o cursor. É um único elemento position: fixed no body
  //   (não é filho da lista) — assim sua presença/ausência NÃO desloca
  //   os getBoundingClientRect dos itens abaixo, eliminando o "tremido".
  // - Container válido recebe highlight (is-drop-target) durante o arraste.
  // - Item arrastado é escondido (display: none) — a drag image nativa
  //   segue o cursor com offset exato do clique.
  // - Após o drop, os itens que mudaram de posição fazem uma animação FLIP.
  function bindDragAndDrop() {
    let dragSrc = null;     // { el, gi, si, ii }
    let dropTarget = null;  // container atualmente em highlight
    let dropLine = null;    // elemento único da drop-line (criado no body)

    // Garante que a drop-line exista e está no body.
    function ensureDropLine() {
      if (dropLine && dropLine.isConnected) return dropLine;
      dropLine = document.createElement('div');
      dropLine.className = 'cardapio-tree__drop-line';
      dropLine.setAttribute('aria-hidden', 'true');
      document.body.appendChild(dropLine);
      return dropLine;
    }

    // Esconde a drop-line e o highlight.
    function clearDropVisuals() {
      if (dropLine) dropLine.classList.remove('is-active');
      if (dropTarget) dropTarget.classList.remove('is-drop-target');
      dropTarget = null;
      lastDropList = null;
      lastDropIndex = -1;
    }

    // Devolve o índice onde a drop-line deve ficar dentro de listEl,
    // dado o Y do cursor e o tipo (item/subgrupo/grupo).
    // IMPORTANTE: lê getBoundingClientRect dos itens, que é estável
    // porque a drop-line está fora da lista (position: fixed no body).
    function computeDropIndex(listEl, clientY, type) {
      const rows = Array.from(listEl.children).filter(c =>
        !c.classList.contains('is-dragging') &&
        (type === 'item'      ? c.classList.contains('cardapio-item') :
         type === 'subgroup'  ? c.classList.contains('cardapio-subgroup') :
                                c.classList.contains('cardapio-group'))
      );
      if (!rows.length) return 0;
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i].getBoundingClientRect();
        if (clientY <= r.top + r.height / 2) return i;
      }
      return rows.length;
    }

    // Posiciona a drop-line ABSOLUTAMENTE no viewport, no meio entre
    // rows[idx-1] e rows[idx]. Como a drop-line é position: fixed,
    // sua posição não interfere em nada do layout.
    function placeDropLine(listEl, idx) {
      const line = ensureDropLine();
      const rows = Array.from(listEl.children).filter(c =>
        !c.classList.contains('is-dragging') &&
        (listEl.classList.contains('cardapio-item-list')     ? c.classList.contains('cardapio-item') :
         listEl.classList.contains('cardapio-subgroup-list') ? c.classList.contains('cardapio-subgroup') :
                                                                c.classList.contains('cardapio-group'))
      );
      // Calcula o Y no viewport para a drop-line (meio entre rows[idx-1] e rows[idx])
      let topY;
      if (rows.length === 0) {
        const lr = listEl.getBoundingClientRect();
        topY = lr.top + lr.height / 2;
      } else if (idx <= 0) {
        topY = rows[0].getBoundingClientRect().top;
      } else if (idx >= rows.length) {
        topY = rows[rows.length - 1].getBoundingClientRect().bottom;
      } else {
        const a = rows[idx - 1].getBoundingClientRect();
        const b = rows[idx].getBoundingClientRect();
        topY = (a.bottom + b.top) / 2;
      }
      // Restringe horizontalmente à largura da lista, com um pequeno padding.
      const lr = listEl.getBoundingClientRect();
      line.style.left   = (lr.left + 12) + 'px';
      line.style.right  = (window.innerWidth - lr.right + 12) + 'px';
      line.style.top    = topY + 'px';
      line.classList.add('is-active');
    }

    // FLIP animation: mede posições dos elementos com a classe "flipKey"
    // antes do próximo re-render, e depois de re-renderizar, anima a
    // transição da posição antiga para a nova.
    // Como o render() reescreve o innerHTML, capturamos o "First" antes
    // e o "Last" depois, e animamos no novo DOM.
    function captureFlipPositions() {
      const map = new Map();
      root.querySelectorAll('[data-flip-key]').forEach(el => {
        const rect = el.getBoundingClientRect();
        map.set(el.dataset.flipKey, { left: rect.left, top: rect.top });
      });
      return map;
    }
    function playFlipAnimations(prevMap) {
      if (!prevMap || !prevMap.size) return;
      requestAnimationFrame(() => {
        root.querySelectorAll('[data-flip-key]').forEach(el => {
          const prev = prevMap.get(el.dataset.flipKey);
          if (!prev) return;
          const cur = el.getBoundingClientRect();
          const dx = prev.left - cur.left;
          const dy = prev.top  - cur.top;
          if (dx === 0 && dy === 0) return;
          el.style.transform = `translate(${dx}px, ${dy}px)`;
          el.style.transition = 'none';
          // Força reflow
          void el.offsetWidth;
          el.classList.add('cardapio-flip-anim');
          el.style.transform = '';
          // Remove a classe após a animação para não interferir em CSS
          el.addEventListener('transitionend', function onEnd(ev) {
            if (ev.propertyName !== 'transform') return;
            el.classList.remove('cardapio-flip-anim');
            el.style.transition = '';
            el.removeEventListener('transitionend', onEnd);
          });
        });
      });
    }

    // (annotateFlipKeys vive no escopo do IIFE — é referenciado aqui
    // por rerenderWithFlip e também por render() mais acima.)

    // Chamar após render() para preparar o FLIP.
    function rerenderWithFlip() {
      const prev = captureFlipPositions();
      render();
      annotateFlipKeys();
      playFlipAnimations(prev);
    }

    root.addEventListener('dragstart', (e) => {
      const handle = e.target.closest('.cardapio-handle');
      if (!handle) return;
      const li = handle.closest('[data-g]');
      if (!li) return;
      dragSrc = {
        el: li,
        gi: +li.dataset.g,
        si: li.dataset.s !== undefined ? +li.dataset.s : undefined,
        ii: li.dataset.i !== undefined ? +li.dataset.i : undefined,
      };
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', 'cardapio-drag'); } catch (_) {}
      // Drag image: usa o <li> inteiro. O offset dentro do li é o ponto
      // onde o usuário clicou, para que a "alça" arrastada fique sob o
      // cursor — assim é natural arrastar pra cima (topo do item sob o
      // cursor) ou pra baixo (base sob o cursor).
      // IMPORTANTE: setDragImage deve ser chamado ANTES de esconder o
      // item original (display: none), senão o navegador captura uma
      // imagem em branco.
      try {
        const liRect = li.getBoundingClientRect();
        const offsetX = e.clientX - liRect.left;
        const offsetY = e.clientY - liRect.top;
        e.dataTransfer.setDragImage(li, offsetX, offsetY);
      } catch (_) { /* ignore em browsers que não suportam */ }
      // Esconde o item ORIGINAL do layout (display: none) — a "drag image"
      // já foi capturada acima e continua visível seguindo o cursor. Isso
      // evita o reflow que fazia a UI "tremer" durante o arraste: o item
      // original não disputa espaço com a drop-line, e os items de baixo
      // não se movem a cada dragover.
      li.classList.add('is-dragging');
      root.classList.add('is-dragging-active');
    });

    let pendingClientY = null;
    let lastClientX = 0;
    let lastClientY = 0;
    let dragoverScheduled = false;
    let lastDropIndex = -1;
    let lastDropList = null;
    function scheduleDragover() {
      if (dragoverScheduled) return;
      dragoverScheduled = true;
      requestAnimationFrame(() => {
        dragoverScheduled = false;
        if (!dragSrc || pendingClientY === null) return;
        processDragover(pendingClientY);
      });
    }
    function processDragover(clientY) {
      if (!dragSrc) return;
      // Decide o tipo de escopo (item/subgrupo/grupo) com base na origem.
      const type = (dragSrc.ii !== undefined) ? 'item'
                 : (dragSrc.si !== undefined) ? 'subgroup'
                 : 'group';
      // Encontra o li-alvo mais próximo (qualquer nível serve para hover).
      // Usa document.elementFromPoint, que não força reflow e é mais
      // barato que ler posições de todos os elementos.
      const elAtPoint = document.elementFromPoint(lastClientX, clientY);
      const hoverLi = elAtPoint && elAtPoint.closest('[data-g]');

      // Resolve qual lista é a "alvo" e se é válida.
      let targetList = null;
      let targetScope = null;
      let targetGi, targetSi, targetIi;

      if (type === 'item') {
        // Item só pode ir para dentro do mesmo subgrupo (entre items).
        targetList = hoverLi && hoverLi.closest('.cardapio-item-list');
        if (targetList) {
          const ownerLi = targetList.closest('.cardapio-item');
          if (ownerLi) {
            targetGi = +ownerLi.dataset.g;
            targetSi = +ownerLi.dataset.s;
          }
        }
        targetScope = { gi: targetGi, si: targetSi };
        if (!targetList || dragSrc.gi !== targetScope.gi || dragSrc.si !== targetScope.si) {
          targetList = null;
        }
      } else if (type === 'subgroup') {
        // Subgrupo vai entre subgrupos do mesmo grupo.
        targetList = hoverLi && hoverLi.closest('.cardapio-subgroup-list');
        if (targetList) {
          const ownerLi = targetList.closest('.cardapio-group');
          if (ownerLi) {
            targetGi = +ownerLi.dataset.g;
          }
        }
        targetScope = { gi: targetGi };
        if (!targetList || dragSrc.gi !== targetScope.gi) {
          targetList = null;
        }
      } else {
        // Grupo vai entre grupos.
        targetList = hoverLi && hoverLi.closest('.cardapio-group-list');
        targetScope = {};
        if (!targetList) targetList = null;
      }

      // Se a lista-alvo não é válida, limpa visual e sai.
      if (!targetList) {
        clearDropVisuals();
        return;
      }

      // Highlight do container.
      const containerEl = targetList.closest('.cardapio-group, .cardapio-subgroup');
      if (containerEl !== dropTarget) {
        if (dropTarget) dropTarget.classList.remove('is-drop-target');
        if (containerEl) containerEl.classList.add('is-drop-target');
        dropTarget = containerEl;
      }

      // Posiciona a drop-line no viewport. Só reposiciona se a lista OU
      // o índice realmente mudou — caso contrário, não há trabalho.
      const idx = computeDropIndex(targetList, clientY, type);
      if (lastDropList !== targetList || lastDropIndex !== idx) {
        placeDropLine(targetList, idx);
        lastDropList = targetList;
        lastDropIndex = idx;
      }
    }

    // dragover dispara MUITO (a cada movimento do cursor). Coalescemos
    // com requestAnimationFrame: a cada frame, lemos a última posição
    // armazenada e fazemos UM único cálculo de drop. Isso evita o
    // "tremido" causado por reflow excessivo durante o arraste.
    root.addEventListener('dragover', (e) => {
      if (!dragSrc) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      pendingClientY = e.clientY;
      lastClientX = e.clientX;
      lastClientY = e.clientY;
      scheduleDragover();
    });

    root.addEventListener('drop', (e) => {
      if (!dragSrc) return;
      e.preventDefault();
      const li = e.target.closest('[data-g]');
      const srcG = state.menu.groups[dragSrc.gi];
      if (!srcG) { reset(); return; }

      // Resolve a lista-alvo no momento do drop (similar ao dragover).
      const type = (dragSrc.ii !== undefined) ? 'item'
                 : (dragSrc.si !== undefined) ? 'subgroup'
                 : 'group';
      let targetList = null;
      if (type === 'item') {
        targetList = li && li.closest('.cardapio-item-list');
        if (targetList) {
          const ownerLi = targetList.closest('.cardapio-item');
          if (!ownerLi || +ownerLi.dataset.g !== dragSrc.gi || +ownerLi.dataset.s !== dragSrc.si) {
            targetList = null;
          }
        }
      } else if (type === 'subgroup') {
        targetList = li && li.closest('.cardapio-subgroup-list');
        if (targetList) {
          const ownerLi = targetList.closest('.cardapio-group');
          if (!ownerLi || +ownerLi.dataset.g !== dragSrc.gi) {
            targetList = null;
          }
        }
      } else {
        targetList = li && li.closest('.cardapio-group-list');
      }

      if (!targetList) {
        Admin.toast('Reordene dentro do mesmo escopo (itens dentro do subgrupo, subgrupos dentro do grupo, ou grupos entre si).', 'info');
        reset();
        return;
      }

      // Calcula o índice de destino a partir da posição da drop-line.
      const dropIdx = computeDropIndex(targetList, e.clientY, type);

      // Ajusta o índice se a origem está na mesma lista e antes do destino:
      // ao remover o item, os índices à direita "escorrem" uma posição.
      let targetIdx = dropIdx;
      if (type === 'item' && dragSrc.gi === +targetList.closest('.cardapio-item').dataset.g
                         && dragSrc.si === +targetList.closest('.cardapio-item').dataset.s) {
        if (dragSrc.ii < dropIdx) targetIdx = dropIdx - 1;
        moveInArray(srcG.subgroups[+dragSrc.si].items, +dragSrc.ii, targetIdx);
      } else if (type === 'subgroup' && dragSrc.gi === +targetList.closest('.cardapio-group').dataset.g) {
        if (dragSrc.si < dropIdx) targetIdx = dropIdx - 1;
        moveInArray(srcG.subgroups, +dragSrc.si, targetIdx);
      } else if (type === 'group') {
        if (dragSrc.gi < dropIdx) targetIdx = dropIdx - 1;
        moveInArray(state.menu.groups, dragSrc.gi, targetIdx);
      } else {
        // Sem fallback — só reordena no mesmo escopo.
        Admin.toast('Reordene dentro do mesmo escopo.', 'info');
        reset();
        return;
      }

      rerenderWithFlip();
      markDirty();
      reset();
    });

    root.addEventListener('dragend', () => {
      if (dragSrc && dragSrc.el) dragSrc.el.classList.remove('is-dragging');
      reset();
    });

    function reset() {
      dragSrc = null;
      clearDropVisuals();
      root.classList.remove('is-dragging-active');
    }

    // Primeira anotação dos flip-keys após o load inicial.
    // (bindDragAndDrop é chamado antes de load(), mas a anotação é
    // re-feita em cada rerenderWithFlip().)
  }

  // === Validação client-side antes de salvar ===
  function validateBeforeSave() {
    const seen = new Set();
    const errors = [];
    for (const g of state.menu.groups) {
      if (!slugRegex().test(g.id || '')) errors.push(`Grupo "${g.name}": ID "${g.id}" inválido.`);
      else if (seen.has(g.id)) errors.push(`Grupo com ID duplicado: "${g.id}".`);
      seen.add(g.id);
      if (!g.name || !g.name.trim()) errors.push(`Grupo "${g.id}" sem nome.`);
      for (const sg of g.subgroups) {
        if (!slugRegex().test(sg.id || '')) errors.push(`Subgrupo "${sg.name}" do grupo "${g.name}": ID "${sg.id}" inválido.`);
        if (!sg.name || !sg.name.trim()) errors.push(`Subgrupo "${sg.id}" sem nome.`);
        for (const it of sg.items) {
          if (!it.name || !it.name.trim()) errors.push(`Item sem nome em ${g.name} / ${sg.name}.`);
        }
      }
    }
    if (errors.length) {
      Admin.toast(errors[0] + (errors.length > 1 ? ` (+${errors.length - 1} erros)` : ''), 'error');
      return false;
    }
    return true;
  }

  async function save() {
    if (!saveBtn) return;
    if (!validateBeforeSave()) return;
    saveBtn.disabled = true;
    try {
      const data = await Admin.api('api/cardapio_save.php', {
        method: 'POST',
        body: { menu: state.menu, cardapioSections: state.sections },
      });
      state.menu = data.menu;
      state.sections = data.cardapioSections;
      markClean();
      render();
      emitConfigReload();
      Admin.toast(data.message || 'Salvo.', 'success');
    } catch (err) {
      Admin.toast('Erro ao salvar: ' + (err.message || 'desconhecido'), 'error');
    } finally {
      saveBtn.disabled = false;
    }
  }

  // === Load ===
  async function load() {
    try {
      const res = await fetch('api/cardapio_get.php', { credentials: 'same-origin' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Falha ao carregar.');
      state.menu = data.menu || { groups: [] };
      state.sections = data.cardapioSections || [];
      render();
    } catch (err) {
      console.warn('[Cardápio] load:', err.message);
      root.innerHTML = '<div class="cardapio-tree__error">Erro ao carregar: ' + esc(err.message) + '</div>';
    }
  }

  // === Init ===
  bindFieldUpdates();
  bindReorder();
  bindDragAndDrop();
  if (saveBtn) saveBtn.addEventListener('click', save);
  load();
})();
