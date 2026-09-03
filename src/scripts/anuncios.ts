/**
 * Publicidad — GPT / Google Ad Manager.
 *
 * Portado de `src/js/ads.js` del sitio v1, con una diferencia de fondo: allá los
 * 13 slots estaban **escritos a mano en el script**, cada uno con su id de div, su
 * `defineSlot` y su `display()`, y el ad unit pegado en cada línea. Agregar un
 * hueco pedía tocar el script; quitar uno dejaba un `display()` huérfano.
 *
 * Aquí el marcado DECLARA sus huecos con `data-*` y el script los descubre. Un
 * `<Anuncio />` nuevo en cualquier página entra solo.
 *
 * 🔴 EL AD UNIT SALE DEL ENV, JAMÁS DEL CÓDIGO. Es línea roja de la casa por una
 * razón de dinero: en los repos hermanos está pegado por copy-paste
 * (`/<network>/StereoCien`), y servir impresiones de una estación a la cuenta de
 * otra factura mal. Hay una guarda de grep en CI.
 */
import { ga4 } from './analitica';

interface Slot {
  getSlotElementId(): string;
}
/** Lo único que nos interesa de `slotRenderEnded`: quién y si vino vacío. */
interface EventoRender {
  slot: Slot;
  isEmpty: boolean;
}
interface PubAds {
  refresh(slots?: Slot[]): void;
  disableInitialLoad(): void;
  addEventListener(evento: 'slotRenderEnded', cb: (e: EventoRender) => void): void;
}
interface SlotEnConstruccion extends Slot {
  defineSizeMapping(m: unknown): SlotEnConstruccion;
  addService(s: unknown): SlotEnConstruccion;
  setTargeting(clave: string, valor: string): SlotEnConstruccion;
}
interface ConstructorMapping {
  addSize(viewport: [number, number], tamanos: Array<[number, number]>): ConstructorMapping;
  build(): unknown;
}
interface GoogleTag {
  cmd: Array<() => void>;
  setConfig(config: Record<string, unknown>): void;
  apiReady?: boolean;
  destroySlots(slots?: Slot[]): boolean;
  defineSlot(ruta: string, tamanos: unknown, div: string): SlotEnConstruccion | null;
  sizeMapping(): ConstructorMapping;
  pubads(): PubAds;
  enableServices(): void;
  display(div: string): void;
}

declare global {
  interface Window {
    googletag?: GoogleTag;
    __beatAnunciosListo?: boolean;
  }
}

/** Los slots definidos en la página actual, para destruirlos al navegar. */
let definidos: Slot[] = [];

/**
 * El plazo tras el cual un hueco del que no se sabe nada se da por vacío.
 *
 * 🔴 Existe porque el fallo más común de la publicidad no es «GAM dice que no
 * tiene»: es que GAM **no contesta nunca** —un bloqueador, una red que corta
 * `securepubads`, un `gpt.js` que no bajó—. En ese caso `slotRenderEnded` no
 * llega, y sin este plazo la banda de portada se queda abierta y negra para
 * siempre. Es el patrón de «bandera que solo se suelta en el callback» que ya
 * costó la inclinación de las tarjetas y la radio entera de una sesión.
 *
 * 3.5 s: por encima de cualquier respuesta normal de GAM (cientos de ms) y por
 * debajo de lo que alguien aguanta mirando un hueco.
 */
const PLAZO_VACIO = 3500;

let temporizador: ReturnType<typeof setTimeout> | undefined;

/** El `.anuncio` que envuelve a un hueco, que es lo que se esconde. */
function marcoDe(id: string): HTMLElement | null {
  return document.getElementById(id)?.closest<HTMLElement>('.anuncio') ?? null;
}

/**
 * Cierra el hueco, o lo reabre si esta vez sí hubo anuncio.
 *
 * Reabrir importa: al navegar, GPT redefine los slots sobre un DOM nuevo, pero si
 * un `data-vacio` sobreviviera el hueco quedaría escondido con un creativo dentro
 * — servido, facturado y sin que nadie lo vea.
 */
