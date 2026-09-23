/**
 * Lo reproducible de una canción.
 *
 * Existe porque el campo que de verdad tiene contenido no es el que el código
 * miraba. Medido contra el CMS el 2026-09-08: de las 8 canciones capturadas, las 8
 * traen `embedUrl` —una URL de YouTube—, 3 traen además `youtube` con el mismo
 * valor byte a byte, y **ninguna** trae `audio`. O sea que el reproductor de pistas
 * de la barra, que espera un mp3, no podía sonar nunca.
 *
 * Esto resuelve el id en el SERVIDOR y no en el navegador. El cliente recibe 11
 * caracteres ya validados, no una URL que tenga que interpretar: un `embedUrl` mal
 * pegado se queda en `null` aquí y la fila se pinta sin botón, en vez de llegar al
 * navegador y convertirse en el `src` de un iframe hacia donde sea.
 */
import { idYoutube } from './video';
import { urlArchivo } from './cms/client';

/** Lo que se puede reproducir de una canción, ya resuelto. */
export interface FuenteCancion {
  /** El mp3 propio, si algún día se captura. Manda sobre los otros dos. */
  audio: string | null;
  /** El id de 11 caracteres del video de YouTube. */
  youtube: string | null;
  /** La URL de la canción en SoundCloud, con el host ya comprobado. */
  soundcloud: string | null;
}

/**
 * Los hosts de SoundCloud que se aceptan.
 *
 * `on.soundcloud.com` es el enlace CORTO, y es el caso normal y no la excepción:
 * medido contra el CMS el 2026-09-23, de las 20 canciones del Top Ten diecinueve
 * llegaron con un corto —los comparten desde la app, y se les ve el
 * `utm_source=whatsapp`— y una con la URL larga.
 *
 * El corto NO sirve para reproducir: redirige con un 302 al canónico, y el
 * reproductor de SoundCloud le contesta 404. Quien lo resuelve es
 * `src/pages/api/soundcloud.ts`, ya en el servidor. Aquí solo se comprueba que el
 * host sea suyo, que es lo que decide si la fila lleva botón.
 */
const HOSTS_SOUNDCLOUD = new Set([
  'soundcloud.com',
  'www.soundcloud.com',
  'm.soundcloud.com',
  'on.soundcloud.com',
]);

function urlSoundcloud(crudo: string | null): string | null {
  if (!crudo) return null;
  try {
    const u = new URL(crudo);
    if (u.protocol !== 'https:') return null;
    return HOSTS_SOUNDCLOUD.has(u.hostname) ? u.href : null;
  } catch {
    return null;
  }
}

function texto(doc: Record<string, unknown>, campo: string): string | null {
  const v = doc[campo];
  return typeof v === 'string' && v.trim() ? v : null;
}

/**
 * Resuelve las dos fuentes posibles de una canción.
 *
 * El orden es `audio` primero y YouTube después, y no es indiferente: un mp3
 * servido por nosotros suena en la barra con `new Audio()`, sin iframe, sin
 * terceros y sin política de nadie. YouTube es el respaldo que hace que hoy suene
 * algo, no el destino.
 *
 * Recibe `unknown` porque a la profundidad con la que llegan las listas, un
 * `canciones[].cancion` puede ser un número en vez del documento. Devolver las dos
 * fuentes en `null` es la respuesta honesta a eso.
 */
export function fuenteDeCancion(c: unknown): FuenteCancion {
  if (!c || typeof c !== 'object') return { audio: null, youtube: null, soundcloud: null };
  const doc = c as Record<string, unknown>;
  const audio = urlArchivo(doc.audio as Parameters<typeof urlArchivo>[0]);

  /*
    `embedUrl` es un campo de texto libre y en él cabe cualquiera de las
    plataformas que el CMS acepta, así que se prueba con las dos que sabemos
    reproducir en vez de suponer cuál es. Hoy conviven de verdad: la lista vieja
    trae YouTube en ese campo y la nueva trae SoundCloud.

    El campo `youtube` dedicado sigue teniendo preferencia sobre `embedUrl` para
    YouTube, que es como estaba.
  */
  const crudo = texto(doc, 'youtube') ?? texto(doc, 'embedUrl');
  return {
    audio,
    youtube: crudo ? idYoutube(crudo) : null,
    soundcloud: urlSoundcloud(texto(doc, 'embedUrl')),
  };
}

/** Si hay algo que reproducir. Lo usan las plantillas para decidir botón o no. */
export function suena(f: FuenteCancion): boolean {
  return Boolean(f.audio || f.youtube || f.soundcloud);
}

