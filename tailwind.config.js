/** @type {import('tailwindcss').Config} */

// 🔴 Regla del design system: este archivo NO contiene ni un valor literal — solo
// MAPEA las CSS vars del DS a utilidades de Tailwind. La fuente de verdad son los
// tokens en `src/styles/ds/tokens/`, copiados del lienzo de Claude Design
// (`design/Nuevo sitio de beat full/_ds/copy-of-beat-100-9-design-system-d47698bf-a64c-44d3-8ece-771863d80f6f/`).
// No hardcodear valores aquí: siempre referenciar `var(--*)`.
//
// Es la diferencia deliberada respecto a los repos hermanos SSG, que tienen este
// archivo VACÍO y los tokens de marca mezclados con sobras del starter de Astro.
//
// ⚠️ Al usar `var()` en `colors`, los modificadores de opacidad de Tailwind
// (`bg-surface-card/50`) NO funcionan. Es el precio de tener una sola fuente de
// verdad, y varios tokens del DS ya son rgba de por sí. Para transparencias, usar
// el token que corresponda en vez de un modificador.
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    // Se SOBREESCRIBEN los breakpoints por defecto de Tailwind (640/768/1024/1280)
    // con los del DS. Si no, `md:` significaría 768px en el código y 900px en el
    // diseño — la clase de desalineación que nadie detecta hasta que algo se ve
    // mal en tablet.
    screens: {
      sm: '640px',
      md: '900px',
      lg: '1200px',
      xl: '1440px',
    },
    extend: {
      colors: {
        // Rampas crudas. Preferir los semánticos de abajo.
        noche: {
          0: 'var(--noche-0)', 1: 'var(--noche-1)', 2: 'var(--noche-2)',
          3: 'var(--noche-3)', 4: 'var(--noche-4)', 5: 'var(--noche-5)',
        },
        mist: {
          0: 'var(--mist-0)', 1: 'var(--mist-1)', 2: 'var(--mist-2)',
          3: 'var(--mist-3)', 4: 'var(--mist-4)', 5: 'var(--mist-5)',
        },
        graphite: {
          1: 'var(--graphite-1)', 2: 'var(--graphite-2)', 3: 'var(--graphite-3)',
          4: 'var(--graphite-4)', 5: 'var(--graphite-5)',
        },
        // El acento no es un color, es una gama cálida (así lo define el DS).
        luz: {
          rosa: 'var(--luz-rosa)', coral: 'var(--luz-coral)', ambar: 'var(--luz-ambar)',
          rubor: 'var(--luz-rubor)', pale: 'var(--luz-pale)', ink: 'var(--luz-ink)',
        },
        // ── Semánticos: construir con estos ──
        surface: {
          canvas: 'var(--surface-canvas)',
          base: 'var(--surface-base)',
          raised: 'var(--surface-raised)',
          card: 'var(--surface-card)',
          'card-hover': 'var(--surface-card-hover)',
          sunken: 'var(--surface-sunken)',
          inverse: 'var(--surface-inverse)',
          accent: 'var(--surface-accent)',
          'accent-hover': 'var(--surface-accent-hover)',
          'accent-quiet': 'var(--surface-accent-quiet)',
          live: 'var(--surface-live)',
          'live-quiet': 'var(--surface-live-quiet)',
        },
        text: {
          primary: 'var(--text-primary)',
          body: 'var(--text-body)',
          muted: 'var(--text-muted)',
          // ⚠️ En tema claro da 4.00:1 → solo texto grande. Ver src/styles/beat.css.
          faint: 'var(--text-faint)',
          accent: 'var(--text-accent)',
          live: 'var(--text-live)',
          link: 'var(--text-link)',
          'link-hover': 'var(--text-link-hover)',
          'on-accent': 'var(--text-on-accent)',
          'on-live': 'var(--text-on-live)',
          'on-inverse': 'var(--text-on-inverse)',
        },
        borde: {
          hairline: 'var(--border-hairline)',
          quiet: 'var(--border-quiet)',
          strong: 'var(--border-strong)',
          accent: 'var(--border-accent)',
          live: 'var(--border-live)',
        },
        state: {
          success: 'var(--state-success)',
          warning: 'var(--state-warning)',
          danger: 'var(--state-danger)',
          onair: 'var(--state-onair)',
          'disabled-text': 'var(--state-disabled-text)',
          'disabled-surface': 'var(--state-disabled-surface)',
        },
      },

      fontFamily: {
        // Display es Archivo con el eje de ancho expandido (wdth 125), para que
        // los titulares hagan eco del wordmark. Necesita
        // `font-variation-settings: var(--font-display-settings)` — está en la
        // clase `.beat-display` del DS.
        display: 'var(--font-display)',
        text: 'var(--font-text)',
        mono: 'var(--font-mono)',
      },

      // Tamaños fijos en px, calzados a la retícula de 1240px del DS.
      // ⚠️ El DS no define escala responsiva: hay que resolverlo contra el
      // artboard móvil (`Sitio Beat 2026 móvil.dc.html`).
      fontSize: {
        'display-1': ['var(--size-display-1)', { lineHeight: 'var(--lh-display)' }],
        'display-2': ['var(--size-display-2)', { lineHeight: 'var(--lh-display)' }],
        'display-3': ['var(--size-display-3)', { lineHeight: 'var(--lh-tight)' }],
        h1: ['var(--size-h1)', { lineHeight: 'var(--lh-heading)' }],
        h2: ['var(--size-h2)', { lineHeight: 'var(--lh-heading)' }],
        h3: ['var(--size-h3)', { lineHeight: 'var(--lh-heading)' }],
        h4: ['var(--size-h4)', { lineHeight: 'var(--lh-heading)' }],
        'body-lg': ['var(--size-body-lg)', { lineHeight: 'var(--lh-body)' }],
        body: ['var(--size-body)', { lineHeight: 'var(--lh-body)' }],
        'body-sm': ['var(--size-body-sm)', { lineHeight: 'var(--lh-body)' }],
        caption: ['var(--size-caption)', { lineHeight: 'var(--lh-body)' }],
        micro: ['var(--size-micro)', { lineHeight: 'var(--lh-flat)' }],
        mono: ['var(--size-mono)', { lineHeight: '1.4' }],
        'mono-lg': ['var(--size-mono-lg)', { lineHeight: '1.4' }],
      },

      fontWeight: {
        regular: 'var(--w-regular)',
        medium: 'var(--w-medium)',
        semibold: 'var(--w-semibold)',
        bold: 'var(--w-bold)',
        black: 'var(--w-black)',
      },

      lineHeight: {
        display: 'var(--lh-display)',
        tight: 'var(--lh-tight)',
        heading: 'var(--lh-heading)',
        body: 'var(--lh-body)',
        relaxed: 'var(--lh-relaxed)',
        flat: 'var(--lh-flat)',
      },

      letterSpacing: {
        display: 'var(--track-display)',
        heading: 'var(--track-heading)',
        body: 'var(--track-body)',
        // Las etiquetas en mayúsculas van muy abiertas: es una firma del sistema.
        label: 'var(--track-label)',
        mono: 'var(--track-mono)',
      },

      // 🔴 La escala numérica de Tailwind NO se toca, y es a propósito.
      //
      // Al principio se mapeó `1..15` a los pasos `--s-N` del DS, y fue un error
      // que costó una vuelta: `h-12` dejó de ser 3rem y pasó a ser `--s-12` =
      // 72px, así que la barra del player salió a 72px en vez de 48 y el header a
      // 128 en vez de 68. Silencioso, porque la clase existe y compila.
      //
      // Al medirlo salió que el override no compraba nada: la escala por defecto
      // de Tailwind ya expresa **14 de los 15 pasos del DS, exactos** —s-4=8px es
      // `2`, s-6=16px es `4`, s-8=24px es `6`, s-9=32px es `8`…—. O sea que el DS
      // y Tailwind ya hablan la misma escala, solo con otros números. Lo único que
      // falta es el paso 15 (180px), que se agrega suelto.
      //
      // Aquí quedan solo los tokens SEMÁNTICOS, que sí aportan intención.
      spacing: {
        s15: 'var(--s-15)',
        card: 'var(--pad-card)',
        'card-lg': 'var(--pad-card-lg)',
        section: 'var(--pad-section)',
        'section-sm': 'var(--pad-section-sm)',
        contenedor: 'var(--container-pad)',
        // El pie va A SANGRE (decisión de Carlos, 2026-08-24) y en 13a lleva 56px
        // de respiro lateral, más generoso que el del contenido capado.
        pie: 'var(--pad-pie)',
      },

      gap: {
        grid: 'var(--gap-grid)',
        tile: 'var(--gap-tile)',
      },

      // Radios cortos y maquinados: el wordmark es angular y el sistema lo sigue.
      borderRadius: {
        1: 'var(--r-1)', 2: 'var(--r-2)', 3: 'var(--r-3)',
        4: 'var(--r-4)', 5: 'var(--r-5)',
        control: 'var(--r-control)',
        card: 'var(--r-card)',
        panel: 'var(--r-panel)',
        media: 'var(--r-media)',
        pill: 'var(--r-pill)',
      },

      borderWidth: {
        hairline: 'var(--bw-hairline)',
        strong: 'var(--bw-strong)',
      },

      boxShadow: {
        0: 'var(--shadow-0)',
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
        glass: 'var(--glass-highlight)',
        focus: '0 0 0 3px var(--focus-ring)',
      },

      maxWidth: {
        grid: 'var(--grid-max)',
      },

      // ⚠️ Los valores del ARTBOARD ganan sobre los del DS, que no coinciden: el
      // DS declara `--header-h: 64px` y `--player-h: 76px`, pero `Cabecera-Beat`
      // dibuja el header a 68px en escritorio y 56 en móvil, y la barra del player
      // a 48px en los dos. Se redefinen los tokens en `beat.css`.
      height: {
        header: 'var(--header-h)',
        'header-movil': 'var(--header-h-movil)',
        player: 'var(--player-h)',
      },

      width: {
        sidebar: 'var(--sidebar-w)',
      },

      // El player va POR ENCIMA del header (300 vs 200): es deliberado del DS y
      // encaja con que el reproductor persistente sea requisito de producto.
      zIndex: {
        base: 'var(--z-base)',
        raised: 'var(--z-raised)',
        sticky: 'var(--z-sticky)',
        header: 'var(--z-header)',
        player: 'var(--z-player)',
        overlay: 'var(--z-overlay)',
        dialog: 'var(--z-dialog)',
        toast: 'var(--z-toast)',
      },

      transitionDuration: {
        1: 'var(--dur-1)', 2: 'var(--dur-2)', 3: 'var(--dur-3)',
        4: 'var(--dur-4)', 5: 'var(--dur-5)',
      },

      transitionTimingFunction: {
        out: 'var(--ease-out)',
        'in-out': 'var(--ease-in-out)',
      },

      backdropBlur: {
        glass: '18px',
      },

      // Los keyframes ya vienen del DS (tokens/motion.css) y respetan
      // prefers-reduced-motion. Aquí solo se exponen como utilidades.
      animation: {
        pulse: 'beat-pulse var(--dur-5) var(--ease-in-out) infinite',
        bars: 'beat-bars var(--dur-4) var(--ease-in-out) infinite',
        marquee: 'beat-marquee 22s linear infinite',
        sweep: 'beat-sweep var(--dur-5) var(--ease-out)',
      },
    },
  },
  plugins: [],
};
