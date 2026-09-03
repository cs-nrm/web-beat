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

/**
 * 🔴 Intención de arranque pendiente.
 *
 * `iniciarPlayer()` solo CONSTRUYE el SDK; `playerReady` llega después, asíncrono.
 * El clic hacía `cargarSdk().then(() => { iniciarPlayer(); arrancar(); })`, así que
 * `arrancar()` corría con `listo === false`, salía por su propia guarda y **la
 * intención se perdía**: el primer clic de la sesión no reproducía nada y el estado
 * se quedaba en `init`. El segundo sí funcionaba, porque ya estaba listo.
 *
 * Era el camino que toma TODO visitante nuevo, y silencioso: sin error en consola,
 * sin nada raro en pantalla, solo un botón que parece no hacer caso.
 *
 * Con esto la intención se guarda y `playerReady` la ejecuta. El gesto sigue
 * valiendo: una vez que el usuario interactúa con el documento, la activación es
 * «pegajosa» en los navegadores, así que un `play()` posterior no se bloquea.
 */
let arranquePendiente = false;
/** El texto que renderizó el servidor, para restaurarlo tras un corte comercial
 *  o un "Conectando…". Se lee una sola vez, antes de pisarlo. */
let textoOriginal: string | null = null;
/** La hora de inicio de lo que suena, o `null` si no se sabe. */
let horaOriginal: string | null = null;
/**
 * El nombre de la estación, capturado UNA vez del marcado del servidor.
 *
 * Es el sitio al que se vuelve cuando no hay nada que anunciar: al pausar, y
 * cuando una canción caduca. No se puede usar `textoOriginal` para esto porque ese
 * ya guarda la última canción — que es justo lo que hay que dejar de decir.
 */
let textoEstacion: string | null = null;
/** Caduca la canción cuando pasa su propia duración sin noticias. Ver abajo. */
let caducidad: number | null = null;
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

/**
 * 🔴 ¿Manda otro modo en la barra?
 *
 * El botón de play lo comparten el directo y las pistas a demanda de Bonus Beat
 * (`pista.ts`). Los dos módulos escuchan el MISMO nodo —la barra es persistente—,
 * así que cada uno tiene que ignorar los clics que no son suyos. Sin esto, pulsar
 * pausa sobre una pista arrancaría además el radio: dos audios a la vez y el
 * árbitro cortando uno de los dos según quién llegara antes.
 *
 * Se lee del DOM y no de una variable de módulo a propósito: el estado vive en un
 * solo sitio y los dos módulos lo consultan igual.
 */
function mandaLaPista(): boolean {
  return contenedor()?.dataset.modo === 'pista';
}

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

/**
 * ── Diagnóstico del player ──
 *
 * 🔴 Existe porque el «qué suena» falla EN SILENCIO: si el cue point no llega, o
 * llega y se descarta, la barra simplemente se queda con el nombre de la estación
 * y no hay forma de distinguir las dos cosas mirando la pantalla. Ya nos costó dos
 * arreglos a ciegas.
 *
 * Se enciende de tres maneras, y ninguna molesta al oyente normal:
 *   · en desarrollo, siempre;
 *   · con `?depurar=player` en la URL — y se queda encendido al navegar;
 *   · o `sessionStorage.beatDepurar = '1'` desde la consola.
 * Se apaga con `?depurar=no`.
 *
 * ⚠️ NO va detrás de `import.meta.env.DEV` a secas, que es lo que había: el sitio
 * que se mira es el compilado, y ahí ese log no existe. Un diagnóstico que solo
 * funciona donde no está el problema no sirve de nada.
 */
const DEPURA = ((): boolean => {
  try {
    const q = new URLSearchParams(location.search).get('depurar');
    if (q === 'no') sessionStorage.removeItem('beatDepurar');
    else if (q === 'player' || q === '1') sessionStorage.setItem('beatDepurar', '1');
    return import.meta.env.DEV || sessionStorage.getItem('beatDepurar') === '1';
  } catch {
    return import.meta.env.DEV;
  }
})();

