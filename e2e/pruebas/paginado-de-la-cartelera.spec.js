// Casos PG-1 a PG-4 de e2e/casos.md: el paginado numerado y el scroll infinito. Qué números arma la
// barra lo prueba PHPUnit; acá, lo que hace el navegador con ellos y con el ancho de la pantalla.
import { test, expect } from '@playwright/test';

const resultados = (page) => page.locator('#resultados-cartelera');
const tarjetas = (page) => resultados(page).locator('.tarjeta-funcion');
const numeros = (page) => page.getByRole('navigation', { name: 'Páginas de la cartelera' });

test('PG-1 · en la compu, un número del paginado lleva a esa página sin recargar', async ({ page }) => {
  await page.goto('/cartelera');
  const dos = numeros(page).getByRole('link', { name: '2', exact: true });
  test.skip(await dos.count() === 0, 'la cartelera tiene una sola página');
  await page.evaluate(() => { window.sinRecargar = true; });

  await dos.click();

  await expect(page).toHaveURL(/\/cartelera\?pagina=2$/);
  await expect(resultados(page)).not.toHaveAttribute('aria-busy', 'true');
  await expect(numeros(page).locator('[aria-current="page"]')).toHaveText('2');
  expect(await page.evaluate(() => window.sinRecargar === true), 'la página no se tenía que recargar').toBe(true);
});

test.describe('en el celular', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('PG-2 · al llegar al final se agregan las funciones de la página siguiente', async ({ page }) => {
    await page.goto('/cartelera');
    const enLaPrimera = await tarjetas(page).count();
    const total = Number.parseInt(await page.locator('[data-cartelera-resumen] .cartelera-resultados').textContent(), 10);
    test.skip(total <= enLaPrimera, 'la cartelera tiene una sola página');

    await expect(page.getByLabel('Paginado')).toHaveValue('infinito');
    await expect(numeros(page)).toBeHidden();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect(tarjetas(page)).toHaveCount(Math.min(total, enLaPrimera * 2));
  });

  test('PG-3 · «Tradicional» queda elegido al recargar', async ({ page }) => {
    await page.goto('/cartelera');

    await page.getByLabel('Paginado').selectOption({ label: 'Tradicional' });
    await page.reload();

    await expect(page.getByLabel('Paginado')).toHaveValue('tradicional');
    await expect(numeros(page)).toBeVisible();
  });
});

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('PG-4 · no hay «Paginado» y los números llevan a cada página', async ({ page }) => {
    await page.goto('/cartelera');
    const dos = numeros(page).getByRole('link', { name: '2', exact: true });
    test.skip(await dos.count() === 0, 'la cartelera tiene una sola página');

    await expect(page.getByLabel('Paginado')).toBeHidden();
    await dos.click();

    await expect(page).toHaveURL(/\/cartelera\?pagina=2$/);
    await expect(numeros(page).locator('[aria-current="page"]')).toHaveText('2');
  });
});
