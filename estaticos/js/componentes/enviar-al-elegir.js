/**
 * Un formulario que se manda al elegir una opción de uno de sus desplegables, sin botón, como en
 * los wireframes del panel del administrador. Va en los <form data-enviar-al-elegir>; el texto de
 * un buscador se manda con Enter, que lo hace el navegador. Sin JavaScript, el botón para mandarlo
 * está en un <noscript>.
 */
class EnviarAlElegir {
  /**
   * @param {Element|string} pFormulario el <form>, o su selector
   */
  constructor(pFormulario) {
    this.formulario = PAW.contenedor(pFormulario);
    if (!this.formulario) {
      return;
    }
    this.formulario.addEventListener('change', (evento) => this.enviar(evento));
  }

  /**
   * @param {Event} evento
   */
  enviar(evento) {
    // Un buscador también avisa «change» al salir de él: ése espera el Enter.
    if (evento.target instanceof HTMLSelectElement) {
      this.formulario.requestSubmit();
    }
  }
}
