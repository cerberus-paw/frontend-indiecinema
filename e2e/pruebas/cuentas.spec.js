// Casos CU-1 y CU-2 de e2e/casos.md: registro, verificación desde Mailpit, ingreso,
// recuperación de contraseña y validaciones de registro en el servidor.
import { expect, menuDelUsuario, testSinSesion as test } from '../ayudas.js';

const BUZON_URL = (process.env.E2E_BUZON_URL ?? 'http://127.0.0.1:18025').replace(/\/$/, '');
const CLAVE_INICIAL = 'CineIndie2026';
const CLAVE_NUEVA = 'OtraClave2026';

let ultimoCorreoRegistrado = process.env.E2E_CORREO ?? null;

function correoUnico(prefijo) {
  const sello = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return `${prefijo}.${sello}@indiecinema.test`;
}

async function buzonDisponible() {
  try {
    const respuesta = await fetch(`${BUZON_URL}/api/v1/info`, {
      signal: AbortSignal.timeout(2000),
    });
    return respuesta.ok;
  } catch {
    return false;
  }
}

async function esperarEnlaceDeCorreo({ para, rutaEsperada }) {
  const destino = para.toLowerCase();
  const vence = Date.now() + 20_000;

  while (Date.now() < vence) {
    const listaResp = await fetch(`${BUZON_URL}/api/v1/messages?limit=25`, {
      signal: AbortSignal.timeout(3000),
    });
    if (listaResp.ok) {
      const lista = await listaResp.json();
      const mensajes = (lista.messages ?? []).filter((m) =>
        (m.To ?? []).some((d) => (d.Address ?? '').toLowerCase() === destino),
      );

      for (const resumen of mensajes) {
        const msgResp = await fetch(`${BUZON_URL}/api/v1/message/${resumen.ID}`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!msgResp.ok) {
          continue;
        }
        const detalle = await msgResp.json();
        const cuerpo = `${detalle.Text ?? ''}\n${detalle.HTML ?? ''}`.replaceAll('&amp;', '&');
        const coincidencia = cuerpo.match(/https?:\/\/[^\s"'<>]+\/cuenta\/[^\s"'<>]+/);
        if (!coincidencia) {
          continue;
        }
        const enlace = new URL(coincidencia[0]);
        const rutaCompleta = `${enlace.pathname}${enlace.search}`;
        if (rutaCompleta.startsWith(rutaEsperada)) {
          return rutaCompleta;
        }
      }
    }

    await new Promise((resolver) => {
      setTimeout(resolver, 500);
    });
  }

  throw new Error(`No llegó un correo para ${para} con ${rutaEsperada} dentro de 20 s.`);
}

test.beforeEach(async () => {
  test.skip(!(await buzonDisponible()), 'Necesita el túnel a Mailpit (E2E_BUZON_URL).');
});

test('CU-1 · se registra, verifica el correo, ingresa, recupera la contraseña e ingresa con la nueva', async ({
  page,
}) => {
  const correo = correoUnico('cuentas.e2e');

  await page.goto('/cuenta/registro');
  await page.getByLabel('Nombre completo o apodo').fill('Espectador Playwright');
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.locator('input[name="password"]').fill(CLAVE_INICIAL);
  await page.locator('input[name="password_confirmacion"]').fill(CLAVE_INICIAL);
  await page.getByRole('checkbox', { name: /Acepto los términos/i }).check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByRole('status').filter({ hasText: '¡Cuenta creada!' })).toBeVisible();
  ultimoCorreoRegistrado = correo;
  await page.waitForTimeout(1500);

  const enlaceVerificar = await esperarEnlaceDeCorreo({
    para: correo,
    rutaEsperada: '/cuenta/verificar?token=',
  });
  await page.goto(enlaceVerificar);
  await expect(page.getByRole('status').filter({ hasText: 'Correo verificado' })).toBeVisible();
  await page.waitForTimeout(1500);

  await page.goto('/cuenta/ingresar');
  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(CLAVE_INICIAL);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).not.toHaveURL(/\/cuenta\/ingresar/);
  const menu = menuDelUsuario(page);
  await expect(menu).toBeVisible();

  await menu.locator('summary').click();
  await menu.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(menuDelUsuario(page)).toHaveCount(0);

  await page.goto('/cuenta/ingresar');
  await page.getByRole('link', { name: '¿Te olvidaste la contraseña?' }).click();
  await expect(page).toHaveURL(/\/cuenta\/recuperar$/);

  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByRole('button', { name: 'Enviar enlace de recuperación' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Revisá tu correo' })).toBeVisible();

  const enlaceRecuperar = await esperarEnlaceDeCorreo({
    para: correo,
    rutaEsperada: '/cuenta/recuperar/nueva?token=',
  });
  await page.goto(enlaceRecuperar);
  await page.locator('input[name="password"]').fill(CLAVE_NUEVA);
  await page.locator('input[name="password_confirmacion"]').fill(CLAVE_NUEVA);
  await page.getByRole('button', { name: 'Guardar nueva contraseña' }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Contraseña actualizada' })).toBeVisible();
  await page.waitForTimeout(1500);

  await page.getByLabel('Correo electrónico').fill(correo);
  await page.getByRole('textbox', { name: 'Contraseña', exact: true }).fill(CLAVE_NUEVA);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).not.toHaveURL(/\/cuenta\/ingresar/);
  await expect(menuDelUsuario(page)).toBeVisible();
  await page.waitForTimeout(1500);
});

test('CU-2 · rechaza en el registro contraseña corta, correo repetido y términos sin aceptar', async ({
  page,
}) => {
  let correoExistente = ultimoCorreoRegistrado;
  if (!correoExistente) {
    correoExistente = correoUnico('repetido.e2e');
    await page.goto('/cuenta/registro');
    await page.getByLabel('Nombre completo o apodo').fill('Cuenta Existente');
    await page.getByLabel('Correo electrónico').fill(correoExistente);
    await page.locator('input[name="password"]').fill(CLAVE_INICIAL);
    await page.locator('input[name="password_confirmacion"]').fill(CLAVE_INICIAL);
    await page.getByRole('checkbox', { name: /Acepto los términos/i }).check();
    await page.getByRole('button', { name: 'Crear cuenta' }).click();
    await expect(page.getByRole('status').filter({ hasText: '¡Cuenta creada!' })).toBeVisible();
    await page.waitForTimeout(5000);
  }

  await page.goto('/cuenta/registro');
  await page.getByLabel('Nombre completo o apodo').fill('Espectador Prueba');
  await page.getByLabel('Correo electrónico').fill(correoUnico('corta.e2e'));
  await page.locator('input[name="password"]').fill('corta1');
  await page.locator('input[name="password_confirmacion"]').fill('corta1');
  await page.getByRole('checkbox', { name: /Acepto los términos/i }).check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  const resumen = page.getByRole('alert').filter({ hasText: /Revisá \d+ campos?/ });
  await expect(resumen).toContainText('La contraseña tiene que tener al menos 8 caracteres.');
  await page.waitForTimeout(5000);

  await page.locator('input[name="password"]').fill(CLAVE_INICIAL);
  await page.locator('input[name="password_confirmacion"]').fill(CLAVE_INICIAL);
  await page.getByRole('checkbox', { name: /Acepto los términos/i }).uncheck();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(resumen).toContainText('Para crear la cuenta tenés que aceptar los términos.');
  await page.waitForTimeout(5000);

  await page.getByLabel('Correo electrónico').fill(correoExistente);
  await page.locator('input[name="password"]').fill(CLAVE_INICIAL);
  await page.locator('input[name="password_confirmacion"]').fill(CLAVE_INICIAL);
  await page.getByRole('checkbox', { name: /Acepto los términos/i }).check();
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(resumen).toContainText('Ya hay una cuenta con este correo.');
  await page.waitForTimeout(5000);
});
