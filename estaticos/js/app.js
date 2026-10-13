/**
 * La aplicación: cuando el DOM está listo, carga e inicia los componentes que la página necesita.
 * Cada componente está en su archivo de componentes/ y recibe su contenedor; un script se carga
 * sólo si su contenedor está en la página. Las utilidades comunes están en paw.js.
 */
class App {
  /** Dónde están los componentes. */
  static COMPONENTES = '/estaticos/js/componentes';

  constructor() {
    document.addEventListener('DOMContentLoaded', () => this.iniciar());
  }

  iniciar() {
    // El menú del usuario, sólo con sesión.
    if (document.querySelector('#menu-usuario')) {
      PAW.cargarScript('MenuUsuario', `${App.COMPONENTES}/menu-usuario.js`, () => new MenuUsuario('#menu-usuario'));
    }
    // La búsqueda en vivo, en la cartelera.
    if (document.querySelector('.filtros-cartelera') && document.querySelector('#resultados-cartelera')) {
      PAW.cargarScript('BuscadorDeCartelera', `${App.COMPONENTES}/buscador-de-cartelera.js`, () => new BuscadorDeCartelera('.filtros-cartelera', '#resultados-cartelera'));
    }
  }
}

const app = new App();
