/**
 * Publicidad VENDIDA — la colección `publicidad` del CMS.
 *
 * 🔴 NO es lo mismo que `src/scripts/anuncios.ts`, y la diferencia es de negocio:
 * ahí vive el inventario PROGRAMÁTICO (Google Ad Manager, que rellena solo y
 * factura Google), y aquí la venta DIRECTA que el equipo comercial coloca a mano,
 * con su anunciante, su vigencia y su enlace. Cuando las dos cosas compiten por el
 * mismo hueco gana la directa: está vendida y tiene fecha de entrega (ver
 * `Anuncio.astro`).
 *
 * 🔴 EL CMS NO DICE DÓNDE VA (decisión de Carlos, documentada en
 * `cms-estaciones/src/collections/Publicidad.ts`): dice QUÉ es —`portada` o
 * `nativo`— y cada sitio lo coloca. En Beat, `portada` es la franja de arriba del
 * Inicio, encima del player y del menú.
 *
 * El CONTEO vive aquí abajo (`registrarEvento`). Es una llamada de servidor a
 * servidor con `PUBLICIDAD_TOKEN`: el navegador NUNCA la hace, porque el token no
 * puede salir de aquí.
 */
import {
  cmsFetch,
  cmsFetchEstacion,
  SIN_PAGINACION,
  type DocMedia,
  type ParamsCms,
  type RespuestaLista,
} from './client';
import { CMS_URL } from '@/config/site';
import { envServidor } from '@/lib/env';

/** Los dos que existen. El CMS no tiene más y no se inventan aquí. */
export type TipoBanner = 'portada' | 'nativo';

/**
 * Lo que el sitio necesita de un banner. Se declara aquí y no se importa de
 * `@/types/payload` porque la colección es más nueva que el `payload-types.lock`
 * de este repo (igual que `EntradaBitacora` en `aire.ts`).
 */
export interface Banner {
  id: number;
  /**
   * A qué estación pertenece. Llega como id con `depth: 0`.
   *
   * 🔴 Hace falta declararlo aunque las consultas por lista ya filtren por
   * estación en el transporte: el proxy del CLIC lee por id, y el id es único en
   * todo el CMS, que sirve a cuatro marcas. Sin comprobarlo, el dominio de Beat
   * redirigiría el banner de otra estación y le sumaría el clic a su campaña.
   */
  estacion?: number | { id: number } | null;
  /** Nombre interno de la campaña. NO se muestra: es para identificarla en el CMS. */
  titulo: string;
  anunciante: string;
  tipo: TipoBanner;
  imagen?: DocMedia | number | null;
  /** Opcional. Si no hay, el sitio usa `imagen` — así lo promete el CMS. */
  imagenMovil?: DocMedia | number | null;
  enlace: string;
  orden?: number | null;
}

/**
 * 🔴 Solo `http(s)` o una ruta del propio sitio.
 *
 * `enlace` es texto libre que escribe quien captura la campaña, y va directo a un
 * `href`. Un `javascript:` ahí se ejecuta en la página: no es un ataque de fuera,
 * es un descuido (o una cuenta comprometida) del panel convertido en XSS. Un
 * banner sin enlace válido se descarta entero, porque un banner que no lleva a
 * ningún lado no es la campaña que se vendió.
 */
function enlaceSeguro(enlace: string | null | undefined): string | null {
  const limpio = (enlace ?? '').trim();
  if (!limpio) return null;
  if (limpio.startsWith('/')) return limpio;
  return /^https?:\/\//i.test(limpio) ? limpio : null;
}

/**
 * Instante actual, redondeado al MINUTO, para el filtro de vigencia.
 *
 * ⚠️ No es un detalle: la clave de caché del cliente del CMS es la URL completa.
 * Con un `Date.now()` exacto cada visita generaría una clave distinta —caché
 * inservible justo en el pico, y la tabla creciendo hasta que la poda la corte— y
 * eso es la regla de oro del cliente: nada que varíe por petición en el `where`.
 * Al minuto son 60 s de agrupación contra los 45 s de TTL, así que el banner entra
 * y sale de vigencia con menos de dos minutos de retraso. Para una campaña con
 * fechas al minuto, eso sobra.
 */
function ahoraAlMinuto(): string {
  const t = new Date();
  t.setSeconds(0, 0);
  return t.toISOString();
}

/**
 * TODAS las campañas vigentes de un tipo, en el orden en que deben rotar.
 *
 * 🔴 Devuelve una LISTA y no un documento, y ese es el cambio que pidió Carlos
 * (2026-09-01): «pueden haber activas más de una a la vez». Antes esto pedía
 * `limit: 1` y la segunda campaña vendida simplemente no salía —sin error, sin
 * aviso, y sin que nadie lo notara hasta el reporte de fin de mes—. Comercial
 * puede vender dos portadas para la misma semana, y las dos tienen que entregar.
 *
 * El orden lo manda `orden` y desempata la que empezó después. La rotación entre
 * ellas la hace el navegador (ver `Anuncio.astro`), no el servidor: si el servidor
 * eligiera una al azar, la caché de borde congelaría esa elección para todos los
 * lectores de ese TTL y la campaña «rotatoria» sería, en la práctica, siempre la
 * misma.
 *
 * El filtro de vigencia va en la consulta **además** de estar en el `read` de la
 * colección (que ya lo aplica porque este front consulta sin sesión). Es a
 * propósito: así el sitio no depende de que el control de acceso del CMS siga
 * siendo el que es hoy, y de paso la consulta cae en el índice
 * `(estacion, tipo, estado, inicio)` que la colección declara para esto.
 *
 * `fin` vacío = campaña abierta, y en Postgres un `>= ahora` **no** devuelve las
 * filas con NULL, de ahí el `or` con `exists: false` — el mismo tropiezo que ya
 * está documentado en `noticias.ts`.
 *
 * ⚠️ Tope de 6. No es una restricción de producto: es que una franja que rota
 * entre más de seis creativos no la ve completa nadie, y sin tope una captura
 * equivocada podría traerse la colección entera al HTML de la portada.
 *
 * Degrada a lista vacía si el CMS falla: el hueco cae al inventario de GAM y la
 * página se pinta igual. Un Inicio sin banner es un problema comercial; un Inicio
 * en 500 es otro problema, peor.
 */
