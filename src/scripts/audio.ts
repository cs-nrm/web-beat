/**
 * Árbitro de audio — garantiza que **solo suene una fuente a la vez**.
 *
 * Adoptado de `web-enfoque/src/lib/audio.ts`, que resolvió exactamente este
 * problema. Fuentes posibles en Beat: el radio en vivo (Triton), el video de una
 * nota (YouTube/Vimeo), el audio de un episodio (Omny) y el video de un podcast,
 * que la reestructura del CMS del 2026-08-20 acaba de habilitar.
 *
 * Cada fuente se **registra** con una forma de pausarse y **reclama** el canal
 * cuando empieza a sonar; al reclamar, todas las demás se pausan. Funciona en los
 * dos sentidos —radio→video y video→radio—, que es donde estaba el bug del sitio
 * viejo: ahí el player paraba el radio al abrir un video, pero no al revés.
 *
 * 🔴 El registro vive en `window` a propósito. El player del radio y el media de
 * una nota se cargan en módulos distintos, y el bundler puede separarlos en
 * chunks: sin un punto común compartirían la interfaz pero no la instancia, y
 * cada uno tendría su propio registro vacío.
 */
type Pausar = () => void;

interface VentanaConAudio {
  __beatAudio?: Map<string, Pausar>;
}

function registro(): Map<string, Pausar> {
  const w = window as unknown as VentanaConAudio;
  if (!w.__beatAudio) w.__beatAudio = new Map();
  return w.__beatAudio;
}

/**
 * Registra (o reemplaza) una fuente y cómo pausarla.
 *
 * Reemplaza en vez de acumular: con View Transitions una nota puede montarse
 * varias veces en la misma sesión, y dos entradas con el mismo id dejarían una
 * apuntando a un elemento que ya no está en el DOM.
 */
export function registrarAudio(id: string, pausar: Pausar): void {
  registro().set(id, pausar);
}

export function olvidarAudio(id: string): void {
  registro().delete(id);
}

/**
 * `id` empezó a sonar: pausa todas las demás.
 *
 * Nunca se pausa a sí misma —de ahí el id—, y el `try` es necesario: una fuente
 * que falla al pausarse (un iframe de otro dominio que ya no responde) no debe
 * impedir que las demás se paren.
 */
export function reclamarAudio(id: string): void {
  registro().forEach((pausar, otra) => {
    if (otra === id) return;
    try {
      pausar();
    } catch {
      /* una fuente que falla no debe frenar a las demás */
    }
  });
}

/** Ids conocidos, para que no se escriban a mano en cada sitio. */
export const FUENTES = {
  radio: 'radio',
  video: 'video-nota',
  podcast: 'podcast',
  /** Una pista a demanda sonando en la barra: Bonus Beat y lo que venga después. */
  pista: 'pista',
} as const;
