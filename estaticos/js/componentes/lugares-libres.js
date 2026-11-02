/**
 * Los lugares libres de la ficha, al día sin recargar (E4-05.2). Cada pocos segundos pide
 * /cartelera/{id}/lugares en JSON y, si el número cambió, actualiza la píldora de la cabecera, la
 * barra del recuadro de reserva, el texto de «N lugares disponibles» y el máximo del campo de
 * cantidad, que es lo que valida el navegador.
 *
 * Sólo consulta mientras la pestaña se ve: con la pestaña de fondo el intervalo se detiene, y al
 * volver a ella se consulta enseguida. Así, si se reservó desde otra pestaña, el número ya está
 * bien al volver, sin dejar pedidos corriendo en pestañas que nadie mira.
 *
 * Un pedido nuevo cancela el anterior, así una respuesta lenta no pisa a una más reciente. Si
 * falla, no se muestra nada: el número que está es el que trajo la página, y sigue sirviendo. Tras
 * varias fallas seguidas deja de consultar, para no insistir contra un servidor caído; el
 * indicador de carga y el aviso de error son de E4-05.6.
 *
 * Quien ya tiene el dato (el formulario de reserva, que lo recibe al reservar) puede pasarlo con
 * actualizar(), en lugar de esperar la consulta siguiente.
 *
 * Sin JavaScript la ficha muestra los lugares con los que se cargó: este componente sólo mejora
 * lo que ya anda.
 */
class LugaresLibres {
  /** Cada cuánto consultar, en milisegundos. */
  static INTERVALO = 15000;

  /** Cuántas fallas seguidas antes de dejar de consultar. */
  static FALLAS_PARA_CORTAR = 3;

  /** Cuánto esperar entre vaciar el anuncio y escribirlo, para que se lea aunque se repita. */
  static ESPERA_DEL_ANUNCIO = 100;

