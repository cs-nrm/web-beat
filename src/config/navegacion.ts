/**
 * La navegación del sitio, en un solo lugar.
 *
 * 🔴 Fuente única para la cabecera y el pie. El lienzo dibuja `secciones ×8` en
 * los dos, y tenerlo duplicado es cómo se llega a que el menú y el pie no
 * coincidan — que es justo lo que pasa hoy en el sitio viejo, donde el menú y el
 * footer enlazan a `/nerdosis`, `/beat-trends` y `/beat-recordings`, tres secciones
 * apagadas que responden 404.
 *
 * Los `href` tienen que existir en `SEGMENTOS_RESERVADOS` de `config/site.ts`.
 */

export interface EntradaNav {
  /** Etiqueta corta, para la nav de escritorio (va en mayúsculas por CSS). */
  corto: string;
  /** Etiqueta completa, para el menú móvil y el pie. */
  largo: string;
  href: string;
  /** Todavía sin construir: se pinta apagada y sin enlace. */
  pendiente?: boolean;
}

/**
 * 🔴 Las DOS secciones editoriales, y qué categoría del CMS alimenta a cada una.
 *
 * Esto es nuevo del 2026-09-07 y es una decisión editorial de Carlos, no un
 * refactor: **son dos cosas distintas y hasta hoy el sitio las trataba como una.**
 *
 *   `Beat Scanner` → el día a día. Va en la parte principal del Inicio.
 *   `Editorial`    → las notas más elaboradas. Va en la pila, más abajo.
 *
 * Las dos usan el MISMO interior (`IndiceScanner`) porque la pantalla es la misma;
 * lo que cambia es de qué categoría se llena. Antes `/scanner` traía TODAS las
 * notas sin filtrar, así que las elaboradas y las del día se mezclaban en la misma
 * rejilla y ninguna de las dos secciones significaba nada.
 *
 * 🔴 `categoria` es el `slug` de un documento de `categorias` del CMS, y es el
 * único punto de contacto: si la redacción renombra la categoría, el rótulo del
 * front NO cambia —lo manda `rotulo`— pero el slug sí tiene que seguir existiendo.
 * ⚠️ Si el slug deja de existir, la sección se pinta VACÍA con su aviso, no con
 * todas las notas: ver `IndiceScanner.astro`. Un índice que de pronto trae todo es
 * peor que uno que dice que está vacío, porque nadie lo nota.
 */
export interface SeccionEditorial {
  /**
   * El NOMBRE de la sección, en su forma normal.
   *
   * 🔴 Es el que va a cualquier sitio que lea una máquina y presente a un lector:
   * la migaja del JSON-LD, la nav, el pie. Google enseña la migaja tal como se la
   * damos, y «EDITORIAL» en mayúsculas ahí no es la sección, es una decisión de
   * CSS de la pastilla escapándose a un resultado de búsqueda (Carlos,
   * 2026-09-07).
   *
   * ⚠️ Es la MISMA palabra que `rotulo`, no otro dato. Existen las dos porque una
   * es el nombre y la otra es cómo se pinta; el día que alguien quiera renombrar
   * la sección, se cambian las dos.
   */
  nombre: string;
  /**
   * El rótulo tal como se pinta en un titular de display: ya en mayúsculas.
   *
   * ⚠️ `.beat-display` y `.beat-label` ya llevan `text-transform: uppercase`, así
   * que donde el rótulo entra con una de esas clases da igual cuál de los dos se
   * pase — se ve idéntico. Lo que NO da igual es qué queda escrito en el DOM, que
   * es lo que lee un rastreador: ahí va `nombre`.
   */
  rotulo: string;
  href: string;
  /** `slug` de la categoría del CMS que la llena. */
  categoria: string;
}

