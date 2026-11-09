/* exported ZonaDeImagen */

/**
 * La zona para arrastrar y soltar una imagen, con vista previa (E4-09.2): la foto de la sala y,
 * cuando exista, el afiche de la obra.
 *
 * No reemplaza al campo de archivo: lo envuelve. El <input type="file"> sigue en la página, se
 * llega con el tabulador y se abre con Enter o con la barra, que es como ya funcionaba; arrastrar
 * es otra manera de hacer lo mismo. Por eso anda con el selector de archivos y con teclado sin un
 * solo atributo ARIA ni una tecla atajada a mano: lo que ya hacía el navegador no se toca.
 *
 * Lo que suelten se revisa contra el accept del campo, que sale de las reglas del backend, y si
 * no va se muestra el mismo mensaje que contestaría el servidor. El archivo entra al campo con un
 * DataTransfer, que es la única forma de llenar un input de archivos desde el JavaScript, así que
 * desde el punto de vista del formulario es idéntico a haberlo elegido a mano.
 *
 * La vista previa sale de URL.createObjectURL, que no sube nada ni lee el archivo entero: apunta
 * al que ya está en la máquina. La anterior se libera antes de pedir otra.
 *
 * Sin JavaScript queda el campo de archivo de siempre, que es lo que el servidor espera igual.
 */
class ZonaDeImagen {
  /** Lo que se dice cuando sueltan algo que no es una imagen y el campo no trae su mensaje. */
  static MENSAJE_DE_TIPO = 'Ese archivo no es una imagen de las que se aceptan.';

  /**
   * @param {Element|string} pCampo el input de archivo, con data-zona-de-imagen, o su selector
   */
  constructor(pCampo) {
    this.campo = PAW.contenedor(pCampo);
    if (!(this.campo instanceof HTMLInputElement) || this.campo.type !== 'file') {
      return;
    }
    this.url = null;
    this.armar();
    this.campo.addEventListener('change', () => this.mostrar());

    for (const evento of ['dragenter', 'dragover']) {
      this.zona.addEventListener(evento, (e) => {
        // Sin los dos preventDefault el navegador abre la imagen en la pestaña.
        e.preventDefault();
        this.zona.classList.add('zona-de-imagen-encima');
      });
    }
    for (const evento of ['dragleave', 'drop']) {
      this.zona.addEventListener(evento, () => this.zona.classList.remove('zona-de-imagen-encima'));
    }
    this.zona.addEventListener('drop', (e) => this.alSoltar(e));
  }

  /**
   * Envuelve el campo en la zona y le agrega la vista previa y el texto. El campo queda adentro,
   * tal cual, para no perder nada de lo que ya hacía.
   */
  armar() {
    this.zona = PAW.nuevoElemento('div', '', { class: 'zona-de-imagen' });
    this.vista = PAW.nuevoElemento('img', '', { class: 'zona-de-imagen-vista', alt: '', hidden: '' });
    this.texto = PAW.nuevoElemento('p', 'Arrastrá la imagen acá, o elegila:', { class: 'zona-de-imagen-texto' });
    // El nombre del archivo elegido, para quien no ve la vista previa.
    this.nombre = PAW.nuevoElemento('p', '', { class: 'zona-de-imagen-nombre', role: 'status' });

    this.campo.replaceWith(this.zona);
    this.zona.append(this.vista, this.texto, this.campo, this.nombre);
  }

  /**
   * @param {DragEvent} evento
   */
  alSoltar(evento) {
    evento.preventDefault();
    const archivo = evento.dataTransfer?.files?.[0];
    if (!archivo) {
      return;
    }
    if (!this.aceptado(archivo)) {
      PAW.errorDeCampo(this.campo, this.campo.getAttribute('data-error-aceptar') ?? ZonaDeImagen.MENSAJE_DE_TIPO);

      return;
    }
    // La única forma de llenar un input de archivos desde el JavaScript.
    const soltados = new DataTransfer();
    soltados.items.add(archivo);
    this.campo.files = soltados.files;
    PAW.limpiarErrorDeCampo(this.campo);
    // change no sale solo cuando el valor se pone por código, y hay quien lo escucha.
    this.campo.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Muestra lo que haya elegido el campo, venga de arrastrarlo o del selector de archivos. */
  mostrar() {
    const archivo = this.campo.files?.[0] ?? null;
    if (this.url !== null) {
      URL.revokeObjectURL(this.url);
      this.url = null;
    }
    if (!archivo) {
      this.vista.hidden = true;
      this.vista.removeAttribute('src');
      this.nombre.textContent = '';

      return;
    }
    this.url = URL.createObjectURL(archivo);
    this.vista.src = this.url;
    this.vista.hidden = false;
    this.nombre.textContent = archivo.name;
  }

  /**
   * Si el tipo entra en el accept del campo, que viene de las reglas del backend. Sin accept no
   * se rechaza nada: el servidor revisa el contenido igual, que es lo que vale.
   *
   * @param {File} archivo
   * @returns {boolean}
   */
  aceptado(archivo) {
    const acepta = (this.campo.getAttribute('accept') ?? '').split(',').map((t) => t.trim()).filter(Boolean);
    if (acepta.length === 0) {
      return true;
    }

    return acepta.some((tipo) => (tipo.endsWith('/*')
      ? archivo.type.startsWith(tipo.slice(0, -1))
      : archivo.type === tipo));
  }
}
