/**
 * Player de radio — núcleo de Triton Digital.
 *
 * Port del bloque [TRITON SDK] de `src/js/player.js` (v1). Se porta la LÓGICA
 * tal cual —es el activo irreemplazable, son ingresos de audio ads— y se
 * reescribe el contrato con el DOM, porque el diseño nuevo pone el player en la
 * cabecera y no en una barra pegada al pie.
 *
 * Y se paga la deuda que el `ROADMAP.md` del v1 marcaba como **riesgo ALTO (R1)**
 * y nunca se pudo arreglar: aquello eran 1170 líneas sin módulos, con todo
 * colgado de `window` y `var` hoisted compartidos entre secciones, y un orden de
 * `<script>` que no podía llevar `defer` porque era parte del contrato. Esto es un
 * módulo con dependencias explícitas.
 */
import { eventoTriton } from './analitica';

/** Los 6 códigos que emite `stream-status`. */
type EstadoTriton =
  | 'GETTING_STATION_INFORMATION'
  | 'LIVE_CONNECTING'
  | 'LIVE_BUFFERING'
  | 'LIVE_PLAYING'
  | 'LIVE_PAUSE'
  | 'LIVE_STOP';

/** Lo que el DOM expone en `#player[data-status]`. Lo consume el CSS. */
type EstadoUI = 'init' | 'cargando' | 'sonando' | 'pausa' | 'anuncio';

interface SdkTriton {
  addEventListener(evento: string, cb: (e: { data?: { code?: string } }) => void): void;
  play(opts: { station: string; trackingParameters?: Record<string, string> }): void;
  playAd(plugin: string, opts: { url: string }): void;
  stop(): void;
  setVolume?(v: number): void;
  getVolume?(): number;
}

declare const TDSdk: new (config: unknown) => SdkTriton;

let sdk: SdkTriton | null = null;
let estadoPrevio: EstadoTriton | null = null;
/** El pre-roll VAST va una sola vez por sesión, no en cada play. */
let yaSonoElAnuncio = false;
/** Guarda contra doble inicialización: con View Transitions este módulo puede
 *  volver a evaluarse, y dos instancias de TDSdk significan audio duplicado. */
let iniciado = false;
/**
 * 🔴 El SDK ignora `play()` y `playAd()` hasta que dispara `playerReady`. En el v1
 * eso estaba implícito: el botón nacía oculto y `onPlayerReady` lo revelaba. Si no
 * se espera, el primer clic no hace nada y no da ningún error — cuesta un rato
 * entender por qué.
 */
let listo = false;

const el = <T extends HTMLElement>(sel: string): T | null =>
  document.querySelector<T>(sel);

function contenedor(): HTMLElement | null {
  return el('#player');
}

function ctxAnalitica(): { station: string; dist: string } {
  return {
    station: contenedor()?.dataset.mount ?? '',
    // Fija: identifica al front dentro de la cuenta de Triton de NRM.
    dist: 'WebBeat',
  };
}

function pintarEstado(estado: EstadoUI): void {
  const p = contenedor();
  if (!p) return;
  p.dataset.status = estado;
  const boton = el<HTMLButtonElement>('[data-accion="play"]');
  if (boton) {
    const sonando = estado === 'sonando';
    boton.setAttribute('aria-pressed', String(sonando));
    boton.setAttribute(
      'aria-label',
      sonando ? 'Pausar la transmisión' : 'Escuchar en vivo',
    );
    // Los dos iconos viven en el marcado; se alterna cuál se ve, para no
    // reconstruir SVG en cada cambio de estado.
    boton.querySelector('[data-icono="play"]')?.classList.toggle('hidden', sonando);
    boton.querySelector('[data-icono="pause"]')?.classList.toggle('hidden', !sonando);
  }
}

/**
 * 🔴 El texto durante un corte comercial dice `PAUSA COMERCIAL`, no el nombre de
 * la canción: es el comportamiento del v1 y es correcto, porque durante el audio
 * ad la bitácora sigue anunciando la última canción y mentiría.
 */
function pintarSonando(texto: string): void {
  const campo = el('[data-campo="sonando"]');
  if (campo) campo.textContent = texto;
}

function alCambiarEstado(e: { data?: { code?: string } }): void {
  const estado = e.data?.code as EstadoTriton | undefined;
  if (!estado) return;

  // Mapeo a GA4. `resume` se distingue de `play` mirando el estado anterior:
  // sin eso, reanudar tras una pausa se contaría como una reproducción nueva y
  // las sesiones saldrían infladas.
  if (estado === 'LIVE_PLAYING') {
    eventoTriton(estadoPrevio === 'LIVE_PAUSE' ? 'resume' : 'play', ctxAnalitica());
  } else if (estado === 'LIVE_PAUSE') {
    eventoTriton('pause', ctxAnalitica());
  } else if (estado === 'LIVE_STOP') {
    eventoTriton('stop', ctxAnalitica());
  }
  estadoPrevio = estado;

  if (
    estado === 'GETTING_STATION_INFORMATION' ||
    estado === 'LIVE_CONNECTING' ||
    estado === 'LIVE_BUFFERING'
  ) {
    pintarEstado('cargando');
  } else if (estado === 'LIVE_PLAYING') {
    pintarEstado('sonando');
  } else {
    pintarEstado('pausa');
  }
}

