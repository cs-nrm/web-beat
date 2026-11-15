/**
 * El formato «Inline» de Medios Federales — Smart AdServer / Equativ, red 4308.
 *
 * Es la ÚNICA publicidad del sitio que no entra por Ad Manager, y no por gusto:
 * Medios Federales vende su inventario con su propio adserver, así que su
 * demanda no se puede traer a GAM. Lo entregan como un «maintag» para pegar en
 * la página; esto es ese maintag, reescrito. El contenedor es
 * `src/components/SmartInline.astro`.
 *
 * Lo que pide la versión del fragmento del 14 nov 2026, la segunda (llegó por la
 * sesión de Oye, que ya la aplicó):
 *
 *   · Ya NO va `smart.prebid.js` (`tagmanager.smartadserver.com/4308/790083`):
 *     solo `smart.js`.
 *   · El cuarto campo del `schain` va SIN `.mx`: `…,1,beatdigital,beatdigital.mx`.
 *
 * Lo que se le cambió al fragmento que mandan, y por qué (las mismas
 * correcciones que ya llevan Oye, Stereo Cien y Sabrosita):
 *
 *   · Su `tagId` es `inline` y su div `Inline`. Los ids distinguen mayúsculas:
 *     aquí es `inline` en los tres lugares.
 *   · Su rama de ESCRITORIO llama a `sas.call()` FUERA de `sas.cmd.push()`. Con
 *     `smart.js` en `async` eso truena con «sas.call is not a function». En la
 *     primera versión era peor: le faltaba la apertura del `push` y el error de
 *     sintaxis tumbaba el bloque entero, móvil incluido.
 *   · Su `mobileCheck()` se fue: las dos ramas piden el mismo formato. Si Medios
 *     Federales separa formatos por dispositivo, ahí vuelve a hacer falta.
 *   · Su `target` iba sin codificar. Es `clave=valor;clave=valor`, y una URL con
 *     `&` o `=` lo rompe.
 *   · Su `let dominio` de nivel superior truena («already been declared») en
 *     cuanto el script corre dos veces, que con el `ClientRouter` es lo normal.
 *
 * Y lo que es de Beat:
 *
 *   · `smart.js` se baja SOLO en las páginas que traen el contenedor, la primera
 *     vez que aparece uno. El fragmento lo ponía en todas: quien entra a leer una
 *     nota no paga el peso de un formato que ahí no existe.
 *   · `sas` se escribe en `window` a mano. Un `var sas` dentro de un módulo deja
 *     de ser global y `smart.js` nunca ve la cola `sas.cmd`: en los hermanos eso
 *     obligó a `is:inline`.
 */

interface Sas {
  cmd: Array<() => void>;
  setup?: (opciones: Record<string, unknown>) => void;
  call?: (tipo: string, opciones: Record<string, unknown>) => void;
  render?: (tagId: string) => void;
}

declare global {
  interface Window {
    sas?: Sas;
    __beatSmartListo?: boolean;
    __beatSmartLibrerias?: boolean;
  }
}

const RED = 4308;
/** «Inline 1x1»: el video in-read (plantilla video-read de Equativ). */
const FORMATO_INLINE = 111268;
/** Tiene que coincidir con el `id` del hueco en `SmartInline.astro`. */
const TAG_ID = 'inline';
const LIBRERIA = 'https://ced.sascdn.com/tag/4308/smart.js';
const LLAVE_CERRADO = 'beat:smart-inline-cerrado';
/**
 * Por encima de esto, hay video. El in-read desplegado mide ~160px; sin anuncio,
 * o ya plegado al terminar, el hueco mide 0 o 1 — Smart deja ahí un contenedor
 * de 1px aunque no traiga nada.
 */
const UMBRAL_ALTO = 20;

/** El de la vista en curso. Se desconecta en cada navegación. */
let observador: ResizeObserver | null = null;

function cola(): Array<() => void> {
  window.sas = window.sas || ({ cmd: [] } as Sas);
  window.sas.cmd = window.sas.cmd || [];
  return window.sas.cmd;
}

