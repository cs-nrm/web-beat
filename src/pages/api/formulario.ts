/**
 * El envío de un formulario del form-builder, desde el cuerpo de una nota.
 *
 * Existe por la regla 1 de agents/content.md: el navegador nunca habla con el
 * CMS, y en producción `CMS_URL` es una IP privada que ni siquiera alcanzaría.
 * Al otro lado, `POST /api/form-submissions` de `cms-estaciones` es público a
 * propósito para `create` (ver `formSubmissionOverrides` en su
 * `payload.config.ts`): un lector anónimo tiene que poder contestar. Leer las
 * respuestas sí está cerrado a admins.
 *
 * Lo que este archivo añade, y por qué no es un simple reenvío:
 *
 * · **Valida contra la DEFINICIÓN del formulario, que pide al CMS.** El plugin no
 *   comprueba que lo enviado coincida con sus campos: guarda lo que le llegue.
 *   Aquí solo pasan los campos que el formulario declara, con su tipo y su
 *   obligatoriedad. Lo demás que venga en la petición se tira.
 * · **Contesta a dos clientes.** `formulario.ts` manda `Accept: application/json`
 *   y recibe JSON. Un navegador sin JavaScript manda el `<form>` tal cual y recibe
 *   un 303 de vuelta a la nota con un ancla que el CSS lee con `:target`.
 *
 * `checkOrigin` de Astro ya rechaza los POST de formulario con un `Origin` ajeno
 * (por eso los dominios de `allowedDomains` en astro.config.mjs). El freno de
 * `Sec-Fetch-Site` de abajo es el mismo de `votar.ts`.
 */
import type { APIRoute } from 'astro';
import { CMS_URL } from '@/config/site';
import { cmsFetch } from '@/lib/cms/client';
import { camposConValor, redireccionSegura, rotulo } from '@/lib/formulario';
import type { Form } from '@/types/payload';

export const prerender = false;

const SIN_CACHE = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
} as const;

/** Topes por valor. Los mismos `maxlength` que pinta `Formulario.astro`. */
const TOPE_TEXTO = 500;
const TOPE_AREA = 5000;

/** Un correo con forma de correo. El navegador ya lo exige; esto es para el `curl`. */
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Estado = 'enviado' | 'error';

interface Salida {
  status: number;
  estado: Estado;
  error?: string;
  /** Adónde manda el formulario al terminar, si es de tipo redirección. */
  redirige?: string | null;
}

export const POST: APIRoute = async ({ request }) => {
  const origen = request.headers.get('sec-fetch-site');
  if (origen && origen !== 'same-origin') {
    return new Response(JSON.stringify({ error: 'Petición de otro sitio.' }), {
      status: 403,
      headers: SIN_CACHE,
    });
  }

  const quiereJson = (request.headers.get('accept') ?? '').includes('application/json');

  let datos: FormData;
  try {
    datos = await request.formData();
  } catch {
    return contestar({ status: 400, estado: 'error', error: 'Petición mal formada.' }, quiereJson, null);
  }

  const vuelta = destinoDeVuelta(datos);
  const salida = await procesar(datos);
  return contestar(salida, quiereJson, vuelta);
};

/**
 * Adónde vuelve el navegador sin JavaScript: la nota de la que salió, con el
 * ancla del formulario.
 *
 * Solo una RUTA del sitio, nunca una URL completa. Y no una que empiece con
 * `//`: para el navegador eso es otro host, y el endpoint se volvería una
 * redirección abierta.
 */
function destinoDeVuelta(datos: FormData): { ruta: string; ancla: string } | null {
  const ruta = String(datos.get('_volver') ?? '');
  const ancla = String(datos.get('_ancla') ?? '');
  // El `%` porque un slug con acento llega codificado (`%C3%A1`).
  if (!/^\/(?!\/)[\w\-./%]*$/.test(ruta) || !/^fm-\d+-\d+$/.test(ancla)) return null;
  return { ruta, ancla };
}

