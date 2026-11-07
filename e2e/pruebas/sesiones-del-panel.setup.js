// Las sesiones del organizador y del administrador, para las pruebas de los paneles (casos A-*
// de e2e/casos.md). Como sesion.setup.js: se ingresa una vez y se guarda la cookie. Las cuentas
// salen del entorno (e2e/README.md); sin ellas, no se ingresa y esas pruebas se saltean.
import { testSinSesion as preparar, expect, ingresar, CUENTAS_DEL_PANEL } from '../ayudas.js';

for (const [rol, { correo, clave, archivo }] of Object.entries(CUENTAS_DEL_PANEL)) {
  preparar(`ingresa como ${rol}`, async ({ page }) => {
    preparar.skip(!correo || !clave, `Sin la cuenta del ${rol} en el entorno.`);
    await ingresar(page, { correo, clave });
    await expect(page).not.toHaveURL(/\/cuenta\/ingresar/);
    await page.context().storageState({ path: archivo });
  });
}
