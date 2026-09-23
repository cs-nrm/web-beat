/**
 * El carrusel de la lista a votación del Inicio.
 *
 * Mueve el scroll de la tira, mantiene marcado el tramo que se está viendo y lo
 * avanza solo. El deslizamiento con el dedo, el trackpad, las flechas y el
 * tabulador los hace el navegador con `scroll-snap`: sin este archivo la tira
 * sigue siendo recorrible, y el paginador es un atajo, no la única puerta.
 *
 * Sobre el avance automático. Se pidió (Carlos, 2026-09-23) después de que yo
 * pusiera el reparo, así que va — pero va con frenos, y no son de adorno: la
 * tarjeta lleva un botón de VOTAR, y un carrusel que se mueve mientras alguien lo
 * apunta le cambia la canción bajo el cursor. Un voto a la equivocada no se puede
 * deshacer desde el sitio. De ahí que se pare en cuanto haya un indicio de que
 * alguien está mirando o usando el bloque:
 *
 *   · el puntero encima
 *   · el foco dentro (quien navega con el tabulador)
 *   · el bloque fuera de la pantalla
 *   · la pestaña en segundo plano
 *   · alguien deslizando a mano, o pulsando un tramo
 *
 * Y no arranca siquiera con `prefers-reduced-motion: reduce`. Esa preferencia
 * apaga el movimiento, no lo acelera.
 */

/** Cuántas tarjetas caben a la vez. El mismo número que reparte los tramos. */
const POR_VISTA = 4;

/**
 * Cada cuánto avanza.
 *
 * Seis segundos es lo que cuesta recorrer cuatro tarjetas con la vista —título,
 * artista y carátula por cada una— sin sentir prisa. Con menos, el bloque se
 * convierte en un anuncio parpadeante; con mucho más, nadie llega a ver que se
 * mueve y el avance deja de cumplir su función, que es delatar que hay veinte.
 */
const AUTO_MS = 6000;

/** Lo que hay que soltar cuando la página se va. */
const montados: Array<() => void> = [];