  /**
   * @param {Element|string} pContenedor la ficha, con data-lugares-libres, o su selector
   */
  constructor(pContenedor) {
    this.contenedor = PAW.contenedor(pContenedor);
    this.url = this.contenedor?.dataset.lugaresLibres ?? '';
    this.cupo = Number.parseInt(this.contenedor?.dataset.cupo ?? '', 10);
    if (!this.contenedor || this.url === '' || !Number.isInteger(this.cupo) || this.cupo <= 0) {
      return;
    }
    this.pedido = null;
    this.espera = null;
    this.fallas = 0;
    this.libres = this.leerLibres();
    // Afuera de lo que se redibuja: la región tiene que existir antes del cambio para que un
    // lector de pantalla la lea.
    this.anuncio = PAW.nuevoElemento('p', '', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    this.contenedor.append(this.anuncio);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Al volver a la pestaña, enseguida: puede haberse reservado en otra.
        this.consultar();
      } else {
        this.detener();
      }
    });
    if (document.visibilityState === 'visible') {
      this.programar();
    }
  }

  /**
   * Los lugares que muestra la página cargada, para no anunciar un cambio que no hubo. Del campo
   * de cantidad, que lleva el máximo; si no está (sin sesión), del texto no se adivina.
   *
   * @returns {?number}
   */
  leerLibres() {
    const campo = this.contenedor.querySelector('input[name="cantidad"]');
    const maximo = Number.parseInt(campo?.getAttribute('max') ?? '', 10);

    return Number.isInteger(maximo) ? maximo : null;
  }

  /** La próxima consulta, si no quedó cortado por fallas. */
  programar() {
    this.detener();
    if (this.fallas < LugaresLibres.FALLAS_PARA_CORTAR) {
      this.espera = setTimeout(() => this.consultar(), LugaresLibres.INTERVALO);
    }
  }

  /** Corta el intervalo y el pedido en curso: la pestaña dejó de verse, o ya no se consulta. */
  detener() {
    clearTimeout(this.espera);
    this.espera = null;
    this.pedido?.abort();
    this.pedido = null;
  }

  /**
   * Pide los lugares y, si cambiaron, los muestra. Pase lo que pase vuelve a programar la
   * siguiente, salvo que se haya cortado por fallas.
   */
  async consultar() {
    this.detener();
    this.pedido = new AbortController();
    try {
      const respuesta = await PAW.enviar(this.url, {
        headers: { Accept: 'application/json' },
        signal: this.pedido.signal,
      });
      if (!respuesta.ok) {
        throw new Error(`Los lugares respondieron ${respuesta.status}.`);
      }
      this.fallas = 0;
      this.actualizar(await respuesta.json());
    } catch (error) {
      // Un pedido que cancelamos nosotros no es una falla del servidor.
      if (error.name !== 'AbortError') {
        this.fallas += 1;
      }
    }
    this.programar();
  }

  /**
   * Muestra los lugares que vinieron. Si el dato no está (funciones no respondió del lado del
   * servidor) se deja lo que hay: es mejor un número de hace un rato que ninguno.
   *
   * @param {{lugares_libres: ?number, agotada?: boolean}} datos
   */
  actualizar(datos) {
    const libres = datos.lugares_libres;
    if (!Number.isInteger(libres) || libres === this.libres) {
      return;
    }
    const agotada = datos.agotada ?? libres === 0;
    // Sin sesión no hay campo de cantidad, así que no se sabe con qué número se cargó la página:
    // la primera respuesta se muestra, pero no se anuncia como un cambio que no se sabe si hubo.
    const anunciar = this.libres !== null;
    this.libres = libres;
    this.pintarPildora(libres, agotada);
    this.pintarBarra(libres);
    this.pintarCampo(libres, agotada);
    if (anunciar) {
      this.anunciar(libres, agotada);
    }
  }

  /**
   * La píldora de la cabecera, como ficha_funcion.html.twig. Si la página se cargó sin el dato no
   * hay píldora de lugares, y no se inventa una.
   *
   * @param {number} libres
   * @param {boolean} agotada
   */
  pintarPildora(libres, agotada) {
    const pildora = this.contenedor.querySelector('.ficha-chip-lugares');
    if (!pildora) {
      return;
    }
    pildora.textContent = LugaresLibres.textoDePildora(libres, agotada);
    pildora.classList.toggle('ficha-chip-agotada', agotada);
  }

  /**
   * La barra de lo que ya se reservó y su texto, como el recuadro de reserva de la plantilla.
   *
   * @param {number} libres
   */
  pintarBarra(libres) {
    const ocupados = this.cupo - libres;
    const barra = this.contenedor.querySelector('.ficha-reserva-barra');
    if (barra) {
      barra.setAttribute('value', String(ocupados));
      barra.setAttribute('aria-label', `Lugares ya reservados: ${ocupados} de ${this.cupo}`);
    }
    const texto = this.contenedor.querySelector('.ficha-reserva-disponibles-texto');
    if (texto) {
      const disponibles = PAW.nuevoElemento('span');
      disponibles.append(
        PAW.nuevoElemento('strong', `${libres} ${libres === 1 ? 'lugar' : 'lugares'}`),
        ` ${libres === 1 ? 'disponible' : 'disponibles'}`,
      );
      texto.replaceChildren(disponibles, PAW.nuevoElemento('span', `de ${this.cupo}`));
    }
  }

  /**
   * El máximo del campo de cantidad, que es contra lo que valida el navegador, y el botón: con la
   * función agotada no hay cantidad que entre, así que mandar el formulario sólo daría el error.
   * Reemplazar el recuadro entero por el de «Función agotada» es de E4-05.3 y E4-05.6.
   *
   * @param {number} libres
   * @param {boolean} agotada
   */
  pintarCampo(libres, agotada) {
    const campo = this.contenedor.querySelector('input[name="cantidad"]');
    if (campo) {
      campo.setAttribute('max', String(Math.max(libres, 1)));
      campo.toggleAttribute('disabled', agotada);
      // Lo que ya tenía escrito puede haber quedado por encima de lo que queda.
      if (!agotada && Number.parseInt(campo.value, 10) > libres) {
        campo.value = String(libres);
      }
    }
    const boton = this.contenedor.querySelector('.ficha-reserva-formulario button[type="submit"]');
    boton?.toggleAttribute('disabled', agotada);
  }

  /**
   * El cambio, para los lectores de pantalla: el número no se lee solo porque haya cambiado.
   *
   * @param {number} libres
   * @param {boolean} agotada
   */
  anunciar(libres, agotada) {
    const texto = agotada
      ? 'La función se agotó: ya no quedan lugares.'
      : `Quedan ${libres} ${libres === 1 ? 'lugar' : 'lugares'}.`;
    this.anuncio.textContent = '';
    setTimeout(() => { this.anuncio.textContent = texto; }, LugaresLibres.ESPERA_DEL_ANUNCIO);
  }

  /**
   * @param {number} libres
   * @param {boolean} agotada
   * @returns {string}
   */
  static textoDePildora(libres, agotada) {
    if (agotada) {
      return 'Agotada';
    }

    return libres === 1 ? 'Queda 1 lugar libre' : `${libres} lugares libres`;
  }
}
