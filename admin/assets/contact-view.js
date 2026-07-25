/* ================================================================
   contact-view.js — view do módulo "Contato" do admin.
   - GET  /admin/api/contact_get.php  → popula o form
   - POST /admin/api/contact_save.php → persiste no config.json
   - Emite evento cross-window pra que o site público recarregue
     o config (admin e site público são páginas/abas diferentes).

   Live preview:
     Ao salvar, avisa o site público via BroadcastChannel e
     localStorage pra que ele recarregue config.json. O renderer
     renderWhatsApp() do site público cuida de reescrever todos
     os wa.me/ do DOM a partir do company.whatsapp e
     company.whatsappDisplay.
   ================================================================ */

(function () {
  'use strict';

  const form = document.getElementById('contact-form');
  if (!form) return;

  const inputWpp   = document.getElementById('contact-whatsapp-input');
  const inputPhone = document.getElementById('contact-phone-input');
  const saveBtn    = document.getElementById('contact-save-btn');

  // === Canal cross-tab (mesma origem, abas diferentes) ===
  const channel = (typeof BroadcastChannel !== 'undefined')
    ? new BroadcastChannel('conquista-brasileira')
    : null;

  function emitConfigReload() {
    if (channel) channel.postMessage({ type: 'site:config-reload-request' });
    try { localStorage.setItem('cb:config-reload', String(Date.now())); } catch (_) { /* noop */ }
  }

  // === Carrega estado atual ===
  async function load() {
    try {
      const res = await fetch('api/contact_get.php', { credentials: 'same-origin' });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Falha ao carregar.');
      const c = data.contact || {};
      inputWpp.value   = c.whatsappDisplay || '';
      inputPhone.value = c.phone || '';
    } catch (err) {
      console.warn('[Contact] load:', err.message);
    }
  }

  // === Save ===
  async function save(e) {
    e.preventDefault();
    saveBtn.disabled = true;

    const body = new FormData();
    body.set('whatsapp', inputWpp.value.trim());
    body.set('phone',    inputPhone.value.trim());

    try {
      const res = await fetch('api/contact_save.php', {
        method: 'POST',
        body,
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Falha ao salvar.');

      inputWpp.value   = data.contact.whatsappDisplay;
      inputPhone.value = data.contact.phone;
      emitConfigReload();
    } catch (err) {
      alert('Erro ao salvar: ' + err.message);
    } finally {
      saveBtn.disabled = false;
    }
  }

  // === Wire ===
  form.addEventListener('submit', save);

  load();
})();
