// Casos U-1 a U-5 de e2e/casos.md: las últimas búsquedas, que viven en el localStorage del
// navegador. Cómo se lee cada búsqueda lo prueba PHPUnit. Cada prueba arranca con el navegador
// vacío (Playwright abre un contexto nuevo).
import { testSinSesion as test, expect } from '../ayudas.js';

const seccion = (page) => page.getByRole('region', { name: 'Últimas búsquedas' });
const busquedas = (page) => seccion(page).getByRole('listitem');
const buscar = (page) => page.getByRole('searchbox', { name: 'Buscar', exact: true });

async function esperarResultados(page) {
  await expect(page.locator('#resultados-cartelera')).not.toHaveAttribute('aria-busy', 'true');
}

test('U-1 · con una sexta búsqueda desaparece la más vieja', async ({ page }) => {
  for (const palabra of ['uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis']) {
    await page.goto(`/cartelera?q=${palabra}`);
  }

  await expect(busquedas(page)).toHaveText(['«seis»', '«cinco»', '«cuatro»', '«tres»', '«dos»']);
});

test('U-2 · lo que se busca mientras se escribe no se guarda; al salir del campo, sí', async ({ page }) => {
  await page.goto('/cartelera');

  // De a una letra, con pausas más largas que la espera del buscador: cada pausa busca.
  for (const letra of 'keaton') {
    await buscar(page).press(letra);
    await page.waitForTimeout(600);
  }
  await esperarResultados(page);
  await expect(page).toHaveURL(/q=keaton/);
  await expect(seccion(page)).toBeHidden();

  await buscar(page).blur();

  await expect(busquedas(page)).toHaveText(['«keaton»']);
});

test('U-3 · una búsqueda guardada se vuelve a hacer con sus filtros en el formulario', async ({ page }) => {
  await page.goto('/cartelera?localidad=Luj%C3%A1n');
  await page.goto('/cartelera');
  await page.evaluate(() => { window.sinRecargar = true; });

  await busquedas(page).getByRole('link', { name: 'Luján' }).click();

  await expect(page).toHaveURL(/\/cartelera\?localidad=Luj%C3%A1n$/);
  await esperarResultados(page);
  await expect(page.getByLabel('Localidad', { exact: true })).toHaveValue('Luján');
  expect(await page.evaluate(() => window.sinRecargar === true), 'la página no se tenía que recargar').toBe(true);
});

test('U-4 · un orden solo no es una búsqueda', async ({ page }) => {
  await page.goto('/cartelera');

  await page.getByLabel('Ordenar por').selectOption({ label: 'Precio: mayor a menor' });
  await expect(page).toHaveURL(/orden=precio_desc/);
  await esperarResultados(page);

  await expect(seccion(page)).toBeHidden();
});

test('U-5 · «Borrar historial» saca las búsquedas', async ({ page }) => {
  await page.goto('/cartelera?q=keaton');
  // Sin filtros en la dirección, así recargar no la vuelve a guardar.
  await page.goto('/cartelera');
  await expect(busquedas(page)).toHaveCount(1);

  await seccion(page).getByRole('button', { name: 'Borrar historial' }).click();

  await expect(seccion(page)).toBeHidden();
  await page.reload();
  await expect(seccion(page)).toBeHidden();
});
