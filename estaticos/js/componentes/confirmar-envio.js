/**
 * Pide confirmación antes de mandar un formulario que hace algo que no se deshace desde la
 * pantalla, como dar de baja una obra. El texto va en data-confirmar del formulario. Reemplaza al
 * onsubmit en línea: con una Content-Security-Policy sin 'unsafe-inline', ese no se ejecuta. Sin
 * JavaScript el formulario se manda igual, y el servidor sigue controlando la regla.
 */
class ConfirmarEnvio {
  /**
   * @param {Element} pFormulario el formulario, con su data-confirmar
   */
  constructor(pFormulario) {
    this.formulario = pFormulario;
    this.formulario.addEventListener('submit', (evento) => {
      if (!window.confirm(this.formulario.dataset.confirmar)) {
        evento.preventDefault();
      }
    });
  }
}
