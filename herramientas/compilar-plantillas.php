<?php

/*
 * Compila todas las plantillas del paquete, sin renderizarlas: falla con un bloque sin cerrar, un
 * filtro o una función que no existe, o cualquier error de sintaxis de Twig. Lo corre el CI.
 *
 * Twig no es dependencia del front: lo trae el núcleo del back. El entorno se arma como en
 * nucleo/src/Vista.php (el autoescape, las variables globales y la función ruta()); si Vista suma
 * algo que usan las plantillas, se suma acá.
 *
 * Uso: php herramientas/compilar-plantillas.php <ruta al vendor/autoload.php del núcleo>
 */

declare(strict_types=1);

use Twig\Environment;
use Twig\Error\SyntaxError;
use Twig\Loader\FilesystemLoader;
use Twig\Source;
use Twig\TwigFunction;

$autoload = $argv[1] ?? '';
if (!is_file($autoload)) {
    fwrite(STDERR, "Falta la ruta al vendor/autoload.php del núcleo.\n");
    exit(2);
}
require $autoload;

$raiz = dirname(__DIR__) . '/plantillas';
$twig = new Environment(new FilesystemLoader($raiz), ['autoescape' => 'html', 'strict_variables' => true]);
foreach (['prefijo' => '', 'usuario' => null, 'csrf' => null, 'ruta_actual' => '/'] as $nombre => $valor) {
    $twig->addGlobal($nombre, $valor);
}
$twig->addFunction(new TwigFunction('ruta', static fn (string $ruta): string => $ruta));

$errores = 0;
$archivos = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($raiz, FilesystemIterator::SKIP_DOTS));
$plantillas = [];
foreach ($archivos as $archivo) {
    if (str_ends_with($archivo->getFilename(), '.twig')) {
        $plantillas[] = substr($archivo->getPathname(), strlen($raiz) + 1);
    }
}
sort($plantillas);

foreach ($plantillas as $nombre) {
    try {
        $twig->compileSource(new Source((string) file_get_contents("{$raiz}/{$nombre}"), $nombre, "{$raiz}/{$nombre}"));
    } catch (SyntaxError $error) {
        $errores++;
        fwrite(STDERR, "✗ {$nombre}, línea {$error->getTemplateLine()}: {$error->getRawMessage()}\n");
    }
}

echo count($plantillas) . ' plantillas, ' . $errores . " con errores.\n";
exit($errores === 0 ? 0 : 1);
