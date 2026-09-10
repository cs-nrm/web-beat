/**
 * Pistas a demanda en la BARRA PRINCIPAL — las canciones de Bonus Beat.
 *
 * 🔴 DOS motores detrás de la misma barra, y el segundo entró el 2026-09-09:
 *
 *   · `nativo` — un `<audio>` para un mp3 nuestro. Es el bueno: sin iframe, sin
 *     terceros, sin la política de nadie, y `new Audio()` hace todo lo que hace
 *     falta sin cargar 110 KB de Plyr.
 *   · `youtube` — Plyr sobre un iframe de YouTube, en un visor FLOTANTE abajo a la
 *     derecha con su X para cerrarlo.
 *
 * 🔴 Por qué el segundo, si el primero es mejor: porque el primero no tiene nada
 * que reproducir. Medido contra el CMS, ninguna de las 8 canciones capturadas trae
 * `audio` y las 8 traen su URL de YouTube. La barra existía, la cola existía, el
 * árbitro existía — y no sonaba nada porque faltaba el archivo.
 *
 * 🔴 Y por qué el visor VA VISIBLE, cuando lo cómodo sería esconderlo y dejar solo
 * el audio: las políticas del reproductor incrustado de YouTube piden un
 * reproductor visible, de al menos 200×200 y sin obstruir, y prohíben separar el
 * audio del video. Ocultarlo es una línea de CSS y es justo la línea que no se
 * escribe. Decisión de Carlos con el riesgo sobre la mesa (2026-09-09).
 *
 * 🔴 El elemento vive en `window`, igual que el registro del árbitro y por lo
 * mismo: la barra sobrevive a la navegación (`transition:persist`) pero este
 * módulo puede volver a evaluarse, y un `<audio>` nuevo por página dejaría el
 * anterior sonando sin que nadie lo pueda parar.
 *
 * ⚠️ No se le pone `preload`: son tres mp3 en una página, y precargarlos baja
 * megabytes que casi nadie va a escuchar. Se carga al pulsar.
 */
import { registrarAudio, reclamarAudio, FUENTES } from './audio';
import { ga4 } from './analitica';

export interface Pista {
  /** El mp3 propio, o `null` si esta canción solo tiene YouTube. */
  src: string | null;
  /** El id de 11 caracteres del video, ya validado en el servidor. */
  yt: string | null;
  titulo: string;
  artista: string;
}

/** Cuál de los dos motores atiende a la pista en curso. */
type Motor = 'nativo' | 'youtube';

/**
 * Lo que la barra necesita saber de un motor, sea el que sea.
 *
 * 🔴 Es la pieza que evita duplicar la barra. Sin esto, pintar el progreso, mover
 * el botón o encadenar la siguiente canción habría necesitado dos versiones de cada
 * función —una por motor— y la que se olvidara de actualizar sería el bug. Con esto
 * hay UNA barra que le pregunta al motor activo.
 */
interface Mando {
  reproducir(): void;
  pausar(): void;
  readonly pausado: boolean;
  readonly tiempo: number;
  /** `NaN` o `Infinity` mientras no se sepa: la barra ya sabe apagarse con eso. */
  readonly duracion: number;
  buscar(segundos: number): void;
}

interface VentanaConPista {
  __beatPista?: HTMLAudioElement;
  __beatPistaLista?: boolean;
  /** La instancia de Plyr del visor flotante, una por sesión. */
  __beatPistaYt?: PlyrPista | null;
}

/** Lo que este módulo usa de Plyr. Mismo recorte que en `video.ts`. */
interface PlyrPista {
  source: {
    type: 'video';
    title?: string;
    sources: Array<{ src: string; provider: 'youtube' }>;
  };
  readonly playing: boolean;
  readonly paused: boolean;
  currentTime: number;
  readonly duration: number;
  play(): Promise<void> | void;
  pause(): void;
  on(evento: string, cb: () => void): void;
  once(evento: string, cb: () => void): void;
}

/** El estado que el CSS mira, en `#player[data-modo]`. */
type Modo = 'directo' | 'pista';