function traza(...args: unknown[]): void {
  if (DEPURA) console.info('%c[beat:player]', 'color:#d91e18;font-weight:700', ...args);
}

/**
 * Cuántos cue points han llegado desde que empezó a sonar.
 *
 * Sirve para el aviso de abajo: cero es un diagnóstico distinto de «llegan y se
 * descartan», y desde la barra los dos se ven igual.
 */
let cuesRecibidos = 0;
let vigilanteCues: number | null = null;

/** A los 45 s sonando sin un solo cue point, se dice en voz alta. */
function vigilarCues(): void {
  if (!DEPURA || vigilanteCues !== null) return;
  vigilanteCues = window.setTimeout(() => {
    vigilanteCues = null;
    if (cuesRecibidos === 0) {
      console.warn(
        '%c[beat:player] 45 s sonando y CERO cue points.',
        'color:#d91e18;font-weight:700',
        '\nNo es el parser: el evento no está llegando. Mira hacia el canal SBM ' +
          '(el mount `_SBM`), no hacia este código.',
      );
    } else {
      traza(`${cuesRecibidos} cue point(s) en los primeros 45 s.`);
    }
  }, 45000);
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

  /*
    🔴 Al PARAR se deja de anunciar la canción. Si el oyente pausó, la barra no
    puede seguir diciendo qué suena: para él no suena nada, y la señal sigue
    corriendo sin él, así que al reanudar ya será otra.

    Va aquí y no en el manejador del botón porque `init` es el estado de parada
    venga de donde venga — del botón, de un fallo de red o del árbitro de audio
    cuando otra fuente reclama el canal.
  */
  if (estado === 'init' && textoEstacion !== null) volverALaFrecuencia();

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
  // Un aviso —«Conectando…», «PAUSA COMERCIAL»— no tiene hora de inicio.
  pintarHora(null);
  medirMarquesina();
}

/**
 * Deja de anunciar una canción y vuelve a la frecuencia.
 *
 * 🔴 Se usa en DOS momentos, y los dos son casos de «ya no sé qué suena»:
 *
 *   · al PAUSAR — decisión de Carlos, 2026-09-03. Si el oyente paró, la barra no
 *     puede seguir afirmando qué está sonando: para él no suena nada. Y la señal
 *     sigue corriendo sin él, así que al reanudar ya será otra canción.
 *   · al CADUCAR — ver `programarCaducidad()`.
 */
function volverALaFrecuencia(): void {
  if (caducidad !== null) {
    clearTimeout(caducidad);
    caducidad = null;
  }
  textoOriginal = textoEstacion;
  horaOriginal = null;
  restaurarSonando();
}

/**
 * 🔴 Una canción deja de anunciarse cuando termina, aunque no llegue nada nuevo.
 *
 * Esto resuelve algo que se ve en la señal real: **cuando los locutores hablan en
 * vivo, Triton no manda NADA**. Medido en una captura de 2h44 del canal SBM — los
 * únicos tipos que existen son `track` y `ad`, no hay `speech` ni `custom`. Así
 * que sin esto la barra se queda enseñando la última canción mientras alguien
 * habla encima, que es exactamente lo que Carlos reportó.
 *
 * La duración sale del propio cue point, así que no se inventa nada: cuando pasa
 * el tiempo que la canción dice durar y nadie ha anunciado otra, se vuelve a la
 * frecuencia. Si llega un cue point nuevo antes, este temporizador se cancela y
 * empieza el suyo.
 *
 * ⚠️ `cue_time_duration` viene en DÉCIMAS de segundo (`'2790'` = 4:39), medido en
 * la captura. NO en milisegundos — leerlo como ms daría 46 minutos para una
 * canción de cuatro. (Los eventos VAST sí lo mandan en ms, pero esos llegan por
 * `ad-break-cue-point` y no por aquí.)
 *
 * Se añaden 25 s de tolerancia: el cue point llega ~5 s por delante del audio del
 * oyente, y más vale quedarse corto en el aviso que borrar una canción que todavía
 * suena.
 */
