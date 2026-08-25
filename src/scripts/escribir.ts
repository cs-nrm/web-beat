/**
 * El texto se DESCIFRA al aparecer.
 *
 * Cada letra arranca siendo otra —un carácter al azar que va cambiando— y se
 * revela la real, de izquierda a derecha, en cuanto el bloque entra en pantalla.
 *
 * 🔴 La animación va por TIEMPO, no atada al scroll. Hubo una versión atada al
 * scroll y el defecto salta a la vista: si el lector no baja lo suficiente, el
 * titular se queda a medio descifrar y ahí se queda. Un titular a medias no es un
 * efecto, es un texto roto. Disparando al entrar en pantalla, la animación siempre
 * termina — se baje como se baje.
 *
 * 🔴 El texto real NUNCA depende de esto para existir. Va completo en el HTML del
 * servidor; el revoltijo lo monta el navegador encima. Si el JS falla, si el
 * navegador no lo soporta o si alguien pidió menos movimiento, se lee el titular
 * de siempre.
 *
 * 🔴 Y el original queda en `aria-label` con las letras en `aria-hidden`, así que
 * un lector de pantalla anuncia el titular de verdad y no el revoltijo — que sería
 * el destrozo silencioso clásico de estos efectos.
 */

/** Los caracteres del revoltijo, separados por caja para no romper la silueta. */
const REVOLTIJO_ALTA = 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ0123456789#%&/*+=<>';
const REVOLTIJO_BAJA = 'abcdefghijklmnñopqrstuvwxyz0123456789#%&/*+=<>';

/**
 * Cuánto dura. Crece con el largo del texto para que un titular de 30 letras no
 * se despache en el mismo tiempo que uno de 10, con tope para que uno muy largo no
 * se eternice.
 */
const DURACION_BASE = 950;
const DURACION_POR_LETRA = 30;
const DURACION_TOPE = 2800;

/** Cada 3 fotogramas (~20/s). A 60 el revoltijo parpadea de más. */
const CADA_CUANTOS_CUADROS = 3;

interface Letra {
  el: HTMLElement;
  real: string;
  fuente: string;
  /**
   * En qué punto del avance (0–1) le toca resolverse. Va sobre todo por posición
   * —de izquierda a derecha— con una pizca de azar para que no sea una marcha
   * rígida: unas letras se adelantan y otras se quedan, que es como se lee un
   * descifrado de verdad.
   */
  umbral: number;
  /** Qué se está mostrando ahora, para no reescribir el DOM sin necesidad. */
  puesto: string;
}

interface Texto {
  el: HTMLElement;
  letras: Letra[];
  duracion: number;
  /** Marca de tiempo del arranque, o `null` si todavía no ha entrado en pantalla. */
  arranque: number | null;
  listo: boolean;
  /** El temporizador de rescate; ver `arrancar()`. */
  rescate: number | null;
}

