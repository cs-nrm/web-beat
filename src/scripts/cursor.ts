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
let x = 0;
let y = 0;
/** Posición en la ventana, para el halo que acompaña al cursor por todo el sitio. */
let vx = 0;
let vy = 0;
let encolado = false;

function pintar(): void {
  encolado = false;

  /*
   * El halo global va sobre `<html>` y en píxeles de ventana, porque su capa es
   * `position: fixed`: no depende de qué haya debajo ni de si el cursor está sobre
   * algo interactivo.
   */
  const raiz = document.documentElement;
  raiz.style.setProperty('--cursor-x', `${vx}px`);
  raiz.style.setProperty('--cursor-y', `${vy}px`);

  const el = pendiente;
  if (!el) return;
  el.style.setProperty('--mx', `${x}%`);
  el.style.setProperty('--my', `${y}%`);
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
   */
  document.documentElement.dataset.cursor = '';

  const el = (e.target as Element | null)?.closest<HTMLElement>('[data-luz]') ?? null;
  pendiente = el;

  if (el) {
    const r = el.getBoundingClientRect();
    if (r.width && r.height) {
      x = ((e.clientX - r.left) / r.width) * 100;
      y = ((e.clientY - r.top) / r.height) * 100;
    }
  }

  /*
   * Un solo fotograma pendiente para todo el documento. `pointermove` dispara
   * decenas de veces por segundo y escribir una variable CSS obliga a recalcular
   * estilo: sin esta cola, mover el ratón en diagonal sobre una rejilla de
   * tarjetas basta para que se note.
   */
  if (!encolado) {
    encolado = true;
    requestAnimationFrame(pintar);
  }
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
  document.addEventListener('pointerenter', () => {
    document.documentElement.dataset.cursor = '';
  });
}
