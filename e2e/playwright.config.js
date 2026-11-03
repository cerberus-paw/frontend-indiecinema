// Las pruebas de punta a punta (e2e/README.md). Corren contra un sitio ya levantado, el de la
// máquina o el de desarrollo: no levantan nada, porque el front solo no anda sin el back.
import { defineConfig, devices } from '@playwright/test';

const enActions = Boolean(process.env.CI);

export default defineConfig({
  testDir: './pruebas',
  outputDir: './resultados',
  // De a una y en orden: todas usan la misma cuenta y la misma función, y una que cuenta los
  // lugares libres se confundiría con la reserva que hace otra al mismo tiempo.
  fullyParallel: false,
  workers: 1,
  // Sin reintentos: una prueba que pasa a la segunda es un error que hay que mirar, no esconder.
  retries: 0,
  forbidOnly: enActions,
  timeout: 30_000,
  reporter: enActions
    ? [['github'], ['list'], ['html', { outputFolder: 'informe', open: 'never' }]]
    : [['list'], ['html', { outputFolder: 'informe', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_URL ?? 'http://localhost:8080',
    // La traza (con capturas de cada paso, la red y la consola) y la captura final sólo de lo que
    // falló: es lo que se mira para saber por qué.
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
  },
  projects: [
    // Primero ingresa y guarda la sesión; las pruebas del espectador la reusan.
    { name: 'sesion', testMatch: /\.setup\.js$/ },
    { name: 'chromium', dependencies: ['sesion'], use: { ...devices['Desktop Chrome'] } },
  ],
});
