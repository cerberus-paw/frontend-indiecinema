import js from '@eslint/js';
import globals from 'globals';

/*
 * ESLint con las reglas recomendadas (E4-14.5): las que encuentran errores de verdad, no de
 * estilo. `node --check`, que es lo que corría antes, sólo mira que el archivo se pueda leer: un
 * método repetido en una clase, una variable que no existe o una que sobra pasaban igual.
 *
 * El JavaScript del sitio se carga con <script> y no son módulos: los archivos comparten
 * globales. Cada componente declara su clase y app.js la usa, así que cada archivo anota con una
 * directiva «exported» qué publica, y con una directiva «global» qué toma de otro archivo. Eso no
 * es burocracia: es lo que hace que un nombre de componente mal escrito en app.js falle en el CI
 * en lugar de fallar en el navegador.
 */
export default [
  {
    files: ['estaticos/js/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'script',
      globals: { ...globals.browser },
    },
    rules: js.configs.recommended.rules,
  },
  {
    // PAW son las utilidades comunes: las declara paw.js y las usa todo lo demás. Se declara acá
    // y no con una directiva repetida en dieciséis archivos.
    files: ['estaticos/js/**/*.js'],
    ignores: ['estaticos/js/paw.js'],
    languageOptions: { globals: { PAW: 'readonly' } },
  },
];
