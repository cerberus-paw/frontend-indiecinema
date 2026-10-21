# Frontend IndieCinema (`cerberus-paw/frontend-indiecinema`)

Paquete Composer que centraliza la capa visual de **IndieCinema**: plantillas Twig, hojas de estilo CSS, scripts JavaScript vanilla y recursos gráficos para todos los subsistemas del proyecto (Grupo Cerberus — UNLu, PAW).

---

## 1. Propósito y Decisiones de Arquitectura (Entrega 2)

Siguiendo las decisiones arquitectónicas de la Entrega 2:
- **Centralización visual:** Toda la interfaz vive en un único repositorio (`frontend-indiecinema`) para evitar duplicación de código y garantizar consistencia de diseño en toda la plataforma, a pesar de que el backend esté dividido en subsistemas independientes (`cuentas`, `programacion`, `funciones`, etc.).
- **Instalación como paquete local (`path`):** Los subsistemas instalan este paquete desde la carpeta hermana mediante un repositorio `path` en Composer (`../../frontend-indiecinema`). No requiere autoloading de clases PHP al contener exclusivamente recursos visuales (plantillas Twig y estáticos).
- **Ruta de estáticos sin prefijos dinámicos:** En producción Nginx sirve directamente la carpeta `estaticos/` bajo la ruta `/estaticos/`. En consecuencia, las plantillas enlazan a `/estaticos/css/...`, `/estaticos/js/...` y `/estaticos/img/...` de forma directa sin llamar a `ruta()`.

---

## 2. Estructura del Repositorio

```
frontend-indiecinema/
├── composer.json               # Definición del paquete cerberus-paw/frontend-indiecinema
├── README.md                   # Documentación técnica del paquete
├── package.json                # Sólo para el CI: stylelint, con las reglas de .stylelintrc.json
├── herramientas/
│   └── compilar-plantillas.php # Compila todas las plantillas con el Twig del núcleo (lo corre el CI)
├── plantillas/                 # Plantillas Twig organizadas por jerarquía
│   ├── base.html.twig          # Plantilla base compartida (esqueleto HTML, bloques titulo y contenido)
│   ├── administracion.html.twig # Armado del panel del administrador: barra lateral, sin encabezado ni pie
│   ├── error.html.twig         # Plantilla común para páginas de error (401, 403, 404, 500, etc.), con «Volver al inicio»
│   ├── parciales/              # Componentes visuales reutilizables
│   │   ├── encabezado.html.twig # Barra de navegación, buscador, accesos según rol y menú de usuario
│   │   ├── pie.html.twig       # Pie de página estructurado según wireframes (Explorar, Participar, etc.)
│   │   ├── campo.html.twig     # Control de formulario con etiqueta, ayuda y error accesible
│   │   ├── mensaje.html.twig   # Alertas de éxito, error, advertencia e información
│   │   ├── boton.html.twig     # Botón o enlace con variantes visuales y tamaños
│   │   ├── tarjeta_funcion.html.twig # Tarjeta de función para home y cartelera
│   │   ├── menu_administracion.html.twig # Barra lateral del panel del administrador
│   │   └── tarjeta_sala.html.twig    # Tarjeta de sala indie para catálogo y «Mis salas»
│   ├── cuentas/                # Plantillas del subsistema cuentas
│   │   ├── administracion_usuarios.html.twig # «Usuarios y roles» del administrador
│   │   └── registro.html.twig  # Formulario de alta de usuario
│   ├── programacion/           # Plantillas del subsistema programación
│   │   ├── acerca_de.html.twig # «Acerca de IndieCinema»: quiénes somos y cómo funciona
│   │   ├── administracion_solicitudes.html.twig # Bandeja de solicitudes de sala del administrador
│   │   ├── alta_funcion.html.twig # Formulario de alta para programar una función (IC-121)
│   │   ├── alta_sala.html.twig # Formulario de edición de sala
│   │   ├── cartelera.html.twig # Cartelera pública con filtros GET, paginado y descarga en CSV
│   │   ├── ficha_funcion.html.twig # Ficha de una función: obras, sala, fecha, precio y estado
│   │   ├── inicio.html.twig    # Portada: buscador, próximas funciones y salas
│   │   ├── mis_funciones.html.twig # «Mis funciones»: las funciones de las salas del organizador, con estado y fecha
│   │   ├── mis_salas.html.twig # Gestión de salas del organizador
│   │   ├── sala.html.twig      # Ficha pública de una sala con sus próximas funciones
│   │   ├── solicitar_sala.html.twig # Solicitud para abrir una sala, con su estado
│   │   └── salas.html.twig     # Catálogo público de salas indie habilitadas, con buscador
│   └── funciones/              # Plantillas específicas del subsistema funciones
│       ├── reservar.html.twig  # Reserva de lugares de una función, con los errores
│       ├── reserva_confirmada.html.twig # Confirmación de la reserva con su código
│       └── pasos_reserva.html.twig # Los pasos de la reserva (Lugares → Comprobante)
└── estaticos/                  # Archivos estáticos servidos por el servidor web
    ├── css/
    │   └── estilos.css         # Hoja de estilos con paleta cinematográfica oscura y responsive
    ├── js/
    │   ├── paw.js              # Clase utilitaria PAW: contenedor, nuevoElemento, cargarScript y enviar con CSRF
    │   ├── app.js              # Clase App: en DOMContentLoaded carga e inicia los componentes de la página
    │   └── componentes/        # Una clase por archivo, cada una recibe su contenedor
    │       ├── buscador-de-cartelera.js # BuscadorDeCartelera: filtra la cartelera sin recargar, con el JSON de la misma URL
    │       ├── enviar-al-elegir.js # EnviarAlElegir: manda un formulario del panel al elegir una opción
    │       ├── menu-usuario.js # MenuUsuario: cierra el menú del usuario con un clic afuera o con Escape
    │       └── parametros-de-sala.js # ParametrosDeSala: los parámetros de la sala elegida, en el alta de función
    └── img/
        ├── icon.svg            # Isotipo e icono oficial de IndieCinema (favicon)
        ├── logo-horizontal-dark.svg # Logotipo horizontal oficial sobre fondo oscuro
        └── logo-stacked-dark.svg    # Logotipo apilado para portadas y cabeceras
```

