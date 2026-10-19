/**
 * El envío de los formularios del cuerpo de la nota, sin recargar la página.
 *
 * Es una mejora, no la única puerta: `Formulario.astro` pinta un `<form>` que
 * funciona sin este archivo (POST nativo, 303 de vuelta y `:target`). Aquí se
 * manda lo mismo por `fetch`, con `Accept: application/json`, para que la
 * respuesta aparezca en su sitio sin perder el scroll de la nota.
 *
 * El `submit` solo llega cuando el navegador ya validó los `required`, los
 * `type="email"` y los `maxlength`, así que este archivo no repite esas
 * comprobaciones. El endpoint sí las repite: un `curl` no pasa por el navegador.
 */

/**
 * Suelta el botón aunque la respuesta no llegue nunca. Es la prohibición de
 * forma de `movimiento.md` §3, la misma de `voto.ts`: ninguna bandera puesta
 * antes de una llamada asíncrona se libera solo dentro del callback. El
 * endpoint corta al CMS a los 5 s, así que diez es holgado.
 */
const PLAZO_MS = 10_000;

function avisar(form: HTMLFormElement, texto: string): void {
  const aviso = form.querySelector<HTMLElement>('[data-formulario-aviso]');
  if (!aviso) return;
  aviso.textContent = texto;
  aviso.hidden = false;
}

async function enviar(form: HTMLFormElement): Promise<void> {
  const boton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (boton?.disabled) return;

  const aviso = form.querySelector<HTMLElement>('[data-formulario-aviso]');
  if (aviso) aviso.hidden = true;

  if (boton) boton.disabled = true;
  let rescate: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
    rescate = undefined;
    if (boton) boton.disabled = false;
  }, PLAZO_MS);
  const soltar = (): void => {
    if (rescate !== undefined) clearTimeout(rescate);
    rescate = undefined;
    if (boton) boton.disabled = false;
  };

  let r: Response;
  try {
    r = await fetch(form.action, {
      method: 'POST',
      headers: { accept: 'application/json' },
      body: new FormData(form),
    });
  } catch {
    soltar();
    avisar(form, 'No se pudo enviar. Revisa tu conexión e inténtalo otra vez.');
    return;
  }

  let datos: { ok?: boolean; redirige?: string | null; error?: string } = {};
  try {
    datos = await r.json();
  } catch {
    /* Un cuerpo ilegible no cambia lo que dice el status. */
  }

  soltar();

  if (!r.ok || !datos.ok) {
    /*
      Un error se DICE: es la excepción de la regla de las zonas vacías. Un
      botón que no responde se ve igual que uno roto.
    */
    avisar(form, datos.error ?? 'No se pudo enviar. Inténtalo otra vez.');
    return;
  }

  // La URL ya la validó el endpoint: https o una ruta del propio sitio.
  if (datos.redirige) {
    window.location.assign(datos.redirige);
    return;
  }

  const caja = form.closest<HTMLElement>('[data-formulario-caja]');
  if (!caja) return;
  caja.dataset.estado = 'enviado';
  /*
    El foco va a las gracias: el botón que lo tenía acaba de desaparecer, y sin
    moverlo un lector de pantalla se quedaría en ningún sitio sin anunciar nada.
  */
  caja.querySelector<HTMLElement>('[data-formulario-gracias]')?.focus();
}

/**
 * Barre los restos de la visita anterior: un botón que se quedó deshabilitado
 * porque el lector se fue con la petición en vuelo, un aviso viejo, o la caja
 * en «enviado». Es el mismo barrido de `voto.ts`.
 */
function iniciar(): void {
  document.querySelectorAll<HTMLElement>('[data-formulario-caja]').forEach((caja) => {
    delete caja.dataset.estado;
    caja.querySelectorAll<HTMLButtonElement>('button[type="submit"]').forEach((b) => {
      b.disabled = false;
    });
    caja.querySelectorAll<HTMLElement>('[data-formulario-aviso]').forEach((a) => {
      a.hidden = true;
    });
  });
}

export function prepararFormulario(): void {
  const w = window as Window & { __beatFormularioListo?: boolean };
  if (w.__beatFormularioListo) return;
  w.__beatFormularioListo = true;

  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (!(form instanceof HTMLFormElement) || !form.matches('[data-formulario]')) return;
    e.preventDefault();
    void enviar(form);
  });

  document.addEventListener('astro:page-load', iniciar);
}
