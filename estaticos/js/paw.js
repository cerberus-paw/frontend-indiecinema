/* exported PAW */

/**
 * Utilidades comunes del JavaScript de IndieCinema, sin librerías: las usan la aplicación (app.js)
 * y los componentes (componentes/). Son métodos estáticos: la clase no se instancia.
 */
class PAW {
  /** Los métodos que cambian algo: llevan el token CSRF. */
  static METODOS_MUTABLES = ['POST', 'PUT', 'PATCH', 'DELETE'];

  /**
   * Con este evento un componente avisa que los lugares libres de una función cambiaron, y en el
   * detail manda la respuesta del servidor (E4-05). Lo emite quien ya tiene el dato —el formulario
   * de reserva, que lo recibe al reservar— y lo escucha quien muestra el número. Va por acá y no
   * por una referencia entre componentes porque cada uno se carga solo, cuando su contenedor está
   * en la página, y ninguno puede contar con que el otro exista.
   */
  static EVENTO_LUGARES = 'indiecinema:lugares';

  /**
   * Cuánto esperar antes de mostrar el aviso de carga, en milisegundos (E4-05.6). Un pedido que
   * vuelve enseguida no tiene que hacer parpadear nada: el aviso es para cuando la espera se
   * nota, no para cada fetch.
   */
  static ESPERA_DEL_AVISO = 400;

  /**
   * El elemento de un componente: lo recibe como elemento o como selector.
   *
   * @param {Element|string} pContenedor
   * @returns {Element|null}
   */
  static contenedor(pContenedor) {
    return pContenedor instanceof Element ? pContenedor : document.querySelector(pContenedor);
  }

  /**
   * Crea un elemento con su texto y sus atributos. El contenido va como texto, nunca como HTML,
   * así lo que viene del servidor no puede inyectar marcado.
   *
   * @param {string} etiqueta
   * @param {string} [contenido='']
   * @param {Object<string, string>} [atributos={}]
   * @returns {HTMLElement}
   */
  static nuevoElemento(etiqueta, contenido = '', atributos = {}) {
    const elemento = document.createElement(etiqueta);
    elemento.textContent = contenido;
    for (const [nombre, valor] of Object.entries(atributos)) {
      elemento.setAttribute(nombre, valor);
    }

    return elemento;
  }

  /**
   * Carga el script de un componente una sola vez y llama a alCargar cuando está listo. Si ya
   * estaba cargado, lo llama enseguida; si se está cargando, cuando termine.
   *
   * @param {string} nombre el id del <script>, el nombre de la clase que define
   * @param {string} url
   * @param {Function|null} [alCargar=null]
   * @returns {HTMLScriptElement}
   */
  static cargarScript(nombre, url, alCargar = null) {
    let script = document.getElementById(nombre);
    if (!script) {
      script = PAW.nuevoElemento('script', '', { id: nombre, src: url });
      script.addEventListener('load', () => { script.dataset.cargado = 'si'; });
      document.head.appendChild(script);
    }
    if (alCargar) {
      if (script.dataset.cargado) {
        alCargar();
      } else {
        script.addEventListener('load', alCargar);
      }
    }

    return script;
  }

  /**
   * El error de un campo, debajo, con el marcado de parciales/campo.html.twig: el grupo marcado,
   * el control con aria-invalid y aria-describedby apuntando al span, y el span con role="alert".
   * Se ve igual que cuando lo dibuja el servidor y el lector de pantalla lo lee junto al campo
   * (E4-09.3). Lo comparten los componentes que revisan algo de un formulario.
   *
   * El mismo error que ya está no se vuelve a dibujar: con role="alert", rehacerlo en cada tecla
   * se lo repetiría al lector de pantalla letra por letra.
   *
   * @param {HTMLElement} campo
   * @param {string} mensaje
   */
  static errorDeCampo(campo, mensaje) {
    const grupo = campo.closest('.grupo-campo');
    if (!grupo || grupo.querySelector('.campo-error')?.textContent.trim().endsWith(mensaje)) {
      return;
    }
    PAW.limpiarErrorDeCampo(campo);
    const id = `error-${campo.name || campo.id}`;
    grupo.classList.add('con-error');
    campo.classList.add('control-invalido');
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', id);

    const error = PAW.nuevoElemento('span', '', { id, class: 'campo-error', role: 'alert' });
    error.append(PAW.nuevoElemento('span', '⚠️', { class: 'error-icono', 'aria-hidden': 'true' }), ` ${mensaje}`);
    grupo.append(error);
  }