/*
  ⚠️ `href` y `categoria` se parecen pero NO son lo mismo, y conviene no fundirlos:
  el `href` es nuestro contrato de URL y la `categoria` es un slug que la redacción
  puede renombrar en el admin. Que hoy coincidan en `beat-scanner` es una
  coincidencia cómoda, no una regla — `editorial` ya podría dejar de coincidir
  mañana sin que la URL se mueva.
*/
export const SECCIONES_EDITORIALES = {
  scanner: {
    nombre: 'Beat Scanner',
    rotulo: 'BEAT SCANNER',
    href: '/beat-scanner',
    categoria: 'beat-scanner',
  },
  editorial: {
    nombre: 'Editorial',
    rotulo: 'EDITORIAL',
    href: '/editorial',
    categoria: 'editorial',
  },
} as const satisfies Record<string, SeccionEditorial>;

/**
 * La navegación de arriba: CINCO secciones, en este orden.
 *
 * `FENÓMENO RESIDENTE · BONUS BEAT · BEAT SCANNER · EDITORIAL · AGENDA`.
 *
 * 🔴 Beat Scanner y Editorial son DOS entradas desde el 2026-09-07, cuando se
 * separaron en secciones con interior propio. Las dos tienen entrada porque las dos
 * tienen página — anunciar una y esconder la otra dejaría la sección «elaborada»
 * como la menos visible del sitio.
 *
 * 🔴 Y «En vivo» ya no está: se oculta hasta que su página esté bien (Carlos, el
 * mismo día). Vive en `SECCIONES_OCULTAS`, justo debajo, con lo que hay que hacer
 * para devolverla.
 *
 * Las tres que faltan del mapa de sitio —Comunidad, Tienda y Marcas— no
 * desaparecen: bajan a `SECCIONES_FUTURAS`, que el PIE sí pinta. Un menú de ocho
 * con tres apagadas enseña al lector que la mitad de este sitio no lleva a
 * ninguna parte; el pie es donde un mapa completo sí tiene sentido.
 *
 * ⚠️ El rótulo es el nombre COMPLETO —«Fenómeno Residente», no «Fenómeno»—
 * porque cabe, y porque abreviar el nombre de la sección estrella para ahorrar
 * 60px era una economía sin destinatario.
 *
 * ⚠️ La tira de `NavSecciones` las pinta todas y se ENVUELVE: a 375px salen en dos
 * filas, sin desbordar (medido). No se convierte en carrusel — una sección que hay
 * que descubrir arrastrando es una sección que no existe.
 *
 * ⚠️ Los `href` editoriales salen de `SECCIONES_EDITORIALES`, no escritos a mano:
 * son los mismos que usan las dos páginas y la migaja de cada nota, y tenerlos en
 * dos sitios es cómo el menú y el pie dejan de coincidir. Y desde el 2026-09-07,
 * también el NOMBRE: era la misma palabra escrita dos veces, y el día que la
 * sección se renombre solo se va a cambiar una.
 */
export const SECCIONES: EntradaNav[] = [
  { corto: 'Fenómeno Residente', largo: 'El Fenómeno Residente', href: '/fenomeno-residente' },
  { corto: 'Bonus Beat', largo: 'Bonus Beat', href: '/bonus-beat' },
  {
    corto: SECCIONES_EDITORIALES.scanner.nombre,
    largo: SECCIONES_EDITORIALES.scanner.nombre,
    href: SECCIONES_EDITORIALES.scanner.href,
  },
  {
    corto: SECCIONES_EDITORIALES.editorial.nombre,
    largo: SECCIONES_EDITORIALES.editorial.nombre,
    href: SECCIONES_EDITORIALES.editorial.href,
  },
  { corto: 'Agenda', largo: 'Agenda', href: '/eventos' },
];

