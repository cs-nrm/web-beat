/**
 * El clic de un banner vendido: se cuenta aquí y se redirige al anunciante.
 *
 * 🔴 Existe porque el conteo es de SERVIDOR a servidor. `PUBLICIDAD_TOKEN` no
 * puede salir de este proceso, así que el navegador no puede avisar al CMS por su
 * cuenta — y es la línea roja de la casa: el navegador nunca habla con el CMS.
 * Por eso el `href` del banner apunta aquí y no al anunciante.
 *
 * 🔴 **El destino se resuelve leyendo el documento del CMS, JAMÁS de un parámetro
 * de la petición.** Un `?destino=` reenviado a ciegas convierte esta ruta en un
 * redirector abierto con `beatdigital.mx` de fachada: cualquiera podría mandar
 * correos con enlaces a nuestro dominio que acaban en su página de phishing. Es de
 * las cosas que no se notan hasta que aparecen en un informe seis meses después.
 * Aquí lo único que llega de fuera es un ENTERO, y de él solo sale un documento.
 */
import type { APIRoute } from 'astro';
import { obtenerBannerPorId, registrarEvento } from '@/lib/cms/publicidad';
import { idEstacion } from '@/lib/cms/client';
import { NOINDEX_SITIO, noIndexarHost } from '@/config/site';

export const prerender = false;

/** Nunca se guarda: un redirect cacheado es un clic que deja de contarse. */
const SIN_CACHE = {
  'cache-control': 'no-store',
  'content-type': 'text/plain; charset=utf-8',
} as const;

export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return new Response('Anuncio no válido.', { status: 400, headers: SIN_CACHE });
  }

  const banner = await obtenerBannerPorId(id);
  if (!banner) {
    return new Response('Ese anuncio no existe.', { status: 404, headers: SIN_CACHE });
  }

  /*
    🔴 Que el banner sea DE ESTA ESTACIÓN. El id es único en todo el CMS, que sirve
    a cuatro marcas: sin esta comprobación, `/api/anuncio/<id de Oye>` redirigiría
    desde el dominio de Beat, y el clic se le sumaría a una campaña de otra
    estación. Es el mismo cuidado que el filtro por estación del transporte, que
    aquí no aplica porque la lectura es por id.
  */
  const estacion = typeof banner.estacion === 'object' ? banner.estacion?.id : banner.estacion;
  if (estacion !== undefined && estacion !== (await idEstacion().catch(() => -1))) {
    return new Response('Ese anuncio no es de esta estación.', { status: 404, headers: SIN_CACHE });
  }

  /*
    Se cuenta sin hacer esperar al lector, y es una decisión de producto: entre
    perder un clic si el proceso se reinicia justo en este instante, y meterle al
    lector la latencia de NUESTRA contabilidad antes de llevarlo donde pulsó, lo
    segundo es peor. El proceso es de larga vida, así que la promesa termina
    aunque la respuesta ya haya salido.

    El CMS contesta 409 si la campaña está pausada o vencida; eso NO se reintenta y
    tampoco impide la redirección: quien pulsó puede estar mirando una página
    servida de caché, y no tiene la culpa de nuestro TTL.
  */
  void registrarEvento(id, 'clic').catch(() => {});

  /*
    302 y no 301: un 301 lo cachea el navegador para siempre y los clics
    siguientes ni pasarían por aquí — dejaríamos de contarlos sin enterarnos. Y
    tampoco es una redirección permanente: mañana esa campaña no existe.
  */
  return new Response(null, {
    status: 302,
    headers: {
      location: banner.enlace,
      'cache-control': 'no-store',
      // El destino es de un tercero: que no herede a dónde íbamos.
      'referrer-policy': 'no-referrer',
    },
  });
};

/**
 * La IMPRESIÓN de un takeover, que es la única que no se puede contar en el render.
 *
 * 🔴 Por qué existe, y por qué solo para el takeover. Un banner de portada se cuenta
 * en el render del servidor (`Anuncio.astro`) porque render y vista son casi lo
 * mismo: si la página se pintó, la franja estaba ahí. El takeover NO: sale una vez
 * por sesión, así que un lector que abre el Inicio cinco veces genera cinco renders
 * y **una** vista. Contarlo en el render sería multiplicar por cinco lo que se le
 * factura a un anunciante, y la regla de la casa es que el error caiga siempre del
 * lado de no cobrarle de más a nadie (ver `Anuncio.astro`).
 *
 * 🔴 La línea roja se respeta: el navegador avisa a NUESTRO servidor, y es este
 * proceso el que habla con el CMS con `PUBLICIDAD_TOKEN`. El token no sale de aquí.
 * Lo mismo que hace el GET de arriba para el clic.
 *
 * ⚠️ Es un aviso `sendBeacon`, así que llega sin cuerpo y sin cabeceras propias: lo
 * único que viaja es el id en la ruta. Por eso la respuesta es 204 siempre que la
 * petición esté bien formada — al navegador no le sirve saber más, y describirle al
 * de fuera qué campañas existen sería regalar un mapa.
 */
export const POST: APIRoute = async ({ params, request, url }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return new Response(null, { status: 400, headers: { 'cache-control': 'no-store' } });
  }

  /*
    Tope de velocidad, no cerradura. `Sec-Fetch-Site` lo pone el NAVEGADOR y no se
    puede falsificar desde una página, así que corta el caso realista —una pestaña
    ajena martilleando el contador— sin estorbar a nadie: los navegadores que no lo
    mandan (los viejos, y algún proxy) pasan igual. Contra un `curl` no sirve, y
    tampoco pretende: eso es exactamente el mismo hueco que ya tiene el GET del clic,
    y taparlo de verdad es firmar el id, no adivinar por cabeceras.
  */
  const origen = request.headers.get('sec-fetch-site');
  if (origen && origen !== 'same-origin') {
    return new Response(null, { status: 403, headers: { 'cache-control': 'no-store' } });
  }

  /*
    🔴 En una beta NO se cuenta, igual que en el render de `Anuncio.astro`: las
    impresiones de un despliegue de prueba se le facturarían a un anunciante real.
  */
  if (NOINDEX_SITIO || noIndexarHost(url.hostname)) {
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  }

  const banner = await obtenerBannerPorId(id);

  /*
    🔴 SOLO takeover, y la comprobación no es una formalidad: sin ella, un POST a un
    banner de portada le sumaría una impresión que su propio render YA contó. El
    contador quedaría al doble y nadie lo notaría hasta el reporte de fin de mes.

    🔴 Y solo con creatividad PROPIA. En un takeover de Ad Manager el conteo que se
    le factura al anunciante lo lleva Google; llamar al CMS ahí solo mete ruido en un
    número que a propósito se queda en cero.
  */
  if (!banner || banner.tipo !== 'takeover' || banner.fuente === 'admanager') {
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  }

  // El id es único en todo el CMS, que sirve a cuatro marcas: la misma comprobación
  // que el clic, y por lo mismo — que Beat no le sume impresiones a otra estación.
  const estacion = typeof banner.estacion === 'object' ? banner.estacion?.id : banner.estacion;
  if (estacion !== undefined && estacion !== (await idEstacion().catch(() => -1))) {
    return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  }

  /*
    No se espera: el navegador ya se fue y la respuesta no depende del número. El
    `.catch` no es decorativo — una promesa rechazada sin capturar es un
    `unhandledRejection`, y en Node eso puede tumbar el proceso.
  */
  void registrarEvento(id, 'impresion').catch(() => {});

  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
};