---

## 3. Jerarquía y Resolución de Plantillas Twig

El núcleo del backend (`IndieCinema\Nucleo\Aplicacion`) configura el cargador de Twig buscando plantillas en el siguiente orden de precedencia:

1. **`plantillas/<subsistema>/`**: Plantillas exclusivas del subsistema activo (por ejemplo, `plantillas/cuentas/` o `plantillas/programacion/`). Permite sobreescribir vistas comunes si un subsistema lo requiere.
2. **`plantillas/` (raíz del front):** Plantilla base (`base.html.twig`), parciales (`parciales/encabezado.html.twig`, `parciales/pie.html.twig`) y plantilla de error (`error.html.twig`).
3. **`nucleo/plantillas/`:** Plantillas mínimas de respaldo provistas por el núcleo para arrancar en caso de que el front no estuviera disponible.

---

## 4. Variables Globales y Contexto en Plantillas

Cada plantilla renderizada por el núcleo recibe automáticamente las siguientes variables y funciones:

| Variable / Función | Tipo | Descripción |
|---|---|---|
| `usuario` | `?Usuario` | Instancia del usuario autenticado o `null` si no hay sesión iniciada. |
| `usuario.nombre` | `?string` | Nombre público para mostrar. Debe validarse antes con `{% if usuario %}`. |
| `usuario.rol.value` | `string` | Nombre del rol: `visitante`, `espectador`, `organizador`, `moderador`, `administrador`. |
| `usuario.alcanza('rol')` | `bool` | Evalúa si el rol del usuario satisface o supera el nivel mínimo indicado. |
| `csrf` | `string` | Token CSRF para incluir en formularios como `<input type="hidden" name="_csrf" value="{{ csrf }}">`. |
| `ruta_actual` | `string` | Ruta HTTP de la petición actual (útil para marcar enlaces activos en el menú). |
| `prefijo` | `string` | Prefijo de ruta del subsistema actual (ej. `""` en programación, `"/cuenta"` en cuentas). |
| `ruta('/path')` | `string` | Función helper que concatena el prefijo del subsistema actual a una ruta relativa interna. |

