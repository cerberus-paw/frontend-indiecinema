# Casos de las pruebas de punta a punta

Primero se escriben los casos y después se automatizan (lo pidió el profesor en la clase del
02/11). Cada caso dice qué hace el usuario y qué tiene que ver. La prueba que lo cubre lleva el
mismo número en el título, así un rojo en Actions se busca acá.

Las pruebas recorren el sitio como un espectador, desde el navegador: no llaman a la API. Usan una
cuenta de espectador que ya existe (`E2E_CORREO` y `E2E_CLAVE`) y una función de la cartelera que
se pueda reservar, con al menos 3 lugares libres. Lo que reservan lo cancelan al terminar, así
se pueden correr muchas veces contra el mismo sitio sin agotar las funciones.

## Ingresar

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| I-1 | Ingresa con el correo y la contraseña de la cuenta | Sale de «Ingresar» y el encabezado tiene su menú, con «Mis reservas» |
| I-2 | Ingresa con la contraseña equivocada | Sigue en «Ingresar», con «No pudimos iniciar tu sesión», y sin sesión |
| I-3 | Sin sesión, entra a «Mis reservas» escribiendo la dirección | «Tenés que ingresar para ver esta página», con el botón «Ingresar», y no ve reservas |
| I-4 | Sin sesión, abre la ficha de una función | Ve «Ingresá con tu cuenta para reservar» y no el formulario |

## Reservar

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| R-1 | Reserva 2 lugares desde la ficha | «Reserva confirmada» con el código, sin recargar, y 2 lugares libres menos |
| R-2 | Aprieta dos veces seguidas «Reservar mis lugares» con 1 lugar | Una sola reserva: 1 lugar libre menos, no 2 |
| R-3 | Pide 0 lugares, y después -1 | No se reserva: el campo queda inválido y los lugares libres no cambian |
| R-4 | Pide un lugar más de los que quedan | No se reserva: el campo queda inválido y los lugares libres no cambian |
| R-5 | Escribe letras en la cantidad | No se reserva |

## Mis reservas y cancelar

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| M-1 | Después de R-1, abre «Mis reservas» desde el menú | La reserva está primera, con su código, sus 2 lugares y el estado «confirmada» |
| M-2 | Abre el comprobante desde «Mis reservas» | El mismo código y la cantidad |
| C-1 | Cancela la reserva desde «Mis reservas» y confirma | La reserva queda «cancelada», ya no se puede cancelar y los lugares vuelven a la función |
| C-2 | Entra a cancelar y elige «Conservar la reserva» | La reserva sigue «confirmada» |

## Teclado

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| T-1 | Sin sesión, abre la portada y aprieta Tab, y después Enter | Con Tab, el foco está en «Saltar al contenido», que se ve; con Enter, el foco pasa al contenido principal |
## Menú del usuario

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| U-1 | Con sesión, abre el menú del encabezado con Enter, lo recorre con Tab, lo cierra con Esc, lo vuelve a abrir con Espacio y hace clic afuera | Se abre; Tab pasa por «Panel de mi cuenta» y «Mis reservas»; Esc lo cierra con el foco de vuelta en el botón; Espacio lo abre y el clic afuera lo cierra |

## Lo que todavía no cubren

Votar títulos, proponer y votar franjas, confirmar la franja ganadora y el panel de reservas del
organizador (con sus bordes: cerrar una votación sin llegar al mínimo, entre otros). Necesitan
una función en cada estado y una cuenta de organizador en el entorno de desarrollo; van cuando
ese entorno tenga sus datos.