/**
 * 🔴 «En vivo» está OCULTA a propósito (Carlos, 2026-09-07): «hasta que hagamos
 * bien la página».
 *
 * No está en `SECCIONES`, así que no aparece en la nav de la cabecera, ni en el
 * menú a pantalla completa, ni en la tira de los interiores, ni en la lista de
 * secciones del pie. **Para restituirla, se mueve esta entrada de vuelta a
 * `SECCIONES`, en el primer puesto** — y no hay que tocar nada más.
 *
 * ⚠️ Y NO va en `SECCIONES_FUTURAS`, que es otra cosa: esas se pintan APAGADAS
 * porque no existen. Esta existe y funciona; lo que no está es a la altura del
 * resto, y anunciar en el menú algo que no sostiene la comparación es peor que no
 * anunciarlo. Apagada tampoco sirve: diría que la radio en vivo no está
 * disponible, que es exactamente lo contrario de lo que este sitio afirma.
 *
 * ⚠️ La RUTA sigue viva y responde 200: `/en-vivo` está en `SEGMENTOS_RESERVADOS`,
 * la página existe y **el pie la sigue enlazando en su párrafo de «Radio en vivo»**
 * («Escucha nuestra señal aquí»). Eso se queda a propósito: lo que se oculta es la
 * sección del menú, no el acceso a la señal — y el player de la cabecera, que es
 * como escucha de verdad la gente, no se toca.
 */
export const SECCIONES_OCULTAS: EntradaNav[] = [
  { corto: 'En vivo', largo: 'Escuchar en vivo', href: '/en-vivo' },
];

/**
 * Las tres del mapa de sitio que todavía no se construyen.
 *
 * 🔴 YA NO SE PINTAN EN NINGÚN SITIO (Carlos, 2026-09-07): «en el footer hay links
 * desactivados en el nav del footer, quitémoslos, ese nav debe ser acorde al main
 * nav». Vivían en el pie en gris, y la idea era que quien buscara «Comunidad»
 * viera que existe y que aún no está. En la práctica el pie enseñaba tres palabras
 * que no llevan a ninguna parte, y el mapa completo que justificaba eso ya no
 * coincidía con la navegación real del sitio.
 *
 * ⚠️ La constante NO se borra, y es a propósito: el mapa de sitio las declara y
 * Comunidad es el objetivo estratégico #1, así que esta es la única lista escrita
 * de lo que falta. Se queda exportada, sin nadie que la pinte, hasta que alguna se
 * construya — y entonces pasa a `SECCIONES` como una entrada normal.
 */
export const SECCIONES_FUTURAS: EntradaNav[] = [
  { corto: 'Comunidad', largo: 'Comunidad', href: '/comunidad', pendiente: true },
  { corto: 'Tienda', largo: 'Tienda', href: '/tienda', pendiente: true },
  { corto: 'Marcas', largo: 'Beat para marcas', href: '/marcas', pendiente: true },
];

/**
 * Programación va en el pie y no en la nav de arriba.
 *
 * No está entre las 8 del mapa de sitio, pero Carlos confirmó que sí va
 * (2026-08-19), y la nav del lienzo tiene exactamente 8 huecos. El pie es su lugar
 * natural: es una utilidad de consulta, no una sección editorial.
 */
export const SECCIONES_PIE: EntradaNav[] = [
  { corto: 'Programación', largo: 'Programación', href: '/programacion' },
];

/**
 * Donde también se puede escuchar la señal. Agregadores de terceros.
 *
 * 🔴 Es la ficha de LA ESTACIÓN, no la portada de la plataforma (2026-09-07).
 * Antes apuntaba a `iheart.com` a secas, y por eso «no iba»: llevaba al buscador de
 * un servicio, donde el oyente tiene que volver a encontrar Beat por su cuenta. Un
 * enlace que te deja a medio camino es peor que no tenerlo, porque parece que
 * funciona.
 *
 * La URL sale del pie del v1, que ya traía la ficha real con su id (`11329`), y
 * responde 200 sin redirecciones. ⚠️ Ese id es parte de la URL y no se puede
 * adivinar: si algún día deja de responder, se vuelve a buscar la ficha — NO se
 * recorta la URL a la portada, que es de donde venimos.
 *
 * 🔴 **TuneIn NO va aquí, y es decisión comercial, no técnica** (Carlos,
 * 2026-09-07): es competencia, no un aliado de distribución.
 *
 * ⚠️ Se anota porque el dato existe y la tentación de «arreglarlo» va a volver: la
 * estación SÍ está en TuneIn —«BEAT 100.9 · Total Music», `guideId: s87618`— y su
 * ficha responde 200. O sea que quien vaya a buscar por qué falta va a encontrar
 * que funciona perfectamente, y ese es justo el motivo de que esto esté escrito.
 * De hecho estuvo enlazada unas horas, hasta que Carlos lo vio.
 *
 * ⚠️ Con una sola entrada, la columna «Escucha en» del pie sigue teniendo sentido:
 * el bloque recorre la lista, así que ni sobra ni hay que tocar el marcado. Y si
 * algún día no queda ninguna, el `<ul>` se pinta vacío — es el único caso que
 * habría que mirar antes de borrar la última.
 */
