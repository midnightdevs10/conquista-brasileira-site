/* ================================================================
   hours-view.js — view do módulo "Horários" do admin.
   - GET  /admin/api/hours_get.php  → popula o form
   - POST /admin/api/hours_save.php → persiste no config.json
   - Emite evento cross-window pra que o site público recarregue
     o config e re-renderize a seção de horários + badge "Aberto".
   ================================================================ */

(function () {
  'use strict';

  const form   = document.getElementById('hours-form');
  const list   = document.getElementById('hours-list-edit');
  const saveBtn = document.getElementById('hours-save-btn');
  if (!form || !list) return;

  // Ordem canônica
  const DAY_ORDER = ['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado','Domingo'];

  // === Canal cross-tab ===
  const channel = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('conquista-brasileira')
    : null;

  function emitConfigReload() {
    if (channel) channel.postMessage({ type: 'site:config-reload-request' });
    try { localStorage.setItem('cb:config-reload', String(Date.now())); } catch (_) { /* noop */ }
  }

  // === Helpers ===
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  // Converte "07:00" pra { h: '07', m: '00' } (ou vazios se inválido).
  function toTimeInputValue(v) {
    return /^\d{2}:\d{2}$/.test(v || '') ? v : '';
  }

  function renderRow(day, data) {
    const isClosed = !!data.isClosed;
    // Extrai HH e MM de "HH:MM" (se válido); senão vazio.
    const m = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(data.open || '');
    const openH  = m ? m[1] : '';
    const openM  = m ? m[2] : '';
    const c      = /^\s*(\d{1,2}):(\d{2})\s*$/.exec(data.close || '');
    const closeH = c ? c[1] : '';
    const closeM = c ? c[2] : '';
    return `
      <li class="hours-row${isClosed ? ' is-closed' : ''}" data-day="${escapeHtml(day)}">
        <span class="hours-row__day">${escapeHtml(day)}</span>
        <label class="hours-row__closed">
          <input type="checkbox" class="hours-row__closed-input" ${isClosed ? 'checked' : ''} />
          <span>Fechado</span>
        </label>
        <div class="hours-time">
          <input type="text" class="field__input hours-time__h" inputmode="numeric" maxlength="2" pattern="[0-9]*" value="${escapeHtml(openH)}"  placeholder="HH" aria-label="Hora de abertura" />
          <span class="hours-time__sep">:</span>
          <input type="text" class="field__input hours-time__m" inputmode="numeric" maxlength="2" pattern="[0-9]*" value="${escapeHtml(openM)}"  placeholder="MM" aria-label="Minuto de abertura" />
        </div>
        <span class="hours-row__sep">—</span>
        <div class="hours-time">
          <input type="text" class="field__input hours-time__h" inputmode="numeric" maxlength="2" pattern="[0-9]*" value="${escapeHtml(closeH)}" placeholder="HH" aria-label="Hora de fechamento" />
          <span class="hours-time__sep">:</span>
          <input type="text" class="field__input hours-time__m" inputmode="numeric" maxlength="2" pattern="[0-9]*" value="${escapeHtml(closeM)}" placeholder="MM" aria-label="Minuto de fechamento" />
        </div>
      </li>
    `;
  }

  // Junta HH + MM dos 2 inputs em "HH:MM". Se vazio, retorna ''.
  function readTime(timeGroup) {
    if (!timeGroup) return '';
    const h = timeGroup.querySelector('.hours-time__h').value.trim();
    const m = timeGroup.querySelector('.hours-time__m').value.trim();
    if (h === '' && m === '') return '';
    if (h === '' || m === '') return null; // parcial = erro
    return h.padStart(2, '0') + ':' + m.padStart(2, '0');
  }

  // Auto-pula do campo HH pro MM quando digita 2 dígitos.
  function wireTimeAutotab(timeGroup) {
    const hEl = timeGroup.querySelector('.hours-time__h');
    const mEl = timeGroup.querySelector('.hours-time__m');
    hEl.addEventListener('input', () => {
      if (hEl.value.length >= 2) mEl.focus();
    });
  }

  // Ajusta o valor para 2 dígitos (0–23 p/ hora, 0–59 p/ minuto) e padroniza.
  function sanitizeTimeValue(el, max) {
    let v = el.value.replace(/\D/g, '').slice(0, 2);
    if (v.length === 2) {
      const n = parseInt(v, 10);
      if (n > max) v = String(max);
    }
    el.value = v;
  }

  function applyClosedState(row) {
    const closed = row.querySelector('.hours-row__closed-input').checked;
    row.classList.toggle('is-closed', closed);
    row.querySelectorAll('.hours-time__h, .hours-time__m').forEach(el => {
      el.disabled = closed;
    });
  }

  function renderAll(hours) {
    // Indexa por dia (caso o config venha em ordem diferente)
    const byDay = {};
    (hours || []).forEach(h => { if (h && h.day) byDay[h.day] = h; });
    // Garante os 7 dias
    DAY_ORDER.forEach(day => {
      if (!byDay[day]) byDay[day] = { day, open: '00:00', close: '00:00', isClosed: true };
    });
    list.innerHTML = DAY_ORDER.map(day => renderRow(day, byDay[day])).join('');

    // Wire dos toggles "Fechado" e dos inputs de horário
    list.querySelectorAll('.hours-row').forEach(row => {
      const closedInput = row.querySelector('.hours-row__closed-input');
      closedInput.addEventListener('change', () => applyClosedState(row));

      // Sanitiza entrada (apenas dígitos, máx HH/MM) e auto-pula HH→MM
      row.querySelectorAll('.hours-time').forEach(group => {
        wireTimeAutotab(group);
        const hEl = group.querySelector('.hours-time__h');
        const mEl = group.querySelector('.hours-time__m');
        hEl.addEventListener('input', () => sanitizeTimeValue(hEl, 23));
        mEl.addEventListener('input', () => sanitizeTimeValue(mEl, 59));
      });

      applyClosedState(row); // estado inicial
    });
  }

  // === Coleta dados do form ===
  function collect() {
    const out = [];
    list.querySelectorAll('.hours-row').forEach(row => {
      const day = row.dataset.day;
      const closed = row.querySelector('.hours-row__closed-input').checked;
      if (closed) {
        out.push({ day, open: 'Fechado', close: '', isClosed: true });
      } else {
        const timeGroups = row.querySelectorAll('.hours-time');
        out.push({
          day,
          open:  readTime(timeGroups[0]),
          close: readTime(timeGroups[1]),
          isClosed: false,
        });
      }
    });
    return out;
  }

  // === Load ===
  async function load() {
    try {
      const res = await fetch('api/hours_get.php', { credentials: 'same-origin' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Falha ao carregar.');
      renderAll(data.hours || []);
    } catch (err) {
      console.warn('[Hours] load:', err.message);
      renderAll([]); // fallback vazio → renderiza defaults
    }
  }

  // === Save ===
  async function save(e) {
    e.preventDefault();
    saveBtn.disabled = true;

    // Validação client-side rápida (servidor revalida)
    const hours = collect();
    for (const h of hours) {
      if (!h.isClosed) {
        if (!/^\d{2}:\d{2}$/.test(h.open) || !/^\d{2}:\d{2}$/.test(h.close)) {
          alert(`Em ${h.day}, preencha os dois horários ou marque "Fechado".`);
          saveBtn.disabled = false;
          return;
        }
        if (h.open >= h.close) {
          alert(`Em ${h.day}, o horário de abertura deve ser menor que o de fechamento.`);
          saveBtn.disabled = false;
          return;
        }
      }
    }

    const body = new FormData();
    hours.forEach((h, i) => {
      body.append(`hours[${i}][day]`,      h.day);
      body.append(`hours[${i}][open]`,     h.open);
      body.append(`hours[${i}][close]`,    h.close);
      body.append(`hours[${i}][isClosed]`, h.isClosed ? '1' : '0');
    });

    try {
      const res = await fetch('api/hours_save.php', {
        method: 'POST',
        body,
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Falha ao salvar.');

      renderAll(data.hours || []);
      emitConfigReload();
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      saveBtn.disabled = false;
    }
  }

  form.addEventListener('submit', save);
  load();
})();