async function procesar(datos: FormData): Promise<Salida> {
  // La trampa para bots: una persona no ve ese campo. Se le contesta que todo
  // salió bien para que no aprenda a esquivarla, y no se reenvía nada.
  if (String(datos.get('_sitio') ?? '').trim()) return { status: 200, estado: 'enviado' };

  const id = Number(datos.get('_formulario'));
  if (!Number.isInteger(id) || id < 1) {
    return { status: 400, estado: 'error', error: 'Petición mal formada.' };
  }

  /*
    La definición sale de la caché del cliente (`cmsFetch`, cinco minutos): un
    formulario que un admin acaba de editar puede validarse un rato con la
    versión anterior. Es el mismo TTL con el que la nota pintó el formulario,
    así que lo que se valida es lo que el lector vio.
  */
  let form: Form;
  try {
    form = await cmsFetch<Form>(`forms/${id}`, { depth: 0 });
  } catch {
    return { status: 404, estado: 'error', error: 'Este formulario ya no existe.' };
  }

  const submissionData: { field: string; value: string }[] = [];
  const faltan: string[] = [];

  for (const campo of camposConValor(form)) {
    const crudo = datos.get(campo.name);
    let valor = typeof crudo === 'string' ? crudo.trim() : '';

    if (campo.blockType === 'checkbox') valor = valor ? 'true' : '';

    if (!valor) {
      if (campo.required) faltan.push(rotulo(campo));
      // El plugin exige `value` en cada fila, así que un campo opcional vacío
      // no se manda en vez de mandarse en blanco.
      continue;
    }

    const tope = campo.blockType === 'textarea' ? TOPE_AREA : TOPE_TEXTO;
    if (valor.length > tope) {
      return { status: 400, estado: 'error', error: `«${rotulo(campo)}» es demasiado largo.` };
    }
    if (campo.blockType === 'email' && !CORREO.test(valor)) {
      return { status: 400, estado: 'error', error: `«${rotulo(campo)}» no parece un correo.` };
    }
    if (campo.blockType === 'number' && !Number.isFinite(Number(valor))) {
      return { status: 400, estado: 'error', error: `«${rotulo(campo)}» tiene que ser un número.` };
    }
    if (campo.blockType === 'select' && !(campo.options ?? []).some((o) => o.value === valor)) {
      return { status: 400, estado: 'error', error: `Elige una opción de la lista en «${rotulo(campo)}».` };
    }

    submissionData.push({ field: campo.name, value: valor });
  }

  if (faltan.length) {
    return { status: 400, estado: 'error', error: `Falta llenar: ${faltan.join(', ')}.` };
  }

  if (!CMS_URL) return { status: 503, estado: 'error', error: 'No se pudo enviar.' };

  const control = new AbortController();
  const temporizador = setTimeout(() => control.abort(), 5000);
  let respuesta: Response;
  try {
    respuesta = await fetch(`${CMS_URL}/api/form-submissions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ form: id, submissionData }),
      signal: control.signal,
    });
  } catch {
    // 503 y no 500: es temporal, y el lector tiene que leer «vuelve a intentarlo».
    return { status: 503, estado: 'error', error: 'No se pudo enviar. Inténtalo otra vez.' };
  } finally {
    clearTimeout(temporizador);
  }

  if (!respuesta.ok) {
    /*
      El texto lo escribe ESTE archivo y no se reenvía el del CMS, igual que en
      `votar.ts`: la voz del sitio no debe cambiar sola si el CMS cambia una
      cadena. El detalle va al log, que es donde alguien lo puede leer.
    */
    console.warn(`[formulario] el CMS respondió ${respuesta.status} al formulario ${id}`);
    return { status: 502, estado: 'error', error: 'No se pudo enviar. Inténtalo otra vez.' };
  }

  return { status: 200, estado: 'enviado', redirige: redireccionSegura(form) };
}

function contestar(
  salida: Salida,
  quiereJson: boolean,
  vuelta: { ruta: string; ancla: string } | null,
): Response {
  if (quiereJson) {
    return new Response(
      JSON.stringify(
        salida.estado === 'enviado'
          ? { ok: true, redirige: salida.redirige ?? null }
          : { error: salida.error ?? 'No se pudo enviar.' },
      ),
      { status: salida.status, headers: SIN_CACHE },
    );
  }

  /*
    Sin JavaScript. 303 y no 302: después de un POST, el navegador tiene que
    volver con un GET. El motivo del error no viaja —la página es cacheable y no
    puede variar por visitante—; el aviso genérico del ancla pide revisar los
    campos, y el navegador ya exige los obligatorios antes de enviar.
  */
  const destino =
    salida.estado === 'enviado' && salida.redirige
      ? salida.redirige
      : vuelta
        ? `${vuelta.ruta}#${vuelta.ancla}-${salida.estado}`
        : '/';
  return new Response(null, {
    status: 303,
    headers: { location: destino, 'cache-control': 'no-store' },
  });
}
