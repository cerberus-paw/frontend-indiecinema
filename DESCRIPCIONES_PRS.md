# Descripciones de Pull Requests — Frontend IndieCinema

Documento con las descripciones listas para copiar y pegar en los 4 Pull Requests en GitHub (`#1`, `#2`, `#4` y `#5`), siguiendo el estándar y estructura de los PRs del backend de IndieCinema (**Contexto**, **Cambios introducidos**, **Criterios de aceptación verificados** y **Pruebas realizadas**).

---

## PR #1: `IC-42 Paquete Composer frontend-indiecinema instalable por los subsistemas`

### Contexto
Para evitar la duplicación de plantillas HTML, estilos CSS y scripts de cliente entre los distintos subsistemas del backend (`cuentas`, `programacion`, `funciones`, `moderacion`, `beneficios`), la arquitectura de la Entrega 2 establece la centralización de toda la interfaz gráfica en un único repositorio (`frontend-indiecinema`). Este componente se distribuye como un paquete local de Composer (`cerberus-paw/frontend-indiecinema`), consumido a través de repositorios de tipo `path` (`../../frontend-indiecinema`).

### Cambios introducidos
- **`composer.json`**: Definición formal del paquete `cerberus-paw/frontend-indiecinema` con tipo `library`, licencia MIT y descripción técnica del alcance.
- **Estructura de directorios**: Organización de la jerarquía de directorios estándar:
  - `plantillas/`: Espacio centralizado para plantillas y parciales de Twig.
  - `estaticos/`: Recursos servidos de manera directa por Nginx (`css/`, `js/`, `img/`).
- **`README.md`**: Documentación arquitectónica completa que explica el esquema de inclusión como repositorio local `path`, el orden de precedencia de resolución de plantillas en Twig y las pautas para correr en desarrollo sin Docker.

### Criterios de aceptación verificados
- [x] El paquete es reconocido por Composer y se instala correctamente mediante `composer update cerberus-paw/frontend-indiecinema` en los repositorios de subsistemas.
- [x] La estructura de directorios respeta el contrato acordado en la Entrega 2 para Nginx y el cargador de plantillas de Twig.

### Pruebas realizadas
- Validación de configuración y sintaxis mediante `composer validate`.
- Verificación de resolución de rutas relativas desde un subsistema hermano simulado.

---

## PR #2: `IC-43 Plantilla base Twig: encabezado, menú según el rol y pie`

### Contexto
Se requiere dotar a la plataforma de una estructura HTML unificada y semántica que garantice consistencia en todos los subsistemas. Esta base incluye el encabezado de navegación superior con menú adaptativo según el rol de sesión del usuario, la plantilla de captura y visualización de errores HTTP, y el pie de página institucional.

### Cambios introducidos
- **`plantillas/base.html.twig`**: Esqueleto HTML5 con metadatos (`charset`, `viewport`, `csrf`), favicon oficial en SVG, vinculación de hojas de estilo e inclusión diferida (`defer`) de scripts. Dispone de los bloques `titulo`, `estilos`, `contenido` y `scripts`.
- **`plantillas/parciales/encabezado.html.twig`**: Barra superior de navegación que incluye:
  - Logotipo oficial vectorial sobre fondo oscuro (`logo-horizontal-dark.svg`).
  - Buscador accesible por GET hacia el catálogo de obras (`/obras`).
  - Navegación pública a `/cartelera`, `/salas`, `/obras` y `/como-funciona`.
  - Menú adaptativo de usuario con componente nativo accesible `<details>` / `<summary>`, desplegando opciones según los roles `espectador`, `organizador` y `administrador`.
  - Cierre de sesión seguro mediante formulario POST con token CSRF hacia `/cuenta/salir`.
  - Resolución de ruta activa normalizada (`(prefijo ?? '') ~ (ruta_actual ?? '')`) para subsistemas con prefijo.
- **`plantillas/parciales/pie.html.twig`**: Pie de página estructurado en 4 columnas temáticas (Identidad, Exploración, Participación y Comunidad) con créditos institucionales de UNLu y Grupo Cerberus.
- **`plantillas/error.html.twig`**: Plantilla común de visualización de errores que renderiza el código HTTP y el mensaje provisto por el núcleo del sistema, adaptando las acciones de retorno (botón «Ingresar» para error 401 y retorno a cartelera para otros estados).

### Criterios de aceptación verificados
- [x] Compatibilidad con el modo estricto de Twig (`strict_variables = true`) resguardando variables con `usuario ?? null` y condicionales seguros.
- [x] Accesibilidad por teclado: el menú desplegable permite cierre mediante tecla Escape y devuelve el foco al disparador.
- [x] Las rutas de navegación se alinean a las especificaciones del backlog E3 (`/cartelera`, `/obras`, `/cuenta/admin`).
- [x] Cierre de sesión protegido contra ataques CSRF al ejecutarse por método POST.

### Pruebas realizadas
- Navegación con diferentes roles simulados (`visitante`, `espectador`, `organizador`, `administrador`).
- Simulación de estados HTTP 401, 403, 404 y 500 verificando la coherencia entre el título, descripción y botones de navegación.

---

## PR #4: `IC-44 CSS de la identidad: paleta, tipografías y diseño responsive`

