/**
 * Transmisiones — la colección `transmisiones` del CMS, para la sección de
 * eventos especiales del Inicio (2026-11-13).
 *
 * Este módulo solo PREGUNTA. Qué transmisión se pinta, en qué estado y con qué
 * reproductor lo decide `src/lib/transmision.ts`, contra el reloj, porque esa
 * decisión no puede ir en el `where` (ver abajo).
 *
 * 🔴 **El tipo se declara AQUÍ y no sale de `src/types/payload.ts`.** Los campos
 * que deciden todo —`estado` («¿Cuándo sale al aire?»), `imagenCabecera`,
 * `colorFondo` y `despublicarEn`— son más nuevos que el commit del CMS al que están fijados los
 * tipos (`payload-types.lock.json`): llegaron el 2026-11-12/13. Mismo caso y
 * mismo remedio que `Banner` en `publicidad.ts` y `EntradaBitacora` en `aire.ts`.
 * El día que se suba el lock, esto se puede cambiar por `Transmisione`.
 */
import {
  cmsFetchEstacion,
  POBLAR_MEDIA,
  SIN_PAGINACION,
  soloCampos,
  type DocMedia,
  type RespuestaLista,
} from './client';

/**
 * El radio «¿Cuándo sale al aire?» del CMS. Es lo ÚNICO que el editor prende;
 * `videoEnVivo.activo` es un derivado que escribe un hook de ese lado y aquí no se
 * lee — ver `src/lib/transmision.ts`.
 */
export type EstadoTransmision = 'envivo' | 'programada' | 'fuera';

export interface TransmisionCms {
  id: number;
  titulo: string;
  descripcion?: string | null;
  imagenCabecera?: DocMedia | number | null;
  /** `#RRGGBB` o `#RGB`, ya normalizado por el CMS (2026-11-13). Opcional. */
  colorFondo?: string | null;
  estado?: EstadoTransmision | null;
  /** Inicio. Con hora: el picker del CMS es `dayAndTime`. */
  fecha?: string | null;
  /** Opcional. A esta hora el barrido del CMS la pasa a «Fuera de aire». */
  despublicarEn?: string | null;
  videoEnVivo?: {
    fuente?: 'iframe' | 'numero-evento' | null;
    /** Puede traer la URL o el CÓDIGO de inserción completo (`<div><iframe…>`). */
    url?: string | null;
    numeroEvento?: string | null;
  } | null;
}

/**
 * Lo que se lee de cada transmisión. `select` porque con `depth: 1` el CMS
 * poblaría también la `estacion` y el `especial` enteros, y aquí no se pinta
 * ninguno de los dos.
 */
const CAMPOS = [
  'titulo',
  'descripcion',
  'imagenCabecera',
  'colorFondo',
  'estado',
  'fecha',
  'despublicarEn',
  'videoEnVivo',
] as const;

/**
 * Las transmisiones que PUEDEN estar al aire: todas menos las «Fuera de aire».
 *
 * 🔴 **La hora no entra en la consulta**, y no es descuido: es la regla 2 de
 * `agents/content.md`. Un `where[fecha][less_than_equal]=<ahora>` cambia en cada
 * petición y cada visita estrenaría su propia entrada de caché. El filtro de aquí
 * es CONSTANTE —`estado != fuera`—, así que todas las visitas comparten una sola.
 * Lo que depende del reloj se decide en memoria.
 *
 * El `!= 'fuera'` deja fuera también las filas con `estado` en NULL (la trampa de
 * Postgres de `noticias.ts`), y aquí eso es lo correcto: una transmisión sin
 * estado no la ha prendido nadie.
 *
 * Diez de sobra: es una colección de UNIDADES —un stream por evento especial— y
 * las que no están fuera de aire son las de esta semana. Sin `catch` que tumbe
 * nada: si el CMS falla, `[]`, y el Inicio se pinta sin la sección.
 */
export async function obtenerTransmisiones({ todas = false } = {}): Promise<TransmisionCms[]> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<TransmisionCms>>('transmisiones', {
      // `todas` es SOLO para la vista previa del Inicio (`?transmision=` fuera del
      // sitio real): ahí se quiere ver la última capturada aunque ya terminó.
      ...(todas ? {} : { 'where[estado][not_equals]': 'fuera' }),
      sort: '-fecha',
      limit: 10,
      // `depth: 1` para que la cabecera llegue POBLADA: con 0 llega como id, la
      // URL sale `null` y la sección se pintaría sin su imagen, sin error.
      depth: 1,
      ...soloCampos('select', CAMPOS),
      ...POBLAR_MEDIA,
      ...SIN_PAGINACION,
    });
    return r.docs ?? [];
  } catch {
    return [];
  }
}
