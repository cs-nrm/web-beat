/**
 * La parrilla — «HOY EN LA SEÑAL» de 13a, y §9 del mapa de sitio.
 *
 * 🔴 Esto se resuelve en el SERVIDOR, no en el cliente. El sitio viejo lo hacía en
 * el navegador: leía 7 booleanos ACF (`lunes`…`domingo`), comparaba
 * `acf.hora_inicio`/`hora_fin` como cadenas y se refrescaba con un `setInterval`
 * de 5 minutos. Aquí la parrilla del día y el «al aire ahora» salen renderizados,
 * y el TTL de la caché los mantiene frescos sin JavaScript.
 */
import { cmsFetchEstacion, SIN_PAGINACION, type RespuestaLista } from './client';
import type { Programa } from '@/types/payload';

/** Los códigos de día del CMS, en el orden de `Date.getDay()` (0 = domingo). */
const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'] as const;
type Dia = (typeof DIAS)[number];

/** Un bloque de la parrilla, ya resuelto contra el reloj. */
export interface Bloque {
  programa: Programa;
  horaInicio: string;
  horaFin: string;
  /** Minutos desde medianoche — para ordenar y comparar sin volver a parsear. */
  desde: number;
  hasta: number;
  esVivo: boolean;
  alAire: boolean;
  /** El bloque termina al día siguiente. */
  cruzaMedianoche: boolean;
}

/**
 * `HH:MM` a minutos desde medianoche.
 *
 * ⚠️ Las horas son TEXTO en el CMS, no un tipo hora. Un `"9:5"` o un `"24:00"`
 * capturado a mano no debe tumbar la página, así que lo que no parsea devuelve
 * `null` y su bloque se descarta.
 */
function minutos(hhmm: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** El día y el minuto actuales EN HORA DE MÉXICO, no en la del servidor. */
function ahoraEnMexico(): { dia: Dia; minuto: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  const mapa: Record<string, Dia> = {
    Sun: 'dom', Mon: 'lun', Tue: 'mar', Wed: 'mie', Thu: 'jue', Fri: 'vie', Sat: 'sab',
  };
  // `hour12: false` puede dar "24" a medianoche en algunos entornos.
  const hora = Number(g('hour')) % 24;
  return { dia: mapa[g('weekday')] ?? 'lun', minuto: hora * 60 + Number(g('minute')) };
}

/**
 * La parrilla de hoy, ordenada, con el bloque al aire marcado.
 *
 * Se piden TODOS los programas activos en una consulta y se resuelve en memoria:
 * `horarios` es un array anidado y filtrar por día del lado del CMS pediría un
 * `where` sobre un campo de array —lento— y además metería el día de hoy en la
 * clave de caché, que es la regla de oro de este cliente.
 */
export async function obtenerParrillaDeHoy(): Promise<{ bloques: Bloque[]; alAire: Bloque | null }> {
  let programas: Programa[] = [];
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Programa>>('programas', {
      'where[estado][equals]': 'activo',
      ...SIN_PAGINACION,
      depth: 1,
    });
    programas = r.docs;
  } catch {
    return { bloques: [], alAire: null };
  }

  const { dia, minuto } = ahoraEnMexico();
  const bloques: Bloque[] = [];

  for (const programa of programas) {
    for (const h of programa.horarios ?? []) {
      if (!h.dias?.includes(dia)) continue;
      const desde = minutos(h.horaInicio);
      const hastaCrudo = minutos(h.horaFin);
      if (desde === null || hastaCrudo === null) continue;

      /*
        ⚠️ El bloque que cruza medianoche. Si `horaFin <= horaInicio` el bloque
        termina al día siguiente: «23:00 → 01:00». Sin esto, la comparación
        `minuto >= desde && minuto < hasta` es FALSA siempre para esos bloques, y
        el programa de la madrugada nunca aparecería al aire. Está anotado igual en
        el CMS, y el sitio viejo comparaba cadenas, así que lo tenía roto.
      */
      const cruzaMedianoche = hastaCrudo <= desde;
      const hasta = cruzaMedianoche ? hastaCrudo + 24 * 60 : hastaCrudo;
      const minutoAjustado = cruzaMedianoche && minuto < desde ? minuto + 24 * 60 : minuto;

      bloques.push({
        programa,
        horaInicio: h.horaInicio,
        horaFin: h.horaFin,
        desde,
        hasta,
        esVivo: h.tipo !== 'repeticion',
        alAire: minutoAjustado >= desde && minutoAjustado < hasta,
        cruzaMedianoche,
      });
    }
  }

  bloques.sort((a, b) => a.desde - b.desde);
  return { bloques, alAire: bloques.find((b) => b.alAire) ?? null };
}

/** Todos los programas activos — el índice de `/programacion`. */
export async function obtenerProgramas(): Promise<Programa[]> {
  try {
    const r = await cmsFetchEstacion<RespuestaLista<Programa>>('programas', {
      'where[estado][equals]': 'activo',
      ...SIN_PAGINACION,
      depth: 1,
      sort: 'nombre',
    });
    return r.docs;
  } catch {
    return [];
  }
}

/**
 * Un programa por slug — su ficha en `/programas/<slug>`.
 *
 * ⚠️ Sin `catch`, como `obtenerNota` y `obtenerEspecial`: quien llama tiene que
 * poder distinguir «no existe» de «el CMS no contesta». Un 404 cacheable sobre un
 * programa que sí existe se queda pegado en el borde y en el índice de Google.
 *
 * `depth: 1` para que `imagen` y `locutores` bajen como documentos; con 0 serían
 * ids y la ficha saldría sin foto y sin quién conduce.
 */
export async function obtenerPrograma(slug: string): Promise<Programa | null> {
  const r = await cmsFetchEstacion<RespuestaLista<Programa>>('programas', {
    'where[slug][equals]': slug,
    depth: 1,
    limit: 1,
  });
  return r.docs[0] ?? null;
}
