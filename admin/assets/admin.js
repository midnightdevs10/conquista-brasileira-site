// admin.js — utilitários do shell (fetch, toast, modal). Vanilla, sem deps.
(function () {
  'use strict';

  const Admin = {
    /** fetch wrapper que adiciona headers anti-cache e parseia JSON. */
    api(path, options = {}) {
      const opts = Object.assign({
        method: 'GET',
        headers: { 'X-Requested-With': 'admin' },
      }, options);
      if (opts.body && !(opts.body instanceof FormData) && typeof opts.body === 'object') {
        opts.body = JSON.stringify(opts.body);
        opts.headers['Content-Type'] = 'application/json';
      }
      opts.cache = 'no-store';
      return fetch(path, opts).then(async (r) => {
        let data = null;
        const ct = r.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          data = await r.json().catch(() => null);
        } else {
          data = { ok: false, code: 'non_json', message: await r.text() };
        }
        if (!r.ok) {
          const err = new Error((data && data.message) || `HTTP ${r.status}`);
          err.status = r.status;
          err.code   = (data && data.code) || 'http_error';
          err.data   = data;
          throw err;
        }
        return data;
      });
    },

    /** Toast (auto-hide em 3.5s). */
    toast(msg, kind = 'info') {
      const el = document.getElementById('toast');
      if (!el) return;
      el.textContent = msg;
      el.className = 'toast' + (kind === 'error' ? ' is-error' : kind === 'success' ? ' is-success' : '');
      el.hidden = false;
      clearTimeout(el._timer);
      el._timer = setTimeout(() => { el.hidden = true; }, 3500);
    },

    /** Modal genérico: { title, titleHtml, body (HTML string), confirmLabel, danger, onOpen, onConfirm }
     *  - title: texto puro (escapa HTML)
     *  - titleHtml: HTML livre (use quando precisar estilizar parte do título)
     *  - onOpen: chamado após o body ser injetado, ideal para bindar event listeners nos elementos novos */
    openModal({ title, titleHtml, body, confirmLabel = 'Confirmar', danger = false, onOpen, onConfirm }) {
      const m  = document.getElementById('modal');
      if (!m) return;
      const titleEl = m.querySelector('#modal-title');
      if (titleHtml !== undefined) titleEl.innerHTML = titleHtml;
      else                          titleEl.textContent = title || '';
      m.querySelector('#modal-body').innerHTML    = body;
      const btn = m.querySelector('#modal-confirm');
      btn.textContent = confirmLabel;
      btn.className = 'btn ' + (danger ? 'btn--danger' : 'btn--primary');
      btn.onclick = async () => {
        btn.disabled = true;
        try { await onConfirm(); Admin.closeModal(); }
        catch (e) { btn.disabled = false; Admin.toast(e.message || 'Erro.', 'error'); }
      };
      m.hidden = false;
      // Bind dinâmico (file-picker, etc.) depois do body injetado
      if (typeof onOpen === 'function') {
        try { onOpen(); } catch (e) { /* não bloqueia a abertura */ }
      }
      const focusTarget = m.querySelector('input, button, [tabindex]');
      if (focusTarget) setTimeout(() => focusTarget.focus(), 50);
    },

    closeModal() {
      const m = document.getElementById('modal');
      if (m) {
        m.hidden = true;
        const btn = m.querySelector('#modal-confirm');
        if (btn) btn.disabled = false;
      }
    },

    /** Formata bytes em algo legível. */
    fmtBytes(n) {
      if (n < 1024) return n + ' B';
      if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
      return (n / 1024 / 1024).toFixed(2) + ' MB';
    },

    /** Escapa HTML. */
    esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, (c) =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },
  };

  // bind modal close (backdrop + Cancelar)
  document.addEventListener('click', (e) => {
    if (e.target.matches('[data-modal-close]') || e.target.id === 'modal-confirm' && !e.target.onclick) {
      Admin.closeModal();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') Admin.closeModal();
  });

  window.Admin = Admin;
})();
