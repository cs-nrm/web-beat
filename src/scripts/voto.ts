/**
 * El voto del público a una canción — el Top Ten.
 *
 * Es el PRIMER `fetch` de navegador del sitio. Todo lo demás se resuelve en el
 * servidor, así que este archivo estrena el camino y por eso lleva más red de
 * seguridad de la que su tamaño sugiere. Habla con `/api/votar`, que es nuestro
 * proxy: el navegador no llega al CMS ni aunque quisiera.
 *
 * Lo que NO hace, y es a propósito:
 *
 * · **No pinta la cifra nueva, y no es un olvido.** Desde el 2026-09-21 la fila
 *   muestra el PORCENTAJE de votos, no el número, para no delatar lo flaco que
 *   puede estar el reparto. El endpoint devuelve el conteo de UNA canción, así que
 *   recalcular el porcentaje exigiría los votos de todas — y ese dato no puede
 *   viajar al navegador sin deshacer el motivo de esconderlo. El voto se confirma
 *   con el pulso y con la línea de aviso; la cifra se mueve en la siguiente carga.
 *
 * · **No reordena las filas.** Por lo mismo, y además mover filas pelearía por
 *   `transform` con la cascada de entrada —lo que `scripts/guarda-cascada.mjs`
 *   vigila en el build—. El orden servido se refresca cada cinco minutos
 *   (`CACHE_CMS_MS`).
 *
 * · **No sabe cuántos votos te quedan al cargar la página.** El freno vive en una
 *   cookie `httpOnly` y la página es cacheable en el borde, así que el HTML no
 *   puede variar por visitante sin romper la caché de todos. El botón nace siempre
 *   vivo y es el servidor quien dice que no, después del clic. Es la consecuencia
 *   correcta de que la página se sirva igual para todos.
 */
import { ga4 } from './analitica';

/**
 * Suelta el botón aunque la respuesta no llegue nunca.
 *
 * Esto no es defensivo de más: es la prohibición de forma de `movimiento.md` §3
 * —«ninguna bandera que se ponga antes de una llamada asíncrona puede liberarse
 * solo dentro del callback»—. Nos costó la inclinación de las tarjetas y, en
 * `player.ts`, la radio entera de una sesión. El proxy corta a los 2.5 s, así que
 * seis es holgado sin dejar el botón muerto un tiempo perceptible.
 */
const PLAZO_MS = 6000;

/**
 * Lo que el botón se queda en «LISTO».
 *
 * Un poco más que el modal (`CIERRE_MS`), a propósito: al cerrarse el diálogo la
 * mirada vuelve a la lista y tiene que encontrar todavía marcada la fila que se
 * acaba de votar.
 */
const CONFIRMADO_MS = 3200;

let marcado: ReturnType<typeof setTimeout> | undefined;

/** Cuánto se queda en pantalla la confirmación antes de irse sola. */
const CIERRE_MS = 2600;

let cierre: ReturnType<typeof setTimeout> | undefined;

/**
 * La respuesta al voto, en el modal de la lista.
 *
 * Sustituye a la línea de texto que iba debajo de la lista (Carlos, 2026-09-21:
 * «ahí hasta abajo no se ve»). Quien vota mira el botón que acaba de pulsar, y el
 * aviso caía fuera de su campo de visión — a veces fuera de la pantalla.
 *
 * Un ACIERTO se va solo a los 2.6 s: quien está repartiendo sus tres votos no
 * tiene por qué cerrar tres diálogos. Un ERROR se queda hasta que lo cierren,
 * porque dice algo que hay que leer —te quedaste sin votos, la votación cerró— y
 * un mensaje que se va solo es un mensaje que no se leyó.
 */
function responder(caja: HTMLElement, titulo: string, detalle: string, seVaSola: boolean): void {
  const modal = caja.querySelector<HTMLDialogElement>('[data-voto-modal]');
  if (!modal) return;

  const t = modal.querySelector<HTMLElement>('[data-voto-titulo]');
  const d = modal.querySelector<HTMLElement>('[data-voto-detalle]');
  if (t) t.textContent = titulo;
  if (d) d.textContent = detalle;

  if (cierre !== undefined) clearTimeout(cierre);
  cierre = undefined;

  // `showModal` lanza si ya está abierto — pasa al votar dos veces seguidas.
  if (!modal.open) modal.showModal();

  if (seVaSola) cierre = setTimeout(() => modal.close(), CIERRE_MS);
}

function cerrarModales(): void {
  if (cierre !== undefined) clearTimeout(cierre);
  cierre = undefined;
  document.querySelectorAll<HTMLDialogElement>('[data-voto-modal]').forEach((m) => {
    if (m.open) m.close();
  });
}

