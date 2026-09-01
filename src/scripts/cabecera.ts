/**
 * La cabecera se recoge: al bajar en el Inicio, y SIEMPRE en los interiores.
 *
 * La barra oscura de navegación se pliega y el wordmark aparece en la barra clara
 * del player. Este archivo decide el estado; el aspecto lo decide el CSS.
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

/**
 * 🔴 En un interior la barra oscura NO se despliega nunca, ni volviendo arriba del
 * todo: la página vive como si ya se hubiera hecho scroll (decisión de Carlos,
 * 2026-09-01). El dato lo pone `Base.astro` en el `body`, y se lee en cada pasada
 * en vez de guardarse: el `body` cambia con cada navegación y una copia en una
 * variable de módulo se quedaría contando la página anterior.
 */
function esInterior(): boolean {
  return document.body?.dataset.vista === 'interior';
}

/**
 * Aplica el estado al DOM.
 *
 * Son TRES cosas y las tres hacen falta, porque una barra plegada mide 0px pero
 * sigue siendo navegable:
 *   · `data-compacta` — lo que el CSS mira, aquí y en `beat.css`.
 *   · `inert` en la barra — la saca del orden de foco y del árbol de
 *     accesibilidad. Sin esto, el tabulador se pierde en enlaces invisibles.
 *   · el `tabindex` del logo y la hamburguesa CLAROS — a la inversa: mientras la
 *     barra oscura manda, esos dos están apagados y no deben recibir foco; en
 *     cuanto aparecen, sí.
 */
function aplicar(valor: boolean): void {
  const cabecera = document.getElementById('beat-cabecera');
  if (!cabecera) return;

  const nav = cabecera.querySelector('header');
  const claros = cabecera.querySelectorAll<HTMLElement>(
    '.cabecera-logo-claro, .cabecera-menu-claro',
  );

  if (valor) {
    cabecera.dataset.compacta = '';
    nav?.setAttribute('inert', '');
    for (const el of claros) el.removeAttribute('tabindex');
  } else {
    delete cabecera.dataset.compacta;
    nav?.removeAttribute('inert');
    for (const el of claros) el.setAttribute('tabindex', '-1');
  }
}

function pintar(): void {
  solicitud = 0;

  const cabecera = document.getElementById('beat-cabecera');
  if (!cabecera) return;

  const y = window.scrollY;
  const quiere = esInterior() || (compacta ? y > SUBIR : y > BAJAR);
  if (quiere === compacta) return;

  compacta = quiere;
  aplicar(compacta);
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

/**
 * Marca en la nav la sección en la que estamos.
 *
 * 🔴 Esto lo pinta el SERVIDOR en la primera carga, y en una navegación del lado
 * del cliente esa marca se queda CONGELADA: la cabecera lleva `transition:persist`,
 * así que el nodo que sobrevive es el de la página anterior, con su `es-activo`
 * intacto y con el `aria-current` que ya no corresponde.
 *
 * El síntoma que lo destapó: entrar a Agenda, volver al Inicio, y ver «AGENDA»
 * subrayada sobre el mosaico del Inicio. No era un problema del subrayado —era
 * este— y además le mentía a un lector de pantalla, que oía «página actual» de una
 * sección en la que no estaba.
 *
 * ⚠️ La regla tiene que ser LA MISMA que la del servidor
 * (`Cabecera.astro`: `ruta === href || ruta.startsWith(href + '/')`). Si las dos
 * divergen, la marca cambia al navegar y nadie sabe cuál de las dos manda.
 */
function marcarSeccion(): void {
  const ruta = location.pathname;
  const enlaces = document.querySelectorAll<HTMLAnchorElement>(
    '#beat-cabecera .beat-nav-enlace',
  );

  for (const a of enlaces) {
    // `getAttribute` y no `a.pathname`: el href del marcado es relativo y lo que
    // se compara tiene que ser exactamente lo que declara la config de navegación.
    const href = a.getAttribute('href') ?? '';
    const activo = href !== '' && (ruta === href || ruta.startsWith(`${href}/`));
    a.classList.toggle('es-activo', activo);
    if (activo) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

/**
 * Reconcilia tras una navegación.
 *
 * 🔴 La cabecera lleva `transition:persist`: el nodo sobrevive intacto y con él el
 * estado de la página ANTERIOR. Sin esto, ir del Inicio sin scroll a un interior
 * dejaría la barra oscura puesta, y volver de un interior al Inicio la dejaría
 * recogida para siempre.
 */
function reconciliar(): void {
  /*
    🔴 `hasAttribute` y NO `!!dataset.compacta`.

    El atributo se escribe como `data-compacta` a secas, así que su valor es la
    CADENA VACÍA — y `!!''` es `false`. O sea que la lectura decía siempre «no
    está recogida», aunque lo estuviera, y entonces `pintar()` encontraba que el
    estado deseado coincidía con el que creía tener y se salía por su atajo, sin
    tocar el DOM.

    El síntoma: al volver de un interior al Inicio, la barra oscura se quedaba
    plegada para siempre. Medido en el flujo Inicio → Scanner → atrás, que es el
    que hay que probar SIEMPRE (memoria: verificar-flujo-navegacion). El error
    venía de antes de los interiores; hasta ahora no se notaba porque el único
    camino que ponía el atributo era el scroll, y ahí el valor que se recalcula
    coincide con el que se cree tener.
  */
  compacta = document.getElementById('beat-cabecera')?.hasAttribute('data-compacta') ?? false;
  marcarSeccion();
  pintar();
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
   *
   * ⚠️ Va en `astro:after-swap` y NO en `astro:page-load`. El intercambio ya
   * ocurrió pero el navegador todavía no ha pintado, así que el ajuste entra en el
   * mismo fotograma. Con `page-load` se alcanzaba a ver un parpadeo de la barra
   * oscura al entrar a un interior — el error dura un fotograma, que es
   * exactamente lo que el ojo caza como salto.
   */
  pintar();
  document.addEventListener('astro:after-swap', reconciliar);
}