/**
 * Qué tramo se está viendo, a partir del scroll.
 *
 * Se calcula con la POSICIÓN y no con un `IntersectionObserver`, que sería lo
 * elegante: el observador no dice «cuál manda» cuando se ven tres tarjetas a
 * medias, y aquí lo que importa es en qué tramo estás, no qué tarjeta se ve más.
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
  if (!bloque || !paginas) return;

  const botones = [...paginas.querySelectorAll<HTMLElement>('[data-carrusel-ir]')];
  if (!botones.length) return;

  const actualizar = (): void => pintar(paginas, tramoVisible(tira, botones.length));

  const irA = (tramo: number): void => {
    /*
      Se mide con la TARJETA y no multiplicando por el ancho de la vista: con el
      hueco entre tarjetas, el tramo 2 no empieza exactamente en dos anchos de
      vista y el desfase se acumula tramo a tramo.

      Y se resta el `offsetLeft` de la PRIMERA tarjeta, no el de la tira. Es un
      fallo ya medido: con el de la tira, volver al tramo 1 dejaba el scroll en
      214 en vez de en 0 y la primera canción se quedaba cortada. Los dos
      `offsetLeft` se cuentan desde el mismo antepasado posicionado, que aquí es
      el `body`; entre hermanas, en cambio, la resta sí da la distancia buena.
    */
    const destino = tira.children[tramo * POR_VISTA] as HTMLElement | undefined;
    const primera = tira.children[0] as HTMLElement | undefined;
    tira.scrollTo({
      left: destino && primera ? destino.offsetLeft - primera.offsetLeft : tramo * tira.clientWidth,
    });
    pintar(paginas, tramo);
  };

  // ── el avance automático ──
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let reloj: ReturnType<typeof setInterval> | undefined;
  /*
    Un CONTADOR y no un booleano. Los frenos se solapan —el puntero encima y
    además el foco dentro, o la pestaña detrás mientras se desliza— y con una
    bandera el primero que se suelta reanudaría aunque el otro siga puesto.
  */
  let frenos = 0;

  /**
   * Si hay algo que desplazar.
   *
   * En móvil no hay carrusel: la tira se apila en una columna y el paginador se
   * esconde. Sin esto, el reloj seguiría corriendo cada seis segundos para mover
   * un scroll que no existe — trabajo invisible y para nada. Se mira en cada
   * arranque y no una sola vez, porque la ventana cambia de tamaño.
   */
  const hayCarrusel = (): boolean => tira.scrollWidth > tira.clientWidth + 1;

  const arrancar = (): void => {
    if (quieto || reloj !== undefined || frenos > 0 || !hayCarrusel()) return;
    reloj = setInterval(() => {
      /*
        Segundo cinturón para el foco, y no sobra. `focusin` es la vía normal, pero
        depende de que el evento se dispare — y no siempre lo hace: si la ventana no
        tiene el foco del teclado, `.focus()` mueve el `activeElement` sin emitir
        nada (comprobado: `document.hasFocus()` en false y cero eventos). Mirar
        dónde está el foco justo antes de saltar no depende de ningún evento, y es
        el freno que más importa: a quien navega con el tabulador, moverle la
        tarjeta es dejarlo sin saber dónde está.
      */
      if (bloque.contains(document.activeElement)) return;
      irA((tramoVisible(tira, botones.length) + 1) % botones.length);
    }, AUTO_MS);
  };
  const parar = (): void => {
    if (reloj !== undefined) clearInterval(reloj);
    reloj = undefined;
  };
  const frenar = (): void => {
    frenos += 1;
    parar();
  };
  const soltar = (): void => {
    frenos = Math.max(0, frenos - 1);
    if (frenos === 0) arrancar();
  };
  /** Reinicia la cuenta: tras un gesto, el siguiente salto empieza de cero. */
  const reiniciar = (): void => {
    if (frenos > 0) return;
    parar();
    arrancar();
  };

  bloque.addEventListener('pointerenter', frenar);
  bloque.addEventListener('pointerleave', soltar);
  bloque.addEventListener('focusin', frenar);
  bloque.addEventListener('focusout', soltar);

  const alCambiarVisibilidad = (): void => (document.hidden ? frenar() : soltar());
  document.addEventListener('visibilitychange', alCambiarVisibilidad);
  /*
    Y se mira el estado DE SALIDA, no solo los cambios. `visibilitychange` solo
    avisa de las transiciones: una página abierta en una pestaña de segundo plano
    —un enlace con el botón central, una sesión restaurada— empezaría a avanzar sin
    que nadie la haya visto nunca, y llegaría al tramo 3 antes del primer vistazo.
  */
  if (document.hidden) frenos += 1;

  /*
    Fuera de la pantalla no se mueve. No es solo por ahorrar: si avanzara mientras
    nadie lo ve, quien baje hasta el bloque se lo encontraría empezado por el
    tramo 3 sin haber tocado nada.
  */
  let vigia: IntersectionObserver | undefined;
  if ('IntersectionObserver' in window) {
    let dentro = false;
    vigia = new IntersectionObserver(
      ([e]) => {
        if (!e) return;
        if (e.isIntersecting === dentro) return;
        dentro = e.isIntersecting;
        if (dentro) soltar();
        else frenar();
      },
      { threshold: 0.3 },
    );
    // Nace frenado: el observador lo suelta en cuanto el bloque entra en pantalla.
    frenos += 1;
    vigia.observe(bloque);
  }

  paginas.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement | null)?.closest<HTMLElement>('[data-carrusel-ir]');
    if (!b) return;
    const tramo = Number(b.dataset.carruselIr);
    if (!Number.isInteger(tramo)) return;
    irA(tramo);
    reiniciar();
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

  /*
    Deslizar a mano REINICIA la cuenta, y solo eso: el scroll también lo dispara
    el avance automático, así que frenar aquí lo apagaría a la primera. Lo que
    distingue al gesto humano es el puntero o el dedo encima, y de eso ya se
    encargan `pointerenter` y el propio `pointerdown`.
  */
  tira.addEventListener('pointerdown', frenar);
  tira.addEventListener('pointerup', soltar);
  tira.addEventListener('pointercancel', soltar);

  // ── el recorte de móvil ──
  /*
    En móvil no hay carrusel —la tira se apila— y veinte tarjetas seguidas son
    mucha portada. Se enseñan cuatro y las demás se piden de cuatro en cuatro
    (Carlos, 2026-09-23).

    Lo recorta el SCRIPT y no el CSS, y esa es la parte importante: es la regla de
    `movimiento.md` de que ningún efecto puede dejar el contenido inalcanzable. Con
    el recorte en la hoja de estilos, un navegador sin JavaScript se quedaría con
    dieciséis canciones que no existen y sin nada que las traiga. Sin script se ven
    las veinte y el botón no aparece.

    Suma en vez de reemplazar: lo visto se queda visto. Con cuatro a la vez y un
    salto que las cambia, quien compara dos canciones pierde la primera al buscar
    la segunda.
  */
  const boton = bloque.querySelector<HTMLElement>('[data-carrusel-mas]');
  const rotulo = boton?.querySelector<HTMLElement>('[data-carrusel-mas-texto]');
  const tarjetas = [...tira.children] as HTMLElement[];
  const enMovil = window.matchMedia('(max-width: 899px)');
  let tope = POR_VISTA;

  const pintarRecorte = (): void => {
    if (!boton) return;
    if (!enMovil.matches) {
      // En escritorio manda el carrusel: nada escondido y sin botón.
      tarjetas.forEach((t) => (t.hidden = false));
      boton.hidden = true;
      return;
    }
    tarjetas.forEach((t, i) => (t.hidden = i >= tope));
    const quedan = tarjetas.length - tope;
    boton.hidden = quedan <= 0;
    if (rotulo) rotulo.textContent = `VER ${Math.min(POR_VISTA, quedan)} MÁS`;
  };

  boton?.addEventListener('click', () => {
    tope = Math.min(tarjetas.length, tope + POR_VISTA);
    pintarRecorte();
    /*
      El foco se queda en el botón mientras quede algo que descubrir, que es lo
      que permite ir pulsando sin volver a buscarlo. Cuando desaparece, se lleva a
      la primera tarjeta recién sacada: dejarlo en un botón que ya no está manda el
      foco al principio del documento y pierde a quien navega con el teclado.
    */
    if (boton.hidden) tarjetas[tope - POR_VISTA]?.querySelector('button')?.focus();
  });

  /*
    Al cruzar el corte se recalcula. Sin esto, girar el teléfono o agrandar la
    ventana deja escondidas dieciséis tarjetas en un escritorio que ya tiene
    carrusel, o las veinte sueltas en un móvil sin botón.
  */
  const alCambiarAncho = (): void => {
    tope = POR_VISTA;
    pintarRecorte();
    if (enMovil.matches) parar();
    else arrancar();
  };
  enMovil.addEventListener('change', alCambiarAncho);
  pintarRecorte();

  actualizar();
  arrancar();

  montados.push(() => {
    parar();
    vigia?.disconnect();
    document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    enMovil.removeEventListener('change', alCambiarAncho);
  });
}

/**
 * Suelta los carruseles de la página anterior.
 *
 * El DOM sobrevive a la navegación de Astro, pero un `setInterval` y un
 * `IntersectionObserver` sobreviven a TODO: sin esto, cada visita dejaría un reloj
 * más corriendo contra elementos que ya no existen.
 */
function iniciar(): void {
  while (montados.length) montados.pop()?.();
  document.querySelectorAll<HTMLElement>('[data-carrusel]').forEach(montar);
}

export function prepararCarrusel(): void {
  const w = window as Window & { __beatCarruselListo?: boolean };
  if (w.__beatCarruselListo) return;
  w.__beatCarruselListo = true;
  document.addEventListener('astro:page-load', iniciar);
  document.addEventListener('astro:before-swap', () => {
    while (montados.length) montados.pop()?.();
  });
}
