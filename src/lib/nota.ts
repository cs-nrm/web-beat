/**
 * Valores de PRESENTACIÓN derivados de una nota.
 *
 * Viven aparte de `lib/cms/noticias.ts` a propósito: ese módulo habla con el CMS,
 * este decide cómo se lee un dato en pantalla. La firma editorial, el nombre de la
 * categoría y la fecha larga son decisiones de front, y varias tienen que resolver
 * inconsistencias del contenido capturado.
 */
import { urlMedia } from '@/lib/cms/client';
import { SECCIONES_EDITORIALES, type SeccionEditorial } from '@/config/navegacion';
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

/**
 * 🔴 A QUÉ SECCIÓN pertenece una nota: Beat Scanner o Editorial.
 *
 * Lo decide la categoría, porque desde el 2026-09-07 eso es lo que separa las dos
 * secciones editoriales (ver `SECCIONES_EDITORIALES`). De aquí salen la migaja de
 * la nota y la pastilla encendida de su tira: antes las dos decían «BEAT SCANNER»
 * fijo, y con dos secciones eso convertía a la mitad de las notas en una mentira.
 *
 * ⚠️ Se recorren las categorías EN EL ORDEN DE LA NOTA y gana la primera que sea
 * una sección — el mismo criterio que `nombreCategoria`. Es coherente y es lo menos
 * sorprendente: quien captura decide cuál va primero, y reordenar el array cambia
 * una etiqueta, no una URL.
 *
 * ⚠️ Cae a Beat Scanner cuando la nota no está en ninguna de las dos —una cápsula
 * del Fenómeno Residente, por ejemplo—. No es exacto, pero es lo que el sitio ya
 * hacía para TODAS las notas, y la alternativa —una migaja sin sección— dejaría a
 * esas notas sin salida hacia arriba.
 */
export function seccionDeNota(nota: Noticia): SeccionEditorial {
  const secciones = Object.values(SECCIONES_EDITORIALES);
  for (const c of nota.categorias ?? []) {
    if (typeof c === 'number' || !c?.slug) continue;
    const hallada = secciones.find((s) => s.categoria === c.slug);
    if (hallada) return hallada;
  }
  return SECCIONES_EDITORIALES.scanner;
}

/** El slug de la primera categoría — para enlazar el rótulo al filtro. */
export function slugCategoria(nota: Noticia): string | null {
  const primera = (nota.categorias ?? [])[0];
  if (!primera || typeof primera === 'number') return null;
  return primera.slug ?? null;
}

/** La firma de una nota, ya resuelta para pintarse. */
export interface Firma {
  nombre: string;
  slug: string | null;
  /**
   * La foto del autor, si la relación existe y la trae. Con el texto libre es
   * `null` siempre: una cadena no tiene foto.
   */
  foto: string | null;
  /** Las iniciales, para el hueco de la foto cuando no hay foto. */
  monograma: string;
  /** Una línea sobre quién firma. `null` cae al texto de la casa. */
  cargo: string | null;
}

/**
 * 🔴 Las INICIALES con las que se rellena el hueco de la foto.
 *
 * Antes ese hueco era un círculo con degradado y nada dentro, y a simple vista se
 * leía como una imagen que no cargó. Un monograma dice «no hay retrato de esta
 * persona», que es la verdad.
 *
 * ⚠️ El caso raro está medido, no imaginado: el contenido capturado usa el texto
 * libre y ahí la misma persona aparece como «FO», «Fernanda Ortíz» y «Fernanda
 * Ortiz». Una firma que YA son iniciales —una sola palabra, en mayúsculas, corta—
 * se deja tal cual; partirla daría «F».
 */
function monogramaDe(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 1) {
    const sola = palabras[0];
    if (sola.length <= 3 && sola === sola.toUpperCase()) return sola;
    return sola.slice(0, 1).toUpperCase();
  }
  return palabras
    .slice(0, 2)
    .map((p) => p.slice(0, 1))
    .join('')
    .toUpperCase();
}

/**
 * La firma.
 *
 * 🔴 Hay DOS campos y no dicen lo mismo: `autores` es una relación a la colección
 * `autores` y `autor` es texto libre. El contenido capturado usa solo el texto
 * libre, y ahí ya aparece la misma persona escrita de tres formas —«FO»,
 * «Fernanda Ortíz», «Fernanda Ortiz»—. Se prefiere la relación cuando existe,
 * porque es la única que puede dar una firma estable, una foto y una página de
 * autor.
 *
 * ⚠️ La foto solo llega si quien consulta pidió `depth: 2`: con 1 el autor viene
 * poblado pero su `foto` sigue siendo un id. `obtenerNota` ya lo hace, y es la
 * única que necesita la ficha. Si llegara como id, `urlMedia` devuelve `null` y se
 * pinta el monograma — degrada, no truena.
 *
 * ✨ `cargo` antes que `bio`: este hueco es de UNA línea («Conductora», «Editor
 * digital»), que es exactamente para lo que el CMS tiene `cargo`. La `bio` es un
 * párrafo y aquí se leería apretada.
 */
export function firma(nota: Noticia): Firma | null {
  const rel = (nota.autores ?? []).find((a) => typeof a === 'object' && a !== null);
  if (rel && typeof rel === 'object') {
    const nombre = rel.nombre ?? '';
    return {
      nombre,
      slug: rel.slug ?? null,
      foto: urlMedia(rel.foto, 'thumbnail'),
      monograma: monogramaDe(nombre),
      cargo: (rel.cargo ?? rel.bio ?? '').trim() || null,
    };
  }
  const libre = (nota.autor ?? '').trim();
  return libre
    ? { nombre: libre, slug: null, foto: null, monograma: monogramaDe(libre), cargo: null }
    : null;
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
