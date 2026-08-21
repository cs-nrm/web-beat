/**
 * Analítica del player. Port de `src/js/analytics.js` (29 líneas), ahora como
 * módulo en vez de dos funciones colgadas de `window`.
 *
 * 🔴 El doble envío se conserva tal cual, y no es redundancia: `gtag` puede no
 * existir todavía cuando el player emite su primer evento —depende del orden en
 * que carguen GTM y el SDK de Triton, que no controlamos—, y `dataLayer.push` sí
 * funciona desde el primer momento porque GTM lo crea antes de cargar nada.
 * Sin el fallback se pierden los eventos de la primera reproducción, que son
 * justo los que interesan.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type EventoPlayer =
  | 'play'
  | 'pause'
  | 'stop'
  | 'resume'
  | 'ad_start'
  | 'ad_complete'
  | 'ad_error';

export function ga4(evento: string, params: Record<string, unknown> = {}): void {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', evento, params);
      return;
    }
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: evento, ...params });
    }
  } catch {
    /* La analítica nunca debe tumbar la reproducción. */
  }
}

/**
 * Los siete eventos de Triton, con las dimensiones que NRM usa para reportar.
 *
 * `station` y `dist` salen de parámetros y no de constantes: en el v1 estaban
 * hardcodeados como `XHSONFM`/`WebBeat`, y es lo único que impedía que este mismo
 * archivo sirviera a las otras tres estaciones.
 */
export function eventoTriton(
  evento: EventoPlayer,
  ctx: { station: string; dist: string },
  extra: Record<string, unknown> = {},
): void {
  ga4(evento, { category: 'Triton SDK', station: ctx.station, dist: ctx.dist, ...extra });
}