> **Nota sobre desarrollo:** Twig corre con `strict_variables = true` en entorno de desarrollo. Por lo tanto, cualquier acceso a propiedades anidadas de variables potencialmente nulas (como `usuario.nombre`) debe protegerse siempre con condicionales `{% if usuario %}`.

---

## 5. Menú Dinámico según el Rol (Entrega 3 · IC-97)

El encabezado y el pie adaptan sus opciones y enlaces según el estado de la sesión y el rol, para que cada rol vea sólo sus opciones. Los roles son acumulativos, como en el backend (`Rol::alcanza()`): cada uno ve lo del anterior y lo suyo, con `usuario.alcanza('<rol>')`. Sólo se enlazan pantallas que existen (sin 404).

- **Sin sesión (Invitado / Visitante):**
  - Enlaces a Cartelera (`/cartelera`), Salas (`/salas`), Cómo funciona (`/acerca-de#como-funciona`), Acerca de (`/acerca-de`) y Buscador hacia la cartelera (`action="/cartelera"` con parámetro `q`).
  - Botones de acción: **Ingresar** (`/cuenta/ingresar`) y **Crear cuenta** (`/cuenta/registro`).
  - En el pie: Cartelera y Salas indie, **Ingresar** y **Crear cuenta**, y las secciones de «Acerca de».
- **Espectador (cualquier usuario con sesión):**
  - Acceso al menú de usuario con su avatar, su nombre y una insignia con su rol.
  - Enlace al panel de **Mi cuenta** (`/cuenta/`).
  - No ve los accesos del organizador.
  - Botón seguro de **Cerrar sesión** por POST (`/cuenta/salir`) con token CSRF.
- **Organizador (`usuario.alcanza('organizador')`):**
  - Todo lo de espectador más la gestión de sus salas y sus funciones:
  - Acceso directo en la barra de navegación superior: **Mis salas** (`/organizador/salas`).
  - En el menú desplegable: sección **Panel del Organizador** con accesos a **Mis salas** (`/organizador/salas`), **Mis funciones** (`/organizador/funciones`) y **Publicar una sala** (`/solicitar-sala`, la solicitud de sala).
  - En el pie: accesos a **Mi cuenta**, **Mis salas**, **Mis funciones** y **Publicar una sala**.
- **Moderador y administrador:**
  - Lo mismo que el organizador: el backend los deja entrar a esas pantallas.
  - Todavía no tienen opciones propias: la moderación y la administración (usuarios y roles) no tienen pantalla. Su sección del menú se suma con ellas.

---

## 6. Integración y Prueba en Desarrollo

1. Asegurarse de tener clonados `backend-indiecinema` y `frontend-indiecinema` en el mismo directorio padre:
   ```bash
   ls ../
   # backend-indiecinema  frontend-indiecinema
   ```
2. Instalar las dependencias en cada subsistema del backend:
   ```bash
   composer update cerberus-paw/frontend-indiecinema -d ../backend-indiecinema/cuentas
   composer update cerberus-paw/frontend-indiecinema -d ../backend-indiecinema/programacion
   ```
3. Levantar el servidor local de desarrollo sin Docker:
   ```bash
   cd ../backend-indiecinema
   php -S localhost:8080 herramientas/servidor-local.php
   ```
4. Probar con sesión simulada mediante variables de entorno:
   ```bash
   env ROL=organizador NOMBRE="Salvador Baez" php -S localhost:8080 herramientas/servidor-local.php
   ```

---

## 7. Parciales Twig Comunes (IC-45)

Para evitar duplicar marcado HTML en los cinco subsistemas, el paquete provee componentes parciales Twig reutilizables en `plantillas/parciales/`:

### 7.1 Campo de formulario con validación (`parciales/campo.html.twig`)

