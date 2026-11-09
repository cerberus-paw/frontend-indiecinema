/* exported AcuerdoFecha */

/**
 * El acuerdo de fecha en la ficha de la función (E3-13 / IC-155 / IC-158).
 *
 * Los formularios de la ficha («Me sirve», confirmar la franja ganadora y cerrar el acuerdo)
 * funcionan sin JavaScript, con un POST común. Esto sólo evita el doble envío, que marcaría y
 * quitaría la misma franja, y le avisa al lector de pantalla qué se está mandando.
 */
class AcuerdoFecha {
  /** Los formularios del acuerdo, por el atributo que les pone la plantilla. */
  static FORMULARIOS = 'form[data-formulario-votar-franja], form[data-formulario-confirmar-acuerdo], form[data-formulario-cerrar-acuerdo]';

  /**
   * @param {Element|string} pContenedor la sección del acuerdo, [data-seccion-acuerdo-fecha]
   */
  constructor(pContenedor) {
    this.contenedor = PAW.contenedor(pContenedor);
    if (!this.contenedor) {
      return;
    }

    this.anunciador = this.contenedor.querySelector('[data-anuncio-acuerdo]');
    this.enviando = false;
    for (const formulario of this.contenedor.querySelectorAll(AcuerdoFecha.FORMULARIOS)) {
      formulario.addEventListener('submit', (evento) => this.alEnviar(evento, formulario));
    }
  }

  /**
   * Deja pasar el primer envío y frena los demás hasta que cargue la página nueva.
   *
   * @param {SubmitEvent} evento
   * @param {HTMLFormElement} formulario
   */
  alEnviar(evento, formulario) {
    if (this.enviando) {
      evento.preventDefault();
      return;
    }
    this.enviando = true;

    for (const boton of this.contenedor.querySelectorAll('button[type="submit"]')) {
      boton.disabled = true;
    }
    formulario.querySelector('button[type="submit"]')?.setAttribute('aria-busy', 'true');
    this.anunciar(this.descripcion(formulario));
  }

  /**
   * Qué se está mandando, en palabras.
   *
   * @param {HTMLFormElement} formulario
   * @returns {string}
   */
  descripcion(formulario) {
    if (formulario.matches('[data-formulario-confirmar-acuerdo]')) {
      return 'Confirmando la franja ganadora…';
    }
    if (formulario.matches('[data-formulario-cerrar-acuerdo]')) {
      return 'Cerrando el acuerdo…';
    }
    const fecha = formulario.closest('.ficha-franja')?.querySelector('.ficha-franja-fecha')?.textContent?.trim() ?? 'la franja';
    const quita = formulario.querySelector('input[name="quitar"]') !== null;

    return quita ? `Quitando «Me sirve» del ${fecha}…` : `Marcando «Me sirve» en el ${fecha}…`;
  }

  /**
   * Lo dice en la región aria-live: vaciarla antes hace que se lea aunque el texto se repita.
   *
   * @param {string} mensaje
   */
  anunciar(mensaje) {
    if (!this.anunciador) {
      return;
    }
    this.anunciador.textContent = '';
    window.setTimeout(() => {
      this.anunciador.textContent = mensaje;
    }, 50);
  }
}
