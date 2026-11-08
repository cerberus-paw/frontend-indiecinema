/* exported BuscadorDeCartelera */

/**
 * La búsqueda en vivo de la cartelera: al cambiar un filtro pide la misma URL que el formulario,
 * pero en JSON (Accept: application/json), y vuelve a dibujar la sección de resultados sin recargar
 * la página. Lo mismo con los links del paginado.
 *
 * Mientras busca (también mientras espera que se deje de escribir) la sección queda con
 * aria-busy, atenuada, y con el aviso «Buscando funciones…» fijo abajo de la pantalla, así se ve
 * aunque se haya buscado desde el paginado, al pie de la lista.
 *
 * Cada búsqueda deja su URL en el historial (pushState), así se puede compartir o recargar, y
 * «Atrás» y «Adelante» vuelven a la búsqueda anterior: completan el formulario con esa URL y la
 * piden de nuevo. Cuando llegan los resultados se anuncian en una región aria-live que no se
 * redibuja, porque un lector de pantalla no siempre lee una región que se acaba de crear.
 *
 * Si el pedido falla (sin conexión, o el servidor no devuelve la cartelera), la sección muestra un
 * mensaje de error con un link a la misma búsqueda, que la carga sin JavaScript. Los filtros quedan
 * como estaban, así se puede volver a intentar.
 *
 * Sin JavaScript, el formulario GET y los links funcionan igual, así que este componente sólo
 * mejora lo que ya anda.
 */
class BuscadorDeCartelera {
  /** Cuánto esperar después de la última tecla antes de buscar, en milisegundos. */
  static ESPERA_AL_ESCRIBIR = 400;

  /** Cuánto esperar entre vaciar el anuncio y escribirlo, para que se lea aunque se repita. */
  static ESPERA_DEL_ANUNCIO = 100;

  /** El mensaje genérico si falla el pedido: se muestra en la sección y se anuncia. */
  static MENSAJE_DE_ERROR = 'No pudimos actualizar la cartelera. Probá de nuevo en un rato.';

  /** Los estados de la tarjeta, como en parciales/tarjeta_funcion.html.twig. */
  static ESTADOS = {
    PROGRAMADA: ['PROGRAMADA', 'insignia-programada'],
    EN_VOTACION: ['EN VOTACIÓN DE TÍTULOS', 'insignia-votacion'],
    EN_VOTACION_TITULOS: ['EN VOTACIÓN DE TÍTULOS', 'insignia-votacion'],
    en_votacion_titulos: ['EN VOTACIÓN DE TÍTULOS', 'insignia-votacion'],
    ACUERDO_FECHA: ['EN ACUERDO DE FECHA', 'insignia-acuerdo'],
    ACUERDO_DE_FECHA: ['EN ACUERDO DE FECHA', 'insignia-acuerdo'],
    EN_ACUERDO_FECHA: ['EN ACUERDO DE FECHA', 'insignia-acuerdo'],
    en_acuerdo_fecha: ['EN ACUERDO DE FECHA', 'insignia-acuerdo'],
    ACUERDO_SIN_MINIMO: ['ACUERDO SIN MÍNIMO', 'insignia-sin-quorum'],
    acuerdo_sin_minimo: ['ACUERDO SIN MÍNIMO', 'insignia-sin-quorum'],
    SIN_QUORUM: ['ACUERDO SIN MÍNIMO', 'insignia-sin-quorum'],
    sin_quorum: ['ACUERDO SIN MÍNIMO', 'insignia-sin-quorum'],
  };

  /** Los campos que se escriben de a una tecla y esperan antes de buscar. */
  static CAMPOS_DE_ESCRITURA = ['q', 'precio_min', 'precio_max'];

  /** Dónde se guarda la preferencia del visitante sobre el modo de paginado (E4-06.3). */
  static CLAVE_MODO_PAGINADO = 'indiecinema:cartelera:paginado';

  /** Dónde se guardan las últimas búsquedas de la cartelera (E4-06.4). */
  static CLAVE_ULTIMAS_BUSQUEDAS = 'indiecinema:cartelera:ultimas-busquedas';

  /** Cantidad máxima de búsquedas recientes guardadas en localStorage (E4-06.4). */
  static MAX_ULTIMAS_BUSQUEDAS = 5;

  /**
   * @param {string} nombre
   * @returns {boolean}
   */
  static esCampoDeEscritura(nombre) {
    return BuscadorDeCartelera.CAMPOS_DE_ESCRITURA.includes(nombre);
  }

