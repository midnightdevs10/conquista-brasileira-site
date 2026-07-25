/* ================================================================
   DATA - Conquista Brasileira Pastelaria
   Carrega a configuração JSON e expõe globalmente.
   Para personalizar o site, edite ./data/config.json
   ================================================================ */

(function () {
  'use strict';

  /**
   * Configuração padrão embutida (fallback caso o JSON falhe ao carregar).
   * Pode ser substituída totalmente pelo config.json via fetch.
   */
  const FALLBACK_CONFIG = {
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
      instagram: 'https://instagram.com/conquista.brasileira',
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
    }
  };

  /** Cache em window — populado SOMENTE após o fetch resolver, no finally */
  window.SITE_CONFIG = null;

  /** Carrega JSON remoto, com fallback */
  async function loadConfig() {
    try {
      const res = await fetch('data/config.json', { cache: 'no-store' });
      if (!res.ok) throw new Error('Config HTTP ' + res.status);
      const json = await res.json();
      window.SITE_CONFIG = Object.assign({}, FALLBACK_CONFIG, json, {
        company: Object.assign({}, FALLBACK_CONFIG.company, json.company || {}),
        seo: Object.assign({}, FALLBACK_CONFIG.seo, json.seo || {}),
        menu: json.menu || FALLBACK_CONFIG.menu || { groups: [] }
      });
    } catch (err) {
      console.warn('[Site] Usando config fallback:', err.message);
      // Mesmo em erro, popula com o FALLBACK_CONFIG pra evitar travamento
      window.SITE_CONFIG = FALLBACK_CONFIG;
    } finally {
      // Dispara evento para main.js inicializar
      window.dispatchEvent(new CustomEvent('site:config-ready', { detail: window.SITE_CONFIG }));
    }
  }

  // Inicia
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadConfig);
  } else {
    loadConfig();
  }
})();