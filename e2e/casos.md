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
## Contraste

Miden el color que calcula el navegador contra el fondo real del texto (WCAG 1.4.3, 4,5:1), sin
sesión y en el registro, que tiene ayudas, placeholders y errores.

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| K-1 | Abre el registro | La ayuda de un campo da al menos 4,5:1 contra su fondo |
| K-2 | Abre el registro | El placeholder de un campo da al menos 4,5:1 contra el fondo del campo |
| K-3 | Manda el registro vacío | El error de un campo da al menos 4,5:1 contra su fondo |

## Ordenar la cartelera

Sin sesión. Necesitan al menos dos páginas de cartelera (más de 12 funciones), como en los datos
de prueba.

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| O-1 | En la cartelera, elige «Precio: mayor a menor» en «Ordenar por» | Sin recargar, las funciones van de la más cara a la más barata, la dirección lleva el orden y no aparece «Limpiar» |
| O-2 | Con ese orden, pasa a la página siguiente | La dirección y el desplegable conservan el orden, y los precios siguen bajando desde el último de la primera página |
| O-3 | Elige un orden, después otro, y aprieta «Atrás» | Vuelve el primer orden, en el desplegable y en las funciones |
| O-4 | Con un orden elegido, busca algo que no hay y después borra la búsqueda | Sin funciones no está «Ordenar por»; al volver las funciones, vuelve con el mismo orden |
| O-5 | Abre una búsqueda sin funciones y la borra | Aparece «Ordenar por», que no estaba |
| O-6 | Sin JavaScript, elige «Precio: menor a mayor» y aprieta «Ordenar» | Carga la cartelera de la más barata a la más cara |

## Filtrar por precio

Sin sesión, con los datos de prueba: hay funciones a la gorra (precio 0).

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| PR-1 | Escribe 0 en «Precio hasta» y deja de escribir | Sin recargar, sólo funciones «A la gorra», y la dirección lleva `precio_max=0` |

## Paginado de la cartelera

Sin sesión. Necesitan más de una página de cartelera (más de 12 funciones), como en los datos de
prueba.

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| PG-1 | En la compu, aprieta el número 2 del paginado | Sin recargar, la página 2, con el 2 marcado como la actual |
| PG-2 | En el celular, baja hasta el final de la cartelera | Sin números de página, se agregan las funciones de la página siguiente |
| PG-3 | En el celular, elige «Tradicional» en «Paginado» y recarga | Sigue en «Tradicional», con los números de página |
| PG-4 | Sin JavaScript, abre la cartelera | No ve «Paginado», y los números de página llevan a cada página |

## Últimas búsquedas

Sin sesión. Cada prueba arranca con el navegador vacío, sin búsquedas guardadas.

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| U-1 | Hace seis búsquedas distintas | Quedan las últimas cinco, la más nueva primero: la primera desapareció |
| U-2 | Escribe una palabra de a poco, sin salir del campo, y después sale | Mientras escribe no se guarda nada; al salir queda una sola búsqueda, la de la palabra entera |
| U-3 | Aprieta una de las últimas búsquedas | Sin recargar, la cartelera de esa búsqueda, con los filtros puestos en el formulario |
| U-4 | Elige sólo un orden, sin filtros | No se guarda: un orden no es una búsqueda |
| U-5 | Aprieta «Borrar historial» | Desaparecen las búsquedas y la sección |

## Anchos de pantalla

Cada pantalla, a 360 px (un celular), 768 px (una tableta) y 1280 px (la compu). Se usa si no
hay que desplazarse de costado, si nada queda cortado fuera de la pantalla y si las tablas más
anchas se desplazan dentro de su recuadro. La cartelera se suma cuando siga el wireframe.

| Caso | Qué hace | Qué tiene que ver |
| --- | --- | --- |
| A-1 | Sin sesión, abre la portada, una ficha, las salas, una sala, ingresar y registro | Cada una se usa a los tres anchos |
| A-2 | Con sesión, abre la reserva de una función y «Mis reservas» | Cada una se usa a los tres anchos |
| A-3 | Como organizador, abre «Mis salas», «Mis funciones» y las reservas de una función | Cada una se usa a los tres anchos; las tablas se desplazan en su recuadro |
| A-4 | Como administrador, abre los usuarios, las reservas y las solicitudes | Cada una se usa a los tres anchos; las tablas se desplazan en su recuadro |

## Lo que todavía no cubren

Votar títulos, proponer y votar franjas, confirmar la franja ganadora y el panel de reservas del
organizador (con sus bordes: cerrar una votación sin llegar al mínimo, entre otros). Necesitan
una función en cada estado y una cuenta de organizador en el entorno de desarrollo; van cuando
ese entorno tenga sus datos.
