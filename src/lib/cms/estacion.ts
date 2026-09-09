/**
 * La estación como dato de marca.
 *
 * `estaciones.read` es **público a propósito** en el CMS — el comentario del
 * propio `Estaciones.ts` lo explica: es el primer request de cada uno de los 4
 * sitios Astro, antes de tener usuario, y lo que expone ya es información pública
 * (dominio, nombre, color, logo, mount del stream).
 *
 * De aquí sale, entre otras cosas, el `tritonMount` del player: `Cabecera.astro`
 * lo emite en el SSR como `data-mount` y `src/scripts/player.ts` lo lee de ahí,
 * en vez del `XHSONFM` que el `player.js` heredado llevaba hardcodeado. Es lo que
 * hace que el repo sirva de modelo para las otras tres estaciones.
 */
import { cmsFetch, type RespuestaLista } from './client';
import { ESTACION_CODIGO } from '@/config/site';
import { REDES_RESPALDO } from '@/config/navegacion';

export interface Estacion {
  id: number;
  /** Nombre interno, CON frecuencia: "Beat 100.9". */
  nombre: string;
  /** Identificador corto y estable: `beat`. */
  codigo: string;
  /** Nombre público SIN frecuencia: "BEAT". Es el que va en feeds y SEO. */
  nombrePublicacion: string;
  /** Dominio del front, sin protocolo ni www. */
  dominio: string;
  color?: string | null;
  logo?: string | null;
  logoReversa?: string | null;
  /** Mount de Triton Digital. Para Beat: `XHSONFM`. */
  tritonMount?: string | null;
  notaStream?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  x?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
}

/**
 * Datos de marca de la estación. Se memoriza la promesa para el proceso: son
 * datos que cambian casi nunca, y así dos requests concurrentes comparten una
 * sola consulta.
 */
let promesa: Promise<Estacion> | null = null;

export function obtenerEstacion(): Promise<Estacion> {
  if (!promesa) {
    promesa = cmsFetch<RespuestaLista<Estacion>>(
      'estaciones',
      { 'where[codigo][equals]': ESTACION_CODIGO, limit: 1, depth: 0 },
      // Timeout corto: es el primer request de cada arranque y no debe colgar el
      // SSR si el CMS todavía no responde.
      5000,
    )
      .then((r) => {
        const doc = r.docs[0];
        if (!doc) {
          throw new Error(
            `No existe la estación con codigo="${ESTACION_CODIGO}" en el CMS.`,
          );
        }
        return doc;
      })
      .catch((err) => {
        promesa = null; // no memorizar un fallo
        throw err;
      });
  }
  return promesa;
}

/**
 * Redes sociales de la estación, ya filtradas y con su etiqueta.
 *
 * 🔴 El CMS manda, y `REDES_RESPALDO` solo tapa el hueco RED POR RED: hoy los
 * cinco campos de `estaciones` están en `null` y el pie pintaba «Próximamente»
 * donde va la única forma de seguir a la estación. Con el `??`, capturar Facebook
 * en el admin lo hace ganar de inmediato sin tocar las otras cuatro.
 *
 * ⚠️ Se sigue filtrando por verdad: una entrada sin URL en ninguno de los dos
 * lados no se pinta. Un enlace vacío es peor que una red de menos.
 */
export async function redesEstacion(): Promise<Array<{ red: string; url: string }>> {
  const e = await obtenerEstacion();
  const pares: Array<[string, string | null | undefined]> = [
    ['Facebook', e.facebook ?? REDES_RESPALDO.facebook],
    ['Instagram', e.instagram ?? REDES_RESPALDO.instagram],
    ['X', e.x ?? REDES_RESPALDO.x],
    ['YouTube', e.youtube ?? REDES_RESPALDO.youtube],
    ['TikTok', e.tiktok ?? REDES_RESPALDO.tiktok],
  ];
  return pares
    .filter((p): p is [string, string] => Boolean(p[1]))
    .map(([red, url]) => ({ red, url }));
}
