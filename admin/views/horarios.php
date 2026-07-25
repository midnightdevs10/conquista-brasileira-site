<?php
// views/horarios.php — view do módulo "Horários".
// 7 dias (Seg → Dom), cada um com open/close editáveis (input type=time) + "Fechado".

declare(strict_types=1);
?>
<div class="hours-view">
  <form class="hours-form" id="hours-form" autocomplete="off" novalidate>
    <ul class="hours-list-edit" id="hours-list-edit" role="list">
      <!-- Linhas são renderizadas via JS (hours-view.js) -->
    </ul>
    <!-- Botão fica fora do form (visual), mas continua sendo type=submit do form -->
    <button type="submit" form="hours-form" class="btn btn--primary hours-form__save" id="hours-save-btn">Salvar</button>
  </form>
</div>
