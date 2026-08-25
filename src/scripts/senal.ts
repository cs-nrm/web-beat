/**
 * La parrilla avanza SOLA.
 *
 * 🔴 Por qué existe: «HOY EN LA SEÑAL» se calcula en el servidor y ahí se
 * congela. Una pestaña abierta media hora seguía marcando al aire un programa que
 * ya terminó, y el panel que existe justamente para afirmar que Beat está en vivo
 * era la parte más muerta de la página.
 *
 * Esto no pide nada al servidor: los horarios ya vienen en el marcado, así que
 * basta con volver a compararlos contra el reloj. Cero peticiones, cero coste por
 * oyente.
 */

/** Cada cuánto se recalcula. Medio minuto: el dato es en minutos. */
const CADA_MS = 30_000;

let reloj: number | null = null;

/**
 * Minuto del día en la hora de MÉXICO, no la del visitante.
 *
 * 🔴 La parrilla está en hora de la estación. Un oyente en Madrid o en Los
 * Ángeles vería el programa equivocado marcado al aire si esto usara su reloj
 * local — y es exactamente el tipo de error que nadie reporta porque quien lo
 * sufre no sabe cuál era el programa correcto.
 */
function minutoDeMexico(): number {
  const partes = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const h = Number(partes.find((p) => p.type === 'hour')?.value ?? '0');
  const m = Number(partes.find((p) => p.type === 'minute')?.value ?? '0');
  return h * 60 + m;
}

/** Un bloque que cruza medianoche va de `desde` a 24:00 y de 00:00 a `hasta`. */
function estaAlAire(desde: number, hasta: number, cruza: boolean, ahora: number): boolean {
  return cruza ? ahora >= desde || ahora < hasta : ahora >= desde && ahora < hasta;
}

function repasar(): void {
  const filas = document.querySelectorAll<HTMLElement>('[data-bloque]');
  if (!filas.length) {
    if (reloj !== null) {
      clearInterval(reloj);
      reloj = null;
    }
    return;
  }

  const ahora = minutoDeMexico();

  for (const fila of filas) {
    const desde = Number(fila.dataset.desde);
    const hasta = Number(fila.dataset.hasta);
    const cruza = fila.dataset.cruza === '1';
    const vivo = fila.dataset.vivo === '1';
    if (!Number.isFinite(desde) || !Number.isFinite(hasta)) continue;

    const alAire = estaAlAire(desde, hasta, cruza, ahora);
    fila.classList.toggle('es-aire', alAire);

    const estado = fila.querySelector<HTMLElement>('[data-estado]');
    if (!estado) continue;

    if (!alAire) {
      estado.textContent = vivo ? 'EN VIVO' : 'REPETICIÓN';
      continue;
    }

    // Lo que de verdad se ve moverse: cuánto le queda al programa al aire.
    const restan = (cruza && ahora >= desde ? hasta + 1440 : hasta) - ahora;
    estado.textContent = restan > 0 && restan <= 600 ? `AL AIRE · ${restan} MIN` : 'AL AIRE';
  }
}

export function prepararSenal(): void {
  const w = window as Window & { __beatSenalLista?: boolean };
  if (w.__beatSenalLista) return;
  w.__beatSenalLista = true;

  const arrancar = (): void => {
    if (reloj !== null) clearInterval(reloj);
    repasar();
    reloj = window.setInterval(repasar, CADA_MS);
  };

  document.addEventListener('astro:page-load', arrancar);

  /*
   * Al volver a la pestaña se repasa de inmediato. El navegador ralentiza los
   * temporizadores en segundo plano, así que tras un rato fuera el panel puede
   * llegar desfasado varios minutos — justo cuando el oyente vuelve a mirarlo.
   */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'hidden') repasar();
  });
}