let cola: Pista[] = [];
let indice = -1;

const w = () => window as unknown as VentanaConPista;
const barra = () => document.getElementById('player');
const el = <T extends HTMLElement>(sel: string): T | null =>
  barra()?.querySelector<T>(sel) ?? null;

/**
 * El `<audio>`, creado la primera vez que hace falta.
 *
 * No se mete en el DOM: no tiene controles propios ni ocupa sitio, y un elemento
 * suelto reproduce igual. Meterlo en la barra lo expondría a que una navegación lo
 * arrastre o lo reemplace.
 */
function audio(): HTMLAudioElement {
  const ventana = w();
  if (!ventana.__beatPista) {
    const a = new Audio();
    a.preload = 'none';
    ventana.__beatPista = a;
  }
  return ventana.__beatPista;
}

/* ────────────────────────────────────────────────────────────────────────────
   EL VISOR FLOTANTE DE YOUTUBE
   ──────────────────────────────────────────────────────────────────────────── */

/**
 * El marco del visor, que vive en el marcado y no se construye aquí.
 *
 * 🔴 Está en `Base.astro` con `transition:persist` por la misma razón que la barra:
 * si lo creara este script, cada navegación traería un marco nuevo y el iframe
 * anterior se quedaría sonando dentro de un nodo huérfano. Persistido, el video
 * sigue sonando al cambiar de página — que es lo que hace la barra y lo que el
 * oyente espera.
 */
const visor = () => document.querySelector<HTMLElement>('[data-pista-visor]');

let Plyr: (new (el: HTMLElement, opciones?: unknown) => PlyrPista) | null = null;
let cargandoPlyr: Promise<void> | null = null;

/** Baja Plyr una sola vez. Se memoriza la PROMESA, como en `video.ts`. */
function cargarPlyr(): Promise<void> {
  if (!cargandoPlyr) {
    cargandoPlyr = import('plyr')
      .then((mod) => {
        Plyr = (mod.default ?? mod) as never;
      })
      .catch((err) => {
        // No se memoriza el fallo: el siguiente clic debe poder reintentar.
        cargandoPlyr = null;
        throw err;
      });
  }
  return cargandoPlyr;
}

/** Muestra u oculta el marco. `hidden` y no `display`, para que sea una sola verdad. */
function mostrarVisor(si: boolean): void {
  const v = visor();
  if (v) v.hidden = !si;
}

/** Cuál de los dos motores atiende a la pista en curso. */
let motor: Motor = 'nativo';

/**
 * La instancia de Plyr del visor, creada la primera vez que hace falta.
 *
 * ⚠️ Devuelve `null` si el marco no está en la página. No es un caso hipotético:
 * `Base.astro` lo pinta en todas, pero un fallo de marcado dejaría a este módulo
 * construyendo Plyr sobre nada, y un `throw` aquí se comería el clic entero.
 */
