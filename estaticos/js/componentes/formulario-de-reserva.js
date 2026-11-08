/**
 * El formulario de reserva de la ficha, sin recargar (E4-05.3) y con la cantidad revisada contra
 * los lugares libres mientras se escribe (E4-05.4).
 *
 * Toma el submit, manda el mismo formulario con FormData y PAW.enviar, y con la respuesta en JSON
 * muestra el comprobante en el lugar del formulario o el error debajo del campo. La página no se
 * recarga: los lugares libres de la ficha quedan al día con el número que trae el alta, sin
 * esperar la consulta siguiente de LugaresLibres.
 *
 * FormData manda el formulario tal cual está, con su campo oculto _csrf, así que el pedido lleva
 * el token aunque la cabecera X-CSRF-Token que agrega PAW.enviar no llegara. Un pedido sin token
 * lo rechaza el servidor con 403 y el mensaje que manda («La página venció…») sale debajo del
 * campo: la reserva no se hace.
 *
 * La cantidad se revisa mientras se escribe, contra los lugares que quedan (E4-05.4): el error
 * sale debajo del campo, en el momento, y un submit con la cantidad mal no se manda. El número
 * contra el que se compara es el atributo max del campo, que LugaresLibres deja al día, así que
 * la validación sigue a los lugares aunque alguien reserve desde otra pestaña.
 *
 * Sin JavaScript el formulario es el de siempre: un POST que redirige al comprobante, con el
 * required, el min y el max que valida el navegador. Este componente sólo intercepta lo que ya
 * funciona: el novalidate lo pone el JavaScript, no la plantilla, justamente para no sacarle la
 * validación nativa a quien no lo tenga.
 *
 * El mensaje de error que manda el servidor y el foco al bloquear no los resuelve este componente:
 * los pone PAW.mensajeDeError() y PAW.bloquear() (E4-05.8), que son los mismos que usa
 * AccionesDeReserva. Estaban escritos dos veces, y las dos veces hubo que arreglarlos.
 *
 * Lo que no es de esta subtarea: el indicador de carga y el aviso de error genérico con la red
 * cortada son E4-05.6.
 */
class FormularioDeReserva {
  /** Lo que se muestra si el servidor no contesta o contesta algo que no se entiende. */
  static MENSAJE_DE_ERROR = 'No pudimos hacer la reserva. Probá de nuevo en un momento.';

  /**
   * @param {Element|string} pFormulario el formulario de reserva, o su selector
   */
  constructor(pFormulario) {
    this.formulario = PAW.contenedor(pFormulario);
    if (!(this.formulario instanceof HTMLFormElement)) {
      return;
    }
    this.enviando = false;
    this.formulario.addEventListener('submit', (evento) => this.alEnviar(evento));
    // Fijo abajo de la pantalla, así que cuelga del body: no empuja el formulario mientras se
    // manda (E4-05.6). Aparece sólo si la espera se nota.
    this.carga = PAW.avisoFlotante('Haciendo la reserva…');
    document.body.append(this.carga);

    const campo = this.campo();
    if (campo) {
      // Los mensajes los escribe el componente, no el navegador: así son los mismos que los del
      // servidor y salen debajo del campo y no en un globo. Acá y no en la plantilla, porque sin
      // JavaScript el que tiene que validar es el navegador.
      this.formulario.noValidate = true;
      campo.addEventListener('input', () => this.validar());
      // LugaresLibres baja el max cuando alguien reserva desde otra pestaña: lo que estaba
      // escrito puede haber quedado de más sin que se tocara el campo.
      new MutationObserver(() => this.validar()).observe(campo, { attributeFilter: ['max'] });
    }
  }

  /**
   * Revisa la cantidad contra lo que valida el navegador (required, min, max y que sea un entero)
   * y muestra el error debajo del campo, o lo saca si ya está bien. El max lo deja al día
   * LugaresLibres, así que el límite es el de ahora y no el de cuando cargó la página.
   *
   * @param {boolean} [foco=false] si llevar el foco al campo; al escribir no, que ya está ahí
   * @returns {boolean} si la cantidad se puede mandar
   */
  validar(foco = false) {
    const campo = this.campo();
    // Deshabilitado lo deja LugaresLibres cuando la función se agota: no hay nada que validar, y
    // un campo deshabilitado da válido, así que seguir borraría el error de «agotada».
    if (campo?.disabled) {
      return false;
    }
    if (!campo || campo.checkValidity()) {
      this.limpiarError();

      return true;
    }
    this.mostrarError(FormularioDeReserva.mensajeDelCampo(campo), foco);

    return false;
  }

