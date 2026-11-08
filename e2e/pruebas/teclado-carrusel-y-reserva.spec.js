// Casos T-2 a T-6 de e2e/casos.md: el carrusel de la portada y la reserva, sólo con el teclado
// (E4-10.6). Cada control se enfoca y se usa con Enter o Espacio, como lo haría quien no usa el
// mouse; que se llega a ellos con Tab lo prueba T-5 para el carrusel y U-1 para el encabezado.
import { test, expect, buscarFuncionReservable, formularioDeReserva, codigoDelAviso } from '../ayudas.js';

const carrusel = (page) => page.getByRole('region', { name: 'Funciones destacadas' });

/** La diapositiva que se ve, desde 1: la de la miniatura marcada. */
const actual = (page) => carrusel(page).locator('.carrusel-miniatura').evaluateAll(
  (botones) => botones.findIndex((boton) => boton.getAttribute('aria-current') === 'true') + 1,
);

test.beforeEach(async ({ page }, info) => {
  if (info.title.startsWith('T-6')) {
    return;
  }
  await page.goto('/');
  // Arranca cuando terminan de cargar las imágenes: hasta entonces, la barra tapa la diapositiva.
  await expect(carrusel(page).locator('.carrusel-miniatura').first()).toHaveAttribute('aria-current', 'true');
});

test('T-2 · las flechas del carrusel responden a Enter y a Espacio', async ({ page }) => {
  // Con el foco adentro, el carrusel no pasa solo: el cambio es del teclado.
  await carrusel(page).getByRole('button', { name: 'Diapositiva siguiente' }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(() => actual(page)).toBe(2);

  await carrusel(page).getByRole('button', { name: 'Diapositiva anterior' }).focus();
  await page.keyboard.press(' ');
  await expect.poll(() => actual(page)).toBe(1);
});

test('T-3 · una miniatura lleva a su diapositiva con Enter', async ({ page }) => {
  await carrusel(page).locator('.carrusel-miniatura').nth(2).focus();
  await page.keyboard.press('Enter');

  await expect.poll(() => actual(page)).toBe(3);
});

test('T-4 · el pase automático se pausa con Enter y se reanuda con Espacio', async ({ page }) => {
  await carrusel(page).getByRole('button', { name: 'Pausar el pase automático' }).focus();
  await page.keyboard.press('Enter');
  const reanudar = carrusel(page).getByRole('button', { name: 'Reanudar el pase automático' });
  await expect(reanudar).toBeFocused();

  await page.keyboard.press(' ');
  await expect(carrusel(page).getByRole('button', { name: 'Pausar el pase automático' })).toBeFocused();
});

test('T-5 · con Tab el foco nunca cae en una diapositiva que no se ve', async ({ page }) => {
  // Arranca en el link de la diapositiva que se ve, el primer control del carrusel: las demás
  // diapositivas vienen justo después, antes que las flechas, así que si algo dejara de sacarlas
  // del recorrido (el inert y su visibility: hidden), el próximo Tab caería en una de ellas.
  await carrusel(page).locator('.carrusel-diapositiva.es-actual .carrusel-titulo-enlace').focus();
  // Hasta salir del carrusel, anotando dónde queda el foco en cada Tab.
  const recorrido = [];
  for (let paso = 0; paso < 30; paso += 1) {
    const foco = await page.evaluate(() => {
      const elemento = document.activeElement;

      return {
        adentro: Boolean(elemento.closest('[data-carrusel]')),
        // Una diapositiva que no es la actual no se ve, tenga o no el inert que la saca del recorrido.
        oculto: Boolean(elemento.closest('.carrusel-diapositiva:not(.es-actual), [inert], [hidden], [aria-hidden="true"]')),
        nombre: elemento.getAttribute('aria-label') ?? elemento.textContent.trim().slice(0, 40),
      };
    });
    if (!foco.adentro) {
      break;
    }
    recorrido.push(foco);
    await page.keyboard.press('Tab');
  }

  expect(recorrido.length, 'el carrusel tiene controles para recorrer').toBeGreaterThan(3);
  expect(recorrido.filter((foco) => foco.oculto)).toEqual([]);
});

test('T-6 · se reserva sólo con el teclado', async ({ page, reservas }) => {
  await buscarFuncionReservable(page);
  const { campo } = formularioDeReserva(page);

  await campo.focus();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('1');
  await page.keyboard.press('Enter');

  reservas.push(await codigoDelAviso(page));
});
