/**
 * El voto del público a una canción de una lista — el Top Ten.
 *
 * Existe porque el navegador nunca habla con el CMS. Es la línea roja de la casa y
 * aquí no es una formalidad: en producción `CMS_URL` es una IP privada de la VPC y
 * el 3000 no se expone a internet, así que un `fetch` desde la página no llegaría
 * a ningún lado. El nombre de esta ruta estaba decidido desde el traspaso con el
 * CMS (`docs/lo-que-el-front-necesita-del-cms.md`): «el voto irá por un proxy
 * `/api/votar` de Astro».
 *
 * Al otro lado, `POST /api/listas/<id>/votar` del CMS hace el incremento con un
 * `UPDATE … SET votos = COALESCE(votos,0)+1 … RETURNING` atómico y devuelve el
 * conteo nuevo. **No lleva token**: es la única escritura pública y anónima de ese
 * CMS, y es angosta a propósito —solo suma uno a un renglón que ya existe—. Por eso
 * este archivo no tiene ningún secreto que proteger; existe por la línea roja y por
 * el freno de abajo.
 *
 * **NO se comprueba que la lista sea de Beat, y es deliberado.** Hacerlo pediría
 * un `where[id][equals]` que cambia en cada petición, y esa es la regla 2 de
 * `agents/content.md`: un `where` variable revienta la caché del cliente del CMS y
 * en `web-enfoque` produjo 836 de 1,103 errores por hora. El CMS ya valida que la
 * lista exista, que esté publicada, que la votación esté abierta y que la canción
 * pertenezca a esa lista. Lo único que queda descubierto es que alguien arme un
 * `curl` contra una lista de otra estación, que no infla ningún número de Beat.
 */
import type { APIRoute } from 'astro';
import { CMS_URL } from '@/config/site';

export const prerender = false;

/** Tres votos por hora y por navegador. Lo decidió Carlos el 21 sep 2026. */
const LIMITE = 3;
const VENTANA_MS = 3_600_000;
const COOKIE = 'beat_voto';

const SIN_CACHE = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
} as const;

const responder = (status: number, cuerpo: Record<string, unknown>) =>
  new Response(JSON.stringify(cuerpo), { status, headers: SIN_CACHE });

/**
 * Las marcas de tiempo de los votos de la última hora, ya podadas.
 *
 * Van DENTRO de la cookie y no en un `Map` del proceso —que es lo que hace el CMS
 * para su freno por IP— por dos razones medidas: el servicio se reinicia en cada
 * despliegue y un `Map` volvería a cero, y una IP no es una persona. El CMS mismo
 * lo advierte en su endpoint: «una oficina, una escuela o una red móvil comparten
 * IP, y un límite estricto rechazaría votos legítimos en silencio». Un 3/hora por
 * IP dejaría a una prepa entera con tres votos; por navegador, no.
 *
 * Se limpia borrando las cookies, igual que el `localStorage` del sitio viejo. No
 * pretende ser antifraude: el techo de verdad lo pone el 30/min por IP del CMS, y
 * el dedup por persona necesita `oyentes` autenticados, que no existen todavía.
 */
function marcasVigentes(crudo: string | undefined, ahora: number): number[] {
  if (!crudo) return [];
  return crudo
    .split(',')
    .map(Number)
    .filter((t) => Number.isFinite(t) && ahora - t < VENTANA_MS && t <= ahora)
    .slice(-LIMITE);
}

