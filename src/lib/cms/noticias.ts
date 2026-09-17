/**
 * Beat Scanner — las notas. Cubre las pantallas 14b/14e (índice) y 14c/14f (nota).
 *
 * «Beat Scanner» SUSTITUYE a lo que en el sitio viejo era «news»: es la sección
 * editorial del relanzamiento. La colección sigue siendo `noticias`; el nombre de
 * sección vive en la ruta y en la nav, no en el CMS.
 */
import {
  cmsContarEstacion,
  cmsFetchEstacion,
  SIN_PAGINACION,
  type ParamsCms,
  type RespuestaLista,
} from './client';
import { totalPaginas } from '@/lib/paginacion';
import { obtenerCategoria } from './categorias';
import type { Noticia } from '@/types/payload';

/**
 * Campos que el índice necesita, y solo esos. `depth: 1` puebla `imagen`,
 * `categorias` y `autores`; con `depth: 0` vendrían como ids y habría que pedirlos
 * aparte.
 */
const BASE_INDICE: ParamsCms = { depth: 1, ...SIN_PAGINACION };

/**
 * 🔴 Una `pieza` no se distribuye como noticia.
 *
 * `noticias.distribucion` separa QUÉ es una pieza de DÓNDE se coloca: una cápsula
 * del Fenómeno Residente conserva su URL y su entrada en el sitemap —se comparte
 * suelta, tiene que poder encontrarse— pero no aparece en los listados
 * editoriales, porque su lugar es dentro de su especial.
 *
 * ⚠️ El `or` con `exists: false` NO es decorativo: en Postgres un `!= 'pieza'`
 * **no devuelve las filas con NULL**, así que sin él se perderían todas las notas
 * que nunca tocaron el campo. Está documentado igual en el CMS.
 */
const SOLO_NOTICIAS: ParamsCms = {
  'where[or][0][distribucion][not_equals]': 'pieza',
  'where[or][1][distribucion][exists]': false,
};

/** Orden público: primero lo fijado, luego por fecha. Igual que el CMS. */
const ORDEN = '-fijada,-fecha';

/** El filtro de una vista de índice: una categoría o una etiqueta. */
export interface FiltroScanner {
  tipo: 'categoria' | 'etiqueta';
  id: number;
  nombre: string;
  slug: string;
}

/**
 * Traduce el filtro (y su exclusión opcional) a parámetros del CMS.
 *
 * ✨ Se filtra por **id** y no por slug, y aquí sí es lo correcto: el id sale de
 * una consulta ya cacheada (`obtenerCategoria`), y `where[categorias][in]` con un
 * id acierta la misma entrada de caché para todas las notas de esa categoría. El
 * slug obligaría a `where[categorias.slug]`, que en Payload es un join y cuesta.
 *
 * ⚠️ Lo que NO se hace es meter algo que varíe por DOCUMENTO en el `where` — esa
 * es la regla de oro del cliente, y es distinta: aquí varía por vista, y hay tantas
 * vistas como categorías, no como notas. `excluir` es una categoría, no una nota,
 * así que sigue siendo una sola entrada de caché por vista.
 */
function acotar(filtro?: FiltroScanner | null, excluir?: FiltroScanner | null): ParamsCms {
  if (!filtro) return {};
  const base =
    filtro.tipo === 'categoria'
      ? { 'where[categorias][in]': String(filtro.id) }
      : { 'where[etiquetas][in]': String(filtro.id) };
  if (excluir?.tipo === 'categoria') {
    return { ...base, 'where[categorias][not_in]': String(excluir.id) };
  }
  return base;
}

/**
 * El filtro de una sección editorial, resuelto desde el SLUG de su categoría.
 *
 * 🔴 Existe para que las cuatro superficies que necesitan una sección editorial
 * —`/scanner`, `/editorial`, el mosaico del Inicio y su pila— no repitan cada una
 * el mapeo «categoría del CMS → `FiltroScanner`». Cuando se repite en cuatro
 * sitios, el quinto se escribe distinto.
 *
 * Devuelve `null` si la categoría no existe en el CMS, y quien llama TIENE que
 * distinguirlo de «sin filtro»: `obtenerScanner(n, null)` trae TODAS las notas, así
 * que confundir los dos casos haría que una sección con la categoría mal escrita
 * pintara el sitio entero en vez de quedarse vacía. Es la clase de fallo que nadie
 * reporta porque la página se ve llena.
 *
 * ✨ El id sale de una consulta cacheada por slug, que es justo lo que
 * `obtenerScanner` necesita para acertar su entrada de caché — ver `acotar()`.
 */
export async function filtroDeCategoria(slug: string): Promise<FiltroScanner | null> {
  const cat = await obtenerCategoria(slug);
  if (!cat) return null;
  return {
    tipo: 'categoria',
    id: cat.id,
    nombre: cat.nombre ?? '',
    slug: cat.slug ?? slug,
  };
}

