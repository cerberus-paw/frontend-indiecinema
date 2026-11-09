// Lo que comparten las pruebas: la cuenta, ingresar, encontrar una función que se pueda reservar,
// reservar y cancelar. Todo pasa por las páginas, como lo haría un espectador.
import { test as playwright, expect } from '@playwright/test';

/**
 * `test` de Playwright, que además hace fallar la prueba si alguna página registró una violación
 * de la Content-Security-Policy: un estilo o un script en línea, o un recurso de otro origen, que
 * el navegador bloqueó. Se ve como un error de la consola, o como una excepción si lo bloqueado era
 * un eval. Es automático: lo controla cada prueba que importa `test` o `testSinSesion` de acá, sin
 * nombrarlo. Contra un sitio sin la cabecera no hay nada que bloquear y siempre pasa.
 */
export const testSinSesion = playwright.extend({
  violacionesDeCsp: [async ({ page }, use) => {
    const violaciones = [];
    const esDeCsp = (texto) => /Content[- ]Security[- ]Policy/i.test(texto);
    page.on('console', (mensaje) => {
      if (esDeCsp(mensaje.text())) {
        violaciones.push(`${page.url()}: ${mensaje.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      if (esDeCsp(error.message)) {
        violaciones.push(`${page.url()}: ${error.message}`);
      }
    });
    await use(violaciones);
    expect(violaciones, 'ninguna página tiene que violar la Content-Security-Policy').toEqual([]);
  }, { auto: true }],
});

/**
 * La cuenta de espectador con la que se prueba. Sale del entorno y no del código: en Actions son
 * secretos del environment desarrollo, y el repositorio es público.
 */
export function cuenta() {
  const correo = process.env.E2E_CORREO;
  const clave = process.env.E2E_CLAVE;
  if (!correo || !clave) {
    throw new Error('Faltan E2E_CORREO y E2E_CLAVE, la cuenta de espectador con la que se prueba (e2e/README.md).');
  }

  return { correo, clave };
}

/** El código como se ve en las páginas, en dos grupos de 4 para dictarlo. */
export const codigoEscrito = (codigo) => `${codigo.slice(0, 4)}-${codigo.slice(4)}`;

/**
 * Dónde queda la sesión del espectador entre una prueba y otra. Se ingresa una sola vez
 * (sesion.setup.js): nginx deja ingresar 5 veces por minuto desde la misma IP, y con una por
 * prueba las últimas recibirían 429. Un archivo por cuenta, por si corren dos a la vez.
 */
export const ARCHIVO_DE_SESION = new URL(`./.sesion/${process.env.E2E_CORREO ?? 'espectador'}.json`, import.meta.url).pathname;

/**
 * Las cuentas del organizador y del administrador, para las pruebas de sus paneles. Opcionales: sin
 * ellas, esas pruebas se saltean. Cada una guarda su sesión en su archivo, como la del espectador.
 */
export const CUENTAS_DEL_PANEL = {
  organizador: {
    correo: process.env.E2E_ORGANIZADOR_CORREO,
    clave: process.env.E2E_ORGANIZADOR_CLAVE,
    archivo: new URL('./.sesion/organizador.json', import.meta.url).pathname,
  },
  administrador: {
    correo: process.env.E2E_ADMINISTRADOR_CORREO,
    clave: process.env.E2E_ADMINISTRADOR_CLAVE,
    archivo: new URL('./.sesion/administrador.json', import.meta.url).pathname,
  },
};

export async function ingresar(page, { correo, clave } = cuenta()) {
  await page.goto('/cuenta/ingresar');
  await page.getByLabel('Correo electrónico').fill(correo);
  // Por el rol y no por la etiqueta: la etiqueta trae el asterisco de obligatorio.
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(clave);
  const [respuesta] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/cuenta/ingresar'),
    page.getByRole('button', { name: 'Ingresar' }).click(),
  ]);
  if (respuesta.status() === 429) {
    throw new Error('nginx no dejó ingresar (429, más de 5 ingresos por minuto desde esta IP): esperar un minuto.');
  }
  await page.waitForLoadState();
}

/**
 * El menú del usuario del encabezado: un desplegable con listas de enlaces, no un menú de
 * aplicación. Se busca adentro porque el pie repite algunas opciones, como «Mis reservas».
 */
export const menuDelUsuario = (page) => page.locator('header details');

/** Abre «Mis reservas» desde el menú del usuario, como lo haría él. */
export async function abrirMisReservas(page) {
  const menu = menuDelUsuario(page);
  await menu.locator('summary').click();
  await menu.getByRole('link', { name: 'Mis reservas' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Mis reservas' })).toBeVisible();
}

/**
 * Abre la ficha de una función con el formulario de reserva y al menos `minimo` lugares libres, y
 * devuelve su dirección. Es la de `E2E_FUNCION` (su id) si está; si no, la primera de la primera
 * página de la cartelera que sirva. Necesita la sesión: sin ella la ficha no tiene formulario.
 *
 * Con E2E_FUNCION, dos corridas a la vez (el back y el front mergeados juntos, cada uno con su
 * cuenta) no cuentan los lugares de la misma función.
 *
 * Con `todoElTope`, además, la cuenta no tiene que tener lugares reservados en ella: le queda el
 * tope por persona entero (IC-463). Lo que reservan las pruebas se cancela al terminar, pero una
 * reserva hecha a mano con la misma cuenta cambiaría lo que espera R-6.
 */
export async function buscarFuncionReservable(page, minimo = 3, { todoElTope = false } = {}) {
  const elegida = process.env.E2E_FUNCION;
  const formulario = page.locator('form[data-formulario-reserva]');
  const tieneTodoElTope = async () => {
    const tope = await formulario.getAttribute('data-maximo-por-persona');
    return tope !== null && tope === await formulario.getAttribute('data-restantes-usuario');
  };
  const sirve = async () => (await formulario.count()) > 0
    && (await lugaresLibres(page)) >= minimo
    && (!todoElTope || await tieneTodoElTope());
  if (elegida) {
    await page.goto(`/cartelera/${elegida}`);
    if (!(await sirve())) {
      throw new Error(`La función ${elegida} de E2E_FUNCION no se puede reservar con ${minimo} lugares libres.`);
    }

    return page.url();
  }
  await page.goto('/cartelera');
  const fichas = await page.locator('a[href^="/cartelera/"]').evaluateAll((enlaces) => [
    ...new Set(enlaces.map((enlace) => enlace.getAttribute('href'))),
  ]);
  for (const ficha of fichas.filter((href) => /^\/cartelera\/[0-9a-f-]{36}$/.test(href))) {
    await page.goto(ficha);
    if (await sirve()) {
      return ficha;
    }
  }
  throw new Error(`Ninguna función de la cartelera se puede reservar con ${minimo} lugares libres.`);
}

/**
 * Los lugares libres de la ficha abierta, recién pedidos al servidor: se recarga para no leer el
 * número que el componente LugaresLibres todavía no actualizó.
 */
export async function lugaresLibres(page, { recargar = false } = {}) {
  if (recargar) {
    await page.reload();
  }
  const texto = await page.locator('.ficha-reserva-disponibles-texto strong').textContent();

  return Number.parseInt(texto, 10);
}

export function formularioDeReserva(page) {
  const formulario = page.locator('form[data-formulario-reserva]');

  return {
    formulario,
    campo: formulario.getByLabel('Cantidad de lugares'),
    boton: formulario.getByRole('button', { name: 'Reservar mis lugares' }),
  };
}

/** El aviso que reemplaza al formulario cuando la reserva sale bien. */
export const avisoDeReserva = (page) => page.getByRole('status').filter({ hasText: 'Reserva confirmada' });

/** Lee el código de la reserva del aviso de confirmación, sin el guion. */
export async function codigoDelAviso(page) {
  const aviso = avisoDeReserva(page);
  await expect(aviso).toBeVisible();
  const coincidencia = (await aviso.textContent()).match(/Código (\w{4})-(\w{4})/);
  expect(coincidencia, 'el aviso tiene que traer el código').not.toBeNull();

  return coincidencia[1] + coincidencia[2];
}

/** Reserva desde la ficha abierta y devuelve el código. */
export async function reservar(page, cantidad) {
  const { campo, boton } = formularioDeReserva(page);
  await campo.fill(String(cantidad));
  await boton.click();

  return codigoDelAviso(page);
}

/** La fila de una reserva en «Mis reservas» (la página tiene que estar abierta). */
export const filaDeReserva = (page, codigo) => page.locator('tbody tr', { hasText: codigoEscrito(codigo) });

/**
 * Cancela una reserva desde «Mis reservas». Con `siPuede`, no falla si ya no se puede cancelar:
 * es para dejar el sitio como estaba al terminar una prueba.
 */
export async function cancelar(page, codigo, { siPuede = false } = {}) {
  await page.goto('/funcion/reservas');
  const enlace = page.getByRole('link', { name: `Cancelar la reserva ${codigo}` });
  if (siPuede && (await enlace.count()) === 0) {
    return;
  }
  await enlace.click();
  await page.getByRole('button', { name: 'Cancelar la reserva', exact: true }).click();
  await page.waitForLoadState();
}

/**
 * `test` con la sesión del espectador ya iniciada (la que guardó sesion.setup.js) y una lista
 * `reservas` donde cada prueba anota los códigos de lo que reserva: al terminar, pase o falle, se
 * cancelan. Así se puede correr una y otra vez contra el mismo sitio sin agotar las funciones.
 */
export const test = testSinSesion.extend({
  storageState: ARCHIVO_DE_SESION,
  reservas: async ({ page }, use) => {
    const codigos = [];
    await use(codigos);
    for (const codigo of codigos) {
      await cancelar(page, codigo, { siPuede: true });
    }
  },
});

export { expect };
