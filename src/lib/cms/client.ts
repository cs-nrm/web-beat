/**
 * Cliente de `cms-estaciones` (Payload) — SOLO server-side.
 *
 * 🔴 Línea roja de la casa: el navegador NUNCA habla directo con el CMS. Este
 * módulo se importa únicamente en frontmatter de `.astro` (SSR) o en
 * `src/pages/api/*` (proxies). El guard de abajo revienta si alguien lo arrastra
 * al cliente. La única excepción es la MEDIA, que el navegador sí carga directo
 * desde el origen público del CMS (ver `urlMediaAbsoluta`).
 *
 * La política de caché de este archivo NO se inventó aquí: es la de
 * `web-enfoque/src/lib/cms/client.ts`, que salió de tres incidentes de producción
 * con números medidos. Se copia a propósito.
 */
import { CMS_URL, CMS_URL_PUBLICA, ESTACION_CODIGO } from '@/config/site';
import { envServidor } from '@/lib/env';

if (typeof window !== 'undefined') {
  throw new Error('src/lib/cms/client.ts es server-side: el navegador nunca habla con el CMS.');
}

// ============================================================
// Caché en memoria + deduplicación de peticiones en vuelo
// ------------------------------------------------------------
// De las dos piezas, la que más pesa es la SEGUNDA:
//   · La caché evita repetir la consulta durante unos segundos.
//   · La deduplicación evita la ESTAMPIDA: si 50 lectores piden el Inicio en el
//     mismo instante (justo lo que pasa al publicar, o al abrir el dominio), sale
//     UNA sola consulta al CMS y las 50 esperan su resultado. Sin esto, la caché
//     no sirve de nada en el pico, que es cuando importa.
//
// `stale-if-error`: si el CMS falla, se sirve el último valor bueno aunque haya
// vencido. Más vale un Inicio de hace dos minutos que un Inicio roto.
//
// Se puede apagar o afinar SIN desplegar (`CACHE_CMS_MS` se lee en ejecución):
// ponerla en `0` desactiva la caché pero CONSERVA la deduplicación, que nunca
// estorba.
// ============================================================

interface EntradaCache {
  valor: unknown;
  /** Momento a partir del cual el valor deja de servirse como fresco. */
  expira: number;
}

const CACHE = new Map<string, EntradaCache>();
const EN_VUELO = new Map<string, Promise<unknown>>();

/** Vida de un valor fresco. 45 s: por debajo del minuto que ya usa el borde. */
const TTL_MS = Number(envServidor('CACHE_CMS_MS', '45000')) || 0;
/** Cuánto se conserva un valor vencido para el `stale-if-error`. */
const TTL_RESERVA_MS = 10 * 60 * 1000;
/** Tope de entradas: las notas sueltas generan claves potencialmente infinitas. */
const MAX_ENTRADAS = 800;

function podar(): void {
  if (CACHE.size <= MAX_ENTRADAS) return;
  const ahora = Date.now();
  for (const [clave, entrada] of CACHE) {
    if (entrada.expira + TTL_RESERVA_MS < ahora) CACHE.delete(clave);
  }
  // Si aún sobra, se tiran las más viejas (Map preserva orden de inserción).
  while (CACHE.size > MAX_ENTRADAS) {
    const primera = CACHE.keys().next().value;
    if (primera === undefined) break;
    CACHE.delete(primera);
  }
}

/** Forma de las respuestas de listado de la REST API de Payload. */
export interface RespuestaLista<T> {
  docs: T[];
  totalDocs: number;
  limit: number;
  totalPages: number;
  page: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/** Parámetros de query; las claves ya vienen en notación de Payload (`where[campo][op]`). */
export type ParamsCms = Record<string, string | number | boolean | undefined>;

/**
 * 🔴 Apaga el `COUNT` de Payload. Se agrega a TODA consulta que no pinte un
 * paginador.
 *
 * Payload devuelve `totalDocs`/`totalPages` en cada listado, y para eso corre un
 * `COUNT(1) OVER()` que obliga a Postgres a visitar la tabla entera, sin importar
 * el `limit` ni los índices: contar no se puede responder con las 4 filas que se
 * piden. Medido en la producción de Enfoque el 2026-08-15: **2,746 ms por
 * consulta**, y era 8 de cada 9 consultas activas en la base mientras la VM
 * estaba saturada.
 *
 * Con `pagination=false` Payload sigue respetando el `limit` y devuelve los mismos
 * `docs`, pero `totalDocs` pasa a ser el número de documentos devueltos — **por
 * eso no se puede usar donde haya paginador**. Cuando hace falta el total, va en
 * una consulta APARTE sin `page`, con timeout corto y `catch` total, para que el
 * conteo nunca pueda tumbar la página.
 */
export const SIN_PAGINACION = { pagination: false } as const;

export class ErrorCms extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly ruta: string,
  ) {
    super(message);
    this.name = 'ErrorCms';
  }
}