/** Arranca la señal. `station` sale del CMS (`estaciones.tritonMount`). */
function reproducir(): void {
  const station = contenedor()?.dataset.mount;
  if (!sdk || !listo || !station) return;
  sdk.play({ station, trackingParameters: { Dist: 'WebBeat' } });
}

/**
 * Primer play de la sesión: pre-roll VAST y luego la señal.
 *
 * El ad unit sale del env y NO se hardcodea. Es línea roja de la casa por una
 * razón de facturación: en los repos hermanos está pegado por copy-paste y servir
 * impresiones de una estación a la cuenta de otra es un bug de dinero.
 */
function arrancar(): void {
  if (!sdk || !listo) return;
  const red = import.meta.env.PUBLIC_GAM_NETWORK_ID;
  const unidad = import.meta.env.PUBLIC_GAM_AD_UNIT;

  if (yaSonoElAnuncio || !red || !unidad) {
    reproducir();
    return;
  }
  yaSonoElAnuncio = true;
  const vast =
    `https://pubads.g.doubleclick.net/gampad/ads?sz=600x360&iu=/${red}/${unidad}/VideoVast` +
    '&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1' +
    '&url=[referrer_url]&description_url=[description_url]&correlator=[timestamp]';
  sdk.playAd('vastAd', { url: vast });
}

export function iniciarPlayer(): void {
  if (iniciado) return;
  const p = contenedor();
  if (!p || typeof TDSdk === 'undefined') return;
  iniciado = true;

  sdk = new TDSdk({
    coreModules: [
      {
        id: 'MediaPlayer',
        playerId: 'td_container',
        /**
         * 🔴 `false` AQUÍ y `true` abajo. No es un descuido heredado: los cuatro
         * sitios hermanos que funcionan lo tienen exactamente así, y a
         * `web-enfoque` ponerlo en `true` en los dos le cortaba el stream a los
         * 10–15 segundos. Se resolvió comparando con estos repos.
         */
        audioAdaptive: false,
        plugins: [{ id: 'vastAd' }],
      },
    ],
    audioAdaptive: true,
    /**
     * Sin esto el player nunca se habilita: es la señal de que el SDK terminó de
     * cargar sus módulos y ya acepta comandos.
     */
    playerReady: () => {
      listo = true;
      const boton = el<HTMLButtonElement>('[data-accion="play"]');
      if (boton) {
        boton.disabled = false;
        boton.removeAttribute('aria-busy');
      }
      // El volumen del SDK manda sobre el del marcado: si el navegador recordó
      // otro nivel, el control debe reflejarlo y no mentir.
      const volumen = el<HTMLInputElement>('[data-accion="volumen"]');
      const actual = sdk?.getVolume?.();
      if (volumen && typeof actual === 'number') volumen.value = String(Math.round(actual * 100));
    },
    /**
     * Un módulo que no carga se ve aquí, y es la única forma de enterarse: el SDK
     * no lanza. Lo típico es el `vastAd` bloqueado por un adblocker, que NO es un
     * problema —el stream funciona igual— pero conviene poder distinguirlo de una
     * config mal puesta.
     */
    moduleError: (e: { data?: { errors?: unknown } }) => {
      console.warn('[player] módulo de Triton con error:', e?.data?.errors ?? e);
    },
    adBlockerDetected: () => {
      console.info('[player] adblocker detectado: el audio ad no va a sonar. El stream sí.');
    },
    analytics: {
      active: true,
      debug: false,
      appInstallerId: 'beatpag',
      trackingId: import.meta.env.PUBLIC_GA_ID || undefined,
      trackingEvents: ['play', 'stop', 'pause', 'resume', 'all'],
      sampleRate: 100,
      category: 'Reproduccion Radio Pag',
    },
  });

  sdk.addEventListener('stream-status', alCambiarEstado);

  sdk.addEventListener('ad-playback-start', () => {
    pintarEstado('anuncio');
    pintarSonando('PAUSA COMERCIAL');
    eventoTriton('ad_start', ctxAnalitica());
  });

  sdk.addEventListener('ad-playback-complete', () => {
    eventoTriton('ad_complete', ctxAnalitica());
    reproducir();
  });

  /**
   * Un VAST que falla NO interrumpe la sesión: se pasa directo a la señal. Pasa
   * de rutina cuando hay un bloqueador de anuncios, y en el v1 estaba anotado
   * como «comportamiento esperado, no bug».
   */
  sdk.addEventListener('ad-playback-error', () => {
    eventoTriton('ad_error', ctxAnalitica());
    reproducir();
  });

  // ---- Controles ----
  el<HTMLButtonElement>('[data-accion="play"]')?.addEventListener('click', () => {
    const estado = contenedor()?.dataset.status;
    if (estado === 'sonando' || estado === 'cargando') {
      sdk?.stop();
    } else {
      arrancar();
    }
  });

  const volumen = el<HTMLInputElement>('[data-accion="volumen"]');
  volumen?.addEventListener('input', () => {
    sdk?.setVolume?.(Number(volumen.value) / 100);
  });

  pintarEstado('init');
}
