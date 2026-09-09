/**
 * La parrilla, en aritmética pura. Sin CMS, sin DOM.
 *
 * 🔴 Por qué este archivo existe SEPARADO de `lib/cms/programacion.ts`: la regla
 * de «qué está al aire» la necesitan las DOS orillas. El servidor la usa para
 * pintar la página; el navegador para que una pestaña abierta media hora no siga
 * marcando al aire un programa que ya terminó. Y `lib/cms/*` es server-only por
 * contrato —`client.ts` revienta a propósito si alguien lo arrastra al
 * navegador—, así que la regla no podía vivir ahí.
 *
 * La lección es la de §11 de `movimiento.md`, que ya nos costó la marca de
 * sección de la nav: cuando el servidor y el cliente calculan lo mismo con dos
 * copias de la regla, el día que divergen no se sabe cuál manda. Aquí hay UNA
 * copia y las dos la importan.
 *
 * ⚠️ Este módulo no importa nada que no sean tipos. Si algún día necesita algo
 * de `lib/cms/`, es señal de que lo que se está escribiendo no va aquí.
 */
import type { Programa } from '@/types/payload';

/** Los códigos de día del CMS, en el orden de `Date.getDay()` (0 = domingo). */
export const DIAS_RELOJ = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'] as const;
export type Dia = (typeof DIAS_RELOJ)[number];

/**
 * Los días en el orden en que se LEEN, que no es el del reloj.
 *
 * La semana de una parrilla de radio empieza en lunes: es como la publica la
 * estación y como la dibuja el lienzo (`LUN … DOM`). `DIAS_RELOJ` existe aparte
 * porque `Date.getDay()` empieza en domingo y esa es la que hay que usar para
 * traducir un reloj a un día — mezclarlas desplaza la parrilla un día entero.
 */
export const DIAS_SEMANA = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;

/** El rótulo de tres letras, con su acento. */
export const ROTULO_DIA: Record<Dia, string> = {
  lun: 'LUN', mar: 'MAR', mie: 'MIÉ', jue: 'JUE', vie: 'VIE', sab: 'SÁB', dom: 'DOM',
};

/** Los minutos que tiene un día. La parrilla mide en minutos desde medianoche. */
export const MINUTOS_DIA = 24 * 60;

/**
 * `HH:MM` a minutos desde medianoche.
 *
 * ⚠️ Las horas son TEXTO en el CMS, no un tipo hora. Un `"9:5"` o un `"24:00"`
 * capturado a mano no debe tumbar la página, así que lo que no parsea devuelve
 * `null` y su bloque se descarta.
 */
