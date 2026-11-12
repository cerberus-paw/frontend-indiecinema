/* exported AccionesDeReserva */

/**
 * Las acciones de los paneles de reservas, sin recargar la lista (E4-05.5): registrar la
 * asistencia en el panel del organizador y anular en el del administrador.
 *
 * Es uno solo para los dos paneles porque hacen lo mismo: mandan un POST de una fila y vuelven a
 * la misma lista. Escucha el submit en el contenedor del panel y no en cada formulario, así el
 * botón de cada fila y el formulario de arriba —el del código que dicta el espectador en la
 * puerta— pasan por el mismo camino, que es el que termina cambiando una fila.
 *
 * Con la respuesta en JSON pinta la fila que volvió: su estado y, si la acción ya no se puede
 * repetir, el botón se reemplaza por el texto que la plantilla deja en data-hecho. El resumen de
 * arriba se actualiza si vino: registrar una asistencia mueve «Asistentes registrados», y si no
 * la fila diría una cosa y el número de arriba otra.
 *
 * El aviso de lo que pasó va en la región de data-avisos, que es aria-live: la fila cambia sola y
 * un lector de pantalla no lee un cambio en una tabla.
 *
 * El mensaje de error que manda el servidor y el foco al bloquear no los resuelve este componente:
 * los ponen PAW.mensajeDeError() y PAW.bloquear() (E4-05.8), que son los mismos que usa
 * FormularioDeReserva. Estaban escritos dos veces, y las dos veces hubo que arreglarlos.
 *
 * Sin JavaScript los formularios son los de siempre: un POST que redirige a la lista con el
 * código en la URL. Este componente sólo intercepta lo que ya funciona.
 */
class AccionesDeReserva {
  /** Lo que se muestra si el servidor no contesta o contesta algo que no se entiende. */
  static MENSAJE_DE_ERROR = 'No pudimos hacer la acción. Probá de nuevo en un momento.';

  /**
   * La clase de la píldora de cada estado, la misma que arman las plantillas de los dos paneles
   * (clases_estado). Si cambian allá, cambian acá.
   */
  static CLASES_DE_ESTADO = {
    confirmada: 'estado-cuenta-activa',
    cancelada: 'estado-cuenta-cancelada',
    asistio: 'estado-cuenta-asistio',
    // La de quien no fue (EF-04.1): la píldora sin color, porque ya no hay nada que hacer con ella.
    ausente: '',
  };

  /**
   * La nota del reembolso en la fila (EF-06.4), la misma que escribe la plantilla del panel del
   * administrador. Si cambia allá, cambia acá.
   */
  static TEXTOS_DE_REEMBOLSO = {
    hecho: 'Reembolsada',
    pendiente: 'Reembolso pendiente',
  };

  /** Lo que el aviso de la anulación le suma según cómo quedó el reembolso. */
  static AVISOS_DE_REEMBOLSO = {
    hecho: ' Se le devolvió el pago.',
    pendiente: ' El reembolso quedó pendiente: Mercado Pago no lo tomó.',
  };

  /**
   * @param {Element|string} pContenedor el panel, con data-panel-de-reservas, o su selector
   */
  constructor(pContenedor) {
    this.contenedor = PAW.contenedor(pContenedor);
    if (!this.contenedor) {
      return;
    }
    this.enviando = false;
    // Fijo abajo de la pantalla, así que cuelga del body: no mueve la tabla mientras se manda
    // (E4-05.6). Aparece sólo si la espera se nota.
    this.carga = PAW.avisoFlotante('Guardando el cambio…');
    document.body.append(this.carga);
    this.contenedor.addEventListener('submit', (evento) => {
      const formulario = evento.target.closest('[data-accion-de-reserva]');
      if (formulario) {
        this.alEnviar(evento, formulario);
      }
    });
  }

  /**
   * Manda la acción y muestra lo que conteste el servidor.
   *
   * @param {SubmitEvent} evento
   * @param {HTMLFormElement} formulario
   */
  async alEnviar(evento, formulario) {
    evento.preventDefault();
    if (this.enviando) {
      return;
    }
    this.enviando = true;
    // Como en el formulario de reserva: el cuerpo se arma antes de bloquear, porque un campo
    // deshabilitado no entra en el FormData y el código no viajaría.
    const cuerpo = new FormData(formulario);
    // PAW.bloquear() anota qué tenía el foco antes de deshabilitar el botón, porque el navegador
    // se lo saca, y lo devuelve: pintarFila() lo necesita para saber si el texto que reemplaza al
    // botón se lo tiene que quedar.
    const enfocado = PAW.bloquear(formulario, true);
    PAW.mostrarAviso(this.carga, true);

    try {
      const respuesta = await PAW.enviar(formulario.action, {
        method: 'POST',
        body: cuerpo,
        headers: { Accept: 'application/json' },
      });
      const datos = await respuesta.json();
      if (respuesta.ok) {
        // La fila primero: el aviso cuenta algo que ya se tiene que ver.
        this.pintarFila(datos.reserva, enfocado);
        this.pintarResumen(datos.resumen);
        this.avisar('exito', AccionesDeReserva.hecho(datos.reserva));
        formulario.reset();
      } else {
        this.avisar('error', PAW.mensajeDeError(datos, AccionesDeReserva.MENSAJE_DE_ERROR));
      }
    } catch {
      // Sin red, o con una respuesta que no es JSON: queda el mensaje genérico.
      this.avisar('error', AccionesDeReserva.MENSAJE_DE_ERROR);
    }
    PAW.mostrarAviso(this.carga, false);
    this.enviando = false;
    // Vuelve a habilitar y, si el foco quedó perdido por el bloqueo, lo devuelve adonde estaba: si
    // pintarFila() ya se lo pasó al texto que reemplazó al botón, ése es el que queda.
    PAW.bloquear(formulario, false);
  }