Soporta controles de tipo `text`, `email`, `password`, `number`, `textarea`, `select`, `file` y `checkbox`. Incluye etiqueta `<label>`, asterisco de obligatoriedad, texto de ayuda y mensaje de error con accesibilidad (`aria-invalid="true"`, `aria-describedby` y `role="alert"`).

```twig
{% include 'parciales/campo.html.twig' with {
  nombre: 'email',
  etiqueta: 'Correo electrónico',
  tipo: 'email',
  valor: valores.email ?? '',
  placeholder: 'usuario@ejemplo.com',
  ayuda: 'Te enviaremos los comprobantes de reserva.',
  requerido: true,
  error: errores.email ?? null
} %}
```

### 7.2 Mensajes y alertas (`parciales/mensaje.html.twig`)

Permite renderizar avisos de tipo `exito`, `error`, `advertencia` e `info` con icono representativo, título opcional, cuerpo y lista detallada de errores.

```twig
{% include 'parciales/mensaje.html.twig' with {
  tipo: 'exito',
  titulo: '¡Operación exitosa!',
  mensaje: 'La sala fue enviada a revisión de moderación.'
} %}
```

### 7.3 Botones y controles (`parciales/boton.html.twig`)

Renderiza elementos nativos `<button>` o enlaces hipertexto `<a>` con apariencia homogénea. Soporta variantes `primario`, `secundario`, `peligro` y `fantasma`, tamaños (`chico`, `mediano`, `grande`), iconos y estados deshabilitados.

```twig
{% include 'parciales/boton.html.twig' with {
  texto: 'Crear cuenta',
  tipo: 'submit',
  variante: 'primario',
  tamano: 'grande',
  bloque: true
} %}
```

### 7.4 Tarjeta de función de cine (`parciales/tarjeta_funcion.html.twig`)

Componente reutilizable para la Cartelera y el Home que reproduce exactamente los wireframes oficiales. Incluye:
- Afiche audiovisual (o marcador gráfico de celuloide si no hay imagen cargada).
- Insignia de estado adaptativa (`PROGRAMADA`, `EN VOTACIÓN`, `ACUERDO DE FECHA`).
- Precio de la función (`$3.500`, `Gratis`, `A la gorra`).
- Nombre de la sala indie y localidad con icono de ubicación 📍.
- Fecha/hora confirmada, plazo de votación o franjas horarias con icono de calendario 📅.
- Botón de acción `Ver función` enlazado a la ficha de la función, en `/cartelera/{id}` (la sirve programación; `/funcion/` es el prefijo del subsistema funciones). Se puede cambiar con `funcion.url`.

```twig
{% include 'parciales/tarjeta_funcion.html.twig' with {
  funcion: {
    id: 12,
    titulo: 'Ciclo Nuevo Cine Argentino',
    afiche: '/estaticos/imagenes/afiches/ciclo-argentino.webp',
    estado: 'PROGRAMADA',
    precio: '$3.500',
    sala: 'Cineclub La Perla',
    localidad: 'Luján',
    fecha: 'Sáb 19 sep · 20:30'
  }
} %}
```

### 7.5 Tarjeta de sala indie (`parciales/tarjeta_sala.html.twig`)

Componente para mostrar salas de cine independiente tanto en el listado público (`/salas`) como en la pantalla de gestión del organizador («Mis salas», `/organizador/salas`).
- Fotografía del espacio (o marcador gráfico si aún no tiene imagen).
- La fotografía enlaza a la ficha de la sala (`/salas/{id}`); en el listado público, también el botón `Ver sala`.
- Nombre de la sala, localidad (📍) y capacidad en butacas (💺).
- Modo editable: muestra el estado (`PUBLICADA` o `ESPERA HABILITACIÓN`) y el botón `Editar` hacia `/organizador/salas/{id}/editar`.
- Modo compacto (`compacta: true`, en la portada): horizontal, con la foto cuadrada a la izquierda y la localidad y la capacidad en una línea.