const textos: Texto[] = [];
let corriendo = false;
let cuadro = 0;
let vigia: IntersectionObserver | null = null;

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
        umbral: 0,
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

  // 80% posición, 20% azar. Ver el comentario de `Letra.umbral`.
  const n = letras.length;
  letras.forEach((l, i) => {
    l.umbral = (i / n) * 0.8 + Math.random() * 0.2;
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
 * final queda idéntico al diseñado, con su kerning.
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

/** Deja el bloque en su texto real y suelta los candados de ancho. */
function rematar(t: Texto): void {
  for (const l of t.letras) {
    if (l.puesto !== l.real) {
      l.el.textContent = l.real;
      l.puesto = l.real;
    }
    l.el.dataset.on = '';
    l.el.style.width = '';
  }
  t.listo = true;
  t.arranque = null;
  if (t.rescate !== null) {
    clearTimeout(t.rescate);
    t.rescate = null;
  }
}

/**
 * Arranca el descifrado de un bloque.
 *
 * 🔴 El temporizador de rescate no es paranoia. La animación va por
 * `requestAnimationFrame`, que el navegador DETIENE en una pestaña oculta. Si
 * alguien abre el sitio en segundo plano, el bloque se queda revuelto; y si por lo
 * que sea los fotogramas nunca llegan, se queda revuelto para siempre — o sea, un
 * titular ilegible de forma permanente. `setTimeout` sí corre en segundo plano
 * (ralentizado), así que garantiza que el texto real acabe en pantalla pase lo que
 * pase.
 */
function arrancar(t: Texto): void {
  if (t.listo || t.arranque !== null) return;
  t.arranque = performance.now();
  t.rescate = window.setTimeout(() => rematar(t), t.duracion + 2000);

  if (!corriendo) {
    corriendo = true;
    requestAnimationFrame(pintar);
  }
}

/**
 * Pinta un fotograma.
 *
 * Solo se toca el DOM de la letra que de verdad cambia de carácter, y el bucle se
 * apaga solo en cuanto no queda ningún bloque a medias.
 */
function pintar(ahora: number): void {
  cuadro++;
  const remover = cuadro % CADA_CUANTOS_CUADROS === 0;
  let vivos = 0;

  for (const t of textos) {
    if (t.listo || t.arranque === null) continue;

    const bruto = Math.min(1, (ahora - t.arranque) / t.duracion);
    // Suavizado de salida: entra decidido y se asienta al final.
    const avance = bruto * (2 - bruto);

    if (bruto >= 1) {
      rematar(t);
      continue;
    }
    vivos++;

    for (const l of t.letras) {
      if (avance >= l.umbral) {
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
  }

  if (vivos) requestAnimationFrame(pintar);
  else corriendo = false;
}

function iniciar(): void {
  vigia?.disconnect();
  textos.length = 0;
  corriendo = false;

  /*
   * En una pestaña OCULTA no se hace nada y se reintenta al mirarla.
   *
   * ⚠️ Esto ya NO es la defensa contra dejar el texto revuelto —de eso se encarga
   * el orden del observador, más abajo—. Se queda por dos razones propias: evita
   * partir el texto en cientos de `span` para nadie, y mantiene el buscador del
   * navegador funcionando sobre el titular real mientras la pestaña esté al fondo.
   */
  if (document.visibilityState === 'hidden') {
    document.addEventListener('visibilitychange', function alVerse() {
      if (document.visibilityState !== 'hidden') {
        document.removeEventListener('visibilitychange', alVerse);
        iniciar();
      }
    });
    return;
  }

  /*
   * Si el lector pidió menos movimiento no se parte nada: el bloque se queda como
   * vino del servidor, con su texto real. Es más limpio que partirlo y resolverlo
   * de golpe — y evita el destrozo del lector de pantalla.
   */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const porElemento = new Map<Element, Texto>();

  document.querySelectorAll<HTMLElement>('[data-escribir]').forEach((el) => {
    /*
     * 🔴 Si ya estaba partido, se RE-REGISTRA en vez de volver a partir.
     *
     * Pasa de verdad: al volver con el botón de atrás el navegador puede restaurar
     * el DOM ya procesado y Astro dispara `astro:page-load` otra vez. Sin esto, la
     * guarda de contenido enriquecido vería los `span` de las letras como marcado,
     * se negaría a actuar, y el titular se quedaría clavado en revoltijo.
     */
    let letras: Letra[];
    if ('escribiendo' in el.dataset) {
      const reales = (el.getAttribute('aria-label') ?? '').replace(/ /g, '');
      const cajas = Array.from(el.querySelectorAll<HTMLElement>('.escribir-letra'));
      const n = cajas.length;
      letras = cajas.map((caja, i) => {
        const real = reales[i] ?? caja.textContent ?? '';
        /*
         * 🔴 Se DEVUELVE la letra real antes de nada. Por lo mismo que en
         * `revelar.ts`: el revoltijo vive en el DOM y el DOM sobrevive a la
         * navegación, así que un titular podía volver revuelto de una visita
         * anterior. Se parte del texto legible; si el observador entrega, lo
         * revuelve él.
         */
        caja.textContent = real;
        return {
          el: caja,
          real,
          fuente: real === real.toUpperCase() ? REVOLTIJO_ALTA : REVOLTIJO_BAJA,
          umbral: (i / n) * 0.8 + Math.random() * 0.2,
          puesto: real,
        };
      });
    } else {
      letras = partir(el);
    }
    if (!letras.length) return;

    el.dataset.escribiendo = '';
    /*
     * Los anchos se miden AQUÍ, con el texto real en pantalla — es el único
     * momento en que se pueden medir bien. Congelarlos no esconde nada.
     */
    congelarAnchos(letras);

    const t: Texto = {
      el,
      letras,
      duracion: Math.min(DURACION_TOPE, DURACION_BASE + letras.length * DURACION_POR_LETRA),
      arranque: null,
      listo: false,
      rescate: null,
    };
    textos.push(t);
    porElemento.set(el, t);
  });

  if (!textos.length) return;

  /*
   * Se dispara cuando el bloque está bien dentro de la pantalla, no al asomar por
   * el borde: si arrancara en el filo, la mitad del descifrado ocurriría fuera de
   * la vista. El margen inferior recorta el 12% de abajo justo para eso.
   *
   * Y se deja de observar en cuanto arranca: cada bloque se descifra UNA vez. Que
   * se volviera a revolver al subir y bajar sería un truco, no un efecto.
   */
  /*
   * 🔴 EL ORDEN IMPORTA: no se revuelve NADA hasta que el observador entrega su
   * primera tanda, que es la prueba de que funciona.
   *
   * Al revés —revolver al arrancar y esperar que el observador lo deshaga— basta
   * con que el observador no entregue para dejar un titular ilegible de forma
   * permanente. Pasó de verdad con el efecto hermano de `revelar.ts`: 13 elementos
   * escondidos, 0 devueltos, las fotos del Home desaparecidas. Aquí la seguridad no
   * depende de que yo enumere los modos de falla: si la prueba no llega, el texto
   * real se queda donde está.
   */
  let primeraTanda = true;

  /*
   * 🔴 En la primera tanda no se cree lo que dice el observador sobre qué está en
   * pantalla: se mide. Es la misma lección que en `revelar.ts` — al volver de una
   * nota, el observador entrega mientras la transición de vista aún no ha pintado
   * los elementos, así que los reporta fuera de pantalla aunque se estén viendo. El
   * titular se revolvía y, como su intersección ya no volvía a *cambiar*, nadie lo
   * resolvía nunca.
   */
  const fueraDeVista = (el: HTMLElement): boolean => {
    const r = el.getBoundingClientRect();
    return r.top >= window.innerHeight || r.bottom <= 0 || r.height === 0;
  };

  /*
   * 🔴 La misma red que en `revelar.ts`, y aquí importa todavía más: un titular
   * revuelto no es un adorno incompleto, es texto que no se puede leer. Mira la
   * geometría de lo que sigue pendiente y lo resuelve si está a la vista, sin
   * depender de que el observador avise. Se desengancha sola al terminar.
   */
  let repescando = false;
  const repescar = (): void => {
    repescando = false;
    let quedan = false;
    for (const t2 of textos) {
      if (t2.listo || t2.arranque !== null) continue;
      if (!fueraDeVista(t2.el)) arrancar(t2);
      else quedan = true;
    }
    if (!quedan) removeEventListener('scroll', alDesplazar);
  };
  const alDesplazar = (): void => {
    if (repescando) return;
    repescando = true;
    setTimeout(repescar, 150);
  };
  addEventListener('scroll', alDesplazar, { passive: true });

  vigia = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        const el = e.target as HTMLElement;
        const t = porElemento.get(el);
        if (!t) continue;

        if (primeraTanda) {
          for (const l of t.letras) {
            const c = alAzar(l.fuente);
            l.el.textContent = c;
            l.puesto = c;
            delete l.el.dataset.on;
          }
          if (!fueraDeVista(el)) {
            // Un respiro para que el revoltijo llegue a pintarse antes de resolver.
            setTimeout(() => arrancar(t), 40);
            vigia?.unobserve(el);
          }
          continue;
        }

        if (!e.isIntersecting) continue;
        arrancar(t);
        vigia?.unobserve(el);
      }

      if (primeraTanda) {
        primeraTanda = false;
        /*
         * Una repesca, una sola vez: lo que quedó revuelto pero para entonces ya
         * está a la vista, se resuelve. Cubre el hueco entre "el observador ya
         * opinó" y "el observador volverá a opinar solo si algo cambia".
         */
        /*
         * Tres repescas acotadas, no una. Todos los fallos que hemos cazado
         * ocurren en la ventana de carga o de navegación —la maquetación se
         * acomoda, se restaura el scroll, acaba la transición de vista—, y una
         * sola comprobación a los 800ms puede caer antes de que eso termine.
         * Después de los 4s, el observador y el scroll ya se bastan.
         */
        for (const cuando of [800, 2000, 4000]) setTimeout(repescar, cuando);
      }
    },
    { threshold: 0.35, rootMargin: '0px 0px -12% 0px' },
  );
  for (const t of textos) vigia.observe(t.el);
}

export function prepararEscritura(): void {
  const w = window as Window & { __beatEscrituraLista?: boolean };
  if (w.__beatEscrituraLista) return;
  w.__beatEscrituraLista = true;

  /*
   * Sin `IntersectionObserver` no hay efecto, y punto. Es lo que decide cuándo
   * deshacer el revoltijo: sin él, revolver el texto sería dejarlo ilegible.
   */
  if (!('IntersectionObserver' in window)) return;

  document.addEventListener('astro:page-load', iniciar);

  /*
   * Al imprimir se resuelve todo de golpe. Un titular que el lector no llegó a ver
   * sigue revuelto en el DOM, y en papel eso saldría como basura — sin scroll que
   * lo arregle y sin vuelta atrás.
   */
  addEventListener('beforeprint', () => {
    for (const t of textos) if (!t.listo) rematar(t);
  });
}
