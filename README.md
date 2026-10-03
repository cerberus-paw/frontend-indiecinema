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
├── plantillas/                 # Plantillas Twig organizadas por jerarquía
│   ├── base.html.twig          # Plantilla base compartida (esqueleto HTML, bloques titulo y contenido)
│   ├── error.html.twig         # Plantilla común para páginas de error (401, 403, 404, 500, etc.)
│   ├── parciales/              # Componentes visuales reutilizables
│   │   ├── encabezado.html.twig # Barra de navegación, buscador, accesos según rol y menú de usuario
│   │   ├── pie.html.twig       # Pie de página estructurado según wireframes (Explorar, Participar, etc.)
│   │   ├── campo.html.twig     # Control de formulario con etiqueta, ayuda y error accesible
│   │   ├── mensaje.html.twig   # Alertas de éxito, error, advertencia e información
│   │   ├── boton.html.twig     # Botón o enlace con variantes visuales y tamaños
│   │   ├── tarjeta_funcion.html.twig # Tarjeta de función para home y cartelera
│   │   └── tarjeta_sala.html.twig    # Tarjeta de sala indie para catálogo y «Mis salas»
│   ├── cuentas/                # Plantillas del subsistema cuentas
│   │   └── registro.html.twig  # Formulario de alta de usuario
│   ├── programacion/           # Plantillas del subsistema programación
│   │   ├── alta_sala.html.twig # Formulario de alta y edición de sala
│   │   ├── mis_salas.html.twig # Gestión de salas del organizador
│   │   └── salas.html.twig     # Catálogo público de salas indie habilitadas
│   └── funciones/              # Plantillas específicas del subsistema funciones
└── estaticos/                  # Archivos estáticos servidos por el servidor web
    ├── css/
    │   └── estilos.css         # Hoja de estilos con paleta cinematográfica oscura y responsive
    ├── js/
    │   └── app.js              # Manejo automático de tokens CSRF y utilidades interactivas
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

## 5. Menú Dinámico según el Rol (Wireframes Entrega 2)

El encabezado adapta sus opciones y enlaces según el estado de la sesión y el rol alcanzado:

- **Sin sesión (Invitado):**
  - Enlaces a Cartelera (`/cartelera`), Salas (`/salas`), Películas (`/obras`), Cómo funciona (`/como-funciona`) y Buscador hacia catálogo.
  - Botones de acción: **Ingresar** (`/cuenta/ingresar`) y **Crear cuenta** (`/cuenta/registro`).
- **Espectador:**
  - Acceso al menú de usuario con su nombre y avatar.
  - Enlaces a **Mi cuenta** (`/cuenta/`), **Mis reservas** (`/funcion/mis-reservas`) y **Salas seguidas** (`/cuenta/seguidos`).
  - Botón seguro de **Cerrar sesión** por POST (`/cuenta/salir`) con token CSRF.
- **Organizador (`usuario.alcanza('organizador')`):**
  - Todo lo de espectador más el menú y acceso directo a **Organización**:
  - Resumen del organizador (`/organizador`), Mis salas ABM (`/organizador/salas`), Mis funciones ABM (`/organizador/funciones`) y Películas ABM (`/organizador/peliculas`).
- **Administrador (`usuario.alcanza('administrador')`):**
  - Acceso completo a las secciones del subsistema de cuentas:
  - Panel de administración (`/cuenta/admin`) y Usuarios y roles (`/cuenta/admin/usuarios`).

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
- Botón de acción `Ver función` enlazado a la ficha de la función.

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
- Nombre de la sala, localidad (📍) y capacidad en butacas (💺).
- Modo editable: muestra el estado (`PUBLICADA` o `ESPERA HABILITACIÓN`) y el botón `Editar` hacia `/organizador/salas/{id}/editar`.

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
- **`plantillas/programacion/alta_sala.html.twig`**: Formulario de alta y edición de sala indie para programación (IC-35 / IC-36) con datos del espacio (nombre, descripción, dirección, localidad), capacidad, fotografía y parámetros de proyección.
- **`plantillas/programacion/mis_salas.html.twig`**: Vista de «Mis salas» para organizadores en `/organizador/salas` con migas de pan, botón para publicar sala y cuadrícula de tarjetas editables (IC-38).
- **`plantillas/programacion/salas.html.twig`**: Catálogo público de salas indie habilitadas en `/salas` con cuadrícula de tarjetas de sala (IC-39).

