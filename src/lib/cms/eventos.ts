/**
 * La Agenda — §5 del mapa de sitio, y el bloque «AGENDA» de 13a.
 */
import { cmsFetchEstacion, SIN_PAGINACION, type RespuestaLista } from './client';
import type { Evento } from '@/types/payload';

/** Los filtros que 13a pinta: `TODOS · PROPIOS · COBERTURAS · FESTIVALES`. */
export const TIPOS_EVENTO = [
  { valor: 'propio', etiqueta: 'PROPIOS' },
  { valor: 'cobertura', etiqueta: 'COBERTURAS' },
  { valor: 'festival', etiqueta: 'FESTIVALES' },
] as const;

/**
 * El corte «desde cuándo» de la Agenda, redondeado al INICIO DEL DÍA en hora de
 * México.
 *
 * 🔴 Esto es la regla de oro del cliente aplicada a un caso nuevo. Lo natural sería
 * `where[inicio][greater_than_equal]=<ahora>`, y sería un error medido: el valor
 * cambia en cada petición, así que **cada visita generaría su propia entrada de
 * caché y ninguna acertaría nunca**. Es exactamente el bug que en `web-enfoque`
 * produjo 836 de los 1,103 errores por hora, con `where[id][not_equals]`.
 *
 * Redondeando al día, todas las visitas de la jornada comparten una sola entrada.
 * El costo es que un evento que empezó hace tres horas sigue listado hasta
 * medianoche — que además es lo correcto para una agenda: un festival que arrancó
 * a las 14:00 sigue siendo el plan de hoy a las 20:00.
 */
function desdeHoy(): string {
  const ahora = new Date();
  // No se usa `toISOString().slice(0,10)`: en UTC, a las 19:00 de México ya es el
  // día siguiente, y la agenda se saltaría los eventos de esta noche.
  const enMexico = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora);
  return `${enMexico}T00:00:00.000Z`;
}

/**
 * Los próximos eventos, del más cercano al más lejano.
 *
 * ⚠️ El orden es ASCENDENTE, al contrario que todo lo editorial: en una agenda lo
 * relevante es lo que está por pasar, no lo último capturado.
 */
export async function obtenerAgenda(cuantos = 4, tipo?: string | null): Promise<Evento[]> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Evento>>('eventos', {
      'where[estado][equals]': 'publicada',
      'where[inicio][greater_than_equal]': desdeHoy(),
      ...(tipo ? { 'where[tipo][equals]': tipo } : {}),
      ...SIN_PAGINACION,
      depth: 1,
      sort: 'inicio',
      limit: cuantos,
    });
    return r.docs;
  } catch {
    return [];
  }
}

/** Un evento por slug. */
export async function obtenerEvento(slug: string): Promise<Evento | null> {
  const r = await cmsFetchEstacion<RespuestaLista<Evento>>('eventos', {
    'where[slug][equals]': slug,
    depth: 2,
    limit: 1,
  });
  return r.docs[0] ?? null;
}
