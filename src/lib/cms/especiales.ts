/**
 * El Fenómeno Residente y los demás especiales.
 *
 * Un `especial` es un contenedor ORDENADO de piezas heterogéneas: `piezas` es
 * polimórfica sobre `noticias | podcasts | transmisiones | listas`. Eso es lo que
 * permite que un tema de la semana tenga sus 11 cápsulas (noticias con
 * `distribucion: 'pieza'`), su especial del sábado y su playlist, sin un tipo de
 * contenido nuevo.
 *
 * 🔴 El ORDEN del array es el dato, no un accidente: es lo que numera las cápsulas
 * («CÁPSULA 05 · HOY» en 13a). Nunca se reordena en el front.
 */
import { cmsFetchEstacion, SIN_PAGINACION, type RespuestaLista } from './client';
import type { Especiale, Lista, Noticia, Podcast, Transmisione } from '@/types/payload';

/**
 * Una pieza ya resuelta, con su número de orden dentro del especial.
 *
 * Es una unión DISCRIMINADA por `tipo` y no un objeto con `doc` genérico: así
 * `p.tipo === 'noticias'` estrecha `p.doc` a `Noticia` sin castear en cada uso, que
 * es justo lo que hace útil una polimórfica.
 */
export type Pieza =
  | { n: number; tipo: 'noticias'; doc: Noticia }
  | { n: number; tipo: 'podcasts'; doc: Podcast }
  | { n: number; tipo: 'transmisiones'; doc: Transmisione }
  | { n: number; tipo: 'listas'; doc: Lista };

/**
 * El especial vigente de una serie.
 *
 * `depth: 2` para que las piezas lleguen con su documento poblado y con la imagen
 * de cada una; con `depth: 1` las piezas serían ids y habría que pedirlas aparte.
 *
 * ⚠️ Se ordena por `-numero` y se toma el primero, en vez de filtrar por
 * `inicio <= hoy <= fin`. Es deliberado: un rango con la fecha de hoy en el `where`
 * daría una clave de caché distinta en cada petición —la regla de oro de este
 * cliente— y además dejaría la sección VACÍA en cuanto un especial venciera y el
 * siguiente no estuviera capturado. Con `-numero` siempre hay algo que mostrar.
 */
export async function obtenerEspecialVigente(serieSlug?: string): Promise<Especiale | null> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Especiale>>('especiales', {
      'where[estado][equals]': 'activo',
      ...(serieSlug ? { 'where[serie.slug][equals]': serieSlug } : {}),
      depth: 2,
      sort: '-numero',
      limit: 1,
    });
    return r.docs[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Las piezas del especial, resueltas y numeradas.
 *
 * Descarta las que llegaron como id (`depth` insuficiente) o nulas, porque pintar
 * «CÁPSULA 05» de algo que no se puede enlazar es peor que no pintarla. La
 * numeración se calcula ANTES de descartar, para que un hueco no renumere el resto.
 */
export function piezasDe(especial: Especiale | null): Pieza[] {
  if (!especial?.piezas) return [];
  const salida: Pieza[] = [];
  especial.piezas.forEach((p, i) => {
    // Si llegó como número, el `depth` no alcanzó: no se puede enlazar ni pintar.
    if (typeof p.value !== 'object' || p.value === null) return;
    // El cast es seguro por construcción: en la unión de Payload, `relationTo` y
    // `value` vienen emparejados. TypeScript no puede correlacionarlos dentro de
    // un recorrido, así que la garantía la da el tipo de origen, no este `as`.
    salida.push({ n: i + 1, tipo: p.relationTo, doc: p.value } as Pieza);
  });
  return salida;
}

/** Solo las cápsulas: las piezas que son `noticias`. */
export function capsulasDe(especial: Especiale | null) {
  return piezasDe(especial).filter((p) => p.tipo === 'noticias');
}

/**
 * Las listas del especial — de ahí sale la playlist del tema en 13a.
 * Se resuelve desde `piezas` y no con una consulta aparte, porque el especial ya
 * las trae pobladas y una consulta más sería gratis solo en apariencia.
 */
export function listasDe(especial: Especiale | null): Pieza[] {
  return piezasDe(especial).filter((p) => p.tipo === 'listas');
}

/** Todos los especiales de una serie — el índice de `/fenomeno-residente`. */
export async function obtenerEspeciales(serieSlug?: string, cuantos = 24): Promise<Especiale[]> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Especiale>>('especiales', {
      ...(serieSlug ? { 'where[serie.slug][equals]': serieSlug } : {}),
      ...SIN_PAGINACION,
      depth: 1,
      sort: '-numero',
      limit: cuantos,
    });
    return r.docs;
  } catch {
    return [];
  }
}

/**
 * Un especial por slug — la página de un tema.
 *
 * `depth: 2` como el vigente: sin él las piezas llegan como ids y la página se
 * queda sin cápsulas ni playlist.
 *
 * ⚠️ NO lleva `catch`: quien llama tiene que poder distinguir «no existe» de «el
 * CMS no contesta». Un 404 cacheable sobre un especial que sí existe se queda
 * pegado en el borde y en el índice de Google; la respuesta honesta es 503. Es el
 * mismo reparto que ya usa `obtenerNota`.
 */
export async function obtenerEspecial(slug: string): Promise<Especiale | null> {
  const r = await cmsFetchEstacion<RespuestaLista<Especiale>>('especiales', {
    'where[slug][equals]': slug,
    depth: 2,
    limit: 1,
  });
  return r.docs[0] ?? null;
}
