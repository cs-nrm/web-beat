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
 *
 * 🔴 Y depende de UNA SEGUNDA COSA que no vive en este repo: **`ProxyPreserveHost On`
 * en el vhost de Apache**. Por omisión Apache reescribe el `Host` hacia el backend,
 * así que Node recibiría `Host: localhost:<puerto>` y esta función perdería la
 * única señal con la que trabaja.
 *
 * Cómo falla si alguien la apaga: NO se abre el sitio —«localhost» tampoco es el
 * canónico, así que la indexación sigue cerrada— pero `Astro.url` deja de decir la
 * verdad, y con ella `checkOrigin` compara `localhost` contra el dominio real y
 * **responde 403 a todo POST**. O sea, el login de oyentes el día que exista. Falla
 * silenciosa por el lado de la indexación y ruidosa por el del formulario, que es
 * la peor combinación para diagnosticarla.
 *
 * ✨ La otra mitad de la garantía la da el propio Apache y conviene saberla: con
 * vhosts por nombre, el `Host` **es** lo que elige el vhost, así que una petición
 * con `Host: beatdigital.mx` no puede llegar al proceso de preproducción — la
 * reclama el vhost del sitio vivo. Eso es lo que hace que la MISMA imagen sirva
 * v2 protegida y producción indexable sin reconstruir, y por eso el corte es
 * mover un puerto. ⚠️ Meter un proxy intermedio que reescriba el `Host` rompe las
 * dos mitades a la vez.
 * (Confirmado con la sesión que monta la preproducción, 2026-09-03.)
 */
export function noIndexarHost(hostname: string): boolean {
  const forzado = forzadoNoIndex();
  if (forzado !== null) return forzado;
  return hostname.toLowerCase() !== HOST_CANONICO;
}

/** Origen INTERNO del CMS (API) — SOLO server-side. Puede ser una IP privada de
 *  la VPC (p. ej. http://10.0.0.5:3000). El navegador nunca lo ve. */
export const CMS_URL = envServidor('CMS_URL').replace(/\/$/, '');

/**
 * 🔴 Si falta, se grita. No es paranoia: es el fallo que ya costó un despliegue.
 *
 * `CMS_URL` va SIN prefijo `PUBLIC_`, así que se lee en ejecución y Vite no la
 * hornea en el bundle —solo inlinea las `PUBLIC_*`—. Cuando el proceso arranca sin
 * ella, cada consulta sale contra una URL vacía, falla, y el sitio responde **200
 * con cero contenido**: cabecera, pie y menú perfectos, y ni una noticia.
 *
 * Es el peor modo de falla que existe. No hay error en pantalla, el monitoreo ve
 * 200, y quien lo mira piensa que el CMS está vacío. Pasó en el beta de
 * `web-enfoque` (31 jul 2026) y volvió a pasar aquí con `pnpm preview`, que tampoco
 * carga `.env`.
 *
 * Un aviso en el arranque no lo arregla, pero convierte media hora de buscar a
 * ciegas en una línea que dice qué hacer.
 */
if (!CMS_URL) {
  console.error(
    '\n🔴 CMS_URL está vacía. El sitio va a responder 200 SIN CONTENIDO.\n' +
      '   Es una variable de EJECUCIÓN (sin prefijo PUBLIC_), así que no basta con\n' +
      '   tenerla en `.env`: `astro preview` y el contenedor no lo cargan.\n' +
      '   · en local:  CMS_URL=https://admin.nrm.com.mx pnpm preview\n' +
      '   · en Docker: ya la pasa docker-compose; revisa que llegue al contenedor.\n',
  );
}

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

/**
 * La serie del Fenómeno Residente, y el tipo de lista que va al Inicio.
 *
 * Son SLUGS y no ids, y van en el env con un valor por omisión: el id solo existe
 * en esta base de datos, y el slug es el mismo en local, staging y producción.
 *
 * ⚠️ Si el slug no coincide con nada, la sección degrada a vacío en vez de tronar
 * —y en el caso de la lista, el Inicio cae al primer tipo que exista— porque un
 * cambio de nombre en el CMS no debe apagar una sección del Inicio.
 */
