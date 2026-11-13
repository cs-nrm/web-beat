/**
 * Qué transmisión pinta el Inicio, en qué estado y con qué reproductor.
 *
 * Vive aparte de `lib/cms/transmisiones.ts` por la misma razón que `lib/video.ts`
 * y `lib/audio.ts`: aquel módulo pregunta al CMS y este decide, contra el reloj,
 * cómo se lee lo que llegó. Y el reloj NO puede ir en la consulta (ver allí).
 *
 * ── «¿Cuándo sale al aire?» ─────────────────────────────────────────────────
 *
 * El radio del CMS tiene tres valores y aquí cuentan los tres:
 *
 *   · **En vivo ahora** → al aire YA, sin mirar la fecha. Es el interruptor del
 *     editor y la fecha no opina: una transmisión programada para ayer que alguien
 *     prende hoy conserva su fecha vieja, y una de las 18:00 que arranca antes
 *     tiene la fecha en el futuro. Las dos se esconderían si la fecha mandara
 *     (pasó en `web-enfoque`, ver su `lib/cms/transmisiones.ts`).
 *   · **Programar transmisión** → antes de su `fecha` se ANUNCIA («PRÓXIMAMENTE» y
 *     la hora), y a la hora entra al aire SOLA. Es lo que significa programar, y
 *     es como se capturó el primer caso real: «El Beat de Xibalba» venía con
 *     inicio y fin, y nadie iba a prenderla a mano.
 *   · **Fuera de aire** → no existe para el sitio. Ni llega: la consulta la filtra.
 *
 * Y en las dos primeras, `despublicarEn` es el FIN —el ÚNICO: sin él la transmisión
 * sigue en la portada hasta que alguien la apague—: a esa hora la sección se va,
 * aunque el barrido del CMS —que la pasa a «Fuera de aire»— todavía no haya
 * corrido. Ese barrido es por minuto y la caché del CMS son 45 s más: sin mirar la
 * hora aquí, una transmisión terminada seguiría en la portada hasta dos minutos.
 *
 * ⚠️ El texto de ayuda del CMS dice que una programada «no sale al aire hasta que
 * alguien la ponga en vivo» —viene copiado de Enfoque—. En este sitio SÍ sale sola
 * a su hora; si eso cambia, cambia AQUÍ, en `estadoAlAire`.
 */
import { urlMedia, type DocMedia } from './cms/client';
import type { TransmisionCms } from './cms/transmisiones';
import { idYoutube } from './video';

/** Cómo se pinta: al aire, o anunciada para más tarde. */
export type FaseTransmision = 'envivo' | 'proxima';

/** De dónde sale el `src` del iframe. Decide si lleva `sandbox` (ver abajo). */
export type ProveedorTransmision = 'vimeo' | 'youtube' | 'otro';

export interface ReproductorTransmision {
  proveedor: ProveedorTransmision;
  /** `src` del iframe, YA reconstruido: nunca la cadena que pegó el editor. */
  src: string;
  /**
   * Ancho entre alto del cuadro. Sale de lo que se pegó en el CMS —el código de
   * inserción trae su proporción— y si no dice nada, 16:9.
   */
  proporcion: number;
}

export interface CabeceraTransmision {
  src: string;
  ancho: number | null;
  alto: number | null;
  /** Punto focal de Payload, en %: es lo que se conserva al recortar. */
  focoX: number;
  focoY: number;
}

/**
 * El fondo de la sección: el color que eligió el editor y la TINTA que va encima.
 * `null` = sin color capturado, y la sección se queda sobre el fondo del sitio.
 */
export interface FondoTransmision {
  /** `#RRGGBB` tal como se capturó, ya validado. */
  color: string;
  /**
   * Lo que llega al `style`: el color con su opacidad (`OPACIDAD_FONDO`), como
   * `rgb(R G B / A)` armado con NÚMEROS, nunca con la cadena del CMS.
   */
  css: string;
  /** El texto en claro u oscuro, el que más contraste dé sobre el color YA mezclado. */
  tinta: 'claro' | 'oscuro';
}

export interface TransmisionVisible {
  id: number;
  titulo: string;
  descripcion: string | null;
  cabecera: CabeceraTransmision | null;
  fondo: FondoTransmision | null;
  fase: FaseTransmision;
  /** ISO. En `proxima` es cuándo entra al aire; el navegador cambia el rótulo ahí. */
  inicio: string | null;
  /** ISO. Cuándo se va; el navegador quita la sección ahí. `null` = sin fin. */
  fin: string | null;
  reproductor: ReproductorTransmision;
}

