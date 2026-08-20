# `src/js` — runtime de cliente heredado

⚠️ **Estos archivos vienen del web-beat v1 (WordPress/SSG) y todavía NO están
cableados en el sitio nuevo.** Están aquí como material de port, no como código
vivo. Ver decisión 7 y B6 del plan.

## Qué se porta tal cual

Es el activo irreemplazable: son ingresos, y no toca datos de WordPress.

| Archivo | Qué es |
|---|---|
| `ads.js` (83 líneas) | GPT/GAM puro: `googletag` + DOM. Lo único que cambia es que el ad unit sale del env (`PUBLIC_GAM_NETWORK_ID` / `PUBLIC_GAM_AD_UNIT`) en vez de estar pegado. |
| `analytics.js` (29 líneas) | `ga4Track` y `trackTritonPlaybackEvent`, con su doble envío (`gtag` con fallback a `dataLayer.push`) para no depender del orden de carga. |
| `player.js` → **solo el núcleo de Triton** | `initPlayerSDK`, los listeners `stream-status` / `ad-playback-*`, la máquina de estados de 6 códigos, el VAST y la detección de adblocker. |
| `player.js` → **la cadencia del polling** | 15 s reproduciendo y visible / 30 s visible / 60 s en background, backoff ×2 con techo de 300 s, `ETag`/`Last-Modified`, `AbortController`. La *lógica* se conserva; la **fuente** cambia a la colección `bitacora`. |

### Reglas que el port debe respetar al pie

- **Orden de `<script>` estricto y sin `defer`/`async`**: `analytics.js` → `ads.js` →
  `votes.js` → `player.js`. El orden sincrónico es parte del contrato.
- `googletag.destroySlots()` y todo lo que dependa de GPT **siempre dentro de
  `googletag.cmd.push()`**. Fuera, en móvil o red lenta, `googletag` es solo el
  stub `{ cmd: [] }` y el TypeError cancela toda la inicialización.
- `initGPT()` se re-ejecuta en `astro:page-load` (View Transitions hace swap
  completo del DOM), pero el listener **no** se re-registra: tiene guard de estado.
- **Un slot por formato**, con `sizeMapping`. Nunca pares desktop/mobile: causaban
  doble impresión porque los dos pedían anuncio aunque solo uno fuera visible.
- El player sobrevive la navegación con `transition:persist`, con los listeners
  limpiados en `astro:before-preparation`. 🔴 Esto es **requisito de producto**, no
  detalle técnico: el §4.1 del mapa de sitio dice que el reproductor persistente
  "es la afirmación de que Beat sigue siendo una estación de radio en vivo".
- 🔴 **El ad unit se lee del env, jamás se hardcodea.** Es una línea roja de la casa
  por una razón de facturación: en los repos hermanos está pegado por copy-paste
  como `/<network>/StereoCien`, y servir impresiones de una estación a la cuenta de
  otra es un bug de dinero. Hay un grep en CI que lo vigila.
- ⚠️ `agents/ads.md` publica el network ID **equivocado** (`21799830913`). El real,
  el que usa `ads.js`, es **`23349147378`**. Corregir el doc al portar.

## Qué se REESCRIBE (no se hereda)

Todo esto está acoplado a WordPress o al DOM viejo, así que "portar intacto" no es
ni posible:

- **`getInfoProg()`** ("al aire ahora / a continuación"): lee 7 booleanos ACF
  `lunes`…`domingo` y compara `acf.hora_inicio`/`hora_fin` como strings, con un
  `setInterval` de 5 min en el cliente. Con `programas.horarios[]` esto pasa a
  **SSR**. ⚠️ Cuidado con el bloque que cruza medianoche (`horaFin <= horaInicio`).
- **El player de podcast**: parsea `acf.ds` con `split('src="')` para sacar el `src`
  de un iframe crudo. En Payload es `podcasts.embedUrl`, ya normalizado por el hook
  `normalizarEmbedAudio` del CMS, que además valida contra una allow-list de 17
  hosts. El string-parsing desaparece.
- **El video de nota**: Plyr envuelve `.wp-block-embed-youtube` — clase de
  **Gutenberg**. En Payload el video es `noticias.video.{plataforma,url}` y el
  bloque `Embed` de Lexical, que guarda **solo la URL, nunca HTML crudo**.
- 🔴 **Plyr y Toastify NO se heredan.** Hoy se cargan por página desde el CDN de
  NRM (`storage.googleapis.com/nrm-web/nrm/lib/`), `player.js:952` hace
  `new Plyr(...)` **sin guard** —así que truena en cualquier página donde el CDN no
  se haya cargado— y `votes.js` guardea `window.Toastify` y cae a `console.log`, o
  sea que **los toasts de voto hoy no se ven**. Reproducir video y avisar al lector
  son decisiones del design system nuevo.
- **Los controles y `transitionPlayer`**: el diseño pone el player **en el header**,
  no en una barra inferior montada desde el footer. El marcado se rehace; la
  máquina de estados se conserva (`#player[data-status]` ∈ `init | radio-playing |
  podcast-playing | video-playing`).
- **`votes.js`** y los 4 handlers de voto: el endpoint PHP
  (`beatdigital.com.mx/6456heu2/8s4v3f1l3s.php`) funciona pero su dedup es **solo
  del lado del cliente** — mira el `fill` del corazón y se pierde al recargar. Con
  `oyentes` autenticados el dedup real se vuelve posible.
- **El card-glow `pointermove`** que muta `--start`/`--active`/`--spread`: es del
  sistema visual viejo.
- Hay una **API key de Last.fm en claro** en un `var` de `player.js:20` que **nunca
  se usa**. No viaja al sitio nuevo; conviene rotarla igual.

## Deuda que este port es la oportunidad de pagar

No hay módulos ES: todo vive en `window` y hay `var` hoisted usados entre secciones
(`streaming`, `local_status`, `volume`, `artist`, `cancion`). El `ROADMAP.md` del v1
lo marca como **riesgo ALTO (R1)** y nunca se pudo arreglar sin reescribir. Al
rehacer la mitad de arriba, la otra mitad puede quedar en módulos de verdad.
