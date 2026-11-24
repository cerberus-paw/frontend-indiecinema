/* exported AutocompletarTitulo */

/**
 * Autocompletado de títulos al pedir una película o cortometraje (EF-22.6 / IC-679).
 *
 * - Mientras el usuario escribe, consulta `/pedidos/nuevo?q=...` (JSON) para actualizar las opciones
 *   del `<datalist>` y mostrar sugerencias interactivas de pedidos abiertos/activos y obras ya
 *   aprobadas en el catálogo.
 * - Si el título escrito coincide al normalizarlo (sin mayúsculas, tildes ni signos o espacios de
 *   más) con uno existente, avisa debajo del campo que al enviarlo podrá sumarse o ver la obra en
 *   el catálogo sin crear otro pedido.
 * - Funciona también sin JavaScript gracias al `<datalist>` precargado por el servidor.
 */
class AutocompletarTitulo {
  /** Milisegundos de espera desde la última tecla antes de pedir sugerencias. */
  static ESPERA = 180;

  /**
   * @param {Element|string} pContenedor el bloque `.autocompletado-titulos` o su selector
   */
  constructor(pContenedor) {
    this.contenedor = PAW.contenedor(pContenedor);
    if (!this.contenedor) {
      return;
    }

    this.url = this.contenedor.getAttribute('data-autocompletar-titulos') || '/pedidos/nuevo';
    this.campoTitulo = this.contenedor.querySelector('input[name="titulo"]');
    this.listaNativa = this.contenedor.querySelector('datalist');
    this.aviso = this.contenedor.querySelector('[data-autocompletado-aviso]');
    if (!(this.campoTitulo instanceof HTMLInputElement)) {
      return;
    }

    this.formulario = this.campoTitulo.form;
    this.temporizador = null;
    this.controlador = null;
    this.lista = this.crearListaDesplegable();

    this.campoTitulo.addEventListener('input', () => this.programarConsulta());
    this.campoTitulo.addEventListener('focus', () => {
      if (this.campoTitulo.value.trim().length >= 2) {
        this.consultar();
      }
    });
    document.addEventListener('click', (evento) => {
      if (!this.contenedor.contains(evento.target)) {
        this.ocultarLista();
      }
    });
  }

  crearListaDesplegable() {
    const lista = PAW.nuevoElemento('ul', '', {
      class: 'autocompletado-sugerencias',
      role: 'listbox',
      'aria-label': 'Títulos sugeridos',
      hidden: '',
    });
    this.contenedor.append(lista);

    return lista;
  }

  programarConsulta() {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => this.consultar(), AutocompletarTitulo.ESPERA);
  }

  async consultar() {
    const consulta = this.campoTitulo.value.trim();
    if (this.controlador) {
      this.controlador.abort();
    }
    this.controlador = new AbortController();

    try {
      const destino = `${this.url}?q=${encodeURIComponent(consulta)}`;
      const respuesta = await fetch(destino, {
        headers: { Accept: 'application/json' },
        signal: this.controlador.signal,
      });
      if (!respuesta.ok) {
        return;
      }
      const datos = await respuesta.json();
      const sugerencias = Array.isArray(datos?.sugerencias) ? datos.sugerencias : [];
      this.actualizarDatalist(sugerencias);
      this.actualizarListaVisible(sugerencias, consulta);
      this.actualizarAviso(sugerencias, consulta);
    } catch (error) {
      if (error?.name !== 'AbortError') {
        this.ocultarLista();
      }
    }
  }

  actualizarDatalist(sugerencias) {
    if (!this.listaNativa) {
      return;
    }
    this.listaNativa.replaceChildren();
    for (const s of sugerencias) {
      const etiqueta = s.tipo === 'obra' ? 'En el catálogo' : 'Ya pedido';
      const textoAnio = s.anio ? ` · ${s.anio}` : '';
      const opcion = PAW.nuevoElemento('option', `${etiqueta}${textoAnio}`, { value: s.titulo });
      this.listaNativa.append(opcion);
    }
  }

  actualizarListaVisible(sugerencias, consulta) {
    if (consulta.length < 2 || sugerencias.length === 0) {
      this.ocultarLista();

      return;
    }
    this.lista.replaceChildren();
    for (const s of sugerencias) {
      const item = PAW.nuevoElemento('li', '', { class: 'autocompletado-item', role: 'option' });
      const boton = PAW.nuevoElemento('button', '', { type: 'button', class: 'autocompletado-boton' });
      const titulo = PAW.nuevoElemento('strong', s.titulo, { class: 'autocompletado-titulo' });
      const detalleTexto = [
        s.tipo === 'obra' ? 'En el catálogo' : `Ya pedido (${s.adhesiones ?? 1})`,
        s.anio ? String(s.anio) : null,
        s.director || null,
      ].filter(Boolean).join(' · ');
      const detalle = PAW.nuevoElemento('span', detalleTexto, { class: 'autocompletado-detalle' });
      boton.append(titulo, detalle);
      boton.addEventListener('click', () => this.elegir(s));
      item.append(boton);
      this.lista.append(item);
    }
    this.lista.hidden = false;
  }

  elegir(sugerencia) {
    this.campoTitulo.value = sugerencia.titulo;
    if (this.formulario) {
      const anio = this.formulario.querySelector('input[name="anio"]');
      const director = this.formulario.querySelector('input[name="director"]');
      if (anio instanceof HTMLInputElement && anio.value.trim() === '' && sugerencia.anio) {
        anio.value = String(sugerencia.anio);
      }
      if (director instanceof HTMLInputElement && director.value.trim() === '' && sugerencia.director) {
        director.value = sugerencia.director;
      }
    }
    this.ocultarLista();
    this.actualizarAviso([sugerencia], sugerencia.titulo);
  }

  actualizarAviso(sugerencias, consulta) {
    if (!this.aviso) {
      return;
    }
    const normalizado = AutocompletarTitulo.normalizar(consulta);
    const exacta = normalizado === ''
      ? null
      : sugerencias.find((s) => (s.normalizado || AutocompletarTitulo.normalizar(s.titulo)) === normalizado);
    if (!exacta) {
      this.aviso.textContent = '';
      this.aviso.hidden = true;

      return;
    }
    if (exacta.tipo === 'obra') {
      this.aviso.textContent = `«${exacta.titulo}» ya está en el catálogo de IndieCinema. Al enviar te mostramos el enlace directo a su ficha.`;
    } else {
      this.aviso.textContent = `Ya existe un pedido para «${exacta.titulo}». Podés enviar el formulario para sumarte sin crear uno repetido.`;
    }
    this.aviso.hidden = false;
  }

  ocultarLista() {
    this.lista.hidden = true;
    this.lista.replaceChildren();
  }

  static normalizar(texto) {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  }
}
