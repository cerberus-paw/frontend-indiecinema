// Casos I-2 a I-4 de e2e/casos.md: lo que ve quien no tiene sesión. El I-1, ingresar bien, es
// sesion.setup.js: así se ingresa una vez menos.
import {
  testSinSesion as test, expect, cuenta, ingresar, menuDelUsuario,
} from '../ayudas.js';

test('I-2 · con la contraseña equivocada no entra', async ({ page }) => {
  const { correo, clave } = cuenta();
  await ingresar(page, { correo, clave: `${clave}-no` });

  await expect(page.getByText('No pudimos iniciar tu sesión')).toBeVisible();
  await expect(menuDelUsuario(page).getByRole('link', { name: 'Mis reservas', includeHidden: true })).not.toBeAttached();
});

test('I-3 · sin sesión, «Mis reservas» pide ingresar', async ({ page }) => {
  await page.goto('/funcion/reservas');

  await expect(page.getByRole('heading', { name: 'Tenés que ingresar para ver esta página.' })).toBeVisible();
  await expect(page.getByRole('main').getByRole('link', { name: 'Ingresar' })).toBeVisible();
  await expect(page.locator('table')).toHaveCount(0);
});

test('I-4 · sin sesión, la ficha invita a ingresar y no tiene el formulario', async ({ page }) => {
  await page.goto('/cartelera');
  await page.locator('a[href^="/cartelera/"]').filter({ hasNotText: /^$/ }).first().click();
  await expect(page).toHaveURL(/\/cartelera\/[0-9a-f-]{36}$/);

  await expect(page.getByText('Ingresá con tu cuenta para reservar.')).toBeVisible();
  await expect(page.locator('form[data-formulario-reserva]')).toHaveCount(0);
});
