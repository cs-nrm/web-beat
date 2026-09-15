/**
 * Resuelve el campo `audio` de una noticia a algo que se puede pintar.
 *
 * Es el gemelo de `src/lib/video.ts` y vive por lo mismo: la validación de URLs
 * ajenas se hace en el SERVIDOR, para que el navegador reciba una fuente ya
 * comprobada en vez de una cadena que tiene que interpretar.
 *
 * ⚠️ Comparte nombre con `src/scripts/audio.ts`, que es el ÁRBITRO de audio (quién
 * suena y quién se calla). Son dos cosas distintas y el par `lib/` + `scripts/` ya
 * existe igual para el video. Se importan por alias —`@/lib/audio` y
 * `@/scripts/audio`—, así que no hay ambigüedad en ningún archivo.
 *
 * 🔴 Nace el 2026-09-15 con **Microambiente**, la sección de notas que traen audio.
 * El campo existía en el CMS desde la reestructura y el front no lo leía: medido
 * contra `admin.nrm.com.mx`, las 43 notas capturadas traen `audio.fuente: "embed"`
 * —el valor por omisión del admin— y **ninguna** trae `embedUrl` ni `archivo`.
 *
 * ⚠️ Por eso `fuente` NO decide nada aquí: es un desplegable con valor por defecto,
 * así que «embed» significa «nadie tocó este campo» en 43 de 43 casos. Lo que
 * decide es qué hay CAPTURADO, y se mira en ese orden.
 */
import { urlArchivo, type DocMedia } from './cms/client';

export interface FuenteAudio {
  /**
   * `archivo` es un mp3 nuestro y lo reproduce la barra de `audio-nota.ts`;
   * `embed` es el reproductor de la plataforma dentro de un iframe.
   */
  tipo: 'archivo' | 'embed';
  /** La URL del mp3, o la de inserción del iframe. */
  src: string;
  /** Cómo se llama la plataforma, para el `title` del iframe. `null` en un mp3. */
  plataforma: string | null;
  /** El alto del iframe en píxeles. `null` en un mp3, que se pinta con la barra. */
  alto: number | null;
}

/** Lo que trae `noticias.audio`, sin depender del tipo generado. */
interface CampoAudio {
  fuente?: ('embed' | 'archivo') | null;
  embedUrl?: string | null;
  archivo?: number | DocMedia | null;
}

/**
 * 🔴 Los hosts que se pueden meter en un `<iframe>`, y NADA más.
 *
 * Es la misma doctrina de `Embed.astro`: el CMS guarda una URL, no HTML del
 * editor, y el front decide qué hacer con ella. La diferencia es que allí la URL
 * se RECONSTRUYE por plataforma y aquí se deja pasar tal cual, porque el campo del
 * CMS ya es la URL de INSERCIÓN —su ayuda dice «pega la URL del embed, o el código
 * <iframe> completo: se limpia solo»—. Reconstruir las rutas de diecisiete
 * plataformas de podcasting en el front serían diecisiete formas de equivocarse
 * con un dato que llega ya bueno.
 *
 * 🔴 Lo que NO se deja pasar es el HOST. Esa es la parte que protege: sin esta
 * lista, un campo de texto del admin sería un `src` de iframe hacia cualquier
 * sitio, servido desde nuestro dominio.
 *
 * ⚠️ La lista sale de la ayuda del propio campo en el CMS, que enumera las
 * plataformas aceptadas. Si la redacción usa una que no está, el front NO se queda
 * mudo: degrada a un enlace que sí funciona (ver `fuenteDeAudio`), y entonces se
 * agrega aquí.
 *
 * ⚠️ El ALTO es lo único que aquí va a ojo, y por eso casi todos comparten el de
 * `ALTO_POR_OMISION`. Los cuatro que llevan número propio son los que publican su
 * medida; el resto se MIDE en cuanto haya una nota capturada de esa plataforma —
 * hoy no hay ninguna, de ninguna.
 */
const ALTO_POR_OMISION = 180;