function marcar(id: string, vacio: boolean): void {
  const marco = marcoDe(id);
  if (!marco) return;
  if (vacio) marco.dataset.vacio = '';
  else delete marco.dataset.vacio;
}

/**
 * La ruta del ad unit.
 *
 * `sub` es la sub-unidad opcional (`Box`, `Box2`…), que en el v1 servía para que
 * cada caja tuviera su propio inventario. Se valida: un `sub` con `/` o `..`
 * construiría una ruta a otra unidad, y eso es facturar a la cuenta equivocada.
 */
function rutaUnidad(sub?: string | null): string | null {
  const red = import.meta.env.PUBLIC_GAM_NETWORK_ID;
  const unidad = import.meta.env.PUBLIC_GAM_AD_UNIT;
  if (!red || !unidad) return null;
  const limpio = sub && /^[A-Za-z0-9_-]+$/.test(sub) ? `/${sub}` : '';
  return `/${red}/${unidad}${limpio}`;
}

/** Lee un `data-` con JSON, devolviendo `null` si viene mal escrito. */
function leerJson<T>(valor: string | undefined): T | null {
  if (!valor) return null;
  try {
    return JSON.parse(valor) as T;
  } catch {
    return null;
  }
}

type Medida = [number, number];
type Regla = [Medida, Medida[]];

/**
 * Define y muestra los huecos de la página.
 *
 * 🔴 TODO va dentro de `googletag.cmd.push`. Fuera, en móvil o con red lenta,
 * `googletag` es solo el stub que puso el snippet y `destroySlots` no existe
 * todavía: el TypeError cancela la inicialización entera y la página se queda sin
 * un solo anuncio. Está documentado así en `dynamicAds.md`.
 */