export const PLATAFORMAS_RADIO = [
  { nombre: 'iHeartRadio', url: 'https://www.iheart.com/live/beat-1009-11329/' },
] as const;

/**
 * Apps de la estación.
 *
 * ⚠️ Las URLs quedan vacías a propósito hasta cerrar **C1**: las 4 estaciones
 * tienen app en tiendas y todavía no sabemos qué consume la de Beat del WordPress
 * viejo. Enlazar a una app que va a romperse en el corte sería peor que no
 * enlazarla.
 */
/**
 * Las apps de la estación.
 *
 * 🔴 Las URLs salen del pie del sitio v1 (`git show main:src/components/Footer.astro`),
 * no de la nada: son las fichas REALES en tiendas, con el id de la app publicada.
 * Inventarlas habría mandado gente a una ficha que no existe.
 *
 * ⚠️ `Alexa` estuvo en `null` —apagada en el pie— porque apuntaba a `/alexa`, una
 * página del v1 que en v2 no existía. Ya existe (2026-09-07), con las mismas
 * instrucciones de la skill que el v1, así que vuelve a ser un enlace.
 *
 * 🔴 Y con eso el pie se queda SIN un solo enlace apagado, que era el punto de
 * Carlos: «en el footer hay links desactivados, quitémoslos».
 */