export const SERIE_FENOMENO = envServidor('SERIE_FENOMENO', 'fenomeno-residente');
export const TIPO_LISTA_DESTACADA = envServidor('TIPO_LISTA_DESTACADA', 'bonus-beat');

export const IDIOMA = 'es';
export const IDIOMA_REGION = 'es-MX';
export const LOCALE_OG = 'es_MX';

/**
 * La medida de TODAS las tarjetas de compartir: la de respaldo y las de sección.
 *
 * 🔴 Las medidas van aquí y no escritas en el `<head>` porque las lee más de uno
 * —`og:image:width/height` y el `image` del JSON-LD del Inicio— y porque los
 * archivos los GENERA `scripts/favicon.mjs` a exactamente 1200×630 (1.91:1, la
 * medida que piden Facebook y X para la tarjeta grande). Son un dato del archivo,
 * no una preferencia: si un día se generan a otra medida, se cambia aquí y en el
 * script, y las etiquetas siguen diciendo la verdad.
 *
 * ⚠️ Unas medidas que no correspondan al archivo son peores que ninguna: las
 * plataformas reservan el hueco con ellas antes de bajar la imagen, así que el
 * error se ve como un recorte raro en la publicación, no como un fallo.
 *
 * ⚠️ Es una sola constante para toda la familia porque el script las genera con la
 * misma medida a propósito. Cada página de sección la pasa con SU tarjeta —ver
 * `src/pages/editorial.astro`—, y una medida por sección serían seis oportunidades
 * de que una se quede vieja.
 */
export const MEDIDA_TARJETA = { ancho: 1200, alto: 630 } as const;

/**
 * La tarjeta de RESPALDO: el Inicio, los legales y cualquier página que no traiga
 * la suya.
 *
 * ⚠️ Las secciones YA no caen aquí: cada una tiene la suya con su nombre encima
 * (`/img/og-<sección>.png`, también de `scripts/favicon.mjs`), y la pasa ella
 * misma. Esta se queda para lo que de verdad se comparte como «la casa».
 */
export const TARJETA_COMPARTIR = {
  ruta: '/img/og-beat.png',
  ...MEDIDA_TARJETA,
} as const;

/**
 * La tarjeta del INICIO, y es la única que NO sale del repo.
 *
 * 🔴 La pidió Carlos el 2026-09-09, con la URL en la mano: «para el share desde el
 * home, si compartimos la página tal cual, esta imagen debería ir». Es el arte que
 * subió la estación —wordmark, la trama de la marca y «Aquí la música se elige»—,
 * ya recortado a 1200×630. La de respaldo que había es el wordmark pelón, correcto
 * pero sin nada del sitio.
 *
 * 🔴 Y va ABSOLUTA a `admin.nrm.com.mx` a propósito, que es lo que arregla el fallo
 * que lo destapó. `Base.astro` resuelve `og:image` contra `SITE_URL` —el dominio
 * CANÓNICO, `beatdigital.mx`— y HOY ese dominio todavía sirve el v1, donde
 * `/img/og-beat.png` no existe: medido, **404**. O sea que quien compartía el Inicio
 * declaraba una imagen que el rastreador no podía bajar, y Facebook caía al logo
 * que encontrara en el v1 — el VIEJO. Es exactamente el «efecto secundario
 * conocido» que ya estaba anotado junto a `imagenCompartir`, cobrado.
 *
 * Una URL del CMS no depende de qué sirva el dominio, así que funciona hoy y sigue
 * funcionando después del corte. `new URL()` deja intacta una URL ya absoluta, por
 * lo que `Base.astro` no necesita saber nada de esto.
 *
 * ⚠️ **Es WebP, y no todos los previsualizadores lo bajan.** X lo documenta como
 * formato válido y Facebook lo acepta en la práctica; WhatsApp y LinkedIn son los
 * que fallan, y cuando fallan la publicación sale sin imagen. El CMS no tiene otra
 * variante —las tres medidas del documento 58 son WebP—, así que la salida, si
 * aparece el problema, es subir el MISMO arte en JPG y cambiar esta ruta. No se
 * arregla desde el front.
 *
 * ⚠️ Las medidas se comprobaron contra el archivo, no contra el nombre: 1200×630
 * reales. Unas medidas que no correspondan son peores que ninguna — ver
 * `MEDIDA_TARJETA`.
 */
