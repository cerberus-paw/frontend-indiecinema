# Plan de Correcciones para Pull Requests — Frontend IndieCinema

Documento consolidado de correcciones y observaciones recibidas en el Pull Request **#5** (revisión de **Meizers**) que aplican a la cadena de ramas `IC-42`, `IC-43`, `IC-44` e `IC-45`.

> **Estrategia acordada:**  
> Para evitar reescribir y rebasear toda la cadena de ramas, **todas las correcciones se realizarán en un único commit nuevo sobre la rama `IC-45-parciales-comunes-formularios-mensajes-y-tarjeta-de-funcion`**, permitiendo el merge conjunto de los 4 PRs.

---

## 1. CSRF desde JavaScript (`app.js` y `base.html.twig`)

### Diagnóstico actual
* La cookie `csrf` del backend tiene el flag `HttpOnly`, por lo que `document.cookie` no tiene acceso a ella.
* `obtenerTokenCsrf()` siempre retorna una cadena vacía y la lógica automática de CSRF en cliente queda inoperativa.
* `app.js` inyecta inputs ocultos `_csrf` dinámicamente en los formularios POST, lo cual es innecesario y riesgoso si JavaScript no carga (los formularios deben traerlo directo desde Twig).
* `app.js` sobrescribe `window.fetch` de forma global dentro de `DOMContentLoaded`:
  * Scripts en `{% block scripts %}` pueden ejecutarse antes de que se instale la sobreescritura.
  * Envía el token `X-CSRF-Token` indiscriminadamente a cualquier URL (incluso a dominios externos / terceros).
  * No contempla llamadas usando instancias de `Request`.
  * Si una cabecera `x-csrf-token` ya existe en minúsculas, la duplica generando un error HTTP 403 en el servidor.
* En los formularios se está usando `value="{{ _csrf ?? (csrf ?? '') }}"` en lugar de una sintaxis directa y unificada.

### Correcciones requeridas
1. **En `plantillas/base.html.twig`:**
   * Agregar en el `<head>` la etiqueta meta:
     ```html
     <meta name="csrf" content="{{ csrf }}">
     ```
2. **En `estaticos/js/app.js`:**
   * Leer el token CSRF directamente del `<meta name="csrf">`:
     ```javascript
     const token = document.querySelector('meta[name="csrf"]')?.getAttribute('content') || '';
     ```
   * **Eliminar** la función y el ciclo que agregan inputs ocultos `_csrf` a los formularios (los formularios ya lo incorporan desde las plantillas Twig).
   * **Eliminar** la sobrescritura global de `window.fetch`.
   * Implementar una función utilitaria propia y exportada/accesible (ej: `enviar(url, opciones)`):
     * Validar que la URL de destino sea del **mismo origen** (*same-origin*) antes de adjuntar el token.
     * Añadir la cabecera `X-CSRF-Token` únicamente para métodos mutables (`POST`, `PUT`, `DELETE`, `PATCH`).
     * Manejar la cabecera de forma insensible a mayúsculas/minúsculas para evitar duplicados.
     * Estar disponible inmediatamente (sin esperar a `DOMContentLoaded`).
3. **En plantillas con formularios (`registro.html.twig`, etc.):**
   * Simplificar el campo oculto a:
     ```html
     <input type="hidden" name="_csrf" value="{{ csrf }}">
     ```

---

## 2. Identidad Visual de la Entrega 1 (E1)

### Diagnóstico actual
* La paleta de colores en `estaticos/css/estilos.css` utiliza tonos genéricos (`#0b0d14`, `#f59e0b`, `#e11d48`, etc.) en lugar de la identidad visual oficial definida para la E1.
* Se están importando y utilizando las fuentes *Outfit* e *Inter*, en lugar de la tipografía oficial del proyecto.
* En `plantillas/parciales/encabezado.html.twig` y `pie.html.twig` se utiliza un emoji de claqueta (`🎬`) y texto estilizado en vez del logotipo vectorial oficial.
* Existe un archivo no utilizado `estaticos/img/logo.svg`.
* No está declarado el favicon en `base.html.twig`, provocando que el navegador solicite `/favicon.ico` al subsistema de programación y genere un error 404 innecesario.

### Correcciones requeridas
1. **Paleta cromática oficial (actualizar variables en `estilos.css`):**
   * **Tinta:** `#17141C` (fondo oscuro / texto principal).
   * **Ámbar:** `#F0A63B` (color insignia / acento / play / perforaciones).
   * **Crema:** `#FBF4E7` (texto y logos sobre fondo oscuro).
   * Ajustar superficies, contrastes y hover derivados de esta tríada cromática.