export const POST: APIRoute = async ({ request, cookies }) => {
  /*
    Tope de velocidad, no cerradura — el mismo de `api/anuncio/[id].ts`.
    `Sec-Fetch-Site` lo pone el NAVEGADOR y no se puede falsificar desde una página,
    así que corta el caso realista (una pestaña ajena martilleando) sin estorbar a
    los navegadores que no lo mandan. Contra un `curl` no sirve y no pretende.
  */
  const origen = request.headers.get('sec-fetch-site');
  if (origen && origen !== 'same-origin') {
    return responder(403, { error: 'Petición de otro sitio.' });
  }

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = (await request.json()) as Record<string, unknown>;
  } catch {
    return responder(400, { error: 'Petición mal formada.' });
  }

  const lista = Number(cuerpo?.lista);
  const cancion = Number(cuerpo?.cancion);
  if (!Number.isInteger(lista) || lista < 1 || !Number.isInteger(cancion) || cancion < 1) {
    return responder(400, { error: 'Petición mal formada.' });
  }

  const ahora = Date.now();
  const marcas = marcasVigentes(cookies.get(COOKIE)?.value, ahora);
  if (marcas.length >= LIMITE) {
    return responder(429, {
      error: `Ya usaste tus ${LIMITE} votos de esta hora.`,
      restantes: 0,
    });
  }

  if (!CMS_URL) return responder(503, { error: 'No se pudo registrar el voto.' });

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), 2500);
  let respuesta: Response;
  try {
    respuesta = await fetch(`${CMS_URL}/api/listas/${lista}/votar`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cancion }),
      signal: control.signal,
    });
  } catch {
    // Se agotó el plazo o el CMS no contesta. 503 y no 500: es temporal, y el
    // cliente tiene que poder decir «vuelve a intentarlo» en vez de «se rompió».
    return responder(503, { error: 'No se pudo registrar el voto.' });
  } finally {
    clearTimeout(temporizador);
  }

  if (!respuesta.ok) {
    /*
      El texto lo escribe ESTE archivo y no se reenvía el del CMS, aunque venga en
      español y bien redactado. El aviso que lee el oyente es cosa del front: si un
      día el CMS cambia una cadena, no queremos que cambie sola la voz del sitio.

      El 409 —votación cerrada— NO gasta voto, y por eso la cookie se escribe
      hasta después de este bloque. Quien pulsa un botón que quedó en pantalla
      porque su página venía de caché no tiene la culpa de nuestro TTL.
    */
    const dicho: Record<number, string> = {
      // El CMS usa 404 para dos casos —la lista no existe, o la canción ya no
      // está en ella— y los dos significan lo mismo para quien pulsó: el botón
      // que tiene delante es de una página que ya caducó.
      404: 'La lista cambió. Recarga la página.',
      409: 'La votación de esta lista está cerrada.',
      429: 'Demasiados votos seguidos. Espera un momento.',
    };
    return responder(respuesta.status, {
      error: dicho[respuesta.status] ?? 'No se pudo registrar el voto.',
      restantes: LIMITE - marcas.length,
    });
  }

  marcas.push(ahora);
  cookies.set(COOKIE, marcas.join(','), {
    httpOnly: true,
    sameSite: 'lax',
    /*
      En local `pnpm dev` va por http y una cookie `secure` el navegador la
      descarta en silencio: el freno nunca contaría y los 3 votos serían infinitos
      sin que nadie lo notara. Detrás de Apache el protocolo real llega en
      `x-forwarded-proto`, porque el proxy habla http con el servicio.
    */
    secure: request.headers.get('x-forwarded-proto') === 'https',
    path: '/',
    maxAge: VENTANA_MS / 1000,
  });

  /*
    El conteo sale del CMS y no de sumarle uno al que tenía la página. La página
    puede venir de una caché de hasta cinco minutos (`CACHE_CMS_MS`), así que su
    número puede estar viejo; el del endpoint es el de la base en este instante.
    Y viene ya como número: el CMS lo envuelve en `Number()` a propósito, porque
    node-postgres devuelve las columnas `numeric` como cadena y sin eso el front
    acabaría pintando "21" al sumarle uno a "2".
  */
  let votos: number | null = null;
  try {
    const datos = (await respuesta.json()) as { votos?: unknown };
    if (typeof datos?.votos === 'number') votos = datos.votos;
  } catch {
    // El voto ya se contó; que no se pueda leer el número nuevo no lo deshace.
  }

  return responder(200, { ok: true, votos, restantes: LIMITE - marcas.length });
};
