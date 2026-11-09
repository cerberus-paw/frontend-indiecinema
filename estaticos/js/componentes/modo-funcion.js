/* exported ModoFuncion */

/**
 * Alterna el modo del formulario de alta de función entre «Función programada» y «Abrir a votación
 * de títulos» (E3-12.1 / IC-147).
 *
 * Al elegir «Abrir a votación»:
 * - Oculta y deshabilita la sección de fecha y horario (la fecha y hora no son obligatorias).
 * - Ajusta los textos de subtítulo y ayuda de las obras para indicar que serán candidatas.
 * - Modifica el banner informativo para reflejar la apertura de la votación de títulos.
 * - Cambia la etiqueta del botón de envío a «Abrir a votación».
 * - No deja mandar una votación con menos candidatas que el mínimo (F-01.6): con una sola no hay
 *   nada que votar. El mínimo y el mensaje los da el servidor en el fieldset de las obras, y el
 *   error sale donde lo dibuja él. La validación en línea no mira las casillas, por eso va acá.
 *
 * Sin JavaScript, ambos bloques permanecen accesibles en el documento (mejora progresiva).
 */
class ModoFuncion {
  /** Textos contextuales según el modo seleccionado */
  static TEXTOS = {
    programada: {
      obrasSubtitulo: 'Elegí la obra o los títulos a proyectar en la función.',
      obrasAyuda: 'Marcá al menos una obra del catálogo para esta función.',
      avisoTitulo: 'Publicación directa',
      boton: 'Programar función',
    },
    en_votacion_titulos: {
      obrasSubtitulo: 'Elegí las obras candidatas que participarán de la votación.',
      obrasAyuda: 'Marcá al menos dos obras del catálogo: serán las candidatas de la votación.',
      avisoTitulo: 'Apertura de votación',
      boton: 'Abrir a votación',
    },
  };

  /**
   * @param {Element|string} pFormulario el <form> de alta de función, o su selector
   */
  constructor(pFormulario) {
    this.formulario = PAW.contenedor(pFormulario);
    if (!this.formulario) {
      return;
    }

    this.radios = this.formulario.querySelectorAll('input[name="modo"]');
    if (this.radios.length === 0) {
      return;
    }

    this.seccionFechaHora = this.formulario.querySelector('[data-seccion-fecha-hora]');
    this.campoFecha = this.formulario.querySelector('input[name="fecha"]');
    this.campoHora = this.formulario.querySelector('input[name="hora"]');
    this.subtituloObras = this.formulario.querySelector('[data-obras-subtitulo]');
    this.ayudaObras = this.formulario.querySelector('[data-obras-ayuda]');
    this.avisoTitulo = this.formulario.querySelector('[data-aviso-titulo]');
    this.avisoTexto = this.formulario.querySelector('[data-aviso-texto]');
    this.botonSubmit = this.formulario.querySelector('#boton-enviar-funcion')
      || this.formulario.querySelector('button[type="submit"]');

    this.obras = this.formulario.querySelector('#obras');

    for (const radio of this.radios) {
      radio.addEventListener('change', () => {
        this.cambiarModo(radio.value);
        this.limpiarErrorDeCandidatas();
      });
    }
    this.formulario.addEventListener('submit', (evento) => this.alEnviar(evento));
    // El error se va apenas alcanza el mínimo, sin esperar a mandar de nuevo.
    this.obras?.addEventListener('change', () => {
      if (this.faltanCandidatas() === false) {
        this.limpiarErrorDeCandidatas();
      }
    });

    const inicial = this.formulario.querySelector('input[name="modo"]:checked')?.value || 'programada';
    this.cambiarModo(inicial);
  }

  /**
   * @returns {boolean|null} si es una votación con menos candidatas que el mínimo; null si no es
   *   una votación o la página no trae las obras
   */
  faltanCandidatas() {
    const votacion = this.formulario.querySelector('input[name="modo"]:checked')?.value === 'en_votacion_titulos';
    if (!votacion || !this.obras) {
      return null;
    }
    const minimo = Number.parseInt(this.obras.dataset.candidatasMinimas ?? '2', 10);

    return this.obras.querySelectorAll('input[name="obras[]"]:checked').length < minimo;
  }