export function iniciarAnuncios(): void {
  const gt = window.googletag;
  /*
    Sin `googletag` no hay nada que esperar: ni el stub llegó a existir, así que
    ningún hueco se va a llenar. Se cierran de una vez en vez de dejar los marcos
    abiertos indefinidamente.
  */
  if (!gt) {
    for (const h of document.querySelectorAll<HTMLElement>('[data-anuncio]')) {
      h.closest<HTMLElement>('.anuncio')?.setAttribute('data-vacio', '');
    }
    return;
  }

  gt.cmd.push(() => {
    // Al navegar, los divs de la página anterior ya no existen. Sin esto, GPT
    // guarda slots apuntando a nodos muertos y los `refresh` no pintan nada.
    if (definidos.length) gt.destroySlots(definidos);
    definidos = [];
    // Y el plazo de la página anterior tampoco vale: sus ids ya no están.
    clearTimeout(temporizador);

    const huecos = Array.from(document.querySelectorAll<HTMLElement>('[data-anuncio]'));
    if (!huecos.length) return;

    for (const hueco of huecos) {
      const ruta = rutaUnidad(hueco.dataset.unidad);
      if (!ruta || !hueco.id) continue;

      const tamanos = leerJson<Medida[]>(hueco.dataset.tamanos);
      const reglas = leerJson<Regla[]>(hueco.dataset.mapping);
      if (!tamanos?.length) continue;

      const slot = gt.defineSlot(ruta, tamanos, hueco.id);
      if (!slot) continue;

      /*
        🔴 UN slot por formato, con `sizeMapping`. Nunca un slot de escritorio y
        otro de móvil apuntando al mismo hueco: en el v1 eso causó DOBLE
        IMPRESIÓN, porque los dos se contaban aunque solo uno se viera.
      */
      if (reglas?.length) {
        const mapping = reglas
          .reduce((m, [viewport, medidas]) => m.addSize(viewport, medidas), gt.sizeMapping())
          .build();
        slot.defineSizeMapping(mapping);
      }

      slot.addService(gt.pubads());
      definidos.push(slot);
    }

    /*
      Ningún slot se pudo definir —falta el ad unit del env, o los `data-` vienen
      mal—: se cierran los marcos. Con `return` a secas quedaban abiertos, y el
      caso NO es hipotético: es exactamente lo que pasa en cualquier despliegue sin
      `PUBLIC_GAM_NETWORK_ID`, que es como corre hoy el sitio en local.
    */
    if (!definidos.length) {
      for (const hueco of huecos) marcar(hueco.id, true);
      return;
    }

    /*
      Cierra el hueco cuando GAM no tiene qué servir. El v1 no lo hacía y dejaba
      marcos vacíos en la página.

      ⚠️ Va por `setConfig({ collapseDiv })` y no por `pubads().collapseEmptyDivs()`:
      GPT avisa en consola que ese método está **deprecado**. Lo cazamos en la
      consola del navegador el mismo día que se escribió, así que no llegó a
      producción — pero es el tipo de aviso que se ignora hasta que un día el
      método desaparece y los huecos vacíos vuelven sin que nadie toque nada.
    */
    gt.setConfig({ collapseDiv: 'ON_NO_FILL' });

    /*
      `collapseDiv` cierra el DIV del slot, pero no el marco que lo envuelve: el
      rótulo «PUBLICIDAD» y el alto reservado son nuestros, no de GPT. Esto es lo
      que se lleva el marco entero.

      ⚠️ Se registra ANTES de `enableServices()`. Después, el primer render puede
      haber ocurrido ya y el evento se pierde — con la banda quedándose abierta
      justo en la carga inicial, que es la que importa.

      🔴 `atendidos` es lo que distingue «GAM dijo que no tiene» de «GAM no
      contestó». Sin esa distinción el plazo de abajo escondería también los huecos
      que sí se llenaron, si el creativo tardó más que el plazo.
    */
    const atendidos = new Set<string>();
    gt.pubads().addEventListener('slotRenderEnded', (e) => {
      const id = e.slot.getSlotElementId();
      atendidos.add(id);
      marcar(id, e.isEmpty);
    });

    /*
      ⚠️ `setConfig({ singleRequest })` y NO `pubads().enableSingleRequest()`.

      GPT avisa en consola que ese método está **deprecado**, con el mismo tono con
      el que avisó de `collapseEmptyDivs` — que ya migramos por eso mismo, dos
      líneas más arriba. Lo cazó la consola mientras se probaba otra cosa, así que
      no llegó a producción; pero es el tipo de aviso que se ignora hasta que un
      día el método desaparece y las peticiones vuelven a salir de una en una, sin
      que nadie toque nada.
    */
    gt.setConfig({ singleRequest: true });
    gt.enableServices();

    for (const slot of definidos) gt.display(slot.getSlotElementId());

    /*
      Y el plazo: lo que no contestó, se cierra. Ver `PLAZO_VACIO`.
    */
    const pendientes = definidos.map((s) => s.getSlotElementId());
    temporizador = setTimeout(() => {
      for (const id of pendientes) if (!atendidos.has(id)) marcar(id, true);
    }, PLAZO_VACIO);
  });
}

/**
 * Cablea la inicialización a Astro.
 *
 * 🔴 El listener se registra UNA sola vez. `astro:page-load` dispara en la carga
 * inicial **y** en cada navegación; si el módulo lo registrara de nuevo en cada
 * una, la enésima navegación ejecutaría `iniciarAnuncios` n veces y cada pasada
 * destruiría los slots que acababa de crear la anterior.
 */
export function prepararAnuncios(): void {
  if (window.__beatAnunciosListo) return;
  window.__beatAnunciosListo = true;

  document.addEventListener('astro:page-load', () => {
    iniciarAnuncios();
    ga4('anuncios_init', { ruta: location.pathname });
  });
}
