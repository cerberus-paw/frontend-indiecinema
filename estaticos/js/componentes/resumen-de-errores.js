/* exported ResumenDeErrores */

/**
 * El resumen de errores de un formulario (E4-10.5, parciales/resumen_de_errores.html.twig).
 *
 * - Al cargar la página le pasa el foco, así el lector de pantalla lo lee enseguida y quien usa el
 *   teclado empieza desde ahí. Sin JavaScript igual se anuncia, porque tiene role="alert".
 * - Cada link lleva a su campo y lo enfoca. Un link a un ancla sólo mueve la vista, y el campo
 *   quedaría sin el foco. Si el destino es un grupo (las obras, las franjas), enfoca su primer
 *   control.
 */
class ResumenDeErrores {
  /** Lo que puede recibir el foco dentro de un grupo. */
  static CONTROLES = 'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])';

  /**
   * @param {Element|string} pResumen el resumen, o su selector
   */
  constructor(pResumen) {
    this.resumen = PAW.contenedor(pResumen);
    if (!this.resumen) {
      return;
    }
    this.resumen.addEventListener('click', (evento) => this.irAlCampo(evento));
    this.resumen.focus();
  }

  /**
   * @param {MouseEvent} evento
   */
  irAlCampo(evento) {
    const enlace = evento.target.closest('a[href^="#"]');
    const destino = enlace && document.getElementById(decodeURIComponent(enlace.hash.slice(1)));
    if (!destino) {
      return;
    }
    const campo = destino.matches(ResumenDeErrores.CONTROLES) ? destino : destino.querySelector(ResumenDeErrores.CONTROLES);
    if (!campo) {
      return;
    }
    evento.preventDefault();
    campo.focus();
    // Que se vea también la etiqueta, que está arriba del control.
    (campo.closest('.grupo-campo, fieldset') ?? campo).scrollIntoView({ block: 'start' });
  }
}
