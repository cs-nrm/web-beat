/** @type {import('tailwindcss').Config} */

// 🔴 Regla del design system: este archivo NO contiene ni un valor literal —
// solo MAPEA las CSS vars del DS a utilidades de Tailwind. La fuente de verdad son
// los tokens en `src/styles/`, que salen del export del lienzo de Claude Design
// (`design/<iteracion>/_ds/tokens/*.css`). No hardcodear colores aquí: siempre
// referenciar `var(--*)`.
//
// Es la diferencia deliberada respecto a los repos hermanos SSG, que tienen este
// archivo VACÍO (`theme.extend: {}`) y los tokens de marca mezclados con sobras del
// starter de Astro dentro de un `global.css` de 1170 líneas — donde el
// `--accent: #2337ff` del template convivía con `--yellow-beat: #ffeb3b`.
//
// ⏳ PENDIENTE (B3 del plan): los tokens reales llegan al exportar el lienzo
// "Sitio Beat 2026 v13" a `design/`. Hasta entonces este `extend` va vacío a
// propósito, para no inventar una paleta que después haya que tirar.
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
