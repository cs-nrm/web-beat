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
 * Las 8 secciones del `Mapa de sitio Beat 2026.pdf` §4.2. El Inicio no va en la
 * nav: es el logo.
 *
 * ⚠️ «Beat Scanner» sustituye a las noticias — sale del lienzo v14, no del PDF, y
 * donde los dos no coinciden gana el lienzo, que es posterior.
 */
export const SECCIONES: EntradaNav[] = [
  { corto: 'En vivo', largo: 'Escuchar en vivo', href: '/en-vivo' },
  { corto: 'Fenómeno', largo: 'El Fenómeno Residente', href: '/fenomeno-residente' },
  { corto: 'Bonus Beat', largo: 'Bonus Beat', href: '/bonus-beat', pendiente: true },
  { corto: 'Scanner', largo: 'Beat Scanner', href: '/scanner' },
  { corto: 'Agenda', largo: 'Agenda', href: '/eventos', pendiente: true },
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
export const APPS: Array<{ tienda: string; url: string | null }> = [
  { tienda: 'App Store', url: null },
  { tienda: 'Google Play', url: null },
  { tienda: 'Alexa', url: null },
];

/** Legales. Son `paginas` en el CMS (pendiente, A1); por ahora la ruta se reserva. */
export const LEGALES: EntradaNav[] = [
  { corto: 'Aviso de privacidad', largo: 'Aviso de privacidad', href: '/aviso-de-privacidad', pendiente: true },
  { corto: 'Términos y condiciones', largo: 'Términos y condiciones', href: '/terminos-y-condiciones', pendiente: true },
];

/**
 * La tira de marcas de NRM del pie.
 *
 * 🔴 Hardcodeada a propósito, y no leída de `estaciones`: son las marcas de la
 * casa, no inquilinos de este front. `estaciones` solo tiene las 4 de radio, y en
 * la tira también va Enfoque, que vive en OTRO CMS (`cms-nrm`). Leerla del CMS
 * daría una lista incompleta y una consulta por render para un dato que cambia
 * cada varios años.
 */
export const MARCAS_NRM = [
  { nombre: 'NRM', sub: 'Comunicaciones', url: 'https://nrm.com.mx' },
  { nombre: 'OYE', sub: '89.7', url: 'https://oyedigital.mx' },
  { nombre: 'Stereo Cien', sub: '100.1', url: 'https://stereociendigital.mx' },
  { nombre: 'Sabrosita', sub: '590', url: 'https://sabrositadigital.mx' },
  { nombre: 'En Enfoque', sub: 'Noticias', url: 'https://enfoquenoticias.com.mx' },
] as const;
