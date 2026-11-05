// Caso F-1 de e2e/casos.md: el resumen de errores de un formulario que volvió del servidor
// (E4-10.5). Sin sesión: el registro no tiene validación en línea, así que el envío vacío llega
// al servidor y vuelve con los errores.
import { test, expect } from '@playwright/test';

test('F-1 · el resumen de errores recibe el foco y cada link lleva a su campo', async ({ page }) => {
  await page.goto('/cuenta/registro');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  const resumen = page.getByRole('alert').filter({ hasText: /Revisá \d+ campos/ });
  await expect(resumen).toBeFocused();
  const enlaces = resumen.getByRole('link');
  await expect(enlaces.first()).toHaveAttribute('href', '#nombre');

  await page.keyboard.press('Tab');
  await expect(enlaces.first()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByLabel('Nombre completo o apodo')).toBeFocused();
});
