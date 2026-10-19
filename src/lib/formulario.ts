/**
 * Lo que comparten `Formulario.astro` (que pinta) y `/api/formulario` (que
 * valida y reenvía): los tipos de campo que el front sabe tratar y cómo se lee
 * un texto enriquecido del form-builder.
 *
 * Los formularios son de `@payloadcms/plugin-form-builder` en `cms-estaciones`
 * (colección `forms`, sin estación). Sus tipos de campo vienen de
 * `src/types/payload.ts`: `text`, `textarea`, `email`, `number`, `select`,
 * `checkbox`, `country`, `state` y `message`. El CMS quitó `payment` a propósito
 * —Stripe no está conectado— y `radio`, `date` y `upload` no están encendidos.
 * Un tipo que no esté en `TIPOS_CON_VALOR` no se pinta NI se valida: los dos
 * lados lo ignoran por igual, así que nunca se exige un campo que no se ve.
 */
import type { Form } from '@/types/payload';

export type CampoForm = NonNullable<Form['fields']>[number];

/** Los campos que llevan un valor que el lector escribe o elige. */
export const TIPOS_CON_VALOR = new Set([
  'text',
  'textarea',
  'email',
  'number',
  'select',
  'checkbox',
  'country',
  'state',
]);

/** Campos que sí llevan `name` y valor, ya filtrados. */
export type CampoConValor = Extract<CampoForm, { name: string }>;

export function camposConValor(form: Pick<Form, 'fields'>): CampoConValor[] {
  return (form.fields ?? []).filter(
    (c): c is CampoConValor => TIPOS_CON_VALOR.has(c.blockType) && 'name' in c && Boolean(c.name),
  );
}

/** El rótulo que ve el lector: el `label` del admin, o el `name` si se dejó vacío. */
export function rotulo(c: CampoConValor): string {
  return c.label?.trim() || c.name;
}

interface NodoTexto {
  text?: string;
  children?: NodoTexto[];
}

/**
 * Los párrafos de un texto enriquecido del form-builder (el bloque `message` y
 * el `confirmationMessage`), como texto plano.
 *
 * Sin formato a propósito: son una o dos frases de instrucciones o de gracias.
 * Pintarlos con `Lexical.astro` metería una importación circular —ese componente
 * es el que monta este formulario— y heredaría estilos de cuerpo de nota, como el
 * de la entrada en el primer párrafo, que aquí no tocan.
 */
export function parrafos(rico: unknown): string[] {
  const raiz = (rico as { root?: NodoTexto } | null)?.root;
  const texto = (n: NodoTexto): string => n.text ?? (n.children ?? []).map(texto).join('');
  return (raiz?.children ?? []).map(texto).map((t) => t.trim()).filter(Boolean);
}

/**
 * La URL de redirección del formulario, si es segura de seguir.
 *
 * Solo https o una ruta del propio sitio. Una ruta que empiece con `//` es de
 * OTRO host para el navegador, así que se rechaza igual que un `javascript:`.
 */
export function redireccionSegura(form: Pick<Form, 'confirmationType' | 'redirect'>): string | null {
  if (form.confirmationType !== 'redirect') return null;
  const url = form.redirect?.url?.trim();
  if (!url) return null;
  if (/^\/(?!\/)/.test(url)) return url;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}