```twig
{% include 'parciales/tarjeta_sala.html.twig' with {
  sala: {
    id: 1,
    nombre: 'Cineclub El Faro',
    localidad: 'Luján',
    capacidad: 85,
    imagen: '/estaticos/img/salas/el-faro.webp',
    habilitada: true
  },
  editable: true
} %}
```

### 7.6 Pantallas completas que implementan los parciales

- **`plantillas/cuentas/registro.html.twig`**: Formulario de creación de cuenta de usuario con token CSRF, campos de nombre, email, contraseña, confirmación y casilla de términos sin tildar por defecto (`marcado: valores.terminos ?? false`), mensajes de error y botón principal.
- **`plantillas/programacion/acerca_de.html.twig`**: «Acerca de IndieCinema» en `/acerca-de`, estática: quiénes somos, los cuatro pasos de cómo funciona una función (como la sección del wireframe de la portada) y quién participa. Las secciones `#quienes-somos` y `#como-funciona` son las que enlazan el encabezado y el pie (IC-95).
- **`plantillas/administracion.html.twig`**: Armado de las pantallas del administrador, como el wireframe `administracion-usuarios-parametros`: sin el encabezado ni el pie del sitio, con la barra lateral (`parciales/menu_administracion.html.twig`: el logo, los grupos «Administración» y «Moderación», y la sesión) y el contenido. Cada pantalla define `seccion` y `panel` (IC-245).
- **`plantillas/programacion/administracion_solicitudes.html.twig`**: Bandeja de solicitudes de sala en `/administracion/solicitudes`, como el wireframe `moderacion-solicitudes`: buscador y lista a la izquierda, y la elegida a la derecha con la foto, los datos del espacio, el historial de quien la mandó y la resolución (aprobar o rechazar) con su motivo obligatorio; «Ver historial de decisiones» lista las resueltas (IC-246).
- **`plantillas/programacion/solicitar_sala.html.twig`**: Solicitud para abrir una sala en `/solicitar-sala`, como el wireframe `solicitud-de-sala`, para el espectador y el organizador: los datos del espacio, la foto, los parámetros y las declaraciones, con las validaciones que manda el backend. Arriba, el estado de la última que mandó; si la rechazaron, el motivo y el formulario con la sala para corregirla (IC-246).
- **`plantillas/programacion/alta_funcion.html.twig`**: Formulario de alta y edición para programar o editar una función en `/organizador/funciones/nueva` y `/organizador/funciones/{id}/editar` (IC-121 / IC-122 / E3-11.2 / E3-11.3) con selector de sala propia habilitada, selección de obras del catálogo, fecha y hora de proyección, precio y cupo de localidades.
- **`plantillas/programacion/alta_sala.html.twig`**: Formulario de edición de sala indie para programación (IC-35 / IC-36) con datos del espacio (nombre, descripción, dirección, localidad), capacidad, fotografía y parámetros de proyección. Las salas nuevas entran por la solicitud de sala.
- **`plantillas/programacion/cancelar_funcion.html.twig`**: Pantalla de confirmación para cancelar una función propia en `/organizador/funciones/{id}/cancelar` (IC-123 / E3-11.4): migas de pan, advertencia de acción irreversible, ficha resumen de la función (sala, fecha/hora, precio, cupo y estado) y formulario POST con token CSRF para confirmar la baja lógica o volver al listado.
- **`plantillas/programacion/cartelera.html.twig`**: Cartelera pública en `/cartelera` con un formulario GET de filtros (búsqueda, localidad, fecha y género) que funciona sin JavaScript, avisos de los filtros inválidos, mensaje propio sin resultados, cuadrícula de tarjetas de función, paginado anterior/siguiente (IC-80) y un enlace para descargar en CSV la cartelera con los mismos filtros (IC-83). Los resultados van en la sección `#resultados-cartelera`, que con JavaScript redibuja `BuscadorDeCartelera` sin recargar (IC-101).
- **`plantillas/programacion/ficha_funcion.html.twig`**: Ficha de una función en `/cartelera/{id}`, en cualquier estado: las obras (elegidas, o candidatas si está en votación) con su sinopsis, duración y géneros, la sala con su dirección y el enlace a su ficha, la fecha (o «Fecha a confirmar»), el precio, el cupo y el estado, con un aviso si se canceló (IC-86), y el panel para reservar mientras no se canceló ni empezó: con sesión, el formulario que manda la reserva a funciones; sin sesión, el enlace para ingresar (IC-252). Soporta aviso de confirmación tras editar y accesos de edición y cancelación para organizador dueño (IC-122 / IC-123 / E3-11.4). Migas de pan, la sala y cada obra en tarjetas que en celular pasan a una columna, y encabezados sin saltos de nivel: `h1` la función, `h2` la sala y cada obra (IC-87).
- **`plantillas/funciones/reservar.html.twig`**: Reserva de una función en `/funcion/reservar/{id}` (IC-252): el resumen de la función, la cantidad de lugares con los límites que manda el backend y el error si no quedan tantos; si la función ya no admite reservas, el motivo en lugar del formulario. Es la misma página a la que vuelve el formulario de la ficha cuando hay un error.
- **`plantillas/funciones/reserva_confirmada.html.twig`**: Confirmación en `/funcion/reservas/{id}` (IC-252): el código de la reserva en dos grupos de cuatro para dictarlo en la puerta, la función, la fecha, la sala, los lugares y el total.
- **`plantillas/programacion/inicio.html.twig`**: Portada en `/`: la presentación con un buscador GET (qué y dónde) que lleva a la cartelera filtrada, la cantidad de salas publicadas y de funciones en cartelera, las próximas cuatro funciones y tres salas, cada sección con el enlace a su listado y un mensaje propio si está vacía (IC-93).
- **`plantillas/programacion/mis_funciones.html.twig`**: «Mis funciones» para organizadores en `/organizador/funciones`, con migas de pan: una tabla con las funciones de sus salas en cualquier estado, también las canceladas y las que todavía no tienen fecha, con la sala, la fecha (o «Sin fecha todavía»), el estado y la entrada. La columna de acciones tiene «Editar» sólo en las programadas que todavía no se dieron (IC-122 / E3-11.3) y «Cancelar» en las que están en votación o programadas y todavía no se dieron (IC-123 / E3-11.4), con el aviso al volver de cancelar. Sólo enlaza a la ficha de la función y a la de la sala si la sala está habilitada, y muestra un mensaje si no tiene ninguna función (IC-120).
- **`plantillas/programacion/mis_salas.html.twig`**: Vista de «Mis salas» para organizadores en `/organizador/salas` con migas de pan, botón para publicar sala y cuadrícula de tarjetas editables (IC-38).
- **`plantillas/programacion/salas.html.twig`**: Catálogo público de salas indie habilitadas en `/salas` con cuadrícula de tarjetas de sala (IC-39), y un buscador GET por nombre y localidad que funciona sin JavaScript, con el aviso si la búsqueda no es válida y un mensaje propio sin resultados (IC-91).
- **`plantillas/programacion/sala.html.twig`**: Ficha pública de una sala en `/salas/{id}`: la foto, la dirección, la capacidad, la descripción y sus próximas funciones con la tarjeta de función, o un mensaje si no tiene. Si todavía no está publicada (la ve sólo su organizador), lo avisa. Las tarjetas de sala enlazan a su ficha (IC-90).

