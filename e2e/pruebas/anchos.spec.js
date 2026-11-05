// Casos A-1 a A-4 de e2e/casos.md: las pantallas principales se usan en un celular de 360 px, en
// una tableta y en la compu (E4-10.8). La cartelera va aparte, cuando siga el wireframe (IC-333).
//
// «Se usa» quiere decir:
// - la página no es más ancha que la ventana, así no hay que desplazarse de costado;
// - nada del contenido queda fuera de la pantalla. html y body recortan lo que se pasa de ancho
//   (overflow-x: hidden), así que la primera regla sola no lo ve: lo que se pasa queda cortado.
//   Un control (link, botón o campo) cuenta aunque lo recorte su recuadro; el resto, como las
//   imágenes de fondo, sólo si no está adentro de algo que lo recorta a propósito;
// - si una tabla es más ancha, se desplaza adentro de su recuadro.
// Lo que está adentro de un contenedor que se desplaza de costado (las tablas, las miniaturas del
// carrusel) o de una diapositiva que no se ve (inert) queda afuera de la segunda regla.
import { test, expect, CUENTAS_DEL_PANEL } from '../ayudas.js';

const ANCHOS = { celular: 360, tableta: 768, escritorio: 1280 };

/**
 * Lo que no se puede usar a este ancho, una línea por problema; vacío si está bien.
 *
 * @returns {Promise<string[]>}
 */
async function problemas(page) {
  return page.evaluate(() => {
    const ancho = document.documentElement.clientWidth;
    const encontrados = [];
    if (document.documentElement.scrollWidth > ancho) {
      encontrados.push(`la página mide ${document.documentElement.scrollWidth} px de ancho en una ventana de ${ancho}`);
    }

    // Si algún contenedor (sin contar la página) lo desplaza de costado (una tabla, la fila de
    // miniaturas) o, con `recortar`, también si sólo lo recorta.
    const contenido = (elemento, recortar) => {
      for (let padre = elemento.parentElement; padre && padre !== document.body; padre = padre.parentElement) {
        const desborde = getComputedStyle(padre).overflowX;
        if (['auto', 'scroll'].includes(desborde) || (recortar && desborde !== 'visible')) {
          return true;
        }
      }

      return false;
    };
    const CONTROLES = 'a, button, input, select, textarea, summary';
    const nombre = (elemento) => `${elemento.tagName.toLowerCase()} «${(elemento.getAttribute('aria-label') ?? elemento.textContent ?? elemento.name ?? '').trim().slice(0, 40)}»`;
    // Todo lo que se ve del contenido: los controles y también el texto y las imágenes.
    for (const control of document.querySelectorAll('main *')) {
      const caja = control.getBoundingClientRect();
      // Un control recortado no se puede usar; una imagen de fondo recortada en su recuadro, sí
      // está bien (las tarjetas, la portada).
      const esControl = control.matches(CONTROLES);
      if (caja.width <= 1 || caja.height <= 1 || control.closest('[inert], [hidden], .sr-only') || contenido(control, !esControl)) {
        continue;
      }
      if (caja.left < -1 || caja.right > ancho + 1) {
        encontrados.push(`${nombre(control)} queda fuera de la pantalla (${Math.round(caja.left)} a ${Math.round(caja.right)} px)`);
      }
    }

    for (const contenedor of document.querySelectorAll('.tabla-admin-contenedor')) {
      if (contenedor.scrollWidth > contenedor.clientWidth && !['auto', 'scroll'].includes(getComputedStyle(contenedor).overflowX)) {
        encontrados.push('una tabla más ancha que su recuadro no se puede desplazar');
      }
    }

    return encontrados;
  });
}

/** Recorre las pantallas en cada ancho; `direcciones` las calcula con la página ya abierta. */
function recorrer(caso, direcciones) {
  for (const [dispositivo, ancho] of Object.entries(ANCHOS)) {
    test(`${caso} · en ${dispositivo} (${ancho} px)`, async ({ page }) => {
      await page.setViewportSize({ width: ancho, height: 800 });
      for (const direccion of await direcciones(page)) {
        await page.goto(direccion);
        expect(await problemas(page), direccion).toEqual([]);
      }
    });
  }
}

/** La dirección del primer link del contenido de `desde` que empieza con `patron`. */
async function primerLink(page, desde, patron) {
  await page.goto(desde);
  const href = await page.locator(`main a[href^="${patron}"]`).first().getAttribute('href');
  expect(href, `${desde} tiene que tener un link a ${patron}…`).not.toBeNull();

  return href;
}

test.describe('sin sesión', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  recorrer('A-1 · portada, ficha, salas, ingresar y registro', async (page) => [
    '/',
    await primerLink(page, '/cartelera', '/cartelera/'),
    '/salas',
    await primerLink(page, '/salas', '/salas/'),
    '/cuenta/ingresar',
    '/cuenta/registro',
  ]);
});

test.describe('el espectador', () => {
  recorrer('A-2 · reserva y Mis reservas', async (page) => [
    (await primerLink(page, '/cartelera', '/cartelera/')).replace('/cartelera/', '/funcion/reservar/'),
    '/funcion/reservas',
  ]);
});

test.describe('el organizador', () => {
  const { correo, archivo } = CUENTAS_DEL_PANEL.organizador;
  test.skip(!correo, 'Sin E2E_ORGANIZADOR_CORREO.');
  test.use({ storageState: archivo });

  recorrer('A-3 · Mis salas, Mis funciones y las reservas de una función', async (page) => [
    '/organizador/salas',
    '/organizador/funciones',
    await primerLink(page, '/organizador/funciones', '/funcion/organizador/funciones/'),
  ]);
});

test.describe('el administrador', () => {
  const { correo, archivo } = CUENTAS_DEL_PANEL.administrador;
  test.skip(!correo, 'Sin E2E_ADMINISTRADOR_CORREO.');
  test.use({ storageState: archivo });

  recorrer('A-4 · usuarios, reservas y solicitudes', async () => [
    '/cuenta/administracion/usuarios',
    '/funcion/administracion/reservas',
    '/administracion/solicitudes',
  ]);
});
