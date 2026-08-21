/**
 * Valores de PRESENTACIÓN derivados de una nota.
 *
 * Viven aparte de `lib/cms/noticias.ts` a propósito: ese módulo habla con el CMS,
 * este decide cómo se lee un dato en pantalla. La firma editorial, el nombre de la
 * categoría y la fecha larga son decisiones de front, y varias tienen que resolver
 * inconsistencias del contenido capturado.
 */
import type { Noticia } from '@/types/payload';

/**
 * El nombre de categoría que se pinta en la tarjeta.
 *
 * ⚠️ `noticias.categorias` es `hasMany` y NO hay categoría primaria — es
 * justamente la razón por la que la URL de una nota es plana (decisión 10 del
 * plan). Para PINTAR sí hace falta elegir una, y se toma la primera: aquí sí es
 * aceptable, porque reordenar el array cambia una etiqueta, no una URL.
 */
export function nombreCategoria(nota: Noticia): string | null {
  const primera = (nota.categorias ?? [])[0];
  if (!primera || typeof primera === 'number') return null;
  return primera.nombre ?? null;
}

/** El slug de la primera categoría — para enlazar el rótulo al filtro. */
export function slugCategoria(nota: Noticia): string | null {
  const primera = (nota.categorias ?? [])[0];
  if (!primera || typeof primera === 'number') return null;
  return primera.slug ?? null;
}

/**
 * La firma.
 *
 * 🔴 Hay DOS campos y no dicen lo mismo: `autores` es una relación a la colección
 * `autores` y `autor` es texto libre. El contenido capturado usa solo el texto
 * libre, y ahí ya aparece la misma persona escrita de tres formas —«FO»,
 * «Fernanda Ortíz», «Fernanda Ortiz»—. Se prefiere la relación cuando existe,
 * porque es la única que puede dar una firma estable y una página de autor.
 */
export function firma(nota: Noticia): { nombre: string; slug: string | null } | null {
  const rel = (nota.autores ?? []).find((a) => typeof a === 'object' && a !== null);
  if (rel && typeof rel === 'object') {
    return { nombre: rel.nombre ?? '', slug: rel.slug ?? null };
  }
  const libre = (nota.autor ?? '').trim();
  return libre ? { nombre: libre, slug: null } : null;
}

const MESES = [
  'ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN',
  'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC',
];

/**
 * La fecha como la escribe el diseño: `18 AGO 2026`.
 *
 * Se formatea a mano y no con `Intl`: el diseño la quiere en mayúsculas y con el
 * mes abreviado a tres letras sin punto, que es lo que `Intl` en español no da
 * (devuelve «18 ago 2026», con punto en algunos entornos). Y con `timeZone` fija,
 * porque el servidor puede correr en UTC y una nota publicada a las 20:00 de
 * México saldría con la fecha del día siguiente.
 */
export function fechaCorta(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return null;
  const partes = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).formatToParts(d);
  const g = (t: string) => partes.find((p) => p.type === t)?.value ?? '';
  return `${g('day')} ${MESES[Number(g('month')) - 1]} ${g('year')}`;
}

/** La fecha en ISO, para `<time datetime>` y para los metadatos de artículo. */
export function fechaIso(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Los tres destinos de «compartir» de 14c.
 *
 * Se arman en el SERVIDOR con la URL canónica. Nada de `location.href`: la nota se
 * puede abrir con `?utm_*` pegado y compartirlo propagaría el rastreo de quien lo
 * compartió a todos los que reciban el enlace.
 */
export function enlacesCompartir(
  url: string,
  titulo: string,
): Array<{ icono: 'facebook' | 'x-marca' | 'link'; etiqueta: string; href: string }> {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(titulo);
  return [
    {
      icono: 'facebook',
      etiqueta: 'Compartir en Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    },
    { icono: 'x-marca', etiqueta: 'Compartir en X', href: `https://x.com/intent/post?url=${u}&text=${t}` },
    { icono: 'link', etiqueta: 'Copiar enlace', href: url },
  ];
}