---

## 8. JavaScript (IC-100)

Sin librerías y con una clase por archivo. La plantilla base carga, con `defer` y en este orden, `paw.js` y `app.js`; los componentes los carga `app.js` sólo en las páginas que los usan.

- **`js/paw.js`, la clase utilitaria `PAW`**, con métodos estáticos para la aplicación y los componentes:
  - `contenedor(pContenedor)`: el elemento de un componente, a partir del elemento o de su selector.
  - `nuevoElemento(etiqueta, contenido, atributos)`: crea un elemento; el contenido va como texto (`textContent`), nunca como HTML.
  - `cargarScript(nombre, url, alCargar)`: carga un script una sola vez y llama a `alCargar` cuando está listo, aunque ya se hubiera cargado.
  - `enviar(url, opciones)`: `fetch()` que agrega `X-CSRF-Token` (de `<meta name="csrf">`) a los POST, PUT, PATCH y DELETE al mismo sitio, y nunca a otro dominio.
- **`js/app.js`, la clase de aplicación `App`**: su constructor sólo espera a `DOMContentLoaded`; ahí, por cada componente cuyo contenedor está en la página, carga su script con `PAW.cargarScript()` y lo crea pasándole el contenedor.
- **`js/componentes/`, una clase por componente**: el constructor recibe su contenedor (elemento o selector) y no busca nada fuera de él salvo los eventos del documento que necesite. Hoy:
  - `buscador-de-cartelera.js`, `BuscadorDeCartelera` (`.filtros-cartelera` y `#resultados-cartelera`, IC-101): recibe el formulario de filtros y la sección de resultados. Al elegir una localidad, una fecha o un género, al dejar de escribir en «Buscar» (400 ms) o al enviar el formulario, pide la misma URL que el formulario con `Accept: application/json` y vuelve a dibujar la sección como `cartelera.html.twig`: los avisos, el total, las tarjetas (como `tarjeta_funcion.html.twig`), el paginado (sus links también van por JSON) o el mensaje sin resultados. También agrega o saca «Limpiar» según haya filtros. Un pedido nuevo cancela al anterior. Mientras busca, y también desde la primera tecla mientras espera que se deje de escribir, la sección queda con `aria-busy="true"`, los resultados anteriores atenuados y sin clics, y el aviso «Buscando funciones…» (`role="status"`) fijo abajo de la pantalla, así se ve aunque se haya buscado desde el paginado; sin animación con `prefers-reduced-motion` (IC-102). Cada búsqueda deja su URL en el historial (`pushState`, sin repetir la misma), así se puede compartir o recargar; «Atrás» y «Adelante» completan el formulario con esa URL y la vuelven a pedir. Cuando llegan los resultados, una región `aria-live` fuera de la sección (que no se redibuja) anuncia el total, la página y si algún filtro no se aplicó, o el mensaje de error si el pedido falla (IC-103). Si el pedido falla (sin conexión o sin la cartelera en JSON), la sección muestra el mensaje genérico de error (`alerta-error`, `role="alert"`) con un link que carga la misma búsqueda como página, y los filtros quedan como estaban para volver a intentar (IC-102). Sin JavaScript, el formulario y los links funcionan igual.
  - `enviar-al-elegir.js`, `EnviarAlElegir` (`form[data-enviar-al-elegir]`, IC-245): manda el formulario al elegir una opción de uno de sus desplegables, como los filtros de «Usuarios y roles»; el texto de un buscador se manda con Enter. Sin JavaScript, el botón está en un `<noscript>`.
  - `menu-usuario.js`, `MenuUsuario` (`#menu-usuario`): cierra el menú del usuario con un clic afuera o con Escape, y devuelve el foco al botón. Sin JavaScript, el `<details>` se abre y se cierra igual.

Para sumar un componente: su clase en `componentes/<nombre>.js` y, en `App.iniciar()`, la carga condicionada a que su contenedor esté en la página.

## 9. Integración continua

En cada PR y en cada push a `main` (`.github/workflows/ci.yml`):

- **Pruebas del back:** el back de `main` con el front del PR al lado, y las pruebas de cada subsistema. Es el espejo del CI del back: un PR del front que necesita uno del back pasa después de mergear el del back.
- **Plantillas:** `herramientas/compilar-plantillas.php` compila todas con el Twig del núcleo; falla con un error de sintaxis o un filtro que no existe.
- **CSS:** stylelint, sólo con reglas que encuentran errores (una variable que no existe, una propiedad mal escrita, un selector repetido). En local: `npm ci && npm run css`.
- **JavaScript:** `node --check` sobre cada archivo de `estaticos/js`.
- **Secretos:** gitleaks sobre todo el historial, como en el back.

Cuando la CI pasa en un push a `main`, `.github/workflows/cd.yml` publica el cambio en el VPS con el mismo script que el back (README del back, «Despliegue continuo»).
