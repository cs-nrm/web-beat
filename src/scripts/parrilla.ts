/**
 * El botón «Escuchar en vivo» del hero de `/en-vivo`.
 *
 * ⚠️ El nombre del archivo se quedó viejo: el hero vivía en `/programacion` hasta
 * que se partió en dos el 2026-09-09 y el panel se mudó a `/en-vivo`. No se
 * renombró porque `senal.ts` —que es quien de verdad mueve la parrilla— sigue
 * apuntando aquí desde media docena de comentarios, y el archivo se carga en
 * `Base.astro` para todo el sitio, no para una ruta.
 *
 * 🔴 NO es un segundo reproductor. Reenvía la pulsación al botón del player de la
 * cabecera —el único que habla con Triton— y copia su estado, para que no diga
 * «Escuchar en vivo» mientras la radio ya suena. El player tiene una máquina de
 * estados con reclamo de canal, reintentos y anuncios; una segunda puerta de
 * entrada sería una segunda copia de todo eso.
 *
 * 🔴 Si esto no corre, la página se queda entera y correcta: el hero sale
 * renderizado con lo que está al aire y el botón enseña «Escuchar en vivo» —que es
 * el estado de una página recién cargada—. Es la condición 1 de §3 de
 * `movimiento.md`.
 *
 * ⚠️ Al lado del botón vivía «Ver el show», un enlace a la ficha del programa. Se
 * retiró el 2026-09-09 (Carlos: «quitar el botón ver show») y no dejó rastro aquí:
 * era un `<a>`, nunca pasó por este archivo.
 *
 * ⚠️ Aquí vivían además las tres casillas que resaltaban un tipo de show en la
 * parrilla. Se fueron con la clasificación el 2026-09-09 (decisión de Carlos: «el
 * diseño se lo inventó»); el porqué está en `lib/cms/programacion.ts`. Lo que
 * queda es solo el botón, y por eso este archivo es tan corto para el nombre que
 * tiene.
 *
 * ⚠️ Y lo que la parrilla sí necesita —que las celdas y el punto de tally se
 * enteren de que pasó la hora— NO está aquí: lo hace `senal.ts` sobre cualquier
 * `[data-bloque]`, con la regla compartida de `lib/parrilla.ts`.
 */

/** El botón de verdad, el que habla con Triton. Vive en la cabecera. */
function botonDelPlayer(): HTMLButtonElement | null {
  return document.querySelector<HTMLButtonElement>('#player [data-accion="play"]');
}

/** El contenedor que publica el estado de la señal en `data-status`. */
function contenedorDelPlayer(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#player');
}

/**
 * Copia el estado del player al botón del hero.
 *
 * ⚠️ De los cinco estados del player (`init`, `cargando`, `sonando`, `pausa`,
 * `anuncio`) aquí solo importan tres, y el reparto lo hace el CSS de la página:
 * `anuncio` cuenta como sonando —está saliendo audio y el botón lo corta— y
 * `pausa` e `init` son el mismo reposo para un botón que solo ofrece empezar.
 */
function copiarEstado(): void {
  const boton = document.querySelector<HTMLButtonElement>('[data-aire]');
  if (!boton) return;

  const player = contenedorDelPlayer();
  const original = botonDelPlayer();
  const status = player?.dataset.status ?? 'init';

  const estado =
    status === 'sonando' || status === 'anuncio'
      ? 'sonando'
      : status === 'cargando'
        ? 'cargando'
        : 'reposo';

  /*
    🔴 `data-senal` y NO `data-estado`, y esto costó un bug de verdad.

    `[data-estado]` es un CONTRATO de `senal.ts`: dentro de cada `[data-bloque]`
    busca ese atributo y le REESCRIBE el texto con «AL AIRE · 58 MIN». El hero es
    un `[data-bloque]` —lo necesita para que el punto de tally se apague cuando el
    programa termina— así que en cuanto este botón llevó `data-estado`, `senal.ts`
    lo adoptó como su marcador y le borró los tres rótulos y los dos iconos de
    dentro. El botón se quedó siendo un contador de minutos.

    ⚠️ Y el hero se mudó de página sin que esto cambiara, que es justo la gracia
    de que el contrato sea un atributo: la trampa viaja con el marcado.

    Es exactamente el choque que §1 de `movimiento.md` prohíbe —dos scripts
    escribiendo lo mismo sobre el mismo elemento— y el empate lo resolvía quién
    corriera último. Cazado leyendo el DOM, que es la otra lección de §11: en la
    captura de pantalla el botón se veía perfecto, porque `senal.ts` lo pisa medio
    segundo después.
  */
  boton.dataset.senal = estado;
  boton.setAttribute('aria-pressed', estado === 'sonando' ? 'true' : 'false');

  /*
    ⚠️ Se hereda el `disabled` del original, y no es un detalle cosmético: el botón
    de la cabecera nace deshabilitado y no se suelta hasta que el SDK de Triton
    está listo. Sin heredarlo, este botón se vería pulsable durante esos segundos y
    al pulsarlo no pasaría NADA —`click()` sobre un botón deshabilitado no hace
    nada—, que es justo el modo de falla que el oyente lee como «el sitio está
    roto».
  */
  boton.disabled = original?.disabled ?? true;
}

export function prepararParrilla(): void {
  const w = window as Window & { __beatParrillaLista?: boolean };
  if (w.__beatParrillaLista) return;
  w.__beatParrillaLista = true;

  /*
    🔴 El oyente va DELEGADO en el documento, no en el botón. El contenido de la
    página se reemplaza en cada navegación del enrutador, así que un oyente atado
    al botón muere en el primer salto — y este es el sitio exacto donde ya se
    perdió la marca de sección de la nav (movimiento.md §11). El documento no se
    reemplaza nunca.
  */
  document.addEventListener('click', (e) => {
    const boton = (e.target as Element | null)?.closest<HTMLElement>('[data-aire]');
    if (!boton) return;
    botonDelPlayer()?.click();
  });

  /**
   * El estado del player se vigila con un observador y no con un temporizador:
   * cambia por eventos del SDK, no con el reloj.
   *
   * ⚠️ `#player` vive en la cabecera, que lleva `transition:persist`, así que el
   * nodo SOBREVIVE a la navegación y el observador con él. Se vuelve a comprobar
   * en cada `astro:page-load` de todas formas, porque guardar una referencia y no
   * comprobarla nunca es cómo se acaba observando un nodo huérfano: el efecto
   * muere en silencio y desde el código se ve correcto. Le pasó al `<video>` del
   * visor y está anotado igual en `cursor.ts`.
   */
  let vigilado: HTMLElement | null = null;
  const observador = new MutationObserver(copiarEstado);

  const vigilar = (): void => {
    const player = contenedorDelPlayer();
    if (!player || player === vigilado) return;
    observador.disconnect();
    observador.observe(player, { attributes: true, attributeFilter: ['data-status'] });
    vigilado = player;
  };

  document.addEventListener('astro:page-load', () => {
    vigilar();
    copiarEstado();
  });
}
