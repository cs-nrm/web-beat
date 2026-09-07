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
  /** El rótulo tal como se pinta en el titular: ya en mayúsculas. */
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
  scanner: { rotulo: 'BEAT SCANNER', href: '/beat-scanner', categoria: 'beat-scanner' },
  editorial: { rotulo: 'EDITORIAL', href: '/editorial', categoria: 'editorial' },
} as const satisfies Record<string, SeccionEditorial>;

/**
 * La navegación de arriba: SEIS secciones, en este orden.
 *
 * 🔴 Eran cinco (decisión de Carlos, 2026-09-01) y son seis desde el 2026-09-07,
 * cuando Beat Scanner y Editorial se separaron en dos secciones con interior
 * propio: `EN VIVO · FENÓMENO RESIDENTE · BONUS BEAT · BEAT SCANNER · EDITORIAL ·
 * AGENDA`. Las dos tienen entrada porque las dos tienen página — anunciar una y
 * esconder la otra dejaría la sección «elaborada» como la menos visible del sitio.
 *
 * Las tres que faltan del mapa de sitio —Comunidad, Tienda y Marcas— no
 * desaparecen: bajan a `SECCIONES_FUTURAS`, que el PIE sí pinta. Un menú de ocho
 * con tres apagadas enseña al lector que la mitad de este sitio no lleva a
 * ninguna parte; el pie es donde un mapa completo sí tiene sentido.
 *
 * ⚠️ El rótulo es el nombre COMPLETO —«Fenómeno Residente», no «Fenómeno»—
 * porque con seis entradas todavía cabe, y porque abreviar el nombre de la sección
 * estrella para ahorrar 60px era una economía sin destinatario.
 *
 * ⚠️ La tira de `NavSecciones` pinta estas seis y se ENVUELVE: a 375px salen en
 * dos filas de 64px de alto en total, sin desbordar (medido). No se convierte en
 * carrusel — una sección que hay que descubrir arrastrando es una sección que no
 * existe.
 *
 * ⚠️ Los `href` editoriales salen de `SECCIONES_EDITORIALES`, no escritos a mano:
 * son los mismos que usan las dos páginas y la migaja de cada nota, y tenerlos en
 * dos sitios es cómo el menú y el pie dejan de coincidir.
 */
export const SECCIONES: EntradaNav[] = [
  { corto: 'En vivo', largo: 'Escuchar en vivo', href: '/en-vivo' },
  { corto: 'Fenómeno Residente', largo: 'El Fenómeno Residente', href: '/fenomeno-residente' },
  { corto: 'Bonus Beat', largo: 'Bonus Beat', href: '/bonus-beat' },
  { corto: 'Beat Scanner', largo: 'Beat Scanner', href: SECCIONES_EDITORIALES.scanner.href },
  { corto: 'Editorial', largo: 'Editorial', href: SECCIONES_EDITORIALES.editorial.href },
  { corto: 'Agenda', largo: 'Agenda', href: '/eventos' },
];

/**
 * Las tres del mapa de sitio que todavía no se construyen.
 *
 * Viven en el PIE, apagadas. Están aquí y no borradas porque el mapa de sitio las
 * declara y Comunidad es el objetivo estratégico #1: borrarlas de la config sería
 * perder la única lista escrita de lo que falta.
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

/** Donde también se puede escuchar la señal. Agregadores de terceros. */
export const PLATAFORMAS_RADIO = [
  { nombre: 'iHeartRadio', url: 'https://www.iheart.com/' },
  { nombre: 'TuneIn', url: 'https://tunein.com/' },
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
 * ⚠️ `Alexa` apuntaba a `/alexa`, una página del v1 que en v2 no existe todavía.
 * Se deja en `null` —el pie la pinta apagada— en vez de enlazar a un 404: mejor
 * decir «esto aún no» que romper la promesa del enlace. Ver C1/D3 del plan: la
 * skill de Alexa es de las cosas que hay que inventariar antes del corte.
 */
export const APPS: Array<{ tienda: string; url: string | null }> = [
  { tienda: 'App Store', url: 'https://apps.apple.com/mx/app/beat-100-9/id444090239' },
  { tienda: 'Google Play', url: 'https://play.google.com/store/apps/details?id=com.sferea.beat' },
  { tienda: 'Alexa', url: null },
];

/**
 * Legales y corporativos.
 *
 * 🔴 Los tres apuntan al CORPORATIVO, y los dos primeros dejaron de estar
 * apagados (decisión de Carlos, 2026-09-07).
 *
 * Estaban reservados como `paginas` del CMS (A1) esperando que alguien capturara
 * el texto, y el pie los pintaba en gris. Pero un aviso de privacidad apagado es
 * peor que uno de más: es el único enlace del sitio que la ley da por supuesto, y
 * en gris se lee como «este sitio no tiene». `paginas` sigue con CERO documentos
 * —comprobado—, así que la espera no tenía fecha.
 *
 * Y no hacía falta: el texto que gobierna este sitio es el de NRM, no uno de la
 * estación, y ya está publicado. Verificado antes de escribirlo (200 los dos):
 *   · https://nrm.com.mx/aviso-de-privacidad/
 *   · https://nrm.com.mx/terminos-y-condiciones/
 *
 * ⚠️ NO se enlaza a `beatdigital.mx/avisodeprivacidad/`, que es donde vive hoy:
 * esa página es del WordPress v1 y muere el día del corte, así que el pie del sitio
 * nuevo apuntaría a un 404 de su propio dominio.
 *
 * El día que la estación quiera su propio aviso, se captura en `paginas` y estos
 * dos `href` vuelven a ser rutas internas. Mientras, el enlace lleva a un texto
 * que existe.
 *
 * ⚠️ `Ventas` es del CORPORATIVO, no de la estación: sale del pie del v1 y del de
 * los repos hermanos, y apunta al contacto de NRM. Es el enlace por el que entra el
 * dinero, así que es el que menos conviene perder en un relanzamiento.
 */
export const LEGALES: EntradaNav[] = [
  { corto: 'Aviso de privacidad', largo: 'Aviso de privacidad', href: 'https://nrm.com.mx/aviso-de-privacidad/' },
  { corto: 'Términos y condiciones', largo: 'Términos y condiciones', href: 'https://nrm.com.mx/terminos-y-condiciones/' },
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