  /**
   * Saca el error del campo y le devuelve el aria-describedby de la ayuda, si tenía: el texto que
   * explica qué se espera sigue valiendo cuando el error se va.
   *
   * @param {HTMLElement} campo
   */
  static limpiarErrorDeCampo(campo) {
    const grupo = campo.closest('.grupo-campo');
    grupo?.classList.remove('con-error');
    grupo?.querySelector('.campo-error')?.remove();
    campo.classList.remove('control-invalido');
    campo.removeAttribute('aria-invalid');
    const ayuda = grupo?.querySelector('.campo-ayuda');
    if (ayuda?.id) {
      campo.setAttribute('aria-describedby', ayuda.id);
    } else {
      campo.removeAttribute('aria-describedby');
    }
  }

  /**
   * El token CSRF que publica la plantilla base en <meta name="csrf">: la cookie es HttpOnly, así
   * que el JavaScript no la puede leer.
   *
   * @returns {string}
   */
  static tokenCsrf() {
    return document.querySelector('meta[name="csrf"]')?.getAttribute('content') ?? '';
  }

  /**
   * El aviso flotante que comparten los componentes que hacen fetch (E4-05.6): el de carga, con
   * el aro que gira, y el de error, con el mensaje genérico de que algo no anduvo. Nace oculto;
   * se muestra con mostrarAviso(). Va fijo abajo de la pantalla, así se ve esté donde esté la
   * página, y no empuja nada de lo que ya está.
   *
   * El de error es role="alert" para que se lea apenas aparece; el de carga, role="status", que
   * no interrumpe lo que se esté leyendo.
   *
   * @param {string} texto
   * @param {'carga'|'error'} [tipo='carga']
   * @returns {HTMLElement}
   */
  static avisoFlotante(texto, tipo = 'carga') {
    const esError = tipo === 'error';
    const aviso = PAW.nuevoElemento('p', '', {
      class: esError ? 'aviso-flotante aviso-flotante-error' : 'aviso-flotante',
      role: esError ? 'alert' : 'status',
      hidden: '',
    });
    aviso.append(
      PAW.nuevoElemento('span', esError ? '✕' : '', { class: 'aviso-flotante-icono', 'aria-hidden': 'true' }),
      texto,
    );

    return aviso;
  }

  /**
   * Muestra u oculta un aviso de avisoFlotante(). El de carga espera ESPERA_DEL_AVISO antes de
   * aparecer: si el pedido vuelve antes, nunca llega a verse. El de error aparece enseguida, que
   * para eso es.
   *
   * La espera queda en una propiedad del elemento y no en el componente: así el que llama pide
   * mostrar y ocultar sin acordarse de ningún temporizador.
   *
   * @param {?HTMLElement} aviso
   * @param {boolean} visible
   */
  static mostrarAviso(aviso, visible) {
    if (!aviso) {
      return;
    }
    clearTimeout(aviso.espera);
    aviso.espera = null;
    if (!visible) {
      aviso.hidden = true;

      return;
    }
    if (aviso.classList.contains('aviso-flotante-error')) {
      aviso.hidden = false;

      return;
    }
    aviso.espera = setTimeout(() => { aviso.hidden = false; }, PAW.ESPERA_DEL_AVISO);
  }

  /**
   * fetch() con la cabecera X-CSRF-Token en los pedidos que cambian algo, y sólo si van a este
   * mismo sitio: el token no sale a otro dominio.
   *
   * @param {string} url
   * @param {RequestInit} [opciones={}]
   * @returns {Promise<Response>}
   */
  static enviar(url, opciones = {}) {
    const metodo = (opciones.method ?? 'GET').toUpperCase();
    const cabeceras = new Headers(opciones.headers);
    const mismoSitio = new URL(url, window.location.origin).origin === window.location.origin;
    if (PAW.METODOS_MUTABLES.includes(metodo) && mismoSitio && !cabeceras.has('X-CSRF-Token')) {
      cabeceras.set('X-CSRF-Token', PAW.tokenCsrf());
    }

    return fetch(url, { ...opciones, headers: cabeceras });
  }
}