function instante(valor: string | null | undefined): number | null {
  if (!valor) return null;
  const t = new Date(valor).getTime();
  return Number.isNaN(t) ? null : t;
}

/**
 * La fase de una transmisión en el instante `ahora`, o `null` si no se pinta.
 * Es la tabla de arriba, y es la ÚNICA función que la interpreta.
 */
export function estadoAlAire(
  t: Pick<TransmisionCms, 'estado' | 'fecha' | 'despublicarEn'>,
  ahora: number,
): { fase: FaseTransmision; fin: number | null } | null {
  const inicio = instante(t.fecha);
  const fin = instante(t.despublicarEn);
  if (fin !== null && fin <= ahora) return null;

  if (t.estado === 'envivo') return { fase: 'envivo', fin };

  if (t.estado === 'programada') {
    // Sin fecha no hay programación: el CMS la exige, esto es solo la guarda.
    if (inicio === null) return null;
    /*
      SIN fin capturado, la programada sigue al aire hasta que alguien la pase a
      «Fuera de aire» o le ponga `despublicarEn`: NO hay tope de horas, a propósito
      (Danira, 2026-11-13: «nosotros nos encargaremos de despublicarlo»). Hubo un
      tope de 12 h y se quitó: una transmisión larga se habría retirado sola a media
      emisión.
    */
    return { fase: inicio > ahora ? 'proxima' : 'envivo', fin };
  }

  return null;
}

// ── El reproductor ─────────────────────────────────────────────────────────────

/**
 * Saca la URL de lo que se pegó en «URL del iframe».
 *
 * En la práctica se pega el CÓDIGO DE INSERCIÓN entero —el primer caso real trajo
 * el `<div style="padding:56.25% …"><iframe src="…">` que da Vimeo—, así que se
 * busca el `src` del iframe; si no hay etiqueta, el valor ES la URL.
 */
