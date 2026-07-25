<?php
// session_map.php — mapeia cada hit de uso para uma "sessão" legível do site.
// Sessões: 'favicon', 'cabecalho', 'hero', 'sobre', 'cardapio', 'rodape',
//          'galeria', 'servicos', 'seo-og', 'seo-twitter', 'seo-schema',
//          'outro'.

declare(strict_types=1);

if (!function_exists('classifyHit')) {
    /**
     * Recebe um hit do scanUsage e devolve o mesmo hit com campos extras:
     *   - 'session'  : chave da sessão (slug curto)
     *   - 'label'    : rótulo legível em PT-BR
     */
    function classifyHit(array $hit): array
    {
        $cat = $hit['category'] ?? 'other';
        $file = $hit['file'] ?? '';
        $detail = $hit['detail'] ?? '';
        $snippet = $hit['snippet'] ?? '';
        $line = (int) ($hit['line'] ?? 0);

        $session = 'outro';
        $label = $detail;

        if ($cat === 'html' && $file === 'index.html') {
            // Cabeçalho
            if ($line >= 60 && $line < 95) {
                $session = 'cabecalho'; $label = 'Cabeçalho (logo)';
            } elseif (strpos($snippet, 'rel="icon"') !== false) {
                $session = 'favicon'; $label = 'Favicon';
            } elseif (strpos($snippet, 'property="og:image"') !== false) {
                $session = 'seo-og'; $label = 'Open Graph (compartilhamento)';
            } elseif (strpos($snippet, 'name="twitter:image"') !== false) {
                $session = 'seo-twitter'; $label = 'Twitter Card';
            } elseif ($line >= 140 && $line < 156) {
                $session = 'hero'; $label = 'Hero (imagem flutuante)';
            } elseif ($line >= 195 && $line < 215) {
                $session = 'sobre'; $label = 'Sobre (fotos da casa)';
            } elseif ($line >= 230 && $line < 240) {
                $session = 'diferenciais'; $label = 'Diferenciais';
            } elseif ($line >= 440 && $line < 470) {
                $session = 'rodape'; $label = 'Rodapé (logo)';
            }
        } elseif ($cat === 'js') {
            if (strpos($detail, 'renderGallery()') === 0 || strpos($detail, 'renderGallery') !== false) {
                $session = 'galeria'; $label = 'Galeria (lightbox)';
            } elseif (strpos($detail, 'renderServices()') === 0 || strpos($detail, 'renderServices') !== false) {
                $session = 'servicos'; $label = 'Cardápio (modal de serviço)';
            } elseif (strpos($detail, 'renderAbout()') !== false) {
                $session = 'sobre'; $label = 'Sobre (renderAbout)';
            } elseif (strpos($detail, 'renderHero()') !== false) {
                $session = 'hero'; $label = 'Hero (renderHero)';
            } elseif (strpos($detail, 'renderLogo()') !== false) {
                $session = 'cabecalho'; $label = 'Cabeçalho (renderLogo)';
            } elseif (strpos($detail, 'renderSeoMeta()') !== false) {
                $session = 'seo-og'; $label = 'SEO (renderSeoMeta)';
            } elseif (strpos($detail, 'coverPage()') !== false) {
                $session = 'cardapio'; $label = 'Cardápio (capa do livro)';
            }
        } elseif ($cat === 'json') {
            $json = $detail;
            if (strpos($json, 'services[') === 0) {
                $session = 'servicos'; $label = 'Cardápio / Serviços';
            } elseif (strpos($json, 'gallery[') === 0) {
                $session = 'galeria'; $label = 'Galeria';
            } elseif ($json === 'hero.image') {
                $session = 'hero'; $label = 'Hero (config)';
            } elseif (strpos($json, 'about.images') === 0) {
                $session = 'sobre'; $label = 'Sobre (config)';
            } elseif ($json === 'seo.ogImage' || $json === 'seo.schema.image') {
                $session = 'seo-og'; $label = 'SEO / Open Graph';
            }
        } elseif ($cat === 'missing') {
            $session = 'potencial';
            if (strpos($detail, 'company.logo') !== false) {
                $label = 'Logo (campo ausente — usado como fallback)';
            } elseif (strpos($detail, 'seo.favicon') !== false) {
                $label = 'Favicon (campo ausente — usado como fallback)';
            } elseif (strpos($detail, 'seo.og.image') !== false) {
                $label = 'Open Graph (campo ausente — usado como fallback)';
            } elseif (strpos($detail, 'seo.twitter.image') !== false) {
                $label = 'Twitter Card (campo ausente — usado como fallback)';
            }
        }

        $hit['session'] = $session;
        $hit['label']   = $label;
        return $hit;
    }
}
