/**
 * Carrusel propio, sin librerías (E4-07, el punto 1 del TP4): convierte la lista de un contenedor
 * en diapositivas, de a una por vez.
 *
 * Recibe sólo el contenedor, como pide el enunciado; lo demás sale del HTML:
 *   - cada <li> de la primera lista del contenedor es una diapositiva;
 *   - el aria-label del contenedor nombra al carrusel para los lectores de pantalla;
 *   - data-transicion="fundido|deslizar|zoom" elige la transición (por defecto, fundido);
 *   - data-intervalo="6000" dice cada cuántos milisegundos pasa solo (por defecto, 6 s).
 *
 * Se pasa con las flechas de los costados, con las miniaturas de abajo, deslizando el dedo (o el
 * mouse) y, con el foco adentro, con las flechas del teclado (Inicio y Fin van a la primera y a la
 * última).
 *
 * Mientras se descargan las imágenes, una barra muestra el avance; al llegar al 100 % arranca el
 * pase automático (el enunciado del TP4). Se pausa con su botón, y también mientras el mouse o el
 * foco están sobre el carrusel o la pestaña no se ve: nadie se pierde lo que estaba leyendo.
 *
 * Cada transición es una clase de CSS en el contenedor (carrusel-fundido, carrusel-deslizar,
 * carrusel-zoom): cambiar de transición es cambiar esa clase, a mano o con la propiedad
 * transicion. El JavaScript sólo marca qué diapositiva entra, cuál sale y hacia qué lado.
 *
 * Las diapositivas vienen en el HTML y el JavaScript sólo las reacomoda: sin él (o si no carga),
 * la lista se ve como una tira que se desplaza de costado y ninguna queda escondida.
 */
class Carrusel {
  /** Las transiciones que hay en el CSS, con la primera por defecto. */
  static TRANSICIONES = ['fundido', 'deslizar', 'zoom'];

  /** Cada cuánto pasa solo, si el contenedor no dice otra cosa. */
  static INTERVALO = 6000;

  /** Para los id de la barra de carga, si hay más de un carrusel en la página. */
  static cantidad = 0;

  /** Cuánto hay que arrastrar de costado para que cuente como deslizar y no como un toque. */
  static UMBRAL_SWIPE = 50;

  /**
   * @param {Element|string} pContenedor el contenedor de la lista, o su selector
   */
  constructor(pContenedor) {
    this.contenedor = PAW.contenedor(pContenedor);
    // Un contenedor que no está no rompe la página: los demás componentes siguen andando.
    if (!this.contenedor) {
      console.warn('Carrusel: no se encontró el contenedor; no se arma nada.', pContenedor);
      return;
    }
    this.lista = this.contenedor.querySelector('ul, ol');
    this.diapositivas = this.lista ? [...this.lista.children].filter((hijo) => hijo.matches('li')) : [];
    if (this.diapositivas.length === 0) {
      console.warn('Carrusel: el contenedor no tiene una lista con diapositivas; no se arma nada.', this.contenedor);
      return;
    }
    this.actual = 0;
    this.id = `carrusel-${++Carrusel.cantidad}`;
    this.intervalo = Number(this.contenedor.dataset.intervalo) || Carrusel.INTERVALO;
    this.cargado = false;
    this.temporizador = null;
    // Por qué está pausado ahora: el pase automático corre sólo si no hay ningún motivo.
    this.pausas = new Set();

    this.armar();
    this.escuchar();
    this.mostrar(0);
    this.transicion = this.contenedor.dataset.transicion;
    this.esperarCarga();
  }

  /** La transición en uso. */
  get transicion() {
    return Carrusel.TRANSICIONES.find((nombre) => this.contenedor.classList.contains(`carrusel-${nombre}`)) ?? null;
  }

  /**
   * Cambia la transición: deja en el contenedor sólo la clase de la elegida. Con un nombre que no
   * existe, avisa y usa la primera.
   *
   * @param {string|undefined} nombre
   */
  set transicion(nombre) {
    let elegida = nombre ?? Carrusel.TRANSICIONES[0];
    if (!Carrusel.TRANSICIONES.includes(elegida)) {
      console.warn(`Carrusel: no hay una transición «${elegida}»; se usa «${Carrusel.TRANSICIONES[0]}».`);
      elegida = Carrusel.TRANSICIONES[0];
    }
    for (const t of Carrusel.TRANSICIONES) {
      this.contenedor.classList.toggle(`carrusel-${t}`, t === elegida);
    }
  }

  /** Cuántas diapositivas hay. */
  get total() {
    return this.diapositivas.length;
  }

