/**
 * Componente interactivo y accesible para que el organizador proponga y administre
 * franjas horarias y el mínimo de asistentes requeridos (IC-154 / E3-13.2).
 *
 * - Permite agregar dinámicamente nuevas alternativas de fecha y horario.
 * - Permite eliminar franjas existentes manteniendo al menos el mínimo requerido.
 * - Reenumera índices y etiquetas accesibles («Opción 1», «Opción 2») para coherencia del payload POST.
 * - Valida en tiempo real que las fechas sean presentes/futuras y que la hora de fin sea posterior a la de inicio.
 * - Sincroniza la previsualización del quórum mínimo contra el cupo de la sala.
 * - Notifica dinámicamente a lectores de pantalla mediante regiones aria-live.
 */
class GestorFranjas {
  /**
   * @param {Element|string} pContenedor Formulario o contenedor con [data-gestor-franjas]
   */
  constructor(pContenedor) {
    this.contenedor = PAW.contenedor(pContenedor);
    if (!this.contenedor) {
      return;
    }

    this.lista = this.contenedor.querySelector('[data-contenedor-franjas]');
    this.botonAgregar = this.contenedor.querySelector('[data-agregar-franja]');
    this.plantilla = document.querySelector('#plantilla-fila-franja');
    this.anunciador = this.contenedor.querySelector('[data-anuncio-franjas]');
    this.campoMinimo = this.contenedor.querySelector('input[name="minimo_asistentes"]');
    this.previewQuorum = this.contenedor.querySelectorAll('[data-quorom-preview]');
    this.cupoMaximo = parseInt(this.contenedor.dataset.cupoMaximo || '500', 10);

    this.iniciarEventos();
    this.aplicarRestriccionFechas();
    this.vincularFilasExistentes();
    this.actualizarEstadosBotones();
  }

  /**
   * Inicializa escuchas de eventos principales.
   */
  iniciarEventos() {
    if (this.botonAgregar) {
      this.botonAgregar.addEventListener('click', () => this.agregarFranja());
    }

    if (this.campoMinimo) {
      this.campoMinimo.addEventListener('input', () => {
        const valor = this.campoMinimo.value || '0';
        for (const el of this.previewQuorum) {
          el.textContent = valor;
        }
      });
    }

    // Validación preventiva al enviar el formulario
    this.contenedor.addEventListener('submit', (evento) => this.validarFormulario(evento));
  }

  /**
   * Establece el atributo min en todos los campos de fecha a la fecha actual (YYYY-MM-DD).
   */
  aplicarRestriccionFechas() {
    const hoy = new Date().toISOString().split('T')[0];
    const camposFecha = this.contenedor.querySelectorAll('[data-campo-fecha]');
    for (const campo of camposFecha) {
      if (!campo.getAttribute('min')) {
        campo.setAttribute('min', hoy);
      }
    }
  }

  /**
   * Vincula validaciones y eliminación a las filas ya presentes en el DOM inicial.
   */
  vincularFilasExistentes() {
    const filas = this.obtenerFilas();
    filas.forEach((fila, indice) => this.vincularFila(fila, indice));
  }

  /**
   * Devuelve la lista actual de filas de franjas horarias.
   *
   * @returns {HTMLElement[]}
   */
  obtenerFilas() {
    return Array.from(this.lista ? this.lista.querySelectorAll('.fila-franja-horaria') : []);
  }

  /**
   * Vincula los eventos de eliminación y validación de rango horario a una fila.
   *
   * @param {HTMLElement} fila
   * @param {number} indice
   */
  vincularFila(fila, indice) {
    const botonEliminar = fila.querySelector('[data-eliminar-franja]');
    if (botonEliminar) {
      botonEliminar.onclick = () => this.eliminarFranja(fila);
    }

    const campoInicio = fila.querySelector('[data-campo-inicio]');
    const campoFin = fila.querySelector('[data-campo-fin]');
    const campoFecha = fila.querySelector('[data-campo-fecha]');

    const validarHorarios = () => this.validarRangoHorario(fila, campoInicio, campoFin);

    if (campoInicio) {
      campoInicio.addEventListener('change', validarHorarios);
      campoInicio.addEventListener('input', validarHorarios);
    }
    if (campoFin) {
      campoFin.addEventListener('change', validarHorarios);
      campoFin.addEventListener('input', validarHorarios);
    }
    if (campoFecha) {
      const hoy = new Date().toISOString().split('T')[0];
      if (!campoFecha.getAttribute('min')) {
        campoFecha.setAttribute('min', hoy);
      }
    }
  }

  /**
   * Valida que la hora de fin sea estrictamente mayor a la hora de inicio.
   *
   * @param {HTMLElement} fila
   * @param {HTMLInputElement} campoInicio
   * @param {HTMLInputElement} campoFin
   * @returns {boolean}
   */
  validarRangoHorario(fila, campoInicio, campoFin) {
    const alerta = fila.querySelector('[data-error-rango]');
    if (!campoInicio || !campoFin) {
      return true;
    }

    const valInicio = campoInicio.value;
    const valFin = campoFin.value;

    if (!valInicio || !valFin) {
      if (alerta) {
        alerta.hidden = true;
      }
      campoFin.removeAttribute('aria-invalid');
      return true;
    }

    // Compara cadenas HH:MM
    const esValido = valFin > valInicio;
    if (alerta) {
      alerta.hidden = esValido;
    }
    if (!esValido) {
      campoFin.setAttribute('aria-invalid', 'true');
    } else {
      campoFin.removeAttribute('aria-invalid');
    }

    return esValido;
  }

