/* global AccionesDeReserva, AcuerdoFecha, BotonImprimir, BuscadorDeCartelera, Carrusel, Compartir,
   EnviarAlElegir, FormularioDeReserva, GestorFranjas, LugaresLibres, MenuUsuario, ModoFuncion,
   ParametrosDeSala, ValidacionEnLinea, VotacionTitulos, ZonaDeImagen */

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
    // Lo que antes iba en el HTML como onclick o style, que la Content-Security-Policy bloquea: no
    // admite código ni estilos en línea, pero sí lo que se asigna desde un script propio.
    // La cruz de una alerta descartable la cierra. Escucha en el documento y no en cada botón, así
    // sirve también para una alerta que se agregue después.
    document.addEventListener('click', (evento) => {
      const boton = evento.target.closest('[data-cerrar-alerta]');
      boton?.closest('.alerta')?.remove();
    });
    // Las barras de compromisos del acuerdo de fecha: el ancho viene en data-porcentaje.
    for (const barra of document.querySelectorAll('[data-porcentaje]')) {
      barra.style.width = `${barra.dataset.porcentaje}%`;
    }
    // Los carruseles, como el de destacadas de la portada (E4-07): cada uno recibe su contenedor.
    const carruseles = document.querySelectorAll('[data-carrusel]');
    if (carruseles.length > 0) {
      PAW.cargarScript('Carrusel', `${App.COMPONENTES}/carrusel.js`, () => carruseles.forEach((contenedor) => new Carrusel(contenedor)));
    }
    // El resumen de errores de un formulario que volvió del servidor (E4-10.5): recibe el foco.
    if (document.querySelector('[data-resumen-de-errores]')) {
      PAW.cargarScript('ResumenDeErrores', `${App.COMPONENTES}/resumen-de-errores.js`, () => new ResumenDeErrores('[data-resumen-de-errores]'));
    }
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
    // La validación en línea de los formularios de carga (E4-09.1 / IC-295). Son varios en la
    // misma página sólo si alguna pantalla los junta; uno por formulario marcado.
    for (const formulario of document.querySelectorAll('[data-validar-en-linea]')) {
      PAW.cargarScript('ValidacionEnLinea', `${App.COMPONENTES}/validacion-en-linea.js`, () => new ValidacionEnLinea(formulario));
    }
    // Arrastrar y soltar la imagen, con vista previa (E4-09.2 / IC-296).
    for (const campo of document.querySelectorAll('[data-zona-de-imagen]')) {
      PAW.cargarScript('ZonaDeImagen', `${App.COMPONENTES}/zona-de-imagen.js`, () => new ZonaDeImagen(campo));
    }
    // Los lugares libres de la ficha, al día sin recargar (E4-05.2 / IC-273).
    if (document.querySelector('[data-lugares-libres]')) {
      PAW.cargarScript('LugaresLibres', `${App.COMPONENTES}/lugares-libres.js`, () => new LugaresLibres('[data-lugares-libres]'));
    }
    // El formulario de reserva de la ficha, sin recargar (E4-05.3 / IC-274).
    if (document.querySelector('[data-formulario-reserva]')) {
      PAW.cargarScript('FormularioDeReserva', `${App.COMPONENTES}/formulario-de-reserva.js`, () => new FormularioDeReserva('[data-formulario-reserva]'));
    }
    // Las acciones de los paneles de reservas, sin recargar la lista (E4-05.5 / IC-276).
    if (document.querySelector('[data-panel-de-reservas]')) {
      PAW.cargarScript('AccionesDeReserva', `${App.COMPONENTES}/acciones-de-reserva.js`, () => new AccionesDeReserva('[data-panel-de-reservas]'));
    }
    // Los formularios que piden confirmación antes de mandarse, como la baja de una obra (E4-08.4).
    for (const formulario of document.querySelectorAll('form[data-confirmar]')) {
      PAW.cargarScript('ConfirmarEnvio', `${App.COMPONENTES}/confirmar-envio.js`, () => new ConfirmarEnvio(formulario));
    }
    // El acuerdo de fecha en la ficha de la función (E3-13 / IC-155 / IC-158).
    if (document.querySelector('[data-seccion-acuerdo-fecha]')) {
      PAW.cargarScript('AcuerdoFecha', `${App.COMPONENTES}/acuerdo-fecha.js`, () => new AcuerdoFecha('[data-seccion-acuerdo-fecha]'));
    }
  }
}

new App();
