/**
 * Beat Scanner — las notas. Cubre las pantallas 14b/14e (índice) y 14c/14f (nota).
 *
 * «Beat Scanner» SUSTITUYE a lo que en el sitio viejo era «news»: es la sección
 * editorial del relanzamiento. La colección sigue siendo `noticias`; el nombre de
 * sección vive en la ruta y en la nav, no en el CMS.
 */
import {
  cmsFetchEstacion,
  SIN_PAGINACION,
  type ParamsCms,
  type RespuestaLista,
} from './client';
import type { Noticia } from '@/types/payload';

/**
 * Campos que el índice necesita, y solo esos. `depth: 1` puebla `imagen`,
 * `categorias` y `autores`; con `depth: 0` vendrían como ids y habría que pedirlos
 * aparte.
 */
const BASE_INDICE: ParamsCms = { depth: 1, ...SIN_PAGINACION };

/**
 * 🔴 Una `pieza` no se distribuye como noticia.
 *
 * `noticias.distribucion` separa QUÉ es una pieza de DÓNDE se coloca: una cápsula
 * del Fenómeno Residente conserva su URL y su entrada en el sitemap —se comparte
 * suelta, tiene que poder encontrarse— pero no aparece en los listados
 * editoriales, porque su lugar es dentro de su especial.
 *
 * ⚠️ El `or` con `exists: false` NO es decorativo: en Postgres un `!= 'pieza'`
 * **no devuelve las filas con NULL**, así que sin él se perderían todas las notas
 * que nunca tocaron el campo. Está documentado igual en el CMS.
 */
const SOLO_NOTICIAS: ParamsCms = {
  'where[or][0][distribucion][not_equals]': 'pieza',
  'where[or][1][distribucion][exists]': false,
};

/** Orden público: primero lo fijado, luego por fecha. Igual que el CMS. */
const ORDEN = '-fijada,-fecha';

/**
 * Portada de Beat Scanner: la nota principal y la rejilla.
 *
 * Se pide UNA sola consulta y se reparte en memoria. Es deliberado: si la
 * destacada y la rejilla fueran dos consultas, tendrían dos relojes de caché
 * independientes y podrían quedar desfasadas —la destacada vieja con la rejilla
 * nueva—. Le pasó a `web-enfoque` y se arregló exactamente así.
 */
export async function obtenerScanner(cuantas = 10): Promise<{
  destacada: Noticia | null;
  rejilla: Noticia[];
}> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Noticia>>('noticias', {
      ...BASE_INDICE,
      ...SOLO_NOTICIAS,
      sort: ORDEN,
      limit: cuantas + 1,
    });
    const [destacada, ...rejilla] = r.docs;
    return { destacada: destacada ?? null, rejilla };
  } catch {
    // Degrada: media portada es mejor que un 500.
    return { destacada: null, rejilla: [] };
  }
}

/** Una nota por slug. A diferencia del resto, este error SÍ se propaga: la página
 *  necesita saberlo para hacer `Astro.rewrite('/404')`. */
export async function obtenerNota(slug: string): Promise<Noticia | null> {
  const r = await cmsFetchEstacion<RespuestaLista<Noticia>>('noticias', {
    'where[slug][equals]': slug,
    // `depth: 2` para que la FOTO del autor venga poblada: con 1 llega el autor
    // pero su `foto` sigue siendo un id.
    depth: 2,
    limit: 1,
    draft: false,
  });
  return r.docs[0] ?? null;
}

/**
 * Las tres relacionadas del pie de la nota (14c: "tres notas relacionadas").
 *
 * 🔴 La nota actual se excluye EN MEMORIA, no en el `where`.
 *
 * Es la regla de oro de la caché de este cliente, y viene de un incidente medido:
 * en `web-enfoque` esta misma función usaba `where[id][not_equals]=<id>`, así que
 * cada nota generaba su propia entrada de caché y la consulta más llamada del
 * sitio nunca acertaba — **836 de los 1,103 errores por hora salían de ahí**.
 * Filtrando por categoría a secas, todas las notas de una sección comparten una
 * sola entrada.
 */
export async function obtenerRelacionadas(nota: Noticia, cuantas = 3): Promise<Noticia[]> {
  const cats = (nota.categorias ?? [])
    .map((c) => (typeof c === 'number' ? c : c?.id))
    .filter((id): id is number => typeof id === 'number');
  if (!cats.length) return [];

  try {
    const r = await cmsFetchEstacion<RespuestaLista<Noticia>>('noticias', {
      ...BASE_INDICE,
      ...SOLO_NOTICIAS,
      'where[categorias][in]': cats.join(','),
      sort: '-fecha',
      // Se piden algunas más de las necesarias para poder descartar la actual sin
      // quedarse corto.
      limit: cuantas + 3,
    });
    return r.docs.filter((n) => n.id !== nota.id).slice(0, cuantas);
  } catch {
    return [];
  }
}

/**
 * Tiempo de lectura en minutos — el `min` que el diseño pinta en cada tarjeta.
 *
 * Se calcula en el front a propósito: es una función del contenido, no un dato
 * editorial, y meterlo como campo en el CMS obligaría a mantenerlo a mano cada vez
 * que se edita una nota.
 *
 * 200 palabras por minuto, mínimo 1. Recorre el árbol Lexical contando solo los
 * nodos de texto: un embed o una imagen no son palabras.
 */
export function minutosDeLectura(contenido: unknown): number {
  let palabras = 0;
  const recorrer = (nodo: unknown): void => {
    if (!nodo || typeof nodo !== 'object') return;
    const n = nodo as { text?: unknown; children?: unknown[]; root?: unknown };
    if (typeof n.text === 'string') palabras += n.text.trim().split(/\s+/).filter(Boolean).length;
    if (n.root) recorrer(n.root);
    if (Array.isArray(n.children)) n.children.forEach(recorrer);
  };
  recorrer(contenido);
  return Math.max(1, Math.round(palabras / 200));
}
