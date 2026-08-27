/**
 * La cabecera se recoge al bajar.
 *
 * La barra oscura de navegación se pliega y el wordmark aparece en la barra clara
 * del player. Este archivo solo pone y quita `data-compacta`; el aspecto lo decide
 * el CSS.
 */

/** A partir de aquí se recoge. */
const BAJAR = 96;

/**
 * Y no se despliega hasta volver por debajo de esto.
 *
 * 🔴 Los dos umbrales son distintos A PROPÓSITO. Con uno solo, quedarse justo en el
 * límite —o el rebote elástico de un móvil— hace que la barra se abra y se cierre
 * varias veces por segundo. Con 96 para bajar y 48 para subir hay 48px de zona
 * muerta, que es más que cualquier temblor.
 */
const SUBIR = 48;

let solicitud = 0;
let compacta = false;

function pintar(): void {
  solicitud = 0;

  const cabecera = document.getElementById('beat-cabecera');
  if (!cabecera) return;

  const y = window.scrollY;
  const quiere = compacta ? y > SUBIR : y > BAJAR;
  if (quiere === compacta) return;

  compacta = quiere;
  const nav = cabecera.querySelector('header');

  if (compacta) {
    cabecera.dataset.compacta = '';
    /*
     * 🔴 `inert` además de esconder. Una barra plegada mide 0px pero sus enlaces
     * SIGUEN siendo enfocables: quien navega con el tabulador iría a parar a ocho
     * enlaces invisibles, sin saber dónde está. `inert` los saca del orden de foco
     * y del árbol de accesibilidad de una vez.
     */
    nav?.setAttribute('inert', '');
  } else {
    delete cabecera.dataset.compacta;
    nav?.removeAttribute('inert');
  }
}

function alDesplazar(): void {
  /*
   * Se cancela el pendiente y se pide otro, en vez de no pedir nada si ya hay uno.
   * Un candado que solo se suelta dentro del callback muere si un fotograma no
   * llega — y aquí eso dejaría la cabecera congelada en el estado equivocado. Es la
   * prohibición de forma de movimiento.md §3.
   */
  if (solicitud) cancelAnimationFrame(solicitud);
  solicitud = requestAnimationFrame(pintar);
}

export function prepararCabecera(): void {
  const w = window as Window & { __beatCabeceraLista?: boolean };
  if (w.__beatCabeceraLista) return;
  w.__beatCabeceraLista = true;

  addEventListener('scroll', alDesplazar, { passive: true });

  /*
   * Y se evalúa al llegar y en cada navegación: si alguien entra a una URL con
   * ancla, o vuelve a una página con el scroll restaurado, la cabecera tiene que
   * nacer en el estado que le toca y no desplegada sobre contenido a media altura.
   */
  pintar();
  document.addEventListener('astro:page-load', () => {
    compacta = !!document.getElementById('beat-cabecera')?.dataset.compacta;
    pintar();
  });
}
