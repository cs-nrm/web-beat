/**
 * Resuelve una URL de SoundCloud a la de su reproductor.
 *
 * Existe por dos obstáculos medidos el 2026-09-23, y ninguno se puede saltar:
 *
 *   · Los enlaces que la estación captura son CORTOS —`on.soundcloud.com/XXXX`,
 *     diecinueve de veinte, compartidos desde la app con su `utm_source=whatsapp`—
 *     y el reproductor les contesta 404. Hay que canjearlos por el canónico.
 *   · Y la página de la canción tampoco sirve: `soundcloud.com` responde con
 *     `X-Frame-Options: SAMEORIGIN`, o sea que en un iframe nuestro se vería un
 *     marco en blanco. El que sí se deja incrustar es `w.soundcloud.com/player`.
 *
 * Lo resuelve el oEmbed de SoundCloud, que es su vía documentada, no pide llave y
 * —comprobado— acepta los cortos: devuelve el iframe ya armado con la URL buena.
 *
 * Se llama desde el NAVEGADOR y solo al pulsar play, no al pintar la página. Es
 * deliberado: resolver las veinte en el render metería veinte viajes a un tercero
 * en la portada más visitada del sitio, y bastaría con que SoundCloud tuviera un
 * mal día para que el Inicio tardara. Así el coste lo paga quien pide una canción,
 * una vez, y el resto de la página no se entera. Es el mismo criterio con el que
 * `pista.ts` no baja Plyr hasta que alguien pulsa.
 */
import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Los hosts que se aceptan, y la comprobación importa más de lo que parece.
 *
 * Sin ella este endpoint es una puerta abierta: llega una URL de fuera y el
 * servidor la va a buscar. Eso convierte al sitio en el mensajero de quien la
 * mande —a una IP interna de la VPC, por ejemplo, donde vive el CMS— y el
 * resultado vuelve por la respuesta. Se comprueba antes de tocar la red.
 */
const HOSTS = new Set([
  'soundcloud.com',
  'www.soundcloud.com',
  'm.soundcloud.com',
  'on.soundcloud.com',
]);

/**
 * La resolución no caduca: una canción de SoundCloud no cambia de URL de
 * reproductor. Así que se guarda y ya, sin TTL — lo único que hace falta es un
 * tope para que el Map no crezca sin fin si alguien se pone a pedir URLs
 * inventadas. Al reiniciar el servicio se vuelve a resolver, una vez por canción.
 */
const MAX = 500;
const cache = new Map<string, { src: string; pista: string }>();

const responder = (status: number, cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      // Lo puede guardar el navegador: la respuesta es fija para esa canción.
      'cache-control': status === 200 ? 'private, max-age=86400' : 'no-store',
    },
  });

export const GET: APIRoute = async ({ request, url }) => {
  // El mismo tope de velocidad que el resto de nuestros endpoints.
  const origen = request.headers.get('sec-fetch-site');
  if (origen && origen !== 'same-origin') {
    return responder(403, { error: 'Petición de otro sitio.' });
  }

  const pedida = url.searchParams.get('url');
  if (!pedida) return responder(400, { error: 'Falta la URL.' });

  let objetivo: URL;
  try {
    objetivo = new URL(pedida);
  } catch {
    return responder(400, { error: 'URL inválida.' });
  }
  if (objetivo.protocol !== 'https:' || !HOSTS.has(objetivo.hostname)) {
    return responder(400, { error: 'Esa URL no es de SoundCloud.' });
  }

  const guardada = cache.get(objetivo.href);
  if (guardada) return responder(200, guardada);

  /*
    DOS intentos, y el segundo no es por si acaso: el oEmbed de SoundCloud falla de
    forma intermitente. Medido el 2026-09-23 — la misma URL larga devolvió un cuerpo
    vacío en una llamada y resolvió bien segundos después, y en una tanda de pruebas
    apareció un 504 suelto entre veinte que sí salieron.

    Un fallo aquí no es cosmético: el oyente pulsa play y no pasa nada, que es
    exactamente el control inerte que la casa no admite. Reintentar una vez con
    medio segundo de espera cuesta poco y se come la mayoría de esos huecos; si
    falla dos veces, es que pasa algo de verdad y se dice.
  */
  async function pedirOembed(): Promise<{ html?: unknown } | null> {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), 6000);
    try {
      const r = await fetch(
        `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(objetivo.href)}`,
        { signal: control.signal, headers: { accept: 'application/json' } },
      );
      if (!r.ok) return null;
      return (await r.json()) as { html?: unknown };
    } catch {
      return null;
    } finally {
      clearTimeout(temporizador);
    }
  }

  let datos = await pedirOembed();
  if (!datos) {
    await new Promise((sigue) => setTimeout(sigue, 500));
    datos = await pedirOembed();
  }
  if (!datos) return responder(502, { error: 'SoundCloud no responde.' });

  /*
    Del oEmbed solo se toma el `src` del iframe, nunca su HTML.
    Inyectar HTML de un tercero en nuestra página es exactamente lo que
    `Embed.astro` y `lib/audio.ts` evitan guardando la URL y no el marcado: aquí
    se extrae la dirección, se vuelve a comprobar el host y el iframe lo construye
    el front con sus propios atributos.
  */
  const html = typeof datos?.html === 'string' ? datos.html : '';
  const encontrada = /src="([^"]+)"/.exec(html)?.[1];
  if (!encontrada) return responder(502, { error: 'SoundCloud devolvió algo raro.' });

  let src: URL;
  try {
    src = new URL(encontrada.replace(/&amp;/g, '&'));
  } catch {
    return responder(502, { error: 'SoundCloud devolvió algo raro.' });
  }
  if (src.protocol !== 'https:' || src.hostname !== 'w.soundcloud.com') {
    return responder(502, { error: 'SoundCloud devolvió algo raro.' });
  }

  /*
    Los parámetros los ponemos NOSOTROS y no se hereda lo que venga del oEmbed:
    su iframe viene con `visual=true`, que es la carátula gigante de 400px de
    alto, y el visor de la barra no tiene ese sitio. `auto_play` lo pone el
    cliente al montar, no aquí.
  */
  const cancion = src.searchParams.get('url');
  if (!cancion) return responder(502, { error: 'SoundCloud devolvió algo raro.' });
  const limpia = new URL('https://w.soundcloud.com/player/');
  limpia.searchParams.set('url', cancion);
  limpia.searchParams.set('visual', 'false');
  limpia.searchParams.set('hide_related', 'true');
  limpia.searchParams.set('show_comments', 'false');
  limpia.searchParams.set('show_teaser', 'false');

  /*
    Van las DOS: `src` para montar el iframe la primera vez, y `pista` para las
    siguientes. El widget tiene un `load(url)` que cambia de canción sin recrear
    nada, y espera la URL de la PISTA —`api.soundcloud.com/tracks/N`—, no la del
    reproductor. Recrear el iframe en cada canción obligaría a volver a negociar
    con SoundCloud, que es justo lo que el visor de YouTube ya evita.
  */
  const resuelta = { src: limpia.href, pista: cancion };
  if (cache.size >= MAX) cache.clear();
  cache.set(objetivo.href, resuelta);
  return responder(200, resuelta);
};