2. **Tipografía oficial:**
   * Reemplazar las fuentes *Outfit* e *Inter* por **Fira Sans Condensed** (de Google Fonts).
   * Actualizar el `<link>` de fuentes en `base.html.twig` y las variables `--fuente-titulos` y `--fuente-cuerpo` en `estilos.css`.
3. **Logotipo y favicon:**
   * Mover/integrar los activos entregados en `img/` dentro de `estaticos/img/`.
   * En `encabezado.html.twig`: Reemplazar el emoji `🎬` por `logo-horizontal-dark.svg`.
   * Eliminar `estaticos/img/logo.svg` que quedó obsoleto.
   * En `base.html.twig`: Incluir el favicon oficial en el `<head>`:
     ```html
     <link rel="icon" type="image/svg+xml" href="/estaticos/img/icon.svg">
     ```

---

## 3. Link Activo en el Menú de Navegación

### Diagnóstico actual
* En los subsistemas montados bajo un prefijo (por ejemplo `/cuenta/`), la variable `ruta_actual` llega sin dicho prefijo (ej: llega `/`), lo que provoca que erróneamente se marque como activo el enlace de «Cartelera» (`/`).

### Correcciones requeridas
* En `plantillas/parciales/encabezado.html.twig`, componer la ruta completa antes de evaluar la clase `.activo`:
  ```twig
  {% set ruta = (prefijo ?? '') ~ (ruta_actual ?? '') %}
  ```
* Asegurar que la evaluación de clase activa en cada enlace del menú compare contra esta ruta completa normalizada.

---

## 4. Consistencia de Rutas con el Backlog del Proyecto

### Diagnóstico actual
Múltiples enlaces apuntan a rutas inexistentes o inconsistentes con los contratos de los subsistemas y el backlog, provocando errores 404 al navegar:
* **Cartelera:** Enlaza a `/` en lugar de `/cartelera` (`/` es la portada/inicio).
* **Películas:** Enlaza a `/peliculas` en vez de `/obras`, y sus fichas de detalle a `/obras/{id}`.
* **Mis reservas:** Enlaza a `/cuenta/reservas` en lugar de `/funcion/mis-reservas` (las reservas pertenecen al subsistema de funciones).
* **Administración:** Enlaces como `/admin/...` caen en programación; deben apuntar a `/cuenta/admin/...`. Los parámetros de reparto pertenecen a beneficios (E4).
* **Solicitar sala:** Enlaza a `/salas/solicitar` o similar; la solicitud de admisión con documentación pertenece a moderación (E4: `/moderacion/solicitar-sala`).
* **Formularios de subsistema:**
  * Registro envía a `/cuentas/registro`; debe ser `/cuenta/registro` (o utilizar `{{ ruta('/registro') }}`).
  * Alta de sala envía a `/programacion/salas/alta`; debe apuntar a la ruta canónica en raíz (`/organizador/salas/nueva` o `{{ ruta('/salas/nueva') }}`).
* **Buscador global:** En el encabezado envía a `/buscar`, ruta no definida en el backlog (las salas y películas cuentan con sus propios buscadores dedicados).
* **Funcionalidades de entregas futuras (E3 / E4):**
  * Enlaces como contacto, normas, términos, denuncias, puntos, pagos, estadísticas y moderación no existen en esta fase y generan 404.
* **Cierre de sesión:**
  * Se implementó como un enlace `<a>` por método GET hacia `/cuenta/salir`.
  * Un GET no pasa control CSRF y permite ataques donde un tercero cierra la sesión forzadamente redirigiendo al usuario.

### Correcciones requeridas
1. **Actualizar rutas canónicas en `encabezado.html.twig`, `pie.html.twig` y `tarjeta_funcion.html.twig`:**
   * Cartelera: `/cartelera`.
   * Catálogo de películas: `/obras`.
   * Ficha de película / detalle: `/obras/{id}`.
   * Mis reservas: `/funcion/mis-reservas`.
   * Administración: `/cuenta/admin/...`.
   * Solicitar sala (moderación E4): `/moderacion/solicitar-sala`.
2. **Ajustar rutas de formularios con helper de subsistema:**
   * Usar `action="{{ ruta('/registro') }}"` o `/cuenta/registro`.
3. **Buscador del encabezado:**
   * Definir comportamiento o redirigir al catálogo de obras `/obras`.
4. **Ocultar / retirar enlaces que no pertenecen a la E3:**
   * Quitar o comentar enlaces a páginas huérfanas (puntos, pagos, términos, normas, denuncias, contacto) para que la demo no genere errores 404.
