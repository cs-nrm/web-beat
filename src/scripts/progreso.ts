/**
 * La barra de progreso de navegación.
 *
 * 🔴 Existe porque hay una espera CIEGA y está medida: entre el clic y el momento
 * en que Astro tiene la página nueva pasaron **414ms en localhost** contra un
 * build, y en un teléfono sobre red móvil son fácil 800–1200. En todo ese tiempo
 * la pantalla no cambia ni un píxel, así que el lector no sabe si su toque
 * registró y vuelve a tocar. Lo reportó Carlos (2026-09-08): «tarda ahí como un
 * segundo en pasar algo y el usuario no sabe que sí está pasando algo».
 *
 * El hueco es exactamente `astro:before-preparation` → `astro:after-preparation`:
 * ahí el `ClientRouter` está pidiendo el documento por la red. Después de eso el
 * intercambio es inmediato.
 *
 * 🔴 REGLA DE ORO, la misma que `revelar.ts`: el contenido no depende de esto.
 * Es solo respuesta al toque — si este script no corre, la navegación funciona
 * igual y lo único que se pierde es el aviso. Y sin JavaScript no hay
 * `ClientRouter`, así que la navegación es una carga completa y el indicador lo
 * pone el propio navegador.
 *
 * ⚠️ NO se anuncia a lectores de pantalla y va `aria-hidden`. El `ClientRouter` de
 * Astro ya trae su propio anunciador de cambio de ruta; añadir un `role="progressbar"`
 * aquí haría que una sola navegación se anunciara dos veces.
 */

/**
 * 🔴 Lo que la barra espera antes de asomar.
 *
 * Una navegación que resuelve en 120ms con una barra encima se ve como un
 * parpadeo, y un parpadeo es peor que nada: llama la atención y no informa. Con
 * este retardo, las navegaciones rápidas —o las que Astro ya trae precargadas— no
 * pintan absolutamente nada, y solo aparece cuando de verdad hay que esperar.
 *
 * 140ms está por debajo del umbral en el que un toque deja de sentirse
 * instantáneo, y por encima de lo que tarda una navegación servida de caché.
 */
const RETARDO_MS = 140;

/** Cuánto tarda en desvanecerse una vez completada. Debe coincidir con el CSS. */
const SALIDA_MS = 260;

let barra: HTMLElement | null = null;
let temporizador: number | null = null;
let salida: number | null = null;

/**
 * El enlace que se acaba de pulsar, marcado para que se vea que registró.
 *
 * 🔴 Esto es la mitad que faltaba, y es la que el lector pide de verdad. La barra
 * de arriba dice «está pasando algo»; esto dice «pasó por LO QUE TOCASTE». Son
 * 2px en la coronilla de la pantalla contra una tarjeta a media página: en
 * escritorio, a 1440px de ancho, el aviso de arriba queda fuera de donde el ojo
 * está mirando. Carlos lo pidió dos veces —«para que el usuario sepa que ya le
 * picó a algo… también en desk»— y la primera vez respondí solo con la barra.
 *
 * ⚠️ Y va SIN retardo, al contrario que la barra: el acuse de un toque tiene que
 * ser inmediato o no es un acuse. Los 140ms de la barra existen para que una
 * navegación instantánea no parpadee; aquí un parpadeo es justamente la
 * confirmación.
 */
let pulsado: HTMLElement | null = null;

const soltar = (): void => {
  pulsado?.removeAttribute('data-navegando');
  pulsado = null;
};

/**
 * Solo los temporizadores de la BARRA.
 *
 * 🔴 No suelta la marca del enlace pulsado, y es la corrección de un error que
 * costó encontrar: la soltaba, y como `arrancar()` empieza llamando aquí, el acuse
 * se borraba **en el instante en que arranca la navegación** — o sea justo cuando
 * tiene que estar puesto. La marca dura desde el clic hasta que la página nueva
 * está en pantalla; la barra y ella tienen ciclos de vida distintos y no se
 * limpian juntas.
 */
const cancelar = (): void => {
  if (temporizador !== null) clearTimeout(temporizador);
  if (salida !== null) clearTimeout(salida);
  temporizador = salida = null;
};

/**
 * Empieza a esperar. Si la navegación resuelve antes del retardo, no se pinta nada.
 *
 * 🔴 Este script NO anima: solo pone y quita dos atributos. El reptado es una
 * animación de CSS colgada de `[data-activa]`, y es la regla de la casa —la misma
 * que documenta `revelar.ts`—: lo resuelve el compositor, no compite con el hilo
 * principal, y el efecto queda donde se puede leer y ajustar.
 *
 * ⚠️ La primera versión de esto usaba un `setInterval` de 90ms para mover la barra
 * a mano. Además de ir contra esa regla, se estrangula solo: en un documento
 * oculto el navegador baja los temporizadores a uno por segundo, así que la barra
 * se quedaba clavada en cero. En CSS eso no puede pasar.
 */
