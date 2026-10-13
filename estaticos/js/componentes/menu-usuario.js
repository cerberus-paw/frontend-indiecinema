/**
 * El menú desplegable del usuario con sesión (<details id="menu-usuario"> del encabezado): se
 * cierra al hacer clic afuera y con Escape, que además devuelve el foco al botón (WCAG 2.1). Sin
 * JavaScript se abre y se cierra igual, con el <details>.
 */
class MenuUsuario {
  /**
   * @param {Element|string} pContenedor el <details> del menú, o su selector
   */
  constructor(pContenedor) {
    this.contenedor = PAW.contenedor(pContenedor);
    if (!this.contenedor) {
      return;
    }
    document.addEventListener('click', (evento) => this.cerrarSiEsAfuera(evento));
    document.addEventListener('keydown', (evento) => this.cerrarConEscape(evento));
  }

  /**
   * @param {MouseEvent} evento
   */
  cerrarSiEsAfuera(evento) {
    if (this.contenedor.open && !this.contenedor.contains(evento.target)) {
      this.contenedor.open = false;
    }
  }

  /**
   * @param {KeyboardEvent} evento
   */
  cerrarConEscape(evento) {
    if (evento.key === 'Escape' && this.contenedor.open) {
      this.contenedor.open = false;
      this.contenedor.querySelector('summary')?.focus();
    }
  }
}
