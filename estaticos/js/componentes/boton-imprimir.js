/**
 * El botón «Imprimir» del comprobante de la reserva: abre el diálogo de impresión del navegador.
 * Va en un contenedor [data-imprimir] que llega oculto (hidden), así sin JavaScript no queda un
 * botón que no hace nada; acá se muestra.
 */
class BotonImprimir {
  /**
   * @param {Element|string} pContenedor el contenedor del botón, o su selector
   */
  constructor(pContenedor) {
    this.contenedor = PAW.contenedor(pContenedor);
    if (!this.contenedor) {
      return;
    }
    const boton = this.contenedor.querySelector('button');
    if (!boton) {
      return;
    }
    boton.addEventListener('click', () => window.print());
    this.contenedor.hidden = false;
  }
}
