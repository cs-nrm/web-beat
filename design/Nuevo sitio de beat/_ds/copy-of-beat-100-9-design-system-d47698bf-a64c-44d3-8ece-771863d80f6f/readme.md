# Beat 100.9 — Design System

Sistema de diseño para el **rebranding de Beat 100.9 FM**, estación de música electrónica de la Ciudad de México (XHSON-FM, 100.9 MHz). El sistema es **claro**: neblina gris-verde, grafito, y una gama de luz cálida —rosa, coral, ámbar— que sólo marca lo que está al aire. Precisión de interfaz con efectos de movimiento: estelas de luz, glitch y barrido.

## Contexto de marca

Beat 100.9 transmite electrónica y sus géneros —house, techno, trance, progressive, deep, chill— 24/7 desde CDMX, con programas conducidos por DJs y locutores (*BREAK*, *Beat en Penumbra*, *Lounge Beat*). Su portal editorial, **beatdigital.mx**, publica noticias de escena, lanzamientos, listas (*Beat Ten*) y promociones, junto al reproductor en vivo. El eslogan histórico de la estación es *"100.9% Música Electrónica"*.

Superficies que cubre el sistema:

1. **Sitio web** — portal editorial + reproductor en vivo (referencia: beatdigital.mx).
2. **Gráficos para redes sociales** — post 1:1 y story 9:16.
3. **Plantilla de presentación** — deck 16:9 para ventas y prensa.
4. **Email / newsletter** — envío editorial semanal.

## Fuentes recibidas

| Fuente | Qué es | Estado |
| --- | --- | --- |
| `uploads/Captura de pantalla 2026-08-10 a la(s) 12.48.05 p.m..jpg` | Logotipo Beat 100.9 en negro sobre blanco, 397×170 px | Única fuente de marca entregada. Recortado y limpiado a PNG con transparencia en `assets/logo/` |
| `assets/reference/luz-01.jpg`, `luz-02.jpg` | Dos referencias de mood entregadas por el cliente: retratos en movimiento sobre neblina gris-verde con estelas de neón cálido | Base de la paleta y de los motivos de movimiento |
| Brief y decisiones del cliente | Dirección *futuristic tech en blanco*; acento como "luz en diferentes tonos"; efectos tipo glitch; tipografía display expandida + grotesca neutra; copy en español (MX); tono directo y enérgico; el logotipo se mantiene igual | Aplicado |
| Contexto público de la estación (beatdigital.mx y directorios de radio) | Formato, programas, secciones editoriales, eslogan | Usado sólo para nombres reales en los mocks |

**No se recibió**: archivo vectorial del logotipo, tipografías licenciadas, fotografía propia, repositorio de código del sitio, archivo de Figma. Todo lo visual fuera del logotipo es propuesta nueva de rebranding. Ver **Sustituciones y pendientes**.

> Recorrido de la dirección: una primera propuesta en negro con cian se descartó; una segunda en claro ("neblina") fijó el concepto —gama de luz cálida, estelas y glitch— y el cliente pidió llevar **ese mismo concepto a fondo negro**, que es el sistema aquí documentado. Queda un único set claro, `[data-theme="neblina"]`, para momentos de respiro; no es una interfaz alterna.

---

## CONTENT FUNDAMENTALS

**Idioma.** Español de México, siempre. Los nombres de géneros y formatos se dejan en inglés, sin cursivas: *house*, *techno*, *deep*, *progressive*, *drop*, *set*, *live*. Nunca se traducen.

**Persona.** Primera persona del plural sólo para promesas operativas ("Transmitimos 24/7"). Al oyente se le habla de **tú**: "Escucha en vivo", "Guarda tu track".

**Tono: directo y enérgico.** Frases cortas, verbo al frente, cero relleno. El dato antes del adjetivo.

- Sí: `Matutino. Conducción en vivo, de 6 a 10.`
- Sí: `Suena ahora: Fade Into You · Kölsch`
- No: `¡Prepárate para vivir una experiencia sonora inolvidable con lo mejor de la música!`

**Casing.** Títulos de sección y titulares display en **CAJA ALTA** (el display se dibujó para eso). Titulares editoriales de nota en caja normal, sin punto final. Etiquetas y metadatos en caja alta mono con tracking amplio: `AHORA SUENA`, `EN VIVO`, `06:00 — 10:00`.