export const APPS: Array<{ tienda: string; url: string | null }> = [
  { tienda: 'App Store', url: 'https://apps.apple.com/mx/app/beat-100-9/id444090239' },
  { tienda: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.sferea.beat' },
  { tienda: 'Alexa', url: '/alexa' },
];

/**
 * Legales y corporativos.
 *
 * 🔴 Los dos primeros son PÁGINAS DE ESTE SITIO desde el 2026-09-07, y es decisión
 * de Carlos: «tenemos que hacer páginas aquí, no redirigir a NRM».
 *
 * Y tiene razón sobre lo que había: apuntaban a `nrm.com.mx`, que es la razón
 * social del grupo, cuando el aviso que gobierna este sitio es el de **TELEVIDEO,
 * S.A. DE C.V.** —«BEAT 100.9»—, con su propio domicilio y su propio correo de
 * datos personales (`privacidad@nrm.com.mx`). Mandar al del corporativo era mandar
 * al aviso de otra persona moral.
 *
 * El texto sale del sitio actual (`beatdigital.mx/avisodeprivacidad/` y
 * `/terminosycondiciones/`), no se reescribe: es texto legal vigente y no es
 * nuestro para redactarlo. Ver `src/pages/avisodeprivacidad.astro`.
 *
 * ⚠️ Los `href` son RELATIVOS y apuntan a este sitio, no al dominio del v1. Que la
 * ruta se escriba igual que la del v1 —sin guiones, decisión de Carlos
 * (2026-09-09)— es justo lo que hace que los enlaces al aviso que ya andan por ahí
 * sigan cayendo en su página el día del corte, sin pasar por una redirección.
 *
 * ⚠️ `Ventas` sí es del CORPORATIVO y se queda apuntando allá: sale del pie del v1
 * y del de los repos hermanos, y es el contacto comercial de NRM, no de la
 * estación. Es el enlace por el que entra el dinero, así que es el que menos
 * conviene perder en un relanzamiento.
 */
export const LEGALES: EntradaNav[] = [
  { corto: 'Aviso de privacidad', largo: 'Aviso de privacidad', href: '/avisodeprivacidad' },
  { corto: 'Términos y condiciones', largo: 'Términos y condiciones', href: '/terminosycondiciones' },
  { corto: 'Ventas', largo: 'Ventas', href: 'https://nrm.com.mx/contacto/' },
];

/**
 * 🔴 Las redes de la estación, de RESPALDO.
 *
 * El CMS es la fuente —`estaciones.facebook`, `.instagram`, `.x`, `.youtube`,
 * `.tiktok`— y sigue siendo el que gana. El problema es que hoy los cinco campos
 * están en `null` (comprobado contra `admin.nrm.com.mx`), así que el pie pintaba
 * «Próximamente» donde va la única forma que tiene un oyente de seguir a la
 * estación. Beat tiene esas cuentas desde años; lo que faltaba era capturarlas.
 *
 * Salen del pie del v1 (`git show main:src/components/Footer.astro`), igual que
 * `APPS`: son los perfiles REALES, no inventados, y los cinco responden 200
 * —verificado antes de escribirlos—.
 *
 * ⚠️ Es un respaldo POR RED y no una lista alterna: en cuanto el CMS traiga
 * `facebook`, ese valor gana y este se ignora. Así capturar una sola red en el
 * admin no obliga a capturar las cinco, y corregir una cuenta no exige un
 * despliegue. Ver `redesEstacion()` en `lib/cms/estacion.ts`.
 */
export const REDES_RESPALDO = {
  facebook: 'https://www.facebook.com/beat1009fm',
  instagram: 'https://www.instagram.com/beat1009fm/',
  x: 'https://x.com/BEATOFICIAL',
  youtube: 'https://www.youtube.com/c/BEAT1009FMOFICIAL',
  tiktok: 'https://www.tiktok.com/@beat1009fm',
} as const;

/**
 * La tira de marcas de NRM del pie.
 *
 * 🔴 Hardcodeada a propósito, y no leída de `estaciones`: son las marcas de la
 * casa, no inquilinos de este front. `estaciones` solo tiene las 4 de radio, y en
 * la tira también va Enfoque, que vive en OTRO CMS (`cms-nrm`). Leerla del CMS
 * daría una lista incompleta y una consulta por render para un dato que cambia
 * cada varios años.
 */
/**
 * 🔴 Los logos salen del bucket del corporativo, el mismo que usan los cuatro
 * repos hermanos. No se copian a `public/`: son marcas de OTRAS empresas del grupo
 * y quien las actualiza es el corporativo, no nosotros. Copiándolas tendríamos
 * cinco copias envejeciendo por su cuenta en cinco repos.
 *
 * `nombre` se conserva aunque haya logo: es el `alt`, y es lo que se ve si la
 * imagen no carga.
 */
const LOGOS = 'https://storage.googleapis.com/nrm-web/nrm/images/footer/';

export const MARCAS_NRM = [
  { nombre: 'NRM', sub: 'Comunicaciones', url: 'https://nrm.com.mx', logo: `${LOGOS}NRM-2.png` },
  { nombre: 'OYE', sub: '89.7', url: 'https://oyedigital.mx', logo: `${LOGOS}OYE2.png` },
  { nombre: 'Stereo Cien', sub: '100.1', url: 'https://stereociendigital.mx', logo: `${LOGOS}stereocien_footer-jul26.png` },
  { nombre: 'Sabrosita', sub: '590', url: 'https://sabrositadigital.mx', logo: `${LOGOS}sabrosita.png` },
  { nombre: 'En Enfoque', sub: 'Noticias', url: 'https://enfoquenoticias.com.mx', logo: `${LOGOS}enfoque-footer.png` },
] as const;
