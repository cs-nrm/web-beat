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
interface PubAds {
  refresh(slots?: Slot[]): void;
  enableSingleRequest(): void;
  collapseEmptyDivs(collapse?: boolean): void;
  disableInitialLoad(): void;
  addEventListener(evento: string, cb: (e: never) => void): void;
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
  if (!gt) return;

  gt.cmd.push(() => {
    // Al navegar, los divs de la página anterior ya no existen. Sin esto, GPT
    // guarda slots apuntando a nodos muertos y los `refresh` no pintan nada.
    if (definidos.length) gt.destroySlots(definidos);
    definidos = [];

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

    if (!definidos.length) return;

    // `collapseEmptyDivs` evita el hueco en blanco cuando no hay qué servir. El
    // v1 no lo tenía y dejaba marcos vacíos en la página.
    gt.pubads().collapseEmptyDivs(true);
    gt.pubads().enableSingleRequest();
    gt.enableServices();

    for (const slot of definidos) gt.display(slot.getSlotElementId());
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
