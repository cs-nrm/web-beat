/**
 * Middleware del sitio: redirecciones del v1 + política de caché de borde + la
 * cabecera de indexación.
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

/**
 * 🔴 LAS URLS DEL V1.
 *
 * El v2 no es una migración: es otro sitio con otra estructura. De las **22
 * secciones de primer nivel** del v1 —sacadas de su propio marcado, no de una
 * lista de memoria— solo tres coinciden de nombre con el v2. Sin esta tabla, el
 * día del corte de dominio cada enlace compartido, cada marcador y todo lo que
 * Google tiene indexado cae en 404.
 *
 * Destinos aprobados por Carlos (2026-09-09): lo que tiene equivalente va a su
 * equivalente, y lo que ya no existe va al Inicio.
 *
 * ⚠️ Son **301**, o sea permanentes y cacheadas con fuerza por el navegador. Un
 * destino equivocado aquí se queda pegado en la máquina de quien lo visite, así
 * que la tabla se corrige ANTES del corte, no después.
 *
 * ⚠️ El orden importa: se recorre de arriba abajo y gana la primera que coincide.
 * Las tres equivalencias exactas van primero para que no se las coma una regla
 * más ancha.
 *
 * ⚠️ Y lo que NO entra aquí: `/_astro/`, `/fonts/` y `/favicon/` son rutas de
 * activos del v1. Redirigirlas al Inicio devolvería HTML donde el navegador espera
 * un CSS o una fuente. No están en la tabla a propósito.
 */
const DEL_V1: Array<[RegExp, string]> = [
  // ── Equivalencias exactas: el mismo contenido con otro slug ──
  [/^\/avisodeprivacidad(\/|$)/, '/aviso-de-privacidad'],
  [/^\/terminosycondiciones(\/|$)/, '/terminos-y-condiciones'],

  // ── Secciones que el v2 rehizo con otro nombre ──
  /*
    `/news/` era la sección de notas del v1 y su equivalente es Beat Scanner: el
    día a día. Los artículos de dentro (`/news/<slug>/`) van AL ÍNDICE y no a una
    nota: el v2 arrancó con contenido nuevo, así que no hay destino 1:1 —el CMS
    tiene 9 notas frente al archivo del v1— y mandar a alguien a una nota que no
    es la que buscaba es peor que dejarlo en la sección.
  */
  [/^\/news(\/|$)/, '/beat-scanner'],
  [/^\/playlist(\/|$)/, '/bonus-beat'],

  // ── Programas del v1: su sitio hoy es la programación ──
  [/^\/(que-plan|rebels|locutores)(\/|$)/, '/programacion'],

  /*
    ── Lo que ya no existe ──

    Secciones editoriales y de contenido del v1 que el v2 no rehízo. Van al Inicio
    porque es lo único honesto: no hay sección equivalente y un 404 en día de
    lanzamiento es peor que la portada.

    ⚠️ `beatzilla`, `podcast` y `promociones` tenían páginas DENTRO, así que la
    regla cubre también sus rutas profundas — de ahí el `(\/|$)` y no un igual.
  */
  [
    /^\/(beatzilla|podcast|promociones|beat-ten|beat-trends|beat-recordings|lanzamientos|purple-noise|nerdosis)(\/|$)/,
    '/',
  ],
];

/**
 * El destino del v1 para esta ruta, o `null` si no es una URL del v1.
 *
 * ⚠️ Se comprueba que el destino NO sea la propia ruta antes de devolverlo: una
 * regla que apuntara a algo que ella misma captura daría un bucle de redirección
 * infinito, y eso en el navegador es `ERR_TOO_MANY_REDIRECTS` — el sitio caído
 * para esa URL. Hoy ninguna lo hace, pero la guarda cuesta una línea y el fallo
 * cuesta el lanzamiento.
 */
function destinoV1(ruta: string): string | null {
  for (const [patron, destino] of DEL_V1) {
    if (patron.test(ruta)) return destino === ruta ? null : destino;
  }
  return null;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const metodo = context.request.method;
  const ruta = context.url.pathname;

  /*
    🔴 Las redirecciones del v1 van PRIMERO y devuelven sin llamar a `next()`.

    Dos razones: no tiene sentido renderizar una página para tirarla, y sobre todo
    el 404 del v2 es una página completa —con su consulta al CMS— así que dejar
    pasar estas rutas costaría un render y una petición al CMS por cada enlace
    viejo que llegue. El día del corte eso es tráfico de verdad.

    ⚠️ La query se conserva. Una URL del v1 con `?utm_source=…` viene de una
    campaña, y perder los parámetros al redirigir es perder la atribución de esa
    campaña justo el día que más importa.
  */
  const destino = destinoV1(ruta);
  if (destino) {
    return context.redirect(destino + context.url.search, 301);
  }

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