/**
 * GET contra `${CMS_URL}/api/<ruta>`, con caché, dedup y `stale-if-error`.
 *
 * ⚠️ **NO filtra por estación.** Úsalo solo para `estaciones` (que no tiene campo
 * `estacion`) y para colecciones sin inquilino (`media`, `redirects`, `forms`).
 * Para TODO lo demás, usa `cmsFetchEstacion` — en `cms-estaciones` el `read` está
 * **abierto entre estaciones a propósito** (para poder republicar), así que una
 * consulta sin filtro devuelve las 4 marcas mezcladas.
 */
export async function cmsFetch<T>(
  ruta: string,
  params: ParamsCms = {},
  timeoutMs = 8000,
): Promise<T> {
  if (!CMS_URL) {
    throw new ErrorCms('CMS_URL no está configurado (revisa .env).', 0, ruta);
  }

  const url = new URL(`${CMS_URL}/api/${ruta.replace(/^\//, '')}`);
  for (const [clave, valor] of Object.entries(params)) {
    if (valor !== undefined) url.searchParams.set(clave, String(valor));
  }

  const clave = url.toString();
  const ahora = Date.now();

  const cacheada = CACHE.get(clave);
  if (cacheada && cacheada.expira > ahora) return cacheada.valor as T;

  // Deduplicación: si ya hay una petición idéntica en vuelo, esperar ESA.
  const enVuelo = EN_VUELO.get(clave);
  if (enVuelo) return enVuelo as Promise<T>;

  const promesa = pedirAlCms<T>(url, ruta, timeoutMs)
    .then((valor) => {
      if (TTL_MS > 0) {
        CACHE.set(clave, { valor, expira: Date.now() + TTL_MS });
        podar();
      }
      return valor;
    })
    .catch((err) => {
      // stale-if-error: mejor un valor viejo que una página rota.
      const reserva = CACHE.get(clave);
      if (reserva && reserva.expira + TTL_RESERVA_MS > Date.now()) return reserva.valor as T;
      throw err;
    })
    .finally(() => {
      EN_VUELO.delete(clave);
    });

  EN_VUELO.set(clave, promesa);
  return promesa;
}

/** El GET de verdad. Separado para que `cmsFetch` sea solo la política de caché. */
async function pedirAlCms<T>(url: URL, ruta: string, timeoutMs: number): Promise<T> {
  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: control.signal,
    });
    if (!res.ok) {
      throw new ErrorCms(`El CMS respondió ${res.status} en ${ruta}`, res.status, ruta);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof ErrorCms) throw err;
    const motivo = err instanceof Error ? err.message : String(err);
    throw new ErrorCms(`Fallo de red hablando con el CMS (${ruta}): ${motivo}`, 0, ruta);
  } finally {
    clearTimeout(temporizador);
  }
}

// ============================================================
// Multi-estación
// ------------------------------------------------------------
// 🔴 La diferencia más importante respecto a `web-enfoque`, que se copió casi
// literal en todo lo demás: Enfoque tiene una instancia DEDICADA de Payload y por
// eso **no filtra por `estacion` en absoluto**. Copiar ese patrón tal cual aquí
// mezclaría las 4 marcas de NRM en la misma página.
//
// El filtro se inyecta en el TRANSPORTE, no en cada llamada, precisamente para
// que sea imposible olvidarlo en una consulta nueva. Y entra en la clave de
// caché, que es lo correcto.
// ============================================================

/**
 * Colecciones de `cms-estaciones` que llevan el campo `estacion`.
 *
 * 🔴 Esta lista NO es documentación: `cmsFetchEstacion` la comprueba antes de
 * inyectar el filtro. Sin la comprobación, pedir una colección que no lleva el
 * campo devuelve un **400 de Payload** —`The following path cannot be queried:
 * estacion`— que se ve igual que "el CMS está mal" y no dice qué hiciste mal.
 * Con la comprobación, el error nombra la causa en el acto.
 *
 * Verificado contra producción el 2026-08-21, colección por colección.
 * `media` queda FUERA a propósito: la biblioteca es **compartida** entre las 4
 * estaciones (decisión 6), y filtrarla es justo el 400 de arriba.
 * `estaciones`, `redirects` y `forms` tampoco lo llevan.
 *
 * `publicidad` se agregó el 2026-08-27: la colección es más nueva que aquella
 * revisión y sí lleva el campo (está en el plugin multi-tenant del CMS con
 * `useTenantAccess: false`, como noticias).
 */
