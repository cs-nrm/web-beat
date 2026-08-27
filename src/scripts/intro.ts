/**
 * Control del intro: una vez por sesión, y con salida.
 *
 * 🔴 Lo que este script NO hace: quitar el overlay. Eso lo hace el CSS, que termina
 * su animación en `opacity: 0` + `visibility: hidden` + `pointer-events: none`. Si
 * este archivo no llega a ejecutarse, el intro se va igual y el sitio queda usable.
 * El handoff lo resolvía al revés —`intro.remove()` desde JS— y eso deja el sitio
 * tapado si el script falla. Es la regla §3 del contrato.
 *
 * Lo que sí hace: no volver a mostrarlo en la sesión, permitir saltarlo, y limpiar
 * el nodo cuando ya no pinta nada.
 */

/** 1.26 + 0.5 + 0.74 de intro + 0.4 de salida, con margen. Es red, no reloj. */
const DURACION_MS = 3400;

const MARCA = 'beat-intro-visto';

/** `sessionStorage` puede lanzar: modo privado, cookies bloqueadas, iframe. */
function yaSeVio(): boolean {
  try {
    return sessionStorage.getItem(MARCA) === '1';
  } catch {
    return false;
  }
}

function apuntarQueSeVio(): void {
  try {
    sessionStorage.setItem(MARCA, '1');
  } catch {
    /* Sin almacenamiento se repetirá en la próxima carga. Es un intro de más, no
       un sitio roto: no vale la pena más ceremonia. */
  }
}

export function prepararIntro(): void {
  /*
   * 🔴 Quien decide si el intro corre es el script EN LÍNEA de `Intro.astro`, que
   * se ejecuta de forma síncrona antes de pintar. Aquí solo se atiende el caso en
   * que ya decidió que sí.
   *
   * Este módulo no puede tomar la decisión: va diferido —se vería un destello del
   * sitio antes de taparlo— y se evalúa una sola vez por contexto de JavaScript,
   * así que en una navegación de Astro no vuelve a correr. Ese reparto es
   * exactamente lo que estaba mal antes.
   */
  if (document.documentElement.dataset.intro !== 'corre') return;

  const intro = document.getElementById('beat-intro');
  if (!intro) return;

  let cerrado = false;
  const cerrar = (): void => {
    if (cerrado) return;
    cerrado = true;
    apuntarQueSeVio();
    /*
     * Se quita la autorización ANTES que el nodo: mientras `data-intro` siga
     * puesto, cualquier overlay que llegue en una navegación posterior volvería a
     * animarse. Es la marca de «esto ya pasó», no solo de «esto está corriendo».
     */
    delete document.documentElement.dataset.intro;
    intro.remove();
    document.removeEventListener('keydown', alTeclado);
  };

  /*
   * Se puede saltar, y solo a propósito.
   *
   * 🔴 El clic va en un BOTÓN, no en todo el overlay. Con la superficie entera
   * escuchando, cualquier clic suelto mientras carga la página se llevaba el intro
   * sin que nadie lo pidiera — al probarlo desaparecía al instante. Un botón hay
   * que pulsarlo, sale en el orden de tabulación y dice lo que hace.
   *
   * `Escape` se queda: es la tecla que todo el mundo prueba para cerrar algo que
   * tapa la pantalla.
   */
  const alTeclado = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') cerrar();
  };
  intro.querySelector('[data-saltar]')?.addEventListener('click', cerrar);
  document.addEventListener('keydown', alTeclado);

  /*
   * 🔴 El cierre se ata al `animationend` del overlay Y a un temporizador de
   * respaldo. Solo con el evento, una pestaña que estuviera en segundo plano
   * durante la animación podría no entregarlo nunca y el nodo se quedaría ahí —
   * invisible y sin capturar clics gracias al CSS, pero presente. `setTimeout`
   * corre en segundo plano; `animationend` no siempre.
   */
  intro.addEventListener('animationend', (e) => {
    /*
     * 🔴 Se comprueban las DOS cosas: que sea la animación de salida y que venga
     * del overlay mismo. `animationend` burbujea, y dentro hay cuatro animaciones
     * más —el logo, el rastro y las dos estelas—; sin el filtro por nombre,
     * cualquiera de ellas cerraría el intro a los dos segundos. Y sin el filtro por
     * origen bastaría con que alguien llamara `intro-out` a otra cosa ahí dentro.
     */
    const ev = e as AnimationEvent;
    if (ev.target === intro && ev.animationName === 'intro-out') cerrar();
  });
  window.setTimeout(cerrar, DURACION_MS);
}
