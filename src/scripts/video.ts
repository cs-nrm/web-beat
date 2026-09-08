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
  /*
    🔴 Se le pregunta A PLYR si está sonando, en vez de fiarse del atributo que
    este módulo pinta en el panel. El atributo es un ESPEJO —lo escriben los
    eventos— y un espejo puede quedarse atrás: medido, entre el clic y el evento
    `playing` hay una ventana de buffering de varios segundos en la que el panel
    todavía dice `listo` y el vídeo ya está reproduciendo. Un interruptor que
    consultara el espejo en esa ventana haría lo contrario de lo pedido.
  */
  readonly playing: boolean;
  readonly paused: boolean;
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
  /**
   * El botón de la cápsula que está CARGADA en el visor.
   *
   * 🔴 Sin esto no se podía distinguir «pulsó la que ya está puesta» de «pulsó
   * otra», y las dos hacían lo mismo: recargar la fuente. Medido en el navegador,
   * volver a pulsar la cápsula en curso la devolvía de 23.8s a 0 — o sea que el
   * gesto natural para retomar después de que el directo robara el canal te
   * costaba el sitio donde ibas.
   */
  activo: HTMLElement | null;
  /** Los escuchas vigentes, para poder quitarlos antes de volver a ponerlos. */
  escuchas: Array<[string, () => void]>;
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
 * Pinta en el BOTÓN de la cápsula si esa cápsula está sonando.
 *
 * Los dos iconos viven en el marcado y aquí solo se alterna cuál se ve — el mismo
 * patrón que el botón del directo en `player.ts`, para que no haya dos formas de
 * hacer lo mismo en el sitio. Reconstruir SVG en cada cambio de estado sería la
 * otra, y es peor.
 *
 * ⚠️ `aria-pressed` acompaña al icono. Un botón que cambia de función según el
 * estado tiene que decirlo, o para quien navega con lector de pantalla sigue
 * siendo «reproducir» cuando ya reproduce.
 */
function pintarBoton(boton: HTMLElement | null, sonando: boolean): void {
  if (!boton) return;
  boton.querySelector('[data-icono="play"]')?.classList.toggle('hidden', sonando);
  boton.querySelector('[data-icono="pause"]')?.classList.toggle('hidden', !sonando);
  boton.setAttribute('aria-pressed', sonando ? 'true' : 'false');
}

/**
 * Refleja en el panel y en la cápsula lo que el reproductor está haciendo, para
 * que el CSS pueda pintar el indicador de carga y el icono correcto.
 */
function enlazarEventos(visor: Visor): void {
  const p = visor.reproductor;
  if (!p) return;

  const detenido = () => {
    visor.panel.dataset.estado = 'pausa';
    pintarBoton(visor.activo, false);
    // Al pausar deja de flotar: perseguir al lector con un video detenido no
    // aporta nada.
    flotar(visor, false);
  };

  /*
    🔴 Los escuchas se guardan en una LISTA y no en un campo por evento.

    Antes eran dos campos (`alSonar`, `alPausar`) y añadir el tercero —`ended`—
    habría sido un tercer campo y una tercera pareja de `off`/`on` a mano. Con la
    lista, quitar los vigentes es un recorrido y no hay forma de olvidarse de uno:
    sin el `off`, `on()` ACUMULA, y tras once cápsulas habría once manejadores del
    mismo evento.

    ⚠️ `ended` es nuevo y tapaba un hueco real: al terminar el vídeo, Plyr no emite
    `pause`, así que el panel se quedaba en `sonando` y —ahora que el botón tiene
    dos caras— la cápsula habría quedado con el icono de pausa sobre algo que ya
    no suena.
  */
  visor.escuchas.forEach(([ev, fn]) => p.off(ev, fn));
  visor.escuchas = [
    [
      'playing',
      () => {
        visor.panel.dataset.estado = 'sonando';
        pintarBoton(visor.activo, true);
        // Misma clave que la registrada; ver el comentario de `reproducirEn`.
        reclamarAudio(visor.id);
      },
    ],
    ['pause', detenido],
    ['ended', detenido],
  ];
  visor.escuchas.forEach(([ev, fn]) => p.on(ev, fn));
}

