/**
 * El visor de video — Plyr, cargado a demanda.
 *
 * Sirve al bloque del Fenómeno Residente: un solo panel a la izquierda y una lista
 * de cápsulas al centro; al elegir una, se carga y suena AHÍ, sin salir de la
 * página.
 *
 * 🔴 Plyr son 110 KB y se cargan **solo cuando alguien va a ver un video**. Es la
 * misma regla que con el SDK de Triton (854 KB): quien entra a leer no paga el peso
 * de lo que no usa. El sitio v1 cargaba Plyr desde el CDN de NRM en TODAS las
 * páginas, y encima `new Plyr(...)` corría sin guarda.
 *
 * 🔴 Y por qué Plyr y no `<video>`: las cápsulas pueden ser mp4 O YouTube, y un
 * `<video>` nativo no reproduce YouTube. Plyr da las dos con la misma API y la
 * misma piel, que es justo lo que este panel necesita.
 */
import { registrarAudio, olvidarAudio, reclamarAudio, FUENTES } from './audio';

type Proveedor = 'youtube' | 'vimeo' | 'html5';

interface PlyrFuente {
  type: 'video';
  title?: string;
  sources: Array<{ src: string; provider?: 'youtube' | 'vimeo'; type?: string }>;
}
interface PlyrInstancia {
  source: PlyrFuente;
  play(): Promise<void> | void;
  pause(): void;
  destroy(): void;
  on(evento: string, cb: () => void): void;
  off(evento: string, cb: () => void): void;
  once(evento: string, cb: () => void): void;
}

let Plyr: (new (el: HTMLElement, opciones?: unknown) => PlyrInstancia) | null = null;
let cargando: Promise<void> | null = null;

/**
 * Baja Plyr y su CSS. Se memoriza la PROMESA, no el resultado: si dos clics caen
 * mientras baja, comparten la misma descarga en vez de disparar dos.
 */
function cargarPlyr(): Promise<void> {
  if (!cargando) {
    /*
      Solo el JS. La HOJA de Plyr entra por el `<style>` de `Fenomeno.astro`, no
      aquí: un `import()` dinámico de CSS hace que Vite re-optimice dependencias y
      el navegador se queda con una URL vieja — `504 Outdated Optimize Dep`, que en
      pantalla se ve como un visor que no arranca. Y separarlo es además lo
      correcto: la piel son ~10 KB que solo pesan en las páginas que tienen visor,
      mientras que los 110 KB del motor siguen esperando a que alguien pida video.
    */
    cargando = import('plyr')
      .then((mod) => {
        Plyr = (mod.default ?? mod) as never;
      })
      .catch((err) => {
        // No se memoriza el fallo: el siguiente clic debe poder reintentar.
        cargando = null;
        throw err;
      });
  }
  return cargando;
}

/** Un visor: el panel, su portada y la instancia de Plyr cuando exista. */
interface Visor {
  panel: HTMLElement;
  /** Lo que se despega al salir de pantalla. El panel se queda en el flujo. */
  marco: HTMLElement;
  montaje: HTMLVideoElement;
  portada: HTMLElement;
  observador?: IntersectionObserver;
  reproductor: PlyrInstancia | null;
  id: string;
  /** Los escuchas vigentes, para poder quitarlos antes de volver a ponerlos. */
  alSonar?: () => void;
  alPausar?: () => void;
}

const visores = new Map<string, Visor>();

/**
 * Despega o devuelve el visor.
 *
 * Solo flota si está SONANDO: un video pausado que se persigue por la pantalla es
 * una molestia, no una comodidad. Es la diferencia entre «sigue viéndolo mientras
 * lee» y «no te puedes deshacer de esto».
 */
function flotar(visor: Visor, si: boolean): void {
  if (si && visor.panel.dataset.estado !== 'sonando') return;
  if (si) visor.marco.dataset.flotante = 'sí';
  else delete visor.marco.dataset.flotante;
}

/**
 * Vigila si el visor sigue a la vista.
 *
 * Observa el PANEL, que nunca se mueve del flujo — si observara el marco, al
 * despegarse (`position: fixed`) quedaría siempre visible y nunca volvería.
 *
 * El umbral es 0.25: se despega cuando queda menos de un cuarto a la vista, no al
 * primer píxel. Así un scroll corto no lo hace saltar de ida y vuelta.
 */