/**
 * Ordena las canciones de una lista por votos, de más a menos.
 *
 * Si NINGUNA tiene votos, devuelve el array intacto — y eso es lo que ahorra un
 * interruptor nuevo. Bonus Beat no pinta botón de voto, así que sus canciones se
 * quedan en cero para siempre y conserva el orden EDITORIAL, que es justo el punto
 * de esa sección. El Top Ten muestra el orden que puso la estación hasta que entra
 * el primer voto, y a partir de ahí manda el público.
 *
 * El desempate es el orden del CMS, o sea el de la estación: el `sort` de V8 es
 * estable desde 2018, así que dos canciones con los mismos votos salen en el orden
 * en que venían. No hace falta un índice auxiliar.
 *
 * COPIA antes de ordenar. `sort` muta, y el array que llega es el del documento
 * que `cmsFetch` tiene cacheado: ordenarlo en sitio le cambiaría el orden a todo el
 * que comparta esa entrada durante el TTL —hasta cinco minutos en producción—, y a
 * la página del Inicio, que pide la misma lista.
 */
export function ordenarPorVotos<T extends { votos?: number | null }>(cs: T[]): T[] {
  if (!cs.some((c) => (c.votos ?? 0) > 0)) return cs;
  return [...cs].sort((a, b) => (b.votos ?? 0) - (a.votos ?? 0));
}

/**
 * El total de votos de una lista, para repartir porcentajes.
 *
 * Separado de `ordenarPorVotos` a propósito: el ORDEN siempre sale de los votos
 * crudos, se pinte el porcentaje o no. Que un número esté escondido no es razón
 * para que la lista salga desordenada.
 */
export function totalDeVotos(cs: Array<{ votos?: number | null }>): number {
  return cs.reduce((suma, c) => suma + Number(c.votos ?? 0), 0);
}

/**
 * Cuántos votos tiene que juntar la lista para que se pinten los porcentajes.
 *
 * Se pinta PORCENTAJE y no número de votos por decisión de Carlos (2026-09-21):
 * «así no evidenciamos si tenemos solo 5 votos».
 *
 * Estuvo en 20 unas horas, con el argumento de que con pocos votos el porcentaje
 * delata más que el número —con uno solo sale «100%»—, y Carlos lo bajó a 1 el
 * mismo día: «creo sí muestra el porcentaje aunque sea menos, a partir de 1». El
 * argumento no era malo pero pesaba menos que lo otro: una lista que pasa días sin
 * una sola cifra parece rota, y la que se estrena con «100%» al menos demuestra que
 * el botón sirve.
 *
 * Así que hoy basta UN voto en toda la lista. Con cero sigue sin pintarse nada, que
 * es la regla de la casa: una zona sin contenido se deja vacía, no se rellena con
 * un cero. Y las canciones en 0% tampoco se pintan, aunque la lista ya tenga votos.
 *
 * Subirlo otra vez es cambiar este número y nada más.
 */
export const MINIMO_PARA_PORCENTAJE = 1;

/**
 * El reparto de la lista en porcentajes enteros que **suman 100 exacto**.
 *
 * Se reparte de golpe y no canción por canción, y esa es toda la razón de que
 * esta función exista. Redondeando cada una por su cuenta la columna sumaba 101
 * —medido: 42+22+15+10+6+3+2+1 con 285 votos—, y un 101% se lee como un error de
 * cuentas del sitio aunque cada cifra por separado sea la correcta (Carlos,
 * 2026-09-21: «101 se ve como error»).
 *
 * El método es el del RESTO MAYOR, el mismo con el que se reparten escaños: se
 * trunca cada porcentaje, se cuenta cuántos puntos sobran para llegar a 100, y se
 * le da uno a cada canción por orden de la fracción que perdió al truncar.
 *
 * Y no puede desordenar la lista, que era el riesgo: si A tiene más votos que B,
 * su porcentaje exacto es mayor, así que o su parte entera ya es mayor —y le saca
 * al menos un punto—, o son iguales y entonces la fracción de A es la mayor, con lo
 * que A cobra antes que B. En ningún caso B acaba por encima de A.
 *
 * Una canción con CERO votos tiene fracción cero, así que nunca cobra un punto de
 * los que sobran: se queda en 0 y la plantilla no la pinta.
 */
export function repartirPorcentajes(cs: Array<{ votos?: number | null }>): number[] {
  const total = totalDeVotos(cs);
  if (total <= 0) return cs.map(() => 0);

  const exactos = cs.map((c) => (Number(c.votos ?? 0) / total) * 100);
  const reparto = exactos.map((e) => Math.floor(e));
  let sobran = 100 - reparto.reduce((a, b) => a + b, 0);

  /*
    `sort` es estable, así que a igualdad de fracción cobra primero la que venía
    antes — y como la lista llega ordenada por votos, eso es la que más tiene.
  */
  const porResto = exactos
    .map((e, i) => ({ i, resto: e - Math.floor(e) }))
    .filter((x) => x.resto > 0)
    .sort((a, b) => b.resto - a.resto);

  for (const { i } of porResto) {
    if (sobran <= 0) break;
    reparto[i] += 1;
    sobran -= 1;
  }
  return reparto;
}