/**
 * El interruptor de la cápsula que YA está cargada: pausa o retoma, sin tocar la
 * fuente.
 *
 * 🔴 Esto es lo que arregla el gesto que no funcionaba. El camino de antes trataba
 * cualquier clic como «carga esta cápsula», así que pulsar la que ya estaba puesta
 * le reasignaba la misma fuente: Plyr reconstruye el elemento de medios, y el vídeo
 * volvía al segundo 0. Y como el icono no cambiaba nunca, desde fuera se leía como
 * que el botón no respondía.
 *
 * ⚠️ Retomar RECLAMA el canal, igual que un arranque: si el directo está sonando
 * —el caso normal, porque es justo lo que acaba de pausar este vídeo— hay que
 * callarlo, o se oirían los dos.
 */
function alternar(visor: Visor): void {
  const p = visor.reproductor;
  if (!p) return;
  if (p.playing) {
    p.pause();
    return;
  }
  reclamarAudio(visor.id);
  try {
    const r = p.play();
    if (r && typeof r.catch === 'function') r.catch(() => {});
  } catch {
    /* el navegador puede rechazar el arranque; el control de Plyr queda visible */
  }
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

  /*
    🔴 La cápsula se marca ANTES de bajar Plyr, no al final.

    Son 110 KB en el camino frío: hasta que llegaran, la lista no señalaba nada y
    el clic no tenía acuse de recibo. Y hace falta además para el interruptor —el
    siguiente clic en la misma cápsula tiene que reconocerse como «esta ya es la
    puesta»— incluso mientras carga.
  */
  visor.activo = boton;
  const lista = boton.closest('[data-capsulas]');
  lista?.querySelectorAll<HTMLElement>('[data-fuente]').forEach((b) => {
    delete b.dataset.activa;
    // Y su icono vuelve a «reproducir»: la que se queda atrás no puede seguir
    // mostrando pausa.
    pintarBoton(b, false);
  });
  boton.dataset.activa = 'sí';

  try {
    await cargarPlyr();
  } catch {
    visor.panel.dataset.estado = 'error';
    /*
      ⚠️ Se suelta la marca de activo. Si se quedara puesta sin reproductor
      detrás, el clic siguiente en esa misma cápsula se leería como «la que ya
      está cargada», iría al interruptor, encontraría `reproductor` en null y no
      haría NADA: un fallo de red dejaría la cápsula muerta para siempre.
    */
    visor.activo = null;
    return;
  }
  if (!Plyr) return;

  if (!visor.reproductor) {
    /*
      ⚠️ Se vuelve a buscar el elemento de montaje en vez de usar el de la
      construcción. Medido: al cambiar de fuente, Plyr REEMPLAZA el `<video>` por
      uno nuevo —`data-visor-montaje` desaparece del DOM mientras el reproductor
      vive—, así que la referencia guardada puede apuntar a un nodo desprendido.
      Con `??` se conserva el comportamiento de antes cuando el atributo sí está.
    */
    const montaje =
      visor.panel.querySelector<HTMLVideoElement>('[data-visor-montaje]') ?? visor.montaje;
    visor.reproductor = new Plyr(montaje, {
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
    const visor: Visor = {
      panel,
      marco,
      montaje,
      portada,
      reproductor: null,
      id,
      /*
        🔴 Arranca en `null` y NO en la cápsula que el marcado trae con
        `data-activa`.

        Ese atributo lo pinta el servidor sobre la cápsula DESTACADA del especial:
        significa «esta es la que encabeza», no «esta está cargada en el visor».
        Sembrar `activo` con ella habría mandado su primer clic al interruptor, que
        con `reproductor` en null no hace nada — o sea que la cápsula destacada, la
        más pulsada de la lista, no habría arrancado nunca al primer intento.
      */
      activo: null,
      escuchas: [],
    };
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

      /*
        🔴 Dos gestos distintos con el mismo botón, y la diferencia es si esa
        cápsula ya está en el visor.

        La misma → interruptor: pausa o retoma donde iba. Otra → se carga y suena.

        ⚠️ El `if` de dentro es la guarda del camino frío: mientras Plyr baja,
        `activo` ya apunta a la cápsula pulsada pero todavía no hay reproductor.
        Un segundo clic ahí NO debe reentrar en la carga —dispararía una segunda
        reconstrucción sobre la primera a medio hacer, que es como se llega a un
        visor con la fuente puesta y detenido—; se ignora y ya arrancará.
      */
      if (boton === visor.activo) {
        if (visor.reproductor) alternar(visor);
        return;
      }
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
