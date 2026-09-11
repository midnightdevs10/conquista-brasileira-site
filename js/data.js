/* ================================================================
   DATA - Conquista Brasileira Pastelaria
   Configuração embutida (site 100% estático — sem painel admin).
   Pra mudar dados da empresa (telefone, endereço, horários, cardápio),
   edite diretamente este arquivo. A estrutura das seções fica em js/cardapio-data.js.
   ================================================================ */

(function () {
  'use strict';

  const SITE_CONFIG = {
    company: {
      name: 'Conquista Brasileira Pastelaria',
      shortName: 'Conquista Brasileira',
      tagline: 'Os Melhores Pastéis de Cajamar',
      city: 'Cajamar',
      state: 'SP',
      address: 'Av. Ten. Marques, 1077 - Polvilho, Cajamar - SP, 07793-450',
      addressShort: 'Av. Ten. Marques, 1077 - Polvilho',
      phone: '(11) 96380-5855',
      whatsapp: '5511963805855',
      whatsappDisplay: '(11) 96380-5855',
      email: 'contato@conquistabrasileira.com.br',
      instagram: 'https://www.instagram.com/conquista_brasileira',
      facebook: '',
      googleMaps: {
        lat: -23.4103,
        lng: -46.8916
      }
    },
    seo: {
      title: 'Conquista Brasileira Pastelaria | Cajamar SP',
      description: 'Pastelaria em Cajamar com pastéis tradicionais, especiais e doces. Faça seu pedido pelo WhatsApp.',
      keywords: 'pastelaria cajamar, pastel em cajamar, delivery cajamar, pastel brasileiro',
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Restaurant',
        name: 'Conquista Brasileira Pastelaria',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Cajamar',
          addressRegion: 'SP',
          addressCountry: 'BR'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: -23.3558,
          longitude: -46.8761
        },
        priceRange: '$$',
        servesCuisine: 'Pastelaria Brasileira'
      }
    },
    hours: [
      { day: 'Segunda-feira', open: '07:00', close: '22:30', isClosed: false },
      { day: 'Terça-feira', open: '07:00', close: '22:30', isClosed: false },
      { day: 'Quarta-feira', open: '07:00', close: '22:30', isClosed: false },
      { day: 'Quinta-feira', open: '07:00', close: '22:30', isClosed: false },
      { day: 'Sexta-feira', open: '07:00', close: '22:30', isClosed: false },
      { day: 'Sábado', open: '07:00', close: '22:30', isClosed: false },
      { day: 'Domingo', open: '07:00', close: '15:00', isClosed: false }
    ],
    services: [
      {
        icon: 'store',
        image: 'assets/images/interior_2.jpg',
        title: 'Consumo no Local',
        description: 'Espaço acolhedor e familiar para saborear seu pastel quentinho, com ambiente agradável e atendimento atencioso.'
      },
      {
        icon: 'bag',
        image: 'assets/images/quarta-almoco.jpg',
        title: 'Retirada no Local',
        description: 'Faça seu pedido por WhatsApp e retire sem filas. Seu pastel pronto na hora marcada, sem espera.'
      },
      {
        icon: 'bike',
        image: 'assets/images/delivery.png',
        title: 'Delivery',
        description: 'Receba no conforto da sua casa. Entrega rápida em toda a região de Cajamar com pastéis sempre fresquinhos.'
      },
      {
        icon: 'gift',
        image: 'assets/images/encomendas.png',
        title: 'Encomendas',
        description: 'Pastéis especiais em grande quantidade para sua reunião, aniversário ou ocasião especial.'
      },
      {
        icon: 'briefcase',
        image: 'assets/images/marmitex.jpg',
        title: 'Contrato com Empresas',
        description: 'Atendemos empresas com café da manhã, almoço, jantar e marmitex. Planos diários, semanais ou mensais para sua equipe.'
      },
      {
        icon: 'coffee',
        image: 'assets/images/coffee-break.jpeg',
        title: 'Coffee-Break',
        description: 'Coffee-break completo para reuniões, treinamentos e eventos corporativos. Pastéis, mini salgados, doces e bebidas.'
      },
      {
        icon: 'cake',
        image: 'assets/images/aniversarios.jpeg',
        title: 'Aniversários',
        description: 'Monte a festa com a gente: pastéis, mini salgados e doces para surpreender os convidados do aniversariante.'
      },
      {
        icon: 'party',
        image: 'assets/images/confraternizacoes.jpeg',
        title: 'Confraternizações',
        description: 'Encontros de família, fim de ano, confraternização da empresa: a gente prepara tudo com carinho e qualidade.'
      }
    ],
    differentials: [
      {
        icon: 'leaf',
        title: 'Ingredientes Selecionados',
        description: 'Trabalhamos somente com ingredientes frescos e de qualidade, selecionados diariamente para garantir o melhor sabor.'
      },
      {
        icon: 'clock',
        title: 'Atendimento Rápido',
        description: 'Seu pedido é preparado com agilidade sem abrir mão da qualidade. Pediu, prontinho em minutos.'
      },
      {
        icon: 'heart',
        title: 'Ambiente Familiar',
        description: 'Um espaço pensado para receber bem toda a família, com clima acolhedor e atendimento de casa.'
      },
      {
        icon: 'award',
        title: 'Tradição e Qualidade',
        description: 'Receita de pastel que carrega história e sabor. A massa crocante e o recheio generoso são a nossa marca.'
      },
      {
        icon: 'tag',
        title: 'Preço Acessível',
        description: 'Sabor e qualidade que cabem no bolso. Pastéis com recheio generoso e preço justo para toda a família.'
      },
      {
        icon: 'shopping-bag',
        title: 'Retirada Prática',
        description: 'Pediu pelo WhatsApp? Retira no balcão sem fila, no horário combinado, sem complicação.'
      }
    ],
    faq: [
      {
        question: 'Vocês fazem entrega?',
        answer: 'Sim! Atendemos toda a região de Cajamar com delivery próprio, sempre mantendo a qualidade e o calor do pastel saindo da fritura. Para saber o valor e o tempo de entrega para o seu bairro, é só chamar no WhatsApp.'
      },
      {
        question: 'Aceitam cartão e Pix?',
        answer: 'Sim, aceitamos cartão de crédito, débito e Pix, além de dinheiro. Para delivery e retirada, o pagamento é combinado direto pelo WhatsApp.'
      },
      {
        question: 'Tem estacionamento no local?',
        answer: 'Sim, contamos com estacionamento próprio para clientes, com vagas fáceis e seguras para você vir retirar ou saborear aqui conosco.'
      },
      {
        question: 'Posso fazer encomendas para eventos?',
        answer: 'Pode sim! Atendemos festas, confraternizações, eventos corporativos e reuniões familiares. Faça sua encomenda com pelo menos 24h de antecedência pelo WhatsApp.'
      },
      {
        question: 'Tem opções doces no cardápio?',
        answer: 'Sim, temos uma linha completa de pastéis doces: chocolate, doce de leite, Romeu e Julieta, banana com canela, leite ninho e Nutella.'
      },
      {
        question: 'Qual o horário de funcionamento?',
        answer: "Atendemos de terça a domingo, com horários especiais para almoço (quarta e sexta) e jantar. Confira a aba 'Horário' para os detalhes do nosso funcionamento."
      },
      {
        question: 'O pastel é feito na hora?',
        answer: 'Sempre! Trabalhamos somente com produção sob demanda, para garantir massa crocante, recheio generoso e a temperatura certa na hora de servir.'
      },
      {
        question: 'Atendem com marmitex?',
        answer: 'Sim, nas segundas e nos dias de semana oferecemos a opção de marmitex executiva com comida caseira. Consulte o cardápio do dia pelo WhatsApp.'
      }
    ],
    gallery: [
      {
        src: 'assets/images/quarta-almoco.jpg',
        alt: 'Fachada da Conquista Brasileira Pastelaria em Cajamar',
        caption: 'Nossa Casa',
        description: 'A fachada que já virou ponto de referência no Polvilho.'
      },
      {
        src: 'assets/images/interior_2.jpg',
        alt: 'Salão da Conquista Brasileira com mesas para familias',
        caption: 'Nosso Salão',
        description: 'Ambiente familiar e aconchegante pra saborear no local.'
      },
      {
        src: 'assets/images/interior.jpg',
        alt: 'Balcão de atendimento da Conquista Brasileira',
        caption: 'Balcão de Atendimento',
        description: 'Pedido na hora, atendimento rápido e de família.'
      },
      {
        src: 'assets/images/marmitex.jpg',
        alt: 'Buffet e cozinha da Conquista Brasileira',
        caption: 'Cozinha & Buffet',
        description: 'Tudo feito na hora, com ingredientes selecionados todo dia.'
      }
    ],
    hero: {
      image: 'assets/images/hero-pasteis.png',
      eyebrow: 'Pastelaria Brasileira · Cajamar / SP',
      title: 'Os',
      titleAccent: 'Melhores Pastéis',
      titleSuffix: 'de Cajamar',
      subtitle: 'Tradição, sabor e atendimento de família desde a primeira mordida. Massa crocante, recheio generoso e ingredientes selecionados — prontos para viagem ou para saborear no nosso espaço.',
      floatingTag: { strong: '+30', label: 'sabores' }
      // 'badges' intencionalmente omitido: renderHero só reconstrói os selos
      // se 'badges' existir na config; sem ele, os SVGs hardcoded no
      // index.html (chama/heart/bike/star) são preservados.
    },
    about: {
      paragraphs: [
        'A **Conquista Brasileira Pastelaria** nasceu em Cajamar com uma missão simples: fazer o pastel que a gente gostaria de encontrar — com massa crocante, recheio generoso e aquele sabor que lembra casa de avó.',
        'Trabalhamos com ingredientes frescos, selecionados todo dia, e uma massa que é a nossa marca registrada. Seja no balcão, no delivery ou no nosso salão, o objetivo é o mesmo: **cuidar de cada pedido como se fosse para a nossa própria família**.',
        'Aqui você encontra os clássicos que todo mundo ama, as receitas autorais da casa, opções doces irresistíveis, marmitex executiva de segunda a sexta e a nossa **Sexta da Conquista** — um dia especial que já virou tradição entre os clientes.'
      ],
      features: [
        { title: 'Receita autoral', description: 'Massa e recheios próprios, desenvolvidos com técnica e capricho.' },
        { title: 'Feito na hora', description: 'Produção sob demanda, sempre fresco, sempre quentinho.' },
        { title: 'Atendimento de casa', description: 'Quem chega é recebido como família. Cliente é o nosso ingrediente principal.' }
      ],
      sticker: { prefix: 'desde', year: 2018, suffix: 'Cajamar / SP' },
      images: {
        main: { src: 'assets/images/quarta-almoco.jpg', alt: 'Fachada da Conquista Brasileira Pastelaria em Cajamar' },
        sub: { src: 'assets/images/interior.jpg', alt: 'Ambiente da Conquista Brasileira' }
      }
    },
menu: {
      groups: [
      { id: 'pasteis', name: 'Pastéis', subgroups: [
          { id: 'tradicionais', name: 'Tradicionais', description: '', items: [
                { name: 'Carne', description: '', tag: '', includes: [] },
                { name: 'Palmito', description: '', tag: '', includes: [] },
                { name: 'Pizza', description: '', tag: '', includes: [] },
                { name: 'Queijo', description: '', tag: '', includes: [] },
                { name: 'Frango', description: '', tag: '', includes: [] },
                { name: 'Calabresa', description: '', tag: '', includes: [] }
              ] },
          { id: 'especiais-1', name: 'Especiais N°1', description: '', items: [
                { name: 'Bauru', description: '', tag: '', includes: [] },
                { name: 'Carne com Ovo', description: '', tag: '', includes: [] },
                { name: 'Carne com Queijo', description: '', tag: '', includes: [] },
                { name: 'Carne com Azeitona', description: '', tag: '', includes: [] },
                { name: 'Presunto com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Presunto com Queijo', description: '', tag: '', includes: [] },
                { name: 'À Moda 1', description: 'Carne, ovo e queijo', tag: '', includes: [] },
                { name: 'Pastel Árabe', description: 'Carne, cebola, hortelã, azeitona e limão', tag: '', includes: [] }
              ] },
          { id: 'especiais-2', name: 'Especiais N°2', description: '', items: [
                { name: 'Carne com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Calabresa Temperada', description: '', tag: '', includes: [] },
                { name: 'Calabresa com 2 Queijos', description: '', tag: '', includes: [] },
                { name: 'Calabresa com Queijo e Cebola', description: '', tag: '', includes: [] },
                { name: 'Calabresa com Queijo', description: '', tag: '', includes: [] },
                { name: 'Calabresa com Provolone e Milho', description: '', tag: '', includes: [] },
                { name: 'Escarola com Bacon', description: '', tag: '', includes: [] },
                { name: 'Frango com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Frango com Catupiry e Milho', description: '', tag: '', includes: [] },
                { name: 'Lombo com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Lombo com Queijo', description: '', tag: '', includes: [] },
                { name: 'Lombo com 2 Queijos', description: '', tag: '', includes: [] },
                { name: 'Quatro Queijos', description: '', tag: '', includes: [] }
              ] },
          { id: 'especiais-3', name: 'Especiais N°3', description: '', items: [
                { name: 'À Moda com Bacon', description: 'Carne, presunto, tomate, ovo, queijo e bacon', tag: '', includes: [] },
                { name: 'Portuguesa', description: 'Presunto, queijo, ovo, orégano, ervilha e cebola', tag: '', includes: [] },
                { name: 'Frango com Queijo e Bacon', description: '', tag: '', includes: [] },
                { name: 'Frango com Queijo', description: '', tag: '', includes: [] },
                { name: 'Peito de Peru com Queijo', description: '', tag: '', includes: [] },
                { name: 'Peito de Peru com 2 Queijos', description: '', tag: '', includes: [] },
                { name: 'Presunto com Provolone e Milho', description: '', tag: '', includes: [] },
                { name: 'Atum com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Atum com Queijo', description: '', tag: '', includes: [] },
                { name: 'Atum com 2 Queijos', description: '', tag: '', includes: [] },
                { name: 'À Moda com Catupiry', description: 'Carne, presunto, tomate, ovo, queijo e catupiry', tag: '', includes: [] },
                { name: 'Presunto com Queijo e Ovo', description: '', tag: '', includes: [] },
                { name: 'Presunto com 2 Queijos', description: '', tag: '', includes: [] },
                { name: 'Peito de Peru com Catupiry', description: '', tag: '', includes: [] }
              ] },
          { id: 'especiais-4', name: 'Especiais N°4', description: '', items: [
                { name: 'Bacalhau', description: '', tag: '', includes: [] },
                { name: 'Bacalhau com Carne Seca', description: '', tag: '', includes: [] },
                { name: 'Carne Seca com Queijo', description: '', tag: '', includes: [] },
                { name: 'Carne Seca com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Salame com Queijo', description: '', tag: '', includes: [] },
                { name: 'Salame com 2 Queijos', description: '', tag: '', includes: [] },
                { name: 'Camarão com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Camarão com Palmito', description: '', tag: '', includes: [] },
                { name: 'Camarão com Escarola', description: '', tag: '', includes: [] },
                { name: 'Camarão com Palmito e Escarola', description: '', tag: '', includes: [] },
                { name: 'Camarão com Ervilha', description: '', tag: '', includes: [] },
                { name: 'Camarão com Queijo', description: '', tag: '', includes: [] },
                { name: 'Camarão', description: '', tag: '', includes: [] }
              ] },
          { id: 'doces', name: 'Doces', description: '', items: [
                { name: 'Banana', description: '', tag: '', includes: [] },
                { name: 'Banana com Chocolate', description: '', tag: '', includes: [] },
                { name: 'Banana com Doce de Leite', description: '', tag: '', includes: [] },
                { name: 'Romeu e Julieta', description: '', tag: '', includes: [] },
                { name: 'Chocolate', description: '', tag: '', includes: [] },
                { name: 'Doce de Leite', description: '', tag: '', includes: [] },
                { name: 'Morango com Chocolate', description: '', tag: '', includes: [] }
              ] }
      ] },
      { id: 'salgados', name: 'Salgados', subgroups: [
          { id: 'lista', name: 'Salgados Fritos', description: '', items: [
                { name: 'Kibe', description: '', tag: '', includes: [] },
                { name: 'Kibe com Queijo', description: '', tag: '', includes: [] },
                { name: 'Coxinha', description: '', tag: '', includes: [] },
                { name: 'Bolinho de Carne', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Bauru', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Calabresa', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Hambúrguer', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Calabresa com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Frango com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Carne Seca com Queijo', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Carne com Queijo', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Carne', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Escarola com Queijo', description: '', tag: '', includes: [] },
                { name: 'Esfiha 4 Queijos', description: '', tag: '', includes: [] },
                { name: 'Esfiha Portuguesa', description: '', tag: '', includes: [] },
                { name: 'Risólis de Queijo', description: '', tag: '', includes: [] },
                { name: 'Risólis de Presunto com Queijo', description: '', tag: '', includes: [] },
                { name: 'Bolinho de Carne com Ovo', description: '', tag: '', includes: [] },
                { name: 'Bolinho de Salsicha', description: '', tag: '', includes: [] },
                { name: 'Coxinha com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Torta de Banana', description: '', tag: '', includes: [] },
                { name: 'Empada de Frango com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Empada de Palmito', description: '', tag: '', includes: [] },
                { name: 'Fogazza de Carne com Queijo', description: '', tag: '', includes: [] },
                { name: 'Fogazza de Frango com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Fogazza de Presunto com Queijo', description: '', tag: '', includes: [] },
                { name: 'Espetinho de Frango', description: '', tag: '', includes: [] },
                { name: 'Espetinho de Bacalhau', description: '', tag: '', includes: [] }
              ] }
      ] },
      { id: 'mini', name: 'Mini Salgados', subgroups: [
          { id: 'pronta-entrega', name: 'Pronta Entrega', description: '', items: [
                { name: 'Coxinha', description: '', tag: '', includes: [] },
                { name: 'Bolinho de Queijo', description: '', tag: '', includes: [] },
                { name: 'Kibe', description: '', tag: '', includes: [] },
                { name: 'Risólis', description: '', tag: '', includes: [] },
                { name: 'Bolinho de Carne', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Carne', description: '', tag: '', includes: [] },
                { name: 'Enroladinho de Salsicha', description: '', tag: '', includes: [] },
                { name: 'Empada de Frango com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Empada de Palmito', description: '', tag: '', includes: [] }
              ] },
          { id: 'sob-encomenda', name: 'Sob Encomenda', description: '', items: [
                { name: 'Esfiha de Frango com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Bauru', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Atum', description: '', tag: '', includes: [] },
                { name: 'Esfiha 4 Queijos', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Calabresa', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Calabresa com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Carne com Queijo', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Carne Seca', description: '', tag: '', includes: [] },
                { name: 'Esfiha de Camarão', description: '', tag: '', includes: [] },
                { name: 'Empada de Camarão', description: '', tag: '', includes: [] },
                { name: 'Empada de Carne Seca', description: '', tag: '', includes: [] },
                { name: 'Empada de Chocolate', description: '', tag: '', includes: [] },
                { name: 'Empada de Doce de Leite', description: '', tag: '', includes: [] },
                { name: 'Empada de Escarola', description: '', tag: '', includes: [] }
              ] },
          { id: 'mini-pasteis-salgados', name: 'Mini Pastéis Salgados', description: '', items: [
                { name: 'Carne', description: '', tag: '', includes: [] },
                { name: 'Queijo', description: '', tag: '', includes: [] },
                { name: 'Palmito', description: '', tag: '', includes: [] },
                { name: 'Frango com Catupiry', description: '', tag: '', includes: [] },
                { name: 'Camarão', description: '', tag: '', includes: [] },
                { name: 'Carne Seca', description: '', tag: '', includes: [] },
                { name: 'Atum Temperado', description: '', tag: '', includes: [] },
                { name: 'Bacalhau', description: '', tag: '', includes: [] },
                { name: 'Calabresa', description: '', tag: '', includes: [] },
                { name: 'Cheddar', description: '', tag: '', includes: [] },
                { name: 'Escarola', description: '', tag: '', includes: [] },
                { name: 'Brócolis', description: '', tag: '', includes: [] },
                { name: 'Carne com Queijo', description: '', tag: '', includes: [] },
                { name: 'Presunto e Queijo', description: '', tag: '', includes: [] }
              ] },
          { id: 'mini-pasteis-doces', name: 'Mini Pastéis Doces', description: '', items: [
                { name: 'Chocolate', description: '', tag: '', includes: [] },
                { name: 'Banana', description: '', tag: '', includes: [] },
                { name: 'Banana com Chocolate', description: '', tag: '', includes: [] },
                { name: 'Romeu e Julieta', description: '', tag: '', includes: [] },
                { name: 'Nutella', description: '', tag: '', includes: [] },
                { name: 'Doce de Leite', description: '', tag: '', includes: [] },
                { name: 'Nutella com Morango', description: '', tag: '', includes: [] },
                { name: 'Morango com Chocolate', description: '', tag: '', includes: [] }
              ] },
          { id: 'combos', name: 'Combos', description: '', items: [
                { name: 'Combo 1', description: '', tag: 'combo', includes: ['1 Dolly guaraná', '20 salgados mistos', '1 sobremesa'] },
                { name: 'Combo 2', description: '', tag: 'combo', includes: ['1 Coca-Cola 2L', '50 salgados mistos', '2 sobremesas'] },
                { name: 'Combo 3', description: '', tag: 'combo', includes: ['1 Coca-Cola 2L', '100 salgados mistos', '2 sobremesas'] },
                { name: 'Combo 4', description: '', tag: 'combo', includes: ['1 Sukita laranja 2L', '30 pastéis mistos', '1 sobremesa'] },
                { name: 'Combo 5', description: '', tag: 'combo', includes: ['1 Guaraná 1,5L', '20 pastéis mistos', '20 salgados mistos', '1 sobremesa'] },
                { name: 'Combo 6', description: '', tag: 'combo', includes: ['1 Coca-Cola 2L', '100 pastéis mistos', '2 sobremesas'] },
                { name: 'Combo 7', description: '', tag: 'combo', includes: ['1 Coca-Cola 1L', '10 pastéis de carne', '10 coxinhas', '1 sobremesa'] },
                { name: 'Combo Espeto de Frango', description: '', tag: 'combo', includes: ['5 espetos de frango', '1 Coca-Cola 2L'] }
              ] }
      ] },
      { id: 'sucos', name: 'Sucos', subgroups: [
          { id: '400ml', name: '400ml', description: '', items: [
                { name: 'Laranja', description: 'Natural, espremido na hora', tag: '', includes: [] },
                { name: 'Abacaxi', description: 'Natural, espremido na hora', tag: '', includes: [] },
                { name: 'Limão', description: 'Natural, espremido na hora', tag: '', includes: [] },
                { name: 'Polpa com Água', description: 'Diversos sabores de polpa', tag: '', includes: [] },
                { name: 'Polpa com Leite', description: 'Diversos sabores de polpa', tag: '', includes: [] },
                { name: 'Açaí com Água', description: '', tag: '', includes: [] },
                { name: 'Açaí com Leite', description: '', tag: '', includes: [] },
                { name: 'Caldo de Cana', description: 'Natural, gelado, na medida', tag: '', includes: [] },
                { name: 'Caldo de Cana com Fruta', description: '', tag: '', includes: [] }
              ] },
          { id: '500ml', name: '500ml', description: '', items: [
                { name: 'Laranja', description: 'Natural, espremido na hora', tag: '', includes: [] },
                { name: 'Abacaxi', description: 'Natural, espremido na hora', tag: '', includes: [] },
                { name: 'Limão', description: 'Natural, espremido na hora', tag: '', includes: [] },
                { name: 'Polpa com Água', description: 'Diversos sabores de polpa', tag: '', includes: [] },
                { name: 'Polpa com Leite', description: 'Diversos sabores de polpa', tag: '', includes: [] },
                { name: 'Açaí com Água', description: '', tag: '', includes: [] },
                { name: 'Açaí com Leite', description: '', tag: '', includes: [] },
                { name: 'Caldo de Cana', description: 'Natural, gelado, na medida', tag: '', includes: [] },
                { name: 'Caldo de Cana com Fruta', description: '', tag: '', includes: [] }
              ] },
          { id: '1l', name: '1 Litro', description: '', items: [
                { name: 'Laranja', description: 'Natural, espremido na hora', tag: '', includes: [] },
                { name: 'Abacaxi', description: 'Natural, espremido na hora', tag: '', includes: [] },
                { name: 'Limão', description: 'Natural, espremido na hora', tag: '', includes: [] },
                { name: 'Polpa com Água', description: 'Diversos sabores de polpa', tag: '', includes: [] },
                { name: 'Polpa com Leite', description: 'Diversos sabores de polpa', tag: '', includes: [] },
                { name: 'Açaí com Água', description: '', tag: '', includes: [] },
                { name: 'Açaí com Leite', description: '', tag: '', includes: [] },
                { name: 'Caldo de Cana', description: 'Natural, gelado, na medida', tag: '', includes: [] },
                { name: 'Caldo de Cana com Fruta', description: '', tag: '', includes: [] }
              ] }
      ] },
      { id: 'bebidas', name: 'Bebidas', subgroups: [
          { id: 'coca-cola', name: 'Coca-Cola', description: '', items: [
                { name: 'Coca-Cola 2L', description: '', tag: '', includes: [] },
                { name: 'Coca-Cola 2,5L', description: '', tag: '', includes: [] },
                { name: 'Coca-Cola KS', description: '', tag: '', includes: [] },
                { name: 'Coca-Cola Caçulinha', description: '', tag: '', includes: [] },
                { name: 'Coca-Cola Lata 350ml', description: '', tag: '', includes: [] },
                { name: 'Coca-Cola 1L', description: '', tag: '', includes: [] },
                { name: 'Coca-Cola 600ml', description: '', tag: '', includes: [] }
              ] },
          { id: 'refrigerantes', name: 'Refrigerantes Sabores', description: '', items: [
                { name: 'Refrigerante 2L', description: 'Diversos sabores: Guaraná, Sprite, Fanta, etc.', tag: '', includes: [] },
                { name: 'Refrigerante 600ml', description: 'Diversos sabores', tag: '', includes: [] }
              ] },
          { id: 'h2o', name: 'H2O', description: '', items: [
                { name: 'H2O 500ml', description: '', tag: '', includes: [] }
              ] },
          { id: 'agua', name: 'Água', description: '', items: [
                { name: 'Água com Gás 500ml', description: '', tag: '', includes: [] },
                { name: 'Água sem Gás 500ml', description: '', tag: '', includes: [] }
              ] },
          { id: 'dolly', name: 'Dolly', description: '', items: [
                { name: 'Dolly 2L', description: 'Diversos sabores', tag: '', includes: [] },
                { name: 'Dolly Caçulinha', description: '', tag: '', includes: [] }
              ] },
          { id: 'cerveja', name: 'Cerveja', description: '', items: [
                { name: 'Cerveja Lata 350ml', description: '', tag: '', includes: [] },
                { name: 'Cerveja Latão', description: '', tag: '', includes: [] },
                { name: 'Cerveja Long Neck', description: '', tag: '', includes: [] },
                { name: 'Cerveja Garrafa 600ml', description: '', tag: '', includes: [] }
              ] }
      ] },
      { id: 'lanches', name: 'Lanches', subgroups: [
          { id: 'baguete', name: 'Baguetes', description: '', items: [
                { name: 'X-Frango', description: 'Filé de frango, queijo, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Frango com Bacon', description: 'Filé de frango, queijo, bacon, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Frango com Purê', description: 'Filé de frango, queijo, purê, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Frango com Catupiry', description: 'Filé de frango, queijo, catupiry, salada e maionese', tag: '', includes: [] },
                { name: 'X-Frango com Cheddar', description: 'Filé de frango, queijo, cheddar, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Calabresa', description: 'Calabresa, queijo, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Calabresa com Vinagrete', description: 'Calabresa, queijo, vinagrete e maionese', tag: '', includes: [] },
                { name: 'X-Calabresa Acebolado', description: 'Calabresa, queijo, cebola e maionese', tag: '', includes: [] },
                { name: 'X-Contra Filé', description: 'Contra filé, queijo, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Contra Filé com Bacon', description: 'Contra filé, queijo, bacon, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Contra Filé com Vinagrete', description: 'Contra filé, queijo, vinagrete e maionese', tag: '', includes: [] },
                { name: 'X-Contra Filé Acebolado', description: 'Contra filé, queijo, cebola e maionese', tag: '', includes: [] },
                { name: 'X-Salame', description: 'Salame, queijo, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Salame com Purê', description: 'Salame, queijo, purê, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Salame com Cheddar', description: 'Salame, queijo, cheddar, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Salame com Catupiry', description: 'Salame, queijo, catupiry, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Salame com Ovo', description: 'Salame, queijo, ovo, alface, tomate e maionese', tag: '', includes: [] }
              ] },
          { id: 'tradicionais', name: 'Tradicionais', description: '', items: [
                { name: 'Americano', description: 'Pão francês, presunto, queijo, ovo, alface e tomate', tag: '', includes: [] },
                { name: 'Bauru', description: 'Pão francês, presunto, queijo, tomate e orégano', tag: '', includes: [] },
                { name: 'Queijo Quente', description: 'Pão francês e queijo', tag: '', includes: [] },
                { name: 'Misto Quente', description: 'Pão francês, presunto e queijo', tag: '', includes: [] }
              ] },
          { id: 'hamburguer', name: 'Com Hambúrguer', description: '', items: [
                { name: 'Hambúrguer', description: 'Hambúrguer e maionese', tag: '', includes: [] },
                { name: 'X-Burguer', description: 'Hambúrguer e queijo', tag: '', includes: [] },
                { name: 'X-Maionese', description: 'Hambúrguer, queijo e maionese', tag: '', includes: [] },
                { name: 'X-Salada', description: 'Hambúrguer, queijo, salada e maionese', tag: '', includes: [] },
                { name: 'X-Catupiry', description: 'Hambúrguer, queijo, catupiry, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Cheddar', description: 'Hambúrguer, queijo, cheddar, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Egg Salada', description: 'Hambúrguer, queijo, ovo, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Egg Duplo', description: '2 hambúrgueres, queijo, ovo, alface, tomate e maionese', tag: '', includes: [] },
                { name: 'X-Bacon', description: 'Hambúrguer, queijo, bacon e maionese', tag: '', includes: [] },
                { name: 'X-Tudo', description: '2 hambúrgueres, queijo, bacon, catupiry, presunto, calabresa, ovo, alface, tomate e maionese', tag: '', includes: [] }
              ] },
          { id: 'naturais', name: 'Naturais', description: '', items: [
                { name: 'Queijo Branco', description: 'Pão integral, queijo branco, maionese, alface e tomate', tag: '', includes: [] },
                { name: 'Frango', description: 'Pão integral, frango, azeitona, cenoura, maionese, alface e tomate', tag: '', includes: [] },
                { name: 'Atum', description: 'Pão integral, atum, azeitona, cenoura, maionese, alface e tomate', tag: '', includes: [] },
                { name: 'Frios', description: 'Pão integral, queijo, presunto, maionese, alface e tomate', tag: '', includes: [] },
                { name: 'Salame', description: 'Pão integral, queijo, salame, maionese, alface e tomate', tag: '', includes: [] },
                { name: 'Peito de Peru', description: 'Pão integral, queijo, peito de peru, maionese, alface e tomate', tag: '', includes: [] }
              ] }
      ] },
      { id: 'beirutes', name: 'Beirutes', subgroups: [
          { id: 'lista', name: 'Beirutes', description: '', items: [
                { name: 'Presunto', description: 'Presunto, queijo, 2 ovos, maionese, salada e fritas', tag: '', includes: [] },
                { name: 'Peito de Peru', description: 'Peito de peru, queijo, maionese, salada e fritas', tag: '', includes: [] },
                { name: 'Calabresa', description: 'Calabresa, queijo, maionese, salada e fritas', tag: '', includes: [] },
                { name: 'Salame', description: 'Salame, queijo, 2 ovos, maionese, salada e fritas', tag: '', includes: [] },
                { name: 'Contra-Filé', description: 'Contra filé, queijo, maionese, salada e fritas', tag: '', includes: [] },
                { name: 'Frango', description: 'Filé de frango, queijo, catupiry, maionese, salada e fritas', tag: '', includes: [] },
                { name: 'Contra-Filé Especial', description: '2 pães sírios, contra filé, presunto, bacon, queijo, 2 ovos, maionese, salada e fritas', tag: '', includes: [] },
                { name: 'Frango Especial', description: '2 pães sírios, filé de frango, queijo, catupiry, 2 ovos, maionese, salada e fritas', tag: '', includes: [] }
              ] }
      ] },
      { id: 'hot-dogs', name: 'Hot Dogs', subgroups: [
          { id: 'lista', name: 'Hot Dogs', description: '', items: [
                { name: 'Dog Americano', description: 'Salsicha, ketchup, mostarda e maionese', tag: 'Completo', includes: [] },
                { name: 'Dog Completo N°1', description: 'Salsicha, ketchup, mostarda, maionese, ervilha, vinagrete e purê', tag: 'Completo', includes: [] },
                { name: 'Dog Completo N°2', description: '2 salsichas, ketchup, mostarda, maionese, milho, ervilha, vinagrete, purê, catupiry e batata palha', tag: 'Completo', includes: [] },
                { name: 'Dog Completo N°3', description: '2 salsichas, ketchup, mostarda, maionese, milho, ervilha, vinagrete, purê, catupiry e batata palha', tag: 'Completo', includes: [] },
                { name: 'Dog Completo N°5', description: '2 salsichas, ketchup, mostarda, maionese, milho, ervilha, vinagrete, purê, cheddar e batata palha', tag: 'Completo', includes: [] },
                { name: 'Dog Completo N°6', description: '2 salsichas, ketchup, mostarda, maionese, milho, ervilha, vinagrete, purê, frango desfiado e batata palha', tag: 'Completo', includes: [] },
                { name: 'Dog Completo N°7', description: '2 salsichas, ketchup, mostarda, maionese, milho, ervilha, vinagrete, purê, catupiry, bacon e batata palha', tag: 'Completo', includes: [] },
                { name: 'Dog com Catupiry, Bacon e Cheddar', description: '2 salsichas, ketchup, mostarda, maionese, milho, ervilha, vinagrete, purê, catupiry, cheddar, bacon e batata palha', tag: 'Completo', includes: [] }
              ] }
      ] },
      { id: 'pao-de-metro', name: 'Pão de Metro', subgroups: [
          { id: 'lista', name: 'Pão de Metro', description: '', items: [
                { name: 'Queijo Branco', description: 'Pão integral, queijo branco, maionese, alface e tomate', tag: '', includes: [] },
                { name: 'Frango', description: 'Pão integral, frango, azeitona, cenoura, maionese, alface e tomate', tag: '', includes: [] },
                { name: 'Atum', description: 'Pão integral, atum, azeitona, cenoura, maionese, alface e tomate', tag: '', includes: [] },
                { name: 'Frios', description: 'Pão integral, queijo, presunto, maionese, alface e tomate', tag: '', includes: [] },
                { name: 'Salame', description: 'Pão integral, queijo, salame, maionese, alface e tomate', tag: '', includes: [] },
                { name: 'Peito de Peru', description: 'Pão integral, queijo, peito de peru, maionese, alface e tomate', tag: '', includes: [] }
              ] }
      ] }
      ]
    }
  };

  // Expõe globalmente pro cardapio-flip.js e outros módulos lerem.
  window.SITE_CONFIG = SITE_CONFIG;

  // Dispara evento de "config pronto" — main.js já ouve.
  function dispatch() {
    window.dispatchEvent(new CustomEvent('site:config-ready', { detail: SITE_CONFIG }));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', dispatch);
  } else {
    dispatch();
  }
})();