/** `smart.js` y su `setup`, UNA vez por contexto de JavaScript. */
function cargarLibreria(): void {
  if (window.__beatSmartLibrerias) return;
  window.__beatSmartLibrerias = true;

  // `renderMode: 2` es render MANUAL: por eso cada pedido lleva su `render()`.
  cola().push(() => {
    window.sas?.setup?.({
      networkid: RED,
      domain: 'https://adapi.smartadserver.com',
      async: true,
      renderMode: 2,
    });
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = LIBRERIA;
  document.head.appendChild(script);
}

function yaCerrado(): boolean {
  try {
    return sessionStorage.getItem(LLAVE_CERRADO) === '1';
  } catch {
    return false;
  }
}

function pedir(): void {
  observador?.disconnect();
  observador = null;

  const caja = document.querySelector<HTMLElement>('[data-smart-inline]');
  const hueco = document.getElementById(TAG_ID);
  if (!caja || !hueco) return;

  // Si lo cerró en esta sesión, ni se pide: pedirlo y no enseñarlo sería
  // facturar una impresión que nadie vio.
  if (yaCerrado()) {
    caja.remove();
    return;
  }

  const sitio = Number(caja.dataset.sitio);
  const pagina = Number(caja.dataset.pagina);
  const dominio = caja.dataset.dominio;
  if (!sitio || !pagina || !dominio) return;
  // El cuarto campo del `schain` es el dominio SIN `.mx` (`beatdigital`), el
  // sexto, completo. Así viene desde el fragmento del 14 nov 2026; antes los dos
  // iban completos.
  const nombre = dominio.split('.')[0];

  observador = new ResizeObserver(() => {
    if (hueco.offsetHeight > UMBRAL_ALTO) caja.dataset.conAnuncio = '';
    else delete caja.dataset.conAnuncio;
  });
  observador.observe(hueco);

  cargarLibreria();
  cola().push(() => {
    // Mientras bajaba `smart.js` el lector pudo irse del Inicio, o irse y
    // volver: entonces este hueco ya no es el de la página y el pedido que vale
    // es el que encoló la vista nueva. Sin esto, la vuelta pediría DOS veces.
    if (!hueco.isConnected) return;
    window.sas?.call?.('onecall', {
      siteId: sitio,
      pageId: pagina,
      formats: [{ id: FORMATO_INLINE, tagId: TAG_ID }],
      target: 'dominio=' + encodeURIComponent(location.href),
      schain: `1.0,1!mediosfederales.com,${sitio},1,${nombre},${dominio}`,
    });
    window.sas?.render?.(TAG_ID);
  });
}

/**
 * La X. Vaciar el hueco es lo que CORTA el video: escondido con `display: none`
 * seguiría sonando. Se marca en la sesión para no volver a pedirlo.
 */
function cerrar(evento: MouseEvent): void {
  const objetivo = evento.target as Element | null;
  if (!objetivo?.closest?.('[data-smart-cerrar]')) return;

  observador?.disconnect();
  observador = null;
  document.getElementById(TAG_ID)?.replaceChildren();
  document.querySelector('[data-smart-inline]')?.remove();
  try {
    sessionStorage.setItem(LLAVE_CERRADO, '1');
  } catch {
    // Sin `sessionStorage` (ventana privada estricta) se cierra igual; solo
    // vuelve a salir en la próxima visita al Inicio.
  }
}

/**
 * Los dos oyentes se registran UNA vez por contexto, igual que en
 * `anuncios.ts`: `astro:page-load` dispara en cada navegación y la enésima
 * pediría el anuncio n veces. La X va delegada en `document` porque el
 * contenedor es un nodo nuevo en cada vista.
 */
export function prepararSmart(): void {
  if (window.__beatSmartListo) return;
  window.__beatSmartListo = true;

  document.addEventListener('astro:page-load', pedir);
  document.addEventListener('click', cerrar);
}
