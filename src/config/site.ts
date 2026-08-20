/**
 * Config del sitio — Beat 100.9.
 *
 * 🔴 El contrato de URLs vive aquí y está fijado en la decisión 10 del plan:
 * **una ruta por COLECCIÓN, no por sección**. Las notas van en `/noticias/<slug>`
 * y NO en `/<seccion>/<slug>`, por tres razones:
 *   1. `noticias.categorias` es `hasMany` y no hay categoría primaria en el CMS.
 *      Derivar el path de `categorias[0]` haría que reordenar un array —accidente
 *      editorial— cambiara una URL viva en silencio.
 *   2. Las 8 secciones del mapa de sitio no son todas categorías de `noticias`:
 *      El Fenómeno Residente es `especiales`, Agenda es `eventos`, Bonus Beat es
 *      su propia colección.
 *   3. Una URL plana es inmutable: no cambia cuando la redacción re-archiva.
 *
 * Y de paso coincide con lo que el CMS ya emite en `getNewsURL`
 * (`cms-estaciones/src/seo/site.ts`), así que los sitemaps no necesitan que se
 * toque el path — solo el host (ver §11 del plan).
 */
import { envServidor } from '@/lib/env';

/** URL pública del sitio, sin barra final. */
export const SITE_URL = (
  import.meta.env.PUBLIC_SITE_URL || 'https://beatdigital.mx'
).replace(/\/$/, '');

/** Único host que Google debe indexar. Todo lo demás es un despliegue de prueba. */
export const HOST_CANONICO = 'beatdigital.mx';

/**
 * Escape hatch manual, común a las dos reglas de indexación:
 * `SITIO_NOINDEX=1` fuerza noindex, `=0` fuerza indexar. `null` = decide el host.
 */
const forzadoNoIndex = (): boolean | null => {
  const v = envServidor('SITIO_NOINDEX');
  if (v === '1') return true;
  if (v === '0') return false;
  return null;
};

/**
 * 🔴 ¿Este despliegue debe quedar FUERA de Google?
 *
 * Se decide solo, comparando el dominio servido contra el canónico: cualquier
 * despliegue que no sea `beatdigital.mx` (beta, staging, una IP) se marca
 * `noindex` sin que nadie tenga que acordarse de una variable. **Falla del lado
 * seguro**: si te equivocas al configurar, lo que pasa es que NO se indexa, no
 * que se indexe un duplicado.
 */
export const NOINDEX_SITIO = ((): boolean => {
  const forzado = forzadoNoIndex();
  if (forzado !== null) return forzado;
  try {
    return new URL(SITE_URL).host !== HOST_CANONICO;
  } catch {
    return true; // URL inválida = configuración rota → no indexar
  }
})();

/**
 * 🔴 La misma pregunta, pero por PETICIÓN.
 *
 * `NOINDEX_SITIO` mira el dominio con el que se COMPILÓ, y eso deja un hueco: el
 * staging y el sitio real son el mismo contenedor y la misma imagen, así que al
 * reconstruir con el dominio canónico, `beta.beatdigital.mx` empezaría a servir
 * el sitio como indexable — un duplicado exacto compitiéndole al real. El `Host`
 * de la petición sí distingue los dos.
 *
 * ⚠️ Depende de `security.allowedDomains` en `astro.config.mjs`: sin esa lista,
 * `context.url.hostname` es SIEMPRE `localhost` en producción y esta función
 * marcaría el sitio real como despliegue de prueba.
 */
export function noIndexarHost(hostname: string): boolean {
  const forzado = forzadoNoIndex();
  if (forzado !== null) return forzado;
  return hostname.toLowerCase() !== HOST_CANONICO;
}

/** Origen INTERNO del CMS (API) — SOLO server-side. Puede ser una IP privada de
 *  la VPC (p. ej. http://10.0.0.5:3000). El navegador nunca lo ve. */
export const CMS_URL = envServidor('CMS_URL').replace(/\/$/, '');

/** Origen PÚBLICO del CMS: la media que carga el navegador.
 *  Si no se define, cae a `CMS_URL` (setup de un solo host). Separarlos hace
 *  trivial el corte «IP interna ↔ dominio público». */
export const CMS_URL_PUBLICA = (
  import.meta.env.PUBLIC_CMS_URL || CMS_URL
).replace(/\/$/, '');

/**
 * `codigo` de la estación en la colección `estaciones` del CMS.
 *
 * 🔴 Es env var y no una constante a propósito: es lo único que hace que este
 * repo sirva de modelo para `web-oye`, `web-sabrosita` y `web-stereocien`. El id
 * numérico NO se hardcodea nunca — se resuelve por este código (ver
 * `src/lib/cms/client.ts`).
 */
export const ESTACION_CODIGO = envServidor('ESTACION_CODIGO', 'beat');

export const IDIOMA = 'es';
export const IDIOMA_REGION = 'es-MX';
export const LOCALE_OG = 'es_MX';

// ============================================================
// Contrato de URLs (decisión 10 del plan)
// ============================================================

/** Una ruta por colección. */
export const rutaNota = (slug: string): string => `/noticias/${slug}`;
export const rutaEspecial = (slug: string): string => `/especiales/${slug}`;
export const rutaEvento = (slug: string): string => `/eventos/${slug}`;
export const rutaBonusBeat = (slug: string): string => `/bonus-beat/${slug}`;
export const rutaPrograma = (slug: string): string => `/programas/${slug}`;
export const rutaPagina = (slug: string): string => `/${slug}`;

/**
 * 🔴 Conjunto CERRADO de primeros segmentos que son índices de sección o rutas de
 * la app, y por tanto nunca se resuelven como slug de contenido.
 *
 * Se comprueba ANTES que cualquier otra cosa en el resolvedor de rutas. La
 * lección está pagada en `web-enfoque`: a su lista equivalente le faltaba una
 * entrada y provocó `ERR_TOO_MANY_REDIRECTS` en una sección del menú.
 *
 * ⚠️ Mantener en sintonía con `src/pages/`. `tienda` está reservada aunque la
 * Tienda sea de otra fase: así agregarla después no es un cambio estructural.
 */
export const SEGMENTOS_RESERVADOS = [
  'en-vivo',
  'fenomeno-residente',
  'bonus-beat',
  'eventos',
  'programacion',
  'comunidad',
  'marcas',
  'tienda',
  // Rutas por colección
  'noticias',
  'especiales',
  'programas',
  // Área autenticada y proxies
  'mi',
  'api',
  // Estáticos y endpoints
  '_astro',
  '_image',
  '_server-islands',
  'img',
  'favicon',
  'robots.txt',
  'llms.txt',
] as const;

export const urlAbsoluta = (ruta: string): string =>
  `${SITE_URL}${ruta.startsWith('/') ? ruta : `/${ruta}`}`;
