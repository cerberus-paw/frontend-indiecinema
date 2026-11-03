/**
 * El formulario de reserva de la ficha, sin recargar (E4-05.3).
 *
 * Toma el submit, manda el mismo formulario con FormData y PAW.enviar, y con la respuesta en JSON
 * muestra el comprobante en el lugar del formulario o el error debajo del campo. La página no se
 * recarga: los lugares libres de la ficha quedan al día con el número que trae el alta, sin
 * esperar la consulta siguiente de LugaresLibres.
 *
 * FormData manda el formulario tal cual está, con su campo oculto _csrf, así que el pedido lleva
 * el token aunque la cabecera X-CSRF-Token que agrega PAW.enviar no llegara. Un pedido sin token
 * lo rechaza el servidor con 403 y acá se ve como el error genérico: la reserva no se hace.
 *
 * Sin JavaScript el formulario es el de siempre: un POST que redirige al comprobante. Este
 * componente sólo intercepta lo que ya funciona.
 *
 * Lo que no es de esta subtarea: no dejar pedir más lugares de los que quedan antes de mandar es
 * E4-05.4, y el indicador de carga y el aviso de error genérico con la red cortada son E4-05.6.
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
  }

  /**
   * Manda la reserva y muestra lo que conteste el servidor. El navegador ya validó el campo
   * (required, min y max): si no pasa, el submit no llega acá.
   *
   * @param {SubmitEvent} evento
   */
  async alEnviar(evento) {
    evento.preventDefault();
    if (this.enviando) {
      return;
    }
    this.enviando = true;
    // El cuerpo se arma antes de bloquear: un campo deshabilitado no entra en el FormData, así que
    // al revés la cantidad no viajaría y el servidor contestaría que no es un número válido.
    const cuerpo = new FormData(this.formulario);
    this.bloquear(true);
    this.limpiarError();

    try {
      const respuesta = await PAW.enviar(this.formulario.action, {
        method: 'POST',
        body: cuerpo,
        headers: { Accept: 'application/json' },
      });
      const datos = await respuesta.json();
      if (respuesta.status === 201) {
        // Queda bloqueado a propósito: la reserva ya está hecha y el formulario se reemplaza.
        this.avisarLugares(datos);
        this.confirmar(datos);

        return;
      }
      // 422: la cantidad no entra o la regla no se cumple. El texto es para el espectador.
      if (respuesta.status === 422) {
        this.mostrarError(datos.errores?.cantidad ?? datos.error ?? FormularioDeReserva.MENSAJE_DE_ERROR);
        // Si el 422 fue porque quedan menos lugares, el número que vuelve ya es el de ahora.
        this.avisarLugares(datos);
      } else {
        this.mostrarError(FormularioDeReserva.MENSAJE_DE_ERROR);
      }
    } catch (error) {
      // Sin red, o con una respuesta que no es JSON (un 403 del CSRF, una pantalla de error).
      this.mostrarError(FormularioDeReserva.MENSAJE_DE_ERROR);
    }
    this.enviando = false;
    this.bloquear(false);
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
    aviso.focus();
  }

  /**
   * El error, debajo del campo y con el mismo marcado que cuando lo dibuja el servidor
   * (parciales/campo.html.twig), para que se vea igual con y sin JavaScript.
   *
   * @param {string} mensaje
   */
  mostrarError(mensaje) {
    this.limpiarError();
    const campo = this.campo();
    const grupo = campo?.closest('.grupo-campo');
    if (!campo || !grupo) {
      return;
    }
    grupo.classList.add('con-error');
    campo.classList.add('control-invalido');
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', 'error-cantidad');

    const error = PAW.nuevoElemento('span', '', { id: 'error-cantidad', class: 'campo-error', role: 'alert' });
    error.append(PAW.nuevoElemento('span', '⚠️', { class: 'error-icono', 'aria-hidden': 'true' }), ` ${mensaje}`);
    grupo.append(error);
    campo.focus();
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
   * reservas con un doble clic.
   *
   * @param {boolean} bloqueado
   */
  bloquear(bloqueado) {
    const boton = this.formulario.querySelector('button[type="submit"]');
    this.campo()?.toggleAttribute('disabled', bloqueado);
    boton?.toggleAttribute('disabled', bloqueado);
    if (boton) {
      boton.toggleAttribute('aria-busy', bloqueado);
    }
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
