import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import tailwind from '@tailwindcss/vite';

// Front público de Beat 100.9 — Astro SSR sobre `cms-estaciones`.
// Modelo: `web-enfoque` (que a su vez copió de `web-mundial`). Las tres
// diferencias deliberadas de Enfoque respecto a los repos hermanos SSG se
// heredan aquí a propósito:
//   1. security.checkOrigin: true  → protección CSRF gratis para los POST de
//      sesión (login/registro de oyentes). `web-mundial` lo tiene en false;
//      NO heredar esa decisión.
//   2. Sin @astrojs/sitemap → los sitemaps los sirve el CMS. Dos sitemaps
//      compitiendo es peor que uno. (Y el `sitemap({ sitemap: '/sitemap.xml' })`
//      del web-beat viejo pasaba una opción que la integración no soporta, así
//      que anunciaba un archivo que nunca se generaba.)
//   3. Tailwind con los tokens de marca mapeados, no el config vacío de los
//      repos hermanos: acá sí hay design system.
//
// ⚠️ Tailwind entra por el PLUGIN DE VITE, no por `@astrojs/tailwind`. Esa
// integración se quedó en Tailwind 3 y en Astro 5 (su última versión declara
// `tailwindcss: ^3.0.24` y `astro: ^3||^4||^5`), así que es un callejón sin
// salida: mantenerla obligaba a quedarse dos majors atrás en las dos cosas.
export default defineConfig({
  // Dominio canónico de Beat, sin `www`. El `www` se resuelve con un 301 en el
  // edge (Caddy/Cloudflare), no aquí.
  site: process.env.PUBLIC_SITE_URL || 'https://beatdigital.mx',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  vite: { plugins: [tailwind()] },
  security: {
    checkOrigin: true,
    /**
     * 🔴 Sin esta lista, `Astro.url` en producción es SIEMPRE
     * `http://localhost/` — no es una suposición: el adaptador de node descarta
     * el `Host` que no puede validar y cae a "localhost"
     * (`astro/dist/core/app/node.js` → `validateHost`, que devuelve `undefined`
     * cuando `allowedDomains` está vacío).
     *
     * Dos consecuencias que muerden en producción, las dos ya medidas en
     * `web-enfoque`:
     *  1. Cualquier regla que mire el host de la petición (el `X-Robots-Tag` del
     *     middleware) creería que el sitio real es un despliegue de prueba, y
     *     dejaría TODO el sitio fuera de Google.
     *  2. `checkOrigin` compara el header `Origin` contra `url.origin`: con
     *     `localhost` de un lado y el dominio real del otro, **todo POST
     *     respondería 403**. Acá eso es el login y el registro de oyentes, o sea
     *     que muerde desde el día 1 — a diferencia de Enfoque, donde no mordía
     *     porque su bloque de formulario todavía era un andamio sin POST.
     *
     * Los patrones van solo con `hostname`: sin `protocol` ni `port` para que el
     * match no dependa de cómo termine resolviéndose el esquema detrás de Caddy
     * (que habla HTTP con el contenedor y anuncia HTTPS por `X-Forwarded-Proto`).
     * Un host que no esté aquí no se rechaza: simplemente vuelve a "localhost",
     * que es el lado seguro.
     *
     * ⚠️ Si algún día se levanta un staging real, su hostname TIENE que entrar
     * en esta lista o el sitio real podría salir `noindex`.
     */
    allowedDomains: [
      { hostname: 'beatdigital.mx' },
      /* El `www` va con 301 al apex en el edge y hoy no llega hasta aquí, pero si
         ese 301 se cayera, un host que NO esté en esta lista se resuelve como
         "localhost" y el middleware marcaría el sitio real como despliegue de
         prueba: `noindex` en todo. Listarlo cuesta una línea. */
      { hostname: 'www.beatdigital.mx' },
      /* Dominio viejo del WordPress. Durante la ventana de corte sigue vivo como
         respaldo, y conviene que este proceso sepa reconocerlo. */
      { hostname: 'beatdigital.com.mx' },
      { hostname: 'beta.beatdigital.mx' },
    ],
  },
  devToolbar: {
    enabled: true,
  },
});
