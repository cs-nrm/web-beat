/**
 * La parrilla avanza SOLA.
 *
 * 🔴 Por qué existe: la parrilla se calcula en el SERVIDOR y ahí se congela. Una
 * pestaña abierta media hora seguía marcando al aire un programa que ya terminó,
 * o sea que lo que existe justamente para afirmar que Beat está en vivo era la
 * parte más muerta de la página.
 *
 * Esto no pide nada al servidor: los horarios ya vienen en el marcado, así que
 * basta con volver a compararlos contra el reloj. Cero peticiones, cero coste por
 * oyente.
 *
 * ⚠️ Nació para el panel «HOY EN LA SEÑAL» del Inicio, que se retiró el
 * 2026-09-09 («en el home nada», Carlos). Hoy sirve a DOS páginas: en `/en-vivo`,
 * el hero de «AL AIRE AHORA» —de donde cuelga que el punto de tally se apague al
 * terminar el bloque— y las filas de «LO QUE SIGUE HOY»; en `/programacion`, las
 * celdas de la rejilla semanal, con su propio punto de tally desde el 2026-09-09.
 *
 * ⚠️ Y sirve a CUALQUIER `[data-bloque]`, no a una pantalla concreta: por eso el
 * selector es de atributo y no de clase. Si no hay ninguno en la página, se apaga
 * el temporizador solo.
 *
 * 🔴 El reloj y la comparación NO se calculan aquí: se importan de
 * `src/lib/parrilla.ts`, que es el mismo módulo que usa el SERVIDOR para pintar.
 * Tenía su propia copia de las dos funciones y era la trampa de §11 de
 * `movimiento.md` esperando su turno — dos copias de la misma regla, y el día que
 * divergen nadie sabe cuál manda.
 */
import { ahoraEnMexico, estaAlAire } from '@/lib/parrilla';

/** Cada cuánto se recalcula. Medio minuto: el dato es en minutos. */
const CADA_MS = 30_000;

let reloj: number | null = null;

function repasar(): void {
  const filas = document.querySelectorAll<HTMLElement>('[data-bloque]');
  if (!filas.length) {
    if (reloj !== null) {
      clearInterval(reloj);
      reloj = null;
    }
    return;
  }

  const { dia, minuto: ahora } = ahoraEnMexico();

  for (const fila of filas) {
    const desde = Number(fila.dataset.desde);
    const hasta = Number(fila.dataset.hasta);
    const cruza = fila.dataset.cruza === '1';
    const vivo = fila.dataset.vivo === '1';
    if (!Number.isFinite(desde) || !Number.isFinite(hasta)) continue;

    /*
      ⚠️ Una celda de la rejilla semanal declara SU día (`data-dia`), y solo puede
      estar al aire si hoy es ese día. Sin esta comprobación, el bloque de las
      21:00 del martes se marcaría al aire también el sábado a las 21:00 —siete
      celdas encendidas a la vez, una por columna—. El hero y las filas de «LO QUE
      SIGUE HOY» no llevan el atributo porque ya son las de hoy, y ahí la
      condición sobra.
    */
    const suDia = fila.dataset.dia;
    const alAire = (!suDia || suDia === dia) && estaAlAire(desde, hasta, cruza, ahora);
    fila.classList.toggle('es-aire', alAire);

    /*
      🔴 `[data-estado]` es el CONTRATO de este archivo: el elemento cuyo TEXTO se
      reescribe con el estado del bloque. Quien meta ese atributo dentro de un
      `[data-bloque]` para otra cosa va a perder su contenido — le pasó al botón
      de «Escuchar en vivo» del hero, que quedó diciendo «AL AIRE · 58 MIN». Si
      hace falta un atributo de estado para otra cosa ahí dentro, cualquier nombre
      menos este.
    */
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