function programarCaducidad(decimas: string | undefined): void {
  if (caducidad !== null) {
    clearTimeout(caducidad);
    caducidad = null;
  }
  const n = Number(decimas);
  if (!Number.isFinite(n)) return;
  const segundos = n / 10;
  // Cordura: menos de 30 s o más de 20 min no es una canción, es un dato raro.
  if (segundos < 30 || segundos > 1200) return;
  caducidad = window.setTimeout(() => {
    caducidad = null;
    volverALaFrecuencia();
    traza('la canción caducó sin noticias — probablemente hay locución en vivo');
  }, (segundos + 25) * 1000);
}

/** Vuelve al texto que puso el servidor (la canción, o el nombre de la estación). */
function restaurarSonando(): void {
  const campo = el('[data-campo="sonando"]');
  if (campo && textoOriginal !== null) campo.textContent = textoOriginal;
  pintarHora(horaOriginal);
  medirMarquesina();
}

/**
 * Decide si el título tiene que desplazarse, midiendo si cabe.
 *
 * 🔴 Se mide, no se adivina por número de caracteres: una `W` y una `i` no ocupan
 * lo mismo, y el ancho disponible cambia entre móvil y escritorio. Se compara el
 * ancho real del texto contra el de su ventana.
 *
 * La velocidad es CONSTANTE —unos 45 px/s— así que la duración sale del recorrido.
 * Con una duración fija, un título largo pasaría corriendo y uno corto se
 * arrastraría: dos velocidades distintas para la misma cosa.
 */
function medirMarquesina(): void {
  const campo = el('[data-campo="sonando"]');
  const ventana = campo?.parentElement;
  if (!campo || !ventana) return;

  campo.removeAttribute('data-corre');
  campo.style.removeProperty('--marq-recorrido');
  campo.style.removeProperty('--marq-dur');

  const sobra = campo.scrollWidth - ventana.clientWidth;
  // Menos de 8px de sobra no se mueve: sería un temblor, no un desplazamiento.
  if (sobra <= 8) return;

  campo.style.setProperty('--marq-recorrido', `-${sobra}px`);
  /*
    El recorrido se hace dos veces (ida y vuelta) y ocupa el 64% del ciclo; el
    resto son las dos pausas. De ahí sale el total para que la ida sea a 45 px/s.
  */
  const segundos = Math.min(30, Math.max(6, (sobra / 45) * 2 * (1 / 0.64)));
  campo.style.setProperty('--marq-dur', `${segundos.toFixed(1)}s`);
  campo.setAttribute('data-corre', '');
}

/**
 * La hora bajo el título.
 *
 * Se vacía cuando no hay dato en vez de dejar la anterior: una hora vieja debajo
 * de una canción nueva es peor que ninguna hora, porque nadie sospecharía de ella.
 */
function pintarHora(valor: string | null): void {
  const campo = el('[data-campo="hora"]');
  if (!campo) return;
  campo.textContent = valor ?? '';
}

