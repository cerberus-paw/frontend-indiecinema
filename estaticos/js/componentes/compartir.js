/**
 * «Compartir», en la cabecera de la ficha de la función, como en los wireframes (E3-13.F10).
 *
 * Con el menú de compartir del sistema si el navegador lo tiene (en el celular); si no, copia
 * el enlace y lo dice en el mismo botón. Sin JavaScript el botón no puede hacer nada, así que
 * la plantilla lo deja oculto y se muestra recién acá.
 */
class Compartir {
  /** Cuánto queda escrito «Enlace copiado» antes de volver a «Compartir». */
  static DEMORA_MS = 2500;

  /**
   * @param {Element|string} pBoton el botón, [data-compartir]
   */
  constructor(pBoton) {
    this.boton = PAW.contenedor(pBoton);
    if (!this.boton || (!navigator.share && !navigator.clipboard)) {
      return;
    }

    this.texto = this.boton.textContent;
    this.boton.hidden = false;
    this.boton.addEventListener('click', () => this.compartir());
  }

  async compartir() {
    const datos = { title: document.title, url: window.location.href };
    if (navigator.share) {
      try {
        await navigator.share(datos);
      } catch {
        // Cerró el menú sin elegir nada: no hay nada que avisar.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(datos.url);
      this.avisar('Enlace copiado');
    } catch {
      this.avisar('No se pudo copiar');
    }
  }

  /**
   * Lo dice en el botón un rato. aria-live hace que el lector de pantalla también lo lea.
   *
   * @param {string} texto
   */
  avisar(texto) {
    this.boton.setAttribute('aria-live', 'polite');
    this.boton.textContent = texto;
    window.setTimeout(() => {
      this.boton.textContent = this.texto;
    }, Compartir.DEMORA_MS);
  }
}
