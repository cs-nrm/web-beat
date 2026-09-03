/**
 * `robots.txt` — la TERCERA capa de la política de indexación.
 *
 * 🔴 No existía, y era un agujero real. El plan pide tres capas y solo había dos:
 * el `X-Robots-Tag` del middleware y el `<meta robots>` del layout. Faltaba
 * justamente la que un rastreador lee ANTES de pedir nada — las otras dos solo
 * actúan sobre una respuesta que ya se sirvió.
 *
 * ⚠️ Y es una RUTA, no un archivo en `public/`. Tiene que serlo: la decisión
 * depende del `Host` de cada petición, porque la beta y el sitio real son la MISMA
 * imagen de Docker. Un archivo estático diría lo mismo en los dos, y entonces o
 * la beta invita a rastrear, o el sitio real se cierra a sí mismo. Es el mismo
 * razonamiento que ya está escrito en `noIndexarHost`.
 */
import type { APIRoute } from 'astro';
import { NOINDEX_SITIO, noIndexarHost } from '@/config/site';
import { SITEMAPS_ANUNCIADOS } from '@/lib/feeds';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  /*
    🔴 Las DOS reglas, como el middleware y el `<meta robots>`: la del dominio con
    el que se compiló y la del `Host` de esta petición. Basta con que una cierre.
    Con una sola, este archivo podía invitar a rastrear un despliegue que las
    otras dos capas estaban marcando `noindex`.
  */
  const cerrado = NOINDEX_SITIO || noIndexarHost(url.hostname);

  const cuerpo = cerrado
    ? [
        '# Despliegue que NO es el dominio canónico (beta, staging, una IP).',
        '# Se cierra entero para que no compita con el sitio real en el índice.',
        'User-agent: *',
        'Disallow: /',
        '',
      ].join('\n')
    : [
        'User-agent: *',
        'Allow: /',
        '',
        '# El área de oyente es privada y los proxies no son contenido.',
        'Disallow: /api/',
        'Disallow: /mi/',
        '',
        ...SITEMAPS_ANUNCIADOS.map((s) => `Sitemap: ${s}`),
        '',
      ].join('\n');

  return new Response(cuerpo, {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      /*
        Una hora en el borde. Es de lo primero que pide un rastreador y no cambia
        casi nunca, pero tampoco conviene un TTL largo: el día del corte de
        dominio este archivo pasa de «Disallow: /» a abierto, y una caché de un
        día mantendría el sitio real cerrado durante horas después de lanzarlo.
      */
      'cache-control': 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
