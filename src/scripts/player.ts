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
import { FUENTES, reclamarAudio, registrarAudio } from './audio';

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
/** El texto que renderizó el servidor, para restaurarlo tras un corte comercial
 *  o un "Conectando…". Se lee una sola vez, antes de pisarlo. */
let textoOriginal: string | null = null;
/**
 * Tope de la conexión. Sin esto, si Triton no llega nunca a LIVE_PLAYING —red
 * mala, mount caído, un VAST que se cuelga sin emitir evento— el oyente se queda
 * mirando «Conectando…» indefinidamente, que es un cuelgue silencioso: parece que
 * el sitio está roto sin decir por qué.
 *
 * 20 s es holgado a propósito: la cadena real son la descarga del SDK (854 KB), el
 * pre-roll VAST y después la conexión al stream. Cortar antes daría falsos
 * negativos en 3G.
 */
let topeConexion: number | null = null;
const MS_TOPE_CONEXION = 20000;

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

function fallo(mensaje: string): void {
  if (topeConexion !== null) window.clearTimeout(topeConexion);
  topeConexion = null;
  try {
    sdk?.stop();
  } catch {
    /* si el SDK ya no responde, igual hay que devolver la UI a su sitio */
  }
  pintarEstado('init');
  pintarSonando(mensaje);
  window.setTimeout(restaurarSonando, 4000);
}

function pintarEstado(estado: EstadoUI): void {
  const p = contenedor();
  if (!p) return;
  p.dataset.status = estado;

  // El tope corre mientras se conecta, y se cancela en cuanto hay señal (o en
  // cuanto el oyente cancela).
  if (topeConexion !== null) {
    window.clearTimeout(topeConexion);
    topeConexion = null;
  }
  if (estado === 'cargando') {
    topeConexion = window.setTimeout(
      () => fallo('No se pudo conectar'),
      MS_TOPE_CONEXION,
    );
  }

  const boton = el<HTMLButtonElement>('[data-accion="play"]');
  if (boton) {
    const cargando = estado === 'cargando';
    const sonando = estado === 'sonando' || estado === 'anuncio';

    boton.setAttribute('aria-pressed', String(sonando));
    /**
     * `aria-busy` y no `disabled`: deshabilitar el botón mientras conecta le
     * quitaría el foco a quien navega con teclado, y además el oyente debe poder
     * cancelar una conexión que tarda. Sigue siendo pulsable.
     */
    if (cargando) boton.setAttribute('aria-busy', 'true');
    else boton.removeAttribute('aria-busy');

    boton.setAttribute(
      'aria-label',
      cargando ? 'Conectando con la señal' : sonando ? 'Pausar la transmisión' : 'Escuchar en vivo',
    );

    // Los tres iconos viven en el marcado; se alterna cuál se ve, para no
    // reconstruir SVG en cada cambio de estado.
    const icono = (n: string, visible: boolean) =>
      boton.querySelector(`[data-icono="${n}"]`)?.classList.toggle('hidden', !visible);
    icono('play', !cargando && !sonando);
    icono('pause', !cargando && sonando);
    icono('cargando', cargando);
  }

  // El texto acompaña, porque el spinner solo no dice QUÉ está pasando.
  if (estado === 'cargando') pintarSonando('Conectando…');
  else if (estado === 'sonando' || estado === 'init') restaurarSonando();
}

/**
 * 🔴 El texto durante un corte comercial dice `PAUSA COMERCIAL`, no el nombre de
 * la canción: es el comportamiento del v1 y es correcto, porque durante el audio
 * ad la bitácora sigue anunciando la última canción y mentiría.
 */
function pintarSonando(texto: string): void {
  const campo = el('[data-campo="sonando"]');
  if (!campo) return;
  if (textoOriginal === null) textoOriginal = campo.textContent;
  campo.textContent = texto;
}