function vigilarViewport(visor: Visor): void {
  if (typeof IntersectionObserver === 'undefined') return;
  visor.observador?.disconnect();
  visor.observador = new IntersectionObserver(
    ([entrada]) => flotar(visor, !entrada.isIntersecting),
    { threshold: 0.25 },
  );
  visor.observador.observe(visor.panel);
}

/**
 * Refleja en el panel lo que el reproductor está haciendo, para que el CSS pueda
 * pintar el indicador de carga y el estado de la cápsula activa.
 */
function enlazarEventos(visor: Visor): void {
  const p = visor.reproductor;
  if (!p) return;
  const sonando = () => {
    visor.panel.dataset.estado = 'sonando';
    // Misma clave que la registrada; ver el comentario de `reproducirEn`.
    reclamarAudio(visor.id);
  };
  const pausa = () => {
    visor.panel.dataset.estado = 'pausa';
    // Al pausar deja de flotar: perseguir al lector con un video detenido no
    // aporta nada.
    flotar(visor, false);
  };
  p.off('playing', visor.alSonar ?? sonando);
  p.off('pause', visor.alPausar ?? pausa);
  visor.alSonar = sonando;
  visor.alPausar = pausa;
  p.on('playing', sonando);
  p.on('pause', pausa);
}

/**
 * Pone una cápsula en el visor y la reproduce.
 *
 * 🔴 El canal de audio se reclama ANTES de que Plyr empiece, no en el evento
 * `play`. Entre el clic y el primer fotograma hay una descarga de 110 KB más la
 * conexión con YouTube; si el radio siguiera sonando en esa ventana, se oirían los
 * dos a la vez — que es exactamente lo que el árbitro existe para evitar.
 */
async function reproducirEn(visor: Visor, boton: HTMLElement): Promise<void> {
  const { proveedor, fuente, titulo } = boton.dataset as Record<string, string>;
  if (!proveedor || !fuente) return;

  /*
    🔴 Se reclama con `visor.id`, NO con `FUENTES.video`.

    El visor se registra en el árbitro como `video-nota:<panel>` para poder tener
    más de uno por página. Reclamar con `FUENTES.video` a secas usaba una clave
    DISTINTA de la registrada, así que el árbitro veía al visor como «otra fuente»
    y **lo pausaba a sí mismo**: el video arrancaba y se detenía solo, al instante.
  */
  reclamarAudio(visor.id);
  visor.panel.dataset.estado = 'cargando';

  try {
    await cargarPlyr();
  } catch {
    visor.panel.dataset.estado = 'error';
    return;
  }
  if (!Plyr) return;

  if (!visor.reproductor) {
    visor.reproductor = new Plyr(visor.montaje, {
      // `youtube.noCookie` usa youtube-nocookie.com: no siembra cookies de
      // perfilado hasta que el lector le da play.
      youtube: { noCookie: true, rel: 0, modestbranding: 1 },
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'fullscreen'],
      i18n: { play: 'Reproducir', pause: 'Pausa', mute: 'Silenciar', unmute: 'Activar sonido' },
    });
    // El visor entra al árbitro: si alguien le da play al radio, este se pausa.
    registrarAudio(visor.id, () => visor.reproductor?.pause());
    // Y empieza a vigilar el viewport, para poder flotar mientras suena.
    vigilarViewport(visor);
  }

  visor.reproductor.source =
    proveedor === 'html5'
      ? { type: 'video', title: titulo, sources: [{ src: fuente, type: 'video/mp4' }] }
      : { type: 'video', title: titulo, sources: [{ src: fuente, provider: proveedor as 'youtube' }] };

  /*
    🔴 Los escuchas se enlazan DESPUÉS de cada cambio de fuente, no una vez al
    construir.

    Asignar `source` hace que Plyr **reconstruya** el reproductor —con proveedor de
    YouTube, cambia el elemento de medios entero— y los escuchas puestos antes
    dejan de dispararse. Se vio así: el árbitro pausaba el video de verdad
    (`plyr--paused` en el DOM) pero la etiqueta de estado del panel seguía diciendo
    «sonando», porque el evento `pause` nunca llegaba.

    Se quitan antes de volver a ponerlos, porque `on()` acumula: sin el `off`, tras
    once cápsulas habría once manejadores para el mismo evento.
  */
  enlazarEventos(visor);

  // La portada se retira solo cuando ya hay algo detrás.
  visor.portada.hidden = true;
  /*
    `listo`, no `sonando`. El estado de reproducción lo pinta el EVENTO `playing`,
    no una suposición: el navegador puede rechazar el arranque automático, y
    entonces el panel diría «sonando» sobre un video detenido. Se vio en pruebas
    con clic sintético, que no otorga activación de usuario.
  */
  visor.panel.dataset.estado = 'listo';

  // Marcar cuál cápsula está sonando, para que la lista lo refleje.
  const lista = boton.closest('[data-capsulas]');
  lista?.querySelectorAll('[data-fuente]').forEach((b) => delete (b as HTMLElement).dataset.activa);
  boton.dataset.activa = 'sí';

  /*
    🔴 `play()` va DESPUÉS del evento `ready`, no inmediatamente.

    Asignar `source` con proveedor de YouTube arranca una reconstrucción asíncrona
    —Plyr tiene que cargar la API de YouTube y montar el iframe—, y un `play()`
    lanzado antes de que eso termine se pierde: medido con un clic real, el
    reproductor se quedaba en `plyr--stopped` con la fuente correcta cargada.

    `once` y no `on`: es un arranque, no una suscripción; con `on` se acumularía un
    manejador por cada cápsula que el lector elija.
  */
  const arrancar = () => {
    try {
      const r = visor.reproductor?.play();
      // El navegador puede rechazar el arranque (política de autoplay). No es un
      // error que reportar: el control de Plyr queda visible y el lector decide.
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch {
      /* idem */
    }
  };
  /*
    SOLO por `ready`, sin llamada inmediata en paralelo.

    Al principio se hacían las dos «por si acaso», y el resultado fue un arranque
    INTERMITENTE: cuando la llamada inmediata caía en mitad de la reconstrucción,
    el reproductor se quedaba en `plyr--stopped` con la fuente correcta cargada.
    Medido alternando entre dos cápsulas: unas veces arrancaba y otras no.

    Plyr emite `ready` también al cambiar de fuente —comprobado observando las
    clases del contenedor—, así que la llamada extra no cubría ningún hueco: solo
    competía.
  */
  visor.reproductor.once('ready', arrancar);
}