function alCambiarEstado(e: { data?: { code?: string } }): void {
  const estado = e.data?.code as EstadoTriton | undefined;
  traza('stream-status →', estado ?? '(sin código)', e);
  if (!estado) return;
  if (estado === 'LIVE_PLAYING') vigilarCues();

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
    et.onerror = () => {
      // Se quita el que falló: si no, el reintento añadiría otro al lado del roto.
      et.remove();
      rechazar(new Error('No cargó el SDK de Triton'));
    };
    document.head.appendChild(et);
  }).catch((err: unknown) => {
    /*
     * 🔴 El fallo NO se memoriza, y esto es lo más serio de todo el archivo.
     *
     * Antes se guardaba la promesa tal cual, así que un fallo de carga —red
     * inestable, CDN bloqueado, un bloqueador de anuncios— quedaba memorizado como
     * promesa RECHAZADA. Cada intento posterior devolvía esa misma promesa ya
     * rechazada: la radio no volvía a arrancar EN TODA LA SESIÓN aunque la red se
     * recuperara. El oyente da play, no pasa nada; da play otra vez, nada. Sin
     * error visible y sin salida.
     *
     * Y siendo el player, esto no es solo una mala experiencia: los audio ads del
     * pre-roll VAST son ingresos.
     *
     * El mismo razonamiento ya estaba escrito en `video.ts` para Plyr; aquí
     * faltaba.
     */
    promesaSdk = null;
    throw err;
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

  traza(
    'diagnóstico ENCENDIDO. Dale play y mira aquí: verás el estado del stream y ' +
      'cada cue point con su decisión. Para apagarlo, ?depurar=no',
  );

  /*
    El nombre de la estación, tal cual lo puso el servidor. Es el sitio al que se
    vuelve cuando no hay canción que anunciar, así que se guarda ANTES de que nada
    lo pise.
  */
  if (textoEstacion === null) {
    textoEstacion = el('[data-campo="sonando"]')?.textContent ?? null;
  }
  medirMarquesina();

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
      if (mandaLaPista()) return; // el clic es de la pista, no del directo
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
      /*
        Y la barra vuelve al DIRECTO. `reclamarAudio` calla la pista, pero el modo
        es cosa de la interfaz: sin esto la barra se quedaría enseñando el título
        de una canción de Bonus Beat mientras suena la señal.
      */
      const p2 = contenedor();
      if (p2) p2.dataset.modo = 'directo';
      pintarEstado('cargando');
      arranquePendiente = true;
      void cargarSdk()
        .then(() => {
          iniciarPlayer();
          // Si el SDK ya estaba listo —porque la precarga por intención se
          // adelantó— se arranca aquí. Si no, `playerReady` recoge la intención.
          if (listo) {
            arranquePendiente = false;
            arrancar();
          }
        })
        .catch(() => {
          arranquePendiente = false;
          fallo('No se pudo conectar');
        });
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

  /*
   * 🔴 El `try` no es decorativo: `iniciado` se pone ANTES de construir, para
   * evitar reentradas, así que si el constructor lanzara la bandera se quedaría
   * echada con `sdk` en null — y el player no volvería a inicializarse EN TODA LA
   * SESIÓN. Sin error visible, sin salida, y con el pre-roll VAST de por medio,
   * que son ingresos.
   *
   * Es el mismo patrón que ya nos costó la inclinación de las tarjetas y las fotos
   * en negro: un estado muerto del que nada saca al programa. Aquí se deshace lo
   * andado y se permite reintentar.
   */
  try {
    sdk = new TDSdk({
      coreModules: [
        {
          id: 'MediaPlayer',
          playerId: 'td_container',
          /**
           * 🔴 ESTE es el `audioAdaptive` que el SDK lee de verdad — el del módulo
           * MediaPlayer. Verificado en el bundle 2.9:
           *   `this.audioAdaptive = config.audioAdaptive != void 0 && config.audioAdaptive`
           * y la config del módulo solo acepta diez claves: audioAdaptive, hls,
           * idSync, omnyClipId, omnyOrganizationId, platformId, plugins, rawXML,
           * sid, url.
           *
           * Lo que hace: el SDK clasifica los mounts de la estación en
           * `audioAdaptive | aac | mp3`, y con esto en `true` prefiere el ADAPTATIVO
           * (para Beat, `XHSONFM_ADP`).
           *
           * Así que `false` significa que HOY Beat está optando explícitamente por
           * el mount fijo: MP3 a 48 kbps por HTTP progresivo, sin escalón al que
           * caer. Es sospechoso de ser la causa de los cortes que reportan los
           * oyentes — ver la nota de abajo.
           *
           * ⚠️ CORRECCIÓN de lo que este comentario decía antes: afirmaba que el
           * `false` aquí y el `true` de abajo eran una pareja deliberada. No lo son.
           * El de abajo NO ESTÁ en la config del módulo, así que no lo lee nadie: es
           * decorativo. El único que cuenta es este.
           */
          audioAdaptive: false,
          plugins: [{ id: 'vastAd' }],
        },
      ],
      /**
       * ⚠️ Decorativo: `audioAdaptive` a nivel raíz NO está en la config que lee el
       * SDK (solo lo lee el módulo MediaPlayer, arriba). Se conserva porque los
       * cuatro repos hermanos lo tienen y quitarlo invita a que alguien "arregle" el
       * de arriba por simetría. No cambia nada.
       */
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

        // La intención que quedó pendiente mientras el SDK cargaba. Es lo que hace
        // que el PRIMER clic de la sesión reproduzca.
        if (arranquePendiente) {
          arranquePendiente = false;
          arrancar();
        }
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
  } catch (err) {
    iniciado = false;
    sdk = null;
    if (import.meta.env.DEV) console.error('[player] el SDK no se pudo construir', err);
    return;
  }

  sdk.addEventListener('stream-status', alCambiarEstado);

  /**
   * ───────── Metadata en banda (cue points de Triton) ─────────
   *
   * 🔴 Esta es la fuente correcta del "qué suena", y no un JSON encuestado.
   *
   * El sitio viejo consulta `cdn.nrm.com.mx/.../cancion.json` cada 15-60 s y de
   * paso adivina los cortes comerciales revisando si `categoria` está en una lista
   * (COMERCIALES, DROP, ELEMENTOS…). Dos problemas:
   *
   *  1. Ese JSON refleja lo que hace el PLAYOUT, no lo que el oyente está
   *     escuchando. Con el búfer del stream de por medio, el sitio muestra una
   *     canción que todavía no suena. Es un desfase que el polling no puede
   *     arreglar por más frecuente que sea.
   *  2. Y encuestar cuesta una petición por intervalo, por oyente, para siempre.
   *
   * Los cue points vienen DENTRO del stream por el canal SBM (el `_SBM` que se ve
   * como `eventsource` en la red), así que llegan **alineados con el audio** y solo
   * cuando algo cambia. El SDK ya tiene ese canal abierto: el sitio viejo lo tiene
   * conectado y no lo usa.
   *
   * ✅ Nombres de campo VERIFICADOS el 2026-08-21, conectando al canal SBM directo
   * (`XHSONFMAAC_SBM`) y observando la señal real de Beat. El payload crudo es:
   *
   *   { "type": "onCuePoint",
   *     "name": "track" | "ad",
   *     "timestamp": 0,                    // ms desde que abrió TU conexión
   *     "parameters": {
   *       "cue_title": "LIFT ME UP (MATHAME REMIX)",
   *       "track_artist_name": "MOBY",
   *       "cue_time_duration": "4010",     // ⚠️ décimas de segundo (401.0 s), inferido
   *       "cue_time_start": "1787325103373",
   *       "cue_id": "87183538-...",
   *       "program_id": "554372:1000217683:8826810",
   *       "ad_type": "endbreak" } }
   *
   * Tres cosas que importan:
   *  · Los campos van en **snake_case** dentro de `parameters`. Yo había adivinado
   *    `cueTitle`/`artistName` en camelCase y NINGUNO habría coincidido: el título
   *    nunca se habría pintado. El SDK puede normalizarlos a camelCase (sus
   *    constantes dicen `CUE_TITLE:'cueTitle'`), así que se aceptan las dos formas.
   *  · Lo que distingue canción de cortinilla es **`name`**, no `ad_type`: ese
   *    último venía `"endbreak"` en TODOS, incluida la canción.
   *  · Al conectar, Triton manda el estado actual con `timestamp: 0`. O sea que no
   *    hay que esperar el próximo cambio de canción para saber qué suena.
   */
  const leerCue = (
    data: unknown,
  ): {
    titulo?: string;
    artista?: string;
    hora?: string;
    duracion?: string;
    esCancion: boolean;
  } => {
    type Sobre = {
      data?: Sobre;
      cuePoint?: Record<string, unknown>;
      name?: string;
      parameters?: Record<string, unknown>;
    };
    const bruto = data as Sobre;

    /**
     * 🔴 TODO evento del SDK llega envuelto en `.data`. Esto faltaba, y era el
     * primero de los dos motivos por los que la barra nunca decía la canción.
     *
     * Leído del bundle 2.9, el emisor común de todos los módulos:
     *
     *   emit: function (eventName, data, targetNode) {
     *     … on.emit(this.target, eventName, { data: data, bubbles: true, … })
     *   }
     *
     * O sea que el oyente recibe `{ data: <lo que el módulo emitió> }`. Para
     * `track-cue-point` el módulo emite `{ cuePoint: … }`, así que lo nuestro está
     * en `e.data.cuePoint` — y aquí se leía `e.cuePoint`, que es `undefined`.
     *
     * ⚠️ El resto del archivo ya lo sabía: `alCambiarEstado` lee `e.data?.code` y
     * por eso la máquina de estados SÍ funcionaba. El error estaba solo aquí, y la
     * pista llevaba todo el tiempo veinte líneas más arriba.
     */
    const d = bruto?.data ?? bruto;
    const cp = (d?.cuePoint ?? d?.parameters ?? {}) as Record<string, unknown>;
    /*
      Se busca en el cuePoint Y en su `parameters`: el SDK deja los dos, el
      primero con nombres amistosos y el segundo con los crudos del canal.
    */
    const bolsas: Array<Record<string, unknown>> = [
      cp,
      (cp.parameters as Record<string, unknown>) ?? {},
    ];

    /**
     * 🔴 EL TIPO DEL CUE POINT SE LLAMA `type`, NO `name`.
     *
     * Aquí decía `d?.name ?? cp.name`, y NINGUNO DE LOS DOS EXISTE. Leído del
     * propio bundle del SDK 2.9 (`sdk.listenlive.co/web/2.9/td-sdk.min.js`), que
     * es donde se construye el objeto:
     *
     *   __onCuePoint: function (data) {
     *     var cuePoint = {
     *       parameters: data.parameters,
     *       timestamp:  data.timestamp,
     *       type:       data.name        // ← el `name` del canal se guarda aquí
     *     };
     *     …
     *   }
     *   …
     *   this._onTrackCuePoint({ cuePoint: cuePoint })
     *
     * O sea: el canal SBM manda `name: "track"`, el SDK lo renombra a `type`, y
     * nosotros preguntábamos por `name`. `nombre` salía SIEMPRE cadena vacía, la
     * lista blanca lo tomaba por «no es canción» y **se descartaban el 100% de los
     * cue points**. La barra se quedaba en «Beat 100.9» para siempre.
     *
     * ⚠️ Y lo que lo destapó del todo: este agujero lo ABRIÓ un endurecimiento
     * anterior. Antes la condición era `nombre === '' || nombre === 'track'`, y ese
     * `''` —que se quitó por ser un riesgo real, y con razón— era lo único que
     * dejaba pasar los cue points. O sea que la lista blanca estaba bien y el campo
     * mal: al cerrar el hueco, lo que funcionaba por accidente dejó de funcionar.
     * Cerrar un agujero sin comprobar qué pasaba por él es cómo se rompe algo
     * arreglándolo.
     *
     * Se conserva `name` como alternativa para la forma CRUDA del canal, por si
     * alguna vez se lee el SBM sin pasar por el SDK.
     */
    const nombre = String(
      cp.type ?? d?.name ?? bruto?.name ?? (cp.parameters as Record<string, unknown>)?.name ?? '',
    );

    const tomar = (...claves: string[]): string | undefined => {
      for (const k of claves) {
        for (const bolsa of bolsas) {
          const v = bolsa[k];
          if (typeof v === 'string' && v.trim()) return v.trim();
        }
      }
      return undefined;
    };
    /**
     * La hora a la que empezó a sonar, en hora de MÉXICO.
     *
     * `cue_time_start` es epoch en MILISEGUNDOS —medido en la captura del canal,
     * no supuesto— y llega como texto. Se valida antes de formatear: un número
     * absurdo pintaría una hora absurda en la barra, y más vale no pintar nada.
     *
     * ⚠️ La zona va fija a `America/Mexico_City` y no al reloj del visitante: es
     * la hora a la que la estación lo puso al aire. Para quien escuche desde
     * Madrid, «03:12» de su reloj no significa nada.
     */
    const hora = (() => {
      const crudo = tomar('cueTimeStart', 'cue_time_start');
      const ms = Number(crudo);
      if (!Number.isFinite(ms) || ms < 1e12) return undefined;
      try {
        return new Intl.DateTimeFormat('es-MX', {
          timeZone: 'America/Mexico_City',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(ms));
      } catch {
        return undefined;
      }
    })();

    return {
      hora,
      // Crudo, en décimas de segundo. Lo interpreta `programarCaducidad()`.
      duracion: tomar('cueTimeDuration', 'cue_time_duration'),
      /*
        Los dos juegos de nombres, VERIFICADOS contra el `cuePointMap` del bundle
        y no adivinados: el SDK copia cada parámetro crudo a un alias amistoso
        —`cue_title` → `cueTitle`, `track_artist_name` → `artistName`— y conserva
        los crudos dentro de `parameters`. Se prueban los dos porque el alias solo
        existe si la clave está en ese mapa.
      */
      titulo: tomar('cueTitle', 'cue_title', 'title'),
      artista: tomar('artistName', 'track_artist_name', 'artist', 'trackArtist'),
      /**
       * 🔴 LISTA BLANCA ESTRICTA: solo `track` se pinta. Nada más.
       *
       * Antes esto decía `nombre === '' || nombre === 'track'`, y ese `''` era un
       * agujero: un cue point SIN nombre se habría tratado como canción y su
       * `cue_title` habría salido en pantalla.
       *
       * Importa porque el universo de tipos es más grande de lo que parece — el SDK
       * conoce SIETE: track, ad-break, custom, hls, metadata, speech y empty. El de
       * `custom` es lo que cada estación configure, así que puede traer cualquier
       * cosa, incluidos códigos internos. Y ya vimos que los de `ad` traen nombres
       * de asset como «FRASE BEAT 100.9 FM (ROMPECORTE)-01» y de anunciante como
       * «RDF1382026 \ BANXICO CONTIGO 2026».
       *
       * Con lista negra, un tipo nuevo entra solo y aparece en la barra sin que
       * nadie se entere. Con lista blanca, lo que no se conoce simplemente no se
       * muestra. Es el mismo criterio que el CMS aplica a `categoriasMusicales`, y
       * por la misma razón.
       */
      esCancion: nombre === 'track',
    };
  };

  sdk.addEventListener('track-cue-point', (e) => {
    cuesRecibidos++;
    const { titulo, artista, hora, duracion, esCancion } = leerCue(e);

    /*
      🔴 Se traza ANTES de los filtros y con el motivo del descarte. Trazar
      después solo enseña los que ya pasaron, que son justo los que no dan
      problema — y era el error del log anterior.
    */
    traza('cue point', {
      titulo,
      artista,
      hora,
      duracionSegundos: Number(duracion) / 10 || undefined,
      esCancion,
      decision: !titulo
        ? '❌ descartado: sin título'
        : !esCancion
          ? '❌ descartado: no es `track` (mira `cuePoint.type`)'
          : '✅ a pantalla',
      crudo: e,
    });

    if (!titulo) return; // sin título no se pisa lo que ya está
    /**
     * 🔴 Las cortinillas NO se muestran. La señal de Beat manda cue points de
     * `name: "ad"` con títulos como «FRASE APP» o «FRASE BEAT 100.9 FM
     * (ROMPECORTE)-01» — son elementos de continuidad de la estación, no música, y
     * pintarlos en la barra sería peor que no pintar nada: el oyente vería el
     * nombre interno de una cortinilla donde espera una canción.
     */
    if (!esCancion) return;
    textoOriginal = [titulo, artista].filter(Boolean).join(' · ');
    horaOriginal = hora ?? null;
    programarCaducidad(duracion);
    // Durante un corte no se pisa el aviso; al terminar se restaura este valor.
    if (contenedor()?.dataset.status !== 'anuncio') restaurarSonando();
  });

  /*
    🔴 Los OTROS canales de metadata, solo para el diagnóstico.
    Si `track-cue-point` no llega pero estos sí, el problema no es la conexión al
    canal sino cómo está configurada la estación en Triton — y eso se resuelve en
    otro sitio, no en este archivo. No cambian ningún comportamiento.
  */
  if (DEPURA) {
    for (const ev of ['speech-cue-point', 'custom-cue-point', 'cue-point'] as const) {
      sdk.addEventListener(ev, (e) => {
        cuesRecibidos++;
        traza(`otro canal · ${ev}`, e);
      });
    }
  }

  /**
   * Marcadores de corte comercial, en banda. Sustituyen a la heurística de
   * categorías del sitio viejo, que dependía de mantener una lista a mano y se
   * rompía cuando el playout agregaba una categoría nueva.
   *
   * Es distinto de `ad-playback-*`, que son los audio ads que inserta el propio
   * SDK: esto marca los cortes de la señal al aire.
   */
  sdk.addEventListener('ad-break-cue-point', () => {
    pintarEstado('anuncio');
    pintarSonando('PAUSA COMERCIAL');
  });

  sdk.addEventListener('ad-break-cue-point-complete', () => {
    if (contenedor()?.dataset.status === 'anuncio') pintarEstado('sonando');
    restaurarSonando();
  });

  /**
   * Abre o cierra el modal del anuncio.
   *
   * 🔴 Esto FALTABA, y era una regresión respecto al v1: el estado y la analítica
   * del ad estaban bien, pero nadie mostraba `#td_container`, así que el IMA
   * montaba el `<lima-video>` dentro de una caja de 1×1 y **el video ad no se veía**.
   *
   * `aria-hidden` se apaga mientras el anuncio corre: el creativo puede traer un
   * botón de omitir, y un control que no se puede alcanzar con teclado ni con
   * lector de pantalla es peor que no tenerlo.
   */
  const modalAnuncio = (abierto: boolean): void => {
    document.getElementById('td_container')?.classList.toggle('es-anuncio', abierto);
    const contenedorAd = document.getElementById('td_container');
    if (contenedorAd) contenedorAd.setAttribute('aria-hidden', abierto ? 'false' : 'true');
    const telon = document.getElementById('td-telon');
    if (telon) telon.hidden = !abierto;
  };

  /**
   * Red de seguridad. Si `ad-playback-complete` no llega nunca —el SDK se atora,
   * la red se cae a media pausa— el telón se queda puesto a pantalla completa y el
   * sitio queda inservible. El v1 tiene ese riesgo abierto; aquí el modal se cierra
   * solo pasados 45 s, que es más de lo que dura cualquier pre-roll de 30.
   */
  let relojAnuncio: ReturnType<typeof setTimeout> | null = null;
  const cerrarAnuncio = (): void => {
    if (relojAnuncio) clearTimeout(relojAnuncio);
    relojAnuncio = null;
    modalAnuncio(false);
  };

  sdk.addEventListener('ad-playback-start', () => {
    pintarEstado('anuncio');
    pintarSonando('PAUSA COMERCIAL');
    modalAnuncio(true);
    if (relojAnuncio) clearTimeout(relojAnuncio);
    relojAnuncio = setTimeout(cerrarAnuncio, 45_000);
    eventoTriton('ad_start', ctxAnalitica());
  });

  sdk.addEventListener('ad-playback-complete', () => {
    cerrarAnuncio();
    eventoTriton('ad_complete', ctxAnalitica());
    reproducir();
  });

  /**
   * Un VAST que falla NO interrumpe la sesión: se pasa directo a la señal. Pasa
   * de rutina cuando hay un bloqueador de anuncios, y en el v1 estaba anotado
   * como «comportamiento esperado, no bug».
   */
  sdk.addEventListener('ad-playback-error', () => {
    cerrarAnuncio();
    eventoTriton('ad_error', ctxAnalitica());
    reproducir();
  });

  // ---- Controles ----
  el<HTMLButtonElement>('[data-accion="play"]')?.addEventListener('click', () => {
    if (mandaLaPista()) return; // el clic es de la pista, no del directo
    const estado = contenedor()?.dataset.status;
    if (estado === 'sonando' || estado === 'cargando' || estado === 'anuncio') {
      sdk?.stop();
      pintarEstado('init');
    } else {
      // Respuesta inmediata al clic: Triton tarda en emitir su primer estado.
      reclamarAudio(FUENTES.radio);
      const p3 = contenedor();
      if (p3) p3.dataset.modo = 'directo';
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