export async function obtenerBanners(tipo: TipoBanner, cuantos = 6): Promise<Banner[]> {
  const ahora = ahoraAlMinuto();
  const params: ParamsCms = {
    'where[tipo][equals]': tipo,
    'where[estado][equals]': 'publicada',
    'where[inicio][less_than_equal]': ahora,
    'where[or][0][fin][greater_than_equal]': ahora,
    'where[or][1][fin][exists]': false,
    sort: 'orden,-inicio',
    limit: cuantos,
    // `depth: 1` para que `imagen` e `imagenMovil` lleguen pobladas; con 0 serían
    // ids y habría que pedir la media aparte.
    depth: 1,
    ...SIN_PAGINACION,
  };

  try {
    const r = await cmsFetchEstacion<RespuestaLista<Banner>>('publicidad', params, 3000);
    /*
      Una campaña sin enlace utilizable se descarta ENTERA, no se pinta sin
      enlace: un banner que no lleva a ningún lado no es la campaña que se vendió.
      Y descartar una no tumba a las demás, que es la ventaja de resolverlo aquí y
      no en la plantilla.
    */
    return r.docs.flatMap((banner) => {
      const enlace = enlaceSeguro(banner.enlace);
      return enlace ? [{ ...banner, enlace }] : [];
    });
  } catch {
    return [];
  }
}

// ============================================================
// El conteo
// ============================================================

/**
 * Un banner por id, sin filtro de vigencia.
 *
 * 🔴 Sin filtrar por vigencia A PROPÓSITO, y es la diferencia con `obtenerBanners`.
 * Esto lo usa el proxy del clic, y quien pulsa puede estar mirando una página
 * servida de caché con una campaña que venció hace un minuto. Ese clic **tiene que
 * llegar a su destino**: el lector no tiene la culpa de nuestro TTL. Lo que no
 * ocurre es que se cuente — de eso se encarga el CMS respondiendo 409.
 *
 * ⚠️ Va por `cmsFetch` y no por `cmsFetchEstacion` porque es una lectura por id, y
 * el id ya es único. Aun así se comprueba la estación al usarlo (ver el proxy): un
 * id de otra estación no debe redirigir desde este dominio.
 */
export async function obtenerBannerPorId(id: number): Promise<Banner | null> {
  try {
    const b = await cmsFetch<Banner>(`publicidad/${id}`, { depth: 0 }, 3000);
    const enlace = enlaceSeguro(b?.enlace);
    return enlace ? { ...b, enlace } : null;
  } catch {
    return null;
  }
}

export type EventoPublicidad = 'impresion' | 'clic';

/**
 * Suma una impresión o un clic en el CMS.
 *
 * 🔴 **Nunca lanza.** Un contador roto no puede tumbar una página ni impedir que
 * un clic llegue a su destino: lo que se pierde es un número, y lo que se perdería
 * si lanzara es la visita. Por eso devuelve un booleano y se traga todo.
 *
 * ⚠️ **El `409` no es un error y no se reintenta.** Significa que el banner está
 * pausado o fuera de vigencia. Reintentarlo acumularía números sobre una campaña
 * que ya no corre, y eso se le factura a alguien.
 *
 * ⚠️ Un `503` significa que a la VM del CMS le falta `PUBLICIDAD_TOKEN`. Es una
 * pendiente de infraestructura conocida, así que se avisa UNA vez por proceso y no
 * en cada render: un log por impresión llenaría el disco antes que la bandeja.
 */
let avisadoSinToken = false;

export async function registrarEvento(id: number, evento: EventoPublicidad): Promise<boolean> {
  const token = envServidor('PUBLICIDAD_TOKEN');
  if (!token || !CMS_URL || !Number.isInteger(id) || id < 1) return false;

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), 2500);
  try {
    const r = await fetch(`${CMS_URL}/api/publicidad/${id}/registrar`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ evento }),
      signal: control.signal,
    });

    if (r.status === 503 && !avisadoSinToken) {
      avisadoSinToken = true;
      console.error(
        '\n🔴 El CMS no puede contar publicidad: le falta PUBLICIDAD_TOKEN en su VM.\n' +
          '   Las campañas vendidas van a quedarse en cero impresiones y cero clics,\n' +
          '   así que no se le van a poder reportar al anunciante.\n',
      );
    }
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(temporizador);
  }
}

/**
 * Cuenta una impresión sin hacer esperar al render.
 *
 * 🔴 No se espera a propósito: el contador va detrás del contenido, no delante. Y
 * el `.catch` no es decorativo — una promesa rechazada sin capturar es un
 * `unhandledRejection`, y en Node eso puede tumbar el proceso entero. Sería el
 * colmo: el sitio caído por contar un anuncio.
 */
export function contarImpresion(id: number): void {
  void registrarEvento(id, 'impresion').catch(() => {});
}
