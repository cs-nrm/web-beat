/**
 * Lo reproducible de una canción.
 *
 * 🔴 Existe porque el campo que de verdad tiene contenido no es el que el código
 * miraba. Medido contra el CMS el 2026-09-08: de las 8 canciones capturadas, las 8
 * traen `embedUrl` —una URL de YouTube—, 3 traen además `youtube` con el mismo
 * valor byte a byte, y **ninguna** trae `audio`. O sea que el reproductor de pistas
 * de la barra, que espera un mp3, no podía sonar nunca.
 *
 * ⚠️ Esto resuelve el id en el SERVIDOR y no en el navegador. El cliente recibe 11
 * caracteres ya validados, no una URL que tenga que interpretar: un `embedUrl` mal
 * pegado se queda en `null` aquí y la fila se pinta sin botón, en vez de llegar al
 * navegador y convertirse en el `src` de un iframe hacia donde sea.
 */
import { idYoutube } from './video';
import { urlArchivo } from './cms/client';

/** Lo que se puede reproducir de una canción, ya resuelto. */
export interface FuenteCancion {
  /** El mp3 propio, si algún día se captura. Manda sobre YouTube. */
  audio: string | null;
  /** El id de 11 caracteres del video de YouTube. */
  youtube: string | null;
}

function texto(doc: Record<string, unknown>, campo: string): string | null {
  const v = doc[campo];
  return typeof v === 'string' && v.trim() ? v : null;
}

/**
 * Resuelve las dos fuentes posibles de una canción.
 *
 * 🔴 El orden es `audio` primero y YouTube después, y no es indiferente: un mp3
 * servido por nosotros suena en la barra con `new Audio()`, sin iframe, sin
 * terceros y sin política de nadie. YouTube es el respaldo que hace que hoy suene
 * algo, no el destino.
 *
 * ⚠️ Recibe `unknown` porque a la profundidad con la que llegan las listas, un
 * `canciones[].cancion` puede ser un número en vez del documento. Devolver las dos
 * fuentes en `null` es la respuesta honesta a eso.
 */
export function fuenteDeCancion(c: unknown): FuenteCancion {
  if (!c || typeof c !== 'object') return { audio: null, youtube: null };
  const doc = c as Record<string, unknown>;
  const audio = urlArchivo(doc.audio as Parameters<typeof urlArchivo>[0]);
  const crudo = texto(doc, 'youtube') ?? texto(doc, 'embedUrl');
  return { audio, youtube: crudo ? idYoutube(crudo) : null };
}

/** Si hay algo que reproducir. Lo usan las plantillas para decidir botón o no. */
export function suena(f: FuenteCancion): boolean {
  return Boolean(f.audio || f.youtube);
}