function arrancar(): void {
  if (!barra) return;
  cancelar();
  /*
    ⚠️ Se limpia el estado ANTES del retardo, no dentro. Si una segunda navegación
    empieza mientras la primera se está desvaneciendo, sin esto la barra nueva
    heredaría la opacidad de salida de la vieja y no se vería.

    Y se quitan LOS DOS atributos: quitar `data-activa` es lo que rearranca la
    animación de CSS desde el principio en la navegación siguiente.
  */
  barra.removeAttribute('data-listo');
  barra.removeAttribute('data-activa');

  temporizador = window.setTimeout(() => {
    if (barra) barra.dataset.activa = 'sí';
  }, RETARDO_MS);
}

/** La página ya está. Completa y se va. */
function terminar(): void {
  cancelar();
  if (!barra) return;
  /*
    Si nunca llegó a asomar —la navegación fue más rápida que el retardo— se sale
    sin tocar nada. Marcarla como completada la haría aparecer justo para
    desaparecer.
  */
  if (!barra.dataset.activa) return;
  /* `data-listo` corta la animación y manda la barra al 100%. Ver el CSS. */
  barra.dataset.listo = 'sí';
  salida = window.setTimeout(() => {
    if (!barra) return;
    barra.removeAttribute('data-activa');
    barra.removeAttribute('data-listo');
  }, SALIDA_MS);
}

export function prepararProgreso(): void {
  /*
    🔴 Se busca el elemento en cada evento y no una sola vez al arrancar: lleva
    `transition:persist`, así que sobrevive al intercambio — pero si algún día
    deja de llevarlo, guardar la referencia aquí dejaría el script apuntando a un
    nodo que ya no está en el documento, sin error y sin barra.
  */
  const localizar = (): void => {
    barra = document.querySelector<HTMLElement>('[data-progreso]');
  };
  localizar();

  /*
    ⚠️ Los tres oyentes van en `document` y este módulo se importa UNA vez desde el
    layout, así que no se acumulan por navegación. Es la misma razón por la que el
    «copiar enlace» de la nota usa delegación.
  */
  /*
    🔴 El acuse se marca en el CLIC, no en `before-preparation`.

    Tiene que ser así por dos razones. La primera es de tiempo: el clic es el
    instante en que el lector espera respuesta, y `before-preparation` llega
    después. La segunda es que ese evento **no sabe qué se pulsó** — cubre también
    el botón de atrás del navegador, donde no hay nada que marcar.

    ⚠️ Se descarta lo que no va a navegar por aquí: enlaces externos, los que abren
    en otra pestaña, descargas, anclas de la misma página, y el clic con
    modificador o con el botón de en medio —que abre en pestaña nueva y dejaría la
    tarjeta marcada en una página en la que el lector se queda—.
  */
  document.addEventListener('click', (ev) => {
    const e = ev as MouseEvent;
    /*
      🔴 NO se comprueba `defaultPrevented`, y es contraintuitivo: parecía la
      guarda obvia para «ya lo atendió alguien».

      Es justo al revés. El `ClientRouter` de Astro intercepta el clic y llama
      `preventDefault()` para hacer él la navegación, y se carga en el `<head>`
      mientras este módulo va al final del `<body>` — así que cuando llega aquí,
      `defaultPrevented` ya es `true` **en exactamente los clics que nos importan**.
      Con esa guarda puesta, el acuse no se pintaba nunca. Medido: todas las demás
      condiciones pasaban y la marca no aparecía.
    */
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement | null)?.closest?.('a[href]');
    if (!(a instanceof HTMLAnchorElement)) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    if (a.origin !== location.origin) return;
    // Un ancla de la misma página no navega: no hay nada que esperar.
    if (a.pathname === location.pathname && a.hash) return;

    soltar();
    pulsado = a;
    a.setAttribute('data-navegando', '');
  });

  document.addEventListener('astro:before-preparation', () => {
    localizar();
    arrancar();
  });
  /*
    Se completa en `after-swap` y no en `page-load`: para cuando se intercambia el
    DOM, el lector YA está viendo la página nueva. Esperar a `page-load` —que llega
    después de los estilos y las imágenes— dejaría la barra encima de una página
    que ya se puede leer.
  */
  document.addEventListener('astro:after-swap', () => {
    localizar();
    terminar();
    /*
      ⚠️ Y se suelta la marca. El intercambio reemplaza el `body`, así que el nodo
      marcado se va con él — pero la referencia se queda apuntando a un nodo
      huérfano, y sin esto la siguiente navegación intentaría desmarcar ese en vez
      del nuevo.
    */
    soltar();
  });
  /*
    ⚠️ Y un cierre de seguridad: si la petición falla o el lector cancela, no llega
    ningún `after-swap` y la barra se quedaría reptando para siempre.
  */
  window.addEventListener('pagehide', () => {
    cancelar();
    soltar();
  });
}