async function plyr(): Promise<PlyrPista | null> {
  const ventana = w();
  if (ventana.__beatPistaYt) return ventana.__beatPistaYt;

  const marco = visor();
  const montaje = marco?.querySelector<HTMLElement>('[data-pista-montaje]');
  if (!marco || !montaje) return null;

  try {
    await cargarPlyr();
  } catch {
    return null;
  }
  if (!Plyr) return null;

  const p = new Plyr(montaje, {
    // `noCookie` usa youtube-nocookie.com: sin cookies de perfilado hasta que
    // alguien le da play. Mismo criterio que el visor del Fenómeno.
    youtube: { noCookie: true, rel: 0, modestbranding: 1 },
    controls: ['play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
    i18n: { play: 'Reproducir', pause: 'Pausa', mute: 'Silenciar', unmute: 'Activar sonido' },
  });

  /*
    🔴 Los escuchas se enlazan UNA vez, aquí, y no tras cada cambio de fuente.

    Es lo contrario de `video.ts`, y la diferencia es real: allí la fuente alterna
    entre mp4 y YouTube, y cambiar de proveedor hace que Plyr reconstruya el
    elemento de medios y se lleve los escuchas por delante. Aquí el proveedor es
    SIEMPRE YouTube, así que el iframe se conserva y estos escuchas viven lo que
    viva la instancia.
  */
  p.on('play', () => pintarBoton(true));
  p.on('pause', () => pintarBoton(false));
  p.on('timeupdate', pintarProgreso);
  p.on('loadedmetadata', pintarProgreso);
  p.on('ended', alTerminar);

  ventana.__beatPistaYt = p;
  return p;
}

/**
 * El motor activo, hablado por una sola interfaz.
 *
 * ⚠️ El de YouTube puede no existir todavía —Plyr baja a demanda— y en ese hueco
 * se devuelve un mando inerte en vez de `null`: así quien pinta la barra no tiene
 * que preguntar si hay motor antes de cada lectura, que es como se llega a un
 * `undefined` en un `toFixed`.
 */
function mando(): Mando {
  if (motor === 'youtube') {
    const p = w().__beatPistaYt;
    if (!p) return INERTE;
    return {
      reproducir: () => {
        const r = p.play();
        if (r && typeof r.catch === 'function') r.catch(() => {});
      },
      pausar: () => p.pause(),
      get pausado() {
        return p.paused;
      },
      get tiempo() {
        return p.currentTime;
      },
      get duracion() {
        return p.duration;
      },
      buscar: (sg) => {
        p.currentTime = sg;
      },
    };
  }
  const a = audio();
  return {
    reproducir: () => {
      void a.play().catch(() => pintarBoton(false));
    },
    pausar: () => a.pause(),
    get pausado() {
      return a.paused;
    },
    get tiempo() {
      return a.currentTime;
    },
    get duracion() {
      return a.duration;
    },
    buscar: (sg) => {
      a.currentTime = sg;
    },
  };
}

/** El mando de «todavía no hay motor»: se deja preguntar y no hace nada. */
const INERTE: Mando = {
  reproducir: () => {},
  pausar: () => {},
  pausado: true,
  tiempo: 0,
  duracion: NaN,
  buscar: () => {},
};

/**
 * La clave con la que se reconoce una fila.
 *
 * 🔴 Una sola regla, usada por la cola Y por el marcado de las filas. Con dos
 * fuentes posibles hacía falta una identidad común, y calcularla en dos sitios con
 * dos reglas parecidas es exactamente cómo se llega a que la fila que suena no se
 * marque.
 */
function clave(p: { src?: string | null; yt?: string | null }): string {
  return p.src || (p.yt ? `yt:${p.yt}` : '');
}

function modo(valor: Modo): void {
  const p = barra();
  if (!p) return;
  p.dataset.modo = valor;
}

/** Pinta el botón de play según esté sonando o no. */
function pintarBoton(sonando: boolean): void {
  const boton = el<HTMLButtonElement>('[data-accion="play"]');
  if (!boton) return;
  boton.setAttribute('aria-pressed', String(sonando));
  boton.setAttribute('aria-label', sonando ? 'Pausar la pista' : 'Reanudar la pista');
  boton.removeAttribute('aria-busy');
  const icono = (n: string, visible: boolean) =>
    boton.querySelector(`[data-icono="${n}"]`)?.classList.toggle('hidden', !visible);
  icono('play', !sonando);
  icono('pause', sonando);
  icono('cargando', false);

  /*
    🔴 Y la FILA al aire refleja lo mismo, que es lo que faltaba.

    `data-sonando` solo se ponía al arrancar y se quitaba al terminar, así que una
    canción PAUSADA seguía mostrando el icono de pausa: el control decía «púlsame
    para pausar» sobre algo ya detenido. Pintándola desde aquí —que es donde llegan
    los eventos `play` y `pause` de los dos motores— la fila y la barra no pueden
    discrepar.
  */
  const actual = cola[indice];
  marcarFila(sonando && actual ? clave(actual) : null);
}

/**
 * El botón en «cargando», con el mismo tercer icono que usa el directo.
 *
 * 🔴 Hacía falta al entrar YouTube y no antes: un mp3 arranca casi al instante,
 * pero aquí hay 110 KB de Plyr y el montaje de un iframe por delante. Sin acuse de
 * recibo, el oyente vuelve a pulsar y se pelea con su propio clic.
 */
function pintarCargando(): void {
  const boton = el<HTMLButtonElement>('[data-accion="play"]');
  if (!boton) return;
  boton.setAttribute('aria-busy', 'true');
  const icono = (n: string, visible: boolean) =>
    boton.querySelector(`[data-icono="${n}"]`)?.classList.toggle('hidden', !visible);
  icono('play', false);
  icono('pause', false);
  icono('cargando', true);
}

function pintarPista(p: Pista | null): void {
  const campo = el('[data-campo="pista"]');
  if (campo) campo.textContent = p ? [p.artista, p.titulo].filter(Boolean).join(' · ') : '';
}

/**
 * Marca en la página qué fila está sonando.
 *
 * Se limpia SIEMPRE antes de marcar, y se busca en todo el documento y no en una
 * lista concreta: al navegar, la fila que estaba sonando puede ya no existir, y
 * una marca huérfana es peor que ninguna.
 */
function marcarFila(cl: string | null): void {
  for (const b of document.querySelectorAll<HTMLElement>('[data-pista-src], [data-pista-yt]')) {
    const suya = Boolean(cl) && clave({ src: b.dataset.pistaSrc, yt: b.dataset.pistaYt }) === cl;
    b.toggleAttribute('data-sonando', suya);
    b.setAttribute('aria-pressed', String(suya));
  }
}

function progreso(): HTMLInputElement | null {
  return el<HTMLInputElement>('[data-accion="progreso"]');
}

function pintarProgreso(): void {
  const m = mando();
  const barraProgreso = progreso();
  if (!barraProgreso) return;
  /*
    `duration` es `NaN` hasta que llegan los metadatos, e `Infinity` en un flujo
    sin fin. En los dos casos la barra no puede decir nada, así que se apaga en
    vez de pintar una posición inventada.
  */
  const total = m.duracion;
  const utilizable = Number.isFinite(total) && total > 0;
  barraProgreso.disabled = !utilizable;
  barraProgreso.max = utilizable ? String(Math.floor(total)) : '0';
  barraProgreso.value = String(Math.floor(m.tiempo));
  barraProgreso.style.setProperty(
    '--avance',
    utilizable ? `${(m.tiempo / total) * 100}%` : '0%',
  );
}

/** Arranca una pista concreta de la cola. */
function sonar(i: number): void {
  const p = cola[i];
  if (!p) return;
  indice = i;

  /*
    🔴 El motor se elige por lo que TRAE la canción, con el mp3 por delante. Si
    algún día se captura el archivo, esa canción pasa sola al camino nativo y deja
    de abrir el visor — sin tocar una línea de esto.
  */
  motor = p.src ? 'nativo' : 'youtube';

  reclamarAudio(FUENTES.pista);
  modo('pista');
  pintarPista(p);
  marcarFila(clave(p));

  if (motor === 'nativo') {
    // El otro motor, si existe, se calla: son dos y solo uno manda.
    w().__beatPistaYt?.pause();
    mostrarVisor(false);
    const a = audio();
    if (p.src && a.src !== p.src) a.src = p.src;
    /*
      🔴 `play()` devuelve una promesa que RECHAZA si el navegador bloquea la
      reproducción, y un rechazo sin `catch` es un error no capturado en consola. Y
      más importante: si falla, la interfaz no puede quedarse diciendo que suena.
    */
    void a
      .play()
      .then(() => {
        pintarBoton(true);
        ga4('pista_play', { titulo: p.titulo, artista: p.artista, motor: 'nativo' });
      })
      .catch(() => {
        pintarBoton(false);
        marcarFila(null);
      });
    return;
  }

  // ── camino de YouTube ──
  audio().pause();
  /*
    El botón dice «cargando» desde YA. Entre el clic y el primer fotograma hay 110
    KB de Plyr más el arranque del iframe: sin esto, el oyente pulsa y no pasa nada
    visible durante un segundo largo.
  */
  pintarCargando();
  void arrancarYoutube(p);
}

/**
 * Pone la canción en el visor flotante y la reproduce.
 *
 * ⚠️ `once('ready')` y no un `play()` inmediato, por la lección de `video.ts`:
 * asignar `source` con proveedor de YouTube arranca una reconstrucción asíncrona
 * —hay que cargar la API de YouTube y montar el iframe— y un `play()` lanzado antes
 * de que termine se pierde en silencio, dejando el reproductor detenido con la
 * fuente correcta cargada.
 */
async function arrancarYoutube(p: Pista): Promise<void> {
  if (!p.yt) return;
  const reproductor = await plyr();
  if (!reproductor) {
    // Sin visor no hay nada que enseñar; la barra no puede quedarse «cargando».
    pintarBoton(false);
    marcarFila(null);
    pintarPista(null);
    modo('directo');
    return;
  }

  mostrarVisor(true);
  reproductor.source = {
    type: 'video',
    title: [p.artista, p.titulo].filter(Boolean).join(' · '),
    sources: [{ src: p.yt, provider: 'youtube' }],
  };
  reproductor.once('ready', () => {
    const r = reproductor.play();
    if (r && typeof r.catch === 'function') r.catch(() => pintarBoton(false));
    ga4('pista_play', { titulo: p.titulo, artista: p.artista, motor: 'youtube' });
  });
}

/**
 * Lo que pasa al acabar una canción: la siguiente de la tanda.
 *
 * Compartido por los dos motores, que es la razón de que esté aquí arriba y no
 * dentro del cableado de uno de ellos.
 */
function alTerminar(): void {
  ga4('pista_fin', { titulo: cola[indice]?.titulo ?? '' });
  if (indice + 1 < cola.length) sonar(indice + 1);
  else {
    pintarBoton(false);
    marcarFila(null);
  }
}

/**
 * Devuelve la barra al directo.
 *
 * 🔴 Existe porque sin ella nos llevamos al oyente FUERA de la señal sin puerta de
 * vuelta, y la señal en vivo es lo que este sitio afirma ser (§4.1 del mapa de
 * sitio). Para el árbitro de audio del sitio esto es solo pausar; para el producto
 * es lo contrario de una trampa.
 *
 * 🔴 `arrancar` decide si además SUENA, y por defecto no.
 *
 * 📖 Hasta el 2026-09-09 nunca arrancaba, con este argumento: «pausar una pista y
 * que empiece a sonar otra cosa que nadie pidió es peor que el silencio». El
 * argumento sigue siendo bueno para la X del visor —ahí el gesto es «quita esto»—
 * pero era **equivocado para el botón «En vivo»**: ese control no dice «para», dice
 * a dónde quieres ir. Pulsarlo y quedarte en silencio esperando un segundo clic es
 * pedirle al oyente que confirme lo que acaba de pedir. Corregido a pedido de
 * Carlos, que es quien lo usó y notó el paso de más.
 */
export function volverAlDirecto(arrancar = false): void {
  const a = w().__beatPista;
  if (a) {
    a.pause();
    a.currentTime = 0;
  }
  /*
    🔴 Y el visor de YouTube: se PAUSA y se esconde, pero no se destruye. Destruirlo
    obligaría a volver a bajar el iframe y a negociar con YouTube en la siguiente
    canción; escondido, el reproductor sigue ahí y la siguiente arranca en seco.
  */
  const yt = w().__beatPistaYt;
  if (yt) {
    yt.pause();
    yt.currentTime = 0;
  }
  mostrarVisor(false);
  motor = 'nativo';
  cola = [];
  indice = -1;
  marcarFila(null);
  pintarPista(null);
  modo('directo');
  pintarBoton(false);
  // El player del radio vuelve a mandar en el botón; que nazca en reposo.
  const p = barra();
  if (p) p.dataset.status = 'init';
  if (arrancar) pedirDirecto();
}

/**
 * Pide el directo pulsando el botón de play, de verdad.
 *
 * 🔴 Un clic sintético y NO una función importada de `player.ts`, y la razón no es
 * pereza: «arrancar el directo» no es una función allí, son DOS manejadores sobre
 * el mismo botón —el del camino frío, que baja los 854 KB del SDK y guarda la
 * intención en `arranquePendiente`, y el del caliente, que alterna—. Cada uno vive
 * en su clausura con su propio estado (`iniciado`, `listo`, `sdk`). Exportar «lo
 * que hace falta» significaría reestructurar los dos, en el archivo más delicado
 * del repo y con el audio del sitio de por medio.
 *
 * Pulsando el botón se recorre el camino que ya funciona, entero: SDK a demanda,
 * intención pendiente, pre-roll VAST, estados de la barra y el árbitro.
 *
 * ⚠️ Los dos manejadores se protegen con `mandaLaPista()`, que lee `modo` del DOM.
 * Por eso esto va DESPUÉS de `modo('directo')`: al revés, los dos ignorarían el
 * clic por creer que es de la pista, y no pasaría nada.
 *
 * ⚠️ Y funciona porque estamos DENTRO del gesto del usuario —el clic en «En
 * vivo»—, así que la activación sigue vigente y el navegador no bloquea el audio.
 * Llamado desde un temporizador, esto se lo comería la política de autoplay.
 */
function pedirDirecto(): void {
  el<HTMLButtonElement>('[data-accion="play"]')?.click();
}

/** Alterna la pista en curso. Lo llama el botón de play cuando el modo es pista. */
function alternar(): void {
  const m = mando();
  if (m.pausado) {
    // Retomar es empezar a sonar: el canal es suyo otra vez.
    reclamarAudio(FUENTES.pista);
    m.reproducir();
  } else {
    m.pausar();
  }
  /*
    ⚠️ El botón lo pintan los EVENTOS del motor (`play` / `pause`), no esta
    función. Pintarlo aquí sería adivinar: el arranque puede ser rechazado por el
    navegador y la barra se quedaría diciendo que suena algo detenido.
  */
}

/**
 * Empieza a sonar desde una fila, con el resto de su lista detrás.
 *
 * La cola es lo que hace que Bonus Beat se comporte como lo que es —una tanda de
 * tres, no tres archivos sueltos—: al acabar una, entra la siguiente.
 */
function desdeFila(boton: HTMLElement): void {
  const lista = boton.closest<HTMLElement>('[data-pistas]');
  const filas = lista
    ? Array.from(lista.querySelectorAll<HTMLElement>('[data-pista-src], [data-pista-yt]'))
    : [boton];

  /* Qué sonaba ANTES de cambiar la cola: después de reasignarla ya no se sabe. */
  const sonando = cola[indice] ? clave(cola[indice]) : null;

  cola = filas.map((f) => ({
    src: f.dataset.pistaSrc ?? null,
    yt: f.dataset.pistaYt ?? null,
    titulo: f.dataset.pistaTitulo ?? '',
    artista: f.dataset.pistaArtista ?? '',
  }));

  const posicion = filas.indexOf(boton);
  const i = posicion < 0 ? 0 : posicion;

  /*
    🔴 Pulsar la que YA está sonando es un INTERRUPTOR, no un reinicio — y se
    resuelve con `alternar`, que también sabe retomar. Antes solo pausaba: al volver
    a pulsar caía en `sonar()`, que reasigna la fuente y devuelve la canción al
    segundo 0. Es el mismo fallo que tenían las cápsulas del Fenómeno.

    🔴 Y la comparación es por PISTA, no por posición (`i === indice`), que es lo
    que decía antes. En el Inicio hay DOS listas —Bonus Beat y la playlist del
    Fenómeno— y la primera fila de las dos es la posición 0: pulsar la primera de
    una después de la primera de la otra se leía como volver a pulsar la misma
    canción, y en vez de cambiar de pista hacía play/pausa. La posición solo
    significa algo dentro de la cola en la que se midió.
  */
  if (sonando && clave(cola[i]) === sonando) {
    /* La cola es OTRA: el índice tiene que apuntar dentro de esta, o `alTerminar`
       encadenaría la siguiente de la lista anterior. */
    indice = i;
    alternar();
    return;
  }
  sonar(i);
}

export function prepararPista(): void {
  const ventana = w();
  if (ventana.__beatPistaLista) return;
  ventana.__beatPistaLista = true;

  const a = audio();

  /*
    El árbitro: cuando el radio (o un video) reclama el canal, la pista se calla.
    Se queda en modo pista con su título a la vista, no vuelve al directo sola: el
    oyente no ha pedido salir de la pista, solo ha empezado otra cosa.
  */
  registrarAudio(FUENTES.pista, () => {
    /*
      Calla LOS DOS motores. Registrar solo el nativo dejaba a YouTube sonando
      cuando el directo reclamaba el canal — o sea el bug que el árbitro existe
      para no tener: dos cosas sonando a la vez.
    */
    if (!a.paused) a.pause();
    w().__beatPistaYt?.pause();
  });

  a.addEventListener('timeupdate', pintarProgreso);
  a.addEventListener('loadedmetadata', pintarProgreso);
  a.addEventListener('pause', () => pintarBoton(false));
  a.addEventListener('play', () => pintarBoton(true));

  /*
    Al acabar: la siguiente de la tanda. Y si era la última, se queda en pausa con
    el botón de volver al directo a la vista — sin encender el radio por su cuenta.
  */
  a.addEventListener('ended', alTerminar);

  /*
    🔴 Un error de red deja la barra diciendo que suena algo que no suena. Se
    avisa en el campo de la pista, que es donde el oyente está mirando.
  */
  a.addEventListener('error', () => {
    pintarBoton(false);
    marcarFila(null);
    const campo = el('[data-campo="pista"]');
    if (campo) campo.textContent = 'No se pudo cargar la pista';
  });

  /*
    Delegado en el documento: las filas viven en la página, que se reemplaza en
    cada navegación, mientras que este listener se registra una sola vez.
  */
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    /*
      🔴 La X del visor va ANTES que la fila, y el orden importa: el visor flota
      encima de la página y podría quedar sobre una fila de Bonus Beat. Si la fila
      se atendiera primero, cerrar el visor arrancaría la canción de debajo.
    */
    if (t.closest('[data-pista-cerrar]')) {
      e.preventDefault();
      volverAlDirecto();
      return;
    }

    const fila = t.closest<HTMLElement>('[data-pista-src], [data-pista-yt]');
    if (fila) {
      e.preventDefault();
      desdeFila(fila);
      return;
    }

    if (t.closest('[data-accion="directo"]')) {
      e.preventDefault();
      // «En vivo» arranca la señal. Ver el comentario de `volverAlDirecto`.
      volverAlDirecto(true);
      return;
    }

    /*
      El botón de play de la barra lo comparten los dos modos. Aquí solo se
      atiende si manda la pista; si no, el handler de `player.ts` hace lo suyo.
      Los dos listeners conviven y cada uno ignora el modo del otro.
    */
    if (t.closest('[data-accion="play"]') && barra()?.dataset.modo === 'pista') {
      alternar();
    }
  });

  // Buscar dentro de la pista.
  document.addEventListener('input', (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || t.dataset.accion !== 'progreso') return;
    const m = mando();
    const total = m.duracion;
    if (Number.isFinite(total) && total > 0) m.buscar(Number(t.value));
  });

  /*
    Tras navegar, la fila que sonaba está en otra página o ya no existe: se vuelve
    a marcar contra el DOM nuevo. Es la misma lección que la cabecera —nada que
    dependa de la página puede quedarse escrito en el bloque persistente.
  */
  document.addEventListener('astro:after-swap', () => {
    const sonando = !mando().pausado;
    const actual = cola[indice];
    marcarFila(sonando && actual ? clave(actual) : null);
  });
}
