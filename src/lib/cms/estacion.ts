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
  /** Interruptor del preroll de audio. Apagado —lo normal— significa SIN preroll. */
  preroll?: boolean | null;
  facebook?: string | null;
  instagram?: string | null;
  x?: string | null;
  youtube?: string | null;
  tiktok?: string | null;
}

/**
 * ¿Hay campaña de preroll?
 *
 * 🔴 Por qué existe el interruptor (Carlos, 2026-09-10): hay campaña cada dos o
 * tres meses y dura de 15 a 30 días, así que el ad unit está VACÍO unos tres
 * cuartos del año. Medido ese día contra el ad unit que sale del entorno, GAM
 * devuelve un VAST vacío —`<VAST version="3.0"/>`, 156 bytes—. Apagado, el player
 * no pide ese anuncio y abre el aire antes.
 *
 * 🔴 Y sobre todo quita de raíz un cuelgue que ya costó: `playAd()` puede no emitir
 * NINGÚN evento, y eso eran 20 s de «Conectando…» y un error en el primer play de
 * la sesión, en un iPhone con buena wifi. `player.ts` lo tiene acotado a 6 s con su
 * propio tope; con el interruptor apagado son cero, porque ni se pide.
 *
 * ⚠️ El fallo de un booleano va del lado caro, y hay que saberlo: olvidado APAGADO
 * con campaña vendida, se dejan de servir impresiones y nadie se entera. Se eligió
 * igual, a sabiendas, porque lo prende y lo apaga Carlos y no quiere capturar
 * fechas — antes esto fue un rango `inicio`/`fin` y se descartó por eso.
 *
 * ⚠️ Lo que NO ahorra, aunque lo parecía: la descarga del IMA de Google (499,908 B
 * sin comprimir). Se probó construir el SDK sin el plugin `vastAd` y `ima3.js` se
 * baja igual — lo arrastra el módulo MediaPlayer, no el plugin. Queda anotado en
 * `player.ts`, donde se intentó.
 *
 * Se resuelve en el SERVIDOR y viaja como `data-preroll`. Y sigue siendo función y
 * no un `estacion.preroll === true` suelto por una razón concreta: la forma de este
 * campo ya cambió una vez en un mismo día —era un grupo con fechas—, y esta es la
 * única línea del front que hay que tocar si vuelve a cambiar.
 */
export function prerollActivo(estacion: Estacion): boolean {
  return estacion.preroll === true;
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
