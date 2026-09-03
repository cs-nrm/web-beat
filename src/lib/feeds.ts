/**
 * Proxy de los feeds que GENERA el CMS y SIRVE este dominio.
 *
 * 🔴 El reparto no es arbitrario y conviene entenderlo antes de tocarlo: el CMS
 * los **genera** (sabe qué está publicado y cuándo cambió) y el front los **sirve
 * bajo su propio dominio**. No contradice la decisión de «los sitemaps los sirve
 * el CMS» ni reabre `@astrojs/sitemap`: aquí no se genera nada, se reenvía.
 *
 * ⚠️ Y no es una preferencia estética. El índice del CMS lista hijos con el
 * dominio de la estación (`https://beatdigital.mx/sitemap.xml?...`), porque un
 * `<sitemapindex>` cuyos hijos viven en OTRO host **Google lo descarta**, salvo
 * cross-submission verificada. O sea que los hijos tienen que responder aquí. Sin
 * estas rutas, el índice apunta a dos 404 y el sitio se queda sin vía de
 * descubrimiento el día del corte de dominio. Medido: antes de esto,
 * `/sitemap.xml` respondía 404.
 *
 * Contrato acordado con `cms-estaciones` (2026-09-03).
 */
import {
  CMS_URL,
  ESTACION_CODIGO,
  HOST_CANONICO,
  NOINDEX_SITIO,
  noIndexarHost,
} from '@/config/site';

/**
 * 🔴 Conjunto CERRADO. Dos razones, y la segunda pesa más:
 *
 *   1. Un `seccion` arbitrario se reenviaría al CMS tal cual.
 *   2. La clave de caché del borde es la URL completa, así que
 *      `?seccion=<lo que sea>` genera una entrada por valor inventado. Es la regla
 *      de oro del cliente del CMS aplicada al borde — el mismo error que en
 *      `web-enfoque` produjo 836 de 1,103 errores por hora.
 */
const SECCIONES_FEED = new Set(['principal', 'noticias', 'podcasts']);

/** Tope de páginas. Sin él, `?pagina=999999999` es otra clave de caché regalada. */
const PAGINA_MAX = 10_000;

/**
 * Reenvía un feed del CMS conservando los parámetros.
 *
 * 🔴 Los parámetros se reenvían SIEMPRE que sean válidos. Si se pierden, el CMS
 * responde el ÍNDICE en vez del hijo, y como el índice apunta aquí, se hace un
 * bucle: índice → hijo → índice. Es el fallo que el contrato marca en rojo.
 */
export async function proxyFeed(
  nombre: 'sitemap.xml' | 'news-sitemap.xml',
  url: URL,
): Promise<Response> {
  /*
    🔴 En un despliegue que no es el dominio canónico, esto NO existe.

    El `X-Robots-Tag: noindex` del middleware ya cubre la indexación, pero un
    sitemap es una INVITACIÓN activa a rastrear: la beta estaría publicando un
    mapa de URLs de producción bajo otro nombre. Un 404 es la respuesta honesta —
    en este host no hay sitemap. Falla del lado seguro, como el resto de la
    política de indexación.

    🔴 Se comprueban LAS DOS reglas, igual que el middleware y el `<meta robots>`,
    y basta con que una cierre. Al principio esto solo miraba el host, y lo cazó
    una prueba: con `Host: beatdigital.mx` el sitemap se servía **mientras el
    middleware ponía `X-Robots-Tag: noindex` en esa misma respuesta**, porque
    `NOINDEX_SITIO` mira el dominio con el que se COMPILÓ. Dos capas de la misma
    política diciendo cosas contrarias sobre la misma petición.
  */
  if (NOINDEX_SITIO || noIndexarHost(url.hostname)) {
    return new Response('No hay sitemap en este despliegue.', {
      status: 404,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  if (!CMS_URL) {
    return new Response('El CMS no está configurado.', {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
    });
  }

  const destino = new URL(`${CMS_URL}/feeds/${ESTACION_CODIGO}/${nombre}`);

  const seccion = url.searchParams.get('seccion');
  const paginaCruda = url.searchParams.get('pagina');

  /*
    Sin `seccion` válida se pide el ÍNDICE. Es lo correcto para `/sitemap.xml` a
    secas, y también para una sección inventada: mejor devolver el mapa que un
    error, porque quien llega ahí es un rastreador siguiendo un enlace viejo.
  */
  if (seccion && SECCIONES_FEED.has(seccion)) {
    destino.searchParams.set('seccion', seccion);

    /*
      🔴 Una `pagina` presente pero inválida es un 404, NO se ignora.

      Ignorarla era el primer intento y estaba mal: el CMS, sin `pagina`, sirve la
      primera. O sea que `?pagina=999999999` respondía 200 con el contenido de la
      página 1 — la misma lista bajo infinitas URLs distintas, que es contenido
      duplicado servido por nosotros mismos y una entrada de caché por número
      inventado. Que una URL que no existe conteste 404 es lo honesto.
    */
    if (paginaCruda !== null) {
      const pagina = Number(paginaCruda);
      if (!Number.isInteger(pagina) || pagina < 1 || pagina > PAGINA_MAX) {
        return new Response('Esa página del sitemap no existe.', {
          status: 404,
          headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control': 'public, max-age=0, s-maxage=600',
          },
        });
      }
      destino.searchParams.set('pagina', String(pagina));
    }
  }

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), 8000);
  try {
    const r = await fetch(destino, {
      headers: { Accept: 'application/xml' },
      signal: control.signal,
    });
    if (!r.ok) throw new Error(`El CMS respondió ${r.status}`);
    const xml = await r.text();

    /*
      🔴 503, nunca un sitemap vacío.

      Un `<urlset>` sin URLs es una afirmación —«este sitio no tiene nada»— y
      además CACHEABLE. Google lo tomaría por bueno y podría desindexar. Un 503 le
      dice «vuelve luego» y no toca el índice. Es la misma lógica por la que la
      nota responde 503 y no 404 cuando el CMS no contesta.
    */
    if (!xml.trim()) throw new Error('El CMS devolvió un feed vacío');

    return new Response(xml, {
      status: 200,
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        // Diez minutos en el borde: un sitemap no necesita ser al segundo, y así
        // una recogida de Google no se traduce en una consulta al CMS por hijo.
        'cache-control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=3600',
      },
    });
  } catch {
    return new Response('El feed no está disponible. Vuelve a intentarlo.', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'retry-after': '120',
      },
    });
  } finally {
    clearTimeout(temporizador);
  }
}

/** Las líneas `Sitemap:` del `robots.txt`, en absoluto y sobre el host canónico. */
export const SITEMAPS_ANUNCIADOS = [
  `https://${HOST_CANONICO}/sitemap.xml`,
  `https://${HOST_CANONICO}/news-sitemap.xml`,
];
