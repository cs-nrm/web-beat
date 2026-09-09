/**
 * La parrilla — «HOY EN LA SEÑAL» de 13a, `/programacion` y §9 del mapa de sitio.
 *
 * 🔴 Esto se resuelve en el SERVIDOR, no en el cliente. El sitio viejo lo hacía en
 * el navegador: leía 7 booleanos ACF (`lunes`…`domingo`), comparaba
 * `acf.hora_inicio`/`hora_fin` como cadenas y se refrescaba con un `setInterval`
 * de 5 minutos. Aquí la parrilla del día y el «al aire ahora» salen renderizados,
 * y el TTL de la caché los mantiene frescos sin JavaScript.
 *
 * ⚠️ Este archivo es SOLO el CMS: qué se pide y con qué filtros. La aritmética
 * —qué está al aire, cómo se corta un bloque en medianoche— vive en
 * `src/lib/parrilla.ts`, que es puro y lo importa también el navegador. La razón
 * está escrita en la cabecera de ese archivo y es la de §11 de `movimiento.md`.
 */
import { cmsFetchEstacion, SIN_PAGINACION, type RespuestaLista } from './client';
import type { Programa } from '@/types/payload';
import {
  ahoraEnMexico,
  parrillaDelDia,
  parrillaSemanal,
  type Bloque,
  type Dia,
} from '@/lib/parrilla';

/*
  Se re-exportan porque son los tipos que devuelve `obtenerProgramacion`, y quien
  la llama debería poder nombrarlos sin saber que la aritmética vive en otro
  archivo.

  ⚠️ Aquí había además `obtenerParrillaDeHoy()`, que devolvía solo la parrilla del
  día. Su único cliente era el panel «HOY EN LA SEÑAL» del Inicio, retirado el
  2026-09-09; sin él era un export que nadie llama. No se pierde nada: la
  aritmética es `parrillaDelDia()` en `lib/parrilla.ts` y `obtenerProgramacion()`
  ya devuelve el día en `hoy`.
*/
export type { Bloque, Segmento } from '@/lib/parrilla';

/*
  ⚠️ NO HAY CLASIFICACIÓN DE PROGRAMAS, y es decisión de Carlos (2026-09-09):
  «no lo necesitamos, el diseño se lo inventó».

  Se anota porque va a volver a preguntarse. El lienzo de `/programacion` pinta
  tres filtros sobre la parrilla —`SHOW INTERNACIONAL · SHOW SINDICADO ·
  PRODUCCIÓN BEAT`— y una rejilla «SHOWS INTERNACIONALES» con su conteo. Las
  cuatro cosas se construyeron, se acordó el campo con `cms-estaciones`
  (`tipoDeShow: 'internacional' | 'sindicado' | 'propio'`) y **se retiraron sin
  desplegarlo**: internacional / sindicado / propio no es una distinción que la
  estación lleve en la operación, apareció en el diseño.

  🔴 Y `programas` no tiene NINGUNA otra taxonomía con la que aproximarla —ni
  `categorias` ni `etiquetas`—: sus campos son `nombre`, `descripcionCorta`,
  `descripcion`, `locutores`, `imagen`, `horarios[]`, el contacto al aire, `slug` y
  `estado`. Así que no hay camino B sin tocar el esquema del CMS.

  👉 Si alguien vuelve con esos filtros: **no se reconstruyen desde el lienzo.**
  Hace falta un campo nuevo con quien lo capture, y el contrato se acuerda otra vez
  desde cero. Lo que hubo está en el historial de git.
*/

// ============================================================
// Las consultas
// ============================================================

/** Todos los programas activos, ordenados por nombre. */
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
 * Todo lo que `/programacion` necesita, en UNA consulta al CMS.
 *
 * 🔴 Una y no tres. La página pinta el «al aire ahora», «lo que sigue hoy» y la
 * rejilla de la semana, y las tres cosas salen del MISMO listado de programas:
 * pedirlo tres veces serían tres claves de caché distintas —`sort` distinto,
 * params distintos— y por tanto tres viajes al CMS para responder la misma
 * pregunta. Se pide una vez y se deriva en memoria con las funciones puras de
 * `lib/parrilla.ts`.
 *
 * ⚠️ NO devuelve la lista de programas. La devolvía, para las tarjetas de «SHOWS
 * INTERNACIONALES»; sin esa sección nadie la usaba y un campo que nadie lee es lo
 * que hace creer que falta cablear algo. Quien la necesite llama a
 * `obtenerProgramas()`, que sigue exportada y comparte la misma caché.
 *
 * ⚠️ Y por eso el reloj se resuelve UNA vez y se pasa hacia abajo: si cada
 * derivación llamara a `ahoraEnMexico()` por su cuenta, una petición servida en el
 * segundo 59 de un minuto podría calcular el «al aire» con un minuto y la rejilla
 * con el siguiente, y marcar dos programas al aire —o ninguno—.
 */
export async function obtenerProgramacion(): Promise<{
  ahora: { dia: Dia; minuto: number };
  semana: ReturnType<typeof parrillaSemanal>;
  hoy: Bloque[];
  alAire: Bloque | null;
}> {
  const programas = await obtenerProgramas();
  const ahora = ahoraEnMexico();
  const { bloques, alAire } = parrillaDelDia(programas, ahora.dia, ahora.minuto);

  return {
    ahora,
    semana: parrillaSemanal(programas, ahora),
    hoy: bloques,
    alAire,
  };
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
