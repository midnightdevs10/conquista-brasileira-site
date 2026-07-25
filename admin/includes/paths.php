<?php
// paths.php — constantes de caminhos usados pelo admin.
// Carregado antes de qualquer endpoint.

declare(strict_types=1);

// Raiz do projeto (um nível acima de admin/)
if (!defined('ADMIN_PROJECT_ROOT')) {
    define('ADMIN_PROJECT_ROOT', dirname(__DIR__, 2));
}

if (!defined('ADMIN_IMAGES_DIR')) {
    define('ADMIN_IMAGES_DIR', ADMIN_PROJECT_ROOT . DIRECTORY_SEPARATOR . 'assets' . DIRECTORY_SEPARATOR . 'images');
}
if (!defined('ADMIN_THUMBS_DIR')) {
    define('ADMIN_THUMBS_DIR', ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . 'thumbs');
}
if (!defined('ADMIN_TRASH_DIR')) {
    define('ADMIN_TRASH_DIR', ADMIN_IMAGES_DIR . DIRECTORY_SEPARATOR . '.trash');
}
if (!defined('ADMIN_DATA_DIR')) {
    define('ADMIN_DATA_DIR', ADMIN_PROJECT_ROOT . DIRECTORY_SEPARATOR . 'data');
}
if (!defined('ADMIN_CONFIG_FILE')) {
    define('ADMIN_CONFIG_FILE', ADMIN_DATA_DIR . DIRECTORY_SEPARATOR . 'config.json');
}
if (!defined('ADMIN_CARDAPIO_SECTIONS_FILE')) {
    define('ADMIN_CARDAPIO_SECTIONS_FILE', ADMIN_DATA_DIR . DIRECTORY_SEPARATOR . 'cardapio-sections.json');
}
