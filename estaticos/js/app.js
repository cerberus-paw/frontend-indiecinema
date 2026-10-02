/**
 * IndieCinema Frontend
 * Manejo de CSRF y utilidades para la interfaz.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Función para obtener la cookie de CSRF
  function obtenerTokenCsrf() {
    const coincidencia = document.cookie.match(/(?:^|;\s*)csrf=([^;]*)/);
    return coincidencia ? decodeURIComponent(coincidencia[1]) : '';
  }

  // Interceptar formularios POST para asegurar que incluyan el token si está disponible
  const token = obtenerTokenCsrf();
  if (token) {
    document.querySelectorAll('form[method="post" i], form[method="POST"]').forEach((formulario) => {
      if (!formulario.querySelector('input[name="_csrf"]')) {
        const campoOculto = document.createElement('input');
        campoOculto.type = 'hidden';
        campoOculto.name = '_csrf';
        campoOculto.value = token;
        formulario.appendChild(campoOculto);
      }
    });
  }

  // Configurar fetch global para enviar X-CSRF-Token en solicitudes modificatorias
  const fetchOriginal = window.fetch;
  window.fetch = function (recurso, opciones = {}) {
    const metodo = (opciones.method || 'GET').toUpperCase();
    if (metodo !== 'GET' && metodo !== 'HEAD') {
      opciones.headers = opciones.headers || {};
      const tokenCsrf = obtenerTokenCsrf();
      if (tokenCsrf) {
        if (opciones.headers instanceof Headers) {
          if (!opciones.headers.has('X-CSRF-Token')) {
            opciones.headers.append('X-CSRF-Token', tokenCsrf);
          }
        } else if (Array.isArray(opciones.headers)) {
          if (!opciones.headers.some(([k]) => k.toLowerCase() === 'x-csrf-token')) {
            opciones.headers.push(['X-CSRF-Token', tokenCsrf]);
          }
        } else {
          if (!opciones.headers['X-CSRF-Token']) {
            opciones.headers['X-CSRF-Token'] = tokenCsrf;
          }
        }
      }
    }
    return fetchOriginal(recurso, opciones);
  };
});
