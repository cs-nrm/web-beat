/**
 * El texto se DESCIFRA conforme se lee.
 *
 * Cada letra empieza siendo otra —un carácter al azar que va cambiando— y al
 * llegar el scroll se revela la real, de izquierda a derecha. Es lo que Carlos
 * pidió: "como si se escribiera otra cosa y al llegar el scroll se revela el texto
 * real".
 *
 * 🔴 El texto real NUNCA depende de esto para existir. Va completo en el HTML del
 * servidor; el revoltijo lo monta el navegador encima. Si el JS falla, si el
 * navegador no lo soporta o si alguien pidió menos movimiento, se lee el titular
 * de siempre. Un efecto no puede ser la única vía al contenido.
 *
 * 🔴 Y el original queda en `aria-label` con las letras en `aria-hidden`, así que
 * un lector de pantalla anuncia el titular de verdad y no el revoltijo — que sería
 * el destrozo silencioso clásico de estos efectos.
 */

/** Los caracteres del revoltijo, separados por caja para no romper la silueta. */
const REVOLTIJO_ALTA = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789#%&/*+=<>';
const REVOLTIJO_BAJA = 'abcdefghijklmnñopqrstuvwxyz0123456789#%&/*+=<>';

interface Letra {
  el: HTMLElement;
  real: string;
  fuente: string;
  /** Qué se está mostrando ahora, para no reescribir el DOM sin necesidad. */
  puesto: string;
}

interface Texto {
  el: HTMLElement;
  letras: Letra[];
  resueltas: number;
}

const textos: Texto[] = [];
let pendiente = false;
let cuadro = 0;

const alAzar = (fuente: string): string => fuente[Math.floor(Math.random() * fuente.length)];

/**
 * Parte el texto en letras.
 *
 * Se envuelve PALABRA por palabra y las letras van dentro: partir en letras
 * sueltas rompe el salto de línea, porque el navegador puede cortar en medio de
 * una palabra al ser cada letra una caja independiente.
 */
function partir(el: HTMLElement): Letra[] {
  /*
   * 🔴 Solo texto plano. Partir en letras implica vaciar el elemento y
   * reconstruirlo, así que sobre un párrafo con marcado —un enlace, una negrita,
   * un `code`— el efecto se llevaría por delante el enlace entero. Es un destrozo
   * silencioso: compila, se ve bien y la nota pierde sus ligas. En vez de intentar
   * preservar el marcado, esto se NIEGA a actuar sobre él.
   */
  if (el.children.length) return [];

  /*
   * 🔴 Solo texto GRANDE, y esto es una garantía de contraste, no una preferencia
   * estética. Las letras sin resolver van al 40% de opacidad; WCAG 1.4.3 pide
   * 4.5:1 para texto normal y 3:1 para texto grande (≥24px, o ≥18.66px en
   * negrita). Medido sobre nuestro fondo, a 0.4 el blanco de display da 3.37:1
   * —pasa como grande, falla como normal— y una bajada gris de 16px da 2.37:1.
   *
   * O sea que el efecto solo es legítimo sobre display, y se comprueba aquí en vez
   * de dejarlo escrito en un comentario que alguien va a saltarse.
   */
  const cs = getComputedStyle(el);
  const px = parseFloat(cs.fontSize);
  const negrita = parseInt(cs.fontWeight, 10) >= 700;
  if (!(px >= 24 || (px >= 18.66 && negrita))) return [];

  const original = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!original) return [];

  el.setAttribute('aria-label', original);
  el.textContent = '';

  const letras: Letra[] = [];
  original.split(' ').forEach((palabra, i, todas) => {
    const cajaPalabra = document.createElement('span');
    cajaPalabra.className = 'escribir-palabra';
    cajaPalabra.setAttribute('aria-hidden', 'true');

    for (const caracter of palabra) {
      const caja = document.createElement('span');
      caja.className = 'escribir-letra';
      caja.textContent = caracter;
      cajaPalabra.appendChild(caja);
      letras.push({
        el: caja,
        real: caracter,
        // La caja se respeta: una mayúscula se sustituye por mayúsculas.
        fuente: caracter === caracter.toUpperCase() ? REVOLTIJO_ALTA : REVOLTIJO_BAJA,
        puesto: caracter,
      });
    }
    el.appendChild(cajaPalabra);

    // El espacio va FUERA de la palabra, para que ahí sí pueda cortar la línea.
    if (i < todas.length - 1) {
      const espacio = document.createElement('span');
      espacio.setAttribute('aria-hidden', 'true');
      espacio.textContent = ' ';
      el.appendChild(espacio);
    }
  });
  return letras;
}

/**
 * Congela el ancho de cada letra al de su carácter REAL.
 *
 * 🔴 Sin esto el efecto sacude la página. Una `W` y una `i` no miden lo mismo, así
 * que al ir cambiando de carácter la palabra cambia de ancho, y en un titular de
 * 52px eso reacomoda los saltos de línea en cada fotograma.
 *
 * ✨ El ancho que se congela es el del carácter real, así que cuando el bloque
 * termina de resolverse el candado ya no cambia nada y se puede quitar: el estado
 * final queda idéntico al diseñado.
 *
 * Se MIDE todo primero y se ESCRIBE todo después. Intercalar las dos cosas obliga
 * al navegador a recalcular la maquetación en cada vuelta.
 */
function congelarAnchos(letras: Letra[]): void {
  const anchos = letras.map((l) => l.el.getBoundingClientRect().width);
  letras.forEach((l, i) => {
    l.el.style.width = `${anchos[i].toFixed(2)}px`;
  });
}

