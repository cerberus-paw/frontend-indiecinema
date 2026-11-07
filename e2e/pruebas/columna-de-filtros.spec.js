// Casos FC-1 a FC-6 de e2e/casos.md: la cartelera como el wireframe (E4-10.9). Lo que ya prueba
// PHPUnit (los grupos en orden, el resumen y «Filtrar» sin JavaScript) no se repite: acá va lo que
// depende del ancho y del JavaScript, que pliega la columna en el celular. Sin sesión.
import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

const columna = (page) => page.locator('details[data-filtros-cartelera]');
const buscar = (page) => page.getByRole('searchbox', { name: 'Buscar', exact: true });

test('FC-1 · en el celular la columna arranca cerrada y se abre con Enter', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/cartelera');

  await expect(columna(page)).not.toHaveAttribute('open');
  await expect(buscar(page)).toBeHidden();

  await columna(page).locator('summary').focus();
  await page.keyboard.press('Enter');

  await expect(columna(page)).toHaveAttribute('open');
  await expect(buscar(page)).toBeVisible();
});

test('FC-2 · en la compu la columna está abierta al costado de las funciones', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/cartelera');

  await expect(columna(page)).toHaveAttribute('open');
  await expect(buscar(page)).toBeVisible();
  const deLaColumna = await columna(page).boundingBox();
  const deLasFunciones = await page.locator('#resultados-cartelera').boundingBox();
  expect(deLaColumna.x + deLaColumna.width, 'la columna, a la izquierda').toBeLessThanOrEqual(deLasFunciones.x);
  await expect(page.locator('[data-cartelera-resumen]')).toContainText(/\d+ funci(ón|ones)\s+· ordenadas por fecha: más próxima/);
});

test('FC-3 · el resumen de arriba cambia con el orden, sin recargar', async ({ page }) => {
  await page.goto('/cartelera');
  // Si la página se recargara, esta marca desaparecería.
  await page.evaluate(() => { window.sinRecargar = true; });

  await page.getByLabel('Ordenar por').selectOption({ label: 'Precio: menor a mayor' });

  await expect(page.locator('[data-cartelera-resumen]')).toContainText(/ordenadas por precio: menor a mayor/);
  expect(await page.evaluate(() => window.sinRecargar)).toBe(true);
});

test('FC-4 · quitar una etiqueta con Enter filtra sin recargar y el foco no se pierde', async ({ page }) => {
  await page.goto('/cartelera?localidad=Luj%C3%A1n&precio_max=2000');
  await page.evaluate(() => { window.sinRecargar = true; });
  const etiquetas = page.locator('[data-filtros-activos] a[data-quitar-filtro]');
  await expect(etiquetas).toHaveCount(2);

  await page.getByRole('link', { name: 'Quitar el filtro Localidad: Luján' }).focus();
  await page.keyboard.press('Enter');

  await expect(etiquetas).toHaveCount(1);
  const queda = page.getByRole('link', { name: 'Quitar el filtro Hasta $ 2.000' });
  await expect(queda).toBeFocused();
  await expect(page.getByLabel('Localidad', { exact: true })).toHaveValue('');
  await expect(page).toHaveURL(/\/cartelera\?precio_max=2000$/);

  await page.keyboard.press('Enter');

  await expect(etiquetas).toHaveCount(0);
  await expect(page.locator('[data-filtros-activos]')).toBeHidden();
  await expect(page.locator('#titulo-resultados-cartelera')).toBeFocused();
  await expect(page.getByLabel('Precio hasta ($)')).toHaveValue('');
  expect(await page.evaluate(() => window.sinRecargar)).toBe(true);
});

test('FC-5 · elegir un filtro en la columna agrega su etiqueta, sin recargar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/cartelera');
  await page.evaluate(() => { window.sinRecargar = true; });
  await expect(page.locator('[data-filtros-activos]')).toBeHidden();

  await page.getByLabel('Localidad', { exact: true }).selectOption('Luján');

  await expect(page.getByRole('link', { name: 'Quitar el filtro Localidad: Luján' })).toBeVisible();
  await expect(page.locator('[data-filtros-activos] a[data-quitar-todos]')).toHaveAttribute('href', '/cartelera');
  await expect(columna(page).locator('summary')).toHaveText('Filtros (1)');
  expect(await page.evaluate(() => window.sinRecargar)).toBe(true);
});

test('FC-6 · sin funciones el resumen de arriba no se ve, y vuelve con resultados', async ({ page }) => {
  await page.goto('/cartelera?q=zzz-ninguna-funcion-se-llama-asi');
  const resumen = page.locator('[data-cartelera-resumen]');

  await expect(resumen).toBeHidden();

  await buscar(page).fill('');
  await buscar(page).press('Enter');

  await expect(resumen).toBeVisible();
  await expect(resumen).toContainText(/\d+ funci(ón|ones)/);
});
