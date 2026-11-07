// Caso U-1 de e2e/casos.md: el menú del usuario con el teclado, que el HTML solo no muestra. Es un
// desplegable de enlaces que se recorre con Tab, no un menú de aplicación (IC-301).
import { test, expect, menuDelUsuario } from '../ayudas.js';

test('U-1 · el menú del usuario se abre con el teclado, se recorre con Tab y Esc lo cierra', async ({ page }) => {
  await page.goto('/acerca-de');
  const menu = menuDelUsuario(page);
  const boton = menu.locator('summary');

  // Se abre con Enter y Tab recorre sus enlaces en orden.
  await boton.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('open');
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', { name: 'Panel de mi cuenta' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(menu.getByRole('link', { name: 'Mis reservas' })).toBeFocused();

  // Esc lo cierra y el foco vuelve al botón, no se pierde en la página.
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open');
  await expect(boton).toBeFocused();

  // Con Espacio también se abre, y un clic afuera lo cierra.
  await page.keyboard.press(' ');
  await expect(menu).toHaveAttribute('open');
  await page.getByRole('main').click({ position: { x: 5, y: 5 } });
  await expect(menu).not.toHaveAttribute('open');
});
