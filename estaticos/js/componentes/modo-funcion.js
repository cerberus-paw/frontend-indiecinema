/**
 * Alterna el modo del formulario de alta de función entre «Función programada» y «Abrir a votación
 * de títulos» (E3-12.1 / IC-147).
 *
 * Al elegir «Abrir a votación»:
 * - Oculta y deshabilita la sección de fecha y horario (la fecha y hora no son obligatorias).
 * - Ajusta los textos de subtítulo y ayuda de las obras para indicar que serán candidatas.
 * - Modifica el banner informativo para reflejar la apertura de la votación de títulos.
 * - Cambia la etiqueta del botón de envío a «Abrir a votación».
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
      obrasAyuda: 'Marcá las obras del catálogo que serán candidatas para la votación.',
      avisoTitulo: 'Apertura de votación',
      boton: 'Abrir a votación',
    },
    en_acuerdo_fecha: {
      obrasSubtitulo: 'Elegí la obra o películas a proyectar en la fecha acordada con el público.',
      obrasAyuda: 'Marcá al menos una obra del catálogo para someter sus franjas a votación.',
      avisoTitulo: 'Acuerdo de fecha con espectadores',
      boton: 'Abrir acuerdo de fecha',
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
    this.seccionAcuerdoAlta = this.formulario.querySelector('[data-seccion-acuerdo-alta]');
    this.campoFecha = this.formulario.querySelector('input[name="fecha"]');
    this.campoHora = this.formulario.querySelector('input[name="hora"]');
    this.subtituloObras = this.formulario.querySelector('[data-obras-subtitulo]');
    this.ayudaObras = this.formulario.querySelector('[data-obras-ayuda]');
    this.avisoTitulo = this.formulario.querySelector('[data-aviso-titulo]');
    this.avisoTexto = this.formulario.querySelector('[data-aviso-texto]');
    this.botonSubmit = this.formulario.querySelector('#boton-enviar-funcion')
      || this.formulario.querySelector('button[type="submit"]');

    for (const radio of this.radios) {
      radio.addEventListener('change', () => this.cambiarModo(radio.value));
    }

    const inicial = this.formulario.querySelector('input[name="modo"]:checked')?.value || 'programada';
    this.cambiarModo(inicial);
  }

  /**
   * @param {string} modo 'programada' | 'en_votacion_titulos' | 'en_acuerdo_fecha'
   */
  cambiarModo(modo) {
    const esVotacion = modo === 'en_votacion_titulos';
    const esAcuerdo = modo === 'en_acuerdo_fecha';
    const textos = ModoFuncion.TEXTOS[modo] || ModoFuncion.TEXTOS.programada;

    // Resaltado visual en las tarjetas de opción
    for (const radio of this.radios) {
      const tarjeta = radio.closest('.opcion-modo-funcion');
      if (tarjeta) {
        tarjeta.classList.toggle('seleccionada', radio.checked);
      }
    }

    // Ocultar/mostrar y deshabilitar/habilitar fecha y horario fijo
    const requiereFechaFija = modo === 'programada';
    if (this.seccionFechaHora) {
      this.seccionFechaHora.hidden = !requiereFechaFija;
    }
    if (this.campoFecha) {
      this.campoFecha.disabled = !requiereFechaFija;
      this.campoFecha.required = requiereFechaFija;
    }
    if (this.campoHora) {
      this.campoHora.disabled = !requiereFechaFija;
      this.campoHora.required = requiereFechaFija;
    }

    // Ocultar/mostrar sección de acuerdo en alta si existe
    if (this.seccionAcuerdoAlta) {
      this.seccionAcuerdoAlta.hidden = !esAcuerdo;
      const camposAcuerdo = this.seccionAcuerdoAlta.querySelectorAll('input');
      for (const campo of camposAcuerdo) {
        campo.disabled = !esAcuerdo;
      }
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
      } else if (esAcuerdo) {
        this.avisoTexto.replaceChildren(
          'Al guardar la función, quedará en estado ',
          PAW.nuevoElemento('strong', 'en acuerdo de fecha'),
          ' con las alternativas horarias propuestas. Los espectadores podrán votar qué franja les sirve y, al alcanzar el quórum, podrás programarla con la fecha ganadora.',
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
