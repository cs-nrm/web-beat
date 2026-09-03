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
