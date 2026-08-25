/**
 * El texto se ENCIENDE conforme se lee.
 *
 * Referencia que trajo Carlos: sk-visualarchive.vercel.app —que además está hecho
 * con Astro, como nosotros—. Su mecanismo es más listo de lo que aparenta y vale
 * copiarlo tal cual: las letras **no aparecen de la nada**. Están al 40% de
 * opacidad, o sea legibles desde el primer momento, y suben al 100% de forma
 * progresiva mientras el párrafo cruza la pantalla.
 *
 * 🔴 Esa diferencia es lo que hace que el efecto sea aceptable. Un texto que
 * empieza invisible y depende del scroll para existir es contenido rehén de una
 * animación: si el JavaScript falla, si el navegador no lo soporta, o si alguien
 * llega con la página a media altura, el texto no está. Encendiendo desde un valor
 * legible, el peor caso es un párrafo un poco apagado, no un párrafo ausente.
 * (El valor exacto —0.65— está medido y justificado en `beat.css`.)
 *
 * ⚠️ DÓNDE SE PUEDE PONER. No es decorativo: el efecto necesita que el párrafo
 * ENTRE por abajo, y eso son ~0.4 × el alto del viewport de carrera por encima.
 * Medido en el sitio:
 *
 *   · `.mosaico-bajada`  y=1208 → 0 → 18 → 29 → 44 en ~350px.  ✅
 *   · `.nt-bajada`       y=297  → nace en 120/127.             ❌ no se ve
 *   · `.sc-bajada`       y=273  → nace encendida entera.       ❌ no se ve
 *
 * Un párrafo en la primera pantalla NACE ENCENDIDO. No se rompe nada —queda a
 * opacidad plena, que es el estado correcto— pero parte cientos de letras en
 * `span` a cambio de nada. Antes de aplicarlo, medir la `y`.
 *
 * ⚠️ Y NUNCA sobre algo `position: sticky` (las tarjetas de `PilaScanner`): una
 * pieza clavada arriba no cambia su `top`, así que el avance se congela.
 */

/** El estado por elemento: sus letras y cuántas van encendidas. */
interface Texto {
  el: HTMLElement;
  letras: HTMLElement[];
  encendidas: number;
}

const textos: Texto[] = [];
let pendiente = false;

/**
 * Parte el texto en letras.
 *
 * 🔴 Se envuelve PALABRA por palabra y las letras van dentro. Partir en letras
 * sueltas rompe el salto de línea: el navegador puede cortar en medio de una
 * palabra porque cada letra es una caja independiente.
 *
 * 🔴 Y el original se conserva en `aria-label`, con las letras en `aria-hidden`.
 * Sin eso, un lector de pantalla anuncia el párrafo letra por letra — que es
 * exactamente el tipo de destrozo que estos efectos suelen dejar sin que nadie se
 * entere.
 */
function partir(el: HTMLElement): HTMLElement[] {
  /*
   * 🔴 Solo texto plano. Partir en letras implica vaciar el elemento y
   * reconstruirlo, así que sobre un párrafo con marcado —un enlace, una negrita,
   * un `code`— el efecto se llevaría por delante el enlace entero. Es un destrozo
   * silencioso: compila, se ve bien y la nota pierde sus ligas.
   *
   * En vez de intentar preservar el marcado, esto se NIEGA a actuar sobre él. Si
   * alguien le pone `data-escribir` al cuerpo de un artículo, no pasa nada — que es
   * el fallo correcto.
   */
  if (el.children.length) return [];

  const original = (el.textContent ?? '').replace(/\s+/g, ' ').trim();
  if (!original) return [];

  el.setAttribute('aria-label', original);
  el.textContent = '';

  const letras: HTMLElement[] = [];
  original.split(' ').forEach((palabra, i, todas) => {
    const cajaPalabra = document.createElement('span');
    cajaPalabra.className = 'escribir-palabra';
    cajaPalabra.setAttribute('aria-hidden', 'true');

    for (const caracter of palabra) {
      const letra = document.createElement('span');
      letra.className = 'escribir-letra';
      letra.textContent = caracter;
      cajaPalabra.appendChild(letra);
      letras.push(letra);
    }
    el.appendChild(cajaPalabra);

    // El espacio va FUERA de la palabra, para que ahí sí pueda cortar la línea.
    if (i < todas.length - 1) {
      const espacio = document.createElement('span');
      espacio.setAttribute('aria-hidden', 'true');
      espacio.textContent = ' ';
      el.appendChild(espacio);
    }
  });
  return letras;
}

