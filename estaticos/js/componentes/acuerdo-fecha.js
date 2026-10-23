/**
 * Componente interactivo y accesible para el acuerdo de fecha con los espectadores (IC-155 / E3-13.3).
 *
 * - Gestiona el botón «Me sirve» y «Cambiar mi voto» entre las franjas horarias propuestas.
 * - Garantiza unicidad visual: sólo la franja elegida muestra el estado activo «✓ Te sirve / Tu voto actual».
 * - Previene doble envío accidental deshabilitando botones concurrentes y activando estado de carga accesible.
 * - Anuncia los cambios de estado a tecnologías asistivas mediante regiones aria-live y role="status".
 * - Soporta mejora progresiva transparente: funciona con POST nativo si JavaScript está deshabilitado.
 */
class AcuerdoFecha {
  /**
   * @param {Element|string} pContenedor El contenedor del acuerdo [data-seccion-acuerdo-fecha]
   */
  constructor(pContenedor) {
    this.contenedor = PAW.contenedor(pContenedor);
    if (!this.contenedor) {
      return;
    }

    this.anunciador = this.contenedor.querySelector('[data-anuncio-acuerdo]');
    this.iniciarFormulariosVoto();
    this.iniciarFormularioConfirmacion();
    this.iniciarBarrasProgreso();
  }

  /**
   * Vincula la prevención de doble submit al formulario de confirmación de franja ganadora del organizador.
   */
  iniciarFormularioConfirmacion() {
    const formConfirmar = this.contenedor.querySelector('form[data-formulario-confirmar-acuerdo]');
    if (!formConfirmar) {
      return;
    }

    formConfirmar.addEventListener('submit', (evento) => {
      const boton = formConfirmar.querySelector('button[type="submit"]');
      if (boton && boton.disabled) {
        evento.preventDefault();
        return;
      }

      if (boton) {
        boton.disabled = true;
        boton.classList.add('cargando');
        boton.setAttribute('aria-busy', 'true');
      }

      this.anunciar('Confirmando franja ganadora y programando la función en cartelera...');
    });
  }

  /**
   * Vincula la prevención de doble submit y feedback accesible a los formularios de voto de franja.
   */
  iniciarFormulariosVoto() {
    const formularios = this.contenedor.querySelectorAll('form[data-formulario-votar-franja]');

    for (const form of formularios) {
      form.addEventListener('submit', (evento) => {
        const boton = form.querySelector('button[type="submit"]');
        if (boton && boton.disabled) {
          evento.preventDefault();
          return;
        }

        // Deshabilita todos los botones de votar franja del acuerdo para evitar carreras
        const todosLosBotones = this.contenedor.querySelectorAll('button.boton-me-sirve, button.boton-votar-franja');
        for (const btn of todosLosBotones) {
          btn.disabled = true;
        }

        if (boton) {
          boton.classList.add('cargando');
          boton.setAttribute('aria-busy', 'true');
        }

        const tarjetaFranja = form.closest('.tarjeta-franja-acuerdo');
        const rotuloFranja = tarjetaFranja?.querySelector('.franja-fecha-texto')?.textContent?.trim() || 'la franja seleccionada';
        this.anunciar(`Registrando tu compromiso «Me sirve» para ${rotuloFranja}...`);
      });
    }
  }

  /**
   * Inicializa la animación fluida y atributos accesibles de las barras de progreso de compromisos.
   */
  iniciarBarrasProgreso() {
    const barras = this.contenedor.querySelectorAll('.barra-progreso-relleno[data-progreso-porcentaje]');
    for (const barra of barras) {
      const porcentaje = barra.dataset.progresoPorcentaje || '0';
      // Permite que la transición CSS anime el llenado desde 0 al porcentaje real
      window.requestAnimationFrame(() => {
        barra.style.width = `${Math.min(100, Math.max(0, parseFloat(porcentaje)))}%`;
      });
    }
  }

  /**
   * Emite mensajes accesibles a lectores de pantalla.
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
