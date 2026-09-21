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

/** Lo que dura el pulso de confirmación, alineado con `--dur-2` del DS. */
const PULSO_MS = 600;

function menosMovimiento(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function avisar(caja: HTMLElement, texto: string): void {
  const aviso = caja.querySelector<HTMLElement>('[data-voto-aviso]');
  if (aviso) aviso.textContent = texto;
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
    avisar(caja, 'No hay conexión. Inténtalo otra vez.');
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
    avisar(caja, datos.error ?? 'No se pudo registrar tu voto.');
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
  avisar(
    caja,
    quedan === 0
      ? 'Listo. Ese fue tu último voto de esta hora.'
      : quedan === 1
        ? 'Listo. Te queda un voto esta hora.'
        : `Listo. Te quedan ${quedan} votos esta hora.`,
  );

  /*
    El pulso va en `scale` y NO en `transform`: la cascada de entrada ya escribe
    `transform` sobre estas mismas filas, y dos efectos sobre la misma propiedad es
    lo que nos costó el hover de las tarjetas. `scale`, `translate` y `rotate` son
    independientes y se componen (`movimiento.md` §1).
  */
  if (!menosMovimiento()) {
    boton.dataset.votado = 'sí';
    setTimeout(() => delete boton.dataset.votado, PULSO_MS);
  }
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
  document.querySelectorAll<HTMLButtonElement>('[data-voto-cancion]').forEach((b) => {
    b.disabled = false;
    delete b.dataset.votado;
  });
  document.querySelectorAll<HTMLElement>('[data-voto-aviso]').forEach((a) => {
    a.textContent = '';
  });
}

export function prepararVoto(): void {
  const w = window as Window & { __beatVotoListo?: boolean };
  if (w.__beatVotoListo) return;
  w.__beatVotoListo = true;

  // Delegación en `document` y no un listener por fila: las filas cambian con cada
  // navegación y el listener no, igual que en `pista.ts`.
  document.addEventListener('click', (e) => {
    const boton = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '[data-voto-cancion]',
    );
    if (boton) void votar(boton);
  });

  document.addEventListener('astro:page-load', iniciar);
}