  /**
   * La estructura: la pantalla con la lista y las flechas, y un aviso para los lectores de
   * pantalla. La lista es la misma del HTML, no una copia.
   */
  armar() {
    const c = this.contenedor;
    c.classList.add('carrusel-armado');
    c.setAttribute('role', 'region');
    c.setAttribute('aria-roledescription', 'carrusel');

    this.pantalla = PAW.nuevoElemento('div', '', { class: 'carrusel-pantalla' });
    this.lista.before(this.pantalla);
    this.pantalla.append(this.lista);
    this.diapositivas.forEach((diapositiva, i) => {
      diapositiva.setAttribute('role', 'group');
      diapositiva.setAttribute('aria-roledescription', 'diapositiva');
      diapositiva.setAttribute('aria-label', `${i + 1} de ${this.total}`);
    });

    // Con una sola no hay a dónde pasar: no se ponen flechas que no hacen nada.
    if (this.total > 1) {
      this.botonAnterior = Carrusel.boton('carrusel-flecha carrusel-flecha-anterior', 'Diapositiva anterior', '‹');
      this.botonSiguiente = Carrusel.boton('carrusel-flecha carrusel-flecha-siguiente', 'Diapositiva siguiente', '›');
      this.pantalla.append(this.botonAnterior, this.botonSiguiente);
    }

    // La barra de carga tapa la diapositiva hasta llegar al 100 %.
    this.carga = PAW.nuevoElemento('div', '', { class: 'carrusel-carga' });
    this.porcentaje = PAW.nuevoElemento('label', 'Cargando imágenes: 0 %', { class: 'carrusel-carga-texto', for: `${this.id}-carga` });
    this.barra = PAW.nuevoElemento('progress', '', { class: 'carrusel-carga-barra', id: `${this.id}-carga`, max: '100', value: '0' });
    this.carga.append(this.porcentaje, this.barra);
    this.pantalla.append(this.carga);

    // Debajo, los controles: las miniaturas y el botón de pausa.
    this.controles = PAW.nuevoElemento('div', '', { class: 'carrusel-controles' });
    this.botonesMiniatura = [];
    if (this.total > 1) {
      const miniaturas = PAW.nuevoElemento('ol', '', { class: 'carrusel-miniaturas' });
      this.botonesMiniatura = this.diapositivas.map((diapositiva, i) => {
        const boton = Carrusel.boton('carrusel-miniatura', `Ver ${this.nombre(i)}`);
        // La misma imagen de la diapositiva: el navegador no la vuelve a descargar.
        const imagen = diapositiva.querySelector('img:not([alt=""])') ?? diapositiva.querySelector('img');
        if (imagen) {
          boton.append(PAW.nuevoElemento('img', '', { src: imagen.currentSrc || imagen.src, alt: '', draggable: 'false' }));
        } else {
          boton.textContent = String(i + 1);
        }
        const item = PAW.nuevoElemento('li');
        item.append(boton);
        miniaturas.append(item);

        return boton;
      });
      this.botonPausa = Carrusel.boton('carrusel-pausa', 'Pausar el pase automático', '❚❚');
      this.controles.append(miniaturas, this.botonPausa);
    }
    c.append(this.controles);

    // Avisa la diapositiva nueva cuando la elige el usuario, no en cada pase automático.
    this.aviso = PAW.nuevoElemento('p', '', { class: 'sr-only', 'aria-live': 'polite' });
    c.append(this.aviso);
  }

