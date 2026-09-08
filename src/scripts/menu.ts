/**
 * El menú a pantalla completa: abrir, cerrar y dejar el foco donde debe.
 *
 * 🔴 El estado vive en el OVERLAY (`#beat-menu[data-abierto]`), que se pinta por
 * página, y no en la cabecera, que es persistente. Así una navegación lo cierra
 * sola —el nodo se reemplaza— y no hay que acordarse de nada. Lo único que hay
 * que sincronizar es el `aria-expanded` de las hamburguesas, que sí sobreviven.
 *
 * Hay DOS hamburguesas y no es un descuido: una en la barra clara (escritorio) y
 * otra en la oscura (móvil). Las dos llevan `data-accion="menu"`, así que el
 * manejador delegado atiende a las dos sin saber cuál es cuál.
 */

import { descifrarAhora } from './escribir';

const ANIMACION_MS = 320;

let temporizador: ReturnType<typeof setTimeout> | undefined;
/** Quién abrió el menú, para devolverle el foco al cerrar. */
let abridor: HTMLElement | null = null;

const overlay = (): HTMLElement | null => document.getElementById('beat-menu');
const botones = (): HTMLElement[] =>
  Array.from(document.querySelectorAll<HTMLElement>('[data-accion="menu"]'));

function estaAbierto(): boolean {
  return overlay()?.hasAttribute('data-abierto') ?? false;
}

/**
 * Lo que hay DETRÁS del menú se apaga.
 *
 * 🔴 `inert` y no solo `aria-hidden`: el overlay tapa el contenido pero sus
 * enlaces siguen siendo enfocables con el tabulador, así que sin esto el foco se
 * va a pasear por una página invisible. `inert` los saca del orden de foco y del
 * árbol de accesibilidad de una vez.
 *
 * ⚠️ El CHROME se queda fuera a propósito: la barra del player sigue usable con el
 * menú abierto, que es la razón por la que el overlay va por debajo de ella.
 */
function apagarFondo(apagar: boolean): void {
  for (const sel of ['#contenido', 'body > footer']) {
    const el = document.querySelector(sel);
    if (!el) continue;
    if (apagar) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }
}

function pintarBotones(abierto: boolean): void {
  for (const b of botones()) {
    b.setAttribute('aria-expanded', String(abierto));
    b.setAttribute('aria-label', abierto ? 'Cerrar el menú' : 'Abrir el menú');
  }
}

export function cerrarMenu(devolverFoco = true): void {
  const o = overlay();
  if (!o || !o.hasAttribute('data-abierto')) return;

  o.removeAttribute('data-abierto');
  o.setAttribute('aria-hidden', 'true');
  pintarBotones(false);
  apagarFondo(false);
  document.documentElement.style.removeProperty('overflow');

  /*
    Los enlaces vuelven a ser inalcanzables, pero solo cuando la animación de
    salida ha terminado: quitarlos del orden de foco de golpe mientras todavía se
    ven es un salto para quien navega con teclado.
  */
  clearTimeout(temporizador);
  temporizador = setTimeout(() => {
    if (!o.hasAttribute('data-abierto')) o.setAttribute('inert', '');
  }, ANIMACION_MS);

  if (devolverFoco && abridor?.isConnected) abridor.focus();
  abridor = null;
}