async function votar(boton: HTMLButtonElement): Promise<void> {
  const caja = boton.closest<HTMLElement>('[data-voto-lista]');
  if (!caja || boton.disabled) return;

  const lista = Number(caja.dataset.votoLista);
  const cancion = Number(boton.dataset.votoCancion);
  if (!Number.isInteger(lista) || !Number.isInteger(cancion)) return;

  boton.disabled = true;
  let rescate: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
    rescate = undefined;
    boton.disabled = false;
  }, PLAZO_MS);
  const soltar = (): void => {
    if (rescate !== undefined) clearTimeout(rescate);
    rescate = undefined;
    boton.disabled = false;
  };

  let r: Response;
  try {
    r = await fetch('/api/votar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lista, cancion }),
    });
  } catch {
    // Sin red. Se dice, y el botón vuelve: reintentar es lo razonable aquí.
    soltar();
    responder(caja, 'No se pudo registrar tu voto', 'Revisa tu conexión e inténtalo otra vez.', false);
    return;
  }

  let datos: { votos?: number | null; restantes?: number; error?: string } = {};
  try {
    datos = await r.json();
  } catch {
    /* Un cuerpo ilegible no cambia lo que dice el status. */
  }

  soltar();

  if (!r.ok) {
    /*
      El aviso es la excepción de la regla de las zonas vacías: una zona sin
      contenido se deja vacía y sin rótulo, pero una AVERÍA se delata. Un 429 mudo
      se ve exactamente igual que un botón roto, y eso le enseña al lector a
      desconfiar de los demás controles de la página.
    */
    responder(caja, 'Tu voto no se registró', datos.error ?? 'Inténtalo otra vez.', false);
    return;
  }

  ga4('voto', { lista, cancion });

  /*
    La confirmación es esta línea y el pulso del botón, porque la cifra de la fila
    es un porcentaje que este script no puede recalcular (ver la cabecera). Sin decir
    nada, pulsar VOTAR no tendría ningún efecto visible y el lector volvería a
    pulsar — que es exactamente lo que enseña a desconfiar de un control.

    Se dice cuántos quedan y no «gracias»: es el dato que le sirve a quien está
    repartiendo sus tres votos entre varias canciones.
  */
  const quedan = datos.restantes;
  responder(
    caja,
    'Gracias por tu voto',
    quedan === 0
      ? 'Ese fue tu último voto de esta hora.'
      : quedan === 1
        ? 'Te queda un voto esta hora.'
        : `Te quedan ${quedan} votos esta hora.`,
    true,
  );

  /*
    El botón se queda en «LISTO», invertido, mientras el modal está en pantalla.
    Antes solo daba un pulso de 600 ms y Carlos lo pidió más claro: al volver del
    modal tiene que quedar dicho cuál acabas de votar, o con tres filas iguales no
    se sabe.

    Va SIEMPRE, también con `prefers-reduced-motion`: cambiar de rótulo no es
    movimiento. Lo que esa preferencia apaga es la transición, y eso lo hace el CSS.
  */
  boton.dataset.votado = 'sí';
  if (marcado !== undefined) clearTimeout(marcado);
  marcado = setTimeout(() => {
    marcado = undefined;
    delete boton.dataset.votado;
  }, CONFIRMADO_MS);
}

/**
 * Barre los restos de la visita anterior.
 *
 * El DOM SOBREVIVE a la navegación de Astro. Al volver atrás, un botón que se
 * quedó deshabilitado —porque la petición seguía en vuelo cuando el lector se fue—
 * reaparece muerto, y el aviso de la visita pasada sigue en pantalla diciendo algo
 * que ya no es verdad. Es el mismo barrido que hace `revelar.ts` con `data-animando`.
 */
function iniciar(): void {
  if (marcado !== undefined) clearTimeout(marcado);
  marcado = undefined;
  cerrarModales();
  document.querySelectorAll<HTMLButtonElement>('[data-voto-cancion]').forEach((b) => {
    b.disabled = false;
    delete b.dataset.votado;
  });
}

export function prepararVoto(): void {
  const w = window as Window & { __beatVotoListo?: boolean };
  if (w.__beatVotoListo) return;
  w.__beatVotoListo = true;

  // Delegación en `document` y no un listener por fila: las filas cambian con cada
  // navegación y el listener no, igual que en `pista.ts`.
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement | null;

    if (t?.closest('[data-voto-cerrar]')) {
      cerrarModales();
      return;
    }

    const boton = t?.closest<HTMLButtonElement>('[data-voto-cancion]');
    if (boton) void votar(boton);
  });

  /*
    Cerrar con Escape, a mano.

    Debería venir gratis: un `<dialog>` abierto con `showModal()` se cierra solo al
    pulsar Escape, vía el evento `cancel`. MEDIDO y no es así — al menos en el
    navegador con el que se probó esto: la tecla llega al documento, nadie la
    cancela (`defaultPrevented` en false en captura y en burbuja), y aun así
    `cancel` no se dispara ni una vez y el diálogo se queda abierto.

    No merece la pena averiguar de quién es la culpa: son cuatro líneas y con ellas
    Escape funciona pase lo que pase. Donde el cierre nativo SÍ vaya, esto llega
    primero y hace lo mismo.
  */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') cerrarModales();
  });

  /*
    Cerrar pulsando el velo, que es lo que la gente intenta primero. El
    `::backdrop` no recibe eventos: el clic llega al propio `<dialog>`, así que
    basta con comprobar que el objetivo sea el diálogo y no la caja de dentro.
  */
  document.addEventListener('click', (e) => {
    const t = e.target as HTMLElement | null;
    if (t instanceof HTMLDialogElement && t.matches('[data-voto-modal]')) cerrarModales();
  });

  document.addEventListener('astro:page-load', iniciar);
}
