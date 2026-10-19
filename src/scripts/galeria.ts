/**
 * Los botones de anterior y siguiente de la galería del cuerpo de la nota.
 *
 * Es un atajo, no la única puerta: la tira de `Galeria.astro` se recorre con
 * `scroll-snap` sin este archivo. Por eso los botones nacen `hidden` y se
 * muestran aquí — si el script no corre, no queda en pantalla un control que no
 * hace nada.
 *
 * NO escucha el scroll, y es a propósito. Escucharlo serviría para apagar el
 * botón al llegar a un extremo; en vez de eso, la tira da la vuelta: «siguiente»
 * en la última foto vuelve a la primera. Así ningún botón queda nunca sin efecto
 * y no hay estado que se desincronice al navegar.
 */

function avanzar(boton: HTMLButtonElement): void {
  const tira = boton
    .closest<HTMLElement>('[data-galeria]')
    ?.querySelector<HTMLElement>('[data-galeria-tira]');
  if (!tira) return;

  const paso = Number(boton.dataset.galeriaPaso) < 0 ? -1 : 1;
  const ancho = tira.clientWidth;
  const tope = tira.scrollWidth - ancho;
  let destino = tira.scrollLeft + paso * ancho;
  // Los 2px de holgura son el redondeo de `scrollLeft` en pantallas con escala.
  if (destino > tope + 2) destino = 0;
  else if (destino < -2) destino = tope;

  // `prefers-reduced-motion` apaga el desplazamiento suave, no el cambio de foto.
  const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  tira.scrollTo({ left: destino, behavior: quieto ? 'auto' : 'smooth' });
}

/**
 * Muestra los controles de las galerías de la página que acaba de entrar.
 *
 * En cada `astro:page-load` y no una sola vez: el DOM cambia con cada
 * navegación de Astro y este módulo no se vuelve a ejecutar.
 */
function iniciar(): void {
  document.querySelectorAll<HTMLElement>('[data-galeria-controles]').forEach((c) => {
    c.hidden = false;
  });
}

export function prepararGaleria(): void {
  const w = window as Window & { __beatGaleriaLista?: boolean };
  if (w.__beatGaleriaLista) return;
  w.__beatGaleriaLista = true;

  // Delegación en `document`, como `voto.ts`: las galerías cambian con cada
  // navegación y el listener no.
  document.addEventListener('click', (e) => {
    const boton = (e.target as HTMLElement | null)?.closest<HTMLButtonElement>(
      '[data-galeria-paso]',
    );
    if (boton) avanzar(boton);
  });

  document.addEventListener('astro:page-load', iniciar);
}