/**
 * Cuánto se ha leído del párrafo, de 0 a 1.
 *
 * Empieza cuando su borde superior entra por el 85% de la pantalla y termina
 * cuando su borde inferior llega al 45%. O sea que se completa ANTES de que el
 * párrafo llegue al centro: si terminara al salir, uno leería el final todavía
 * apagado.
 */
function avance(el: HTMLElement): number {
  const r = el.getBoundingClientRect();
  const alto = window.innerHeight;
  const inicio = alto * 0.85;
  const fin = alto * 0.45;
  const recorrido = r.top - fin + (r.height || 1);
  const total = inicio - fin + (r.height || 1);
  return Math.min(1, Math.max(0, 1 - recorrido / total));
}

/**
 * Pinta el estado actual.
 *
 * Solo toca las letras que CAMBIARON desde el fotograma anterior. Recorrer las 200
 * letras en cada evento de scroll costaría más que el efecto, y en un teléfono se
 * nota.
 */
function pintar(): void {
  pendiente = false;

  /*
   * 🔴 Primero se MIDE todo, luego se ESCRIBE todo. Intercalar las dos cosas
   * —medir un párrafo, encenderle letras, medir el siguiente— obliga al navegador a
   * recalcular la maquetación en cada vuelta, porque cada escritura invalida la
   * medición que viene. Con varios párrafos en juego eso es un recálculo por
   * párrafo y por fotograma, y se siente en un teléfono.
   */
  const objetivos = textos.map((t) => Math.round(avance(t.el) * t.letras.length));

  textos.forEach((t, n) => {
    const objetivo = objetivos[n];
    if (objetivo === t.encendidas) return;

    if (objetivo > t.encendidas) {
      for (let i = t.encendidas; i < objetivo; i++) t.letras[i].dataset.on = '';
    } else {
      for (let i = objetivo; i < t.encendidas; i++) delete t.letras[i].dataset.on;
    }
    t.encendidas = objetivo;
  });
}

function alDesplazar(): void {
  if (pendiente) return;
  pendiente = true;
  requestAnimationFrame(pintar);
}

function iniciar(): void {
  textos.length = 0;

  /*
   * Si el lector pidió menos movimiento no se parte nada: el párrafo se queda como
   * vino del servidor, a opacidad plena. Es más limpio que partirlo y luego
   * encenderlo todo de golpe — y evita el destrozo del lector de pantalla.
   */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll<HTMLElement>('[data-escribir]').forEach((el) => {
    /*
     * 🔴 Si ya estaba partido, se RE-REGISTRA en vez de volver a partir.
     *
     * Pasa de verdad: al volver con el botón de atrás, el navegador puede restaurar
     * el DOM ya procesado y Astro dispara `astro:page-load` otra vez. Sin esto, la
     * guarda de contenido enriquecido vería los `span` de las letras como marcado,
     * se negaría a actuar, y el efecto no se degradaría — se APAGARÍA, dejando el
     * párrafo clavado a media luz para siempre.
     */
    const yaPartido = 'escribiendo' in el.dataset;
    const letras = yaPartido
      ? Array.from(el.querySelectorAll<HTMLElement>('.escribir-letra'))
      : partir(el);
    if (!letras.length) return;

    // El conteo se recalcula desde cero, así que se parte de un estado limpio.
    for (const l of letras) delete l.dataset.on;
    el.dataset.escribiendo = '';
    textos.push({ el, letras, encendidas: 0 });
  });
  if (textos.length) pintar();
}

export function prepararEscritura(): void {
  const w = window as Window & { __beatEscrituraLista?: boolean };
  if (w.__beatEscrituraLista) return;
  w.__beatEscrituraLista = true;

  document.addEventListener('astro:page-load', iniciar);
  addEventListener('scroll', alDesplazar, { passive: true });
  addEventListener('resize', alDesplazar, { passive: true });
}