/** Vuelve al texto que puso el servidor (la canción, o el nombre de la estación). */
function restaurarSonando(): void {
  const campo = el('[data-campo="sonando"]');
  if (campo && textoOriginal !== null) campo.textContent = textoOriginal;
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
  // Red de seguridad: ya se reclamó en el clic, pero esto cubre las rutas que no
  // pasan por ahí (reanudar tras un audio ad). Es idempotente.
  reclamarAudio(FUENTES.radio);
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
  // Cualquier ruta de entrada deja señal visible, sin depender de que quien llamó
  // se haya acordado de pintarla.
  pintarEstado('cargando');
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

const URL_SDK = 'https://sdk.listenlive.co/web/2.9/td-sdk.min.js';
let promesaSdk: Promise<void> | null = null;

/**
 * Carga el SDK de Triton a demanda.
 *
 * 🔴 Por qué a demanda y no en el `<head>`: medido en el cable, `td-sdk.min.js`
 * son **363 KB** (gzip, 1.5 MB sin comprimir) y al construirse con el plugin
 * `vastAd` arrastra el IMA de Google, que son **491 KB más y viajan SIN
 * comprimir** —el CDN de Google no lo gzipea—. Total: **854 KB**.
 *
 * Como el player vive en la cabecera, eso se bajaba en TODAS las páginas aunque
 * nadie le diera play. Para comparar: el CSS del sitio entero —design system,
 * tipografía, cabecera y pie— son 10 KB gzip.
 *
 * Se carga como script CLÁSICO y no como módulo porque es un bundle de terceros
 * que se cuelga de `window.TDSdk`.
 */
function cargarSdk(): Promise<void> {
  if (promesaSdk) return promesaSdk;
  promesaSdk = new Promise<void>((resolver, rechazar) => {
    if (typeof TDSdk !== 'undefined') return resolver();
    const et = document.createElement('script');
    et.src = URL_SDK;
    et.async = true;
    et.onload = () => resolver();
    et.onerror = () => rechazar(new Error('No cargó el SDK de Triton'));
    document.head.appendChild(et);
  });
  return promesaSdk;
}

/**
 * Precarga al primer indicio de INTENCIÓN, no cuando el navegador esté ocioso.
 *
 * La diferencia importa: con `requestIdleCallback` los 854 KB salían de la ruta
 * crítica del pintado, pero se descargaban igual en cada visita — así que quien
 * nunca le da play pagaba los datos completos. En datos móviles en México eso no
 * es un detalle.
 *
 * «Intención» es acercar el puntero a la barra del player, enfocarla con el
 * teclado, o tocarla. Cuando alguien va a escuchar radio, mueve el cursor hacia el
 * botón antes de hacer clic, así que en la práctica la descarga ya empezó cuando
 * el clic llega. Y quien solo viene a leer una nota no paga nada.
 */
function precargarEnIntencion(): void {
  const barra = contenedor();
  if (!barra) return;
  const arrancar = () => {
    quitar();
    void cargarSdk().then(iniciarPlayer).catch(() => {});
  };
  const eventos: Array<keyof HTMLElementEventMap> = [
    'pointerenter',
    'focusin',
    'touchstart',
  ];
  const quitar = () =>
    eventos.forEach((e) => barra.removeEventListener(e, arrancar));
  eventos.forEach((e) =>
    barra.addEventListener(e, arrancar, { once: true, passive: true }),
  );
}

/**
 * Punto de entrada. Deja el botón usable de inmediato: si el oyente hace clic
 * antes de que el SDK esté, se carga en ese momento y se arranca al terminar, así
 * que el clic nunca se pierde.
 */
export function prepararPlayer(): void {
  const p = contenedor();
  if (!p) return;

  const boton = el<HTMLButtonElement>('[data-accion="play"]');
  /**
   * 🔴 Guarda contra listeners DUPLICADOS. Con View Transitions este script puede
   * volver a evaluarse en cada navegación, y como el botón vive en un bloque
   * `transition:persist` es el MISMO nodo: sin esta marca acumularía un listener
   * por página visitada, y a la quinta el clic dispararía cinco veces.
   */
  if (boton?.dataset.cableado === '1') return;
  if (boton) boton.dataset.cableado = '1';

  boton?.addEventListener(
    'click',
    () => {
      if (iniciado) return; // ya hay SDK: el handler de iniciarPlayer se encarga
      /**
       * 🔴 Se pinta `cargando` AQUÍ, no al recibir el primer `stream-status`.
       *
       * Lo que el oyente percibe como una sola espera son dos apiladas: la
       * descarga del SDK (854 KB) y después la conexión de Triton
       * (GETTING_STATION_INFORMATION -> LIVE_CONNECTING -> LIVE_BUFFERING).
       * Si el indicador esperara al SDK, el primer tramo —el más largo en una red
       * lenta— pasaría sin ninguna señal y el botón parecería no responder.
       */
      /**
       * 🔴 Se reclama el canal AQUÍ, en la intención, y no en `reproducir()`.
       *
       * `reproducir()` solo corre cuando el SDK está listo, así que reclamar ahí
       * dejaba una ventana de varios segundos —la descarga del SDK más el VAST— en
       * la que el radio ya estaba "conectando" y el video de la nota SEGUÍA
       * sonando. Los dos a la vez, que es exactamente lo que el árbitro existe
       * para evitar.
       *
       * Y semánticamente es lo correcto: el oyente pidió radio, así que lo demás
       * se calla ya, no cuando el stream tenga a bien conectar.
       */
      reclamarAudio(FUENTES.radio);
      pintarEstado('cargando');
      void cargarSdk()
        .then(() => {
          iniciarPlayer();
          // El clic que disparó la carga sigue contando como gesto del usuario.
          arrancar();
        })
        .catch(() => fallo('No se pudo conectar'));
    },
    // `once` no: si la carga falla, el siguiente clic debe volver a intentarlo.
  );

  /**
   * El radio entra al árbitro AQUÍ y no al construir el SDK, para quitar una
   * dependencia de orden: si se registrara al cargar el SDK, el registro estaría
   * vacío mientras nadie haya tocado el player. Hoy es inofensivo —sin SDK el
   * radio no suena, así que no hay nada que pausar— pero deja una precondición
   * implícita, y esas son las que muerden cuando alguien agregue una fuente nueva.
   */
  registrarAudio(FUENTES.radio, () => {
    const estado = contenedor()?.dataset.status;
    if (estado === 'sonando' || estado === 'cargando') {
      sdk?.stop();
      pintarEstado('init');
    }
  });

  // El botón nace usable, aunque el SDK no esté: el clic lo trae.
  if (boton) {
    boton.disabled = false;
    boton.removeAttribute('aria-busy');
  }

  precargarEnIntencion();
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
    if (estado === 'sonando' || estado === 'cargando' || estado === 'anuncio') {
      sdk?.stop();
      pintarEstado('init');
    } else {
      // Respuesta inmediata al clic: Triton tarda en emitir su primer estado.
      reclamarAudio(FUENTES.radio);
      pintarEstado('cargando');
      arrancar();
    }
  });

  const volumen = el<HTMLInputElement>('[data-accion="volumen"]');
  volumen?.addEventListener('input', () => {
    sdk?.setVolume?.(Number(volumen.value) / 100);
  });

  /**
   * 🔴 Solo se pinta `init` si NO hay nada en curso.
   *
   * En el camino frío —clic, descarga del SDK, inicializar, arrancar— el clic ya
   * dejó el estado en `cargando`, y pintar `init` aquí lo borraba: el usuario veía
   * el botón de play otra vez, como si su clic no hubiera hecho nada. Y si el VAST
   * no emitía ningún evento, se quedaba así para siempre.
   *
   * Es justo el camino del visitante que llega por primera vez, o sea el caso más
   * común.
   */
  const estadoActual = contenedor()?.dataset.status;
  if (!estadoActual || estadoActual === 'init') pintarEstado('init');
}