  /**
   * El error de una cantidad que no va. El de los lugares es palabra por palabra el que contesta
   * el servidor (ServicioDeReservas::reservar), para que pedir de más diga lo mismo antes y
   * después de mandar.
   *
   * @param {HTMLInputElement} campo
   * @returns {string}
   */
  static mensajeDelCampo(campo) {
    if (campo.validity.rangeOverflow) {
      const libres = Number.parseInt(campo.getAttribute('max') ?? '', 10);

      switch (libres) {
        case 0: return 'La función está agotada.';
        case 1: return 'Queda 1 lugar.';
        default: return `Quedan ${libres} lugares.`;
      }
    }
    if (campo.validity.valueMissing) {
      return 'Ingresá cuántos lugares querés reservar.';
    }

    // Lo que queda: un 0, un negativo, un 1.5 o algo que no es un número.
    return 'Ingresá un número entero de lugares, desde 1.';
  }

  /**
   * Manda la reserva y muestra lo que conteste el servidor. Con la cantidad mal no se manda nada:
   * el error ya está debajo del campo y el foco va ahí, que es adonde hay que volver.
   *
   * @param {SubmitEvent} evento
   */
  async alEnviar(evento) {
    evento.preventDefault();
    if (this.enviando || !this.validar(true)) {
      return;
    }
    this.enviando = true;
    // El cuerpo se arma antes de bloquear: un campo deshabilitado no entra en el FormData, así que
    // al revés la cantidad no viajaría y el servidor contestaría que no es un número válido.
    const cuerpo = new FormData(this.formulario);
    this.bloquear(true);
    this.limpiarError();
    PAW.mostrarAviso(this.carga, true);

    let datos = null;
    try {
      const respuesta = await PAW.enviar(this.formulario.action, {
        method: 'POST',
        body: cuerpo,
        headers: { Accept: 'application/json' },
      });
      datos = await respuesta.json();
      if (respuesta.status === 201) {
        // Queda bloqueado a propósito: la reserva ya está hecha y el formulario se reemplaza.
        PAW.mostrarAviso(this.carga, false);
        this.avisarLugares(datos);
        this.confirmar(datos);

        return;
      }
    } catch {
      // Sin red, o con una respuesta que no es JSON: queda el mensaje genérico.
    }
    PAW.mostrarAviso(this.carga, false);
    this.enviando = false;
    // Si el 422 fue porque quedan menos lugares, el número que vuelve ya es el de ahora.
    this.avisarLugares(datos);
    // Si con ese número la función quedó agotada, LugaresLibres cambió el recuadro por el aviso
    // de «Función agotada» y este formulario salió del documento (IC-446): el foco va directo al
    // título del aviso sin pasar por el botón de envío.
    if (!this.formulario.isConnected) {
      PAW.enfocar(document.getElementById('ficha-reserva-titulo'));

      return;
    }
    // Se desbloquea sin forzar el foco al botón porque mostrarError() se lo da al campo con error.
    this.bloquear(false, false);
    this.mostrarError(PAW.mensajeDeError(datos, FormularioDeReserva.MENSAJE_DE_ERROR, 'cantidad'));
  }

  /**
   * Reemplaza el formulario por el comprobante, con el código y el enlace a la reserva, y se lleva
   * el foco: quien navega con teclado o lector de pantalla se quedaría en un botón que ya no está.
   *
   * @param {{reserva: {codigo: string, cantidad: number, total: string}, url: string}} datos
   */
  confirmar(datos) {
    const reserva = datos.reserva ?? {};
    const cantidad = reserva.cantidad ?? 0;
    const aviso = PAW.nuevoElemento('div', '', { class: 'alerta alerta-exito', role: 'status', tabindex: '-1' });
    const icono = PAW.nuevoElemento('div', '', { class: 'alerta-icono', 'aria-hidden': 'true' });
    icono.append(PAW.nuevoElemento('span', '✓', { class: 'icono-simbolo' }));
    const contenido = PAW.nuevoElemento('div', '', { class: 'alerta-contenido' });
    contenido.append(
      PAW.nuevoElemento('strong', 'Reserva confirmada', { class: 'alerta-titulo' }),
      PAW.nuevoElemento('p', `Reservaste ${cantidad} ${cantidad === 1 ? 'lugar' : 'lugares'} por ${reserva.total ?? ''}. Código ${FormularioDeReserva.codigo(reserva.codigo)}.`, { class: 'alerta-texto' }),
    );
    if (typeof datos.url === 'string' && datos.url !== '') {
      contenido.append(PAW.nuevoElemento('a', 'Ver el comprobante', { href: datos.url, class: 'enlace-destacado' }));
    }
    aviso.append(icono, contenido);

    this.formulario.replaceWith(aviso);
    PAW.enfocar(aviso);
  }