  /**
   * @param {Element|string} pFormulario el formulario de filtros, o su selector
   * @param {Element|string} pResultados la sección que muestra las funciones, o su selector
   */
  constructor(pFormulario, pResultados) {
    this.formulario = PAW.contenedor(pFormulario);
    this.resultados = PAW.contenedor(pResultados);
    if (!this.formulario || !this.resultados) {
      return;
    }
    this.pedido = null;
    this.pedidoMas = null;
    this.espera = null;
    // La búsqueda que se está mostrando: la de la página cargada, después la última que llegó.
    this.urlMostrada = window.location.pathname + window.location.search;
    // «Ordenar por» lo dibuja la plantilla (oculto si no hay funciones) y se reusa en cada resumen.
    this.orden = this.resultados.querySelector('.cartelera-orden');
    this.selectorOrden = this.orden?.querySelector('select[name="orden"]') ?? null;
    this.urlSiguiente = this.resultados.querySelector('.paginado a[rel="next"]')?.getAttribute('href') ?? null;
    this.modoPaginado = this.modoDePaginadoInicial();
    // «Paginado» también lo dibuja la plantilla, oculto: sin JavaScript no hace nada.
    this.controlModoPaginado = this.resultados.querySelector('.cartelera-paginado-modo');
    this.selectorModoPaginado = this.controlModoPaginado?.querySelector('[data-paginado-selector]') ?? null;
    if (this.controlModoPaginado && this.resultados.querySelector('.cartelera-resumen')) {
      this.controlModoPaginado.hidden = false;
    }
    const contenedorCartelera = document.querySelector('[data-cartelera]');
    const topeBusquedas = Number(contenedorCartelera?.dataset.maxUltimasBusquedas);
    this.maxUltimasBusquedas = Number.isInteger(topeBusquedas) && topeBusquedas > 0
      ? topeBusquedas
      : BuscadorDeCartelera.MAX_ULTIMAS_BUSQUEDAS;
    this.ultimasBusquedas = document.querySelector('[data-ultimas-busquedas]');
    if (!this.ultimasBusquedas) {
      this.ultimasBusquedas = this.crearSeccionUltimasBusquedas();
      this.formulario.after(this.ultimasBusquedas);
    }
    this.listaUltimasBusquedas = this.ultimasBusquedas.querySelector('[data-ultimas-busquedas-lista]');
    // El resumen de arriba («N funciones · ordenadas por …») y «Limpiar» de la columna quedan
    // afuera de la sección: se actualizan con cada búsqueda (E4-10.9).
    this.resumenArriba = document.querySelector('[data-cartelera-resumen]');
    this.contenedorLimpiar = document.querySelector('[data-filtros-limpiar]');
    this.columna = document.querySelector('[data-filtros-cartelera]');
    this.plegarSegunElAncho();
    // Las etiquetas de los filtros activos, también afuera de la sección (E4-10.9).
    this.filtrosActivos = document.querySelector('[data-filtros-activos]');
    this.cantidadDeFiltros = this.columna?.querySelector('[data-cantidad-filtros]') ?? null;
    // Adónde va el foco después de quitar una etiqueta con el foco en ella: la posición que tenía
    // y la búsqueda que la quita. Se olvida si se busca otra cosa o se escribe en un campo.
    this.focoAlQuitar = null;
    this.centinela = this.resultados.querySelector('[data-cartelera-centinela]')
      ?? this.nodo('div', { class: 'cartelera-centinela', 'data-cartelera-centinela': '', hidden: '' });
    this.cargandoMas = this.resultados.querySelector('[data-cartelera-cargando-mas]')
      ?? this.nodo('p', { class: 'cartelera-cargando-mas', 'data-cartelera-cargando-mas': '', hidden: '', 'aria-live': 'polite' }, ['Cargando más funciones…']);
    this.observador = null;
    if ('IntersectionObserver' in window) {
      this.observador = new IntersectionObserver((entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) {
          this.cargarSiguientePagina();
        }
      }, { rootMargin: '200px 0px' });
    }
    this.indicador = this.nodo('p', { class: 'aviso-flotante', role: 'status' }, [
      this.nodo('span', { class: 'aviso-flotante-icono', 'aria-hidden': 'true' }),
      'Buscando funciones…',
    ]);
    // Afuera de la sección, que se redibuja entera: la región tiene que existir antes del cambio.
    this.anuncio = this.nodo('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    this.resultados.after(this.anuncio);

    this.formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      this.buscar(this.urlDelFormulario());
    });
    // Los desplegables y la fecha, al elegir; el texto y los precios, cuando se deja de escribir.
    // Lo que se busca mientras se escribe no queda entre las últimas búsquedas: queda cuando se
    // termina, al salir del campo («change»), con Enter o al elegir otro filtro (E4-06.4).
    this.formulario.addEventListener('change', (evento) => {
      if (!BuscadorDeCartelera.esCampoDeEscritura(evento.target.name)) {
        this.buscar(this.urlDelFormulario());
      } else {
        this.terminarDeEscribir();
      }
    });
    this.formulario.addEventListener('input', (evento) => {
      // Quien escribe tiene el foco en el campo: la etiqueta que quitó antes no se lo lleva.
      this.focoAlQuitar = null;
      if (BuscadorDeCartelera.esCampoDeEscritura(evento.target.name)) {
        // Se ve que va a buscar desde la primera tecla, aunque el pedido salga después.
        this.mostrarCargando(true);
        clearTimeout(this.espera);
        this.espera = setTimeout(
          () => this.buscar(this.urlDelFormulario(), { guardar: false }),
          BuscadorDeCartelera.ESPERA_AL_ESCRIBIR,
        );
      }
    });
    this.ultimasBusquedas.addEventListener('click', (evento) => {
      const chip = evento.target.closest('[data-recuperar-busqueda]');
      if (chip) {
        evento.preventDefault();
        const url = chip.getAttribute('href');
        this.completarFormulario(new URL(url, window.location.origin).searchParams);
        this.buscar(url);
        return;
      }
      const limpiarHistorial = evento.target.closest('[data-limpiar-busquedas]');
      if (limpiarHistorial) {
        this.limpiarUltimasBusquedas();
      }
    });
    // Quitar una etiqueta o todas: la misma búsqueda que si se vaciara el campo (E4-10.9).
    this.filtrosActivos?.addEventListener('click', (evento) => {
      const enlace = evento.target.closest('[data-quitar-filtro], [data-quitar-todos]');
      if (!enlace) {
        return;
      }
      evento.preventDefault();
      if (document.activeElement === enlace) {
        const etiquetas = [...this.filtrosActivos.querySelectorAll('[data-quitar-filtro]')];
        this.focoAlQuitar = {
          indice: enlace.matches('[data-quitar-todos]') ? -1 : etiquetas.indexOf(enlace),
          url: enlace.getAttribute('href'),
        };
      }
      const url = enlace.getAttribute('href');
      this.completarFormulario(new URL(url, window.location.origin).searchParams);
      this.buscar(url);
    });
    // El selector de orden y el de modo de paginado están en la sección de resultados, asociados
    // al formulario con form=: su «change» sube por la sección, no por el formulario.
    this.resultados.addEventListener('change', (evento) => {
      if (evento.target.name === 'orden') {
        this.buscar(this.urlDelFormulario());
      } else if (evento.target.matches('[data-paginado-selector]')) {
        this.cambiarModoPaginado(evento.target.value);
      }
    });
    this.resultados.addEventListener('click', (evento) => {
      const enlace = evento.target.closest('.paginado a, [data-cartelera-paginado] a');
      if (enlace) {
        evento.preventDefault();
        // Otra página de la misma búsqueda: no es una búsqueda nueva.
        this.buscar(enlace.getAttribute('href'), { guardar: false });
      }
    });
    // «Atrás» y «Adelante» entre búsquedas de la cartelera.
    window.addEventListener('popstate', () => {
      const url = window.location.pathname + window.location.search;
      // Un link a un ancla (#…) también llega acá, sin cambiar la búsqueda.
      if (window.location.pathname === this.formulario.getAttribute('action') && url !== this.urlMostrada) {
        this.completarFormulario(new URLSearchParams(window.location.search));
        this.buscar(url, { historial: false, guardar: false });
      }
    });
    this.aplicarModoPaginado();
    // La búsqueda de la página cargada, como la armó el back (null si no recorta la cartelera).
    this.busquedaMostrada = BuscadorDeCartelera.leerBusqueda(contenedorCartelera?.dataset.busqueda);
    if (this.busquedaMostrada) {
      this.guardarBusqueda(this.busquedaMostrada);
    } else {
      this.renderizarUltimasBusquedas();
    }
  }

  /**
   * La búsqueda del data-busqueda de la plantilla, o null si no hay o no se entiende.
   *
   * @param {string|undefined} json
   * @returns {{url: string, etiqueta: string}|null}
   */
  static leerBusqueda(json) {
    try {
      const busqueda = json ? JSON.parse(json) : null;

      return busqueda && typeof busqueda.url === 'string' && typeof busqueda.etiqueta === 'string' ? busqueda : null;
    } catch {
      return null;
    }
  }

  /**
   * Al salir del texto o de un precio: si quedó una búsqueda por hacer, se hace y se guarda; si ya
   * se está mostrando la de lo escrito, sólo se guarda.
   */
  terminarDeEscribir() {
    const url = this.urlDelFormulario();
    if (this.espera !== null || this.pedido !== null || url !== this.urlMostrada) {
      this.buscar(url);
    } else if (this.busquedaMostrada) {
      this.guardarBusqueda(this.busquedaMostrada);
    }
  }

  /**
   * Construye la sección de últimas búsquedas si no estaba en el HTML inicial.
   *
   * @returns {HTMLElement}
   */
  crearSeccionUltimasBusquedas() {
    return this.nodo('section', {
      class: 'ultimas-busquedas',
      'aria-label': 'Últimas búsquedas',
      'data-ultimas-busquedas': '',
      hidden: '',
    }, [
      this.nodo('div', { class: 'ultimas-busquedas-cabecera' }, [
        this.nodo('span', { class: 'ultimas-busquedas-titulo' }, ['Últimas búsquedas:']),
        this.nodo('button', {
          type: 'button',
          class: 'ultimas-busquedas-limpiar',
          'data-limpiar-busquedas': '',
        }, ['Borrar historial']),
      ]),
      this.nodo('ul', { class: 'ultimas-busquedas-lista', 'data-ultimas-busquedas-lista': '' }),
    ]);
  }

  /**
   * Devuelve las últimas búsquedas guardadas en localStorage (E4-06.4).
   *
   * @returns {Array<{url: string, etiqueta: string, filtros: Object<string, string>}>}
   */
  obtenerUltimasBusquedas() {
    try {
      const crudo = window.localStorage.getItem(BuscadorDeCartelera.CLAVE_ULTIMAS_BUSQUEDAS);
      if (!crudo) {
        return [];
      }
      const parseado = JSON.parse(crudo);
      if (!Array.isArray(parseado)) {
        return [];
      }

      return parseado
        .filter((item) => item && typeof item.url === 'string' && typeof item.etiqueta === 'string')
        .slice(0, this.maxUltimasBusquedas);
    } catch {
      return [];
    }
  }

  /**
   * Registra una búsqueda en las últimas 5 de localStorage (E4-06.4). Si la misma URL ya estaba,
   * la mueve al principio; al entrar una sexta distinta, se descarta la más antigua.
   *
   * @param {{url: string, etiqueta: string}} busqueda la que arma el back, con la URL de la página 1
   */
  guardarBusqueda(busqueda) {
    const item = { url: busqueda.url, etiqueta: busqueda.etiqueta };
    const actuales = this.obtenerUltimasBusquedas().filter((existente) => existente.url !== item.url);
    const actualizadas = [item, ...actuales].slice(0, this.maxUltimasBusquedas);
    try {
      window.localStorage.setItem(BuscadorDeCartelera.CLAVE_ULTIMAS_BUSQUEDAS, JSON.stringify(actualizadas));
    } catch {
      // Ignora si el navegador bloquea el almacenamiento.
    }
    this.renderizarUltimasBusquedas(actualizadas);
  }

  /**
   * Vacía el historial de últimas búsquedas en localStorage y oculta la sección.
   */
  limpiarUltimasBusquedas() {
    try {
      window.localStorage.removeItem(BuscadorDeCartelera.CLAVE_ULTIMAS_BUSQUEDAS);
    } catch {
      // Ignora si el navegador bloquea el almacenamiento.
    }
    this.renderizarUltimasBusquedas([]);
  }

  /**
   * Dibuja la lista de chips de últimas búsquedas y muestra u oculta el contenedor.
   *
   * @param {Array<{url: string, etiqueta: string, filtros?: Object<string, string>}>} [lista]
   */
  renderizarUltimasBusquedas(lista = this.obtenerUltimasBusquedas()) {
    if (!this.ultimasBusquedas || !this.listaUltimasBusquedas) {
      return;
    }
    const items = lista.map((item) => this.nodo('li', { class: 'ultimas-busquedas-item' }, [
      this.nodo('a', {
        href: item.url,
        class: 'ultimas-busquedas-chip',
        'data-recuperar-busqueda': '',
      }, [item.etiqueta]),
    ]));
    this.listaUltimasBusquedas.replaceChildren(...items);
    this.ultimasBusquedas.hidden = items.length === 0;
  }

  /**
   * El modo de paginado inicial (E4-06.3): lo que eligió el visitante, guardado en localStorage; si
   * no eligió, scroll infinito en el celular y tradicional en las pantallas más anchas.
   *
   * @returns {'tradicional'|'infinito'}
   */
  modoDePaginadoInicial() {
    try {
      const guardado = window.localStorage.getItem(BuscadorDeCartelera.CLAVE_MODO_PAGINADO);
      if (guardado === 'tradicional' || guardado === 'infinito') {
        return guardado;
      }
    } catch {
      // Sin acceso a localStorage se sigue con el modo por defecto.
    }
    if (window.matchMedia?.('(max-width: 768px)').matches) {
      return 'infinito';
    }

    return 'tradicional';
  }

  /**
   * @param {string} modo
   */
  cambiarModoPaginado(modo) {
    this.modoPaginado = modo === 'infinito' ? 'infinito' : 'tradicional';
    try {
      window.localStorage.setItem(BuscadorDeCartelera.CLAVE_MODO_PAGINADO, this.modoPaginado);
    } catch {
      // Ignora si el navegador bloquea el almacenamiento.
    }
    this.aplicarModoPaginado();
  }

  aplicarModoPaginado() {
    if (this.selectorModoPaginado && this.selectorModoPaginado.value !== this.modoPaginado) {
      this.selectorModoPaginado.value = this.modoPaginado;
    }
    const nav = this.resultados.querySelector('[data-cartelera-paginado], .paginado');
    if (this.modoPaginado === 'infinito') {
      if (nav) {
        nav.hidden = true;
      }
      this.actualizarCentinela();
    } else {
      this.pedidoMas?.abort();
      this.pedidoMas = null;
      this.observador?.disconnect();
      this.centinela.hidden = true;
      this.cargandoMas.hidden = true;
      if (nav) {
        nav.hidden = false;
      }
    }
  }

  actualizarCentinela() {
    this.observador?.disconnect();
    const hayMas = this.modoPaginado === 'infinito' && Boolean(this.urlSiguiente);
    this.centinela.hidden = !hayMas;
    if (hayMas && this.centinela.isConnected) {
      this.observador?.observe(this.centinela);
    }
  }

  async cargarSiguientePagina() {
    if (this.modoPaginado !== 'infinito' || !this.urlSiguiente || this.pedidoMas || this.pedido) {
      return;
    }
    const url = this.urlSiguiente;
    this.pedidoMas = new AbortController();
    this.cargandoMas.hidden = false;
    try {
      const respuesta = await PAW.enviar(url, {
        headers: { Accept: 'application/json' },
        signal: this.pedidoMas.signal,
      });
      if (!respuesta.ok) {
        throw new Error(`La cartelera respondió ${respuesta.status}.`);
      }
      const datos = await respuesta.json();
      this.agregarResultados(datos);
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.decir(BuscadorDeCartelera.MENSAJE_DE_ERROR);
      }
    } finally {
      this.pedidoMas = null;
      this.cargandoMas.hidden = true;
      this.actualizarCentinela();
    }
  }

  /**
   * Agrega las tarjetas de la página siguiente al final de la grilla (scroll infinito, E4-06.3).
   *
   * @param {{funciones: Array<Object>, filtros: Object, avisos: Array<string>, paginado: Object, csv: string}} datos
   */
  agregarResultados(datos) {
    const cuadricula = this.resultados.querySelector('.cuadricula-funciones');
    if (!cuadricula) {
      this.mostrar(datos);
      return;
    }
    cuadricula.append(...datos.funciones.map((funcion) => this.tarjeta(funcion)));
    this.urlSiguiente = datos.paginado?.siguiente ?? null;
    const navExistente = this.resultados.querySelector('[data-cartelera-paginado], .paginado');
    if (datos.paginado?.total_paginas > 1) {
      const nuevoNav = this.paginado(datos.paginado);
      if (navExistente) {
        navExistente.replaceWith(nuevoNav);
      } else {
        cuadricula.after(nuevoNav);
      }
    } else {
      navExistente?.remove();
    }
    this.anunciar(datos);
  }

  /**
   * Pone en el formulario los filtros de una URL; el que no está, vacío.
   *
   * @param {URLSearchParams} consulta
   */
  completarFormulario(consulta) {
    for (const campo of this.formulario.elements) {
      if (campo.name && campo.type !== 'submit') {
        campo.value = consulta.get(campo.name) ?? '';
      }
    }
    if (this.selectorOrden) {
      this.selectorOrden.value = consulta.get('orden') ?? '';
    }
  }

  /**
   * La URL que pediría el formulario, sin los filtros vacíos.
   *
   * @returns {string}
   */
  urlDelFormulario() {
    const consulta = new URLSearchParams();
    for (const [nombre, valor] of new FormData(this.formulario)) {
      if (String(valor).trim() !== '') {
        consulta.append(nombre, valor);
      }
    }
    // Sin funciones, el selector queda afuera del documento y FormData no lo ve: el orden sigue.
    if (this.selectorOrden && !consulta.has('orden') && this.selectorOrden.value.trim() !== '') {
      consulta.append('orden', this.selectorOrden.value);
    }
    const accion = this.formulario.getAttribute('action');

    return consulta.size > 0 ? `${accion}?${consulta}` : accion;
  }

  /**
   * Pide la URL en JSON y dibuja los resultados. Un pedido nuevo cancela el anterior, así una
   * respuesta lenta no pisa a una más reciente. Con los resultados, la URL pasa al historial,
   * salvo que se esté volviendo a una que ya estaba («Atrás» o «Adelante»).
   *
   * Con `guardar`, la búsqueda que llega queda entre las últimas búsquedas (E4-06.4): no mientras
   * se escribe, ni al cambiar de página o volver con «Atrás».
   *
   * @param {string} url
   * @param {{historial?: boolean, guardar?: boolean}} [opciones]
   */
  async buscar(url, { historial = true, guardar = true } = {}) {
    // Otra búsqueda que la de la etiqueta quitada: el foco ya no tiene que ir a su vecina.
    if (this.focoAlQuitar && this.focoAlQuitar.url !== url) {
      this.focoAlQuitar = null;
    }
    clearTimeout(this.espera);
    this.espera = null;
    this.pedidoMas?.abort();
    this.pedidoMas = null;
    this.cargandoMas.hidden = true;
    this.pedido?.abort();
    this.pedido = new AbortController();
    this.mostrarCargando(true);
    try {
      const respuesta = await PAW.enviar(url, {
        headers: { Accept: 'application/json' },
        signal: this.pedido.signal,
      });
      if (!respuesta.ok) {
        throw new Error(`La cartelera respondió ${respuesta.status}.`);
      }
      const datos = await respuesta.json();
      this.pedido = null;
      this.mostrar(datos);
      this.busquedaMostrada = datos.busqueda ?? null;
      if (guardar && this.busquedaMostrada) {
        this.guardarBusqueda(this.busquedaMostrada);
      }
      // Si mientras volvía se siguió escribiendo, falta otra búsqueda: el indicador sigue.
      this.mostrarCargando(this.espera !== null);
      if (historial && url !== window.location.pathname + window.location.search) {
        window.history.pushState(null, '', url);
      }
      this.urlMostrada = url;
      this.anunciar(datos);
    } catch (error) {
      this.pedido = null;
      if (error.name !== 'AbortError') {
        this.mostrarError(url);
        this.decir(BuscadorDeCartelera.MENSAJE_DE_ERROR);
      }
    }
  }

  /**
   * Lo que cambió, para los lectores de pantalla: cuántas funciones hay (o que no hay), la página
   * y si algún filtro no se aplicó.
   *
   * @param {{funciones: Array<Object>, filtros: Object, avisos: Array<string>, paginado: Object}} datos
   */
  anunciar(datos) {
    const partes = [];
    const total = datos.paginado.total_funciones;
    if (total === 0) {
      partes.push(BuscadorDeCartelera.filtrada(datos)
        ? 'No hay funciones que coincidan con la búsqueda.'
        : 'Todavía no hay funciones programadas.');
    } else {
      partes.push(`${total} ${total === 1 ? 'función' : 'funciones'}.`);
      if (datos.paginado.total_paginas > 1) {
        partes.push(`Página ${datos.paginado.numero} de ${datos.paginado.total_paginas}.`);
      }
    }
    if (datos.avisos.length > 0) {
      partes.push('Algunos filtros no se aplicaron.');
    }
    this.decir(partes.join(' '));
  }

  /**
   * Escribe un texto en la región del anuncio. Se vacía antes, así se lee aunque el texto sea el
   * mismo que el anterior.
   *
   * @param {string} texto
   */
  decir(texto) {
    this.anuncio.textContent = '';
    setTimeout(() => { this.anuncio.textContent = texto; }, BuscadorDeCartelera.ESPERA_DEL_ANUNCIO);
  }

  /**
   * El mensaje genérico de error en lugar de los resultados, que ya no son los de los filtros.
   * El link carga la misma búsqueda como página, por si el problema es sólo del pedido JSON.
   *
   * @param {string} url
   */
  mostrarError(url) {
    clearTimeout(this.espera);
    this.espera = null;
    // La etiqueta no se quitó: el foco queda donde está.
    this.focoAlQuitar = null;
    const error = this.alerta('error', 'alert', { texto: BuscadorDeCartelera.MENSAJE_DE_ERROR });
    error.querySelector('.alerta-contenido').append(this.nodo('p', { class: 'alerta-texto' }, [
      this.nodo('a', { href: url, class: 'alerta-enlace' }, ['Cargar esta búsqueda de nuevo']),
    ]));
    this.resultados.replaceChildren(error);
    this.mostrarCargando(false);
  }

  /**
   * El indicador de carga: la sección atenuada y con aria-busy, y el aviso para verlo y para los
   * lectores de pantalla. Un pedido cancelado por otro no lo saca: sigue el nuevo.
   *
   * @param {boolean} cargando
   */
  mostrarCargando(cargando) {
    if (cargando) {
      this.resultados.setAttribute('aria-busy', 'true');
      this.resultados.append(this.indicador);
    } else {
      this.resultados.removeAttribute('aria-busy');
      this.indicador.remove();
    }
  }

  /**
   * La columna de filtros (E4-10.9) llega abierta, así se usa sin JavaScript. Desde 768 px queda
   * abierta y no se cierra, porque no tapa los resultados; en el celular arranca cerrada y se abre
   * con «Filtros». Si la ventana cambia de ancho, se vuelve a acomodar.
   */
  plegarSegunElAncho() {
    if (!this.columna || !window.matchMedia) {
      return;
    }
    const ancha = window.matchMedia('(min-width: 768px)');
    const acomodar = () => {
      this.columna.open = ancha.matches;
    };
    acomodar();
    ancha.addEventListener('change', acomodar);
    this.columna.addEventListener('toggle', () => {
      if (ancha.matches && !this.columna.open) {
        this.columna.open = true;
      }
    });
  }

  /**
   * «N funciones · ordenadas por …» arriba de la columna, como en la plantilla; oculto sin
   * funciones, porque lo explica el aviso de la sección.
   *
   * @param {{funciones: Array<Object>, paginado: Object, orden?: {leida: string}}} datos
   */
  mostrarResumenArriba(datos) {
    if (!this.resumenArriba) {
      return;
    }
    const total = datos.paginado?.total_funciones ?? 0;
    this.resumenArriba.hidden = datos.funciones.length === 0;
    const cantidad = this.resumenArriba.querySelector('.cartelera-resultados');
    if (cantidad) {
      cantidad.textContent = `${total} ${total === 1 ? 'función' : 'funciones'}`;
    }
    const orden = this.resumenArriba.querySelector('[data-cartelera-orden-aplicado]');
    // Ya en minúscula, como la arma el back para la plantilla.
    if (orden && datos.orden?.leida) {
      orden.textContent = datos.orden.leida;
    }
  }

  /**
   * Vuelve a dibujar la sección como lo hace programacion/cartelera.html.twig.
   *
   * @param {{funciones: Array<Object>, filtros: Object, avisos: Array<string>, paginado: Object, csv: string, orden?: {valor: string, etiqueta: string, leida: string}}} datos
   */
  mostrar(datos) {
    const teniaFocoOrden = Boolean(this.selectorOrden && document.activeElement === this.selectorOrden);
    const teniaFocoModo = Boolean(this.selectorModoPaginado && document.activeElement === this.selectorModoPaginado);
    if (this.selectorOrden) {
      this.selectorOrden.value = datos.filtros?.orden ?? '';
    }
    this.urlSiguiente = datos.paginado?.siguiente ?? null;
    const partes = [];
    if (datos.avisos.length > 0) {
      partes.push(this.alerta('advertencia', 'alert', { titulo: 'Algunos filtros no se aplicaron', detalles: datos.avisos }));
    }
    if (datos.funciones.length === 0) {
      partes.push(this.alerta('info', 'status', {
        texto: BuscadorDeCartelera.filtrada(datos)
          ? 'No hay funciones que coincidan con la búsqueda. Probá con otros filtros.'
          : 'Todavía no hay funciones programadas.',
      }));
    } else {
      partes.push(this.resumen(datos.csv));
      partes.push(this.nodo('div', { class: 'cuadricula-funciones' }, datos.funciones.map((funcion) => this.tarjeta(funcion))));
      if (datos.paginado.total_paginas > 1) {
        partes.push(this.paginado(datos.paginado));
      }
      partes.push(this.centinela);
      partes.push(this.cargandoMas);
    }
    this.resultados.replaceChildren(...partes);
    this.aplicarModoPaginado();
    if (teniaFocoOrden && datos.funciones.length > 0) {
      this.selectorOrden.focus();
    } else if (teniaFocoModo && datos.funciones.length > 0) {
      this.selectorModoPaginado.focus();
    }
    this.mostrarLimpiar(BuscadorDeCartelera.filtrada(datos));
    this.mostrarResumenArriba(datos);
    this.mostrarFiltrosActivos(datos);
  }

  /**
   * Las etiquetas de los filtros activos y «Quitar todos», como en la plantilla, y cuántos hay en
   * «Filtros». Si se acaba de quitar una con el foco en ella, el foco pasa a la que quedó en su
   * lugar (la siguiente o, si era la última, la anterior); sin ninguna, a los resultados.
   *
   * @param {{filtros_activos?: Array<{texto: string, url: string}>, quitar_filtros?: string}} datos
   */
  mostrarFiltrosActivos(datos) {
    if (!this.filtrosActivos) {
      return;
    }
    const activos = datos.filtros_activos ?? [];
    const lista = this.filtrosActivos.querySelector('.filtros-activos-lista');
    lista?.replaceChildren(...activos.map((filtro) => this.nodo('li', {}, [
      this.nodo('a', {
        href: filtro.url,
        class: 'etiqueta-filtro',
        'data-quitar-filtro': '',
        'aria-label': `Quitar el filtro ${filtro.texto}`,
      }, [
        `${filtro.texto} `,
        this.nodo('span', { class: 'etiqueta-filtro-quitar', 'aria-hidden': 'true' }, ['×']),
      ]),
    ])));
    let quitarTodos = this.filtrosActivos.querySelector('[data-quitar-todos]');
    if (activos.length > 0) {
      if (!quitarTodos) {
        quitarTodos = this.nodo('a', { class: 'filtros-activos-quitar', 'data-quitar-todos': '' }, ['Quitar todos']);
        this.filtrosActivos.append(quitarTodos);
      }
      quitarTodos.setAttribute('href', datos.quitar_filtros ?? this.formulario.getAttribute('action'));
    } else {
      quitarTodos?.remove();
    }
    this.filtrosActivos.hidden = activos.length === 0;
    if (this.cantidadDeFiltros) {
      this.cantidadDeFiltros.textContent = activos.length > 0 ? ` (${activos.length})` : '';
    }

    if (this.focoAlQuitar !== null) {
      const etiquetas = lista ? [...lista.querySelectorAll('[data-quitar-filtro]')] : [];
      const { indice } = this.focoAlQuitar;
      const vecina = indice >= 0 ? etiquetas[Math.min(indice, etiquetas.length - 1)] : null;
      this.focoAlQuitar = null;
      if (vecina) {
        vecina.focus();
      } else {
        const titulo = document.getElementById('titulo-resultados-cartelera');
        titulo?.setAttribute('tabindex', '-1');
        titulo?.focus();
      }
    }
  }

  /**
   * Si la búsqueda recortó la cartelera, como «filtrada» en la plantilla: el orden no cuenta.
   *
   * @param {{filtros: Object}} datos
   * @returns {boolean}
   */
  static filtrada(datos) {
    return Object.keys(datos.filtros).some((nombre) => nombre !== 'orden');
  }

  /**
   * «Limpiar», en la cabecera de la columna de filtros, sólo con algún filtro aplicado: como la
   * plantilla, que lo dibuja según la página que cargó.
   *
   * @param {boolean} filtrada
   */
  mostrarLimpiar(filtrada) {
    const limpiar = this.contenedorLimpiar?.querySelector('a.filtros-limpiar');
    if (filtrada && this.contenedorLimpiar && !limpiar) {
      this.contenedorLimpiar.append(this.nodo('a', { href: this.formulario.getAttribute('action'), class: 'filtros-limpiar' }, ['Limpiar']));
    } else if (!filtrada) {
      limpiar?.remove();
    }
  }

  /**
   * La barra de arriba de la grilla: «Ordenar por», el modo de paginado y el CSV. La cantidad va
   * en el resumen de arriba (mostrarResumenArriba).
   *
   * @param {string} csv
   */
  resumen(csv) {
    if (this.orden) {
      this.orden.hidden = false;
    }
    if (this.controlModoPaginado) {
      this.controlModoPaginado.hidden = false;
    }

    return this.nodo('div', { class: 'cartelera-resumen cartelera-barra' }, [
      ...(this.orden ? [this.orden] : []),
      ...(this.controlModoPaginado ? [this.controlModoPaginado] : []),
      this.nodo('a', { href: csv, class: 'boton boton-secundario boton-chico', download: '' }, ['Descargar CSV']),
    ]);
  }

  paginado(paginado) {
    const partes = [];
    if (paginado.anterior) {
      partes.push(this.nodo('a', { href: paginado.anterior, class: 'boton boton-secundario boton-chico', rel: 'prev' }, ['Anterior']));
    }
    if (Array.isArray(paginado.paginas) && paginado.paginas.length > 0) {
      const items = paginado.paginas.map((item) => {
        if (item === null) {
          return this.nodo('li', { class: 'paginado-elipsis', 'aria-hidden': 'true' }, ['…']);
        }
        if (item.actual) {
          return this.nodo('li', { class: 'paginado-item' }, [
            this.nodo('span', { class: 'paginado-enlace activo', 'aria-current': 'page' }, [String(item.numero)]),
          ]);
        }

        return this.nodo('li', { class: 'paginado-item' }, [
          this.nodo('a', { href: item.url, class: 'paginado-enlace' }, [String(item.numero)]),
        ]);
      });
      partes.push(this.nodo('ul', { class: 'paginado-lista' }, items));
    }
    partes.push(this.nodo('span', { class: 'paginado-actual sr-only' }, [`Página ${paginado.numero} de ${paginado.total_paginas}`]));
    if (paginado.siguiente) {
      partes.push(this.nodo('a', { href: paginado.siguiente, class: 'boton boton-secundario boton-chico', rel: 'next' }, ['Siguiente']));
    }
    const nav = this.nodo('nav', {
      class: 'paginado paginado-numerado',
      'aria-label': 'Páginas de la cartelera',
      'data-cartelera-paginado': '',
    }, partes);
    if (this.modoPaginado === 'infinito') {
      nav.hidden = true;
    }

    return nav;
  }

  /**
   * Como parciales/tarjeta_funcion.html.twig, para una función de la cartelera.
   *
   * @param {{id: string, titulo: string, afiche: ?string, estado: string, precio: string, sala: string, localidad: string, fecha: string, url: string}} funcion
   * @returns {HTMLElement}
   */
  tarjeta(funcion) {
    const estadoClave = String(funcion.estado || 'PROGRAMADA').toUpperCase();
    const esVotacion = Boolean(funcion.en_votacion)
      || estadoClave === 'EN_VOTACION'
      || estadoClave === 'EN_VOTACION_TITULOS'
      || estadoClave === 'EN_VOTACION_DE_TITULOS'
      || String(funcion.estado_valor || '').toLowerCase() === 'en_votacion_titulos';
    const esAcuerdo = Boolean(funcion.en_acuerdo)
      || estadoClave === 'ACUERDO_FECHA'
      || estadoClave === 'ACUERDO_DE_FECHA'
      || estadoClave === 'EN_ACUERDO_FECHA'
      || String(funcion.estado_valor || '').toLowerCase() === 'en_acuerdo_fecha';
    const esSinQuorum = Boolean(funcion.acuerdo_sin_minimo)
      || estadoClave === 'ACUERDO_SIN_MINIMO'
      || estadoClave === 'SIN_QUORUM'
      || String(funcion.estado_valor || '').toLowerCase() === 'acuerdo_sin_minimo';
    const [etiqueta, insignia] = BuscadorDeCartelera.ESTADOS[estadoClave]
      ?? BuscadorDeCartelera.ESTADOS[funcion.estado]
      ?? (esVotacion
        ? ['EN VOTACIÓN DE TÍTULOS', 'insignia-votacion']
        : (esAcuerdo
          ? ['EN ACUERDO DE FECHA', 'insignia-acuerdo']
          : (esSinQuorum
            ? ['ACUERDO SIN MÍNIMO', 'insignia-sin-quorum']
            : BuscadorDeCartelera.ESTADOS.PROGRAMADA)));
    const textoBoton = esVotacion
      ? 'Votar títulos'
      : (esAcuerdo
        ? 'Votar fecha'
        : (esSinQuorum ? 'Ver resultado' : 'Ver función'));
    const textoFecha = esVotacion
      ? (funcion.cierre_votacion || 'Fecha a definir tras la votación')
      : (esAcuerdo
        ? (funcion.compromisos && funcion.minimo_asistentes
          ? `Acuerdo de fecha · ${funcion.compromisos} / ${funcion.minimo_asistentes} compromisos`
          : (funcion.franjas_propuestas || 'Acuerdo de fecha · Franjas en debate'))
        : (esSinQuorum
          ? 'Sin quórum · No programada'
          : (funcion.fecha || 'Próximamente')));
    const claseBoton = esVotacion
      ? 'boton boton-primario boton-chico boton-bloque boton-tarjeta-funcion boton-tarjeta-votar'
      : (esAcuerdo
        ? 'boton boton-primario boton-chico boton-bloque boton-tarjeta-funcion boton-tarjeta-acuerdo'
        : 'boton boton-secundario boton-chico boton-bloque boton-tarjeta-funcion');
    const ariaLabelBoton = esVotacion
      ? `Votar títulos para ${funcion.titulo}`
      : (esAcuerdo
        ? `Votar fecha para ${funcion.titulo}`
        : (esSinQuorum ? `Ver resultado de ${funcion.titulo}` : `Ver función ${funcion.titulo}`));

    return this.nodo('article', {
      class: `tarjeta-funcion${esVotacion ? ' tarjeta-funcion-votacion' : (esAcuerdo ? ' tarjeta-funcion-acuerdo' : (esSinQuorum ? ' tarjeta-funcion-sin-quorum' : ''))}`,
      'aria-label': `${funcion.titulo} - ${etiqueta}`,
    }, [
      this.nodo('div', { class: 'tarjeta-funcion-afiche' }, [
        this.nodo('a', { href: funcion.url, class: 'tarjeta-funcion-afiche-enlace', tabindex: '-1', 'aria-hidden': 'true' }, [
          // Con afiche, la imagen entera sobre ella misma desenfocada; sin, el recuadro del
          // wireframe, como la plantilla.
          ...(funcion.afiche
            ? [
              this.nodo('img', { src: funcion.afiche, alt: '', class: 'tarjeta-funcion-imagen-fondo', loading: 'lazy' }, []),
              this.nodo('img', { src: funcion.afiche, alt: `Afiche de ${funcion.titulo}`, class: 'tarjeta-funcion-imagen tarjeta-funcion-imagen-entera', loading: 'lazy' }, []),
            ]
            : [this.nodo('div', { class: 'tarjeta-funcion-afiche-placeholder' }, [
              this.nodo('span', { class: 'afiche-placeholder-icono', 'aria-hidden': 'true' }, ['🎬']),
              this.nodo('span', { class: 'afiche-placeholder-texto' }, ['AFICHE']),
            ])]),
        ]),
      ]),
      this.nodo('div', { class: 'tarjeta-funcion-cuerpo' }, [
        this.nodo('div', { class: 'tarjeta-funcion-cabecera' }, [
          this.nodo('span', { class: `insignia-estado ${insignia}` }, [
            this.nodo('span', { class: 'sr-only' }, ['Estado: ']),
            ...(esVotacion ? [this.nodo('span', { class: 'insignia-icono', 'aria-hidden': 'true' }, ['🗳️'])] : []),
            ...(esAcuerdo ? [this.nodo('span', { class: 'insignia-icono', 'aria-hidden': 'true' }, ['🤝'])] : []),
            ...(esSinQuorum ? [this.nodo('span', { class: 'insignia-icono', 'aria-hidden': 'true' }, ['⚠️'])] : []),
            etiqueta,
          ]),
          this.nodo('span', { class: 'tarjeta-funcion-precio' }, [funcion.precio]),
        ]),
        this.nodo('h3', { class: 'tarjeta-funcion-titulo' }, [
          this.nodo('a', { href: funcion.url, class: 'tarjeta-funcion-titulo-enlace' }, [funcion.titulo]),
        ]),
        this.nodo('div', { class: 'tarjeta-funcion-meta' }, [
          this.nodo('p', { class: 'tarjeta-funcion-dato meta-ubicacion' }, [
            this.nodo('span', { class: 'meta-icono', 'aria-hidden': 'true' }, ['📍']),
            this.nodo('span', { class: 'meta-texto' }, [`${funcion.sala} · ${funcion.localidad}`]),
          ]),
          this.nodo('p', { class: 'tarjeta-funcion-dato meta-tiempo' }, [
            this.nodo('span', { class: 'meta-icono', 'aria-hidden': 'true' }, ['📅']),
            this.nodo('span', { class: 'meta-texto' }, [
              esVotacion
                ? this.nodo('span', { class: 'meta-texto-destacado meta-texto-votacion' }, [textoFecha])
                : (esAcuerdo
                  ? this.nodo('span', { class: 'meta-texto-destacado meta-texto-acuerdo' }, [textoFecha])
                  : (esSinQuorum
                    ? this.nodo('span', { class: 'meta-texto-destacado meta-texto-sin-quorum' }, [textoFecha])
                    : textoFecha)),
            ]),
          ]),
        ]),
        this.nodo('div', { class: 'tarjeta-funcion-acciones' }, [
          this.nodo('a', { href: funcion.url, class: claseBoton, 'aria-label': ariaLabelBoton }, [
            ...(esVotacion ? [this.nodo('span', { class: 'boton-icono boton-icono-antes', 'aria-hidden': 'true' }, ['🗳️'])] : []),
            ...(esAcuerdo ? [this.nodo('span', { class: 'boton-icono boton-icono-antes', 'aria-hidden': 'true' }, ['🤝'])] : []),
            ...(esSinQuorum ? [this.nodo('span', { class: 'boton-icono boton-icono-antes', 'aria-hidden': 'true' }, ['ℹ️'])] : []),
            this.nodo('span', { class: 'boton-texto' }, [textoBoton]),
          ]),
        ]),
      ]),
    ]);
  }

  /**
   * Como parciales/mensaje.html.twig.
   *
   * @param {string} tipo 'info' | 'advertencia' | 'error'
   * @param {string} rol 'status' | 'alert'
   * @param {{titulo?: string, texto?: string, detalles?: Array<string>}} contenido
   * @returns {HTMLElement}
   */
  alerta(tipo, rol, { titulo = null, texto = null, detalles = [] }) {
    const simbolo = { advertencia: '⚠️', error: '✕' }[tipo] ?? 'ℹ';
    const cuerpo = [];
    if (titulo) {
      cuerpo.push(this.nodo('strong', { class: 'alerta-titulo' }, [titulo]));
    }
    if (texto) {
      cuerpo.push(this.nodo('p', { class: 'alerta-texto' }, [texto]));
    }
    if (detalles.length > 0) {
      cuerpo.push(this.nodo('ul', { class: 'alerta-lista-detalles' }, detalles.map((detalle) => this.nodo('li', { class: 'alerta-item-detalle' }, [detalle]))));
    }

    return this.nodo('div', { class: `alerta alerta-${tipo}`, role: rol }, [
      this.nodo('div', { class: 'alerta-icono', 'aria-hidden': 'true' }, [this.nodo('span', { class: 'icono-simbolo' }, [simbolo])]),
      this.nodo('div', { class: 'alerta-contenido' }, cuerpo),
    ]);
  }

  /**
   * Un elemento con sus atributos y sus hijos: los textos van como texto, nunca como HTML.
   *
   * @param {string} etiqueta
   * @param {Object<string, string>} atributos
   * @param {Array<Node|string>} hijos
   * @returns {HTMLElement}
   */
  nodo(etiqueta, atributos = {}, hijos = []) {
    const elemento = PAW.nuevoElemento(etiqueta, '', atributos);
    elemento.append(...hijos);

    return elemento;
  }
}