export function minutos(hhmm: string | null | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec((hhmm ?? '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/** Minutos desde medianoche a `HH:MM`, para lo que se pinta. */
export function comoHora(min: number): string {
  const m = ((min % MINUTOS_DIA) + MINUTOS_DIA) % MINUTOS_DIA;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * El día y el minuto actuales EN HORA DE MÉXICO, no en la del servidor ni en la
 * del visitante.
 *
 * 🔴 La parrilla está en hora de la estación. Un oyente en Madrid o en Los
 * Ángeles vería el programa equivocado marcado al aire si esto usara su reloj
 * local — y es exactamente el tipo de error que nadie reporta, porque quien lo
 * sufre no sabe cuál era el programa correcto.
 *
 * ⚠️ Se pide `weekday` en `en-US` a propósito: son las claves de tres letras
 * (`Mon`, `Tue`…) que el mapa de abajo traduce. En `es-MX` llegarían acentuadas y
 * localizadas, que es un dato para pintar, no para comparar.
 */
export function ahoraEnMexico(cuando: Date = new Date()): { dia: Dia; minuto: number } {
  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(cuando);
  const g = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  const mapa: Record<string, Dia> = {
    Sun: 'dom', Mon: 'lun', Tue: 'mar', Wed: 'mie', Thu: 'jue', Fri: 'vie', Sat: 'sab',
  };
  // `hour12: false` puede dar "24" a medianoche en algunos entornos.
  const hora = Number(g('hour')) % 24;
  return { dia: mapa[g('weekday')] ?? 'lun', minuto: hora * 60 + Number(g('minute')) };
}

/**
 * Un bloque que cruza medianoche va de `desde` a 24:00 y de 00:00 a `hasta`.
 *
 * `desde`/`hasta` en minutos desde medianoche, `hasta` SIN normalizar (o sea, tal
 * como vino del CMS). Es la única forma de la comparación que sirve a las dos
 * orillas, y la que usa `senal.ts` desde que existe.
 */
export function estaAlAire(desde: number, hasta: number, cruza: boolean, ahora: number): boolean {
  return cruza ? ahora >= desde || ahora < hasta : ahora >= desde && ahora < hasta;
}

/** Un bloque de la parrilla del DÍA, ya resuelto contra el reloj. */
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
 * La parrilla de un día, ordenada, con el bloque al aire marcado.
 *
 * Pura: recibe los programas ya traídos y el reloj ya resuelto. Quien habla con
 * el CMS es `lib/cms/programacion.ts`.
 */
export function parrillaDelDia(
  programas: Programa[],
  dia: Dia,
  minuto: number,
): { bloques: Bloque[]; alAire: Bloque | null } {
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
      const hasta = cruzaMedianoche ? hastaCrudo + MINUTOS_DIA : hastaCrudo;
      const minutoAjustado = cruzaMedianoche && minuto < desde ? minuto + MINUTOS_DIA : minuto;

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

/**
 * Un trozo de parrilla que cabe DENTRO de un día. La pieza de la rejilla semanal.
 *
 * 🔴 La diferencia con `Bloque` no es cosmética: un `Bloque` puede terminar al día
 * siguiente (`hasta` > 1440), y una celda de la rejilla no puede — la columna del
 * sábado se acaba a medianoche. Así que un bloque que cruza produce DOS segmentos,
 * uno al fondo de su día y otro arriba del siguiente, que es lo que se ve en una
 * parrilla de verdad.
 */
export interface Segmento {
  programa: Programa;
  dia: Dia;
  /** Minutos desde la medianoche DE SU DÍA. `hasta` nunca pasa de 1440. */
  desde: number;
  hasta: number;
  esVivo: boolean;
  alAire: boolean;
  /** Viene partido de medianoche: este segmento es la cola del día anterior. */
  esContinuacion: boolean;
  /**
   * Carril dentro de su racimo de solapes, y cuántos carriles tiene el racimo.
   *
   * 🔴 Existe para que un solape no ESCONDA un programa. En la rejilla cada
   * segmento va posicionado en absoluto y a todo el ancho de su columna; dos
   * bloques capturados a la misma hora del mismo día se taparían por completo y
   * el de abajo desaparecería de la página — contenido inalcanzable, que es la
   * regla que §3 de `movimiento.md` dice que ya hemos roto tres veces.
   *
   * Con esto la columna se parte en tantas franjas como bloques solapados haya
   * en ESE tramo, y se ven los dos. Y se ven a propósito: un solape es un error
   * de captura, y la estación no puede corregir lo que no ve. Lo normal
   * —`carriles: 1`— deja la celda a todo el ancho, igual que antes.
   */
  carril: number;
  carriles: number;
}

/** El día siguiente, en la rueda de la semana. */
function diaSiguiente(dia: Dia): Dia {
  const i = DIAS_RELOJ.indexOf(dia);
  return DIAS_RELOJ[(i + 1) % 7];
}

/**
 * La semana completa, un array de segmentos por día, en el orden en que se lee.
 *
 * Lo que hace de verdad: aplanar `programas[].horarios[].dias[]` —tres niveles de
 * anidamiento— a una lista plana de celdas colocables, y cortar en medianoche.
 *
 * ⚠️ Los SOLAPES no se resuelven, se muestran. Dos programas capturados a la misma
 * hora del mismo día salen los dos, repartidos a lo ancho de la columna por
 * `repartirCarriles`. Elegir uno en silencio esconde un error de captura que la
 * estación tiene que poder VER para corregirlo — y esconderlo sería, además,
 * contenido inalcanzable.
 */
export function parrillaSemanal(
  programas: Programa[],
  ahora: { dia: Dia; minuto: number },
): Array<{ dia: Dia; rotulo: string; esHoy: boolean; segmentos: Segmento[] }> {
  const porDia = new Map<Dia, Segmento[]>();
  for (const d of DIAS_SEMANA) porDia.set(d, []);

  const empujar = (s: Omit<Segmento, 'alAire' | 'carril' | 'carriles'>) => {
    // Un segmento de duración cero no es una celda: «23:00 → 00:00» cruza
    // medianoche y su cola mide 0 minutos.
    if (s.hasta <= s.desde) return;
    porDia.get(s.dia)?.push({
      ...s,
      alAire: s.dia === ahora.dia && ahora.minuto >= s.desde && ahora.minuto < s.hasta,
      // Se rellenan al cerrar el día, cuando ya se sabe quién solapa con quién.
      carril: 0,
      carriles: 1,
    });
  };

  for (const programa of programas) {
    for (const h of programa.horarios ?? []) {
      const desde = minutos(h.horaInicio);
      const hastaCrudo = minutos(h.horaFin);
      if (desde === null || hastaCrudo === null) continue;
      const esVivo = h.tipo !== 'repeticion';
      const cruza = hastaCrudo <= desde;

      for (const dia of h.dias ?? []) {
        empujar({
          programa,
          dia,
          desde,
          hasta: cruza ? MINUTOS_DIA : hastaCrudo,
          esVivo,
          esContinuacion: false,
        });
        if (cruza) {
          empujar({
            programa,
            dia: diaSiguiente(dia),
            desde: 0,
            hasta: hastaCrudo,
            esVivo,
            esContinuacion: true,
          });
        }
      }
    }
  }

  return DIAS_SEMANA.map((dia) => {
    const segmentos = (porDia.get(dia) ?? []).sort(
      (a, b) => a.desde - b.desde || a.hasta - b.hasta,
    );
    repartirCarriles(segmentos);
    return { dia, rotulo: ROTULO_DIA[dia], esHoy: dia === ahora.dia, segmentos };
  });
}

/**
 * Reparte los segmentos de un día en carriles, por RACIMO de solapes.
 *
 * Un racimo es un tramo continuo de segmentos que se pisan entre sí: mientras uno
 * empiece antes de que acabe el más largo de los anteriores, sigue en el racimo.
 * Dentro de él, cada segmento toma el primer carril que ya esté libre a su hora.
 *
 * ⚠️ Por RACIMO y no por día: si el único solape del sábado está a las 3 de la
 * mañana, no hay razón para partir en dos las 24 horas de esa columna. Cada tramo
 * paga solo su propio desorden.
 *
 * ⚠️ Recibe la lista YA ORDENADA por hora de inicio y la modifica en el sitio.
 * Con el orden roto el algoritmo no falla: reparte mal, en silencio.
 */
function repartirCarriles(segmentos: Segmento[]): void {
  let i = 0;
  while (i < segmentos.length) {
    // Hasta dónde llega el racimo que empieza en `i`.
    let fin = segmentos[i].hasta;
    let j = i + 1;
    while (j < segmentos.length && segmentos[j].desde < fin) {
      fin = Math.max(fin, segmentos[j].hasta);
      j++;
    }

    const racimo = segmentos.slice(i, j);
    // `finDeCarril[k]` es el minuto en que se libera el carril k.
    const finDeCarril: number[] = [];
    for (const s of racimo) {
      let carril = finDeCarril.findIndex((f) => f <= s.desde);
      if (carril === -1) {
        carril = finDeCarril.length;
        finDeCarril.push(s.hasta);
      } else {
        finDeCarril[carril] = s.hasta;
      }
      s.carril = carril;
    }
    for (const s of racimo) s.carriles = finDeCarril.length;

    i = j;
  }
}