  /**
   * El error, debajo del campo y con el mismo marcado que cuando lo dibuja el servidor
   * (parciales/campo.html.twig), para que se vea igual con y sin JavaScript.
   *
   * @param {string} mensaje
   * @param {boolean} [foco=true] si llevar el foco al campo
   */
  mostrarError(mensaje, foco = true) {
    const campo = this.campo();
    const grupo = campo?.closest('.grupo-campo');
    if (!campo || !grupo) {
      return;
    }
    // El mismo error que ya está no se vuelve a dibujar: con role="alert", rehacerlo en cada
    // tecla se lo repetiría al lector de pantalla letra por letra.
    if (grupo.querySelector('.campo-error')?.textContent.trim().endsWith(mensaje)) {
      // El foco sí, igual: puede venir de un submit, y ahí hay que volver al campo.
      if (foco) {
        campo.focus();
      }

      return;
    }
    this.limpiarError();
    grupo.classList.add('con-error');
    campo.classList.add('control-invalido');
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', 'error-cantidad');

    const error = PAW.nuevoElemento('span', '', { id: 'error-cantidad', class: 'campo-error', role: 'alert' });
    error.append(PAW.nuevoElemento('span', '⚠️', { class: 'error-icono', 'aria-hidden': 'true' }), ` ${mensaje}`);
    grupo.append(error);
    if (foco) {
      campo.focus();
    }
  }

  /** Saca el error anterior: el de antes no tiene por qué valer para este envío. */
  limpiarError() {
    const campo = this.campo();
    const grupo = campo?.closest('.grupo-campo');
    grupo?.classList.remove('con-error');
    grupo?.querySelector('.campo-error')?.remove();
    campo?.classList.remove('control-invalido');
    campo?.removeAttribute('aria-invalid');
    campo?.removeAttribute('aria-describedby');
  }

  /**
   * Le pasa a LugaresLibres el número que vino con la respuesta, si vino: es el de después de
   * reservar, y es mejor que esperar hasta la consulta siguiente.
   *
   * @param {{lugares_libres?: ?number}} datos
   */
  avisarLugares(datos) {
    if (!Number.isInteger(datos?.lugares_libres)) {
      return;
    }
    this.formulario.dispatchEvent(new CustomEvent(PAW.EVENTO_LUGARES, { detail: datos, bubbles: true }));
  }

  /**
   * Deshabilita o vuelve a habilitar el campo y el botón mientras se manda, para que no salgan dos
   * reservas con un doble clic. El campo también, y no sólo el botón, porque con Enter la reserva
   * se manda desde ahí.
   *
   * Lo hace PAW.bloquear(), que además conserva el foco: al deshabilitar el control que lo tiene,
   * el navegador lo manda al principio de la página.
   *
   * @param {boolean} bloqueado
   * @returns {?Element} al bloquear, lo que tenía el foco
   * @param {boolean} [restaurarFoco=true] si devolver el foco al control previo al desbloquear
   */
  bloquear(bloqueado, restaurarFoco = true) {
    return PAW.bloquear(this.formulario, bloqueado, 'input[name="cantidad"], button[type="submit"]', restaurarFoco);
  }

  /**
   * @returns {?HTMLInputElement}
   */
  campo() {
    return this.formulario.querySelector('input[name="cantidad"]');
  }

  /**
   * El código en dos grupos de cuatro, como el comprobante y el correo, para poder dictarlo.
   *
   * @param {?string} codigo
   * @returns {string}
   */
  static codigo(codigo) {
    return typeof codigo === 'string' && codigo.length === 8 ? `${codigo.slice(0, 4)}-${codigo.slice(4)}` : (codigo ?? '');
  }
}
