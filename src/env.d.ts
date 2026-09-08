/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

/**
 * 🔴 La regla de oro de este repo, y la fuente de un bug de producción ya pagado
 * en `web-enfoque` (ver `src/lib/env.ts`):
 *
 *   · `PUBLIC_*`  → se INCRUSTAN al compilar. Van como `--build-arg` del
 *                   Dockerfile y como Variables del repo en GitHub Actions.
 *                   Se leen con `import.meta.env`.
 *   · sin prefijo → se leen en EJECUCIÓN, con `envServidor()` de `src/lib/env.ts`.
 *                   Van en el `.env` de la VM. La misma imagen sirve para
 *                   staging y producción.
 *
 * Añadir una variable de SERVIDOR nueva no requiere tocar el compose ni el
 * workflow (el compose pasa el `.env` entero con `env_file`). Añadir una
 * `PUBLIC_*` nueva sí requiere tocar los dos.
 */
interface ImportMetaEnv {
  // ---------- Build (llegan al navegador) ----------
  /** URL pública del sitio, sin barra final. 🔴 Decide la indexación. */
  readonly PUBLIC_SITE_URL: string;
  /** Origen PÚBLICO del CMS: la media que carga el navegador. */
  readonly PUBLIC_CMS_URL?: string;
  /** Google Ad Manager. 🔴 Nunca hardcodear el ad unit — ver src/config/ads.ts. */
  readonly PUBLIC_GAM_NETWORK_ID?: string;
  readonly PUBLIC_GAM_AD_UNIT?: string;
  /**
   * ⚠️ Esta NO carga GA4. GA4 entra POR GTM —nunca por las dos vías, que duplican
   * las páginas vistas—, así que el front no baja `gtag/js` en ningún caso. Lo
   * único que la lee es el `trackingId` del SDK de Triton (`src/scripts/player.ts`).
   */
  readonly PUBLIC_GA_ID?: string;
  /**
   * Los cuatro contenedores de medición. Sin valor no se emite el snippet, y la
   * guarda vive en `src/layouts/Base.astro`: así ningún preview ensucia la
   * propiedad real —y comScore, que es lo que NRM reporta a anunciantes, no infla
   * una cifra certificada con tráfico de revisión.
   */
  readonly PUBLIC_GTM_ID?: string;
  readonly PUBLIC_COMSCORE_C2?: string;
  readonly PUBLIC_HOTJAR_ID?: string;
  readonly PUBLIC_METRICOOL_HASH?: string;

  // ---------- Runtime (solo servidor) ----------
  /** Origen INTERNO del CMS (API). Puede ser una IP privada de la VPC. */
  readonly CMS_URL?: string;
  /** `codigo` de la estación en la colección `estaciones` del CMS. Para este repo: `beat`. */
  readonly ESTACION_CODIGO?: string;
  /** TTL de la caché de respuestas del CMS, en ms. `0` la apaga (conserva el dedup). */
  readonly CACHE_CMS_MS?: string;
  /** Escape hatch de indexación: `1` fuerza noindex, `0` fuerza indexar. */
  readonly SITIO_NOINDEX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