/**
 * Portada de una sección editorial: la nota principal, la rejilla y su paginación.
 *
 * Se pide UNA sola consulta y se reparte en memoria. Es deliberado: si la
 * destacada y la rejilla fueran dos consultas, tendrían dos relojes de caché
 * independientes y podrían quedar desfasadas —la destacada vieja con la rejilla
 * nueva—. Le pasó a `web-enfoque` y se arregló exactamente así.
 *
 * 🔴 Pagina desde el 2026-09-17, y la razón es un número: Beat Scanner tenía **53
 * notas y 11 alcanzables**. Ver `src/lib/paginacion.ts` para el contrato de la URL.
 *
 * 🔴 El tamaño de página es `cuantas + 1` y es CONSTANTE entre páginas. Tiene que
 * serlo: el desplazamiento lo calcula Payload como `(page - 1) * limit`, así que un
 * `limit` distinto en la página 2 —por ejemplo, 11 en la primera y 10 en las demás
 * por no tener destacada— se saltaría una nota en cada salto. La destacada sale de
 * la tanda, no de una consulta aparte.
 *
 * ⚠️ `SIN_PAGINACION` se queda PUESTO aunque esto pagine, y no es una contradicción
 * con lo que dice `client.ts`. Comprobado contra el CMS el 2026-09-17: con
 * `pagination=false` Payload respeta `page` y devuelve la tanda correcta; lo único
 * que deja de servir es su `totalDocs`. El total lo trae `cmsContarEstacion` en una
 * consulta aparte que NO lleva `page`, así que las cinco páginas de una sección
 * comparten un solo `COUNT` en vez de pagar uno cada una.
 */
export async function obtenerScanner(
  cuantas = 10,
  filtro?: FiltroScanner | null,
  excluir?: FiltroScanner | null,
  pagina = 1,
): Promise<{
  /** La nota principal. **Solo en la página 1**: en las demás no hay portada que destacar. */
  destacada: Noticia | null;
  rejilla: Noticia[];
  /** Cuántas páginas hay, ya acotado. 1 cuando no se pudo contar: la tira no se pinta. */
  paginas: number;
}> {
  const porPagina = cuantas + 1;
  const where = { ...SOLO_NOTICIAS, ...acotar(filtro, excluir) };

  /*
    Las dos en paralelo: el conteo no es la ruta crítica y ya degrada solo. Si
    tarda más que su timeout corto devuelve `null` y la vista se queda sin tira de
    números —que es una vista con menos navegación, no una vista rota—.
  */
  const [lista, total] = await Promise.all([
    cmsFetchEstacion<RespuestaLista<Noticia>>('noticias', {
      ...BASE_INDICE,
      ...where,
      sort: ORDEN,
      limit: porPagina,
      page: pagina,
    }).catch(() => null),
    cmsContarEstacion('noticias', where),
  ]);

  // Degrada: media portada es mejor que un 500.
  if (!lista) return { destacada: null, rejilla: [], paginas: 1 };

  const paginas = totalPaginas(total ?? 0, porPagina);

  /*
    La destacada es de la PÁGINA 1. En la 2 no hay ninguna nota que sea «la
    principal» —son las siguientes once, todas del mismo peso—, y darle a la
    duodécima nota más vieja el tratamiento de portada diría algo que no es cierto.
  */
  if (pagina > 1) return { destacada: null, rejilla: lista.docs, paginas };

  const [destacada, ...rejilla] = lista.docs;
  return { destacada: destacada ?? null, rejilla, paginas };
}

/** Una nota por slug. A diferencia del resto, este error SÍ se propaga: la página
 *  necesita saberlo para hacer `Astro.rewrite('/404')`. */
export async function obtenerNota(slug: string): Promise<Noticia | null> {
  const r = await cmsFetchEstacion<RespuestaLista<Noticia>>('noticias', {
    'where[slug][equals]': slug,
    // `depth: 2` para que la FOTO del autor venga poblada: con 1 llega el autor
    // pero su `foto` sigue siendo un id.
    depth: 2,
    limit: 1,
    draft: false,
  });
  return r.docs[0] ?? null;
}

/**
 * Las tres relacionadas del pie de la nota (14c: "tres notas relacionadas").
 *
 * 🔴 La nota actual se excluye EN MEMORIA, no en el `where`.
 *
 * Es la regla de oro de la caché de este cliente, y viene de un incidente medido:
 * en `web-enfoque` esta misma función usaba `where[id][not_equals]=<id>`, así que
 * cada nota generaba su propia entrada de caché y la consulta más llamada del
 * sitio nunca acertaba — **836 de los 1,103 errores por hora salían de ahí**.
 * Filtrando por categoría a secas, todas las notas de una sección comparten una
 * sola entrada.
 */
export async function obtenerRelacionadas(nota: Noticia, cuantas = 3): Promise<Noticia[]> {
  const cats = (nota.categorias ?? [])
    .map((c) => (typeof c === 'number' ? c : c?.id))
    .filter((id): id is number => typeof id === 'number');
  if (!cats.length) return [];

  try {
    const r = await cmsFetchEstacion<RespuestaLista<Noticia>>('noticias', {
      ...BASE_INDICE,
      ...SOLO_NOTICIAS,
      'where[categorias][in]': cats.join(','),
      sort: '-fecha',
      // Se piden algunas más de las necesarias para poder descartar la actual sin
      // quedarse corto.
      limit: cuantas + 3,
    });
    return r.docs.filter((n) => n.id !== nota.id).slice(0, cuantas);
  } catch {
    return [];
  }
}

/*
  🔴 Aquí vivía `minutosDeLectura()`, y se borró el 2026-09-07 con su último
  llamador.

  Pintaba el «3 MIN» de cada tarjeta estimando 200 palabras por minuto sobre el
  árbol Lexical. El problema no era el cálculo, era el dato: con las notas que
  publica la estación, TODAS salían en «1 MIN», así que cuatro tarjetas seguidas
  decían lo mismo y el hueco no informaba nada. Ahora esas cinco superficies
  —tarjetas, portada del mosaico, destacada de la sección, cartas de la pila y la
  firma de la nota— llevan la FECHA, que sí distingue.

  Se anota en vez de borrarse en silencio para que nadie la reinvente: si vuelve a
  hacer falta, está en `git log` de este archivo.
*/
