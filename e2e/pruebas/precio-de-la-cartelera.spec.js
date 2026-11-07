// Caso PR-1 de e2e/casos.md: el rango de precio con el buscador en vivo. Qué funciones entran en
// cada rango (con las gratuitas) lo prueba PHPUnit; acá, que los campos buscan al dejar de escribir.
import { testSinSesion as test, expect } from '../ayudas.js';

test('PR-1 · «Precio hasta» 0 muestra sólo las funciones a la gorra, sin recargar', async ({ page }) => {
  await page.goto('/cartelera');
  await page.evaluate(() => { window.sinRecargar = true; });

  await page.getByLabel('Precio hasta ($)').fill('0');

  await expect(page).toHaveURL(/\/cartelera\?precio_max=0$/);
  const resultados = page.locator('#resultados-cartelera');
  await expect(resultados).not.toHaveAttribute('aria-busy', 'true');
  const precios = await resultados.locator('.tarjeta-funcion-precio').allTextContents();
  expect(precios.length).toBeGreaterThan(0);
  expect(new Set(precios.map((precio) => precio.trim()))).toEqual(new Set(['A la gorra']));
  expect(await page.evaluate(() => window.sinRecargar === true), 'la página no se tenía que recargar').toBe(true);
});
