// Casos M-1, M-2, C-1 y C-2 de e2e/casos.md: la reserva en «Mis reservas», su comprobante y
// cancelarla.
import {
  test, expect, buscarFuncionReservable, lugaresLibres, reservar, abrirMisReservas, filaDeReserva, codigoEscrito, cancelar,
} from '../ayudas.js';

test('M-1 y M-2 · la reserva aparece primera en «Mis reservas» y abre su comprobante', async ({ page, reservas }) => {
  await buscarFuncionReservable(page);
  const titulo = (await page.getByRole('heading', { level: 1 }).textContent()).trim();
  const codigo = await reservar(page, 2);
  reservas.push(codigo);

  await abrirMisReservas(page);
  const fila = filaDeReserva(page, codigo);
  await expect(page.locator('tbody tr').first()).toContainText(codigoEscrito(codigo));
  await expect(fila).toContainText(titulo);
  await expect(fila.locator('td').nth(3)).toHaveText('2');
  await expect(fila).toContainText(/confirmada/i);

  await fila.getByRole('link', { name: `Ver el comprobante de la reserva ${codigo}` }).click();
  await expect(page.locator('.comprobante-codigo')).toHaveText(codigoEscrito(codigo));
  await expect(page.getByText(titulo).first()).toBeVisible();
});

test('C-1 · cancela la reserva y los lugares vuelven a la función', async ({ page, reservas }) => {
  const ficha = await buscarFuncionReservable(page);
  const antes = await lugaresLibres(page);
  const codigo = await reservar(page, 2);
  reservas.push(codigo);

  await cancelar(page, codigo);

  await abrirMisReservas(page);
  const fila = filaDeReserva(page, codigo);
  await expect(fila).toContainText(/cancelada/i);
  await expect(fila.getByRole('link', { name: `Cancelar la reserva ${codigo}` })).toHaveCount(0);
  await page.goto(ficha);
  expect(await lugaresLibres(page)).toBe(antes);
});

test('C-2 · si elige conservarla, la reserva sigue confirmada', async ({ page, reservas }) => {
  await buscarFuncionReservable(page);
  const codigo = await reservar(page, 1);
  reservas.push(codigo);

  await abrirMisReservas(page);
  await filaDeReserva(page, codigo).getByRole('link', { name: `Cancelar la reserva ${codigo}` }).click();
  await page.getByRole('link', { name: 'Conservar la reserva' }).click();

  await expect(page.locator('.comprobante-codigo')).toHaveText(codigoEscrito(codigo));
  await abrirMisReservas(page);
  await expect(filaDeReserva(page, codigo)).toContainText(/confirmada/i);
});
