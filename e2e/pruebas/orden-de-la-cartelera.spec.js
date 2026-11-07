// Casos O-1 a O-6 de e2e/casos.md: el desplegable «Ordenar por» de la cartelera. Lo que ya prueba
// PHPUnit (cada orden en la base, los links y el CSV) no se repite: acá va lo que pasa sólo en el
// navegador, con el buscador en vivo que redibuja la sección sin recargar, y lo que hace sin
// JavaScript. Sin sesión: la cartelera es pública.
import { testSinSesion as test, expect } from '../ayudas.js';

const resultados = (page) => page.locator('#resultados-cartelera');
const ordenarPor = (page) => page.getByLabel('Ordenar por');
const buscar = (page) => page.getByRole('searchbox', { name: 'Buscar', exact: true });

/** Lo que nadie tiene en el título, la sala ni el director: una búsqueda sin funciones. */
const SIN_FUNCIONES = 'zzz-ninguna-funcion-se-llama-asi';

/** «$ 3.500» → 3500. «Gratis» o «A la gorra» cuentan como 0. */
const aNumero = (texto) => (/\d/.test(texto) ? Number(texto.replace(/\D/g, '')) : 0);

/** Los precios de las tarjetas de la página, en el orden en que se ven. */
async function precios(page) {
  return (await resultados(page).locator('.tarjeta-funcion-precio').allTextContents()).map(aNumero);
}

/** Espera a que el buscador termine de pedir y dibujar. */
async function esperarResultados(page) {
  await expect(resultados(page)).not.toHaveAttribute('aria-busy', 'true');
}

/** Marca la página: si sigue marcada, no se recargó. */
async function marcar(page) {
  await page.evaluate(() => { window.sinRecargar = true; });
}

async function noSeRecargo(page) {
  expect(await page.evaluate(() => window.sinRecargar === true), 'la página no se tenía que recargar').toBe(true);
}

const deMayorAMenor = (lista) => lista.every((precio, i) => i === 0 || lista[i - 1] >= precio);
const deMenorAMayor = (lista) => lista.every((precio, i) => i === 0 || lista[i - 1] <= precio);

test('O-1 · elegir un orden reordena la cartelera sin recargar', async ({ page }) => {
  await page.goto('/cartelera');
  await marcar(page);

  await ordenarPor(page).selectOption({ label: 'Precio: mayor a menor' });

  await expect(page).toHaveURL(/\/cartelera\?orden=precio_desc$/);
  await esperarResultados(page);
  await noSeRecargo(page);
  const lista = await precios(page);
  expect(lista.length).toBeGreaterThan(1);
  expect(deMayorAMenor(lista), `precios: ${lista}`).toBe(true);
  await expect(ordenarPor(page)).toHaveValue('precio_desc');
  // El orden no recorta la cartelera: no hay nada que limpiar.
  await expect(page.getByRole('link', { name: 'Limpiar' })).toHaveCount(0);
});

test('O-2 · el orden se mantiene al paginar', async ({ page }) => {
  await page.goto('/cartelera?orden=precio_desc');
  const siguiente = resultados(page).getByRole('link', { name: 'Siguiente' });
  test.skip(await siguiente.count() === 0, 'la cartelera tiene una sola página');
  const primera = await precios(page);
  await marcar(page);

  await siguiente.click();

  await expect(page).toHaveURL(/\/cartelera\?orden=precio_desc&pagina=2$/);
  await esperarResultados(page);
  await noSeRecargo(page);
  await expect(ordenarPor(page)).toHaveValue('precio_desc');
  const segunda = await precios(page);
  expect(deMayorAMenor([...primera, ...segunda]), `precios: ${primera} | ${segunda}`).toBe(true);
});

test('O-3 · «Atrás» vuelve al orden anterior', async ({ page }) => {
  await page.goto('/cartelera');
  await ordenarPor(page).selectOption({ label: 'Precio: menor a mayor' });
  await expect(page).toHaveURL(/orden=precio_asc/);
  await esperarResultados(page);
  await ordenarPor(page).selectOption({ label: 'Precio: mayor a menor' });
  await expect(page).toHaveURL(/orden=precio_desc/);
  await esperarResultados(page);

  await page.goBack();

  await expect(page).toHaveURL(/\/cartelera\?orden=precio_asc$/);
  await esperarResultados(page);
  await expect(ordenarPor(page)).toHaveValue('precio_asc');
  const lista = await precios(page);
  expect(deMenorAMayor(lista), `precios: ${lista}`).toBe(true);
});

test('O-4 · el orden sigue después de una búsqueda sin funciones', async ({ page }) => {
  await page.goto('/cartelera?orden=precio_asc');

  await buscar(page).fill(SIN_FUNCIONES);
  await expect(resultados(page).getByText('No hay funciones que coincidan con la búsqueda.')).toBeVisible();
  await expect(ordenarPor(page)).toHaveCount(0);

  await buscar(page).fill('');
  await expect(page).toHaveURL(/\/cartelera\?orden=precio_asc$/);
  await esperarResultados(page);
  await expect(ordenarPor(page)).toBeVisible();
  await expect(ordenarPor(page)).toHaveValue('precio_asc');
  const lista = await precios(page);
  expect(deMenorAMayor(lista), `precios: ${lista}`).toBe(true);
});

test('O-5 · si la página cargó sin funciones, «Ordenar por» aparece cuando llegan', async ({ page }) => {
  await page.goto(`/cartelera?q=${SIN_FUNCIONES}`);
  await expect(ordenarPor(page)).toBeHidden();

  await buscar(page).fill('');

  await expect(page).toHaveURL(/\/cartelera$/);
  await esperarResultados(page);
  await expect(ordenarPor(page)).toBeVisible();
  await expect(ordenarPor(page)).toHaveValue('');
});

test.describe('sin JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('O-6 · se elige el orden y se aplica con «Ordenar»', async ({ page }) => {
    await page.goto('/cartelera');

    await ordenarPor(page).selectOption({ label: 'Precio: menor a mayor' });
    await page.getByRole('button', { name: 'Ordenar' }).click();

    // Sin JavaScript el formulario GET manda también los filtros vacíos, como al filtrar.
    await expect(page).toHaveURL(/\/cartelera\?.*orden=precio_asc/);
    await expect(ordenarPor(page)).toHaveValue('precio_asc');
    const lista = await precios(page);
    expect(lista.length).toBeGreaterThan(1);
    expect(deMenorAMayor(lista), `precios: ${lista}`).toBe(true);
  });
});