  /**
   * @param {SubmitEvent} evento
   */
  alEnviar(evento) {
    if (!this.faltanCandidatas()) {
      return;
    }
    evento.preventDefault();
    this.mostrarErrorDeCandidatas(this.obras.dataset.errorCandidatas ?? '');
  }

  /**
   * El error debajo de las obras, con el marcado con que lo dibuja el servidor (alta_funcion.html.twig):
   * el span #error-obras con role="alert", cada casilla con aria-invalid apuntándolo, y sin la
   * ayuda, que el servidor también saca. El foco va a la primera casilla, desde donde se arregla.
   *
   * @param {string} mensaje
   */
  mostrarErrorDeCandidatas(mensaje) {
    this.limpiarErrorDeCandidatas();
    const casillas = this.obras.querySelectorAll('input[name="obras[]"]');
    for (const casilla of casillas) {
      casilla.setAttribute('aria-invalid', 'true');
      casilla.setAttribute('aria-describedby', 'error-obras');
    }
    const error = PAW.nuevoElemento('span', '', { id: 'error-obras', class: 'campo-error', role: 'alert' });
    error.append(PAW.nuevoElemento('span', '⚠️', { class: 'error-icono', 'aria-hidden': 'true' }), ` ${mensaje}`);
    if (this.ayudaObras) {
      this.ayudaObras.hidden = true;
      this.ayudaObras.before(error);
    } else {
      this.obras.append(error);
    }
    casillas[0]?.focus();
  }

  limpiarErrorDeCandidatas() {
    if (!this.obras) {
      return;
    }
    this.obras.querySelector('#error-obras')?.remove();
    for (const casilla of this.obras.querySelectorAll('input[name="obras[]"]')) {
      casilla.removeAttribute('aria-invalid');
      casilla.removeAttribute('aria-describedby');
    }
    if (this.ayudaObras) {
      this.ayudaObras.hidden = false;
    }
  }

  /**
   * @param {string} modo 'programada' | 'en_votacion_titulos'
   */
  cambiarModo(modo) {
    const esVotacion = modo === 'en_votacion_titulos';
    const textos = esVotacion ? ModoFuncion.TEXTOS.en_votacion_titulos : ModoFuncion.TEXTOS.programada;

    // Resaltado visual en las tarjetas de opción
    for (const radio of this.radios) {
      const tarjeta = radio.closest('.opcion-modo-funcion');
      if (tarjeta) {
        tarjeta.classList.toggle('seleccionada', radio.checked);
      }
    }

    // Ocultar/mostrar y deshabilitar/habilitar fecha y horario
    if (this.seccionFechaHora) {
      this.seccionFechaHora.hidden = esVotacion;
    }
    if (this.campoFecha) {
      this.campoFecha.disabled = esVotacion;
      this.campoFecha.required = !esVotacion;
    }
    if (this.campoHora) {
      this.campoHora.disabled = esVotacion;
      this.campoHora.required = !esVotacion;
    }

    // Subtítulo y ayuda de la selección de obras
    if (this.subtituloObras) {
      this.subtituloObras.textContent = textos.obrasSubtitulo;
    }
    if (this.ayudaObras) {
      this.ayudaObras.textContent = textos.obrasAyuda;
    }

    // Banner informativo (sin innerHTML para evitar riesgos de inyección)
    if (this.avisoTitulo) {
      this.avisoTitulo.textContent = textos.avisoTitulo;
    }
    if (this.avisoTexto) {
      if (esVotacion) {
        this.avisoTexto.replaceChildren(
          'Al guardar la función, quedará en estado ',
          PAW.nuevoElemento('strong', 'en votación de títulos'),
          ' con las obras seleccionadas como candidatas. La fecha y horario se definirán al finalizar la votación.',
        );
      } else {
        this.avisoTexto.replaceChildren(
          'Al guardar la función, quedará en estado ',
          PAW.nuevoElemento('strong', 'programada'),
          ' y aparecerá disponible inmediatamente en la cartelera para reservas.',
        );
      }
    }

    // Botón de envío
    if (this.botonSubmit) {
      const textoBoton = this.botonSubmit.querySelector('.boton-texto');
      if (textoBoton) {
        textoBoton.textContent = textos.boton;
      } else {
        this.botonSubmit.textContent = textos.boton;
      }
    }
  }
}
