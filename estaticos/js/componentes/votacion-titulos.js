/**
 * Mejora interactiva para la votación de títulos en la ficha de la función (E3-12 / IC-148).
 *
 * - Actualiza la selección visual (clase .seleccionada) y el atributo aria-checked al elegir una obra candidata.
 * - Mantiene accesibilidad por teclado y compatibilidad total sin JavaScript (mejora progresiva vía POST estándar).
 */
class VotacionTitulos {
  /**
   * @param {Element|string} pFormulario el <form> de votación de títulos, o su selector
   */
  constructor(pFormulario) {
    this.formulario = PAW.contenedor(pFormulario);
    if (!this.formulario) {
      return;
    }

    this.radios = this.formulario.querySelectorAll('input[type="radio"][name="obra_id"]');
    if (this.radios.length === 0) {
      return;
    }

    for (const radio of this.radios) {
      radio.addEventListener('change', () => this.actualizar());
    }

    this.actualizar();
  }

  /**
   * Sincroniza clases y atributos accesibles según la opción seleccionada.
   */
  actualizar() {
    for (const radio of this.radios) {
      const tarjeta = radio.closest('.tarjeta-candidata-votacion');
      const marcada = radio.checked;
      radio.setAttribute('aria-checked', marcada ? 'true' : 'false');
      if (tarjeta) {
        tarjeta.classList.toggle('seleccionada', marcada);
      }
    }
  }
}
