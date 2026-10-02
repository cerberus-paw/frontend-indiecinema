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
│   ├── error.html.twig         # Plantilla común para páginas de error (404, 500, etc.)
│   ├── parciales/              # Componentes visuales reutilizables
│   │   ├── encabezado.html.twig # Barra de navegación, buscador, accesos según rol y menú de usuario
│   │   └── pie.html.twig       # Pie de página estructurado según wireframes (Explorar, Participar, etc.)
│   ├── cuentas/                # Plantillas específicas del subsistema cuentas
│   ├── programacion/           # Plantillas específicas del subsistema programación
│   └── funciones/              # Plantillas específicas del subsistema funciones
└── estaticos/                  # Archivos estáticos servidos por el servidor web
    ├── css/
    │   └── estilos.css         # Hoja de estilos con paleta cinematográfica oscura y responsive
    ├── js/
    │   └── app.js              # Manejo automático de tokens CSRF y utilidades interactivas
    └── img/
        └── logo.svg            # Isotipo vectorial de IndieCinema
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
  - Enlaces a Cartelera, Salas, Películas, Cómo funciona y Buscador.
  - Botones de acción: **Ingresar** (`/cuenta/ingresar`) y **Crear cuenta** (`/cuenta/registro`).
- **Espectador:**
  - Acceso al menú de usuario con su nombre y avatar.
  - Enlaces a **Mi cuenta** (`/cuenta/`), Mis reservas, Mis pagos y Salas seguidas.
  - Botón de **Cerrar sesión** (`/cuenta/salir`).
- **Organizador (`usuario.alcanza('organizador')`):**
  - Todo lo de espectador más el menú y acceso directo a **Organización**:
  - Resumen del organizador (`/organizador`), Mis salas ABM (`/organizador/salas`), Funciones ABM (`/organizador/funciones`) y Películas ABM (`/organizador/peliculas`).
- **Moderador (`usuario.alcanza('moderador')`):**
  - Todo lo de organizador más el menú y acceso directo a **Moderación**:
  - Bandeja de solicitudes de salas (`/moderacion/solicitudes`), Denuncias (`/moderacion/denuncias`) y Revisión de catálogo (`/moderacion/catalogo`).
- **Administrador (`usuario.alcanza('administrador')`):**
  - Acceso completo a todas las secciones anteriores más **Administración**:
  - Panel de administración (`/admin`), Usuarios y roles (`/admin/usuarios`), Parámetros del sistema (`/admin/parametros`) y Estadísticas globales (`/admin/estadisticas`).

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