const PLATAFORMAS: Record<string, { nombre: string; alto?: number }> = {
  'omny.fm': { nombre: 'OmnyStudio' },
  'player.omnystudio.com': { nombre: 'OmnyStudio' },
  'w.soundcloud.com': { nombre: 'SoundCloud', alto: 166 },
  'soundcloud.com': { nombre: 'SoundCloud', alto: 166 },
  'open.spotify.com': { nombre: 'Spotify', alto: 232 },
  'podcasters.spotify.com': { nombre: 'Spotify' },
  'anchor.fm': { nombre: 'Anchor' },
  'embed.podcasts.apple.com': { nombre: 'Apple Podcasts' },
  'podcasts.apple.com': { nombre: 'Apple Podcasts' },
  'music.amazon.com': { nombre: 'Amazon Music' },
  'music.amazon.com.mx': { nombre: 'Amazon Music' },
  'widget.mixcloud.com': { nombre: 'Mixcloud', alto: 120 },
  'www.mixcloud.com': { nombre: 'Mixcloud', alto: 120 },
  'widget.deezer.com': { nombre: 'Deezer', alto: 300 },
  'www.deezer.com': { nombre: 'Deezer', alto: 300 },
  'widget.spreaker.com': { nombre: 'Spreaker' },
  'www.spreaker.com': { nombre: 'Spreaker' },
  'embeds.audioboom.com': { nombre: 'Audioboom' },
  'audioboom.com': { nombre: 'Audioboom' },
  'www.podbean.com': { nombre: 'Podbean' },
  'www.buzzsprout.com': { nombre: 'Buzzsprout' },
  'player.simplecast.com': { nombre: 'Simplecast' },
  'html5-player.libsyn.com': { nombre: 'Libsyn' },
  'playlist.megaphone.fm': { nombre: 'Megaphone' },
  'iono.fm': { nombre: 'iono.fm' },
  'www.ivoox.com': { nombre: 'iVoox' },
};

/**
 * La URL de inserción, o `null` si no se reconoce el host.
 *
 * ⚠️ El único retoque de ruta es el de Spotify, y está medido contra su
 * documentación, no supuesto: lo que se comparte desde la app es
 * `open.spotify.com/episode/<id>`, y esa URL en un iframe responde con
 * `X-Frame-Options` y se ve un marco en blanco. El reproductor vive en
 * `/embed/episode/<id>`. Es un segmento y es el caso más probable de todos, porque
 * Spotify es de donde más fácil se copia un enlace.
 */
function insercion(crudo: string): FuenteAudio | null {
  let u: URL;
  try {
    u = new URL(crudo);
  } catch {
    return null;
  }
  // Solo https. Un `javascript:` o un `data:` en un `src` es ejecución en la página.
  if (u.protocol !== 'https:') return null;

  const plataforma = PLATAFORMAS[u.hostname];
  if (!plataforma) return null;

  if (u.hostname === 'open.spotify.com' && !u.pathname.startsWith('/embed/')) {
    u.pathname = `/embed${u.pathname}`;
  }

  return {
    tipo: 'embed',
    src: u.href,
    plataforma: plataforma.nombre,
    alto: plataforma.alto ?? ALTO_POR_OMISION,
  };
}

/**
 * El audio de una nota, o `null` cuando no hay ninguno utilizable.
 *
 * 🔴 El ARCHIVO gana al embed cuando están los dos. Es el mismo criterio que la
 * barra de Bonus Beat: un mp3 nuestro suena sin iframe, sin script de terceros y
 * sin la política de nadie, y además es el único de los dos que el árbitro de
 * audio puede pausar cuando arranca la radio.
 *
 * ⚠️ Un `embedUrl` que no se reconoce devuelve `null` y quien llama pinta un
 * enlace. Nunca un iframe a una URL que no supimos leer — es justo el agujero que
 * el CMS cerró guardando la URL en vez del HTML.
 */
export function fuenteDeAudio(audio: CampoAudio | null | undefined): FuenteAudio | null {
  if (!audio) return null;

  const archivo = urlArchivo(typeof audio.archivo === 'object' ? audio.archivo : null);
  if (archivo) return { tipo: 'archivo', src: archivo, plataforma: null, alto: null };

  /*
    ⚠️ `.trim() ||` y nunca `??`: un campo del admin que se abrió y se dejó en
    blanco llega como cadena vacía, no como `null`. Es la trampa de Payload que ya
    mordió en el grupo `meta` de la nota.
  */
  const url = audio.embedUrl?.trim() || null;
  return url ? insercion(url) : null;
}

/**
 * La URL cruda del embed, para el enlace de respaldo.
 *
 * 🔴 Existe para que una plataforma que no esté en la lista NO deje la nota muda:
 * `fuenteDeAudio` devuelve `null` y esto devuelve la URL, así que el componente
 * puede ofrecer «escúchalo en el sitio original» en vez de nada. Una nota de
 * Microambiente sin su audio es una nota sin lo único que la hace de Microambiente.
 */
export function enlaceDeAudio(audio: CampoAudio | null | undefined): string | null {
  const url = audio?.embedUrl?.trim() || null;
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
