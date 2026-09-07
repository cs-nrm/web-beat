/**
 * Las categorías y las etiquetas de la estación.
 *
 * ⚠️ Se filtra por `slug`, nunca por id. El sitio viejo tiene **IDs de categoría
 * hardcodeados en 55 URLs** porque su WordPress no exponía el slug;
 * `cms-estaciones` sí lo trae, con único compuesto `(estacion, slug)`. Es la
 * decisión 5 del plan.
 *
 * ⚠️ Ya no existe un `obtenerCategorias()` que las liste todas. Servía a la tira
 * de pastillas del Scanner, que se retiró: esa tira ahora son las SECCIONES del
 * sitio (`NavSecciones.astro`), no las categorías. Las categorías siguen teniendo
 * su ruta —`/beat-scanner/<slug>`— y se llega a ellas desde la migaja de cada nota.
 */
import { cmsFetchEstacion, type RespuestaLista } from './client';
import type { Categoria, Etiqueta } from '@/types/payload';

/** Una categoría por slug, para el índice filtrado `/beat-scanner/<slug>`. */
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
