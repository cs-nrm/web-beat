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

/**
 * Cuándo se retira el andamiaje del efecto, en ms. Tiene que superar la transición
 * más larga que hay en `beat.css` (la escala del revelado, 1100ms).
 */
const LIMPIEZA_MS = 1400;

/*
 * ⚠️ Aquí VIVÍA `[data-revelar]`: una máscara que subía desde abajo sobre cada
 * foto. Se retiró a petición de Carlos —«una cortinilla que se abre hacia arriba»,
 * y no convencía—. El mecanismo se queda porque lo usan los otros tres efectos.
 */
const SELECTOR = '[data-cascada], [data-barrido], [data-contar]';

let vigia: IntersectionObserver | null = null;

/**
 * El oyente de scroll de la repesca actual.
 *
 * 🔴 Hay que guardarlo para poder RETIRARLO. Se crea dentro de `iniciar()`, así que
 * es un cierre distinto en cada navegación y `removeEventListener` con una función
 * nueva no quita la vieja. Sin esto, cada visita dejaba otro oyente de scroll
 * recorriendo una lista de elementos que ya no están en la página: no se ve, no da
 * error, y va cargando el scroll visita tras visita.
 */
let repescaEnCurso: (() => void) | null = null;

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
  if (repescaEnCurso) {
    removeEventListener('scroll', repescaEnCurso);
    repescaEnCurso = null;
  }

  /*
   * Menos movimiento: no se marca nada. Todo se ve en su estado final, que es lo
   * que el estado inicial de cada efecto está esperando de todos modos.
   */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  /*
   * 🔴 Se barre cualquier resto del efecto ANTES de decidir nada.
   *
   * El estado escondido vive en un atributo del DOM, y el DOM SOBREVIVE a la
   * navegación: al volver al Home desde una nota, las fotos volvían con su
   * `data-animando` puesto de la visita anterior y se quedaban en negro. Peor aún,
   * las que ya tenían `data-visto` quedaban fuera del filtro de abajo, así que
   * nadie las tocaba nunca más.
   *
   * Quitando la marca aquí, todo arranca desde el estado natural —visible— y a
   * partir de ahí se decide limpio. Un resto de una visita anterior no puede
   * esconder nada.
   */
  document.querySelectorAll<HTMLElement>('[data-animando]').forEach((el) => {
    delete el.dataset.animando;
  });

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
  }

  /*
   * 🔴 EL ORDEN IMPORTA, y es la corrección más importante de este archivo.
   *
   * La versión anterior escondía todo al arrancar y esperaba que el observador lo
   * devolviera. Resultado real, no hipotético: 13 elementos escondidos y 0
   * devueltos — las fotos del Home desaparecieron. Bastaba con que el observador no
   * entregara para que el contenido quedara invisible de forma permanente.
   *
   * Aquí no se esconde NADA hasta que el observador entrega su primera tanda, que
   * es la prueba de que funciona. Si no entrega nunca —pestaña oculta, motor sin
   * soporte, lo que sea— sencillamente no se esconde nada y la página se ve
   * completa. La seguridad deja de depender de que yo enumere los modos de falla.
   *
   * En esa primera tanda, lo que ya está en pantalla se esconde y se revela
   * enseguida, para que la animación se vea igual. Lo que está más abajo se esconde
   * y espera su turno.
   */
  let primeraTanda = true;

  /*
   * 🔴 En la primera tanda NO se cree lo que dice el observador sobre qué está en
   * pantalla: se mide.
   *
   * Al volver al Home desde una nota, el observador entrega su primera tanda
   * mientras la transición de vista todavía tiene los elementos sin pintar, así
   * que los reporta FUERA de pantalla aunque estén a la vista. Se escondían, y como
   * su intersección ya no volvía a *cambiar*, el observador no disparaba otra vez y
   * se quedaban escondidos. Medido: 2 de 5 imágenes, en pantalla y en negro.
   *
   * La geometría no tiene ese problema — dice dónde está el elemento ahora mismo.
   */
  const fueraDeVista = (el: HTMLElement): boolean => {
    const r = el.getBoundingClientRect();
    return r.top >= window.innerHeight || r.bottom <= 0 || r.height === 0;
  };

  const revelar = (el: HTMLElement): void => {
    el.dataset.visto = '';
    if ('contar' in el.dataset) contar(el);
    vigia?.unobserve(el);

    /*
     * 🔴 Al terminar se RETIRA el andamiaje, y esto es lo que garantiza el
     * resultado.
     *
     * Hasta aquí el estado final dependía de que una transición CSS llegara a su
     * fin: si no corría —por lo que fuera— la foto se quedaba en
     * `clip-path: inset(100%)`, o sea invisible para siempre. Un efecto decorativo
     * no puede tener como modo de falla "el contenido no aparece".
     *
     * Quitando `data-animando` dejan de aplicar TANTO la regla del escondido como
     * la del revelado, y el elemento vuelve a su estado natural, sin recorte y sin
     * escala. Ese estado no depende de ninguna animación: es simplemente el
     * elemento sin nada encima.
     *
     * `data-visto` se conserva porque es la marca de "este ya está hecho" que mira
     * `iniciar()` para no volver a esconderlo en la siguiente navegación.
     */
    setTimeout(() => {
      delete el.dataset.animando;
    }, LIMPIEZA_MS);
  };

  /*
   * 🔴 La red de seguridad: una repesca por GEOMETRÍA, atada al scroll.
   *
   * El observador es el camino principal y funciona. Pero mientras el único modo
   * de volver a mostrar algo dependa de que él avise, existe la posibilidad de que
   * un elemento se quede escondido para siempre — y eso ya pasó dos veces.
   *
   * Esto no depende de él: mira dónde está cada pendiente y revela lo que esté a
   * la vista. Va sobre el evento de scroll, así que no cuesta nada cuando nadie se
   * mueve, y se desengancha sola en cuanto no queda nada pendiente.
   */
  let repescando = false;
  const repescar = (): void => {
    repescando = false;
    let quedan = false;
    for (const el of objetivos) {
      if ('visto' in el.dataset) continue;
      if (!fueraDeVista(el)) revelar(el);
      else quedan = true;
    }
    if (!quedan) removeEventListener('scroll', alDesplazar);
  };
  const alDesplazar = (): void => {
    if (repescando) return;
    repescando = true;
    setTimeout(repescar, 150);
  };
  repescaEnCurso = alDesplazar;
  addEventListener('scroll', alDesplazar, { passive: true });

  vigia = new IntersectionObserver(
    (entradas) => {
      for (const e of entradas) {
        const el = e.target as HTMLElement;

        if (primeraTanda) {
          el.dataset.animando = '';
          if (!fueraDeVista(el)) {
            /*
             * Un respiro antes de revelar: el navegador tiene que llegar a pintar
             * el estado escondido, o no hay transición que animar — saltaría del
             * estado final al estado final.
             */
            setTimeout(() => revelar(el), 40);
          }
          continue;
        }

        if (e.isIntersecting) revelar(el);
      }
      if (primeraTanda) {
        primeraTanda = false;
        /*
         * Una repesca, una sola vez. Si algo quedó escondido pero para entonces ya
         * está a la vista —la maquetación se acomodó, se restauró el scroll, acabó
         * la transición—, se revela. Cubre el hueco entre "el observador ya opinó"
         * y "el observador volverá a opinar solo si algo cambia".
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
