/**
 * Datos estructurados — JSON-LD.
 *
 * 🔴 La regla que gobierna este archivo: **el JSON-LD no puede afirmar nada que la
 * página no pinte.** Un `datePublished` que no sea la fecha visible, o un `author`
 * distinto de la firma, no es un dato de más: Google lo trata como marcado
 * engañoso y con eso se pierde la ficha entera, no solo la propiedad. Por eso todo
 * lo que se emite sale del MISMO valor que ya usa el marcado —`firma()`,
 * `fechaIso()`, `seccionDeNota()`— y nunca de una segunda fuente.
 *
 * 🔴 Y la segunda: **un dato que no existe se OMITE.** Hoy `noticias.autores` está
 * vacío y la firma viene del campo de texto libre, así que no hay página de autor
 * que enlazar: un `author.url` de relleno sería una URL que responde 404. De eso
 * se encarga `serializar` por todos —cualquier propiedad en `null` desaparece del
 * JSON—, así que un builder puede escribir `?? null` sin condicionales.
 *
 * ⚠️ Toda URL va ABSOLUTA y contra `SITE_URL`, nunca contra el host que sirve. Es
 * lo mismo que ya hacen la canónica y `og:image`, y por la misma razón: lo que se
 * publica apunta al sitio real, no a la preproducción.
 */
import { IDIOMA_REGION, SITE_URL, TARJETA_COMPARTIR, urlAbsoluta } from '@/config/site';

/** Un nodo de schema.org, antes de podarle los huecos. */
export type Nodo = Record<string, unknown>;

/**
 * 🔴 `@id` estable de la estación, y por eso lleva `SITE_URL` y no una cadena
 * suelta: es la MISMA entidad cuando el Inicio la describe entera y cuando una
 * nota la nombra como su `publisher`. Sin un id compartido, Google ve dos
 * organizaciones que se llaman igual.
 */
export const ID_ESTACION = `${SITE_URL}/#estacion`;

/**
 * El nombre de la marca, escrito una vez.
 *
 * Es constante y no el `nombre` del CMS a propósito: es el mismo valor que ya
 * fijan `og:site_name` y el sufijo `— Beat 100.9` de cada `<title>`, y los tres
 * tienen que decir lo mismo. El nombre PÚBLICO del CMS (`BEAT`) sí entra, pero
 * como `alternateName`.
 */
const NOMBRE = 'Beat 100.9';

/**
 * El JSON listo para el atributo.
 *
 * Hace dos cosas que no son cosméticas:
 *
 * 1. **Poda los huecos.** Una propiedad en `null` se cae del documento en vez de
 *    salir vacía. Es la regla de arriba, aplicada en un solo sitio.
 * 2. 🔴 **Escapa `<` como `\u003c`.** El contenido viene del CMS, y basta un
 *    `</script>` dentro de un titular para que el navegador cierre el bloque ahí
 *    mismo: el JSON-LD se rompe y el resto del titular se pinta como HTML. Con el
 *    escape, el analizador de JSON lo devuelve como texto y el de HTML nunca ve
 *    una etiqueta. Es la razón por la que este archivo existe y no se llama a
 *    `JSON.stringify` en cada página.
 */
export function serializar(nodos: Nodo[]): string {
  const doc =
    nodos.length === 1
      ? { '@context': 'https://schema.org', ...nodos[0] }
      : { '@context': 'https://schema.org', '@graph': nodos };
  return JSON.stringify(doc, (_clave, valor) =>
    valor === null || valor === undefined ? undefined : valor,
  ).replace(/</g, '\\u003c');
}

/**
 * La estación como PUBLICADOR: la identidad mínima con la que una nota la nombra.
 *
 * `RadioStation` y no `Organization` porque es lo que es —y `RadioStation` hereda
 * de `Organization`, así que sigue siendo válida donde schema.org pide una
 * organización, como el `publisher` de un `NewsArticle`—.
 *
 * ⚠️ El `logo` sí puede ser SVG; la prohibición de SVG es de `og:image`, que la
 * leen Facebook y X. Google Imágenes acepta SVG, y así el logo del JSON-LD sale
 * del mismo archivo que el de la cabecera y no puede quedarse en una marca
 * anterior.
 */
export function nodoPublicador(): Nodo {
  return {
    '@type': 'RadioStation',
    '@id': ID_ESTACION,
    name: NOMBRE,
    url: urlAbsoluta('/'),
    logo: urlAbsoluta('/img/beat-blanco.svg'),
  };
}

/**
 * La estación descrita ENTERA. Va solo en el Inicio.
 *
 * ⚠️ Solo ahí, y es deliberado: la ficha de la estación es la de una página —la
 * portada— y repetirla en cada ruta no añade nada que Google no vaya a leer una
 * vez. Las demás páginas nombran la misma entidad por su `@id` cuando la necesitan
 * (ver `nodoPublicador`).
 *
 * 🔴 Todo lo que afirma está verificado: la razón social y el domicilio salen del
 * aviso de privacidad de este mismo sitio. No se agrega `broadcastFrequency` —que
 * sería el dato más obvio de una estación— porque en schema.org es propiedad de
 * `BroadcastService`, no de `RadioStation`; los 100.9 ya viajan en el `name`.
 *
 * ⚠️ Este nodo es de BEAT: razón social, domicilio e indicativo son suyos. El día
 * que este repo sirva de modelo para otra estación, es lo primero que se cambia.
 *
 * ⚠️ `sameAs` recibe las redes YA RESUELTAS por `redesEstacion()`, las mismas que
 * pinta el pie. No se leen de `REDES_RESPALDO`: si mañana el CMS trae otra cuenta
 * de Facebook, el pie y el JSON-LD tienen que seguir enlazando a la misma.
 */
