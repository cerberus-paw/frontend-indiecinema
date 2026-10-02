/**
 * IndieCinema Frontend — Script Principal de la Aplicación (IC-42 / IC-43 / IC-45).
 *
 * Responsabilidades:
 * 1. Protección contra ataques CSRF: utilidad `enviar(url, opciones)` que adjunta
 *    de manera segura el token `X-CSRF-Token` únicamente a peticiones mutables del mismo origen.
 * 2. Comportamiento interactivo accesible: control del menú desplegable de usuario
 *    (cierre al hacer clic fuera o al presionar la tecla Escape).
 */

/**
 * Obtiene el valor del token CSRF provisto en la etiqueta <meta name="csrf"> de la plantilla base.
 *
 * Dado que la cookie de sesión CSRF es HttpOnly por diseño de seguridad, el token
 * se publica de forma segura a través del meta tag para el código cliente.
 *
 * @returns {string} El token CSRF o cadena vacía si no existe.
 */
function obtenerTokenCsrf() {
  const meta = document.querySelector('meta[name="csrf"]');
  return meta ? (meta.getAttribute('content') || '') : '';
}

/**
 * Determina si una URL o recurso pertenece al mismo origen que la aplicación actual (Same-Origin).
 *
 * @param {string|Request|URL} recurso - Destino de la petición HTTP.
 * @returns {boolean} Verdadero si la petición se dirige al mismo origen.
 */
function esMismoOrigen(recurso) {
  try {
    const urlString = (typeof recurso === 'string')
      ? recurso
      : (recurso && recurso.url)
        ? recurso.url
        : String(recurso);

    // Rutas relativas son siempre del mismo origen
    if (urlString.startsWith('/') && !urlString.startsWith('//')) {
      return true;
    }
    const urlObj = new URL(urlString, window.location.origin);
    return urlObj.origin === window.location.origin;
  } catch (e) {
    return false;
  }
}

/**
 * Envoltorio seguro sobre `fetch` que adjunta la cabecera `X-CSRF-Token`
 * únicamente en peticiones mutables (POST, PUT, DELETE, PATCH) dirigidas al mismo dominio.
 *
 * A diferencia de sobrescribir `window.fetch`, esta función:
 * - Se encuentra disponible de inmediato (incluso para scripts ejecutados antes de DOMContentLoaded).
 * - No filtra el token CSRF a dominios externos.
 * - Evita duplicar cabeceras en caso de ser enviadas en minúsculas (evitando errores 403).
 * - Respeta instancias de `Request` u objetos de opciones.
 *
 * @param {string|Request} recurso - URL o Request a consultar.
 * @param {RequestInit} [opciones={}] - Opciones de configuración de fetch.
 * @returns {Promise<Response>} Promesa de la respuesta HTTP.
 */
function enviar(recurso, opciones = {}) {
  let metodo = 'GET';
  if (opciones && opciones.method) {
    metodo = opciones.method.toUpperCase();
  } else if (recurso instanceof Request && recurso.method) {
    metodo = recurso.method.toUpperCase();
  }

  const metodosMutables = ['POST', 'PUT', 'DELETE', 'PATCH'];

  // Solo inyectar CSRF en peticiones mutables dirigidas a nuestro propio origen
  if (metodosMutables.includes(metodo) && esMismoOrigen(recurso)) {
    const token = obtenerTokenCsrf();
    if (token) {
      if (!opciones.headers) {
        opciones.headers = {};
      }

      if (opciones.headers instanceof Headers) {
        if (!opciones.headers.has('x-csrf-token') && !opciones.headers.has('X-CSRF-Token')) {
          opciones.headers.set('X-CSRF-Token', token);
        }
      } else if (Array.isArray(opciones.headers)) {
        const existe = opciones.headers.some(([k]) => k.toLowerCase() === 'x-csrf-token');
        if (!existe) {
          opciones.headers.push(['X-CSRF-Token', token]);
        }
      } else {
        // Objeto plano
        const tieneClave = Object.keys(opciones.headers).some(
          (k) => k.toLowerCase() === 'x-csrf-token'
        );
        if (!tieneClave) {
          opciones.headers['X-CSRF-Token'] = token;
        }
      }
    }
  }

  return window.fetch(recurso, opciones);
}

// Expone la función utilitaria globalmente
window.enviar = enviar;
window.obtenerTokenCsrf = obtenerTokenCsrf;

// Inicialización de interactividad accesible al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  // Menú desplegable del usuario autenticado
  const menuUsuario = document.getElementById('menu-usuario');

  if (menuUsuario) {
    // Cierra el menú al hacer clic en cualquier parte fuera de su contenedor
    document.addEventListener('click', (evento) => {
      if (menuUsuario.open && !menuUsuario.contains(evento.target)) {
        menuUsuario.removeAttribute('open');
      }
    });

    // Cierra el menú y devuelve el foco al presionar la tecla Escape (WCAG 2.1)
    document.addEventListener('keydown', (evento) => {
      if (evento.key === 'Escape' && menuUsuario.open) {
        menuUsuario.removeAttribute('open');
        menuUsuario.querySelector('summary')?.focus();
      }
    });
  }
});
