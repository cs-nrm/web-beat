/**
 * El sitio reacciona al puntero.
 *
 * 🔴 Por qué hacía falta: no había NADA. Cero `pointermove` en todo `src/` — el
 * único que existía se quedó en el `player.js` de la versión vieja, sin portar. Un
 * sitio que no acusa recibo de dónde está tu cursor se siente inerte por mucho que
 * las cosas se animen al entrar.
 *
 * Lo único que hace este archivo es publicar la posición del puntero, en
 * porcentaje, sobre el elemento que lo recibe. Quién dibuja qué con eso lo decide
 * el CSS. Así el efecto se ajusta sin tocar JavaScript, y si esto no corre no pasa
 * nada: el CSS tiene valores por defecto y la tarjeta se ve igual, solo que sin
 * seguir al cursor.
 */

/** Un único apuntado pendiente por fotograma, compartido por todas las tarjetas. */
let pendiente: HTMLElement | null = null;
/** Posición en la ventana, para el halo que acompaña al cursor por todo el sitio. */
let vx = 0;
let vy = 0;

/**
 * La capa del halo.
 *
 * 🔴 Se busca perezosamente y se vuelve a buscar si el nodo se desconectó. Lleva
 * `transition:persist`, así que sobrevive a la navegación — pero guardar la
 * referencia y no comprobarla nunca es cómo se acaba moviendo un nodo huérfano:
 * el efecto muere en silencio y desde el código se ve correcto. Ya pasó con el
 * `<video>` de montaje del visor, que Plyr reemplaza a media vida.
 */
let halo: HTMLElement | null = null;

function capaHalo(): HTMLElement | null {
  if (!halo?.isConnected) halo = document.querySelector<HTMLElement>('[data-halo]');
  return halo;
}

/**
 * El fotograma pedido y todavía sin pintar, o `0` si no hay ninguno.
 *
 * 🔴 Es un IDENTIFICADOR, no un booleano, y la diferencia es la vida del efecto.
 *
 * Antes había un candado: «si ya hay uno pedido, no pidas otro», y solo se soltaba
 * DENTRO del callback. O sea que si un fotograma se pedía y nunca llegaba, el
 * candado se quedaba echado y no volvía a pedirse ninguno — jamás. El efecto moría
 * en silencio y sin forma de recuperarse: exactamente lo que Carlos vio al volver
 * de una nota, donde solo sobrevivía la parte del hover que no depende del cursor.
 *
 * Guardando el id se cancela el anterior y se pide uno nuevo en cada movimiento.
 * Sigue habiendo como mucho un fotograma pendiente —que era el objetivo— pero
 * ahora es imposible quedarse esperando uno que no va a venir.
 */
let solicitud = 0;

function pintar(): void {
  solicitud = 0;

  /*
   * 🔴 El halo se MUEVE, no se vuelve a dibujar — y esta es la corrección que
   * arregla los botones que «se sentían deshabilitados».
   *
   * Antes esto escribía `--cursor-x` / `--cursor-y` en `<html>` y el degradado de
   * la capa se recentraba desde ahí. Una variable en la RAÍZ invalida el estilo
   * calculado de todo lo que la hereda, o sea del documento entero. Medido en el
   * v2 desplegado, con 627 nodos:
   *
   *     escribir las dos variables en `<html>` ....... 3.35 ms
   *     escribir cuatro en una tarjeta ............... 0.06 ms
   *     mover esta capa con `transform` ............. 0.002 ms
   *
   * 3.35 ms es la quinta parte de un fotograma a 60 Hz, y se pagaban en CADA
   * movimiento del ratón, en TODAS las páginas — más el repintado de una capa a
   * pantalla completa que además iba por encima del contenido. Con la página
   * ocupada (vídeo, marquesina, anuncios) el hilo principal no llegaba, y lo
   * primero que se pierde cuando no llega es la respuesta al puntero: el `:hover`
   * entra tarde, el cursor no cambia a manita y el botón parece muerto. Era eso,
   * no el estilo del botón.
   *
   * Con la posición en un `transform` sobre una capa promovida, mover el halo lo
   * resuelve el compositor: cero recálculo de estilo y cero repintado.
   */
  const capa = capaHalo();
  if (capa) capa.style.transform = `translate3d(${vx}px, ${vy}px, 0)`;

  const el = pendiente;
  if (!el) return;

  /*
   * 🔴 La CAJA de la tarjeta se mide AQUÍ, dentro del fotograma, y no en el
   * manejador del puntero.
   *
   * `getBoundingClientRect()` obliga al navegador a resolver la maquetación en el
   * acto. Suelto cuesta nada (0.001 ms medidos), pero dentro de un `pointermove`
   * el precio no es suyo: es el de recalcular todo lo que quedara pendiente en ese
   * momento — y en esta página siempre hay algo, entre los anuncios que llegan y
   * se redimensionan, la marquesina y el vídeo. Pedirlo decenas de veces por
   * segundo, cada una posiblemente detrás de una maquetación sucia, es el patrón
   * que hace que el puntero se sienta pegajoso.
   *
   * En el fotograma se mide una vez, ya con la maquetación asentada, que además es
   * la posición que de verdad se va a pintar.
   */
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const x = ((vx - r.left) / r.width) * 100;
  const y = ((vy - r.top) / r.height) * 100;

  el.style.setProperty('--mx', `${x}%`);
  el.style.setProperty('--my', `${y}%`);

  /*
   * 🔴 Los mismos datos, CENTRADOS y sin unidad: -1 en un borde, 0 en el centro,
   * 1 en el otro.
   *
   * `--mx`/`--my` van en porcentaje porque es lo que quiere un `radial-gradient`.
   * Pero para inclinar o desplazar hace falta un número con signo que se pueda
   * multiplicar por grados o por píxeles, y en CSS no se puede dividir un
   * porcentaje para obtenerlo. Publicar los dos pares cuesta dos escrituras más en
   * el mismo fotograma y evita duplicar la lógica en cada regla.
   */
  el.style.setProperty('--cx', ((x - 50) / 50).toFixed(3));
  el.style.setProperty('--cy', ((y - 50) / 50).toFixed(3));
}

