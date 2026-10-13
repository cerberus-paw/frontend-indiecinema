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
 * Sin JavaScript, el formulario GET y los links funcionan igual, así que este componente sólo
 * mejora lo que ya anda. Si el pedido falla, navega a la URL como lo haría el formulario.
 */
class BuscadorDeCartelera {
  /** Cuánto esperar después de la última tecla antes de buscar, en milisegundos. */
  static ESPERA_AL_ESCRIBIR = 400;

  /** Cuánto esperar entre vaciar el anuncio y escribirlo, para que se lea aunque se repita. */
  static ESPERA_DEL_ANUNCIO = 100;

  /** Los estados de la tarjeta, como en parciales/tarjeta_funcion.html.twig. */
  static ESTADOS = {
    PROGRAMADA: ['PROGRAMADA', 'insignia-programada'],
    EN_VOTACION: ['EN VOTACIÓN', 'insignia-votacion'],
    ACUERDO_FECHA: ['ACUERDO DE FECHA', 'insignia-acuerdo'],
  };

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
    this.espera = null;
    // La búsqueda que se está mostrando: la de la página cargada, después la última que llegó.
    this.urlMostrada = window.location.pathname + window.location.search;
    this.indicador = this.nodo('p', { class: 'cartelera-cargando', role: 'status' }, [
      this.nodo('span', { class: 'cartelera-cargando-icono', 'aria-hidden': 'true' }),
      'Buscando funciones…',
    ]);
    // Afuera de la sección, que se redibuja entera: la región tiene que existir antes del cambio.
    this.anuncio = this.nodo('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    this.resultados.after(this.anuncio);

    this.formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      this.buscar(this.urlDelFormulario());
    });
    // Los desplegables y la fecha, al elegir; el texto, cuando se deja de escribir.
    this.formulario.addEventListener('change', (evento) => {
      if (evento.target.name !== 'q') {
        this.buscar(this.urlDelFormulario());
      }
    });
    this.formulario.addEventListener('input', (evento) => {
      if (evento.target.name === 'q') {
        // Se ve que va a buscar desde la primera tecla, aunque el pedido salga después.
        this.mostrarCargando(true);
        clearTimeout(this.espera);
        this.espera = setTimeout(() => this.buscar(this.urlDelFormulario()), BuscadorDeCartelera.ESPERA_AL_ESCRIBIR);
      }
    });
    this.resultados.addEventListener('click', (evento) => {
      const enlace = evento.target.closest('.paginado a');
      if (enlace) {
        evento.preventDefault();
        this.buscar(enlace.getAttribute('href'));
      }
    });
    // «Atrás» y «Adelante» entre búsquedas de la cartelera.
    window.addEventListener('popstate', () => {
      const url = window.location.pathname + window.location.search;
      // Un link a un ancla (#…) también llega acá, sin cambiar la búsqueda.
      if (window.location.pathname === this.formulario.getAttribute('action') && url !== this.urlMostrada) {
        this.completarFormulario(new URLSearchParams(window.location.search));
        this.buscar(url, { historial: false });
      }
    });
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
    const accion = this.formulario.getAttribute('action');

    return consulta.size > 0 ? `${accion}?${consulta}` : accion;
  }

  /**
   * Pide la URL en JSON y dibuja los resultados. Un pedido nuevo cancela el anterior, así una
   * respuesta lenta no pisa a una más reciente. Con los resultados, la URL pasa al historial,
   * salvo que se esté volviendo a una que ya estaba («Atrás» o «Adelante»).
   *
   * @param {string} url
   * @param {{historial?: boolean}} [opciones]
   */
  async buscar(url, { historial = true } = {}) {
    clearTimeout(this.espera);
    this.espera = null;
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
      this.mostrar(datos);
      // Si mientras volvía se siguió escribiendo, falta otra búsqueda: el indicador sigue.
      this.mostrarCargando(this.espera !== null);
      if (historial && url !== window.location.pathname + window.location.search) {
        window.history.pushState(null, '', url);
      }
      this.urlMostrada = url;
      this.anunciar(datos);
    } catch (error) {
      if (error.name !== 'AbortError') {
        // Que se encargue el servidor, como sin JavaScript. Volviendo, la URL ya es esa.
        if (historial) {
          window.location.assign(url);
        } else {
          window.location.reload();
        }
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
      partes.push(Object.keys(datos.filtros).length > 0
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
    // Se vacía antes, así se lee aunque el texto sea el mismo que el anterior.
    this.anuncio.textContent = '';
    setTimeout(() => { this.anuncio.textContent = partes.join(' '); }, BuscadorDeCartelera.ESPERA_DEL_ANUNCIO);
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
   * Vuelve a dibujar la sección como lo hace programacion/cartelera.html.twig.
   *
   * @param {{funciones: Array<Object>, filtros: Object, avisos: Array<string>, paginado: Object, csv: string}} datos
   */
  mostrar(datos) {
    const partes = [];
    if (datos.avisos.length > 0) {
      partes.push(this.alerta('advertencia', 'alert', { titulo: 'Algunos filtros no se aplicaron', detalles: datos.avisos }));
    }
    if (datos.funciones.length === 0) {
      const filtrada = Object.keys(datos.filtros).length > 0;
      partes.push(this.alerta('info', 'status', {
        texto: filtrada
          ? 'No hay funciones que coincidan con la búsqueda. Probá con otros filtros.'
          : 'Todavía no hay funciones programadas.',
      }));
    } else {
      partes.push(this.resumen(datos.paginado.total_funciones, datos.csv));
      partes.push(this.nodo('div', { class: 'cuadricula-funciones' }, datos.funciones.map((funcion) => this.tarjeta(funcion))));
      if (datos.paginado.total_paginas > 1) {
        partes.push(this.paginado(datos.paginado));
      }
    }
    this.resultados.replaceChildren(...partes);
    this.mostrarLimpiar(Object.keys(datos.filtros).length > 0);
  }

  /**
   * «Limpiar», en el formulario, sólo con algún filtro aplicado: como la plantilla, que lo dibuja
   * según la página que cargó.
   *
   * @param {boolean} filtrada
   */
  mostrarLimpiar(filtrada) {
    const acciones = this.formulario.querySelector('.filtros-cartelera-acciones');
    const limpiar = acciones?.querySelector('a.boton-fantasma');
    if (filtrada && acciones && !limpiar) {
      acciones.append(this.nodo('a', { href: this.formulario.getAttribute('action'), class: 'boton boton-fantasma boton-mediano' }, [
        this.nodo('span', { class: 'boton-texto' }, ['Limpiar']),
      ]));
    } else if (!filtrada) {
      limpiar?.remove();
    }
  }

  resumen(total, csv) {
    return this.nodo('div', { class: 'cartelera-resumen' }, [
      this.nodo('p', { class: 'cartelera-resultados', role: 'status' }, [`${total} ${total === 1 ? 'función' : 'funciones'}`]),
      this.nodo('a', { href: csv, class: 'boton boton-secundario boton-chico', download: '' }, ['Descargar CSV']),
    ]);
  }

  paginado(paginado) {
    const partes = [];
    if (paginado.anterior) {
      partes.push(this.nodo('a', { href: paginado.anterior, class: 'boton boton-secundario boton-chico', rel: 'prev' }, ['Anterior']));
    }
    partes.push(this.nodo('span', { class: 'paginado-actual', 'aria-current': 'page' }, [`Página ${paginado.numero} de ${paginado.total_paginas}`]));
    if (paginado.siguiente) {
      partes.push(this.nodo('a', { href: paginado.siguiente, class: 'boton boton-secundario boton-chico', rel: 'next' }, ['Siguiente']));
    }

    return this.nodo('nav', { class: 'paginado', 'aria-label': 'Páginas de la cartelera' }, partes);
  }

  /**
   * Como parciales/tarjeta_funcion.html.twig, para una función de la cartelera (sin afiche).
   *
   * @param {{id: string, titulo: string, estado: string, precio: string, sala: string, localidad: string, fecha: string, url: string}} funcion
   * @returns {HTMLElement}
   */
  tarjeta(funcion) {
    const [etiqueta, insignia] = BuscadorDeCartelera.ESTADOS[funcion.estado] ?? BuscadorDeCartelera.ESTADOS.PROGRAMADA;

    return this.nodo('article', { class: 'tarjeta-funcion' }, [
      this.nodo('div', { class: 'tarjeta-funcion-afiche' }, [
        this.nodo('a', { href: funcion.url, class: 'tarjeta-funcion-afiche-enlace', tabindex: '-1', 'aria-hidden': 'true' }, [
          this.nodo('div', { class: 'tarjeta-funcion-afiche-placeholder' }, [
            this.nodo('span', { class: 'afiche-placeholder-icono', 'aria-hidden': 'true' }, ['🎬']),
            this.nodo('span', { class: 'afiche-placeholder-texto' }, ['AFICHE']),
          ]),
        ]),
      ]),
      this.nodo('div', { class: 'tarjeta-funcion-cuerpo' }, [
        this.nodo('div', { class: 'tarjeta-funcion-cabecera' }, [
          this.nodo('span', { class: `insignia-estado ${insignia}` }, [etiqueta]),
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
            this.nodo('span', { class: 'meta-texto' }, [funcion.fecha]),
          ]),
        ]),
        this.nodo('div', { class: 'tarjeta-funcion-acciones' }, [
          this.nodo('a', { href: funcion.url, class: 'boton boton-secundario boton-chico boton-bloque boton-tarjeta-funcion' }, [
            this.nodo('span', { class: 'boton-texto' }, ['Ver función']),
          ]),
        ]),
      ]),
    ]);
  }

  /**
   * Como parciales/mensaje.html.twig.
   *
   * @param {string} tipo 'info' | 'advertencia'
   * @param {string} rol 'status' | 'alert'
   * @param {{titulo?: string, texto?: string, detalles?: Array<string>}} contenido
   * @returns {HTMLElement}
   */
  alerta(tipo, rol, { titulo = null, texto = null, detalles = [] }) {
    const simbolo = tipo === 'advertencia' ? '⚠️' : 'ℹ';
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
