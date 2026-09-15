/**
 * El audio principal de una nota — la barra de Microambiente.
 *
 * 🔴 Suena en la PÁGINA y no en la barra del player, y es la diferencia con
 * `pista.ts`. Una canción de Bonus Beat es una pista suelta en una lista de tres:
 * su sitio es la barra, que sobrevive a la navegación. El audio de una nota de
 * Microambiente **es la nota** —va arriba, pegado a la foto, y se escucha mientras
 * se lee lo que tiene debajo—. Mandarlo a la barra lo habría convertido en otra
 * cosa: algo que sigue sonando cuando ya no estás en la nota que lo explica.
 *
 * 🔴 Solo atiende al mp3. El otro camino del CMS es un `embedUrl` de plataforma
 * (Omny, Spotify, SoundCloud…), y ese reproductor viene dentro de un iframe de otro
 * dominio: no hay nada que cablear desde aquí, ni forma de pausarlo.
 * `AudioNota.astro` pinta uno u otro y este módulo solo ve el primero.
 *
 * ⚠️ Y esa es una limitación REAL del árbitro, no un descuido: un embed que empieza
 * a sonar no se puede callar desde fuera, así que con un iframe pueden acabar
 * sonando la radio y el audio a la vez. Es exactamente lo que el árbitro existe
 * para impedir, y es el motivo de que `fuenteDeAudio()` prefiera el archivo cuando
 * están los dos. Está anotado igual en `src/lib/audio.ts`.
 */
import { registrarAudio, olvidarAudio, reclamarAudio } from './audio';
import { ga4 } from './analitica';

/** Lo que hay que soltar cuando la página se va. */
interface Montaje {
  id: string;
  audio: HTMLAudioElement;
}

let montado: Montaje | null = null;

