/**
 * Valores de PRESENTACIÓN derivados de un evento de la Agenda.
 *
 * Viven aparte de `lib/cms/eventos.ts` por la misma razón que `lib/nota.ts`: ese
 * módulo habla con el CMS —qué se pide y con qué filtros— y este decide cómo se
 * lee un dato en pantalla. Las dos funciones de aquí existen porque el contenido
 * capturado trae repeticiones que en pantalla se leen como un error del sitio.
 */
import type { Evento } from '@/types/payload';

/**
 * «DÓNDE», en una línea: el lugar y la ciudad unidos por `·`, **sin repetir**.
 *
 * 🔴 `lugar` y `ciudad` son dos campos de texto libre y la estación llena los dos
 * aunque todavía no sepa el sitio: «Aniversario Beat» traía «Próximamente» en
 * ambos, así que la tarjeta y la ficha decían `PRÓXIMAMENTE · PRÓXIMAMENTE`
 * (Carlos, 2026-09-09). Leído de corrido parece que el sitio pintó el mismo dato
 * dos veces —que es exactamente lo que pasaba—.
 *
 * ⚠️ Se compara en minúsculas y sin espacios de sobra, no por igualdad estricta:
 * lo que se captura a mano llega como «Próximamente» y «PRÓXIMAMENTE» sin que
 * nadie lo note. Lo que se PINTA es el texto tal cual vino, no el normalizado.
 *
 * ⚠️ Y el orden importa: gana `lugar`, que es el más específico de los dos. Si
 * alguien capturó «Ciudad de México» en los dos campos, se lee una vez y en el
 * hueco del lugar, que es donde primero se mira.
 */
export function donde(evento: Pick<Evento, 'lugar' | 'ciudad'>): string {
  const partes: string[] = [];
  const vistas = new Set<string>();

  for (const bruto of [evento.lugar, evento.ciudad]) {
    const texto = bruto?.trim();
    if (!texto) continue;
    const clave = texto.toLocaleLowerCase('es-MX');
    if (vistas.has(clave)) continue;
    vistas.add(clave);
    partes.push(texto);
  }

  return partes.join(' · ');
}

/**
 * Si dos instantes caen el MISMO día del calendario en hora de México.
 *
 * 🔴 En hora de México y no del visitante, por lo mismo que todo el formateo de la
 * Agenda: un evento que termina a las 23:30 del sábado en la Ciudad de México
 * termina el sábado, lo mire alguien desde Tijuana o desde Madrid. Comparado en la
 * zona del lector, el mismo evento se partiría en dos días para media república.
 *
 * ⚠️ Se comparan las PARTES formateadas y no `getTime()` ni un `toISOString()`
 * recortado: en UTC, las 20:00 del sábado en México ya son las 02:00 del domingo.
 */
export function mismoDiaEnMexico(a: Date, b: Date): boolean {
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return f.format(a) === f.format(b);
}
