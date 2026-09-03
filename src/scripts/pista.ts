/**
 * Pistas a demanda en la BARRA PRINCIPAL — los mp3 de Bonus Beat.
 *
 * 🔴 Un `<audio>` nativo, NO Plyr. Plyr existe en este proyecto por una sola
 * razón: las cápsulas del Fenómeno pueden ser YouTube **o** mp4, y un `<video>`
 * nativo no reproduce YouTube. Un mp3 servido desde nuestro propio bucket no tiene
 * ese problema, así que Plyr aquí serían 110 KB para obtener lo que
 * `new Audio()` ya hace — y, peor, una SEGUNDA interfaz de controles dentro de una
 * barra que ya tiene los suyos. Lo que se pidió es que la pista suene en el player
 * general, no que aparezca otro player.
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
  src: string;
  titulo: string;
  artista: string;
}

interface VentanaConPista {
  __beatPista?: HTMLAudioElement;
  __beatPistaLista?: boolean;
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
function marcarFila(src: string | null): void {
  for (const b of document.querySelectorAll<HTMLElement>('[data-pista-src]')) {
    const suya = b.dataset.pistaSrc === src;
    b.toggleAttribute('data-sonando', suya);
    b.setAttribute('aria-pressed', String(suya));
  }
}

function progreso(): HTMLInputElement | null {
  return el<HTMLInputElement>('[data-accion="progreso"]');
}

function pintarProgreso(): void {
  const a = audio();
  const barraProgreso = progreso();
  if (!barraProgreso) return;
  /*
    `duration` es `NaN` hasta que llegan los metadatos, e `Infinity` en un flujo
    sin fin. En los dos casos la barra no puede decir nada, así que se apaga en
    vez de pintar una posición inventada.
  */
  const total = a.duration;
  const utilizable = Number.isFinite(total) && total > 0;
  barraProgreso.disabled = !utilizable;
  barraProgreso.max = utilizable ? String(Math.floor(total)) : '0';
  barraProgreso.value = String(Math.floor(a.currentTime));
  barraProgreso.style.setProperty(
    '--avance',
    utilizable ? `${(a.currentTime / total) * 100}%` : '0%',
  );
}

/** Arranca una pista concreta de la cola. */
function sonar(i: number): void {
  const p = cola[i];
  if (!p) return;
  indice = i;

  const a = audio();
  reclamarAudio(FUENTES.pista);
  modo('pista');
  pintarPista(p);
  marcarFila(p.src);

  if (a.src !== p.src) a.src = p.src;
  /*
    🔴 `play()` devuelve una promesa que RECHAZA si el navegador bloquea la
    reproducción, y un rechazo sin `catch` es un error no capturado en consola. Y
    más importante: si falla, la interfaz no puede quedarse diciendo que suena.
  */
  void a
    .play()
    .then(() => {
      pintarBoton(true);
      ga4('pista_play', { titulo: p.titulo, artista: p.artista });
    })
    .catch(() => {
      pintarBoton(false);
      marcarFila(null);
    });
}

/**
 * Devuelve la barra al directo.
 *
 * 🔴 Existe porque sin ella nos llevamos al oyente FUERA de la señal sin puerta de
 * vuelta, y la señal en vivo es lo que este sitio afirma ser (§4.1 del mapa de
 * sitio). Para el árbitro de audio del sitio esto es solo pausar; para el producto
 * es lo contrario de una trampa.
 *
 * ⚠️ NO arranca el radio: pausar una pista y que empiece a sonar otra cosa que
 * nadie pidió es peor que el silencio. Devuelve la barra a su estado de partida y
 * el oyente pulsa play si quiere.
 */
export function volverAlDirecto(): void {
  const a = w().__beatPista;
  if (a) {
    a.pause();
    a.currentTime = 0;
  }
  cola = [];
  indice = -1;
  marcarFila(null);
  pintarPista(null);
  modo('directo');
  pintarBoton(false);
  // El player del radio vuelve a mandar en el botón; que nazca en reposo.
  const p = barra();
  if (p) p.dataset.status = 'init';
}

/** Alterna la pista en curso. Lo llama el botón de play cuando el modo es pista. */
function alternar(): void {
  const a = audio();
  if (a.paused) {
    reclamarAudio(FUENTES.pista);
    void a.play().then(() => pintarBoton(true)).catch(() => pintarBoton(false));
  } else {
    a.pause();
    pintarBoton(false);
  }
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
    ? Array.from(lista.querySelectorAll<HTMLElement>('[data-pista-src]'))
    : [boton];

  cola = filas.map((f) => ({
    src: f.dataset.pistaSrc ?? '',
    titulo: f.dataset.pistaTitulo ?? '',
    artista: f.dataset.pistaArtista ?? '',
  }));

  const i = filas.indexOf(boton);
  const a = audio();

  // Pulsar la que YA está sonando es pausarla, no reiniciarla.
  if (i === indice && !a.paused) {
    a.pause();
    pintarBoton(false);
    return;
  }
  sonar(i < 0 ? 0 : i);
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
    if (!a.paused) {
      a.pause();
      pintarBoton(false);
    }
  });

  a.addEventListener('timeupdate', pintarProgreso);
  a.addEventListener('loadedmetadata', pintarProgreso);
  a.addEventListener('pause', () => pintarBoton(false));
  a.addEventListener('play', () => pintarBoton(true));

  /*
    Al acabar: la siguiente de la tanda. Y si era la última, se queda en pausa con
    el botón de volver al directo a la vista — sin encender el radio por su cuenta.
  */
  a.addEventListener('ended', () => {
    ga4('pista_fin', { titulo: cola[indice]?.titulo ?? '' });
    if (indice + 1 < cola.length) sonar(indice + 1);
    else {
      pintarBoton(false);
      marcarFila(null);
    }
  });

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

    const fila = t.closest<HTMLElement>('[data-pista-src]');
    if (fila) {
      e.preventDefault();
      desdeFila(fila);
      return;
    }

    if (t.closest('[data-accion="directo"]')) {
      e.preventDefault();
      volverAlDirecto();
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
    const total = a.duration;
    if (Number.isFinite(total) && total > 0) a.currentTime = Number(t.value);
  });

  /*
    Tras navegar, la fila que sonaba está en otra página o ya no existe: se vuelve
    a marcar contra el DOM nuevo. Es la misma lección que la cabecera —nada que
    dependa de la página puede quedarse escrito en el bloque persistente.
  */
  document.addEventListener('astro:after-swap', () => {
    marcarFila(a.paused ? null : (cola[indice]?.src ?? null));
  });
}
