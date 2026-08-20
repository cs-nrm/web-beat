/**
 * Middleware del sitio: política de caché de borde + la cabecera de indexación.
 *
 * (Las redirecciones de las URLs viejas de WordPress NO viven aquí todavía: al ser
 * un relanzamiento sin migración de contenido no hay destino 1:1, así que el
 * tratamiento de esas URLs es una decisión aparte — ver C4 del plan.)
 */
import { defineMiddleware } from 'astro:middleware';
import { NOINDEX_SITIO, noIndexarHost } from '@/config/site';

/**
 * 🔴 Rutas que NUNCA se cachean, ni en el borde ni en el navegador.
 *
 * - `/api/`: los proxies server-side. Cachearlos serviría datos viejos a quien
 *   acaba de pedirlos.
 * - `/mi/`: el área de Comunidad. Es contenido POR OYENTE, y cachearlo en el borde
 *   significaría servirle a alguien las playlists de otro. Esto es lo que hace que
 *   el patrón de caché de `web-enfoque` no se pueda copiar tal cual: ese sitio es
 *   100% anónimo y de solo lectura.
 * - `/buscar`: la respuesta depende de la consulta del lector.
 */
const SIN_CACHE = [/^\/api\//, /^\/mi(\/|$)/, /^\/buscar/];

/**
 * Política de caché del HTML.
 *
 * `max-age=0` + `s-maxage`: el NAVEGADOR revalida siempre (nadie ve un Inicio
 * viejo en su pestaña) pero el BORDE sí lo guarda, que es donde importa para
 * aguantar tráfico.
 *
 * `stale-while-revalidate` es la pieza que protege el origen en el pico: cuando el
 * TTL vence, el borde sirve la copia vieja de inmediato y refresca por detrás, en
 * vez de mandar a todo el mundo al SSR a la vez.
 *
 * ⚠️ Esto por sí solo NO hace que Cloudflare cachee el HTML: por defecto no cachea
 * documentos aunque lo pidan las cabeceras. Hace falta la Cache Rule (Cache
 * Everything) del panel. Y esa regla NO se enciende mientras la purga al publicar
 * no esté cableada — el CMS todavía no tiene webhook de revalidación.
 */
const CACHE_HTML = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';
const CACHE_404 = 'public, max-age=0, s-maxage=60, stale-while-revalidate=600';

export const onRequest = defineMiddleware(async (context, next) => {
  const metodo = context.request.method;
  const ruta = context.url.pathname;
  const cacheable =
    (metodo === 'GET' || metodo === 'HEAD') && !SIN_CACHE.some((r) => r.test(ruta));

  const respuesta = await next();

  // Solo HTML, y sin pisar a quien ya haya decidido su propia política.
  if (cacheable && !respuesta.headers.has('Cache-Control')) {
    const tipo = respuesta.headers.get('Content-Type') ?? '';
    if (tipo.includes('text/html')) {
      if (respuesta.status === 200) respuesta.headers.set('Cache-Control', CACHE_HTML);
      else if (respuesta.status === 404) respuesta.headers.set('Cache-Control', CACHE_404);
    }
  }

  // Cualquier respuesta de un área con sesión se marca privada explícitamente, no
  // solo "sin caché": el borde no debe guardarla ni un segundo.
  if (!cacheable && /^\/mi(\/|$)/.test(ruta)) {
    respuesta.headers.set('Cache-Control', 'private, no-store');
  }

  /**
   * 🔴 Despliegue que no es el dominio canónico: se marca `noindex` por cabecera.
   *
   * La cabecera es la que de verdad protege: aplica a TODO lo que sale (páginas,
   * JSON de los proxies, RSS), no solo al HTML, y Google la respeta incluso donde
   * no hay dónde poner un `<meta>`.
   *
   * Se evalúan las DOS reglas y basta con que una cierre:
   * - `NOINDEX_SITIO`: el dominio con el que se compiló.
   * - `noIndexarHost`: el `Host` de ESTA petición. Cubre el caso que muerde — la
   *   misma imagen de producción servida por otro nombre sería un duplicado
   *   indexable del sitio real.
   *
   * ⚠️ Depende de `security.allowedDomains` en `astro.config.mjs`. Sin esa lista
   * `context.url.hostname` es SIEMPRE `localhost` y esto dejaría el sitio real
   * fuera de Google.
   */
  if (NOINDEX_SITIO || noIndexarHost(context.url.hostname)) {
    respuesta.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return respuesta;
});