/** `754` → `12:34`. Sin horas: un Microambiente no es un programa de tres horas. */
function reloj(segundos: number): string {
  if (!Number.isFinite(segundos) || segundos < 0) return '00:00';
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Desmonta el audio de la página anterior.
 *
 * 🔴 PAUSA además de olvidar. Con el `ClientRouter` de Astro el `<body>` se
 * reemplaza pero un `HTMLAudioElement` que ya está reproduciendo **sigue sonando
 * aunque su nodo salga del DOM**: quedaría una voz sin página y sin botón con el
 * que pararla. Es el mismo motivo por el que `video.ts` destruye sus visores.
 */
function desmontar(): void {
  if (!montado) return;
  montado.audio.pause();
  olvidarAudio(montado.id);
  montado = null;
}

function iniciar(): void {
  desmontar();

  const caja = document.querySelector<HTMLElement>('[data-audio-nota]');
  if (!caja) return;

  const src = caja.dataset.audioSrc;
  if (!src) return;

  const boton = caja.querySelector<HTMLButtonElement>('[data-audio-play]');
  const avance = caja.querySelector<HTMLInputElement>('[data-audio-avance]');
  const transcurrido = caja.querySelector<HTMLElement>('[data-audio-transcurrido]');
  const total = caja.querySelector<HTMLElement>('[data-audio-total]');
  if (!boton || !avance) return;

  /*
    ⚠️ `metadata` y no `none`, al revés que en `pista.ts`. Allí son tres mp3 en una
    página y precargarlos baja megabytes que casi nadie va a escuchar; aquí es UNO,
    y su duración es un dato que se consulta ANTES de pulsar play — cuánto dura es
    la mitad de la decisión de escucharlo. `metadata` baja unos kilobytes de
    cabecera, no el audio.
  */
  const audio = new Audio();
  audio.preload = 'metadata';
  audio.src = src;

  const id = `audio-nota:${caja.dataset.audioId ?? '0'}`;
  montado = { id, audio };

  registrarAudio(id, () => audio.pause());

  const pintarBoton = (): void => {
    /*
      ⚠️ Con VALOR y no a secas. Un `data-sonando` vacío existe en el DOM pero vale
      la cadena vacía, y `!!''` es `false`: así se quedó plegado el menú al volver
      al Inicio. El CSS mira `[data-sonando]`, que sí acierta, pero el atributo
      también lo puede leer un script.
    */
    if (audio.paused) delete caja.dataset.sonando;
    else caja.dataset.sonando = 'sí';
    boton.setAttribute('aria-pressed', String(!audio.paused));
    boton.setAttribute(
      'aria-label',
      audio.paused ? 'Reproducir el audio de la nota' : 'Pausar el audio de la nota',
    );
  };

  const pintarAvance = (): void => {
    const d = audio.duration;
    if (!Number.isFinite(d) || d <= 0) return;
    avance.max = String(Math.floor(d));
    avance.value = String(Math.floor(audio.currentTime));
    // El degradado de lo ya reproducido, igual que el avance de la barra del player.
    avance.style.setProperty('--avance', `${(audio.currentTime / d) * 100}%`);
    if (transcurrido) transcurrido.textContent = reloj(audio.currentTime);
  };

  audio.addEventListener('loadedmetadata', () => {
    avance.disabled = false;
    if (total) total.textContent = reloj(audio.duration);
    pintarAvance();
  });
  audio.addEventListener('timeupdate', pintarAvance);
  audio.addEventListener('play', () => {
    reclamarAudio(id);
    pintarBoton();
    ga4('audio_nota_play', { ruta: location.pathname });
  });
  audio.addEventListener('pause', pintarBoton);
  audio.addEventListener('ended', () => {
    pintarBoton();
    ga4('audio_nota_fin', { ruta: location.pathname });
  });

  /*
    🔴 El fallo de carga se DICE. Un mp3 que el CMS no sirve —borrado, renombrado,
    una media a la que le falta el archivo— deja una barra que se pulsa y no hace
    nada, y eso es justo lo que este sitio no admite: un control inerte le enseña al
    lector a desconfiar de los demás.

    ⚠️ Y es la excepción de la regla de los avisos: una zona vacía se deja vacía y
    sin rótulo, pero una AVERÍA se delata, porque sin el texto se ve igual que un
    audio que nadie ha pulsado todavía.
  */
  audio.addEventListener('error', () => {
    caja.dataset.fallo = 'sí';
    boton.disabled = true;
    boton.setAttribute('aria-label', 'El audio de esta nota no se pudo cargar');
  });

  boton.addEventListener('click', () => {
    if (!audio.paused) {
      audio.pause();
      return;
    }
    /*
      ⚠️ La promesa de `play()` se ATRAPA. Rechaza en dos casos reales —el navegador
      niega la reproducción, o la fuente no se puede decodificar— y sin `catch` eso
      sale por consola como un rechazo no gestionado y la barra se queda en «play»
      sin explicar nada. El `error` de arriba cubre lo segundo; esto evita el ruido
      y deja el control como estaba, que es la verdad: no empezó a sonar.
    */
    audio.play().catch(() => {
      /* el evento `error` ya pinta el fallo cuando la causa es la fuente */
    });
  });

  /*
    `input` y no `change`: `change` solo avisa al SOLTAR, así que arrastrando el
    tirador no pasa nada hasta el final y se pierde la sensación de estar buscando.
  */
  avance.addEventListener('input', () => {
    audio.currentTime = Number(avance.value);
    pintarAvance();
  });

  pintarBoton();
}

export function prepararAudioNota(): void {
  const w = window as Window & { __beatAudioNotaListo?: boolean };
  if (w.__beatAudioNotaListo) return;
  w.__beatAudioNotaListo = true;
  document.addEventListener('astro:page-load', iniciar);
  /*
    🔴 Y ANTES del cambio de página, no solo después. `astro:page-load` corre
    cuando el DOM nuevo ya está puesto, así que el audio de la nota anterior seguiría
    sonando durante todo el intercambio; con `before-swap` se calla en el instante en
    que la nota que lo contenía deja de existir.
  */
  document.addEventListener('astro:before-swap', desmontar);
}
