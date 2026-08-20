/**
 * Lectura de variables de entorno de SERVIDOR en tiempo de EJECUCIÓN.
 *
 * 🔴 Por qué existe este archivo: `import.meta.env.FOO` **se sustituye por su
 * valor al compilar**, no se lee al arrancar. Con `pnpm build` en local eso pasa
 * desapercibido, porque Vite carga el `.env` durante el build y el valor queda
 * horneado con el dato correcto. Pero en Docker la imagen se construye SIN
 * `.env` (está en `.dockerignore`), así que `import.meta.env.CMS_URL` compilaba a
 * cadena vacía y el contenedor ignoraba el `CMS_URL` que le pasaba Compose: el
 * sitio respondía 200 y **cero noticias**. Pasó tal cual en el primer despliegue
 * del beta de `web-enfoque` (31 jul 2026). No lo repitamos.
 *
 * `process.env` sí se lee al arrancar, que es lo que queremos para la config del
 * servidor: la MISMA imagen sirve para beta y para producción, cambiando solo el
 * entorno.
 *
 * ⚠️ Esto vale solo para variables **sin** prefijo `PUBLIC_`. Las `PUBLIC_*` van
 * también al JavaScript del navegador, donde `process.env` no existe: esas tienen
 * que seguir siendo de build (se pasan como `--build-arg`, ver Dockerfile).
 */

/**
 * `@types/node` no está instalado a propósito (el proyecto compila para navegador
 * y para SSR), así que se declara solo lo que se usa de `process`.
 */
declare const process: { env?: Record<string, string | undefined> };

/**
 * Valor de una variable de servidor. Prioriza `process.env` (ejecución) y cae a
 * `import.meta.env` (dev con `astro dev`, y builds locales con `.env` presente).
 */
export function envServidor(clave: string, porDefecto = ''): string {
  // `typeof process` en vez de `process` a secas: si este módulo acabara
  // arrastrado a un bundle de cliente, `process` no existe y tiraría un
  // ReferenceError en el navegador.
  const enEjecucion =
    typeof process !== 'undefined' && process.env ? process.env[clave] : undefined;
  if (enEjecucion !== undefined && enEjecucion !== '') return enEjecucion;

  const enBuild = (import.meta.env as Record<string, unknown>)[clave];
  if (typeof enBuild === 'string' && enBuild !== '') return enBuild;

  return porDefecto;
}