  /**
   * Deja la fila como quedó: la píldora del estado y, si la acción ya no se puede repetir, el
   * texto que la plantilla dejó en data-hecho en lugar del botón.
   *
   * La fila se busca por su id y no por dónde está el formulario: el del código de arriba no está
   * en ninguna fila, y igual tiene que cambiar la que se registró.
   *
   * @param {{id: string, estado: string, estado_etiqueta: string, reembolso?: ?string, anulable?: boolean, registrable?: boolean}} reserva
   * @param {?Element} [enfocado=null] lo que tenía el foco cuando se mandó la acción
   */
  pintarFila(reserva, enfocado = null) {
    const fila = this.contenedor.querySelector(`tr[data-reserva="${CSS.escape(reserva?.id ?? '')}"]`);
    if (!fila) {
      return;
    }
    const pildora = fila.querySelector('.estado-cuenta');
    if (pildora) {
      pildora.textContent = reserva.estado_etiqueta;
      pildora.className = `estado-cuenta ${AccionesDeReserva.CLASES_DE_ESTADO[reserva.estado] ?? ''}`.trim();
      // Sólo el panel del administrador manda el reembolso: en el del organizador no viene, y
      // entonces la nota de la fila queda como está.
      if (reserva.reembolso !== undefined && pildora.parentElement) {
        AccionesDeReserva.pintarReembolso(pildora.parentElement, reserva.reembolso);
      }
    }
    // anulable en el panel del administrador, registrable en el del organizador: el que no es de
    // este panel no viene, y sin él no se saca ningún botón.
    if (reserva.anulable === false || reserva.registrable === false) {
      const deLaFila = fila.querySelector('[data-accion-de-reserva]');
      if (!deLaFila) {
        return;
      }
      // Si el foco estaba en el botón que se va, pasa al texto que lo reemplaza: si no, se va al
      // principio de la página, y quien registra varias seguidas con el teclado en la puerta
      // tendría que volver a recorrerla entera.
      const teniaElFoco = enfocado !== null && deLaFila.contains(enfocado);
      const hecho = PAW.nuevoElemento('span', deLaFila.dataset.hecho ?? '—', { class: 'tabla-admin-secundario' });
      deLaFila.replaceWith(hecho);
      if (teniaElFoco) {
        PAW.enfocar(hecho);
      }
    }
  }

  /**
   * La nota de qué pasó con la plata, al lado de la píldora del estado (EF-06.4). La plantilla la
   * escribe sólo si había algo que decir, así que acá se crea o se saca según lo que conteste el
   * servidor: una anulación puede dejar un reembolso donde antes no había ninguno.
   *
   * @param {Element} celda la celda del estado
   * @param {?string} reembolso «hecho», «pendiente», o null si no había nada que devolver
   */
  static pintarReembolso(celda, reembolso) {
    const nota = celda.querySelector('[data-reembolso]');
    const texto = AccionesDeReserva.TEXTOS_DE_REEMBOLSO[reembolso] ?? '';
    if (!texto) {
      nota?.remove();

      return;
    }
    if (nota) {
      nota.textContent = texto;

      return;
    }
    celda.append(PAW.nuevoElemento('span', texto, { class: 'tabla-admin-secundario', 'data-reembolso': '' }));
  }

  /**
   * Los números de arriba, si la respuesta los trajo: cada dato está en el dd que la plantilla
   * marcó con data-resumen.
   *
   * @param {?Object<string, number|string>} resumen
   */
  pintarResumen(resumen) {
    if (!resumen) {
      return;
    }
    for (const [nombre, valor] of Object.entries(resumen)) {
      const dato = this.contenedor.querySelector(`[data-resumen="${CSS.escape(nombre)}"]`);
      if (dato) {
        dato.textContent = String(valor);
      }
    }
  }

  /**
   * El aviso, con el marcado de parciales/mensaje.html.twig, en la región que está siempre en la
   * página: tiene que existir antes del cambio para que un lector de pantalla la lea.
   *
   * @param {'exito'|'error'} tipo
   * @param {string} mensaje
   */
  avisar(tipo, mensaje) {
    const region = this.contenedor.querySelector('[data-avisos]');
    if (!region) {
      return;
    }
    const alerta = PAW.nuevoElemento('div', '', { class: `alerta alerta-${tipo}`, role: tipo === 'error' ? 'alert' : 'status' });
    const icono = PAW.nuevoElemento('div', '', { class: 'alerta-icono', 'aria-hidden': 'true' });
    icono.append(PAW.nuevoElemento('span', tipo === 'error' ? '✕' : '✓', { class: 'icono-simbolo' }));
    const contenido = PAW.nuevoElemento('div', '', { class: 'alerta-contenido' });
    contenido.append(PAW.nuevoElemento('p', mensaje, { class: 'alerta-texto' }));
    alerta.append(icono, contenido);

    region.replaceChildren(alerta);
  }

  /**
   * @param {{codigo?: string, estado?: string, reembolso?: ?string}} reserva
   * @returns {string}
   */
  static hecho(reserva) {
    const codigo = reserva?.codigo ?? '';
    if (reserva?.estado === 'asistio') {
      return `Se registró la asistencia de la reserva ${codigo}.`;
    }
    // Lo del reembolso sólo si había plata que devolver: el aviso es la única forma que tiene el
    // administrador de enterarse ahí mismo de que quedó pendiente (EF-06.4).
    const reembolso = AccionesDeReserva.AVISOS_DE_REEMBOLSO[reserva?.reembolso] ?? '';

    return `Se anuló la reserva ${codigo} y sus lugares quedaron libres.${reembolso}`;
  }
}