function alMover(e: PointerEvent): void {
  /*
   * 🔴 Solo puntero FINO. En una pantalla táctil un `pointermove` llega con el
   * dedo ya encima, así que la luz aparecería de golpe bajo el pulgar, tapando lo
   * que se intenta leer y sin que nadie la haya buscado. El efecto es de ratón.
   */
  if (e.pointerType !== 'mouse') return;

  vx = e.clientX;
  vy = e.clientY;

  /*
   * El halo se enciende en el PRIMER movimiento, no antes. Si la capa naciera
   * visible, se pintaría en la esquina superior izquierda hasta que alguien moviera
   * el ratón — una mancha de luz en un rincón, sin explicación.
   *
   * ⚠️ Y se escribe UNA vez, no en cada movimiento. Chrome descarta el atributo
   * que no cambia y ahí no costaba nada (medido: 0.001 ms), pero eso es una
   * optimización de un motor, no una garantía: la guarda hace que el precio sea
   * cero en todos.
   */
  if (document.documentElement.dataset.cursor === undefined) {
    document.documentElement.dataset.cursor = '';
  }

  /*
   * Aquí solo se APUNTA sobre qué tarjeta está el cursor. Medirla es trabajo del
   * fotograma; ver el comentario de `pintar()`.
   */
  pendiente = (e.target as Element | null)?.closest<HTMLElement>('[data-luz]') ?? null;

  /*
   * Un solo fotograma pendiente para todo el documento. `pointermove` dispara
   * decenas de veces por segundo y escribir una variable CSS obliga a recalcular
   * estilo: sin esta cola, mover el ratón en diagonal sobre una rejilla de
   * tarjetas basta para que se note.
   *
   * Se cancela el pendiente y se pide otro, en vez de no pedir nada si ya hay uno.
   * Ver el comentario de `solicitud`: la versión con candado se moría si un
   * fotograma no llegaba.
   */
  if (solicitud) cancelAnimationFrame(solicitud);
  solicitud = requestAnimationFrame(pintar);
}

export function prepararCursor(): void {
  const w = window as Window & { __beatCursorListo?: boolean };
  if (w.__beatCursorListo) return;
  w.__beatCursorListo = true;

  /*
   * Si el visitante pidió menos movimiento, no se engancha nada. La luz sigue al
   * cursor de forma continua, que es justo lo que esa preferencia apaga.
   */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /*
   * Un solo oyente en el documento, no uno por tarjeta. Con `pointermove` sobre
   * decenas de elementos el coste de registrar y limpiar oyentes en cada
   * navegación supera al del efecto — y este no hay que volver a montarlo nunca.
   */
  document.addEventListener('pointermove', alMover, { passive: true });

  /*
   * Al salir el cursor de la ventana el halo se apaga. Si no, se queda encendido
   * en el último punto donde estuvo, y una luz fija donde no hay cursor deja de
   * leerse como respuesta y pasa a leerse como una mancha.
   */
  document.addEventListener('pointerleave', () => {
    delete document.documentElement.dataset.cursor;
  });

  /*
   * Al salir de una tarjeta se devuelven sus valores al centro. Si no, la última
   * posición se queda grabada: la tarjeta se quedaría inclinada mientras el hover
   * se apaga, y al volver a entrar arrancaría torcida desde donde se quedó.
   */
  document.addEventListener(
    'pointerout',
    (e) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-luz]');
      if (!el || el.contains(e.relatedTarget as Node | null)) return;
      el.style.setProperty('--cx', '0');
      el.style.setProperty('--cy', '0');
      if (pendiente === el) pendiente = null;
    },
    { passive: true },
  );
  document.addEventListener('pointerenter', () => {
    document.documentElement.dataset.cursor = '';
  });
}
