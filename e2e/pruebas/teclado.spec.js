// Caso T-1 de e2e/casos.md: lo que se hace con el teclado y el HTML solo no muestra. Sin sesión:
// «Saltar al contenido» está en todas las páginas, y la portada alcanza para ver que el foco baja.
import { test, expect } from '@playwright/test';

test('T-1 · «Saltar al contenido» es lo primero y lleva el foco al contenido', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  const saltar = page.getByRole('link', { name: 'Saltar al contenido' });
  await expect(saltar).toBeFocused();
  await expect(saltar).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});
