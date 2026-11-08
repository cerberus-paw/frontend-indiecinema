/* exported LugaresLibres */

/**
 * Los lugares libres de la ficha, al día sin recargar (E4-05.2). Cada pocos segundos pide
 * /cartelera/{id}/lugares en JSON y, si el número cambió, actualiza la píldora de la cabecera, la
 * barra del recuadro de reserva, el texto de «N lugares disponibles» y el máximo del campo de
 * cantidad, que es lo que valida el navegador.
 *
 * Cuando se agota, el recuadro de reserva pasa a ser el aviso de «Función agotada», el mismo que
 * dibuja el servidor cuando la página se carga sin lugares, y si alguien cancela vuelve a estar
 * el de antes: no tiene sentido dejar un formulario que sólo puede dar error.
 *
 * Sólo consulta mientras la pestaña se ve: con la pestaña de fondo el intervalo se detiene, y al
 * volver a ella se consulta enseguida. Así, si se reservó desde otra pestaña, el número ya está
 * bien al volver, sin dejar pedidos corriendo en pestañas que nadie mira.
 *
 * Un pedido nuevo cancela el anterior, así una respuesta lenta no pisa a una más reciente. Si
 * falla, no se muestra nada todavía: el número que está es el que trajo la página, y sigue
 * sirviendo. Tras varias fallas seguidas deja de consultar, para no insistir contra un servidor
 * caído, y recién ahí avisa que el número puede no estar al día (E4-05.6). Mientras consulta,
 * el aviso de carga aparece sólo si la espera se nota.
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

  /** Lo que se muestra cuando se deja de consultar por fallas seguidas (E4-05.6). */
  static MENSAJE_DE_ERROR = 'No pudimos actualizar los lugares libres. El número puede no estar al día.';

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
    // Lo que había en el recuadro de reserva antes de agotarse, para volver a ponerlo si alguien
    // cancela. Null mientras no esté agotada.
    this.recuadroGuardado = null;
    this.libres = this.leerLibres();
    const campo = this.contenedor.querySelector('input[name="cantidad"]');
    if (campo) {
      if (this.libres !== null) {
        campo.dataset.lugaresLibres = String(this.libres);
      }
      const maximoPorPersona = Number.parseInt(this.contenedor.dataset.maximoPorPersona ?? '6', 10);
      const max = Number.parseInt(campo.getAttribute('max') ?? '', 10);
      campo.dataset.restantesUsuario = String(Number.isInteger(max) ? max : maximoPorPersona);
    }
    // Afuera de lo que se redibuja: la región tiene que existir antes del cambio para que un
    // lector de pantalla la lea.
    this.anuncio = PAW.nuevoElemento('p', '', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
    this.contenedor.append(this.anuncio);

    // Los avisos van fijos abajo de la pantalla, así que cuelgan del body y no de la ficha: no
    // empujan nada de lo que ya está y se ven con la página donde esté (E4-05.6).
    this.carga = PAW.avisoFlotante('Actualizando los lugares…');
    this.error = PAW.avisoFlotante(LugaresLibres.MENSAJE_DE_ERROR, 'error');
    document.body.append(this.carga, this.error);

    // Quien ya tiene el número —el formulario de reserva, que lo recibe al reservar— lo manda
    // por acá y no hay que esperar la consulta siguiente (E4-05.3).
    this.contenedor.addEventListener(PAW.EVENTO_LUGARES, (evento) => this.actualizar(evento.detail ?? {}));

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
    const inicial = Number.parseInt(this.contenedor?.dataset.lugares ?? '', 10);
    if (Number.isInteger(inicial)) {
      return inicial;
    }
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
    PAW.mostrarAviso(this.carga, true);
    try {
      const respuesta = await PAW.enviar(this.url, {
        headers: { Accept: 'application/json' },
        signal: this.pedido.signal,
      });
      if (!respuesta.ok) {
        throw new Error(`Los lugares respondieron ${respuesta.status}.`);
      }
      this.fallas = 0;
      // Si venía fallando y volvió a andar, el aviso ya no tiene nada que decir.
      PAW.mostrarAviso(this.error, false);
      this.actualizar(await respuesta.json());
    } catch (error) {
      // Un pedido que cancelamos nosotros no es una falla del servidor.
      if (error.name !== 'AbortError') {
        this.fallas += 1;
      }
    }
    PAW.mostrarAviso(this.carga, false);
    // Recién cuando se deja de consultar: una falla suelta se arregla sola en la siguiente y no
    // vale la pena avisar de algo que ya pasó. Que el número de la ficha no esté al día, sí
    // (E4-05.6). La página no se rompe: el número que trajo sigue ahí.
    if (this.fallas >= LugaresLibres.FALLAS_PARA_CORTAR) {
      PAW.mostrarAviso(this.error, true);
    }
    this.programar();
  }

  /**
   * Muestra los lugares que vinieron. Si el dato no está (funciones no respondió del lado del
   * servidor) se deja lo que hay: es mejor un número de hace un rato que ninguno.
   *
   * @param {{lugares_libres: ?number, agotada?: boolean, lugares_restantes_usuario?: number, maximo_reserva?: number}} datos
   */
  actualizar(datos) {
    const libres = datos.lugares_libres;
    const restantesUsuario = datos.maximo_reserva ?? datos.lugares_restantes_usuario;
    if (!Number.isInteger(libres)) {
      return;
    }
    const agotada = datos.agotada ?? libres === 0;
    const cambioLibres = libres !== this.libres;
    const campo = this.contenedor.querySelector('input[name="cantidad"]');
    const topeAnterior = Number.parseInt(campo?.dataset.restantesUsuario ?? '', 10);
    const cambioTope = Number.isInteger(restantesUsuario) && restantesUsuario !== topeAnterior;

    if (!cambioLibres && !cambioTope) {
      return;
    }
    // Sin sesión no hay campo de cantidad, así que no se sabe con qué número se cargó la página:
    // la primera respuesta se muestra, pero no se anuncia como un cambio que no se sabe si hubo.
    const anunciar = this.libres !== null && cambioLibres;
    this.libres = libres;
    this.pintarPildora(libres, agotada);
    // Antes que la barra y el campo: si el recuadro vuelve, los dos están adentro y hay que
    // pintarlos con el número de ahora y no con el que tenían cuando se agotó.
    this.pintarRecuadro(agotada);
    this.pintarBarra(libres);
    this.pintarCampo(libres, agotada, restantesUsuario);
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
   * Cuando se agota, el recuadro de reserva pasa a ser el aviso de «Función agotada», el mismo
   * que dibuja el servidor cuando la página se carga sin lugares (ficha_funcion.html.twig), y
   * cuando alguien cancela vuelve a estar el de antes.
   *
   * Lo que estaba no se copia ni se vuelve a armar: se saca del documento y se guarda tal cual,
   * y al volver se vuelven a poner los mismos nodos. Así el formulario conserva lo que le
   * engancharon FormularioDeReserva y la validación de la cantidad; con un clon, reservar
   * recargaría la página.
   *
   * Si la página ya se cargó agotada no hay nada guardado que devolver: ahí el recuadro vuelve
   * recién al recargar. Armar el formulario desde el JavaScript sería tener el marcado en dos
   * lados, y el número de la ficha igual queda al día.
   *
   * @param {boolean} agotada
   */
  pintarRecuadro(agotada) {
    const recuadro = this.contenedor.querySelector('.ficha-reserva');
    if (!recuadro || agotada === recuadro.classList.contains('ficha-reserva-agotada')) {
      return;
    }
    if (!agotada) {
      if (this.recuadroGuardado) {
        recuadro.replaceChildren(...this.recuadroGuardado);
        this.recuadroGuardado = null;
        recuadro.classList.remove('ficha-reserva-agotada');
      }

      return;
    }
    this.recuadroGuardado = [...recuadro.childNodes];
    const precio = PAW.nuevoElemento('div', '', { class: 'ficha-reserva-precio' });
    precio.append(
      PAW.nuevoElemento('h2', 'Función agotada', { id: 'ficha-reserva-titulo', class: 'ficha-reserva-titulo' }),
      PAW.nuevoElemento('p', `Ya se reservaron los ${this.cupo} lugares. Si alguien cancela su reserva, vuelve a haber lugar.`, { class: 'ficha-reserva-ayuda' }),
    );
    recuadro.replaceChildren(precio);
    recuadro.classList.add('ficha-reserva-agotada');
  }

  /**
   * El máximo del campo de cantidad, que es contra lo que valida el navegador, y el botón: con la
   * función agotada no hay cantidad que entre, así que mandar el formulario sólo daría el error.
   * Cuando el recuadro entero pasó a ser el aviso de agotada no hay campo ni botón que tocar.
   *
   * @param {number} libres
   * @param {boolean} agotada
   * @param {?number} [restantesUsuario]
   */
  pintarCampo(libres, agotada, restantesUsuario = null) {
    const campo = this.contenedor.querySelector('input[name="cantidad"]');
    if (campo) {
      const maximoPorPersona = Number.parseInt(this.contenedor.dataset.maximoPorPersona ?? '6', 10);
      const tope = Number.isInteger(restantesUsuario)
        ? restantesUsuario
        : (Number.parseInt(campo.dataset.restantesUsuario ?? '', 10) || maximoPorPersona);
      const maximoCampo = Math.max(Math.min(libres, tope), 1);

      campo.setAttribute('max', String(maximoCampo));
      campo.dataset.lugaresLibres = String(libres);
      campo.dataset.restantesUsuario = String(tope);
      campo.toggleAttribute('disabled', agotada || tope === 0);

      // Lo que ya tenía escrito puede haber quedado por encima de lo que queda.
      if (!agotada && Number.parseInt(campo.value, 10) > maximoCampo) {
        campo.value = String(maximoCampo);
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
