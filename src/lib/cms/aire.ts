/**
 * Lo que está al aire — la bitácora del playout (Dalet → CMS).
 *
 * `bitacora` tiene `read` PÚBLICO a propósito, aunque sea telemetría: es lo que
 * alimenta el "qué suena ahora" del §2 del mapa de sitio. Solo entran canciones,
 * nunca comerciales: el endpoint de ingesta filtra con la lista blanca
 * `estaciones.categoriasMusicales`, que **falla cerrado**.
 *
 * 🔴 Hoy ninguna estación tiene esa lista cargada, así que la bitácora está vacía
 * y estas funciones devuelven `null`/`[]`. No es un bug de este código: es A6 del
 * plan. Por eso todo aquí degrada en silencio en vez de tirar la página.
 *
 * Retención: 7 días (job `limpiarBitacora`, 3:15 a.m.). Justo la ventana de una
 * semana, que es lo que hace falta para un "qué sonó" por día.
 */
import { cmsFetchEstacion, SIN_PAGINACION, type RespuestaLista } from './client';
import type { DocMedia } from './client';

export interface Cancion {
  id: number;
  titulo: string;
  artista?: string | null;
  duracion?: string | null;
  portada?: DocMedia | number | null;
  spotify?: string | null;
  appleMusic?: string | null;
  youtube?: string | null;
  deezer?: string | null;
}

export interface EntradaBitacora {
  id: number;
  /** Instante en que salió al aire. UTC; formatear en America/Mexico_City. */
  sonoEn: string;
  titulo: string;
  artista?: string | null;
  cancion?: Cancion | number | null;
  duracion?: string | null;
}

/**
 * La última canción al aire. `depth: 1` para traer poblada la ficha de `canciones`
 * (portada y enlaces a plataformas).
 *
 * Degrada a `null` si el CMS falla o la bitácora está vacía: el player tiene su
 * propio fallback ("Beat 100.9") y una portada sin dato es mejor que un 500.
 */
export async function queSuena(): Promise<EntradaBitacora | null> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<EntradaBitacora>>(
      'bitacora',
      { sort: '-sonoEn', limit: 1, depth: 1, ...SIN_PAGINACION },
      // Timeout corto: es un dato de "ahora" y no vale la pena colgar el SSR por él.
      3000,
    );
    return r.docs[0] ?? null;
  } catch {
    return null;
  }
}

/**
 * Lo que ha sonado, más reciente primero. Para el "qué sonó" de la semana.
 * `pagination: false` porque nada de esto pinta un paginador.
 */
export async function loQueSono(limite = 50): Promise<EntradaBitacora[]> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<EntradaBitacora>>('bitacora', {
      sort: '-sonoEn',
      limit: limite,
      depth: 1,
      ...SIN_PAGINACION,
    });
    return r.docs;
  } catch {
    return [];
  }
}
