/**
 * Mejora interactiva para la votación de títulos en la ficha de la función (E3-12 / IC-148 / IC-149).
 *
 * - Previene doble envío accidental al emitir o cambiar el voto deshabilitando el botón y mostrando estado de carga.
 * - Sincroniza atributos accesibles y estados interactivos de las tarjetas candidatas.
 * - Mantiene compatibilidad total sin JavaScript (mejora progresiva con POST estándar nativo y redirección 303).
 */
class VotacionTitulos {
  /**
   * @param {Element|string} pContenedor el contenedor de votación o selector
   */
  constructor(pContenedor) {
    this.contenedor = PAW.contenedor(pContenedor);
    if (!this.contenedor) {
      return;
    }

    this.iniciarFormularios();
    this.iniciarRadios();
  }

  /**
   * Gestiona el envío de votos individuales por cada tarjeta candidata.
   */
  iniciarFormularios() {
    const formularios = this.contenedor.querySelectorAll('form[data-formulario-voto]');
    for (const form of formularios) {
      form.addEventListener('submit', (evento) => {
        const boton = form.querySelector('button[type="submit"]');
        if (boton && boton.disabled) {
          evento.preventDefault();
          return;
        }

        // Deshabilita todos los botones de voto del bloque para evitar envíos concurrentes
        const todosLosBotones = this.contenedor.querySelectorAll('button.boton-votar-obra');
        for (const btn of todosLosBotones) {
          btn.disabled = true;
        }

        if (boton) {
          boton.classList.add('cargando');
          boton.setAttribute('aria-busy', 'true');
        }
      });
    }
  }

  /**
   * Soporte compatible en caso de utilizar selector por radio buttons.
   */
  iniciarRadios() {
    this.radios = this.contenedor.querySelectorAll('input[type="radio"][name="obra_id"]');
    if (this.radios.length === 0) {
      return;
    }

    for (const radio of this.radios) {
      radio.addEventListener('change', () => this.actualizarRadios());
    }

    this.actualizarRadios();
  }

  /**
   * Sincroniza clases y atributos accesibles según la opción seleccionada con radio buttons.
   */
  actualizarRadios() {
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
