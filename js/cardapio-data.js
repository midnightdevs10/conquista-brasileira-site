/* ================================================================
   CARDAPIO-DATA - Conquista Brasileira Ind e Com de Doces e Salgados Ltda
   Normaliza o menu do config.json numa estrutura de PÁGINAS
   do livro. Sem inventar nada: só reordena, reagrupa subgrupos
   do mesmo "tipo" e devolve um array pronto para virar HTML.
   ================================================================ */

(function () {
  'use strict';

  // escape idêntico ao main.js (mantemos local — não polui o global)
  const escapeHtml = (str = '') => String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  // ============== Mapeamento de páginas ==============
  // Cada "seção" do cardápio aponta para UM OU MAIS subgrupos do config.
  // O id (slug) serve pra amarrar fotos e classes CSS.
  //
  // Esquema:
  //   id, name, description, source: [refs], photo?: 'capa' | 'back' | asset,
  //   split?: boolean  → se true, esta seção é renderizada em 2 colunas
  //                      (uma seção por coluna) na MESMA página
  //
  // Cada `ref` referencia o subgrupo original por `${groupId}.${subgroupId}`.
  //
  // A constante PAGE_SECTIONS_FALLBACK é a fonte de verdade usada quando
  // data/cardapio-sections.json não está disponível. PAGE_SECTIONS é o array
  // em uso, atualizado por loadSections(json) (chamado pelo boot do site).
  // Aceita refs como string "groupId.subgroupId" (legado / fallback) ou
  // como objeto {gid, sgid} (formato editável do admin).
  const PAGE_SECTIONS_FALLBACK = [
    {
      id: 'pasteis-tradicionais',
      name: 'Pastéis Tradicionais',
      description: 'Os clássicos que todo mundo ama — massa crocante e recheio generoso.',
      source: ['pasteis.tradicionais'],
      tag: 'Mais pedidos'
    },
    {
      id: 'pasteis-especiais-1',
      name: 'Pastéis Especiais I',
      description: 'Combinações clássicas com um toque a mais.',
      source: ['pasteis.especiais-1']
    },
    {
      id: 'pasteis-especiais-2',
      name: 'Pastéis Especiais II',
      description: 'Calabresa, frango, lombo, escarola e mais.',
      source: ['pasteis.especiais-2']
    },
    {
      id: 'pasteis-especiais-3',
      name: 'Pastéis Especiais III',
      description: 'À moda, portuguesa, atum, peru — pra quem quer surpreender.',
      source: ['pasteis.especiais-3']
    },
    {
      id: 'pasteis-especiais-4',
      name: 'Pastéis Especiais IV',
      description: 'Camarão, bacalhau, carne seca, salame — os premium da casa.',
      source: ['pasteis.especiais-4']
    },
    {
      id: 'pasteis-doces',
      name: 'Pastéis Doces',
      description: 'Para fechar (ou começar) com chave de ouro.',
      source: ['pasteis.doces']
    },
    {
      id: 'mini-salgados',
      name: 'Mini Salgados',
      description: 'Pronta entrega e sob encomenda — perfeitos para festas e coffee-break.',
      source: [
        'mini.pronta-entrega',
        'mini.mini-pasteis-salgados'
      ],
      split: true
    },
    {
      id: 'mini-doces-combos',
      name: 'Mini Doces & Combos',
      description: 'Mini pastéis doces e combos para toda ocasião.',
      source: [
        'mini.mini-pasteis-doces',
        'mini.combos'
      ],
      split: true
    },
    {
      id: 'mini-encomendas',
      name: 'Mini Sob Encomenda',
      description: 'Esfihas, empadas e sabores especiais sob encomenda.',
      source: ['mini.sob-encomenda']
    },
    {
      id: 'salgados',
      name: 'Salgados Fritos',
      description: 'Coxinha, kibe, esfiha, risólis, bolinho e muito mais.',
      source: ['salgados.lista']
    },
    {
      id: 'sucos',
      name: 'Sucos Naturais',
      description: 'Espremidos na hora, polpa com água ou com leite, açaí e caldo de cana.',
      source: [
        'sucos.400ml',
        'sucos.500ml'
      ],
      split: true
    },
    {
      id: 'sucos-1l-refrigerantes',
      name: 'Sucos 1L & Refrigerantes',
      description: 'Sucos no tamanho família e refrigerantes em 2L e 600ml.',
      source: [
        'sucos.1l',
        'bebidas.refrigerantes'
      ],
      split: true
    },
    {
      id: 'coca-cola',
      name: 'Coca-Cola',
      description: 'Em todos os tamanhos — da caçulinha à 2,5L.',
      source: ['bebidas.coca-cola']
    },
    {
      id: 'agua-h2o',
      name: 'Água & H2O',
      description: 'Para acompanhar o pastel do começo ao fim.',
      source: [
        'bebidas.h2o',
        'bebidas.agua'
      ],
      split: true
    },
    {
      id: 'dolly-cerveja',
      name: 'Dolly & Cerveja',
      description: 'Dolly gelada nos sabores da casa e cervejas em lata, long neck e garrafa.',
      source: [
        'bebidas.dolly',
        'bebidas.cerveja'
      ],
      split: true
    },
    {
      id: 'lanches-baguetes',
      name: 'Lanches: Baguetes',
      description: 'Baguetes generosos com salada, queijo e o sabor que você quiser.',
      source: ['lanches.baguete']
    },
    {
      id: 'lanches-trad-hamburguer',
      name: 'Lanches: Tradicionais & Hambúrguer',
      description: 'Americano, bauru, queijo quente, misto e a linha X.',
      source: [
        'lanches.tradicionais',
        'lanches.hamburguer'
      ],
      split: true
    },
    {
      id: 'lanches-naturais-beirutes',
      name: 'Lanches: Naturais & Beirutes',
      description: 'Lanches naturais no pão integral e beirutes fartos com fritas.',
      source: [
        'lanches.naturais',
        'beirutes.lista'
      ],
      split: true
    },
    {
      id: 'hot-dogs',
      name: 'Hot Dogs',
      description: 'Cachorro-quente completo, com ingredientes à sua escolha.',
      source: ['hot-dogs.lista']
    },
    {
      id: 'pao-de-metro',
      name: 'Pão de Metro',
      description: 'Pão de metro com recheios generosos para a família toda.',
      source: ['pao-de-metro.lista']
    }
  ];

  // Array em uso — começa com o fallback. loadSections(json) pode substituir.
  let PAGE_SECTIONS = PAGE_SECTIONS_FALLBACK.slice();

  // Normaliza uma entrada de source (string legada ou {gid, sgid}) para a
  // string canônica 'groupId.subgroupId' usada por resolveRef.
  function normalizeSource(s) {
    if (typeof s === 'string') return s;
    if (s && typeof s === 'object' && s.gid && s.sgid) return s.gid + '.' + s.sgid;
    return null;
  }

  // ============== Resolve uma ref (ex: "pasteis.simples") para os itens ==============
  function resolveRef(menu, ref) {
    const [groupId, subgroupId] = ref.split('.');
    const group = (menu.groups || []).find(g => g.id === groupId);
    if (!group) return null;
    const sub = (group.subgroups || []).find(s => s.id === subgroupId);
    if (!sub) return null;
    return {
      groupId,
      groupName: group.name,
      subgroupId,
      subgroupName: sub.name,
      items: sub.items || []
    };
  }

  // ============== Constrói uma "seção" do livro a partir do config ==============
  function buildSection(menu, spec) {
    const rawSource = Array.isArray(spec.source) ? spec.source : [];
    const subgroups = rawSource
      .map(normalizeSource)
      .filter(Boolean)
      .map(ref => resolveRef(menu, ref))
      .filter(Boolean);

    if (!subgroups.length) return null;

    return {
      id: spec.id,
      name: spec.name,
      description: spec.description,
      photo: spec.photo || null,
      tag: spec.tag || null,
      split: !!spec.split,
      subgroups
    };
  }

  // ============== API pública ==============
  function buildSections(menu) {
    if (!menu || !Array.isArray(menu.groups)) return [];
    return PAGE_SECTIONS
      .map(spec => buildSection(menu, spec))
      .filter(Boolean);
  }

  // Substitui o array em uso. Aceita o JSON cru vindo de
  // data/cardapio-sections.json (formato { sections: [...] }) ou
  // um array direto.
  function loadSections(input) {
    let arr = null;
    if (Array.isArray(input)) {
      arr = input;
    } else if (input && Array.isArray(input.sections)) {
      arr = input.sections;
    }
    if (!arr) return false;
    PAGE_SECTIONS = arr;
    return true;
  }

  // Devolve o array atualmente em uso (snapshot).
  function getSections() {
    return PAGE_SECTIONS.slice();
  }

  // Conta total de itens (sabores) — usado pra sanidade-check
  function countItems(sections) {
    return sections.reduce((sum, sec) =>
      sum + sec.subgroups.reduce((s, sg) => s + sg.items.length, 0), 0);
  }

  // Conta total de subgrupos
  function countSubgroups(sections) {
    return sections.reduce((sum, sec) => sum + sec.subgroups.length, 0);
  }

  // Expõe a constante de ordem (usada por debug / TOC)
  function getSectionOrder() {
    return PAGE_SECTIONS.map(s => ({ id: s.id, name: s.name }));
  }

  window.CardapioData = {
    buildSections,
    loadSections,
    getSections,
    countItems,
    countSubgroups,
    getSectionOrder,
    escapeHtml
  };
})();
