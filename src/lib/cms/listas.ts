/**
 * Las listas musicales — Bonus Beat, y las que la estación invente después.
 *
 * 🔴 El TIPO de lista es dato editorial, no código. `tipos-de-lista` es una
 * colección: la estación crea «Bonus Beat» y mañana puede crear otra sin que nadie
 * despliegue. Por eso el front NUNCA hardcodea la lista de tipos ni sus rutas: las
 * lee y construye los enlaces desde el slug.
 *
 * (Corrige un requisito mío que estaba mal: había pedido una colección
 * `bonus-beat` aparte, argumentando que `especiales.playlist` no tenía texto por
 * canción. Cierto de `especiales`, pero `listas.canciones[]` sí trae `comentario`
 * —«la viñeta que acompaña a la canción»—, que es exactamente lo que pedía el mapa
 * de sitio.)
 */
import { cmsFetchEstacion, SIN_PAGINACION, type RespuestaLista } from './client';
import type { Lista, TiposDeLista } from '@/types/payload';

/** Los tipos que la estación tiene creados. De aquí salen las rutas. */
export async function obtenerTiposDeLista(): Promise<TiposDeLista[]> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<TiposDeLista>>('tipos-de-lista', {
      ...SIN_PAGINACION,
      depth: 0,
      sort: 'nombre',
    });
    return r.docs;
  } catch {
    return [];
  }
}

/**
 * La edición más reciente de un tipo de lista.
 *
 * `depth: 2` para que cada `canciones[].cancion` llegue con su portada y sus
 * enlaces a plataformas poblados: con `depth: 1` la canción llega pero su
 * `portada` sigue siendo un id.
 *
 * ⚠️ Se filtra por el SLUG del tipo (`where[tipo.slug][equals]`) y no por su id.
 * Cuesta un join, y a cambio la consulta no depende de un id que solo existe en
 * esta base: el mismo código funciona en local, en staging y en producción.
 */
export async function obtenerListaReciente(tipoSlug: string): Promise<Lista | null> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Lista>>('listas', {
      'where[tipo.slug][equals]': tipoSlug,
      'where[estado][equals]': 'publicada',
      depth: 2,
      sort: '-fecha',
      limit: 1,
    });
    return r.docs[0] ?? null;
  } catch {
    return null;
  }
}

/** Las ediciones de un tipo, para su índice. */
export async function obtenerListas(tipoSlug: string, cuantas = 24): Promise<Lista[]> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Lista>>('listas', {
      'where[tipo.slug][equals]': tipoSlug,
      'where[estado][equals]': 'publicada',
      ...SIN_PAGINACION,
      depth: 1,
      sort: '-fecha',
      limit: cuantas,
    });
    return r.docs;
  } catch {
    return [];
  }
}

/**
 * Un tipo de lista por slug — lo que convierte `/bonus-beat` en una página.
 *
 * Devuelve `null` si no existe, y con eso la ruta responde 404: es lo correcto,
 * porque el primer segmento de la URL ES el slug del tipo. Sin esta comprobación,
 * `/cualquier-cosa` pintaría un índice vacío con título inventado, y Google
 * indexaría tantas páginas como URLs le pasen por delante.
 */
export async function obtenerTipoDeLista(slug: string): Promise<TiposDeLista | null> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<TiposDeLista>>('tipos-de-lista', {
      'where[slug][equals]': slug,
      depth: 0,
      limit: 1,
    });
    return r.docs[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Una edición concreta.
 *
 * 🔴 Se filtra TAMBIÉN por el tipo, no solo por el slug de la edición. El slug de
 * `listas` es único dentro de la colección, no dentro del tipo: sin esta condición,
 * `/beat-ten/bonus-beat-2026-08-21` serviría una edición de Bonus Beat bajo la URL
 * de otro tipo — dos URLs con el mismo contenido, que es contenido duplicado y una
 * migaja que miente.
 *
 * ⚠️ Sin `catch`, igual que `obtenerEspecial`: «no existe» y «el CMS está caído»
 * no son la misma respuesta.
 */
export async function obtenerLista(tipoSlug: string, slug: string): Promise<Lista | null> {
  const r = await cmsFetchEstacion<RespuestaLista<Lista>>('listas', {
    'where[slug][equals]': slug,
    'where[tipo.slug][equals]': tipoSlug,
    'where[estado][equals]': 'publicada',
    depth: 2,
    limit: 1,
  });
  return r.docs[0] ?? null;
}
