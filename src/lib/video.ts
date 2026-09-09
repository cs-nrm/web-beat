/**
 * Resuelve el campo `video` de una noticia a algo que el reproductor entiende.
 *
 * Vive en el SERVIDOR y no en el script de cliente a propósito: el parseo de URLs
 * de YouTube es donde se cuelan los errores (hay cuatro formas de escribir la misma
 * URL), y haciéndolo aquí el navegador recibe un id ya validado en vez de una
 * cadena que tiene que interpretar.
 */
import { urlMedia, type DocMedia } from './cms/client';

export type Proveedor = 'youtube' | 'vimeo' | 'html5';

export interface FuenteVideo {
  proveedor: Proveedor;
  /** Para `youtube`/`vimeo` es el ID; para `html5`, la URL del archivo. */
  src: string;
  /** 9:16 o 16:9 — de esto depende cómo se reserva el espacio ANTES de cargar. */
  orientacion: 'vertical' | 'horizontal';
  duracion: string | null;
}

/** Lo que trae `noticias.video`, sin depender del tipo generado. */
interface CampoVideo {
  plataforma?: ('youtube' | 'vimeo' | 'archivo') | null;
  url?: string | null;
  archivo?: number | DocMedia | null;
  duracion?: string | null;
  orientacion?: ('vertical' | 'horizontal') | null;
}

/**
 * El ID de un video de YouTube, de cualquiera de las formas que el editor pega.
 *
 * Las cuatro que se ven en la práctica: `watch?v=`, `youtu.be/`, `/shorts/` y
 * `/embed/`. Los Shorts importan aquí: la serie es vertical y es la forma en que
 * llega la mitad del material.
 *
 * 🔴 Se EXPORTA porque las canciones lo necesitan igual que las cápsulas, y por un
 * detalle medido: los `embedUrl` que guarda el CMS llegan como
 * `watch?v=ID&list=RD…&start_radio=1`, o sea la radio de YouTube de esa pista. Leer
 * el parámetro `v` se queda con la pista y descarta la cola — que es lo correcto
 * aquí, porque la cola la pone Bonus Beat.
 *
 * ⚠️ La validación de 11 caracteres no es cosmética: es lo que impide que una URL
 * mal pegada se convierta en un `src` de iframe hacia cualquier sitio.
 */
export function idYoutube(crudo: string): string | null {
  let u: URL;
  try {
    u = new URL(crudo);
  } catch {
    return null;
  }
  const id =
    u.searchParams.get('v') ??
    (/^\/(shorts|embed|live)\//.test(u.pathname)
      ? u.pathname.split('/')[2]
      : u.hostname.endsWith('youtu.be')
        ? u.pathname.slice(1)
        : null);
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** El ID de un video de Vimeo. */
function idVimeo(crudo: string): string | null {
  const m = /vimeo\.com\/(?:video\/)?(\d+)/.exec(crudo);
  return m ? m[1] : null;
}

/**
 * Devuelve `null` cuando no hay video utilizable — y entonces quien llama pinta la
 * portada sin control de reproducción, en vez de un botón que no hace nada.
 */
export function fuenteDeVideo(video: CampoVideo | null | undefined): FuenteVideo | null {
  if (!video) return null;

  // La orientación por omisión es VERTICAL: el Fenómeno Residente es una serie de
  // cápsulas verticales, y equivocarse hacia el formato de la serie deforma menos
  // que asumir apaisado.
  const orientacion = video.orientacion ?? 'vertical';
  const duracion = video.duracion ?? null;

  if (video.plataforma === 'archivo') {
    const src = urlMedia(video.archivo, 'large') ?? null;
    return src ? { proveedor: 'html5', src, orientacion, duracion } : null;
  }

  if (!video.url) return null;

  if (video.plataforma === 'vimeo') {
    const id = idVimeo(video.url);
    return id ? { proveedor: 'vimeo', src: id, orientacion, duracion } : null;
  }

  const id = idYoutube(video.url);
  return id ? { proveedor: 'youtube', src: id, orientacion, duracion } : null;
}
