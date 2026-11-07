# Pruebas de punta a punta

Playwright abre el sitio en Chromium y lo recorre como un espectador: no llama a la API. Los casos
están en [`casos.md`](casos.md); cada prueba lleva su número en el título.

Corren contra un sitio ya levantado (el de la máquina, con el back en Docker, o el de desarrollo),
con una cuenta de espectador que ya exista. La cuenta sale del entorno y no del código, porque el
repositorio es público:

```
npm ci
npx playwright install --with-deps chromium   # la primera vez

E2E_URL=http://localhost:8080 E2E_CORREO=eva@indiecinema.test E2E_CLAVE=espectador2026 npm run e2e
```

| Variable | Qué es |
| --- | --- |
| `E2E_URL` | El sitio, sin la barra final. Sin ella, `http://localhost:8080` |
| `E2E_CORREO` y `E2E_CLAVE` | La cuenta de espectador (en local, la de Eva de los datos de prueba) |
| `E2E_ORGANIZADOR_CORREO` y `E2E_ORGANIZADOR_CLAVE` | Opcional: una cuenta de organizador con salas y funciones, para A-3 (en local, la de los datos de prueba). Sin ella, A-3 se saltea |
| `E2E_ADMINISTRADOR_CORREO` y `E2E_ADMINISTRADOR_CLAVE` | Opcional: la cuenta del administrador, para A-4. Sin ella, A-4 se saltea |
| `E2E_FUNCION` | Opcional: el id de la función donde reservan. Sin ella, la primera de la cartelera que se pueda reservar |

- **Qué dejan:** en `resultados/`, la traza y la captura de cada prueba que falló
  (`npx playwright show-trace e2e/resultados/<prueba>/trace.zip` la reproduce paso a paso); en
  `informe/`, el informe HTML (`npx playwright show-report e2e/informe`).
- **Sin rastros:** lo que reserva cada prueba lo cancela al terminar, pase o falle. Necesitan una
  función de la cartelera que se pueda reservar con al menos 3 lugares libres.
- **Un solo ingreso:** se ingresa una vez y las demás pruebas reusan la sesión, porque nginx deja
  ingresar 5 veces por minuto desde la misma IP. Cada corrida ingresa 2 veces (una bien y una con
  la contraseña equivocada), y una más por cada cuenta del panel que esté en el entorno: si se
  corre muchas veces seguidas, el ingreso da 429 y hay que esperar un minuto.
- **De a una:** comparten la cuenta y cuentan los lugares libres, así que no corren en paralelo.
  Dos corridas a la vez (en Actions, la del back y la del front) necesitan cada una su cuenta y
  su `E2E_FUNCION`.