export function nodoEstacion(datos: {
  nombrePublico?: string | null;
  redes?: readonly string[];
}): Nodo {
  return {
    ...nodoPublicador(),
    alternateName: datos.nombrePublico ?? null,
    legalName: 'TELEVIDEO, S.A. DE C.V.',
    /*
      ⚠️ El indicativo se escribe aquí y NO se lee de `estaciones.tritonMount`,
      aunque hoy los dos digan `XHSONFM`. No son el mismo dato: un mount es el
      nombre de un flujo en Triton y puede cambiar sin que la concesión cambie.
      Leerlo de ahí funcionaría por casualidad hasta el día que dejara de hacerlo.
    */
    callSign: 'XHSONFM',
    image: {
      '@type': 'ImageObject',
      url: urlAbsoluta(TARJETA_COMPARTIR.ruta),
      width: TARJETA_COMPARTIR.ancho,
      height: TARJETA_COMPARTIR.alto,
    },
    areaServed: 'Ciudad de México',
    /*
      El domicilio fiscal, repartido como lo pide `PostalAddress`. La colonia va
      dentro de `streetAddress` porque schema.org no tiene un campo para ella, y
      `addressLocality` lleva la alcaldía: es el nivel que sigue al C.P. en una
      dirección mexicana.

      ⚠️ El aviso de privacidad dice «México Distrito Federal» porque es texto
      legal de 2015 y no es nuestro para reescribirlo. Aquí va el nombre vigente:
      esto no es el aviso, es un dato que se le da a un buscador.
    */
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Prolongación Paseo de la Reforma No 115, Col. Paseo de las Lomas',
      postalCode: '01330',
      addressLocality: 'Álvaro Obregón',
      addressRegion: 'Ciudad de México',
      addressCountry: 'MX',
    },
    parentOrganization: {
      '@type': 'Organization',
      name: 'NRM COMUNICACIONES',
      url: 'https://nrm.com.mx',
    },
    sameAs: datos.redes && datos.redes.length > 0 ? [...datos.redes] : null,
  };
}

/**
 * La nota como `NewsArticle`.
 *
 * 🔴 Cada propiedad viene del valor que la página YA pinta:
 *   · `headline` y `description` → el `h1` y la bajada
 *   · `datePublished` → el mismo ISO del `<time datetime>` visible
 *   · `author` → `firma(nota)`, la de la ficha del pie
 *   · `image` → la misma variante que carga el `<img>` del hero
 *
 * ⚠️ `dateModified` es la única que no está en pantalla, y sale de `updatedAt` del
 * CMS. Es un dato verdadero y Google lo usa para saber si vale la pena volver;
 * omitirlo haría que una nota corregida siguiera pareciendo la de ayer.
 *
 * ⚠️ Las medidas de la imagen se pasan SOLO si el CMS las trae para la variante
 * que se está sirviendo (ver `medidaMedia`). Unas medidas inventadas son peores
 * que ninguna: Google recorta la tarjeta con ellas.
 */
export function nodoNota(datos: {
  canonica: string;
  titulo: string;
  resumen?: string | null;
  imagen?: string | null;
  imagenAncho?: number | null;
  imagenAlto?: number | null;
  publicado?: string | null;
  modificado?: string | null;
  autor?: string | null;
}): Nodo {
  return {
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': datos.canonica },
    url: datos.canonica,
    headline: datos.titulo,
    description: datos.resumen ?? null,
    inLanguage: IDIOMA_REGION,
    image: datos.imagen
      ? {
          '@type': 'ImageObject',
          url: datos.imagen,
          width: datos.imagenAncho ?? null,
          height: datos.imagenAlto ?? null,
        }
      : null,
    datePublished: datos.publicado ?? null,
    dateModified: datos.modificado ?? datos.publicado ?? null,
    author: datos.autor ? { '@type': 'Person', name: datos.autor } : null,
    publisher: nodoPublicador(),
  };
}

/**
 * La migaja, tal cual está en pantalla.
 *
 * ⚠️ Los `nombre` son el TEXTO DEL DOM, no una versión arreglada: el rótulo de la
 * sección está en mayúsculas en el marcado y así entra. Lo que un rastreador lee
 * es el DOM, y una migaja que no coincida con la visible es justo el marcado que
 * Google penaliza. El aspecto lo decide el CSS y no es asunto de este archivo.
 *
 * Devuelve `null` con menos de dos pasos: una migaja de un solo eslabón no dice
 * nada que la canónica no diga ya.
 */
export function nodoMigaja(pasos: Array<{ nombre: string; url: string }>): Nodo | null {
  if (pasos.length < 2) return null;
  return {
    '@type': 'BreadcrumbList',
    itemListElement: pasos.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.nombre,
      item: p.url,
    })),
  };
}
