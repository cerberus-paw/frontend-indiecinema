/**
 * La validación en línea de los formularios de carga (E4-09.1 y E4-09.3): mientras se escribe, el
 * campo que no cumple muestra su error debajo, y un submit con algo mal no sale.
 *
 * Los mensajes no los inventa el componente ni los pone el navegador: los manda el backend en los
 * atributos data-error-* de cada control, armados con los mismos métodos que usa para rechazar el
 * POST (FormularioDeSala::reglas()). Por eso el texto es el mismo antes y después de mandar, y es
 * el mismo en Firefox, en Chrome y en Safari, que para la misma regla dicen cosas distintas. Si un
 * campo no trae el suyo queda el del navegador, que es mejor que nada.
 *
 * Qué está mal lo decide el navegador, con la API de validación (campo.validity): el componente
 * sólo traduce cada bandera al mensaje que corresponde. Así las reglas viven en los atributos del
 * HTML —required, maxlength, min, max, pattern— que ya salen de las del servidor.
 *
 * El error se dibuja con el marcado de parciales/campo.html.twig: el grupo marcado, el control con
 * aria-invalid y aria-describedby apuntando al span del error, y el span con role="alert". Así el
 * lector de pantalla lo lee junto al campo (E4-09.3) y se ve igual que cuando lo dibuja el
 * servidor.
 *
 * El error de un campo aparece recién cuando se lo deja (blur) o cuando se intenta mandar: avisar
 * en la primera tecla de un campo vacío sería gritarle a alguien que todavía está escribiendo. Una
 * vez que el campo tiene error, sí se revisa en cada tecla, para que se vea apagarse solo.
 *
 * Sin JavaScript el formulario es el de siempre: el navegador valida con los mismos atributos y el
 * servidor vuelve a validar todo, que es lo único que cuenta.
 */
class ValidacionEnLinea {
  /** Bandera de validity => la regla con la que el backend nombra su mensaje. */
  static REGLAS = {
    valueMissing: 'requerido',
    tooLong: 'maximo',
    tooShort: 'minimo',
    rangeOverflow: 'valor-maximo',
    rangeUnderflow: 'valor-minimo',
    patternMismatch: 'patron',
    stepMismatch: 'tipo',
    typeMismatch: 'tipo',
    badInput: 'tipo',
  };

  /**
   * @param {Element|string} pFormulario el formulario, con data-validar-en-linea, o su selector
   */
  constructor(pFormulario) {
    this.formulario = PAW.contenedor(pFormulario);
    if (!(this.formulario instanceof HTMLFormElement)) {
      return;
    }
    // Los mensajes los escribe el componente, no el navegador: así son los del servidor y salen
    // debajo del campo y no en un globo. Acá y no en la plantilla, porque sin JavaScript el que
    // tiene que validar es el navegador.
    this.formulario.noValidate = true;
    this.formulario.addEventListener('submit', (evento) => this.alEnviar(evento));
    // blur no burbujea, así que se escucha en la fase de captura: un solo oyente para todos los
    // campos, incluidos los que aparezcan después.
    this.formulario.addEventListener('blur', (evento) => this.revisar(evento.target), true);
    this.formulario.addEventListener('input', (evento) => this.revisarSiYaFallaba(evento.target));
    this.formulario.addEventListener('change', (evento) => this.revisarSiYaFallaba(evento.target));
  }

  /**
   * No manda si algo está mal: marca todos los campos que fallan, para no ir arreglando de a uno,
   * y lleva el foco al primero, que es desde donde se sigue.
   *
   * @param {SubmitEvent} evento
   */
  alEnviar(evento) {
    const malos = this.controles().filter((campo) => !this.revisar(campo));
    if (malos.length === 0) {
      return;
    }
    evento.preventDefault();
    malos[0].focus();
  }

  /**
   * Revisa un control y muestra o saca su error.
   *
   * @param {Element} campo
   * @returns {boolean} si el campo se puede mandar
   */
  revisar(campo) {
    if (!ValidacionEnLinea.esControl(campo)) {
      return true;
    }
    if (campo.checkValidity()) {
      this.limpiarError(campo);

      return true;
    }
    this.mostrarError(campo, ValidacionEnLinea.mensajeDe(campo));

    return false;
  }

  /**
   * En cada tecla sólo si el campo ya tenía error: así se ve apagarse solo al corregirlo, sin
   * haber avisado antes de tiempo.
   *
   * @param {Element} campo
   */
  revisarSiYaFallaba(campo) {
    if (ValidacionEnLinea.esControl(campo) && campo.getAttribute('aria-invalid') === 'true') {
      this.revisar(campo);
    }
  }

  /**
   * El error debajo del campo, con el marcado de parciales/campo.html.twig. Si el campo ya tiene
   * uno con el mismo texto no se vuelve a dibujar: con role="alert", rehacerlo en cada tecla se lo
   * repetiría al lector de pantalla letra por letra.
   *
   * @param {HTMLElement} campo
   * @param {string} mensaje
   */
  mostrarError(campo, mensaje) {
    const grupo = campo.closest('.grupo-campo');
    if (!grupo) {
      return;
    }
    const id = `error-${campo.name || campo.id}`;
    if (grupo.querySelector('.campo-error')?.textContent.trim().endsWith(mensaje)) {
      return;
    }
    this.limpiarError(campo);
    grupo.classList.add('con-error');
    campo.classList.add('control-invalido');
    campo.setAttribute('aria-invalid', 'true');
    campo.setAttribute('aria-describedby', id);

    const error = PAW.nuevoElemento('span', '', { id, class: 'campo-error', role: 'alert' });
    error.append(PAW.nuevoElemento('span', '⚠️', { class: 'error-icono', 'aria-hidden': 'true' }), ` ${mensaje}`);
    grupo.append(error);
  }

  /**
   * Saca el error del campo y le devuelve el aria-describedby de la ayuda, si tenía: el texto que
   * explica qué se espera sigue valiendo cuando el error se va.
   *
   * @param {HTMLElement} campo
   */
  limpiarError(campo) {
    const grupo = campo.closest('.grupo-campo');
    grupo?.classList.remove('con-error');
    grupo?.querySelector('.campo-error')?.remove();
    campo.classList.remove('control-invalido');
    campo.removeAttribute('aria-invalid');
    const ayuda = grupo?.querySelector('.campo-ayuda');
    if (ayuda?.id) {
      campo.setAttribute('aria-describedby', ayuda.id);
    } else {
      campo.removeAttribute('aria-describedby');
    }
  }

  /**
   * @returns {HTMLElement[]} los controles del formulario que el navegador valida
   */
  controles() {
    return [...this.formulario.elements].filter((campo) => ValidacionEnLinea.esControl(campo));
  }

  /**
   * El mensaje del backend para lo que está mal, o el del navegador si este campo no lo trae.
   *
   * @param {HTMLElement} campo
   * @returns {string}
   */
  static mensajeDe(campo) {
    for (const [bandera, regla] of Object.entries(ValidacionEnLinea.REGLAS)) {
      if (campo.validity[bandera]) {
        const propio = campo.getAttribute(`data-error-${regla}`);
        if (propio !== null) {
          return propio;
        }
      }
    }

    return campo.validationMessage;
  }

  /**
   * Los que tienen validación: un botón o un campo oculto no se revisan, y uno deshabilitado
   * tampoco se manda.
   *
   * @param {*} campo
   * @returns {boolean}
   */
  static esControl(campo) {
    return campo instanceof HTMLElement
      && typeof campo.checkValidity === 'function'
      && campo.willValidate
      && campo.type !== 'hidden';
  }
}