5. **Cierre de sesión por POST con token CSRF:**
   * Transformar el enlace de cerrar sesión en un formulario POST seguro:
     ```html
     <form action="/cuenta/salir" method="POST" class="form-cerrar-sesion">
       <input type="hidden" name="_csrf" value="{{ csrf }}">
       <button type="submit" class="menu-item menu-item-cerrar">
         <span class="menu-icono" aria-hidden="true">🚪</span> Cerrar sesión
       </button>
     </form>
     ```

---

## 5. Plantilla de Página de Error (`error.html.twig`)

### Diagnóstico actual
* El texto fijo descriptivo debajo del título (`<p class="error-descripcion">`) a menudo entra en contradicción directa con el mensaje emitido por el núcleo de la aplicación:
  * Error 401: El núcleo dice *«Tenés que ingresar.»* y abajo la plantilla agrega *«No contás con los permisos suficientes.»*.
  * Error 403 (CSRF): El núcleo dice *«La página venció.»* y abajo se reitera el mensaje de permisos.
* En el error 401, el botón de acción dice *«Ir a mi cuenta»* (`/cuenta/`) en lugar de orientar al usuario a iniciar sesión.

### Correcciones requeridas
1. **Eliminar el bloque con mensajes fijos alternativos:** Mostrar exclusivamente la variable `{{ mensaje }}` provista por el núcleo del sistema.
2. **Acción adaptativa según estado HTTP:**
   * Para estado `401`: mostrar botón principal **«Ingresar»** con enlace a `/cuenta/ingresar`.
   * Para otros estados: mantener enlace de retorno a `/cartelera` o portada.

---

## 6. Variables y Valores por Defecto en Formularios

### Diagnóstico actual
* En `alta_sala.html.twig` se dejaron valores hardcodeados de ejemplo por defecto (ej: `valores.nombre_sala ?? 'El Galpón de la Estación'`, `errores.capacidad ?? 'No coincide.'`, `errores.tipo_butacas ?? 'Completá.'`).
* La condición de observación de moderador incluye un `or true` (`{% if observacion_moderador is defined or true %}`), lo que hace que siempre se muestre una alerta de error fija aún cuando el formulario se carga por primera vez.

### Correcciones requeridas
1. **Estandarizar variables en todos los formularios:**
   * Todos los formularios deben basarse estrictamente en dos variables provistas por el controlador: `valores` y `errores`.
   * Los valores por defecto deben ser cadena vacía `''` (para inputs) y `null` (para errores o mensajes condicionales).
2. **Eliminar el `or true` y textos de prueba:**
   * La alerta de observación de moderación solo debe mostrarse si la variable existe y contiene datos (`{% if observacion_moderador is defined and observacion_moderador %}`).

---

## 7. Redefinición de la Pantalla de Alta de Sala (`alta_sala.html.twig`)

### Diagnóstico actual
* La plantilla actual `plantillas/programacion/alta_sala.html.twig` implementa la *Solicitud de admisión de sala* con documentación legal (póliza de seguro, certificado de habilitación, planos), la cual corresponde al subsistema de **Moderación (Entrega 4: `/moderacion/solicitar-sala`)**.
* Para la tarea **IC-36** de Programación se requiere el **Alta y edición de sala de programación** (`/organizador/salas/nueva`), con los campos especificados en **IC-35**.
* La plantilla alias `plantillas/cuentas/solicitud_sala.html.twig` es innecesaria y debe eliminarse (el subsistema de cuentas no gestiona salas).

### Correcciones requeridas
1. **Eliminar `plantillas/cuentas/solicitud_sala.html.twig`**.
2. **Rehacer `plantillas/programacion/alta_sala.html.twig` con los campos reales de IC-35 / IC-36:**
   * Nombre de la sala.
   * Descripción del espacio.
   * Dirección y Localidad.
   * Capacidad de espectadores.
   * Imagen de la sala.
   * Cantidad de películas por función.
   * Duración promedio de la función.
   * Tiempo de intervalo entre funciones.
3. Eliminar los campos de póliza, certificados PDF y documentación legal de moderación en esta vista.

---

## 8. Documentación y Metadatos de Pull Requests

### Correcciones requeridas
* Redactar descripciones claras y completas en Markdown para cada uno de los 4 Pull Requests en GitHub (`#1`, `#2`, `#4` y `#5`), siguiendo el formato y estándar utilizado en los PRs del backend (Contexto, Cambios introducidos, Criterios de aceptación verificados, Pruebas realizadas).
