/**
 * La transmisión especial del Inicio, del lado del navegador. Dos trabajos, y
 * ninguno pinta nada: el marcado llega completo del servidor
 * (`src/components/inicio/Transmision.astro`).
 *
 * 1. **El RELOJ.** El servidor decide la fase al pintar, pero ese HTML vive hasta
 *    un minuto en el borde y una pestaña puede quedarse abierta horas. Así que a
 *    la hora de inicio el rótulo pasa de «PRÓXIMAMENTE» a «EN VIVO», y a la hora de
 *    fin la sección se QUITA —con su iframe, que es lo que calla el video—. Es lo
 *    que la ayuda del CMS promete de `despublicarEn`: «se apaga el player del
 *    sitio». Un temporizador por frontera, nada de preguntar cada N segundos.
 *
 * 2. **El ÁRBITRO de audio** (`audio.ts`). El reproductor es un iframe de otro
 *    dominio: no se le puede preguntar si está sonando ni pedirle que pare. Lo que
 *    sí se sabe es cuándo el lector entra en él: al pulsar dentro de un iframe la
 *    ventana pierde el foco y `document.activeElement` pasa a ser ese iframe. Ese
 *    es el gesto de «quiero ver esto», y ahí se reclama el canal —el radio se
 *    calla—. Y al revés: si después alguien prende el radio, el iframe se RECARGA,
 *    que es la única forma de parar un reproductor ajeno. En un directo no se
 *    pierde nada: no hay posición a la que volver.
 *
 *    Es la mitad que faltaba con los embeds (ver «Un EMBED no se puede arbitrar» en
 *    `agents/streaming.md`): sin esto, radio y transmisión sonaban a la vez.
 *
 * Con View Transitions el DOM de la portada se reemplaza al navegar, así que todo
 * se monta en `astro:page-load` y se desmonta en `astro:before-swap`: un
 * temporizador o un registro que sobreviviera apuntaría a un iframe que ya no está.
 */
import { registrarAudio, olvidarAudio, reclamarAudio, FUENTES } from './audio';

/** `setTimeout` no admite más de esto (~24.8 días); lo que esté más lejos, no se agenda. */
const MAX_ESPERA = 2 ** 31 - 1;

let temporizadores: number[] = [];
let alPerderFoco: (() => void) | null = null;

function desmontar(): void {
  temporizadores.forEach((id) => window.clearTimeout(id));
  temporizadores = [];
  if (alPerderFoco) window.removeEventListener('blur', alPerderFoco);
  alPerderFoco = null;
  olvidarAudio(FUENTES.transmision);
}

function montar(): void {
  desmontar();
  const seccion = document.querySelector<HTMLElement>('[data-transmision]');
  if (!seccion) return;

  const inicio = Date.parse(seccion.dataset.inicio ?? '');
  const fin = Date.parse(seccion.dataset.fin ?? '');

  const repasar = (): void => {
    const ahora = Date.now();
    if (!Number.isNaN(fin) && ahora >= fin) {
      seccion.remove();
      desmontar();
      return;
    }
    if (seccion.dataset.estado === 'proxima' && !Number.isNaN(inicio) && ahora >= inicio) {
      seccion.dataset.estado = 'envivo';
    }
  };

  repasar();
  if (!seccion.isConnected) return;

  for (const instante of [inicio, fin]) {
    const falta = instante - Date.now();
    // Medio segundo de holgura: un temporizador puede dispararse unos ms ANTES y
    // `repasar` no haría nada.
    if (falta > 0 && falta < MAX_ESPERA) {
      temporizadores.push(window.setTimeout(repasar, falta + 500));
    }
  }

  const marco = seccion.querySelector<HTMLIFrameElement>('[data-transmision-marco]');
  if (!marco) return;

  // Solo se recarga si el lector entró: recargar uno que nadie tocó no calla nada.
  let tocado = false;
  registrarAudio(FUENTES.transmision, () => {
    if (!tocado || !marco.isConnected) return;
    tocado = false;
    const src = marco.getAttribute('src');
    if (src) marco.setAttribute('src', src);
  });

  alPerderFoco = () => {
    // El foco se mueve DESPUÉS del `blur`: se mira en la vuelta siguiente.
    window.setTimeout(() => {
      if (document.activeElement !== marco) return;
      tocado = true;
      reclamarAudio(FUENTES.transmision);
    }, 0);
  };
  window.addEventListener('blur', alPerderFoco);
}

export function prepararTransmision(): void {
  const w = window as Window & { __beatTransmisionLista?: boolean };
  if (w.__beatTransmisionLista) return;
  w.__beatTransmisionLista = true;
  document.addEventListener('astro:page-load', montar);
  document.addEventListener('astro:before-swap', desmontar);
}