export const COLECCIONES_POR_ESTACION = [
  'noticias',
  'podcasts',
  'programas',
  'especiales',
  'transmisiones',
  'autores',
  'categorias',
  'etiquetas',
  'canciones',
  'bitacora',
  'listas',
  'tipos-de-lista',
  'eventos',
  'publicidad',
  'search',
] as const;

export type ColeccionPorEstacion = (typeof COLECCIONES_POR_ESTACION)[number];

/**
 * Colecciones que el plan necesita y que TODAVÍA NO EXISTEN en el CMS.
 *
 * Están aquí para que el error las distinga: pedir `paginas` hoy da un 404
 * `Route not found`, y sin esta lista el mensaje sonaría a ruta mal escrita
 * cuando en realidad es trabajo pendiente del carril A.
 */
const PENDIENTES_EN_EL_CMS: Record<string, string> = {
  paginas: 'A1 — «Beat para marcas» (§8) y los avisos legales',
  productos: 'fase 2 — la Tienda (§7)',
  oyentes: 'A2 — Comunidad (§6)',
  playlists: 'A2 — Comunidad (§6)',
  guardados: 'A2 — Comunidad (§6)',
  suscripciones: 'A2 — Comunidad (§6)',
};

/** Lo mínimo de `estaciones` que necesita el transporte. El resto vive en `estacion.ts`. */
interface EstacionMinima {
  id: number;
  codigo: string;
}

/**
 * Id numérico de la estación, resuelto por `codigo` y memorizado para el proceso.
 *
 * 🔴 Nunca se hardcodea el id. En una BD sembrada en orden Beat sería `1`, pero
 * eso es un `serial` de Postgres: depende del orden de siembra y no es portable
 * entre entornos. `estaciones.read` es **público a propósito** justo para que cada
 * front pueda resolver esto sin sesión, en su primer request.
 *
 * Se memoriza la PROMESA, no el valor: así dos requests concurrentes al arrancar
 * el proceso comparten la misma resolución en vez de disparar dos consultas.
 */
let promesaIdEstacion: Promise<number> | null = null;

export function idEstacion(): Promise<number> {
  if (!promesaIdEstacion) {
    promesaIdEstacion = cmsFetch<RespuestaLista<EstacionMinima>>('estaciones', {
      'where[codigo][equals]': ESTACION_CODIGO,
      limit: 1,
      depth: 0,
    })
      .then((r) => {
        const id = r.docs[0]?.id;
        if (id === undefined) {
          throw new ErrorCms(
            `No existe la estación con codigo="${ESTACION_CODIGO}" en el CMS. ` +
              'Revisa ESTACION_CODIGO y que la colección `estaciones` esté sembrada.',
            0,
            'estaciones',
          );
        }
        return id;
      })
      .catch((err) => {
        // No se memoriza un fallo: el CMS puede estar arrancando todavía.
        promesaIdEstacion = null;
        throw err;
      });
  }
  return promesaIdEstacion;
}

/**
 * Igual que `cmsFetch`, pero acota la consulta a la estación de este front.
 *
 * Es la función que deben usar todos los módulos de dominio. Si una consulta
 * nueva se escribe con `cmsFetch` por descuido, devolverá contenido de Oye,
 * Sabrosita y Stereo Cien mezclado — de ahí que el nombre sea explícito.
 */
export async function cmsFetchEstacion<T>(
  ruta: ColeccionPorEstacion,
  params: ParamsCms = {},
  timeoutMs = 8000,
): Promise<T> {
  // El tipo ya lo impide en compilación; esto cubre las llamadas dinámicas —
  // un slug que venga de `tipos-de-lista`, por ejemplo — que TypeScript no ve.
  if (!(COLECCIONES_POR_ESTACION as readonly string[]).includes(ruta)) {
    const pendiente = PENDIENTES_EN_EL_CMS[ruta];
    throw new ErrorCms(
      pendiente
        ? `La colección "${ruta}" todavía no existe en cms-estaciones (${pendiente}).`
        : `La colección "${ruta}" no lleva el campo "estacion", así que no se puede ` +
          `filtrar por estación. Si es la biblioteca compartida (media) usa cmsFetch. ` +
          `Colecciones válidas: ${COLECCIONES_POR_ESTACION.join(', ')}.`,
      0,
      ruta,
    );
  }
  const id = await idEstacion();
  return cmsFetch<T>(ruta, { ...params, 'where[estacion][equals]': id }, timeoutMs);
}