function descongelar(letras: Letra[]): void {
  for (const l of letras) l.el.style.width = '';
}

/**
 * Cuánto se ha descifrado del bloque, de 0 a 1.
 *
 * Empieza en cuanto su borde superior asoma por el 95% de la pantalla y termina
 * cuando su borde inferior llega al 35%, o sea ANTES de que el bloque llegue al
 * centro: si terminara al salir, uno leería el final todavía en revoltijo.
 *
 * El recorrido es de 0.6 × el alto del viewport (540px en una pantalla de 900).
 * Cuanto más largo el trecho, más se lee como escritura y menos como interruptor.
 */
function avance(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  const alto = window.innerHeight;
  const inicio = alto * 0.95;
  const fin = alto * 0.35;
  const recorrido = r.top - fin + (r.height || 1);
  const total = inicio - fin + (r.height || 1);
  return Math.min(1, Math.max(0, 1 - recorrido / total));
}

/**
 * Pinta el estado actual.
 *
 * Primero se mide TODO y después se escribe, por lo mismo que en `congelarAnchos`.
 * Y solo se toca el DOM de la letra que de verdad cambia de carácter.
 */
function pintar(): void {
  pendiente = false;
  cuadro++;
  // El revoltijo se remueve cada 3 fotogramas (~20/s). A 60 parpadea de más.
  const remover = cuadro % 3 === 0;

  const objetivos = textos.map((t) => Math.round(avance(t.el) * t.letras.length));

  textos.forEach((t, n) => {
    const objetivo = objetivos[n];
    const total = t.letras.length;
    const parcial = objetivo > 0 && objetivo < total;

    // Nada que hacer: ya está resuelto del todo y sin candados que quitar.
    if (objetivo === t.resueltas && !parcial && !remover) return;

    for (let i = 0; i < total; i++) {
      const l = t.letras[i];
      if (i < objetivo) {
        if (l.puesto !== l.real) {
          l.el.textContent = l.real;
          l.puesto = l.real;
          l.el.dataset.on = '';
        }
      } else if (remover || l.puesto === l.real) {
        const c = alAzar(l.fuente);
        l.el.textContent = c;
        l.puesto = c;
        delete l.el.dataset.on;
      }
    }

    /*
     * Al completarse se sueltan los candados de ancho: ya sobran —cada letra
     * muestra su carácter real— y sin ellos vuelve el kerning del diseño.
     */
    if (objetivo === total && t.resueltas !== total) descongelar(t.letras);
    else if (objetivo < total && t.resueltas === total) congelarAnchos(t.letras);

    t.resueltas = objetivo;
  });

  /*
   * 🔴 Aquí NO se pide otro fotograma. Hubo una versión que se auto-repetía
   * mientras algún bloque estuviera a medias, para que el revoltijo siguiera
   * vivo con el scroll quieto — pero eso significa girar a 60 fps para siempre
   * en cuanto alguien se para a media revelación. Un efecto decorativo no puede
   * dejar el teléfono trabajando indefinidamente.
   *
   * El revoltijo se mueve con el scroll, que es cuando se está mirando. Parado,
   * se congela — y se lee como una revelación en pausa, no como un error.
   */
}

function alDesplazar(): void {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(pintar);
}

function iniciar(): void {
  textos.length = 0;
  pendiente = false;

  /*
   * Si el lector pidió menos movimiento no se parte nada: el bloque se queda como
   * vino del servidor, con su texto real. Es más limpio que partirlo y resolverlo
   * de golpe — y evita el destrozo del lector de pantalla.
   */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll<HTMLElement>('[data-escribir]').forEach((el) => {
    /*
     * 🔴 Si ya estaba partido, se RE-REGISTRA en vez de volver a partir.
     *
     * Pasa de verdad: al volver con el botón de atrás el navegador puede restaurar
     * el DOM ya procesado y Astro dispara `astro:page-load` otra vez. Sin esto, la
     * guarda de contenido enriquecido vería los `span` de las letras como marcado,
     * se negaría a actuar, y el titular se quedaría clavado en revoltijo.
     */
    const yaPartido = 'escribiendo' in el.dataset;
    let letras: Letra[];

    if (yaPartido) {
      const original = el.getAttribute('aria-label') ?? '';
      const cajas = Array.from(el.querySelectorAll<HTMLElement>('.escribir-letra'));
      const reales = original.replace(/ /g, '');
      letras = cajas.map((caja, i) => {
        const real = reales[i] ?? caja.textContent ?? '';
        return {
          el: caja,
          real,
          fuente: real === real.toUpperCase() ? REVOLTIJO_ALTA : REVOLTIJO_BAJA,
          puesto: caja.textContent ?? '',
        };
      });
    } else {
      letras = partir(el);
    }

    if (!letras.length) return;
    el.dataset.escribiendo = '';
    congelarAnchos(letras);
    /*
     * `-1`, no `0`: obliga a que el primer pintado recorra las letras y las
     * revuelva. Con `0` la salida temprana de `pintar()` daba por bueno el estado
     * —cero resueltas, cero objetivo— y el bloque se quedaba mostrando su texto
     * REAL hasta que algo más lo tocara. O sea, sin efecto.
     */
    textos.push({ el, letras, resueltas: -1 });
  });

  if (textos.length) pintar();
}

export function prepararEscritura(): void {
  const w = window as Window & { __beatEscrituraLista?: boolean };
  if (w.__beatEscrituraLista) return;
  w.__beatEscrituraLista = true;

  document.addEventListener('astro:page-load', iniciar);
  addEventListener('scroll', alDesplazar, { passive: true });
  addEventListener('resize', alDesplazar, { passive: true });
}
