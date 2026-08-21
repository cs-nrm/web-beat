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

> Una primera propuesta oscura (negro + cian) se exploró y se descartó por decisión del cliente. Queda un único set oscuro en el sistema, `[data-theme="tinta"]`, para momentos de contraste; no es una interfaz alterna.

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
Neblina como lienzo: `--mist-3` #D9DEDC, con `--mist-0` … `--mist-5` para superficies. Grafito para texto y **para la acción**: el botón primario es `--graphite-5` #171C1B, no un color. El acento no es un tono único sino una **gama de luz**: `--luz-rosa` #FF6E93, `--luz-coral` #FF6A3D, `--luz-ambar` #FFA24B, más `--luz-ink` #D9451C para texto legible y `--luz-rubor` #FFB3C6 para halos. Regla dura: **la luz cálida sólo marca lo que suena** —aire, play, pestaña activa, ecualizador—. Si aparece en algo que no suena, está mal usada. Semánticos (verde/ámbar/rojo) sólo en toasts y validación. `[data-theme="tinta"]` es el único set oscuro: portadas de deck, secciones a sangre, modo noche del reproductor. Máximo dos fondos por pieza.

### Tipografía
**Display: Archivo con el eje de ancho en 125** (expandida), peso 700–800, caja alta, tracking −0.03em, interlínea 0.92 — ese ancho rima con el wordmark. **Texto: Schibsted Grotesk**, 400/500/600, interlínea 1.55. **Mono: Martian Mono** para metadatos, horarios, dial y etiquetas de caja alta con tracking 0.14em. Escala fija en px (88/64/48 display; 40/30/23/19 titulares; 18/16/14/13/11 texto). El titular grita, el cuerpo se lee: nunca display en párrafos.

### Espacio y layout
Base 4 con pasos intermedios de 2 y 6 (`--s-1` 2px … `--s-13` 96px). Grid web de 12 columnas, máximo 1240px, gutter 24px. Secciones separadas 96px; tarjetas con 20px de relleno. Header fijo de 64px; barra de reproducción fija de 76px anclada abajo (`--z-player`). El aire claro es parte del diseño: antes una sección vacía que una sección rellena.

### Fondos
Neblina plana o el degradado `--grad-mist` (mist-1 → mist-4, 168°). Sobre eso, tres recursos en orden de frecuencia: (1) **retícula de 1px cada 48px** (`--tex-grid`, grafito al 5.5%) como plano técnico; (2) **estelas de luz** (ver Motivos); (3) **degradados de protección** claros (`--grad-scrim-b`) bajo imagen. Sin fotografía propia todavía: los huecos se muestran con la retícula y una etiqueta mono. Nada de gradientes morados ni de fondos a color pleno saturado.

### Motivos: estelas, glitch, barrido
El movimiento de la referencia se sistematiza en tres familias, **una por pieza, nunca las tres juntas**:

- **Estelas** — `.beat-streak` (2–3px, degradado rosa→coral→ámbar, glow suave), `.is-soft` (7–22px desenfocada), `.is-thin` (1px). Se usan en grupos de 3 a 5, horizontales, de largos distintos y **jamás centradas ni simétricas**: son traza de movimiento, no decoración. Pueden cruzar el titular.
- **Glitch** — aberración de canal, no sombra: `.beat-glitch` desfasa el texto en rosa arriba-derecha (crisp, 0.105em) y en ámbar abajo-izquierda (desenfocado, 0.056em). Las magnitudes, ejes y nitideces son distintas a propósito: nunca debe leer simétrico. `.is-soft` para subtítulos, `.is-hard` para portadas y datos grandes, `.is-torn` añade un corte de señal fuera del centro, `.is-live` lo salta cada 4.4s en pasos de un frame. **Sólo en display**, nunca en cuerpo ni en interfaz funcional.
- **Barrido** — `.beat-smear` duplica el bloque desenfocado y desplazado 6%: el sujeto se mueve. Reservado para imagen y bloques grandes.

Además `.beat-grid` (retícula) y `.beat-scan` (scanlines de 1px cada 3px) para superficies técnicas.

### Vidrio y transparencia
Superficie firma: blanco al 58% (`--surface-card`) + `backdrop-filter: blur(18px) saturate(112%)` + filo blanco al 90% + luz superior blanca. Se usa cuando hay algo detrás que vale la pena insinuar: header, player, tarjetas sobre neblina, estelas o foto. **No** sobre plano liso ni en diálogos con texto largo, que van opacos (`--mist-0`).

### Bordes, radios y tarjetas
Todo borde es hairline de 1px en grafito al 10/16/30%. Radios cortos y maquinados: 3, 6, 10, 16, 24 px, más píldora para tune-in y filtros. Una tarjeta = radio 10px + relleno 20px + vidrio + anillo interior hairline. En hover aclara el fondo (58% → 80%) y sube el anillo al 16%. Sin borde de color a la izquierda salvo en toasts.

