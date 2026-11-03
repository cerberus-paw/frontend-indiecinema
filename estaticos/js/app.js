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
    // El botón para imprimir el comprobante de la reserva (E4-04.2).
    if (document.querySelector('[data-imprimir]')) {
      PAW.cargarScript('BotonImprimir', `${App.COMPONENTES}/boton-imprimir.js`, () => new BotonImprimir('[data-imprimir]'));
    }
    // La votación de títulos en la ficha de la función (E3-12 / IC-148 / IC-149).
    if (document.querySelector('[data-seccion-votacion]') || document.querySelector('[data-formulario-votacion]')) {
      PAW.cargarScript('VotacionTitulos', `${App.COMPONENTES}/votacion-titulos.js`, () => new VotacionTitulos('[data-seccion-votacion], [data-formulario-votacion]'));
    }
    // El gestor de franjas horarias y mínimo de asistentes (IC-154 / E3-13.2).
    if (document.querySelector('[data-gestor-franjas]')) {
      PAW.cargarScript('GestorFranjas', `${App.COMPONENTES}/gestor-franjas.js`, () => new GestorFranjas('[data-gestor-franjas]'));
    }
    // «Compartir», en la cabecera de la ficha de la función (E3-13.F10).
    if (document.querySelector('[data-compartir]')) {
      PAW.cargarScript('Compartir', `${App.COMPONENTES}/compartir.js`, () => new Compartir('[data-compartir]'));
    }
    // Los lugares libres de la ficha, al día sin recargar (E4-05.2 / IC-273).
    if (document.querySelector('[data-lugares-libres]')) {
      PAW.cargarScript('LugaresLibres', `${App.COMPONENTES}/lugares-libres.js`, () => new LugaresLibres('[data-lugares-libres]'));
    }
    // El formulario de reserva de la ficha, sin recargar (E4-05.3 / IC-274).
    if (document.querySelector('[data-formulario-reserva]')) {
      PAW.cargarScript('FormularioDeReserva', `${App.COMPONENTES}/formulario-de-reserva.js`, () => new FormularioDeReserva('[data-formulario-reserva]'));
    }
    // El acuerdo de fecha en la ficha de la función (E3-13 / IC-155 / IC-158).
    if (document.querySelector('[data-seccion-acuerdo-fecha]')) {
      PAW.cargarScript('AcuerdoFecha', `${App.COMPONENTES}/acuerdo-fecha.js`, () => new AcuerdoFecha('[data-seccion-acuerdo-fecha]'));
    }
  }
}

const app = new App();