/**
 * Cablea los visores de la página.
 *
 * Se vuelve a llamar en cada navegación porque el DOM se reemplaza: los visores de
 * la página anterior se destruyen para que Plyr no deje instancias apuntando a
 * nodos muertos, ni el árbitro fuentes que ya no existen.
 */
export function iniciarVisores(): void {
  visores.forEach((v, id) => {
    v.observador?.disconnect();
    v.reproductor?.destroy();
    olvidarAudio(id);
  });
  visores.clear();

  document.querySelectorAll<HTMLElement>('[data-visor]').forEach((panel, i) => {
    const montaje = panel.querySelector<HTMLVideoElement>('[data-visor-montaje]');
    const portada = panel.querySelector<HTMLElement>('[data-visor-portada]');
    if (!montaje || !portada) return;

    const marco = panel.querySelector<HTMLElement>('[data-visor-marco]') ?? panel;
    const id = `${FUENTES.video}:${panel.id || i}`;
    const visor: Visor = { panel, marco, montaje, portada, reproductor: null, id };
    visores.set(id, visor);

    // Delegación en el contenedor: la lista de cápsulas puede ser larga y así no
    // hay un listener por fila.
    const raiz = panel.closest('[data-fenomeno]') ?? document;
    raiz.addEventListener('click', (ev) => {
      const objetivo = ev.target as HTMLElement | null;

      // La salida del flotante: lo pausa y lo devuelve a su lugar.
      if (objetivo?.closest('[data-visor-cerrar]')) {
        ev.preventDefault();
        visor.reproductor?.pause();
        flotar(visor, false);
        return;
      }

      const boton = objetivo?.closest<HTMLElement>('[data-fuente]');
      if (!boton) return;
      ev.preventDefault();
      void reproducirEn(visor, boton);
    });
  });
}

export function prepararVideo(): void {
  const w = window as Window & { __beatVideoListo?: boolean };
  if (w.__beatVideoListo) return;
  w.__beatVideoListo = true;
  document.addEventListener('astro:page-load', iniciarVisores);
}
