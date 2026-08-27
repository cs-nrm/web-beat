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
const CUANTAS = 9;

/** El paso de la cuadrícula, para que la luz caiga SOBRE una línea y no entre dos. */
const PASO = 48;

/**
 * Velocidad, en píxeles por segundo. 🔴 Velocidad, no duración — y la diferencia
 * importa.
 *
 * Antes se sorteaba una DURACIÓN igual para los dos ejes, pero los dos ejes no
 * recorren lo mismo: en una ventana de 1440×900 una horizontal cruza ~1700px y una
 * vertical ~1100. Con la misma duración, las verticales iban un 35% más lentas —
 * que es justo lo que se siente como "va lento" sin poder señalar cuál.
 *
 * Sorteando la velocidad y calculando la duración a partir del recorrido real,
 * todas se mueven igual de rápido a la vista, y estos dos números significan lo que
 * dicen: son la perilla para ajustar el ritmo.
 */
const VELOCIDAD_MIN = 160;
const VELOCIDAD_MAX = 330;

/** Lo que asoma por fuera de la ventana: el largo de la propia luz. Ver el CSS. */
const LARGO_H = 260;
const LARGO_V = 200;

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

  // El recorrido incluye el largo de la luz: entra y sale del todo por los bordes.
  const recorrido = horizontal
    ? window.innerWidth + LARGO_H
    : window.innerHeight + LARGO_V;
  const segundos = recorrido / entre(VELOCIDAD_MIN, VELOCIDAD_MAX);

  luz.className = horizontal ? 'es-h' : 'es-v';
  luz.style.setProperty('--linea', `${linea}px`);
  luz.style.setProperty('--dur', `${segundos.toFixed(2)}s`);
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

/**
 * Las estelas de marca se encienden de vez en cuando.
 *
 * 🔴 Por qué hacía falta: son el motivo del design system sobre la foto de
 * portada, y estaban clavadas. Se les había puesto una deriva de ±2.5% en 19
 * segundos, que sobre el papel es movimiento y en pantalla es nada — Carlos lo
 * notó enseguida.
 *
 * Y por qué NO se vuelven blancas, que era la otra idea: el naranja es el motivo
 * de marca. Volverlas blancas las haría indistinguibles de las luces de la
 * cuadrícula y el sitio perdería una de sus dos firmas visuales. Lo que sí se
 * puede es que un punto BLANCO las recorra: la estela conserva su color como base
 * y la luz que pasa por ella es la misma gramática de la cuadrícula. Se gana el
 * movimiento sin gastar la marca.
 *
 * ✨ Esto además resuelve que arriba no se vieran luces: la capa de la cuadrícula
 * va en `z-index: -1` y el mosaico ocupa todo el ancho con fondos opacos, así que
 * ahí no tenía por dónde asomar. La parte de arriba se anima por su cuenta.
 */
function encenderEstela(estela: HTMLElement): void {
  estela.style.setProperty('--dur-pasa', `${entre(1.1, 2.2).toFixed(2)}s`);
  estela.classList.add('es-pasa');
}

function programarEstela(estela: HTMLElement): void {
  /*
   * Una sola vez por elemento. `astro:page-load` puede dispararse sobre un DOM que
   * ya se procesó —al volver con el botón de atrás, por ejemplo— y sin esto se
   * apilarían oyentes y temporizadores: la estela acabaría parpadeando varias veces
   * a la vez, cada vez más seguido.
   */
  if ('estelaLista' in estela.dataset) return;
  estela.dataset.estelaLista = '';

  estela.addEventListener('animationend', (e) => {
    if ((e as AnimationEvent).animationName !== 'estela-pasa') return;
    estela.classList.remove('es-pasa');
    window.setTimeout(() => encenderEstela(estela), entre(3500, 14000));
  });
  window.setTimeout(() => encenderEstela(estela), entre(1200, 9000));
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

  /*
   * Las estelas SÍ se rehacen en cada navegación, al revés que la capa de la
   * cuadrícula: viven dentro del contenido, así que al cambiar de página el
   * navegador las sustituye por otras y las anteriores dejan de existir.
   */
  const montarEstelas = (): void => {
    document
      .querySelectorAll<HTMLElement>('.mosaico-estelas .beat-streak')
      .forEach(programarEstela);
  };
  montarEstelas();
  document.addEventListener('astro:page-load', montarEstelas);
}