function urlDePegado(valor: string): string | null {
  const texto = valor.trim();
  if (!texto) return null;
  const m = /<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i.exec(texto);
  const crudo = (m ? m[1] : texto).replace(/&amp;/g, '&').trim();
  try {
    const u = new URL(crudo.startsWith('//') ? `https:${crudo}` : crudo);
    return u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

/**
 * La proporción que trae el código de inserción, o `null` si no trae.
 *
 * Dos formas, las dos que dan las plataformas: el truco del relleno
 * (`padding:56.25% 0 0 0` = alto/ancho en %) y los atributos `width`/`height` del
 * iframe. Un `width="100%"` no es una medida y se ignora.
 *
 * Acotada a [9:16, 21:9]: un número fuera de ahí es un código mal pegado, no un
 * video, y dejaría el cuadro como una raya o como una torre.
 */
function proporcionDePegado(valor: string): number | null {
  const acotar = (p: number) => (Number.isFinite(p) && p >= 9 / 16 && p <= 21 / 9 ? p : null);

  const relleno = /padding(?:-top)?\s*:\s*([\d.]+)%/i.exec(valor);
  if (relleno) {
    const pct = Number(relleno[1]);
    if (pct > 0) {
      const p = acotar(100 / pct);
      if (p) return p;
    }
  }

  const etiqueta = /<iframe\b[^>]*>/i.exec(valor)?.[0] ?? '';
  const ancho = /\bwidth\s*=\s*["']?(\d+)(?:px)?["'\s>]/i.exec(etiqueta);
  const alto = /\bheight\s*=\s*["']?(\d+)(?:px)?["'\s>]/i.exec(etiqueta);
  if (ancho && alto && Number(alto[1]) > 0) return acotar(Number(ancho[1]) / Number(alto[1]));

  return null;
}

/**
 * Un evento EN VIVO de Vimeo: `vimeo.com/event/<id>`, con o sin `/embed` y con el
 * hash de los eventos no listados (`/embed/<hash>`). Es la forma del primer caso
 * real, y la que NO reconoce el `idVimeo` de `lib/video.ts`, que es para videos.
 */
function eventoVimeo(u: URL): string | null {
  if (!/(^|\.)vimeo\.com$/.test(u.hostname)) return null;
  const m = /^\/event\/(\d+)(?:\/embed(?:\/([\w-]+))?)?\/?$/.exec(u.pathname);
  if (!m) return null;
  const hash = m[2] ? `/${encodeURIComponent(m[2])}` : '';
  return `https://vimeo.com/event/${m[1]}/embed${hash}`;
}

/** Un video de Vimeo (grabado o en vivo por URL de video), con su `h` si es privado. */
function videoVimeo(u: URL): string | null {
  if (!/(^|\.)vimeo\.com$/.test(u.hostname)) return null;
  const m = /^\/(?:video\/)?(\d+)(?:\/([\da-f]+))?\/?$/.exec(u.pathname);
  if (!m) return null;
  const h = u.searchParams.get('h') ?? m[2] ?? null;
  const conHash = h && /^[\da-f]+$/i.test(h) ? `?h=${h}&` : '?';
  return `https://player.vimeo.com/video/${m[1]}${conHash}byline=0&portrait=0&title=0`;
}

/**
 * El reproductor de la transmisión, o `null` si no hay uno que se pueda pintar.
 *
 * 🔴 **El `src` se RECONSTRUYE, nunca se copia.** Vimeo y YouTube se arman desde
 * su id —YouTube por `youtube-nocookie`, como el resto del sitio—, y cualquier
 * otra plataforma entra tal cual pero `https` y con `proveedor: 'otro'`, que en el
 * componente significa iframe con `sandbox`: la misma decisión que el bloque
 * «Otro» del cuerpo de la nota (`Embed.astro`, 19 oct 2026).
 *
 * «Número de evento» se lee como el número de un evento de Vimeo —el 6348526 de
 * `vimeo.com/event/6348526`—, que es la plataforma que usa la estación. Si alguien
 * pega ahí la URL entera, también vale.
 *
 * Sin autoplay, a propósito: el radio puede estar sonando, y dos fuentes que
 * arrancan solas se pisan. Quien vino a ver la transmisión le da play.
 */
export function reproductorDe(
  video: TransmisionCms['videoEnVivo'],
): ReproductorTransmision | null {
  if (!video) return null;

  let pegado: string | null = null;
  if (video.fuente === 'numero-evento') {
    const n = video.numeroEvento?.trim() ?? '';
    if (/^\d+$/.test(n)) {
      return { proveedor: 'vimeo', src: `https://vimeo.com/event/${n}/embed`, proporcion: 16 / 9 };
    }
    pegado = n || null;
  } else {
    pegado = video.url?.trim() || null;
  }
  if (!pegado) return null;

  const url = urlDePegado(pegado);
  if (!url) return null;
  const u = new URL(url);

  const evento = eventoVimeo(u);
  if (evento) {
    return { proveedor: 'vimeo', src: evento, proporcion: proporcionDePegado(pegado) ?? 16 / 9 };
  }

  const vimeo = videoVimeo(u);
  if (vimeo) {
    return { proveedor: 'vimeo', src: vimeo, proporcion: proporcionDePegado(pegado) ?? 16 / 9 };
  }

  const yt = idYoutube(url);
  if (yt) {
    // Un Short es vertical aunque el código no diga nada: es el formato.
    const porOmision = u.pathname.startsWith('/shorts/') ? 9 / 16 : 16 / 9;
    return {
      proveedor: 'youtube',
      src: `https://www.youtube-nocookie.com/embed/${encodeURIComponent(yt)}?rel=0&modestbranding=1&playsinline=1`,
      proporcion: proporcionDePegado(pegado) ?? porOmision,
    };
  }

  // Un enlace de la página de YouTube o Vimeo que no se supo leer NO cae a «otro»:
  // esas páginas no se dejan enmarcar y el cuadro saldría en blanco.
  if (/(^|\.)(youtube\.com|youtu\.be|vimeo\.com)$/.test(u.hostname)) return null;

  return { proveedor: 'otro', src: url, proporcion: proporcionDePegado(pegado) ?? 16 / 9 };
}

// ── La cabecera ────────────────────────────────────────────────────────────────

/**
 * El `alt` NO sale de aquí: lo pone el componente, y es el TÍTULO de la
 * transmisión, porque la cabecera es el rótulo del bloque —la de Xibalba lleva el
 * nombre escrito en la imagen— y va dentro del `h2`. El `alt` que trae el CMS
 * («Header Xibalba») describe el archivo, no lo que dice.
 */
function cabeceraDe(media: DocMedia | number | null | undefined): CabeceraTransmision | null {
  if (!media || typeof media !== 'object') return null;
  // `large` y no `card`: la cabecera se pinta a todo el ancho del contenedor
  // (1240px), y la de Xibalba se subió justo a esa medida.
  const src = urlMedia(media, 'large');
  if (!src) return null;
  const foco = (v: number | null | undefined) =>
    typeof v === 'number' && v >= 0 && v <= 100 ? v : 50;
  return {
    src,
    ancho: media.width ?? null,
    alto: media.height ?? null,
    focoX: foco(media.focalX),
    focoY: foco(media.focalY),
  };
}

// ── El fondo ───────────────────────────────────────────────────────────────────

/**
 * La opacidad del color de fondo, POR OMISIÓN (Danira, 2026-11-13): el color del
 * CMS se pinta a la mitad sobre el fondo oscuro del sitio, así que se lee como un
 * tinte de la portada y no como un bloque de color pleno.
 *
 * Es una constante y no un campo: el CMS no la pide. Si algún día se pide, entra
 * aquí y `fondoDe` ya la usa para todo — también para medir la tinta.
 */
export const OPACIDAD_FONDO = 0.5;

/**
 * Las dos tintas posibles, con sus valores de verdad: `--mist-0` y `--noche-0`
 * (el lienzo del sitio). Están en número y no como token porque hay que MEDIR el
 * contraste contra ellas, y eso no se puede hacer con un `var()`. Si los tokens
 * cambian, esto cambia con ellos.
 */
const TINTA_CLARA = '#FAFBFA';
const TINTA_OSCURA = '#050706';

/**
 * Lo que queda DETRÁS de la sección y se ve a través de la transparencia: el
 * lienzo del sitio (`--surface-canvas` → `--noche-0`), el mismo valor que la tinta
 * oscura.
 */
const LIENZO = TINTA_OSCURA;

function canales(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** El color que se VE: `hex` con opacidad `alfa` sobre `fondo`, como `#RRGGBB`. */
function mezclar(hex: string, fondo: string, alfa: number): string {
  const [a, b] = [canales(hex), canales(fondo)];
  return `#${a
    .map((c, i) => Math.round(c * alfa + b[i] * (1 - alfa)).toString(16).padStart(2, '0'))
    .join('')}`;
}

/** Luminancia relativa de WCAG 2.x de un `#RRGGBB`. */
function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [x, y] = [luminancia(a), luminancia(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/**
 * `colorFondo` del CMS a un fondo que se puede pintar, o `null`.
 *
 * 🔴 **Se valida otra vez aunque el CMS ya lo normalice**: el valor termina dentro
 * de un atributo `style`, y lo que no sea exactamente `#RGB` o `#RRGGBB` no entra.
 * `#RGB` se expande, para poder medirlo.
 *
 * Y la TINTA no la elige el editor: se MIDE (`movimiento.md` §4, el contraste se
 * mide, no se estima), y se mide contra el color que SE VE —el del CMS al
 * `OPACIDAD_FONDO` sobre el lienzo—, no contra el capturado. La diferencia decide:
 * el rosa de Xibalba (`#EA1180`) pleno pedía texto oscuro (blanco 4.29:1, negro
 * 4.89:1), y a la mitad sobre el lienzo se ve `#780C43`, donde el blanco da 10.9:1.
 * Gana la que más contraste dé, sin más regla que esa.
 */
export function fondoDe(valor: string | null | undefined): FondoTransmision | null {
  const v = valor?.trim() ?? '';
  const m = /^#(?:([\da-f]{6})|([\da-f]{3}))$/i.exec(v);
  if (!m) return null;
  const seis = m[1] ?? [...m[2]].map((c) => c + c).join('');
  const color = `#${seis.toUpperCase()}`;
  const [r, g, b] = canales(color);
  const visto = mezclar(color, LIENZO, OPACIDAD_FONDO);
  const tinta = contraste(visto, TINTA_CLARA) >= contraste(visto, TINTA_OSCURA) ? 'claro' : 'oscuro';
  return { color, css: `rgb(${r} ${g} ${b} / ${OPACIDAD_FONDO})`, tinta };
}

// ── La elección ────────────────────────────────────────────────────────────────

/**
 * LA transmisión que pinta el Inicio, o `null` — y con `null` la sección no
 * existe, ni su rótulo.
 *
 * Una sola, aunque haya varias vigentes: es un hueco de portada, no una lista. Y
 * el orden de preferencia es el de quién tiene más razón para estar ahí:
 *
 *   1. la que el editor puso «En vivo ahora» a mano;
 *   2. la programada que ya entró a su hora;
 *   3. la próxima programada, la más cercana.
 *
 * **Sin reproductor no hay sección.** La sección ES el player: una cabecera con
 * «EN VIVO» y nada que ver sería un estado muerto en lo alto de la portada. El
 * CMS solo exige la URL en «En vivo ahora»; una programada sin URL se queda sin
 * pintar hasta que la tenga.
 */
export function transmisionDelInicio(
  docs: TransmisionCms[],
  ahora: number = Date.now(),
): TransmisionVisible | null {
  type Candidata = { doc: TransmisionCms; fase: FaseTransmision; fin: number | null; rango: number; orden: number };
  const candidatas: Candidata[] = [];

  for (const doc of docs) {
    const al = estadoAlAire(doc, ahora);
    if (!al) continue;
    const rango = al.fase === 'proxima' ? 3 : doc.estado === 'envivo' ? 1 : 2;
    // Dentro de cada rango: las al aire en el orden de la consulta (`-fecha`, la
    // que empezó más tarde primero); las próximas, la más cercana primero.
    const orden = al.fase === 'proxima' ? (instante(doc.fecha) ?? Infinity) : -(instante(doc.fecha) ?? 0);
    candidatas.push({ doc, fase: al.fase, fin: al.fin, rango, orden });
  }
  candidatas.sort((a, b) => a.rango - b.rango || a.orden - b.orden);

  for (const { doc, fase, fin } of candidatas) {
    const reproductor = reproductorDe(doc.videoEnVivo);
    if (!reproductor) continue;
    const titulo = doc.titulo?.trim() || 'Transmisión especial';
    return {
      id: doc.id,
      titulo,
      // `?.trim() ||` y nunca `??`: los campos vacíos del admin llegan como
      // cadena vacía, no como null (ver `agents/content.md`).
      descripcion: doc.descripcion?.trim() || null,
      cabecera: cabeceraDe(doc.imagenCabecera),
      fondo: fondoDe(doc.colorFondo),
      fase,
      inicio: instante(doc.fecha) !== null ? new Date(instante(doc.fecha)!).toISOString() : null,
      fin: fin !== null ? new Date(fin).toISOString() : null,
      reproductor,
    };
  }
  return null;
}

// ── La fecha ───────────────────────────────────────────────────────────────────

const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DIAS: Record<string, string> = {
  Mon: 'LUN', Tue: 'MAR', Wed: 'MIÉ', Thu: 'JUE', Fri: 'VIE', Sat: 'SÁB', Sun: 'DOM',
};

/**
 * `SÁB 15 NOV · 21:00`, en hora de México.
 *
 * A mano y no con `Intl` en español por lo mismo que `fechaCorta`: el diseño lo
 * quiere en mayúsculas, sin el punto de la abreviatura. Y la hora en 24 h, como la
 * Agenda. En hora de México y no del lector: es la hora a la que la estación sale
 * al aire, la mire quien la mire.
 */
export function cuandoSale(iso: string | null | undefined): string | null {
  const t = instante(iso);
  if (t === null) return null;
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(t));
  const g = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return `${DIAS[g('weekday')] ?? ''} ${g('day')} ${MESES[Number(g('month')) - 1]} · ${g('hour')}:${g('minute')}`.trim();
}

// ── La vista previa ────────────────────────────────────────────────────────────

/**
 * Para `?transmision=envivo|proxima` del Inicio, que solo existe FUERA del sitio
 * real (la guarda está en `src/pages/index.astro`).
 *
 * Toma la transmisión capturada más reciente que tenga reproductor y la pone en la
 * fase pedida, sin fin: así la sección se puede ver y revisar aunque no haya
 * ningún evento al aire, que es lo normal. La próxima se anuncia para dentro de
 * dos horas. Lo demás —cabecera, título, reproductor— es lo del CMS, tal cual.
 */
export function vistaPrevia(
  docs: TransmisionCms[],
  fase: FaseTransmision,
  ahora: number = Date.now(),
): TransmisionVisible | null {
  for (const doc of docs) {
    const forzada: TransmisionCms =
      fase === 'envivo'
        ? { ...doc, estado: 'envivo', despublicarEn: null }
        : {
            ...doc,
            estado: 'programada',
            fecha: new Date(ahora + 2 * 60 * 60 * 1000).toISOString(),
            despublicarEn: null,
          };
    const visible = transmisionDelInicio([forzada], ahora);
    if (visible) return visible;
  }
  return null;
}
