/**
 * IndieCinema Frontend — Script Principal de la Aplicación (IC-42 / IC-43).
 *
 * Responsabilidades:
 * 1. Protección contra ataques CSRF: inyección automática del token en formularios POST y peticiones fetch.
 * 2. Comportamiento interactivo accesible: cierre de menús desplegables por clic externo o tecla Escape.
 */

// Espera a que el árbol DOM esté completamente cargado para interactuar con los elementos de la página
document.addEventListener('DOMContentLoaded', () => {

  /**
   * Extrae el valor del token CSRF almacenado en la cookie 'csrf'.
   *
   * El backend implementa protección CSRF mediante el patrón de doble envío de cookies (Double Submit Cookie).
   * La cookie 'csrf' contiene un hash aleatorio de 64 caracteres generado por el núcleo en la primera petición.
   *
   * @returns {string} El token CSRF leído o cadena vacía si la cookie no existe.
   */
  function obtenerTokenCsrf() {
    // Busca en document.cookie el par clave-valor correspondiente a 'csrf' usando una expresión regular
    const coincidencia = document.cookie.match(/(?:^|;\s*)csrf=([^;]*)/);
    // Si se encontró la cookie devuelve su valor decodificado; si no, devuelve una cadena vacía
    return coincidencia ? decodeURIComponent(coincidencia[1]) : '';
  }

  // Obtiene el token CSRF disponible en el cliente
  const token = obtenerTokenCsrf();

  // Si existe un token CSRF válido, se asegura de que todos los formularios POST lo envíen automáticamente
  if (token) {
    // Selecciona todos los formularios que declaran método POST (insensible a mayúsculas/minúsculas)
    document.querySelectorAll('form[method="post" i], form[method="POST"]').forEach((formulario) => {
      // Verifica si el formulario ya cuenta con un campo _csrf explícito para no duplicarlo
      if (!formulario.querySelector('input[name="_csrf"]')) {
        // Crea un elemento input oculto en el DOM
        const campoOculto = document.createElement('input');
        // Define el tipo como 'hidden' para no afectar visualmente el diseño
        campoOculto.type = 'hidden';
        // Asigna el nombre '_csrf', que es el nombre exacto que busca ProteccionCsrf::verificar() en el backend
        campoOculto.name = '_csrf';
        // Asigna el valor del token extraído de la cookie
        campoOculto.value = token;
        // Agrega el campo al final del formulario antes de que pueda ser enviado
        formulario.appendChild(campoOculto);
      }
    });
  }

  // Guarda una referencia al método fetch nativo del navegador antes de sobreescribirlo
  const fetchOriginal = window.fetch;

  /**
   * Sobrescribe window.fetch para adjuntar de manera transparente la cabecera 'X-CSRF-Token'.
   *
   * De este modo, cualquier llamada asíncrona (AJAX) realizada con fetch para operaciones que alteran estado
   * (POST, PUT, DELETE, PATCH) pasa la validación CSRF del núcleo sin requerir código manual adicional.
   */
  window.fetch = function (recurso, opciones = {}) {
    // Obtiene el método HTTP de la petición o asume 'GET' por defecto
    const metodo = (opciones.method || 'GET').toUpperCase();

    // Solo los métodos que no son de sólo lectura (como GET o HEAD) requieren verificación de token CSRF
    if (metodo !== 'GET' && metodo !== 'HEAD') {
      // Inicializa el objeto o mapa de cabeceras si no fue provisto
      opciones.headers = opciones.headers || {};
      // Obtiene el valor más actualizado del token CSRF
      const tokenCsrf = obtenerTokenCsrf();

      // Si existe un token CSRF, se inyecta según el formato en el que se hayan provisto las cabeceras
      if (tokenCsrf) {
        // Caso 1: Se pasó una instancia estándar de la clase Headers
        if (opciones.headers instanceof Headers) {
          // Verifica si no tiene la cabecera para no pisar una configuración deliberada
          if (!opciones.headers.has('X-CSRF-Token')) {
            opciones.headers.append('X-CSRF-Token', tokenCsrf);
          }
        // Caso 2: Se pasó un array de pares clave-valor tipo [['Header', 'Value']]
        } else if (Array.isArray(opciones.headers)) {
          // Comprueba si ya existe alguna entrada insensible a mayúsculas
          if (!opciones.headers.some(([k]) => k.toLowerCase() === 'x-csrf-token')) {
            opciones.headers.push(['X-CSRF-Token', tokenCsrf]);
          }
        // Caso 3: Se pasó un objeto literal tradicional tipo { 'Content-Type': 'application/json' }
        } else {
          // Asigna la propiedad si aún no estaba definida
          if (!opciones.headers['X-CSRF-Token']) {
            opciones.headers['X-CSRF-Token'] = tokenCsrf;
          }
        }
      }
    }

    // Invoca el fetch nativo original con las cabeceras enriquecidas y devuelve la promesa resultante
    return fetchOriginal(recurso, opciones);
  };

  // Obtiene el elemento del menú desplegable del usuario autenticado
  const menuUsuario = document.getElementById('menu-usuario');

  // Si el menú existe en la página actual (es decir, hay un usuario con sesión activa)
  if (menuUsuario) {
    // Escucha clics en todo el documento para cerrar el menú cuando el usuario hace clic afuera
    document.addEventListener('click', (evento) => {
      // Si el menú está abierto y el clic ocurrió fuera de sus límites
      if (menuUsuario.open && !menuUsuario.contains(evento.target)) {
        // Remueve el atributo booleano 'open' del details para ocultar el menú flotante
        menuUsuario.removeAttribute('open');
      }
    });

    // Escucha eventos de teclado para mejorar la accesibilidad (WCAG)
    document.addEventListener('keydown', (evento) => {
      // Si se presiona la tecla Escape y el menú desplegable se encuentra abierto
      if (evento.key === 'Escape' && menuUsuario.open) {
        // Cierra el menú desplegable
        menuUsuario.removeAttribute('open');
        // Devuelve el foco del teclado al elemento summary para mantener una navegación accesible fluida
        menuUsuario.querySelector('summary')?.focus();
      }
    });
  }
});