  escuchar() {
    const c = this.contenedor;
    this.botonAnterior?.addEventListener('click', () => this.anterior(true));
    this.botonSiguiente?.addEventListener('click', () => this.siguiente(true));
    this.botonPausa?.addEventListener('click', () => this.alternarPausa());
    this.botonesMiniatura.forEach((boton, i) => boton.addEventListener('click', () => this.ir(i, true)));

    c.addEventListener('keydown', (e) => {
      const teclas = {
        ArrowRight: () => this.siguiente(true),
        ArrowLeft: () => this.anterior(true),
        Home: () => this.ir(0, true),
        End: () => this.ir(this.total - 1, true),
      };
      if (!(e.key in teclas) || e.altKey || e.ctrlKey || e.metaKey) {
        return;
      }
      // Las flechas ya no desplazan la página mientras el foco está en el carrusel.
      e.preventDefault();
      teclas[e.key]();
    });
    this.escucharSwipe();

    // Mientras alguien lo mira o lo usa, no cambia solo. Sólo el mouse: en el celular no hay
    // «encima», y un toque dejaría la pausa pegada.
    c.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') {
        this.pausar('puntero');
      }
    });
    c.addEventListener('pointerleave', (e) => {
      if (e.pointerType === 'mouse') {
        this.reanudar('puntero');
      }
    });
    // Sólo el foco del teclado: un clic o un toque en una flecha también le da el foco al botón,
    // y la pausa quedaría pegada hasta hacer clic afuera.
    c.addEventListener('focusin', (e) => {
      if (e.target.matches(':focus-visible')) {
        this.pausar('foco');
      }
    });
    c.addEventListener('focusout', (e) => {
      if (!c.contains(e.relatedTarget)) {
        this.reanudar('foco');
      }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.pausar('oculta');
      } else {
        this.reanudar('oculta');
      }
    });
  }

  /**
   * Deslizar con el dedo o arrastrar con el mouse. Cuenta sólo si el gesto es más de costado que
   * vertical: subir o bajar la página con el dedo encima no cambia la diapositiva.
   */
  escucharSwipe() {
    let inicio = null;
    let deslizo = false;
    this.pantalla.addEventListener('pointerdown', (e) => {
      // Antes de cualquier salida: con el dedo, un deslizamiento no termina en clic y la marca
      // quedaría puesta, así que el primer toque en una flecha se perdería.
      deslizo = false;
      if (!e.isPrimary || e.button !== 0 || e.target.closest('.carrusel-flecha') || this.total < 2) {
        return;
      }
      inicio = { x: e.clientX, y: e.clientY };
    });
    this.pantalla.addEventListener('pointerup', (e) => {
      if (!inicio) {
        return;
      }
      const dx = e.clientX - inicio.x;
      const dy = e.clientY - inicio.y;
      inicio = null;
      if (Math.abs(dx) < Carrusel.UMBRAL_SWIPE || Math.abs(dx) < Math.abs(dy)) {
        return;
      }
      deslizo = true;
      if (dx < 0) {
        this.siguiente(true);
      } else {
        this.anterior(true);
      }
    });
    this.pantalla.addEventListener('pointercancel', () => {
      inicio = null;
    });
    // Arrastrar un enlace o una imagen con el mouse empieza el «arrastrar y soltar» del navegador,
    // que cancela el gesto: adentro del carrusel, arrastrar es pasar de diapositiva.
    this.pantalla.addEventListener('dragstart', (e) => e.preventDefault());
    // Un deslizamiento que empezó sobre «Ver función» no es un clic: no abre la función.
    this.pantalla.addEventListener('click', (e) => {
      if (deslizo) {
        e.preventDefault();
        e.stopPropagation();
        deslizo = false;
      }
    }, true);
  }

  /**
   * La barra de carga: cuenta las imágenes ya descargadas (o que fallaron, así no se traba) y, al
   * llegar al 100 %, la saca y arranca el pase automático. Una imagen repetida (el afiche y su
   * fondo desenfocado) es una sola descarga: se cuenta una vez.
   */
  esperarCarga() {
    const porDireccion = new Map();
    for (const imagen of this.contenedor.querySelectorAll('img')) {
      const direccion = imagen.currentSrc || imagen.src;
      porDireccion.set(direccion, [...(porDireccion.get(direccion) ?? []), imagen]);
    }
    const total = porDireccion.size;
    let listas = 0;
    const avanzar = () => {
      listas++;
      this.mostrarCarga(total === 0 ? 100 : Math.round((listas / total) * 100));
    };
    if (total === 0) {
      this.mostrarCarga(100);
      return;
    }
    for (const imagenes of porDireccion.values()) {
      // Las que vienen de la caché pueden estar completas antes de que corra el script: esas ya no
      // disparan «load».
      if (imagenes.some((imagen) => imagen.complete)) {
        avanzar();
        continue;
      }
      let contada = false;
      const unaVez = () => {
        if (!contada) {
          contada = true;
          avanzar();
        }
      };
      for (const imagen of imagenes) {
        imagen.addEventListener('load', unaVez, { once: true });
        imagen.addEventListener('error', unaVez, { once: true });
      }
    }
  }

  /**
   * @param {number} porcentaje de 0 a 100
   */
  mostrarCarga(porcentaje) {
    this.barra.value = porcentaje;
    this.porcentaje.textContent = `Cargando imágenes: ${porcentaje} %`;
    if (porcentaje >= 100 && !this.cargado) {
      this.cargado = true;
      this.contenedor.classList.add('carrusel-cargado');
      this.carga.hidden = true;
      this.programar();
    }
  }

  /**
   * Vuelve a contar el intervalo desde cero: después de un pase, automático o a mano, la nueva
   * se ve el intervalo entero.
   */
  programar() {
    clearTimeout(this.temporizador);
    this.temporizador = null;
    if (!this.cargado || this.pausas.size > 0 || this.total < 2) {
      return;
    }
    this.temporizador = setTimeout(() => this.siguiente(), this.intervalo);
  }

  /**
   * @param {string} motivo
   */
  pausar(motivo) {
    this.pausas.add(motivo);
    this.programar();
  }

  /**
   * @param {string} motivo
   */
  reanudar(motivo) {
    this.pausas.delete(motivo);
    this.programar();
  }

  /** El botón de pausa: la pausa del usuario dura hasta que la saque él. */
  alternarPausa() {
    const pausar = !this.pausas.has('usuario');
    if (pausar) {
      this.pausar('usuario');
    } else {
      this.reanudar('usuario');
    }
    this.botonPausa.setAttribute('aria-label', pausar ? 'Reanudar el pase automático' : 'Pausar el pase automático');
    this.botonPausa.textContent = pausar ? '▶' : '❚❚';
  }

  // Pasar de la última a la primera sigue siendo «hacia adelante»: por eso el sentido va aparte.
  siguiente(avisar = false) {
    this.ir(this.actual + 1, avisar, 1);
  }

  anterior(avisar = false) {
    this.ir(this.actual - 1, avisar, -1);
  }

  /**
   * Pasa a la diapositiva n: después de la última vuelve a la primera, y antes de la primera va a
   * la última.
   *
   * @param {number} n
   * @param {boolean} [avisar=false] si lo pidió el usuario: entonces se avisa a los lectores de pantalla
   * @param {number} [sentido] 1 hacia adelante, -1 hacia atrás; por defecto, según dónde queda n
   */
  ir(n, avisar = false, sentido = Math.sign(n - this.actual)) {
    const destino = ((n % this.total) + this.total) % this.total;
    if (destino === this.actual) {
      return;
    }
    this.mostrar(destino, sentido);
    if (avisar) {
      this.aviso.textContent = `${destino + 1} de ${this.total}: ${this.nombre(destino)}`;
    }
    this.programar();
  }

  /**
   * Marca cuál se ve. Las demás quedan inert: sus enlaces no se alcanzan con el tabulador ni los
   * lee un lector de pantalla mientras no se ven.
   *
   * La que entra se ubica primero de su lado sin animar (para «deslizar», del lado del que viene)
   * y recién después se la anima al centro; la que sale se va hacia el otro lado.
   *
   * @param {number} n
   * @param {number} [sentido=0] 1 hacia adelante, -1 hacia atrás; 0 la muestra sin animar
   */
  mostrar(n, sentido = 0) {
    const sale = this.diapositivas[this.actual];
    const entra = this.diapositivas[n];
    // Si el foco estaba en la que sale (pasando con el teclado desde «Ver función»), sigue en la
    // que entra: si no, quedaría en una diapositiva inert y se perdería.
    const conFoco = sale !== entra && sale.contains(document.activeElement);

    entra.classList.add('sin-transicion');
    entra.classList.remove('sale-hacia-atras', 'sale-hacia-adelante');
    entra.classList.toggle('desde-atras', sentido < 0);
    // Leer el tamaño obliga al navegador a aplicar esa posición antes de animar desde ahí.
    void entra.offsetWidth;
    entra.classList.remove('desde-atras');
    if (sentido !== 0) {
      entra.classList.remove('sin-transicion');
    }

    if (sale !== entra) {
      sale.classList.remove('es-actual');
      sale.classList.add(sentido < 0 ? 'sale-hacia-adelante' : 'sale-hacia-atras');
    }
    entra.classList.add('es-actual');
    this.diapositivas.forEach((diapositiva, i) => {
      diapositiva.inert = i !== n;
    });
    this.botonesMiniatura.forEach((boton, i) => {
      if (i === n) {
        boton.setAttribute('aria-current', 'true');
      } else {
        boton.removeAttribute('aria-current');
      }
    });
    if (conFoco) {
      entra.querySelector('a, button')?.focus({ preventScroll: true });
    }

    // Sin sentido (al armarlo) aparece de una; las siguientes ya animan.
    if (sentido === 0) {
      void entra.offsetWidth;
      entra.classList.remove('sin-transicion');
    }
    this.actual = n;
  }

  /**
   * Con qué nombre se anuncia una diapositiva: su título, o el texto alternativo de su imagen.
   *
   * @param {number} n
   * @returns {string}
   */
  nombre(n) {
    const diapositiva = this.diapositivas[n];
    const titulo = diapositiva.querySelector('h1, h2, h3, h4, h5, h6');
    if (titulo) {
      return titulo.textContent.trim();
    }

    return diapositiva.querySelector('img:not([alt=""])')?.alt ?? '';
  }

  /**
   * Un botón con su nombre accesible: el texto visible es un símbolo.
   *
   * @param {string} clase
   * @param {string} etiqueta
   * @param {string} [simbolo='']
   * @returns {HTMLButtonElement}
   */
  static boton(clase, etiqueta, simbolo = '') {
    return PAW.nuevoElemento('button', simbolo, { type: 'button', class: clase, 'aria-label': etiqueta });
  }
}