// ============================================================
// Media
// ============================================================

/**
 * Absolutiza una URL de media.
 *
 * El CMS **no** pone `disablePayloadAccessControl`, así que `doc.url` no apunta a
 * `storage.googleapis.com`: es una ruta relativa (`/api/media/file/<archivo>`) que
 * sirve el propio CMS, leyendo del bucket con su service-account. Por eso hay que
 * prefijar el origen **público** (`CMS_URL_PUBLICA`) y no el interno: el navegador
 * carga las imágenes directo.
 */
export function urlMediaAbsoluta(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${CMS_URL_PUBLICA}${url.startsWith('/') ? url : `/${url}`}`;
}

/** Variantes que `Media.ts` genera, de menor a mayor. Todas en WebP. */
export type TamanoMedia = 'thumbnail' | 'card' | 'large';

interface VarianteMedia {
  url?: string | null;
  width?: number | null;
  height?: number | null;
}

export interface DocMedia {
  url?: string | null;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
  focalX?: number | null;
  focalY?: number | null;
  sizes?: Partial<Record<TamanoMedia, VarianteMedia>> | null;
}

/**
 * URL del archivo TAL CUAL, sin pasar por las variantes de imagen.
 *
 * 🔴 Para lo que no es una foto: el mp3 de una canción, un PDF. `Media` no
 * restringe tipos y Sharp solo toca imágenes, así que un audio se guarda intacto
 * y **no tiene `sizes`**.
 *
 * Existe aparte de `urlMedia` aunque hoy las dos devolverían lo mismo —`urlMedia`
 * cae al original cuando no hay variantes—, y la razón es que esa caída es un
 * ACCIDENTE afortunado, no un contrato: el día que alguien añada un tamaño más o
 * cambie el orden de preferencia, pedir el audio de una canción podría devolver un
 * WebP. Un nombre que dice qué pide no se puede romper así.
 */
export function urlArchivo(media: DocMedia | number | null | undefined): string | null {
  if (!media || typeof media !== 'object') return null;
  return urlMediaAbsoluta(media.url);
}

/**
 * URL de la variante pedida, con degradación hacia abajo y hacia el original.
 *
 * ⚠️ Las tres variantes se generan con `withoutEnlargement: true`, así que un
 * tamaño **puede no existir** si el original era más chico. Nunca asumir que
 * `sizes.large` está ahí.
 */
export function urlMedia(
  media: DocMedia | number | null | undefined,
  tamano: TamanoMedia = 'card',
): string | null {
  if (!media || typeof media !== 'object') return null;
  const orden: TamanoMedia[] = ['large', 'card', 'thumbnail'];
  const candidatas = [tamano, ...orden.filter((t) => t !== tamano)];
  for (const t of candidatas) {
    const u = media.sizes?.[t]?.url;
    if (u) return urlMediaAbsoluta(u);
  }
  return urlMediaAbsoluta(media.url);
}

/**
 * Las medidas de la variante que se está sirviendo — para `og:image:width/height`
 * y para el `image` del JSON-LD.
 *
 * 🔴 Se busca POR URL, no repitiendo el orden de preferencia de `urlMedia`. Es la
 * diferencia entre un dato y una suposición: `urlMedia` degrada hacia abajo
 * —`large` puede no existir, porque las variantes se generan con
 * `withoutEnlargement`— así que reproducir aquí su orden acabaría devolviendo las
 * medidas de `large` para una imagen que en realidad se sirvió en `card`. Partiendo
 * de la URL que ya devolvió, no hay dos criterios que se puedan desincronizar.
 *
 * ⚠️ Devuelve `null` si el CMS no trae las dos medidas. Es a propósito y quien la
 * llama NO debe rellenarlas: las plataformas reservan el hueco de la tarjeta con
 * esos números antes de bajar la imagen, así que un valor inventado se ve como un
 * recorte en la publicación y desde el sitio no se nota.
 */
export function medidaMedia(
  media: DocMedia | number | null | undefined,
  url: string | null | undefined,
): { ancho: number; alto: number } | null {
  if (!media || typeof media !== 'object' || !url) return null;
  const variantes: VarianteMedia[] = [
    ...Object.values(media.sizes ?? {}).filter((v): v is VarianteMedia => Boolean(v)),
    { url: media.url, width: media.width, height: media.height },
  ];
  for (const v of variantes) {
    if (urlMediaAbsoluta(v.url) !== url) continue;
    if (typeof v.width === 'number' && typeof v.height === 'number' && v.width > 0 && v.height > 0) {
      return { ancho: v.width, alto: v.height };
    }
  }
  return null;
}