function abrirMenu(desde: HTMLElement | null): void {
  const o = overlay();
  if (!o) return;

  abridor = desde;
  clearTimeout(temporizador);
  o.removeAttribute('inert');
  o.removeAttribute('aria-hidden');
  o.setAttribute('data-abierto', '');
  pintarBotones(true);
  apagarFondo(true);

  /*
    Se bloquea el scroll del documento. Sin esto, la rueda sobre el overlay mueve
    la página de debajo: al cerrar apareces en un sitio distinto del que estabas,
    sin haber navegado.
  */
  document.documentElement.style.overflow = 'hidden';

  /*
    El círculo de apertura nace en el BOTÓN que se pulsó, no en una esquina fija:
    en escritorio y en móvil la hamburguesa está en sitios distintos, y un gesto
    que sale de donde no se tocó se lee como un fallo, no como una animación.
  */
  if (desde) {
    const r = desde.getBoundingClientRect();
    o.style.setProperty('--ox', `${Math.round(r.left + r.width / 2)}px`);
    o.style.setProperty('--oy', `${Math.round(r.top + r.height / 2)}px`);
  }

  /*
    Y los rótulos se descifran, como los titulares del Inicio.

    🔴 Hace falta pedirlo a mano: el observador que dirige ese efecto ya dio por
    vistos estos enlaces en la carga —el overlay se oculta con `visibility`, que
    no cambia su geometría— así que para cuando alguien abre el menú el efecto ya
    se había gastado sin que nadie lo viera.
  */
  for (const t of o.querySelectorAll<HTMLElement>('[data-escribir]')) descifrarAhora(t);

  /*
    🔴 El foco entra al CONTENEDOR, no al primer enlace.

    Estaba en `querySelector('a').focus()` y eso pintaba el anillo de foco sobre
    «Fenómeno Residente» cada vez que se abría el menú, en cualquier sección — lo
    reportó Carlos (2026-09-08) preguntando por qué esa entrada salía marcada.
    Y la lectura era exactamente la equivocada: el menú SÍ marca la sección en
    curso, con `aria-current` y `.es-activo`, así que dos entradas resaltadas a la
    vez —una por estar activa y otra por tener el foco— se contradicen.

    ⚠️ Enfocar el contenedor sigue cumpliendo lo que hacía falta: un lector de
    pantalla anuncia que entró al menú. Y quien navegue con teclado tabula desde
    ahí al primer enlace, que entonces sí muestra su anillo — porque ese foco lo
    pidió él. Es el patrón estándar de un diálogo: se enfoca el contenedor, no su
    primer control.
  */
  o.querySelector<HTMLElement>('.menu-caja')?.focus();
}

export function prepararMenu(): void {
  const w = window as Window & { __beatMenuListo?: boolean };
  if (w.__beatMenuListo) return;
  w.__beatMenuListo = true;

  /*
    Delegado en el documento: las hamburguesas son persistentes pero el overlay se
    reemplaza en cada navegación, así que un listener por nodo tendría que
    recablearse. Uno solo, arriba, no.
  */
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!(t instanceof Element)) return;

    const boton = t.closest<HTMLElement>('[data-accion="menu"]');
    if (boton) {
      e.preventDefault();
      if (estaAbierto()) cerrarMenu();
      else abrirMenu(boton);
      return;
    }

    /*
      Un enlace del menú NO cierra a mano: la navegación reemplaza el overlay y se
      cierra sola. Lo que sí hay que soltar es el scroll y el `inert`, porque
      cuelgan de `documentElement` y del `main`, que sobreviven al intercambio.
    */
    if (t.closest('#beat-menu a')) {
      document.documentElement.style.removeProperty('overflow');
      apagarFondo(false);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && estaAbierto()) {
      e.preventDefault();
      cerrarMenu();
    }
  });

  /*
    Tras navegar, el overlay es nuevo y nace cerrado — pero las hamburguesas son
    las de antes y podrían quedarse diciendo `aria-expanded="true"`. Y el scroll
    podría quedarse bloqueado si la navegación no salió de un clic en el menú (un
    «atrás» del navegador, por ejemplo).
  */
  document.addEventListener('astro:after-swap', () => {
    pintarBotones(false);
    apagarFondo(false);
    document.documentElement.style.removeProperty('overflow');
    overlay()?.setAttribute('inert', '');
    overlay()?.setAttribute('aria-hidden', 'true');
    abridor = null;
  });

  // Estado inicial: cerrado, y fuera del alcance del tabulador.
  overlay()?.setAttribute('inert', '');
  overlay()?.setAttribute('aria-hidden', 'true');
  pintarBotones(false);
}
