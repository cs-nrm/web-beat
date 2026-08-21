/**
 * Las categorías de la estación — los filtros que 14b/14e pintan como pastillas.
 *
 * ⚠️ Se filtra por `slug`, nunca por id. El sitio viejo tiene **IDs de categoría
 * hardcodeados en 55 URLs** porque su WordPress no exponía el slug;
 * `cms-estaciones` sí lo trae, con único compuesto `(estacion, slug)`. Es la
 * decisión 5 del plan.
 */
import { cmsFetchEstacion, SIN_PAGINACION, type RespuestaLista } from './client';
import type { Categoria, Etiqueta } from '@/types/payload';

/**
 * Todas las categorías de la estación, en el orden que el CMS decida.
 *
 * Degrada a lista vacía: sin filtros la sección sigue leyéndose, y es mejor que
 * un 500. La consulta va cacheada por el cliente, así que no cuesta por página.
 */
export async function obtenerCategorias(): Promise<Categoria[]> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Categoria>>('categorias', {
      ...SIN_PAGINACION,
      depth: 0,
      sort: 'nombre',
    });
    return r.docs;
  } catch {
    return [];
  }
}

/** Una categoría por slug, para el índice filtrado `/scanner/<slug>`. */
export async function obtenerCategoria(slug: string): Promise<Categoria | null> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Categoria>>('categorias', {
      'where[slug][equals]': slug,
      depth: 0,
      limit: 1,
    });
    return r.docs[0] ?? null;
  } catch {
    return null;
  }
}

/** Una etiqueta por slug, para `/etiqueta/<slug>`. */
export async function obtenerEtiqueta(slug: string): Promise<Etiqueta | null> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Etiqueta>>('etiquetas', {
      'where[slug][equals]': slug,
      depth: 0,
      limit: 1,
    });
    return r.docs[0] ?? null;
  } catch {
    return null;
  }
}
