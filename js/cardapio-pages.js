/* ================================================================
   CARDAPIO-PAGES - Conquista Brasileira Pastelaria
   Converte o array de SEÇÕES (vindo de cardapio-data) em objetos
   "página" — cada página com seu HTML pronto pra StPageFlip.
   ================================================================ */

(function () {
  'use strict';

  const { escapeHtml } = window.CardapioData;

  // ============== Helpers ==============

  // Teto inicial pra paginação proporcional (1 subgrupo, N páginas).
  // O número REAL de itens por página é decidido em runtime pelo rebalanceamento
  // baseado em DOM (ver `rebalancePages` mais abaixo) — `MAX_ITEMS_PER_PAGE`
  // é só o ponto de partida: começamos generosos e o rebalanceamento corta
  // onde precisar pra que cada página realmente caiba. 12 (em vez de 10) deixa
  // folga pra descrições longas sem forçar páginas extras.
  const MAX_ITEMS_PER_PAGE = 12;

  // ============== Helpers ==============

  function sectionHeadHTML(section, opts, primarySubgroup) {
    const showContinuation = opts && opts.continuation;
    // Eyebrow = nome da section (vem de cardapio-sections.json, fixo).
    // Título = nome do subgrupo principal (segue rename do subgrupo no admin).
    // Fallback pro section.name se, por algum motivo, não houver subgrupo.
    const eyebrow = section.tag
      ? `<span class="menu-section-eyebrow">${escapeHtml(section.tag)}</span>`
      : (showContinuation
          ? `<span class="menu-section-eyebrow">${escapeHtml(section.name)}</span>`
          : `<span class="menu-section-eyebrow">${escapeHtml(section.name)}</span>`);
    const titleName = (primarySubgroup && primarySubgroup.subgroupName) || section.name;
    const lead = section.description && !showContinuation
      ? `<p class="menu-section-lead">${escapeHtml(section.description)}</p>`
      : '';
    const cont = showContinuation
      ? `<span class="menu-section-eyebrow-continuation">Continuação</span>`
      : '';
    return `
      <header class="menu-section-head">
        ${eyebrow}
        ${cont}
        <h2 class="menu-section-title">${escapeHtml(titleName)}</h2>
        ${lead}
      </header>
    `;
  }

  function flavorListHTML(subgroup) {
    const items = subgroup.items || [];
    return `
      <ul class="menu-flavor-list">
        ${items.map(it => flavorItemHTML(it, subgroup)).join('')}
      </ul>
    `;
  }

  // Item com contexto (descrição / tag / includes) → data-has-context
  // Item sem contexto → link direto pra WhatsApp
  function flavorItemHTML(item, subgroup) {
    const hasDesc = !!(item.description && item.description.trim());
    const isCombo = item.tag === 'combo';
    const hasIncludes = Array.isArray(item.includes) && item.includes.length > 0;
    const hasContext = hasDesc || isCombo || hasIncludes;

    const tagHtml = item.tag
      ? `<span class="menu-flavor-tag ${item.tag === 'combo' ? 'menu-flavor-tag--combo' : ''}">${escapeHtml(item.tag === 'combo' ? 'Combo' : item.tag)}</span>`
      : '';

    const descHtml = hasDesc
      ? `<span class="menu-flavor-desc">${escapeHtml(item.description)}</span>`
      : '';

    return `
      <li class="menu-flavor"
          role="button"
          tabindex="0"
          data-item-name="${escapeHtml(item.name)}"
          data-item-desc="${escapeHtml(item.description || '')}"
          data-item-category="${escapeHtml(subgroup.groupName)} · ${escapeHtml(subgroup.subgroupName)}"
          data-item-tag="${escapeHtml(item.tag || '')}"
          data-item-context="${hasContext ? '1' : '0'}"
          data-item-includes='${hasIncludes ? escapeHtml(JSON.stringify(item.includes)) : ''}'
          aria-label="${hasContext ? 'Ver detalhes de ' : 'Pedir '}${escapeHtml(item.name)}">
        <span class="menu-flavor-name">
          <span class="menu-flavor-name-text">${escapeHtml(item.name)}</span>
          ${tagHtml}
        </span>
        ${descHtml}
      </li>
    `;
  }

  // ============== Tipos de página ==============

  // 1. CAPA
  // Logo no TOPO (acima de "Desde 2020"), como selo institucional.
  // A capa é centralizada verticalmente (justify-content: center),
  // todos os itens ficam agrupados no centro (visual clássico e simétrico).
  // A logo é colorida e recebe um filtro de brilho dourado via CSS
  // (filter: drop-shadow âmbar + brightness) pra integrar com a iluminação
  // da capa sem perder a cor original.
  function coverPage(config) {
    const c = config.company;
    // CMS-patch: textos da capa agora vêm de `config.cardapio.*` com
    // fallback inline aos literais atuais (site renderiza idêntico
    // se o JSON não tiver essas chaves).
    const cb = config.cardapio || {};
    const toc = cb.toc || {};
    const company = config.company || {};

    const brand        = cb.coverBrand       != null ? cb.coverBrand       : 'Pastelaria Brasileira · Cajamar/SP';
    const title        = cb.coverTitle       != null ? cb.coverTitle       : 'Cardápio';
    const titleAccent  = cb.coverTitleAccent != null ? cb.coverTitleAccent : 'Conquista Brasileira';
    const tagline      = cb.coverTagline     != null ? cb.coverTagline     : 'Tradição, sabor e atendimento de família — desde a primeira mordida.';
    const cta          = cb.coverCta         != null ? cb.coverCta         : 'Abrir cardápio';
    const sincePrefix  = toc.eyebrow         != null ? toc.eyebrow         : 'Desde';
    const sinceYear    = company.foundedYear || cb.foundedYear || (new Date().getFullYear() - 6);
    const logo         = company.logo || 'assets/images/logo.png';

    return {
      type: 'cover',
      html: `
        <div class="book-page">
          <div class="book-cover">
            <img
              src="${escapeHtml(logo)}"
              alt="Logo Conquista Brasileira Pastelaria"
              class="book-cover__logo"
              loading="eager"
              decoding="async"
              width="150"
              height="150"
            />
            <span class="book-cover__brand">${escapeHtml(brand)}</span>
            <h1 class="book-cover__title">
              ${escapeHtml(title)}
              <span class="accent">${escapeHtml(titleAccent)}</span>
            </h1>
            <p class="book-cover__tagline">${escapeHtml(tagline)}</p>
            <button type="button" class="book-cover__start" data-flip-target="1" aria-label="${escapeHtml(cta)}">
              <span>${escapeHtml(cta)}</span>
              <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </button>
            <span class="book-cover__ornament">${escapeHtml(sincePrefix)} ${escapeHtml(String(sinceYear))}</span>
          </div>
        </div>
      `
    };
  }

  // 2. ÍNDICE
  // Recebe `anchors` = [{ name, firstPageIndex }, ...] onde firstPageIndex
  // é o índice 0-based da PRIMEIRA página daquela seção no array `pages`
  // final (que é montado no buildPages).
  function indexPage(anchors) {
    const items = anchors.map((a, i) => {
      const pageNum = a.firstPageIndex;
      return `
        <li>
          <button type="button" class="menu-toc__item" data-flip-target="${pageNum}" aria-label="Ir para ${escapeHtml(a.name)} — página ${pageNum + 1}">
            <span class="menu-toc__num">${String(i + 1).padStart(2, '0')}</span>
            <span class="menu-toc__name">${escapeHtml(a.name)}</span>
            <span class="menu-toc__dots" aria-hidden="true"></span>
            <span class="menu-toc__page">${pageNum + 1}</span>
          </button>
        </li>
      `;
    }).join('');

    return {
      type: 'index',
      html: `
        <div class="book-page book-page--right">
          <div class="book-page__inner">
            <header class="menu-section-head">
              <span class="menu-section-eyebrow">Bem-vindo</span>
              <h2 class="menu-section-title">Sumário</h2>
              <p class="menu-section-lead">
                Toque em uma seção para folhear direto até ela. Use as setas ou as teclas ← → para virar página a página.
              </p>
            </header>
            <ul class="menu-toc" role="navigation" aria-label="Sumário do cardápio">
              ${items}
            </ul>
          </div>
        </div>
      `
    };
  }

  // 3. PAGINAÇÃO DE SEÇÃO
  // Quebra uma seção em 1..N "blocos" prontos para virar páginas.
  // Cada bloco = { section, subgroups, isContinuation, pageNumber, totalPages }.
  //
  // REGRAS (medidas via headless Chrome — MAX_ITEMS_PER_PAGE = 12 inicial;
  // número real decidido em runtime por rebalancePages):
  //   - 1 subgrupo com ≤ 10 itens           → 1 bloco (todos os itens, sem continuação)
  //   - 1 subgrupo com 11-20 itens          → 2 blocos (~metade cada, 2º com continuação)
  //   - 1 subgrupo com 21-30 itens          → 3 blocos (~terço cada, 2º/3º com continuação)
  //   - 1 subgrupo com > 30 itens           → ceil(N/10) blocos
  //   - 2+ subgrupos (split)                → conta itens somando os 2 subgrupos
  //                                            e aplica a mesma regra
  //   - Bloco único usa coluna simples; bloco com split (2+ subgrupos) usa
  //     menu-split lado a lado.
  //
  // OBS: quando uma seção split precisa de 2+ blocos, o 2º+ bloco usa
  // apenas o subgrupo "largo" (o que tinha mais itens) com continuação.
  // Isso evita ter 4 cabeçalhos numa página.
  function paginateSection(section) {
    const isTwoSubs = section.subgroups.length >= 2;
    const flatItemCount = section.subgroups.reduce((s, sg) => s + sg.items.length, 0);
    const blocks = [];
    const totalPages = Math.max(1, Math.ceil(flatItemCount / MAX_ITEMS_PER_PAGE));

    if (totalPages === 1) {
      // 1 página — split se houver 2+ subgrupos
      blocks.push({
        section,
        subgroups: section.subgroups,
        isContinuation: false,
        pageNumber: 1,
        totalPages: 1,
        isSplit: isTwoSubs
      });
      return blocks;
    }

    if (!isTwoSubs) {
      // 1 subgrupo: dividir os itens em N pedaços
      const items = section.subgroups[0].items;
      const subInfo = section.subgroups[0];
      const perPage = Math.ceil(items.length / totalPages);
      for (let p = 0; p < totalPages; p++) {
        const slice = items.slice(p * perPage, (p + 1) * perPage);
        if (!slice.length) continue;
        // Subgrupo "virtual" só com esse pedaço — pra reusar flavorListHTML
        const vSub = Object.assign({}, subInfo, { items: slice });
        blocks.push({
          section,
          subgroups: [vSub],
          isContinuation: p > 0,
          pageNumber: p + 1,
          totalPages,
          isSplit: false
        });
      }
      return blocks;
    }

    // 2+ subgrupos, múltiplas páginas: a 1ª página usa o split normal
    // (cabeçalho + 2 subgrupos com até MAX_ITEMS_PER_PAGE itens somados).
    // Páginas seguintes usam o subgrupo que tem mais itens restantes.
    // Aqui a regra simples: se a soma cabe em 1 página, OK; senão a 1ª
    // página mostra os primeiros MAX_ITEMS_PER_PAGE itens misturados (primeiro
    // metade de cada subgrupo), e as seguintes mostram o resto do sub
    // maior, depois o resto do sub menor.
    const [subA, subB] = section.subgroups;
    // Pega os primeiros N itens de cada subgrupo pra 1ª página (split)
    const firstA = subA.items.slice(0, MAX_ITEMS_PER_PAGE);
    let firstB = subB.items.slice(0, Math.max(0, MAX_ITEMS_PER_PAGE - firstA.length));

    // === Anti-duplicação visual (split com subgrupos de mesmo sabor) ===
    // Quando os subgrupos compartilham sabores (ex: "Sucos" tem 400ml,
    // 500ml e 1L com os mesmos sabores), o slice ingênuo pode colocar
    // "Laranja" (do 400ml, coluna esquerda) E "Laranja" (do 500ml, coluna
    // direita) na MESMA página — o leitor vê o sabor duplicado lado a lado.
    //
    // Regra: percorre firstB do INÍCIO e, enquanto houver colisão de `name`
    // com qualquer item de firstA, move o item de firstB pra próxima página
    // (via `restB`). Quando firstB esvazia, a 1ª página fica só com subA.
    if (firstB.length) {
      const firstANames = new Set(firstA.map(it => it.name));
      while (firstB.length && firstANames.has(firstB[0].name)) {
        firstB = firstB.slice(1);
      }
    }

    const vSubA1 = Object.assign({}, subA, { items: firstA });
    const vSubB1 = Object.assign({}, subB, { items: firstB });
    blocks.push({
      section,
      subgroups: [vSubA1, vSubB1],
      isContinuation: false,
      pageNumber: 1,
      totalPages,
      isSplit: true
    });
    // Resto de A
    const restA = subA.items.slice(firstA.length);
    const restB = subB.items.slice(firstB.length);
    let pageNum = 2;
    // Cria blocos a partir do que sobrou. Se sobrou muito, divide.
    // Aplica MAX_ITEMS_PER_PAGE por bloco (sem split agora).
    function pushRestBlocks(itemsArr, subInfo) {
      const total = itemsArr.length;
      if (total === 0) return;
      const pages = Math.ceil(total / MAX_ITEMS_PER_PAGE);
      const per = Math.ceil(total / pages);
      for (let p = 0; p < pages; p++) {
        const slice = itemsArr.slice(p * per, (p + 1) * per);
        if (!slice.length) continue;
        const vSub = Object.assign({}, subInfo, { items: slice });
        blocks.push({
          section,
          subgroups: [vSub],
          isContinuation: true,
          pageNumber: pageNum++,
          totalPages,
          isSplit: false
        });
      }
    }
    pushRestBlocks(restA, subA);
    pushRestBlocks(restB, subB);

    return blocks;
  }

  // 4. PÁGINA DE CONTEÚDO
  // Recebe um BLOCO (resultado de paginateSection), não a seção inteira.
  //   - block.section       → seção (header, tag, descrição)
  //   - block.subgroups     → subgrupos a renderizar (1 ou 2)
  //   - block.isContinuation → se true, mostra "Continuação" no header
  //   - block.isSplit        → se true, renderiza 2 colunas com 1 subgrupo cada
  function contentPage(block, side) {
    const { section, subgroups, isContinuation, isSplit } = block;
    const isFiller = section.id === '__filler__';
    // O título segue o nome do subgrupo principal (que muda quando o usuário
    // renomeia no admin). Em páginas split, o lado "left" usa o primeiro
    // subgrupo e o "right" usa o segundo.
    //
    // Cuidado com o caso onde o anti-dupe de `paginateSection` esvaziou
    // um dos subgrupos (firstB ficou []). Nesse cenário o `subgroups[1]`
    // existe mas tem `items: []` — o título tem que ser o subgrupo que
    // REALMENTE tem itens na página. Pega o 1º subgrupo com itens.
    const nonEmpty = subgroups.filter(sg => sg.items && sg.items.length > 0);
    const primary = (nonEmpty.length >= 2 && side === 'right')
      ? nonEmpty[1]
      : nonEmpty[0] || subgroups[0];
    const head = isFiller ? '' : sectionHeadHTML(section, { continuation: isContinuation }, primary);

    let bodyHTML;
    if (isFiller) {
      // Página filler (paridade) — sem conteúdo, sem número visível
      bodyHTML = '';
    } else if (isSplit && subgroups.length >= 2) {
      // 2 subgrupos lado a lado, com borda entre eles
      bodyHTML = `${head}<div class="menu-split">${subgroups.map(sg => flavorListHTML(sg)).join('')}</div>`;
    } else {
      // 1 subgrupo, coluna única
      bodyHTML = `${head}${flavorListHTML(subgroups[0])}`;
    }

    return {
      type: 'content',
      sectionId: section.id,
      html: `
        <div class="book-page book-page--${side}${isFiller ? ' book-page--filler' : ''}">
          <div class="book-page__inner">
            ${bodyHTML}
          </div>
        </div>
      `
    };
  }

  // 4. CONTRACAPA
  // Espelho da capa: mesma estética (couro preto + textura + costura),
  // mas com a lombada / costura do lado DIREITO e o conteúdo trocado
  // (brand, "Faça seu pedido", dados da loja, CTA WhatsApp).
  function backCoverPage(config) {
    const c = config.company;
    // CMS-patch: textos da contracapa vêm de `config.cardapio.backCover.*`
    // com fallback inline aos literais atuais.
    const cb = config.cardapio || {};
    const bk = cb.backCover || {};
    const wa = config.whatsappMessages || {};
    const company = config.company || {};

    const eyebrow = bk.eyebrow    != null ? bk.eyebrow    : 'Atendimento de família';
    const title   = bk.title      != null ? bk.title      : 'Faça seu';
    const accent  = bk.titleAccent != null ? bk.titleAccent : 'Pedido Agora';
    const hours   = bk.hours      != null ? bk.hours      : 'Ter–Sáb 7h–22h30 · Dom 7h–15h';
    const footer  = bk.footer     != null ? bk.footer     : 'feito com ♥ em Cajamar';
    const cta     = bk.cta        != null ? bk.cta        : 'Chamar no WhatsApp';
    const waMsg   = wa.backCover  != null ? wa.backCover  : 'Olá, gostaria de fazer um pedido na Conquista Brasileira';

    return {
      type: 'back-cover',
      html: `
        <div class="book-page">
          <div class="book-cover book-cover--back">
            <span class="book-cover__ornament">${escapeHtml(eyebrow)}</span>
            <span class="book-cover__brand">${escapeHtml(c.shortName || c.name)}</span>
            <h1 class="book-cover__title">
              ${escapeHtml(title)}
              <span class="accent">${escapeHtml(accent)}</span>
            </h1>
            <ul class="book-back-cover__info">
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 7-8 12-8 12s-8-5-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                <span><strong>Endereço</strong>${escapeHtml(c.addressShort || c.address)}</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>
                <span><strong>WhatsApp</strong>${escapeHtml(c.whatsappDisplay || c.phone)}</span>
              </li>
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span><strong>Horário</strong>${escapeHtml(hours)}</span>
              </li>
            </ul>
            <a class="book-cover__start book-cover__start--whatsapp"
               href="https://wa.me/${encodeURIComponent(c.whatsapp)}?text=${encodeURIComponent(waMsg)}"
               target="_blank" rel="noopener"
               aria-label="${escapeHtml(cta)}">
              <svg viewBox="0 0 24 24" aria-hidden="true" class="icon-whatsapp" fill="currentColor"><path d="M17.498 14.382c-.301-.15-1.767-.867-2.04-.966-.273-.101-.473-.15-.673.15-.2.301-.771.964-.944 1.162-.175.2-.349.225-.646.075-.3-.15-1.263-.465-2.403-1.485-.888-.795-1.484-1.77-1.66-2.07-.174-.3-.019-.465.13-.615.136-.135.301-.345.451-.523.146-.181.194-.301.297-.496.1-.21.049-.375-.025-.524-.075-.15-.672-1.62-.922-2.206-.24-.584-.487-.51-.672-.51-.172-.015-.371-.015-.571-.015-.2 0-.523.074-.797.359-.273.3-1.045 1.02-1.045 2.475s1.07 2.865 1.219 3.075c.149.195 2.105 3.195 5.1 4.485.714.3 1.27.48 1.704.629.714.227 1.365.195 1.88.121.574-.091 1.767-.721 2.016-1.426.255-.705.255-1.29.18-1.425-.074-.135-.27-.21-.57-.345m-5.446 7.443h-.016c-1.77 0-3.524-.48-5.055-1.38l-.36-.214-3.75.975 1.005-3.645-.239-.375a9.869 9.869 0 0 1-1.516-5.26c0-5.445 4.455-9.885 9.942-9.885 2.654 0 5.145 1.035 7.021 2.91 1.875 1.875 2.909 4.366 2.909 7.021-.004 5.444-4.46 9.885-9.935 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.334.101 11.893c0 2.096.549 4.14 1.595 5.945L0 24l6.335-1.652a12.062 12.062 0 0 0 5.71 1.447h.006c6.585 0 11.946-5.336 11.949-11.896 0-3.176-1.24-6.165-3.495-8.411"/></svg>
              <span>${escapeHtml(cta)}</span>
            </a>
            <p class="book-cover__footer">${escapeHtml(footer)}</p>
          </div>
        </div>
      `
    };
  }

  // ============== Builder ==============

  // Retorna um array de { type, html, sectionId? } NA ORDEM DO LIVRO.
  // Página 0 = capa; página 1 = índice; páginas internas em sequência;
  // última página = contracapa.
  //
  // REGRA DE OURO: o total de páginas é SEMPRE PAR (1 capa + 1 índice
  // + Σblocos + 1 contracapa), pra StPageFlip fechar a contracapa como
  // capa dura. A paridade é garantida em UM ÚNICO LUGAR (etapa 4),
  // via divisão de blocos e/ou página filler. Sem pré-mesclagem, sem
  // lógica distribuída — uma única verificação cobre 100% dos casos.
  function buildPages(config, sections) {
    // === GERAÇÃO DE BLOCOS POR SEÇÃO (etapa 2) ===
    // Cada seção vira 1..N blocos. Cada bloco vira 1 página.
    const allBlocks = sections.map(sec => ({
      section: sec,
      blocks: paginateSection(sec)
    }));

    // === GARANTIA DE PARIDADE (etapa 4) — ÚNICA FONTE DA VERDADE ===
    // Total final = 1 (capa) + 1 (índice) + Σblocos + 1 (contracapa)
    //             = Σblocos + 3
    // Para o total ser PAR, Σblocos precisa ser ÍMPAR.
    //
    // Por isso: enquanto Σblocos for PAR, adiciona 1 bloco (dividindo
    // ou usando filler). O loop SEMPRE converge.
    let totalInternalPages = allBlocks.reduce((s, x) => s + x.blocks.length, 0);

    function trySplitOneBlock() {
      for (let s = allBlocks.length - 2; s >= 0; s--) {
        const target = allBlocks[s];
        for (let b = target.blocks.length - 1; b >= 0; b--) {
          const block = target.blocks[b];
          if (!block || block.subgroups.length !== 1) continue;
          const subInfo = block.subgroups[0];
          if (subInfo.items.length < 2) continue;

          const mid = Math.ceil(subInfo.items.length / 2);
          const firstHalf = subInfo.items.slice(0, mid);
          const secondHalf = subInfo.items.slice(mid);
          block.subgroups = [Object.assign({}, subInfo, { items: firstHalf })];
          block.totalPages = block.totalPages + 1;
          const newBlock = {
            section: block.section,
            subgroups: [Object.assign({}, subInfo, { items: secondHalf })],
            isContinuation: true,
            pageNumber: block.pageNumber + 1,
            totalPages: block.totalPages,
            isSplit: false
          };
          target.blocks.splice(b + 1, 0, newBlock);
          totalInternalPages++;
          return true;
        }
      }
      return false;
    }

    // IMPORTANTE: Σblocos precisa ser ÍMPAR (porque +3 capas = par).
    // Se Σblocos for PAR, adiciona 1 bloco (divisão ou filler).
    let safety = 0;
    while (totalInternalPages % 2 === 0) {
      if (!trySplitOneBlock()) {
        allBlocks.push({
          section: { id: '__filler__', name: '', description: '', tag: null, subgroups: [] },
          blocks: [{
            section: { id: '__filler__', name: '', description: '', tag: null, subgroups: [] },
            subgroups: [{
              id: '__filler__', name: '', groupName: '', subgroupName: '',
              items: []
            }],
            isContinuation: false,
            pageNumber: 1,
            totalPages: 1,
            isSplit: false
          }]
        });
        totalInternalPages++;
      }
      safety++;
      if (safety > 100) {
        console.warn('[Cardápio] Loop de paridade excedeu 100 iterações.');
        break;
      }
    }

    // === MONTAGEM DAS PÁGINAS (etapa 3) ===
    // pages[0] = capa
    // pages[1] = índice (placeholder — será regenerado no final)
    // pages[2..] = conteúdo (1 página por bloco)
    // pages[N-1] = contracapa
    const pages = [];
    pages.push(coverPage(config));
    // Placeholder do índice — índice real é montado DEPOIS pra ter os
    // firstPageIndex corretos.
    pages.push({ type: 'index', html: '' });

    // anchors: lista de { name, firstPageIndex } na ordem das seções
    // (filler pages são invisíveis no TOC)
    const anchors = [];
    allBlocks.forEach(({ section, blocks }) => {
      if (section.id === '__filler__') {
        // Pula filler (sem nome, sem anchor no sumário)
        blocks.forEach(block => {
          const side = (pages.length % 2 === 0) ? 'left' : 'right';
          pages.push(contentPage(block, side));
        });
        return;
      }
      const firstPageIndex = pages.length; // antes do push, é o índice do próximo
      // O anchor do sumário segue o nome do subgrupo principal (que muda
      // quando o admin renomeia o subgrupo). Fallback pro section.name.
      const anchorName = (section.subgroups && section.subgroups[0] && section.subgroups[0].subgroupName) || section.name;
      anchors.push({ name: anchorName, firstPageIndex });
      blocks.forEach(block => {
        const side = (pages.length % 2 === 0) ? 'left' : 'right';
        pages.push(contentPage(block, side));
      });
    });

    pages.push(backCoverPage(config));

    // === REGENERA O ÍNDICE COM OS ANCHORS CORRETOS ===
    pages[1] = indexPage(anchors);

    return pages;
  }

  // ============== REBALANCEAMENTO BASEADO EM DOM ==============
  // A constante MAX_ITEMS_PER_PAGE acima é um TETO INICIAL pra paginação
  // proporcional — não uma garantia de que cabe. Esta seção mede o DOM
  // real, move o último item que estourou pra próxima página e itera até
  // convergir. Resolve o bug "X-Contra Filé cortado embaixo" em Baguetes
  // e blinda o cardápio contra crescimento dinâmico (admin acrescenta
  // sabores). Detalhes em memory/conquista-brasileira-site.md.

  // Tolerância em px pra considerar overflow real (sub-pixel rendering).
  const OVERFLOW_TOLERANCE = 2;
  // Limite duro de iterações pra evitar loop infinito em caso patológico.
  const MAX_REBALANCE_ITERATIONS = 5;

  // Mede o quanto o conteúdo interno de uma página ESTOUROU sua altura.
  // Retorna pixels de overflow (>0 = precisa mover item).
  // Páginas sem .book-page__inner (capas) retornam 0 — não devem ser
  // rebalanceadas.
  function measurePageOverflow(wrapper) {
    // Mede o overflow REAL do último item contra a altura do .book-page
    // (que é FIXADA durante o build via inline !important).
    //
    // PEGADINHA FUNDAMENTAL: durante o build, todos os 36 wrappers estão
    // empilhados verticalmente no fluxo do documento (StPageFlip ainda
    // não rodou — não há position:absolute). Por isso `page.getBoundingClientRect().bottom`
    // retorna a coordenada Y ABSOLUTA NO DOCUMENTO (cumulativa, ex: 5245px,
    // 5840px, ..., 19525px, 20715px), NÃO a base da página. Comparar
    // `lastR.bottom - pageR.bottom` é estruturalmente errado: ambos crescem
    // juntos conforme descemos no documento.
    //
    // Correção: medir contra `pageR.top + pageR.height` (base RELATIVA da
    // página) — é o que define a "linha de corte" daquela página específica.
    const page = wrapper.querySelector('.book-page');
    if (!page) return 0;
    const pageR = page.getBoundingClientRect();
    if (pageR.height === 0) {
      // Página ainda não foi dimensionada (StPageFlip roda depois). Não é
      // possível medir overflow real — retornamos 0 pra não mover nada.
      return 0;
    }

    const lists = wrapper.querySelectorAll('.menu-flavor-list');
    let lastFlavor = null;
    lists.forEach(list => {
      const items = list.querySelectorAll('.menu-flavor');
      if (items.length) {
        const c = items[items.length - 1];
        if (!lastFlavor ||
            (c.compareDocumentPosition(lastFlavor) & Node.DOCUMENT_POSITION_PRECEDING)) {
          lastFlavor = c;
        }
      }
    });
    if (!lastFlavor) return 0;
    const lastR = lastFlavor.getBoundingClientRect();
    // overflow = (bottom absoluto do último item) - (base RELATIVA da página)
    const pageBottomRel = pageR.top + pageR.height;
    const overflow = lastR.bottom - pageBottomRel;
    return overflow;
  }

  // Retorna o último <li.menu-flavor> de QUALQUER coluna (se split).
  // Não move entre colunas da mesma página — só entre páginas inteiras.
  // `compareDocumentPosition` é usado pra achar o último nó do documento
  // entre várias listas.
  function getLastFlavor(wrapper) {
    const lists = wrapper.querySelectorAll('.menu-flavor-list');
    if (!lists.length) return null;
    let last = null;
    lists.forEach(list => {
      const items = list.querySelectorAll('.menu-flavor');
      if (items.length) {
        const candidate = items[items.length - 1];
        if (!last ||
            (candidate.compareDocumentPosition(last) & Node.DOCUMENT_POSITION_PRECEDING)) {
          last = candidate;
        }
      }
    });
    return last;
  }

  // Move o último <li.menu-flavor> do wrapper em fromIdx pra primeira
  // lista do próximo wrapper. Se não há próximo, clona a estrutura da
  // página atual (esvaziando listas) e insere o novo wrapper no array
  // `wrappers` E no DOM (parent é bookEl). O chamador é responsável por
  // sincronizar o array `pages` JS via `syncPagesFromWrappers`.
  function moveLastFlavorToNext(wrappers, fromIdx) {
    const fromWrapper = wrappers[fromIdx];
    const lastFlavor = getLastFlavor(fromWrapper);
    if (!lastFlavor) return { moved: false };

    if (fromIdx + 1 < wrappers.length) {
      const toWrapper = wrappers[fromIdx + 1];
      const toLists = toWrapper.querySelectorAll('.menu-flavor-list');
      if (!toLists.length) return { moved: false };
      toLists[0].appendChild(lastFlavor);
      return { moved: true, newPage: false };
    }
    // Sem próxima página — cria wrapper vazio no DOM e insere no parent.
    // Se o fromWrapper está no DOM (caso normal após mountPages), insere
    // o novo wrapper logo depois dele; senão (caso degenerado), append.
    const newWrapper = createEmptyContentWrapper(fromWrapper);
    wrappers.splice(fromIdx + 1, 0, newWrapper);
    const parent = fromWrapper.parentNode;
    if (parent) {
      const nextSibling = fromWrapper.nextSibling;
      if (nextSibling) {
        parent.insertBefore(newWrapper, nextSibling);
      } else {
        parent.appendChild(newWrapper);
      }
    }
    return { moved: true, newPage: true };
  }

  // Clona a estrutura de uma página de conteúdo (mantém o book-page--left/right
  // e o menu-section-head) e esvazia as listas. O .book-page__number foi
  // removido do template em 2026-08-07 (a pedido do usuário), então não
  // precisamos mais limpá-lo aqui — fica como no-op defensivo.
  function createEmptyContentWrapper(templateWrapper) {
    const clone = templateWrapper.cloneNode(true);
    // Esvazia listas (mantém a estrutura de coluna única ou split)
    clone.querySelectorAll('.menu-flavor-list').forEach(ul => { ul.innerHTML = ''; });
    // No-op defensivo: se algum wrapper antigo ainda tiver .book-page__number
    // (ex: cache do browser), remove pra não duplicar visualmente.
    const num = clone.querySelector('.book-page__number');
    if (num) num.remove();
    // O header fica; syncPagesFromWrappers pode ajustar (ex: virar "Continuação")
    return clone;
  }

  // Loop principal. Recebe `wrappers` (output de mountPages em cardapio-flip.js)
  // — array de <div.book-page-wrapper>. Modifica o DOM in-place. Retorna
  // { totalMoves, newPagesCreated } pra o chamador decidir se precisa
  // re-sincronizar o array `pages` JS.
  function rebalancePages(wrappers) {
    let totalMoves = 0;
    let newPagesCreated = 0;

    for (let iter = 0; iter < MAX_REBALANCE_ITERATIONS; iter++) {
      let iterMoves = 0;
      for (let i = 0; i < wrappers.length; i++) {
        const w = wrappers[i];
        // Pula capas (capa/contracapa têm .book-cover) e filler pages
        // (decorativas, vazias). Páginas de conteúdo sempre têm .menu-flavor-list.
        if (w.querySelector('.book-cover')) continue;
        if (w.querySelector('.book-page--filler')) continue;

        const overflow = measurePageOverflow(w);
        if (overflow > OVERFLOW_TOLERANCE) {
          const result = moveLastFlavorToNext(wrappers, i);
          if (result.moved) {
            iterMoves++;
            if (result.newPage) newPagesCreated++;
          }
        }
      }
      totalMoves += iterMoves;
      if (iterMoves === 0) break; // convergiu
    }

    if (totalMoves > 0) {
      console.info(`[Cardápio] rebalanceamento: ${totalMoves} moves, ${newPagesCreated} página(s) nova(s)`);
    }

    // Sanity check final (cobre o caso de overflow < tolerância mas > 0)
    let remaining = 0;
    for (let i = 0; i < wrappers.length; i++) {
      const w = wrappers[i];
      if (w.querySelector('.book-cover')) continue;
      if (w.querySelector('.book-page--filler')) continue;
      if (measurePageOverflow(w) > OVERFLOW_TOLERANCE) remaining++;
    }
    if (remaining > 0) {
      console.warn(`[Cardápio] rebalanceamento não convergiu: ${remaining} página(s) ainda com overflow > ${OVERFLOW_TOLERANCE}px`);
    }

    return { totalMoves, newPagesCreated };
  }

  // Reconstrói o array `pages` JS a partir do DOM resultante do rebalanceamento.
  // Preserva capa (pages[0]), contracapa (pages[N-1]) e re-monta o índice
  // (pages[1]) com anchors atualizados. Páginas de conteúdo (pages[2..N-3])
  // são reconstruídas lendo o innerHTML do wrapper correspondente (que pode
  // ter ganhado novos itens vindos da página anterior).
  //
  // Quando newPagesCreated > 0, a paridade Σblocos mudou — pode ter virado
  // PAR quando deveria ser ÍMPAR (capa dura). Re-roda a lógica de paridade
  // (trySplitOneBlock equivalente) chamando buildPages novamente se preciso.
  function syncPagesFromWrappers(wrappers, originalPages) {
    // Estrutura esperada do array pages:
    //   pages[0] = capa (coverPage)
    //   pages[1] = índice (indexPage placeholder)
    //   pages[2..pages.length-2] = conteúdo
    //   pages[pages.length-1] = contracapa (backCoverPage)
    if (!originalPages || originalPages.length < 4) return originalPages;
    if (wrappers.length !== originalPages.length - 2) {
      // Comprimento divergiu — rebalanceamento criou/removou wrappers
      // mas o array pages não bate. Caso raro; log e retorna original.
      console.warn('[Cardápio] syncPagesFromWrappers: comprimento divergiu',
        { wrappers: wrappers.length, pagesContent: originalPages.length - 2 });
      // Tentar sincronizar mesmo assim, expandindo pages se necessário.
    }

    const newPages = [];
    newPages.push(originalPages[0]); // capa preservada
    // Índice placeholder — será regenerado abaixo
    newPages.push({ type: 'index', html: '' });

    // Recalcula anchors (primeira página de cada seção no novo layout).
    // Como o rebalanceamento redistribui itens mas NÃO muda ordem entre
    // seções, as seções continuam na mesma ordem relativa; só os anchors
    // podem ter mudado de índice.
    const anchors = [];
    let contentIdx = 0; // índice no array wrappers
    for (let i = 2; i < originalPages.length - 1; i++) {
      const orig = originalPages[i];
      if (orig.type !== 'content') continue;
      // Pode ter ficado sem wrapper correspondente (criamos wrappers novos
      // mas o loop acima já itera no originalPages). Pega o wrapper pelo
      // índice contentIdx.
      const wrapper = wrappers[contentIdx++];
      if (!wrapper) break;

      // Lê o HTML atualizado do wrapper (pode ter ganhado item movido)
      const html = wrapper.innerHTML;
      // Recalcula side baseado na nova posição em newPages
      const side = (newPages.length % 2 === 0) ? 'left' : 'right';
      // Substitui a classe side no HTML (estava 'left'/'right' do original;
      // pode ter virado outra coisa após mover wrappers)
      const updatedHtml = html
        .replace(/book-page--(left|right)/, `book-page--${side}`);
      newPages.push({
        type: 'content',
        sectionId: orig.sectionId,
        html: updatedHtml
      });

      // Anchor: só adiciona para a 1ª página de cada seção (não-continuação).
      // Detectamos "continuação" procurando o marcador no header.
      const isCont = /menu-section-eyebrow-continuation/.test(html);
      if (!isCont) {
        // Tenta extrair o nome da seção do header (h2.menu-section-title)
        const m = html.match(/<h2 class="menu-section-title">([^<]+)<\/h2>/);
        const name = m ? m[1].trim() : orig.sectionId || '';
        anchors.push({ name, firstPageIndex: newPages.length - 1 });
      }
    }

    newPages.push(originalPages[originalPages.length - 1]); // contracapa
    // Regenera o índice com os anchors novos
    newPages[1] = indexPage(anchors);

    // Se o rebalanceamento criou páginas novas (paridade Σblocos mudou),
    // pode ser que o Σblocos novo seja PAR quando deveria ser ÍMPAR. O livro
    // flip funciona com qualquer paridade (StPageFlip não exige capa dura),
    // mas a memória documenta a preferência por Σblocos ímpar pra estética.
    // Como o rebalanceamento só move itens (não altera a estrutura JS),
    // e cada página nova é uma "extensão" da anterior (não muda a ordem das
    // seções), a paridade só muda de forma controlada. Por simplicidade,
    // confiamos na paridade atual — se quebrar visualmente, ajustar aqui.

    return newPages;
  }

  window.CardapioPages = {
    buildPages,
    rebalancePages,
    syncPagesFromWrappers
  };
})();