**Números y horarios.** Formato 24 h con guion largo espaciado: `06:00 — 10:00`. La frecuencia siempre `100.9 FM`; el dial se escribe `100.9`, nunca "1009". Fechas: `10 ago 2026`.

**Longitudes.** Kicker ≤ 3 palabras. Titular display ≤ 5 palabras. Titular de nota ≤ 12 palabras. Bajada ≤ 2 líneas. Botón: 1–3 palabras en imperativo (`Escuchar en vivo`, `Ver programación`, `Suscribirme`).

**Signos.** `·` separa metadatos (`Kölsch · Matutino`). Se abren `¿` y `¡` siempre, pero se usan poco: la energía viene del ritmo de la frase.

**Emoji: no.** Ni en interfaz, ni en newsletter, ni en gráficos. El equivalente Beat es el punto de aire pulsante, las barras de ecualizador y las estelas de luz.

**Vibra.** Estudio con luz de día y una señal que atraviesa el cuadro: técnico, limpio, en movimiento. No es flyer de rave ni cabina a oscuras.

---

## VISUAL FOUNDATIONS

### Color
Negro como lienzo: `--noche-0` #050706, con `--noche-1` … `--noche-5` para superficies (es un negro con una gota de verde, no un gris azulado). Neblina para el texto: `--mist-2` #E7EBE9 en cuerpo, `--mist-5` #AEB8B5 en apagados, blanco puro en títulos. **La acción es neutra**: el botón primario es blanco `--mist-0` con texto negro, no un color. El acento no es un tono único sino una **gama de luz**: `--luz-rosa` #FF6E93, `--luz-coral` #FF6A3D, `--luz-ambar` #FFA24B —ámbar para texto sobre negro, coral para superficies— más `--luz-rubor` #FFB3C6 para halos. Regla dura: **la luz cálida sólo marca lo que suena** —aire, play, pestaña activa, ecualizador—. Si aparece en algo que no suena, está mal usada. Semánticos (verde/ámbar/rojo) sólo en toasts y validación. `[data-theme="neblina"]` es el único set claro: una sección de deck, papel, prensa. Máximo dos fondos por pieza.

### Tipografía
**Display: Archivo con el eje de ancho en 125** (expandida), peso 700–800, caja alta, tracking −0.03em, interlínea 0.92 — ese ancho rima con el wordmark. **Texto: Schibsted Grotesk**, 400/500/600, interlínea 1.55. **Mono: Martian Mono** para metadatos, horarios, dial y etiquetas de caja alta con tracking 0.14em. Escala fija en px (88/64/48 display; 40/30/23/19 titulares; 18/16/14/13/11 texto). El titular grita, el cuerpo se lee: nunca display en párrafos.

### Espacio y layout
Base 4 con pasos intermedios de 2 y 6 (`--s-1` 2px … `--s-13` 96px). Grid web de 12 columnas, máximo 1240px, gutter 24px. Secciones separadas 96px; tarjetas con 20px de relleno. Header fijo de 64px; barra de reproducción fija de 76px anclada abajo (`--z-player`). El negro vacío es parte del diseño: antes una sección desierta que una sección rellena.

### Fondos
Negro plano o el degradado `--grad-noche` (noche-2 → noche-0, 168°). Sobre eso, cuatro recursos en orden de frecuencia: (1) **retícula de 1px cada 48px** (`--tex-grid`, blanco al 5%) como plano técnico; (2) **estelas de luz** (ver Motivos), que sobre negro son luz real y no una línea de color; (3) **halos radiales** muy difusos en rosa y ámbar (`--grad-halo`) detrás de héroes; (4) **degradados de protección** (`--grad-scrim-b`) bajo imagen. Sin fotografía propia todavía: los huecos se muestran con la retícula y una etiqueta mono. Nada de gradientes morados ni de fondos a color pleno saturado.

### Motivos: estelas, glitch, barrido
El movimiento de la referencia se sistematiza en tres familias, **una por pieza, nunca las tres juntas**:

- **Estelas** — `.beat-streak` (2–3px, degradado rosa→coral→ámbar, glow suave), `.is-soft` (7–22px desenfocada), `.is-thin` (1px). Se usan en grupos de 3 a 5, horizontales, de largos distintos y **jamás centradas ni simétricas**: son traza de movimiento, no decoración. Pueden cruzar el titular.
- **Glitch** — aberración de canal, no sombra: `.beat-glitch` desfasa el texto en rosa arriba-derecha (crisp, 0.105em) y en ámbar abajo-izquierda (desenfocado, 0.056em). Las magnitudes, ejes y nitideces son distintas a propósito: nunca debe leer simétrico. `.is-soft` para subtítulos, `.is-hard` para portadas y datos grandes, `.is-torn` añade un corte de señal fuera del centro, `.is-live` lo salta cada 4.4s en pasos de un frame. **Sólo en display**, nunca en cuerpo ni en interfaz funcional.
- **Barrido** — `.beat-smear` duplica el bloque desenfocado y desplazado 6%: el sujeto se mueve. Reservado para imagen y bloques grandes.

Además `.beat-grid` (retícula) y `.beat-scan` (scanlines de 1px cada 3px) para superficies técnicas.

### Vidrio y transparencia
Superficie firma: blanco al 4.5% (`--surface-card`) + `backdrop-filter: blur(18px) saturate(130%)` + filo hairline al 12% + luz superior blanca al 7%. Se usa cuando hay algo detrás que vale la pena insinuar: header, player, tarjetas sobre halo, estelas o foto. **No** sobre negro liso —no hay nada que desenfocar— ni en diálogos con texto largo, que van opacos (`--noche-2`).

### Bordes, radios y tarjetas
Todo borde es hairline de 1px en blanco al 10/16/30%; nunca una línea gris sólida. Radios cortos y maquinados: 3, 6, 10, 16, 24 px, más píldora para tune-in y filtros. Una tarjeta = radio 10px + relleno 20px + vidrio + anillo interior hairline, **sin sombra proyectada**. En hover aclara el fondo (4.5% → 8%) y sube el anillo al 16%. Sin borde de color a la izquierda salvo en toasts.

### Sombras y glow
Sobre negro la sombra casi no separa: `--shadow-1/2/3` existen para despegar modales y menús, y el trabajo real lo hacen el filo hairline y el glow. El **glow es cálido y semántico**: `--glow-luz` para el aire y el foco, `--glow-blanco` para el hover del primario, `--glow-onair` para el punto pulsante. Nada decorativo brilla.

### Estados
Hover: el primario pasa de blanco a `--mist-2` con glow blanco; el vidrio sube de 4.5% a 8%. Press: escala a `0.985` (`--press-scale`), sin cambiar color. Foco: anilla coral de 2px con offset (`--ring-focus`), siempre visible. Deshabilitado: fondo blanco al 5%, texto `--graphite-2`, cursor `not-allowed`. Seleccionado en filtros: se invierte a blanco con texto negro.

### Movimiento
Rápido y seco. 120/180/280 ms, `--ease-out` cubic-bezier(.16,1,.3,1) para entradas, `--ease-in-out` para desplazamientos. Sin bounce, sin resortes, sin parallax. Animaciones en bucle sólo ligadas al audio: `beat-pulse` (punto de aire, 1.6s), `beat-bars` (ecualizador, 0.9s) y `beat-glitch-shift` (4.4s, sólo en display). Todo respeta `prefers-reduced-motion`.

### Imagen
La referencia del cliente define el mood: **retratos en movimiento**, sujeto desenfocado por movimiento, piel cálida, estelas de luz atravesando el cuadro, algo de aberración/glitch en los bordes. Aquí el fondo baja a negro y la luz cálida queda como único color del encuadre: alto contraste, negros que se funden con el lienzo, grano de ISO alto permitido. Recortes: 4:5 para héroes, 1:1 para programas, 16:9 para notas lead. Con texto encima, siempre scrim (`--grad-scrim-b`). Nunca saturación de flyer.

---

## ICONOGRAPHY

La estación **no entregó** un set de iconos, sprite ni fuente de iconos. Sustitución documentada: **Lucide** (2px de trazo, esquinas redondeadas, geometría de 24px), servido desde CDN, inyectado como SVG y pintado con `currentColor` a través del componente `Icon`.