export const TARJETA_INICIO = {
  ruta: 'https://admin.nrm.com.mx/api/media/file/portada-c.webp?prefix=media',
  alt: 'El wordmark de Beat 100.9 sobre el negro de la marca, con la frase «Aquí la música se elige».',
  ...MEDIDA_TARJETA,
} as const;

// ============================================================
// Contrato de URLs (decisión 10 del plan)
// ============================================================

/** Una ruta por colección. */
export const rutaNota = (slug: string): string => `/noticias/${slug}`;
export const rutaEspecial = (slug: string): string => `/especiales/${slug}`;
export const rutaEvento = (slug: string): string => `/eventos/${slug}`;
/**
 * La ruta de una edición de lista.
 *
 * 🔴 Recibe el slug del TIPO, no lo asume. Antes esta función escribía
 * `/bonus-beat/<slug>` fijo, y eso dejó de ser correcto cuando `tipos-de-lista` se
 * volvió una colección: la estación crea el tipo y su slug ES la URL pública. Si se
 * hardcodea, el día que creen «Beat Ten» la ruta no existe y nadie se entera hasta
 * que un lector reporta un 404.
 */
export const rutaLista = (tipoSlug: string, slug: string): string => `/${tipoSlug}/${slug}`;
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
  /*
    ⚠️ `bonus-beat` NO va en esta lista, y es el único caso así.

    Deja de ser una ruta escrita en `src/pages/` para ser un DATO: el primer
    segmento es el `slug` de un documento de `tipos-de-lista`, y lo resuelve
    `src/pages/[tipoLista]/`. Reservarlo aquí lo habría bloqueado justamente a él
    —esta lista se comprueba ANTES que nada— y `/bonus-beat` respondería 404 con
    el contenido cargado y todo en su sitio.

    Es la contrapartida de que la estación pueda crear «Beat Ten» sin que nadie
    despliegue: si el código no elige los nombres, tampoco puede reservarlos.
  */
  'eventos',
  /*
    Las DOS secciones editoriales. Son rutas estáticas de `src/pages/`, así que van
    reservadas como el resto: si no, las resolvería `[tipoLista]` buscando un tipo
    de lista con ese slug, y cada visita dispararía una consulta al CMS.
  */
  'beat-scanner',
  'editorial',
  /*
    ⚠️ `scanner` se queda reservado aunque ya NO sea una sección: es la ruta vieja
    de Beat Scanner y responde 301 hacia `/beat-scanner` (ver `redirects` en
    `astro.config.mjs`). Sacarla de aquí la dejaría a merced de `[tipoLista]`, y una
    URL que el sitemap del CMS y los enlaces compartidos todavía llevan acabaría
    consultando el CMS para responder 404 en vez de redirigir.
  */
  'scanner',
  'etiqueta',
  /*
    Documentos: legales y la guía de la skill. Son páginas estáticas de
    `src/pages/`, y van reservadas como el resto — si no, las resolvería
    `[tipoLista]` y cada visita dispararía una consulta al CMS.

    ⚠️ El día que estos textos se muevan a la colección `paginas` del CMS (A1),
    estos tres segmentos son los que hay que SACAR de aquí: pasarían a resolverse
    como slug de contenido, que es justo lo que esta lista bloquea.
  */
  'avisodeprivacidad',
  'terminosycondiciones',
  'alexa',
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