### Sombras y glow
En claro la sombra sí existe, pero difusa y de grafito: `--shadow-1/2/3` (10–32% de alfa, desenfoques de 2 a 60px). El **glow es cálido y semántico**: `--glow-luz` para el aire y el foco, `--glow-graphite` para el hover del primario, `--glow-onair` para el punto pulsante. Nada decorativo brilla.

### Estados
Hover: el primario pasa a `--graphite-4` con glow de grafito; el vidrio sube de 58% a 80%. Press: escala a `0.985` (`--press-scale`), sin cambiar color. Foco: anilla coral de 2px con offset (`--ring-focus`), siempre visible. Deshabilitado: fondo grafito al 6%, texto `--mist-5`, cursor `not-allowed`. Seleccionado en filtros: se invierte a grafito con texto blanco.

### Movimiento
Rápido y seco. 120/180/280 ms, `--ease-out` cubic-bezier(.16,1,.3,1) para entradas, `--ease-in-out` para desplazamientos. Sin bounce, sin resortes, sin parallax. Animaciones en bucle sólo ligadas al audio: `beat-pulse` (punto de aire, 1.6s), `beat-bars` (ecualizador, 0.9s) y `beat-glitch-shift` (3.2s, sólo en display). Todo respeta `prefers-reduced-motion`.

### Imagen
La referencia del cliente define el mood: **retratos en movimiento** sobre fondo de neblina gris-verde, sujeto desenfocado por movimiento, piel cálida, estelas de luz atravesando el cuadro, algo de aberración/glitch en los bordes. Frío en el fondo, cálido en la luz. Recortes: 4:5 para héroes, 1:1 para programas, 16:9 para notas lead. Con texto encima, siempre scrim claro. Nunca negro pleno ni saturación de flyer.

---

## ICONOGRAPHY

La estación **no entregó** un set de iconos, sprite ni fuente de iconos. Sustitución documentada: **Lucide** (2px de trazo, esquinas redondeadas, geometría de 24px), servido desde CDN, inyectado como SVG y pintado con `currentColor` a través del componente `Icon`.

- Uso: `<Icon name="play" size={20} />`. Nombres en kebab-case de Lucide.
- Set base: `play`, `pause`, `radio-tower`, `volume-2`, `heart`, `share-2`, `search`, `menu`, `x`, `clock`, `calendar`, `chevron-right`, `arrow-up-right`, `more-horizontal`, `check`, `alert-triangle`, `instagram`, `youtube`.
- Tamaños: 14 (metadatos), 16–18 (por defecto), 22 (transporte grande). El trazo no se escala: 2px en todos los tamaños.
- **Emoji: nunca.** **Unicode como icono: sólo `·`** para separar metadatos.
- Los únicos gráficos dibujados del sistema son las barras del ecualizador, el punto de aire y las estelas: `<div>` con CSS, no SVG.
- Cuando exista set propio: se copia en `assets/icons/` y se cambia la constante `LUCIDE` de `components/core/Icon.jsx` por la ruta local.

**Logotipo.** Sólo existe el bitmap entregado, limpiado a dos tonos: `assets/logo/beat-1009-black.png` (uso por defecto, sobre neblina) y `beat-1009-white.png` (sobre tinta), más el original `beat-1009-source.jpg`. El recorte útil es 350×107 px: **no usar por encima de ~350px de ancho ni en impresión** hasta tener el vector. No se redibujó ni se le añadió glow, glitch o degradado — el logotipo se queda plano.

---

## Índice

Raíz del proyecto:

- `styles.css` — punto de entrada único; sólo `@import`s.
- `readme.md` — este documento. `SKILL.md` — uso como skill de agente. `thumbnail.html` — mosaico de marca.
- `tokens/` — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `effects.css`, `motion.css`, `motifs.css`, `layout.css`, `base.css`.
- `guidelines/` — 23 cards de fundamentos (Colors, Type, Spacing, Brand).
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
- `templates/presentacion/` — deck 16:9: portada, sección (en tinta), dato, comparativa, cita y cierre.

---

## Sustituciones y pendientes

1. **Tipografías sustituidas.** Archivo, Schibsted Grotesk y Martian Mono son las mejores coincidencias en Google Fonts para la dirección elegida. Si Beat licencia otras familias, se reemplazan las `@import` de `tokens/fonts.css` por `@font-face` locales en `assets/fonts/`.
2. **Iconos sustituidos.** Lucide vía CDN, en lugar de un set propio.
3. **Logotipo en bitmap.** Falta el vector (SVG/AI/EPS) y las variantes oficiales (horizontal, apilada, isotipo).
4. **Sin fotografía.** Todos los huecos de imagen son placeholders con retícula y etiqueta. No se generó ni se dibujó imagen alguna; las dos referencias del cliente están en `assets/reference/` sólo como guía de mood.
5. **El sitio actual no se recreó.** Sin repositorio ni Figma, `ui_kits/web/` es propuesta de rebranding sobre la estructura pública del portal (secciones y nombres de programas reales), no una réplica de beatdigital.mx.
