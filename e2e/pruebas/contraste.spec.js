// Casos K-1 a K-3 de e2e/casos.md: el contraste de los textos que más cuesta leer, medido con los
// colores que calcula el navegador contra el fondo real de cada uno (E4-10.4, WCAG 1.4.3: 4,5:1).
import { test, expect } from '@playwright/test';

// El registro es para quien no tiene cuenta: sin la sesión que guarda sesion.setup.js.
test.use({ storageState: { cookies: [], origins: [] } });

// El contraste entre el color del texto y el del fondo que tiene detrás. El fondo se arma subiendo
// por los contenedores y superponiendo los semitransparentes hasta llegar a uno opaco; el
// pseudoelemento (el placeholder) toma el color de ahí y el fondo de su elemento.
const contraste = (locator, pseudo = null) =>
  locator.evaluate((elemento, pseudo) => {
    const rgba = (color) => {
      const [r, g, b, a = 1] = color.match(/[\d.]+/g).map(Number);
      return { r, g, b, a };
    };
    const encima = (arriba, abajo) => ({
      r: arriba.r * arriba.a + abajo.r * (1 - arriba.a),
      g: arriba.g * arriba.a + abajo.g * (1 - arriba.a),
      b: arriba.b * arriba.a + abajo.b * (1 - arriba.a),
      a: 1,
    });
    const capas = [];
    for (let nodo = elemento; nodo; nodo = nodo.parentElement) {
      const capa = rgba(getComputedStyle(nodo).backgroundColor);
      if (capa.a > 0) capas.push(capa);
      if (capa.a === 1) break;
    }
    const fondo = capas.reverse().reduce((abajo, arriba) => encima(arriba, abajo), { r: 255, g: 255, b: 255, a: 1 });
    const texto = encima(rgba(getComputedStyle(elemento, pseudo).color), fondo);
    const luminancia = ({ r, g, b }) => {
      const canal = (c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
    };
    const [clara, oscura] = [luminancia(texto), luminancia(fondo)].sort((x, y) => y - x);
    return (clara + 0.05) / (oscura + 0.05);
  }, pseudo);

test('K-1 · la ayuda de un campo se lee con 4,5:1', async ({ page }) => {
  await page.goto('/cuenta/registro');
  const ayuda = page.getByText('Te enviaremos los comprobantes de reserva.');
  await expect(ayuda).toBeVisible();

  expect(await contraste(ayuda)).toBeGreaterThanOrEqual(4.5);
});

test('K-2 · el placeholder de un campo se lee con 4,5:1', async ({ page }) => {
  await page.goto('/cuenta/registro');
  const campo = page.getByPlaceholder('nombre@ejemplo.com');
  await expect(campo).toBeVisible();

  expect(await contraste(campo, '::placeholder')).toBeGreaterThanOrEqual(4.5);
});

test('K-3 · el error de un campo se lee con 4,5:1', async ({ page }) => {
  await page.goto('/cuenta/registro');
  // Sin la validación del navegador, para que el servidor devuelva los errores de cada campo.
  await page.locator('form').filter({ has: page.getByPlaceholder('nombre@ejemplo.com') }).evaluate((form) => {
    form.noValidate = true;
  });
  await page.getByRole('button', { name: /crear/i }).click();
  const error = page.locator('.campo-error').first();
  await expect(error).toBeVisible();

  expect(await contraste(error)).toBeGreaterThanOrEqual(4.5);
});
