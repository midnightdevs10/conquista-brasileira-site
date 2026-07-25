<?php
// views/contato.php — view do módulo "Contato".
// Edita WhatsApp (texto visível e número do link, derivados do mesmo input)
// e Telefone que aparecem no site público.

declare(strict_types=1);
?>
<div class="contact-view">
  <form class="contact-form" id="contact-form" autocomplete="off" novalidate>
    <div class="field">
      <label class="field__label" for="contact-whatsapp-input">WhatsApp</label>
      <input
        type="text"
        class="field__input"
        id="contact-whatsapp-input"
        name="whatsapp"
        inputmode="tel"
        placeholder="(11) 96380-5855"
        required
      />
    </div>

    <div class="field">
      <label class="field__label" for="contact-phone-input">Telefone</label>
      <input
        type="text"
        class="field__input"
        id="contact-phone-input"
        name="phone"
        inputmode="tel"
        placeholder="(11) 96380-5855"
      />
    </div>

    <button type="submit" form="contact-form" class="btn btn--primary contact-form__save" id="contact-save-btn">Salvar</button>
  </form>
</div>
