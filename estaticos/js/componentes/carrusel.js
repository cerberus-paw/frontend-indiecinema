/**
 * Carrusel propio, sin librerías (E4-07, el punto 1 del TP4): convierte la lista de un contenedor
 * en diapositivas, de a una por vez.
 *
 * Recibe sólo el contenedor, como pide el enunciado; lo demás sale del HTML:
 *   - cada <li> de la primera lista del contenedor es una diapositiva;
 *   - el aria-label del contenedor nombra al carrusel para los lectores de pantalla;
 *   - data-transicion="fundido|deslizar|zoom" elige la transición (por defecto, fundido).
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

    this.armar();
    this.escuchar();
    this.mostrar(0);
    this.transicion = this.contenedor.dataset.transicion;
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

    // Avisa la diapositiva nueva cuando la elige el usuario.
    this.aviso = PAW.nuevoElemento('p', '', { class: 'sr-only', 'aria-live': 'polite' });
    c.append(this.aviso);
  }

  escuchar() {
    this.botonAnterior?.addEventListener('click', () => this.anterior(true));
    this.botonSiguiente?.addEventListener('click', () => this.siguiente(true));
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