- Uso: `<Icon name="play" size={20} />`. Nombres en kebab-case de Lucide.
- Set base: `play`, `pause`, `radio-tower`, `volume-2`, `heart`, `share-2`, `search`, `menu`, `x`, `clock`, `calendar`, `chevron-right`, `arrow-up-right`, `more-horizontal`, `check`, `alert-triangle`, `instagram`, `youtube`.
- Tamaños: 14 (metadatos), 16–18 (por defecto), 22 (transporte grande). El trazo no se escala: 2px en todos los tamaños.
- **Emoji: nunca.** **Unicode como icono: sólo `·`** para separar metadatos.
- Los únicos gráficos dibujados del sistema son las barras del ecualizador, el punto de aire y las estelas: `<div>` con CSS, no SVG.
- Cuando exista set propio: se copia en `assets/icons/` y se cambia la constante `LUCIDE` de `components/core/Icon.jsx` por la ruta local.

**Logotipo.** Sólo existe el bitmap entregado, limpiado a dos tonos: `assets/logo/beat-1009-white.png` (uso por defecto, sobre negro) y `beat-1009-black.png` (sobre el set claro y en papel), más el original `beat-1009-source.jpg`. El recorte útil es 350×107 px: **no usar por encima de ~350px de ancho ni en impresión** hasta tener el vector. No se redibujó ni se le añadió glow, glitch o degradado — el logotipo se queda plano.

---

## Índice

Raíz del proyecto:

- `styles.css` — punto de entrada único; sólo `@import`s.
- `readme.md` — este documento. `SKILL.md` — uso como skill de agente. `thumbnail.html` — mosaico de marca.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `motion.css`, `motifs.css`, `layout.css`, `base.css`.
- `guidelines/` — 24 cards de fundamentos (Colors, Type, Spacing, Brand).
- `components/` — primitivas React + `beat-components.css` + una card por carpeta.
- `ui_kits/` — `web/`, `social/`, `email/`.
- `templates/presentacion/` — plantilla de deck 16:9.
- `assets/logo/` — wordmark. `assets/reference/` — referencias de mood del cliente.

### Components

Cada carpeta tiene `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md` y una card.

- `components/core/` — **Icon**, **Button**, **IconButton**, **Badge**, **Tag**, **Card**
- `components/forms/` — **Input**, **Select**, **Checkbox**, **Radio**, **Switch**
- `components/navigation/` — **Tabs**
- `components/feedback/` — **Dialog**, **Toast**, **Tooltip**
- `components/radio/` — **LiveIndicator**, **SectionHeading**, **ShowCard**, **TrackRow**, **ArticleCard**, **NowPlayingBar**
- `components/brand/` — **Logo**

**Intentional additions.** No había inventario de componentes de origen (ni Figma ni código), así que el set base es el estándar, dimensionado a una estación: se añadieron `Icon` (envoltura del set sustituto), `Logo` (el wordmark entregado) y el grupo `radio/` —`LiveIndicator`, `SectionHeading`, `ShowCard`, `TrackRow`, `ArticleCard`, `NowPlayingBar`— porque sin ellas no se arma una superficie de radio.

### UI kits

- `ui_kits/web/` — portal + reproductor: home (con glitch y estelas), programación, nota, playlist. `index.html` es interactivo.
- `ui_kits/social/` — post 1:1 y story 9:16 para ahora suena, programa, top y promoción.
- `ui_kits/email/` — newsletter de 600px en tablas, listo para el ESP.
- `templates/presentacion/` — deck 16:9: portada, sección (el respiro en claro), dato, comparativa, cita y cierre.

---

## Sustituciones y pendientes

1. **Tipografías sustituidas.** Archivo, Schibsted Grotesk y Martian Mono son las mejores coincidencias en Google Fonts para la dirección elegida. Si Beat licencia otras familias, se reemplazan las `@import` de `tokens/fonts.css` por `@font-face` locales en `assets/fonts/`.
2. **Iconos sustituidos.** Lucide vía CDN, en lugar de un set propio.
3. **Logotipo en bitmap.** Falta el vector (SVG/AI/EPS) y las variantes oficiales (horizontal, apilada, isotipo).
4. **Sin fotografía.** Todos los huecos de imagen son placeholders con retícula y etiqueta. No se generó ni se dibujó imagen alguna; las dos referencias del cliente están en `assets/reference/` sólo como guía de mood.
5. **El sitio actual no se recreó.** Sin repositorio ni Figma, `ui_kits/web/` es propuesta de rebranding sobre la estructura pública del portal (secciones y nombres de programas reales), no una réplica de beatdigital.mx.
