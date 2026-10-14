/**
 * Los parámetros que la función hereda de la sala, al lado del formulario de alta: muestra sólo
 * los de la sala elegida en el desplegable, y un aviso mientras no hay ninguna. Sin JavaScript se
 * ven los de todas las salas, cada una con su nombre.
 */
class ParametrosDeSala {
  /**
   * @param {Element|string} pContenedor el panel con un [data-sala] por sala, o su selector
   * @param {Element|string} pDesplegable el <select> de la sala, o su selector
   */
  constructor(pContenedor, pDesplegable) {
    this.contenedor = PAW.contenedor(pContenedor);
    this.desplegable = PAW.contenedor(pDesplegable);
    if (!this.contenedor || !this.desplegable) {
      return;
    }
    this.desplegable.addEventListener('change', () => this.mostrar());
    this.mostrar();
  }

  mostrar() {
    const elegida = this.desplegable.value;
    for (const grupo of this.contenedor.querySelectorAll('[data-sala]')) {
      grupo.hidden = grupo.dataset.sala !== elegida;
    }
    const aviso = this.contenedor.querySelector('[data-sin-sala]');
    if (aviso) {
      aviso.hidden = elegida !== '';
    }
  }
}