  /**
   * Agrega dinámicamente una nueva franja horaria clonando la plantilla HTML.
   */
  agregarFranja() {
    if (!this.lista || !this.plantilla) {
      return;
    }

    const filasActuales = this.obtenerFilas();
    if (filasActuales.length >= 6) {
      this.anunciar('Límite alcanzado: podés proponer hasta 6 franjas horarias.');
      return;
    }

    const nuevoIndice = filasActuales.length;
    const nuevoNumero = nuevoIndice + 1;

    let html = this.plantilla.innerHTML;
    html = html.replace(/__INDICE__/g, String(nuevoIndice));
    html = html.replace(/__NUMERO__/g, String(nuevoNumero));

    const tempWrapper = document.createElement('div');
    tempWrapper.innerHTML = html.trim();
    const nuevaFila = tempWrapper.firstElementChild;

    if (nuevaFila) {
      this.lista.appendChild(nuevaFila);
      this.vincularFila(nuevaFila, nuevoIndice);
      this.aplicarRestriccionFechas();
      this.actualizarIndicesYEtiquetas();
      this.actualizarEstadosBotones();

      // Enfoque accesible al campo de fecha de la nueva franja
      const inputFecha = nuevaFila.querySelector('[data-campo-fecha]');
      if (inputFecha) {
        inputFecha.focus();
      }

      this.anunciar(`Opción ${nuevoNumero} agregada a la lista de franjas horarias.`);
    }
  }

  /**
   * Elimina una franja horaria de la lista y actualiza correlatividad.
   *
   * @param {HTMLElement} fila
   */
  eliminarFranja(fila) {
    const filas = this.obtenerFilas();
    if (filas.length <= 1) {
      this.anunciar('No se puede eliminar: debe existir al menos una franja horaria propuesta.');
      return;
    }

    fila.remove();
    this.actualizarIndicesYEtiquetas();
    this.actualizarEstadosBotones();

    const restantes = this.obtenerFilas().length;
    this.anunciar(`Opción eliminada. Quedan ${restantes} ${restantes === 1 ? 'opción' : 'opciones'} propuestas.`);

    if (this.botonAgregar) {
      this.botonAgregar.focus();
    }
  }

  /**
   * Reenumera todas las filas para que los inputs mantengan nombres correlativos
   * y las etiquetas digan «Opción 1», «Opción 2», etc.
   */
  actualizarIndicesYEtiquetas() {
    const filas = this.obtenerFilas();
    filas.forEach((fila, idx) => {
      fila.dataset.indiceFranja = String(idx);

      const etiqueta = fila.querySelector('[data-etiqueta-franja]');
      if (etiqueta) {
        etiqueta.textContent = `Opción ${idx + 1}`;
      }

      const botonEliminar = fila.querySelector('[data-eliminar-franja]');
      if (botonEliminar) {
        botonEliminar.setAttribute('aria-label', `Eliminar opción ${idx + 1}`);
      }

      const inputs = fila.querySelectorAll('input');
      for (const input of inputs) {
        const nombreOriginal = input.getAttribute('name') || '';
        // Reemplaza franjas[...][campo] por franjas[idx][campo]
        const nuevoNombre = nombreOriginal.replace(/franjas\[\d+\]/, `franjas[${idx}]`);
        input.setAttribute('name', nuevoNombre);

        const idOriginal = input.getAttribute('id') || '';
        const nuevoId = idOriginal.replace(/-\d+$/, `-${idx}`);
        input.setAttribute('id', nuevoId);

        const label = fila.querySelector(`label[for="${idOriginal}"]`);
        if (label) {
          label.setAttribute('for', nuevoId);
        }
      }
    });
  }

  /**
   * Habilita o deshabilita los botones de eliminar según la cantidad mínima de opciones.
   */
  actualizarEstadosBotones() {
    const filas = this.obtenerFilas();
    const soloUna = filas.length <= 1;

    for (const fila of filas) {
      const botonEliminar = fila.querySelector('[data-eliminar-franja]');
      if (botonEliminar) {
        botonEliminar.disabled = soloUna;
        if (soloUna) {
          botonEliminar.setAttribute('title', 'Debe haber al menos una franja horaria propuesta');
        } else {
          botonEliminar.removeAttribute('title');
        }
      }
    }

    if (this.botonAgregar) {
      this.botonAgregar.disabled = filas.length >= 6;
    }
  }

  /**
   * Valida integralmente el formulario antes de enviarlo.
   *
   * @param {Event} evento
   */
  validarFormulario(evento) {
    const filas = this.obtenerFilas();
    let hayErrores = false;

    for (const fila of filas) {
      const campoInicio = fila.querySelector('[data-campo-inicio]');
      const campoFin = fila.querySelector('[data-campo-fin]');
      if (!this.validarRangoHorario(fila, campoInicio, campoFin)) {
        hayErrores = true;
      }
    }

    if (this.campoMinimo) {
      const minimo = parseInt(this.campoMinimo.value || '0', 10);
      if (minimo < 1 || minimo > this.cupoMaximo) {
        hayErrores = true;
        this.campoMinimo.setAttribute('aria-invalid', 'true');
        this.campoMinimo.focus();
      }
    }

    if (hayErrores) {
      evento.preventDefault();
      this.anunciar('Hay errores en las franjas horarias o en el mínimo de asistentes. Revisá los campos marcados.');
      return;
    }

    // Previene doble clic deshabilitando el botón de submit
    const botonSubmit = this.contenedor.querySelector('button[type="submit"]');
    if (botonSubmit) {
      botonSubmit.classList.add('cargando');
      botonSubmit.setAttribute('aria-busy', 'true');
    }
  }

  /**
   * Emite un mensaje sonoro y accesible en la región viva aria-live.
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
