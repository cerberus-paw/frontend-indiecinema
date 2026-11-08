// Casos R-1 a R-6 de e2e/casos.md: reservar desde la ficha, con sus bordes. Lo que se reserva se
// anota en `reservas` y se cancela al terminar.
import {
  test, expect, buscarFuncionReservable, lugaresLibres, formularioDeReserva, avisoDeReserva, reservar, codigoDelAviso,
} from '../ayudas.js';

test('R-1 · reserva 2 lugares desde la ficha, sin recargar', async ({ page, reservas }) => {
  await buscarFuncionReservable(page);
  const antes = await lugaresLibres(page);
  const direccion = page.url();

  reservas.push(await reservar(page, 2));

  // Sin recargar: sigue en la misma ficha y el formulario dejó lugar al aviso.
  expect(page.url()).toBe(direccion);
  await expect(page.getByRole('link', { name: 'Ver el comprobante' })).toBeVisible();
  expect(await lugaresLibres(page, { recargar: true })).toBe(antes - 2);
});

test('R-2 · dos clics seguidos en «Reservar» hacen una sola reserva', async ({ page, reservas }) => {
  await buscarFuncionReservable(page);
  const antes = await lugaresLibres(page);
  const { campo, boton } = formularioDeReserva(page);

  await campo.fill('1');
  await boton.dblclick();
  reservas.push(await codigoDelAviso(page));
  // Si el segundo clic hubiera mandado otra reserva, que termine antes de contar.
  await page.waitForLoadState('networkidle');

  expect(await lugaresLibres(page, { recargar: true })).toBe(antes - 1);
});

/**
 * Prueba una cantidad que no vale: no se tiene que reservar. El campo queda inválido (lo frena el
 * navegador con min, max y required, o el componente con aria-invalid) y los lugares no cambian.
 */
async function noReserva(page, escribir) {
  await buscarFuncionReservable(page);
  const antes = await lugaresLibres(page);
  const { campo, boton } = formularioDeReserva(page);

  await escribir(campo, antes);
  await boton.click();

  expect(await campo.evaluate((c) => !c.validity.valid || c.getAttribute('aria-invalid') === 'true')).toBe(true);
  await expect(avisoDeReserva(page)).toHaveCount(0);
  expect(await lugaresLibres(page, { recargar: true })).toBe(antes);
}

test('R-3 · 0 lugares no se reserva', async ({ page }) => {
  await noReserva(page, (campo) => campo.fill('0'));
});

test('R-3 · -1 lugares no se reserva', async ({ page }) => {
  await noReserva(page, (campo) => campo.fill('-1'));
});

test('R-4 · un lugar más de los que quedan no se reserva', async ({ page }) => {
  await noReserva(page, (campo, libres) => campo.fill(String(libres + 1)));
});

test('R-5 · con letras en la cantidad no se reserva', async ({ page }) => {
  // fill no escribe letras en un campo numérico: se tipean, como lo haría el usuario.
  await noReserva(page, async (campo) => {
    await campo.fill('');
    await campo.pressSequentially('abc');
  });
});

test('R-6 · no se pueden reservar más de 6 lugares por persona', async ({ page, reservas }) => {
  await buscarFuncionReservable(page, 7);
  const antes = await lugaresLibres(page);
  const { campo, boton } = formularioDeReserva(page);

  // Intentar pedir 7 lugares de una vez supera el máximo de 6 por persona.
  await campo.fill('7');
  await boton.click();

  expect(await campo.evaluate((c) => !c.validity.valid || c.getAttribute('aria-invalid') === 'true')).toBe(true);
  await expect(page.locator('.campo-error, [role="alert"]')).toContainText('Se pueden reservar hasta 6 lugares por persona en cada función.');
  await expect(avisoDeReserva(page)).toHaveCount(0);
  expect(await lugaresLibres(page, { recargar: true })).toBe(antes);

  // Reservar 2 lugares: quedan 4 para este espectador.
  reservas.push(await reservar(page, 2));

  // Volver a la ficha: el máximo del campo ahora es 4.
  await page.reload();
  const formNuevo = formularioDeReserva(page);
  expect(await formNuevo.campo.getAttribute('max')).toBe('4');

  // Intentar pedir 5 lugares supera lo que le queda (4).
  await formNuevo.campo.fill('5');
  await formNuevo.boton.click();

  expect(await formNuevo.campo.evaluate((c) => !c.validity.valid || c.getAttribute('aria-invalid') === 'true')).toBe(true);
  await expect(page.locator('.campo-error, [role="alert"]')).toContainText('Ya tenés 2 lugares reservados: podés sumar hasta 4 lugares más (máximo 6 por persona).');
  await expect(avisoDeReserva(page)).toHaveCount(0);
  expect(await lugaresLibres(page, { recargar: true })).toBe(antes - 2);

  // Reservar los 4 restantes: el espectador alcanza los 6 lugares máximos por función.
  reservas.push(await reservar(page, 4));

  // Volver a la ficha: el campo y el botón quedan deshabilitados porque ya no le quedan lugares.
  await page.reload();
  const formLleno = formularioDeReserva(page);
  expect(await formLleno.campo.isDisabled()).toBe(true);
  expect(await formLleno.boton.isDisabled()).toBe(true);
});
