// Caso I-1 de e2e/casos.md. Ingresa una vez con la cuenta del espectador y guarda la cookie de la
// sesión para las pruebas que la necesitan (ARCHIVO_DE_SESION en ayudas.js).
import { test as preparar, expect } from '@playwright/test';
import { ingresar, ARCHIVO_DE_SESION } from '../ayudas.js';

preparar('I-1 · ingresa con su correo y su contraseña', async ({ page }) => {
  await ingresar(page);
  await expect(page).not.toHaveURL(/\/cuenta\/ingresar/);
  await expect(page.getByRole('menuitem', { name: 'Mis reservas', includeHidden: true })).toBeAttached();
  await page.context().storageState({ path: ARCHIVO_DE_SESION });
});
