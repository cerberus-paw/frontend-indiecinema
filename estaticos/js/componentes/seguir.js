/* exported Seguir */

/**
 * «Seguir la sala» y «Seguir a quien la organiza», en la ficha de la sala (EF-15.4).
 *
 * La ficha la arma programación, que no sabe si quien la mira ya sigue la sala: el componente se
 * lo pregunta a cuentas (GET /cuenta/seguimientos) y pone el texto que corresponde. Al tocar el
 * botón manda el cambio con fetch y actualiza el texto sin recargar. Sin JavaScript el formulario
 * manda «alternar» y cuentas vuelve a la ficha.
 */
class Seguir {
  static RUTA = '/cuenta/seguimientos';

  /**
   * @param {Element|string} pFormulario el formulario, [data-seguir]
   */
  constructor(pFormulario) {
    this.formulario = PAW.contenedor(pFormulario);
    if (!this.formulario) {
      return;
    }
    this.boton = this.formulario.querySelector('button[type="submit"]');
    this.tipo = this.formulario.elements.tipo.value;
    this.id = this.formulario.elements.id.value;
    this.sigue = false;
    // El aviso de error, uno por botón, fijo abajo de la pantalla.
    this.error = PAW.avisoFlotante('No se pudo guardar. Probá de nuevo.', 'error');
    document.body.append(this.error);

    this.formulario.addEventListener('submit', (evento) => {
      evento.preventDefault();
      this.cambiar();
    });
    this.consultar();
  }

  /**
   * El estado actual. Si cuentas no contesta, queda «Seguir»: el formulario sigue funcionando,
   * porque sin estado conocido el servidor alterna.
   */
  async consultar() {
    try {
      const consulta = new URLSearchParams({ tipo: this.tipo, id: this.id });
      const respuesta = await PAW.enviar(`${Seguir.RUTA}?${consulta}`, { headers: { Accept: 'application/json' } });
      if (respuesta.ok) {
        this.mostrar((await respuesta.json()).sigue === true);
      }
    } catch {
      // Sin red: queda el texto de la plantilla.
    }
  }

  async cambiar() {
    const datos = new FormData(this.formulario);
    datos.set('accion', this.sigue ? 'dejar' : 'seguir');
    this.boton.disabled = true;
    PAW.mostrarAviso(this.error, false);
    try {
      const respuesta = await PAW.enviar(Seguir.RUTA, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: datos,
      });
      if (!respuesta.ok) {
        throw new Error(`cuentas respondió ${respuesta.status}`);
      }
      this.mostrar((await respuesta.json()).sigue === true);
    } catch {
      PAW.mostrarAviso(this.error, true);
    } finally {
      this.boton.disabled = false;
    }
  }

  /**
   * El texto y aria-pressed: el botón es un interruptor, y así el lector de pantalla dice si está
   * activo.
   *
   * @param {boolean} sigue
   */
  mostrar(sigue) {
    this.sigue = sigue;
    this.boton.textContent = sigue ? this.boton.dataset.textoSiguiendo : this.boton.dataset.textoSeguir;
    this.boton.setAttribute('aria-pressed', String(sigue));
    this.boton.classList.toggle('seguir-boton-activo', sigue);
  }
}