### Contexto
Implementación integral de la identidad visual de IndieCinema (definida en la Entrega 1) y el sistema de diseño en CSS vanilla. El diseño abarca desde dispositivos móviles pequeños (360 px) hasta monitores de escritorio (1440 px), asegurando una experiencia cinematográfica inmersiva, accesible y de alto rendimiento.

### Cambios introducidos
- **`estaticos/css/estilos.css`**: Hoja de estilos principal modularizada en CSS vanilla:
  - **Tokens de diseño (`:root`)**: Paleta oficial de la E1: **Tinta** (`#17141C`) para fondos y superficies oscuras, **Ámbar** (`#F0A63B`) para color insignia de marca, acentos y llamadas a la acción, y **Crema** (`#FBF4E7`) para textos y contrastes.
  - **Tipografía oficial**: Carga e integración de **Fira Sans Condensed** (de Google Fonts) como tipografía transversal para títulos y textos de cuerpo.
  - **Componentes y utilidades**: Normalización moderna de caja (`box-sizing: border-box`), escalas modulares de espaciado, radios de curvatura, sombras cinematográficas difusas y estilos de navegación.
  - **Diseño responsive**: Media queries fluidas adaptadas a breakpoints móviles (360 px, 480 px, 768 px), tablets (1024 px) y escritorio (1240 px), con control estricto anti-overflow (`overflow-x: hidden`).
- **Activos de marca**: Integración de los archivos de identidad vectorial en `estaticos/img/` (`logo-horizontal-dark.svg`, `icon.svg`, variantes apiladas y favicon oficial en `base.html.twig`).

### Criterios de aceptación verificados
- [x] Cumplimiento de contrastes de color WCAG 2.1 AA/AAA en combinaciones de texto Crema sobre fondos Tinta y botones Ámbar con texto oscuro.
- [x] Tipografía Fira Sans Condensed activa en encabezados, controles y textos.
- [x] Visualización responsive verificada sin desbordes horizontales desde 360 px de ancho.

### Pruebas realizadas
- Pruebas de renderizado responsive en resoluciones de 360 px, 412 px, 768 px, 1024 px y 1440 px.
- Inspección de contraste cromático con herramientas de accesibilidad en navegadores.

---

## PR #5: `IC-45 Parciales comunes: formularios, mensajes y tarjeta de función`

### Contexto
Para evitar la repetición de código HTML y consolidar la accesibilidad en todos los formularios y vistas de la plataforma, se implementan los componentes parciales reutilizables de Twig para campos, alertas, botones y tarjetas de función de cine, incorporando todas las correcciones de revisión recibidas sobre la cadena de PRs.

### Cambios introducidos
- **`plantillas/parciales/campo.html.twig`**: Componente universal para entradas de formulario con soporte para tipos `text`, `email`, `password`, `number`, `textarea`, `select`, `file` y `checkbox`. Incorpora soporte accesible (`aria-invalid="true"`, `aria-describedby` y `role="alert"` para mensajes de error).
- **`plantillas/parciales/mensaje.html.twig`**: Componente de avisos y notificaciones en variantes `exito`, `error`, `advertencia` e `info`, con icono contextual y soporte de botón de descarte.
- **`plantillas/parciales/boton.html.twig`**: Componente para renderizado de botones `<button>` o enlaces `<a>` con variantes `primario`, `secundario`, `peligro` y `fantasma`, y tamaños `chico`, `mediano` y `grande`.
- **`plantillas/parciales/tarjeta_funcion.html.twig`**: Tarjeta de función cinematográfica para Cartelera y Home con insignia de estado (`PROGRAMADA`, `EN VOTACIÓN`, `ACUERDO DE FECHA`), precio, afiche/placeholder, sala, localidad, fecha y enlace canónico hacia `/funcion/{id}`.
- **`plantillas/cuentas/registro.html.twig`**: Formulario de creación de cuenta adaptado a los parciales comunes, con token CSRF limpio (`value="{{ csrf }}"`) y variables estandarizadas en `valores` y `errores`.
- **`plantillas/programacion/alta_sala.html.twig`**: Rediseño completo para Programación (IC-35 / IC-36) con los campos requeridos: nombre, descripción, dirección, localidad, capacidad, fotografía e intervalos de funciones, retirando la documentación legal de moderación y la plantilla obsoleta `solicitud_sala.html.twig`.
- **`estaticos/js/app.js`**: Utilidad `enviar(recurso, opciones)` que extrae el token desde `<meta name="csrf">`, valida origen seguro (*same-origin*), inyecta `X-CSRF-Token` únicamente en métodos mutables (`POST`, `PUT`, `DELETE`, `PATCH`) y preserva cabeceras en instancias de `Request`.

### Criterios de aceptación verificados
- [x] Formularios basados estrictamente en `valores` (default `''`) y `errores` (default `null`).
- [x] Token CSRF operativo en cliente sin modificar el `fetch` global ni inyectar inputs dinámicos innecesarios.
- [x] Eliminación de `solicitud_sala.html.twig` en cuentas y migración a los campos de programación en `alta_sala.html.twig`.
- [x] Rutas canónicas actualizadas hacia `/cartelera`, `/obras`, `/funcion/mis-reservas` y `/cuenta/admin`.

### Pruebas realizadas
- Renderizado de campos con y sin errores de validación en los formularios de registro y alta de sala.
- Envío simulado con la utilidad `enviar()` verificando la cabecera `X-CSRF-Token` en llamadas mutables.
