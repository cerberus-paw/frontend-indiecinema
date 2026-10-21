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
    // Los parámetros de la sala elegida, al lado del formulario de alta de función.
    if (document.querySelector('[data-parametros-de-sala]')) {
      PAW.cargarScript('ParametrosDeSala', `${App.COMPONENTES}/parametros-de-sala.js`, () => new ParametrosDeSala('[data-parametros-de-sala]', 'select[name="sala_id"]'));
    }
    // El modo de publicación (programada vs abrir a votación, IC-147).
    if (document.querySelector('[data-seccion-modo]')) {
      PAW.cargarScript('ModoFuncion', `${App.COMPONENTES}/modo-funcion.js`, () => new ModoFuncion('.formulario-alta-funcion'));
    }
    // Los formularios que se mandan al elegir una opción, en el panel del administrador.
    const alElegir = document.querySelectorAll('form[data-enviar-al-elegir]');
    if (alElegir.length > 0) {
      PAW.cargarScript('EnviarAlElegir', `${App.COMPONENTES}/enviar-al-elegir.js`, () => alElegir.forEach((formulario) => new EnviarAlElegir(formulario)));
    }
    // La búsqueda en vivo, en la cartelera.
    if (document.querySelector('.filtros-cartelera') && document.querySelector('#resultados-cartelera')) {
      PAW.cargarScript('BuscadorDeCartelera', `${App.COMPONENTES}/buscador-de-cartelera.js`, () => new BuscadorDeCartelera('.filtros-cartelera', '#resultados-cartelera'));
    }
  }
}

const app = new App();
