/**
 * Luz que recorre la cuadrícula del fondo.
 *
 * Lo que pidió Carlos: que la trama deje de estar quieta, «pero no tan repetitivo
 * y no en todo, para que no se vea patrón».
 *
 * 🔴 Esas dos condiciones son el diseño entero, no un matiz:
 *
 * · NO SE VE PATRÓN porque nada se repite. Cada pasada elige de nuevo su línea, su
 *   eje, su sentido, su velocidad y cuánto espera antes de volver. Una animación
 *   CSS en bucle —que es lo que uno escribiría primero— tiene periodo fijo, y el
 *   ojo detecta esa periodicidad aunque no sepa nombrarla. Es la misma lección que
 *   ya está escrita para la onda del player.
 *
 * · NO ESTÁ EN TODO porque la capa va en `z-index: -1`: queda ENCIMA de la trama
 *   del `body` pero DEBAJO de cualquier bloque con fondo propio. Así la luz solo
 *   asoma por los huecos donde el fondo se ve y desaparece tras las secciones, que
 *   es justo lo que se busca — se lee como algo que pasa por detrás del sitio.
 *
 * ✨ Aditivo: si esto no corre, no se crea la capa y la cuadrícula se ve como
 * siempre. Nada depende de ello.
 */

/** Cuántas luces a la vez. Tres: rara vez coinciden dos, nunca parece una lluvia. */
const CUANTAS = 3;

/** El paso de la cuadrícula, para que la luz caiga SOBRE una línea y no entre dos. */
const PASO = 48;

const entre = (a: number, b: number): number => a + Math.random() * (b - a);

/**
 * Una línea de la cuadrícula elegida al azar, o `null` si no hay dónde elegir.
 *
 * 🔴 Se descartan los bordes: las dos primeras líneas y la última. Una luz pegada
 * al borde no se lee como algo que cruza el fondo, se lee como un artefacto del
 * marco — y arriba, además, queda tapada por la cabecera, así que la pasada se
 * gastaría sin que nadie la viera.
 *
 * Devuelve `null` con una ventana demasiado angosta (o si el navegador aún reporta
 * cero, que pasa en algunos arranques): mejor no lanzar y reintentar que amontonar
 * las tres luces sobre la línea cero.
 */
function lineaAlAzar(largo: number): number | null {
  const lineas = Math.floor(largo / PASO);
  if (lineas < 6) return null;
  return (2 + Math.floor(Math.random() * (lineas - 3))) * PASO;
}

function lanzar(luz: HTMLElement): void {
  const horizontal = Math.random() < 0.5;
  const alReves = Math.random() < 0.5;

  const linea = lineaAlAzar(horizontal ? window.innerHeight : window.innerWidth);
  if (linea === null) {
    // Ventana sin sitio: se reintenta más tarde en vez de amontonarlas en el borde.
    window.setTimeout(() => lanzar(luz), 4000);
    return;
  }

  luz.className = horizontal ? 'es-h' : 'es-v';
  luz.style.setProperty('--linea', `${linea}px`);
  luz.style.setProperty('--dur', `${entre(7, 15).toFixed(1)}s`);
  luz.style.setProperty('--dir', alReves ? 'reverse' : 'normal');

  /*
   * Se reinicia la animación a mano. Cambiar las variables no la relanza: el
   * navegador solo la reinicia si el nombre cambia o si el elemento sale y vuelve
   * a entrar en el árbol de animaciones.
   */
  luz.style.animation = 'none';
  void luz.offsetWidth;
  luz.style.animation = '';
}

function programar(luz: HTMLElement): void {
  luz.addEventListener('animationend', () => {
    // La espera también es al azar: con una pausa fija volvería el compás.
    window.setTimeout(() => lanzar(luz), entre(2600, 11000));
  });
  window.setTimeout(() => lanzar(luz), entre(400, 6000));
}

export function prepararRejilla(): void {
  const w = window as Window & { __beatRejillaLista?: boolean };
  if (w.__beatRejillaLista) return;
  w.__beatRejillaLista = true;

  /*
   * Menos movimiento: no se crea nada. Una luz cruzando el fondo cada pocos
   * segundos, de forma permanente y sin que nadie la pida, es exactamente lo que
   * esa preferencia existe para apagar.
   */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const capa = document.createElement('div');
  capa.className = 'rejilla-vida';
  capa.setAttribute('aria-hidden', 'true');

  for (let i = 0; i < CUANTAS; i++) {
    const luz = document.createElement('i');
    capa.appendChild(luz);
    programar(luz);
  }

  /*
   * Cuelga del `<body>` y NO se rehace en cada navegación: la capa es fija y
   * decorativa, así que sobrevive a los cambios de página igual que el player. Si
   * se recreara, las luces se reiniciarían todas a la vez en cada clic — que es
   * precisamente el compás que se quiere evitar.
   */
  document.body.appendChild(capa);
}
