/**
 * El carrusel de la lista a votación del Inicio.
 *
 * Mueve el scroll de la tira y mantiene marcado el tramo que se está viendo. Nada
 * más: el deslizamiento con el dedo, el trackpad, las flechas y el tabulador los
 * hace el navegador con `scroll-snap`, y sin este archivo la tira sigue siendo
 * recorrible — el paginador es un atajo, no la única puerta.
 *
 * No avanza solo, y no es un olvido: un carrusel que se mueve sin que nadie lo
 * pida es de lo que `movimiento.md` prohíbe —«los controles contestan, no se
 * animan solos»—, y además aquí movería de sitio un botón de votar mientras
 * alguien lo apunta con el ratón.
 *
 * El suave del desplazamiento lo pone el CSS con `scroll-behavior`, ya guardado
 * tras `prefers-reduced-motion`. Por eso este archivo no elige comportamiento: si
 * lo pidiera en `scrollTo` se saltaría esa preferencia.
 */

/** Cuántas tarjetas caben a la vez. El mismo número que reparte los tramos. */
const POR_VISTA = 4;

/**
 * Qué tramo se está viendo, a partir del scroll.
 *
 * Se calcula con la POSICIÓN y no con un `IntersectionObserver`, que sería lo
 * elegante: el observador no dice «cuál manda» cuando se ven tres tarjetas a
 * medias, y aquí lo que importa es en qué tramo estás, no qué tarjeta se ve más.
 * Dividir el scroll entre el ancho de una vista contesta justo eso.
 */
function tramoVisible(tira: HTMLElement, cuantos: number): number {
  const paso = tira.clientWidth;
  if (paso <= 0) return 0;
  /*
    El último tramo casi nunca llena una vista entera, así que al llegar al final
    el cálculo se quedaría corto y marcaría el penúltimo. Cuando el scroll toca el
    tope, manda el tope.
  */
  const tope = tira.scrollWidth - paso;
  if (tope > 0 && tira.scrollLeft >= tope - 2) return cuantos - 1;
  return Math.min(cuantos - 1, Math.max(0, Math.round(tira.scrollLeft / paso)));
}

function pintar(paginas: HTMLElement, activo: number): void {
  paginas.querySelectorAll<HTMLElement>('[data-carrusel-ir]').forEach((b) => {
    b.setAttribute('aria-current', String(Number(b.dataset.carruselIr) === activo));
  });
}

function montar(tira: HTMLElement): void {
  const bloque = tira.closest('section');
  const paginas = bloque?.querySelector<HTMLElement>('[data-carrusel-paginas]');
  if (!paginas) return;

  const botones = [...paginas.querySelectorAll<HTMLElement>('[data-carrusel-ir]')];
  if (!botones.length) return;

  const actualizar = (): void => pintar(paginas, tramoVisible(tira, botones.length));

  paginas.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-carrusel-ir]');
    if (!b) return;
    const tramo = Number(b.dataset.carruselIr);
    if (!Number.isInteger(tramo)) return;

    /*
      Se mide con la TARJETA y no multiplicando por el ancho de la vista: con el
      hueco entre tarjetas, el tramo 2 no empieza exactamente en dos anchos de
      vista y el desfase se acumula tramo a tramo. La tarjeta sabe dónde está.

      Y se resta el `offsetLeft` de la PRIMERA tarjeta, no el de la tira. Es un
      fallo ya medido: con el de la tira, volver al tramo 1 dejaba el scroll en 214
      en vez de en 0 y la primera canción se quedaba cortada. Los dos `offsetLeft`
      se cuentan desde el mismo antepasado posicionado, que no tiene por qué ser la
      tira; entre hermanas, en cambio, la resta siempre da la distancia buena.
    */
    const destino = tira.children[tramo * POR_VISTA] as HTMLElement | undefined;
    const primera = tira.children[0] as HTMLElement | undefined;
    tira.scrollTo({
      left: destino && primera ? destino.offsetLeft - primera.offsetLeft : tramo * tira.clientWidth,
    });
    pintar(paginas, tramo);
  });

  /*
    `scroll` dispara en cada fotograma del deslizamiento. Se espera al hueco
    siguiente con `requestAnimationFrame` en vez de repintar sesenta veces por
    segundo, que es lo mismo que hace el resto del sitio con el scroll.
  */
  let pendiente = false;
  tira.addEventListener(
    'scroll',
    () => {
      if (pendiente) return;
      pendiente = true;
      requestAnimationFrame(() => {
        pendiente = false;
        actualizar();
      });
    },
    { passive: true },
  );

  actualizar();
}

function iniciar(): void {
  document.querySelectorAll<HTMLElement>('[data-carrusel]').forEach(montar);
}

export function prepararCarrusel(): void {
  const w = window as Window & { __beatCarruselListo?: boolean };
  if (w.__beatCarruselListo) return;
  w.__beatCarruselListo = true;
  document.addEventListener('astro:page-load', iniciar);
}
