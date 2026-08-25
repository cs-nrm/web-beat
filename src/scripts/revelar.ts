/**
 * Efectos de entrada, dirigidos por UN solo observador.
 *
 * Tres de los cuatro efectos son puro CSS. Aquí no se anima nada: se marca el
 * elemento con `data-visto` cuando entra en pantalla y la hoja de estilos hace el
 * resto. Sale más barato que animar desde JavaScript, lo resuelve el compositor
 * —o sea que no compite con el hilo principal— y deja el efecto donde se puede
 * leer y ajustar, que es el CSS.
 *
 * El cuarto, el conteo de cifras, sí necesita JavaScript porque cambia texto.
 *
 * 🔴 REGLA DE ORO: el contenido nunca depende de esto para verse.
 *
 * El estado inicial —una foto recortada, un ítem de lista transparente— solo se
 * aplica cuando este script ya marcó el elemento con `data-animando`. Sin JS, sin
 * observador o con la pestaña oculta, no se marca nada y todo se ve normal. Es la
 * misma lección que costó cara en `escribir.ts`: un documento oculto no dispara el
 * observador, así que cualquier cosa escondida "a la espera de entrar" se queda
 * escondida PARA SIEMPRE.
 */

/*
 * El retardo entre hijos vive en el CSS (`transition-delay` de `[data-cascada]`).
 * Aquí solo se pone el índice; duplicar el número en los dos lados garantizaba que
 * tarde o temprano dejaran de coincidir.
 */

/** Tope de hijos escalonados: pasado eso el retardo acumulado se hace absurdo. */
const ESCALON_TOPE = 12;

const DURACION_CONTEO = 900;

const SELECTOR = '[data-revelar], [data-cascada], [data-barrido], [data-contar]';

let vigia: IntersectionObserver | null = null;

/**
 * Sube una cifra desde cero hasta su valor real.
 *
 * 🔴 Se conserva el texto alrededor del número. Estas cifras no son números
 * pelados: son "2 PUBLICADAS", "12 MIN". Reemplazar el nodo entero borraría la
 * unidad, que es justo lo que le da sentido al dato.
 *
 * 🔴 Y el rescate no es opcional aquí, a diferencia de los otros tres efectos: si
 * la animación se queda a medias, la pantalla no muestra un adorno incompleto,
 * muestra un DATO FALSO. "0 PUBLICADAS" cuando hay dos es peor que no animar nada.
 */
function contar(el: HTMLElement): void {
  const crudo = (el.textContent ?? '').trim();
  const encontrado = crudo.match(/-?\d+(?:[.,]\d+)?/);
  if (!encontrado) return;

  const texto = encontrado[0];
  const decimales = (texto.split(/[.,]/)[1] ?? '').length;
  const separador = texto.includes(',') ? ',' : '.';
  const destino = parseFloat(texto.replace(',', '.'));
  if (!Number.isFinite(destino)) return;

  // Los ceros a la izquierda son parte del diseño: "01" no puede volverse "1".
  const ancho = texto.split(/[.,]/)[0].replace('-', '').length;
  const antes = crudo.slice(0, encontrado.index);
  const despues = crudo.slice((encontrado.index ?? 0) + texto.length);

  const pintar = (v: number): void => {
    const fijo = v.toFixed(decimales);
    const [entera, dec] = fijo.split('.');
    const rellena = entera.padStart(ancho, '0');
    el.textContent = antes + (dec ? rellena + separador + dec : rellena) + despues;
  };

  const arranque = performance.now();
  let rescate: number | null = window.setTimeout(() => {
    rescate = null;
    el.textContent = crudo;
  }, DURACION_CONTEO + 1500);

  const paso = (ahora: number): void => {
    const p = Math.min(1, (ahora - arranque) / DURACION_CONTEO);
    if (p >= 1) {
      // Se restaura la cadena ORIGINAL, no una reconstruida: cero riesgo de que el
      // formateo de aquí difiera en algo de lo que escribió el CMS.
      el.textContent = crudo;
      if (rescate !== null) clearTimeout(rescate);
      return;
    }
    pintar(destino * (1 - (1 - p) * (1 - p)));
    requestAnimationFrame(paso);
  };

  pintar(0);
  requestAnimationFrame(paso);
}

function iniciar(): void {
  vigia?.disconnect();
  vigia = null;

  /*
   * Menos movimiento: no se marca nada. Todo se ve en su estado final, que es lo
   * que el estado inicial de cada efecto está esperando de todos modos.
   */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /*
   * 🔴 Pestaña oculta: tampoco se marca nada, y se reintenta al mirarla. Un
   * documento oculto no dispara el observador, así que marcar aquí dejaría las
   * fotos recortadas y las listas transparentes de forma permanente.
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

  const objetivos = Array.from(document.querySelectorAll<HTMLElement>(SELECTOR)).filter(
    (el) => !('visto' in el.dataset),
  );
  if (!objetivos.length) return;

  for (const el of objetivos) {
    // El índice de cada hijo alimenta el retardo de la cascada, desde el CSS.
    if ('cascada' in el.dataset) {
      Array.from(el.children).forEach((hijo, i) => {
        (hijo as HTMLElement).style.setProperty('--i', String(Math.min(i, ESCALON_TOPE)));
      });
    }
    el.dataset.animando = '';
  }

  vigia = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        if (!e.isIntersecting) continue;
        const el = e.target as HTMLElement;
        el.dataset.visto = '';
        if ('contar' in el.dataset) contar(el);
        vigia?.unobserve(el);
      }
    },
    { threshold: 0.2, rootMargin: '0px 0px -8% 0px' },
  );
  for (const el of objetivos) vigia.observe(el);
}

export function prepararRevelado(): void {
  const w = window as Window & { __beatReveladoListo?: boolean };
  if (w.__beatReveladoListo) return;
  w.__beatReveladoListo = true;

  /*
   * Sin `IntersectionObserver` no se marca nada y todo se ve en su estado final.
   * Es lo que decide cuándo mostrar: sin él, esconder sería esconder para siempre.
   */
  if (!('IntersectionObserver' in window)) return;

  document.addEventListener('astro:page-load', iniciar);

  /*
   * Al imprimir se da todo por visto. Lo que el lector no alcanzó a ver sigue
   * recortado o transparente en el DOM, y en papel eso saldría en blanco.
   */
  addEventListener('beforeprint', () => {
    document.querySelectorAll<HTMLElement>('[data-animando]').forEach((el) => {
      el.dataset.visto = '';
    });
  });
}
