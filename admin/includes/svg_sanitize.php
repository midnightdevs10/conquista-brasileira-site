<?php
// svg_sanitize.php — remove de SVGs códigos que executariam JS no browser
// (XSS via SVG). Reutilizado do admin anterior.

declare(strict_types=1);

if (!function_exists('sanitizeSvg')) {
    /**
     * Sanitiza um SVG removendo scripts, event handlers, javascript: URIs
     * e referências externas suspeitas. Retorna o conteúdo SVG limpo.
     */
    function sanitizeSvg(string $svg): string
    {
        // Remove tags <script>...</script>
        $svg = preg_replace('#<script\b[^>]*>.*?</script>#is', '', $svg) ?? $svg;

        // Remove atributos de evento (on*) de qualquer tag
        $svg = preg_replace('#\s+on[a-z]+\s*=\s*(?:"[^"]*"|\'[^\']*\'|[^\s>]+)#i', '', $svg) ?? $svg;

        // Remove href / xlink:href javascript: e data:text/html
        $svg = preg_replace('#\s+(xlink:)?href\s*=\s*("|\')\s*javascript:[^"\']*\2#i', '', $svg) ?? $svg;
        $svg = preg_replace('#\s+(xlink:)?href\s*=\s*("|\')\s*data:text/html[^"\']*\2#i', '', $svg) ?? $svg;

        // Remove <foreignObject> (pode embutir HTML)
        $svg = preg_replace('#<foreignObject\b[^>]*>.*?</foreignObject>#is', '', $svg) ?? $svg;

        // Remove processing instructions de xml-stylesheet (escrito como < ? xml-stylesheet ... ? >)
        $svg = preg_replace('#<\?\s*xml-stylesheet[^?]*\?>#i', '', $svg) ?? $svg;

        return $svg;
    }
}
