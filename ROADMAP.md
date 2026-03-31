# Roadmap de Refactorización — Beat 100.9

## Objetivo

Separar los archivos que hoy mezclan múltiples dominios, de forma que cada subagente (`agents/`) tenga ownership claro sobre sus archivos sin solapamientos. Sin cambiar ningún comportamiento funcional.

---

## El problema central

Hay dos archivos que hoy son propiedad compartida de varios agentes:

| Archivo | Dominios mezclados | Líneas |
|---|---|---|
| `src/js/streaming.js` | ads + player + analytics + votes | 1,683 |
| `src/components/BaseHead.astro` | meta/SEO + favicons + ads + analytics | 120 |

Todos los cambios de este roadmap apuntan a resolver exactamente esto.

---

## Mapa de extracción: `streaming.js`

Estas son las secciones actuales del archivo y a dónde van:

| Líneas actuales | Contenido | Archivo destino |
|---|---|---|
| 1–18 | SVG constants + global vars del player | `src/js/player.js` |
| 21–47 | `ga4Track()`, `trackTritonPlaybackEvent()` | `src/js/analytics.js` |
| 49–118 | Song polling: `renderNowPlaying()`, `scheduleNextSongFetch()`, `startSongPolling()` | `src/js/player.js` |
| 119–258 | Ads: `adFallback()`, `initAdFallbackListener()`, `initGPT()`, `safeRefreshSlots()` | `src/js/ads.js` |
| 259–512 | Triton SDK: `initPlayerSDK()`, `getStatus()`, `startAd()`, `play()`, `pause()`, `stop()`, etc. | `src/js/player.js` |
| 513–641 | Votes: `showVoteToast()`, `detectarNavegador()`, `registerVote()` | `src/js/votes.js` |
| 642–796 | Cover art: `getInfoMusic()`, `getInfoProg()` | `src/js/player.js` |
| 797–fin | Player controls: `radioActive()`, `initPlayer()`, `transitionPlayer()`, etc. | `src/js/player.js` |

---

## Estructura objetivo de `src/js/`

```
src/js/
├── player.js       ← todo lo del player Triton, polling, now playing (hoy: streaming.js sin las partes extraídas)
├── ads.js          ← initGPT, adFallback, destroySlots, sizeMapping (hoy: líneas 119–258 de streaming.js)
├── analytics.js    ← ga4Track, trackTritonPlaybackEvent (hoy: líneas 21–47 de streaming.js)
└── votes.js        ← sistema de votos (hoy: líneas 513–641 de streaming.js)
```

> `streaming.js` desaparece y es reemplazado por `player.js` + los archivos extraídos.

---

## Mapa de extracción: `BaseHead.astro`

Crear dos componentes Astro que `BaseHead.astro` importa:

| Bloque actual | Archivo destino |
|---|---|
| Favicons + `<meta charset>` + `<meta viewport>` | se queda en `BaseHead.astro` |
| Canonical + OG + Twitter + robots | se queda en `BaseHead.astro` |
| AdSense `<script>` + GPT `<script>` | `src/components/head/AdScripts.astro` |
| GTM + comScore + Hotjar + Metricool | `src/components/head/AnalyticsScripts.astro` |

```astro
<!-- BaseHead.astro después de la refactorización -->
<AdScripts />
<AnalyticsScripts />
```

---

## Fases

### Fase 0 — Documentación ✅ COMPLETADA
- [x] Crear `agents/ads.md`
- [x] Crear `agents/streaming.md`
- [x] Crear `agents/frontend.md`
- [x] Crear `agents/content.md`
- [x] Crear `agents/analytics.md`
- [x] Crear este `ROADMAP.md`

---

### Fase 1 — Delimitadores en `streaming.js` (riesgo: cero)
Agregar comentarios de sección bien definidos dentro de `streaming.js` sin mover nada.
Esto prepara la extracción en Fase 2 y permite que los agentes ya sepan qué sección les toca.

- [x] Agregar bloque `// ===== [PLAYER - GLOBALS + SVG CONSTANTS] =====` en línea 1
- [x] Agregar bloque `// ===== [ANALYTICS] =====` en línea 22
- [x] Agregar bloque `// ===== [PLAYER - SONG POLLING] =====` en línea 50
- [x] Agregar bloque `// ===== [ADS] =====` en línea 120
- [x] Agregar bloque `// ===== [PLAYER - TRITON SDK] =====` en línea 260
- [x] Agregar bloque `// ===== [VOTES] =====` en línea 515
- [x] Agregar bloque `// ===== [PLAYER - MUSIC INFO + COVER ART] =====` en línea 643
- [x] Agregar bloque `// ===== [PLAYER - CONTROLS] =====` en línea 798

**Criterio de éxito:** Ningún cambio de comportamiento. El sitio funciona igual.

---

### Fase 2 — Extraer `src/js/ads.js` ✅ COMPLETADA

Sacar las funciones de ads de `streaming.js` a su propio archivo.

- [x] Crear `src/js/ads.js` con `adFallback()`, `initAdFallbackListener()`, `initGPT()`, `safeRefreshSlots()`
- [x] Actualizar el `<script>` en `Player.astro` para incluir `ads.js` antes que `streaming.js`
- [x] Eliminar esas funciones de `streaming.js`
- [ ] Verificar que los slots de ads sigan funcionando en dev y en build

**Dependencias:** `ads.js` necesita que `googletag` esté disponible en el scope global (viene de GPT en BaseHead — no cambia).

**Criterio de éxito:** Ads renderizan correctamente, fallback GPT→AdSense funciona, View Transitions re-inicializan correctamente.

---

### Fase 3 — Extraer `src/js/analytics.js` ✅ COMPLETADA

Sacar helpers de GA4 de `streaming.js`.

- [x] Crear `src/js/analytics.js` con `ga4Track()` y `trackTritonPlaybackEvent()`
- [x] Cargar `analytics.js` antes que `player.js` (player depende de estas funciones)
- [x] Eliminar esas funciones de `streaming.js`
- [ ] Verificar en GA4 DebugView que los eventos del player siguen llegando

**Dependencias:** `player.js` llama a `trackTritonPlaybackEvent()` — el orden de carga importa.

**Criterio de éxito:** Eventos `play`, `pause`, `stop`, `resume`, `ad_start`, `ad_complete` visibles en GA4 DebugView.

---

### Fase 4 — Extraer `src/js/votes.js` ✅ COMPLETADA

El sistema de votos es relativamente independiente pero interactúa con el DOM del player.

- [x] Crear `src/js/votes.js` con `showVoteToast()`, `detectarNavegador()`, `detectarDispositivo()`, `registerVote()`
- [x] Identificar qué funciones de `player.js` llaman a funciones de votes (si hay acoplamiento)
- [x] Cargar `votes.js` después de que el DOM esté listo
- [x] Eliminar esas funciones de `streaming.js`
- [ ] Verificar flujo completo de votación en dev

**Criterio de éxito:** Flujo de voto (toast + registro) funciona igual.

---

### Fase 5 — Renombrar `streaming.js` → `player.js` ✅ COMPLETADA

Una vez extraídas las tres secciones, lo que queda es exclusivamente el player.

- [x] Renombrar `src/js/streaming.js` a `src/js/player.js`
- [x] Actualizar todos los `<script src="...streaming.js">` en los layouts/components que lo cargan
- [x] Verificar que no haya referencias hardcodeadas al nombre del archivo

**Criterio de éxito:** Build limpio, player funciona, sin errores 404 en Network tab.

---

### Fase 6 — Separar `BaseHead.astro` (riesgo: bajo)
Crear dos componentes que `BaseHead.astro` importa.

- [ ] Crear `src/components/head/AdScripts.astro`
  - Mover: bloque AdSense + bloque GPT + `window.googletag` init
  - Mantener el orden actual (AdSense primero, luego GPT sin `defer`)
- [ ] Crear `src/components/head/AnalyticsScripts.astro`
  - Mover: GTM snippet + noscript GTM + comScore + Hotjar + Metricool
- [ ] En `BaseHead.astro`: reemplazar los bloques movidos con `<AdScripts />` y `<AnalyticsScripts />`
- [ ] Verificar orden de scripts en el HTML generado (debe ser idéntico al actual)

**Criterio de éxito:** HTML generado en build es byte-a-byte equivalente en el orden de scripts. Ads y analytics funcionan igual.

---

## Estructura final objetivo

```
src/
├── components/
│   ├── head/
│   │   ├── AdScripts.astro        ← GPT + AdSense
│   │   └── AnalyticsScripts.astro ← GTM + comScore + Hotjar + Metricool
│   ├── BaseHead.astro             ← solo meta, OG, canonical, favicons
│   ├── Player.astro
│   └── ...
├── js/
│   ├── player.js                  ← Triton SDK, polling, now playing, controls
│   ├── ads.js                     ← initGPT, adFallback, sizeMapping
│   ├── analytics.js               ← ga4Track, trackTritonPlaybackEvent
│   └── votes.js                   ← sistema de votos
└── ...
```

### Ownership por agente después de la refactorización

| Agente | Archivos exclusivos |
|---|---|
| `agents/ads.md` | `src/js/ads.js`, `src/components/head/AdScripts.astro`, ad unit components, `public/ads.txt` |
| `agents/streaming.md` | `src/js/player.js`, `src/components/Player.astro` |
| `agents/analytics.md` | `src/js/analytics.js`, `src/components/head/AnalyticsScripts.astro` |
| `agents/frontend.md` | `src/components/` (resto), `src/layouts/`, `src/styles/`, `src/components/BaseHead.astro` |
| `agents/content.md` | `src/lib/`, `src/pages/`, `src/content/`, `astro.config.mjs` |

Ningún archivo pertenece a más de un agente.

---

## Riesgos identificados

Antes de ejecutar cualquier fase, tener en cuenta estos puntos críticos:

### R1 — Variables globales compartidas entre secciones (riesgo: ALTO)

El archivo no usa módulos ES. Todo vive en `window`. Varias secciones se llaman entre sí directamente:

| Función en... | Llama a... | Definida en... |
| --- | --- | --- |
| `[PLAYER - TRITON SDK]` | `trackTritonPlaybackEvent()` | `[ANALYTICS]` |
| `[PLAYER - TRITON SDK]` | `getInfoMusic()` | `[PLAYER - MUSIC INFO]` |
| `[PLAYER - TRITON SDK]` | `startSongPolling()` | `[PLAYER - SONG POLLING]` |
| `[PLAYER - CONTROLS]` | `initGPT()` | `[ADS]` |

Si los archivos se cargan en el orden equivocado habrá `ReferenceError` en runtime. **El orden de `<script>` en `Player.astro` es crítico y no hay ningún sistema de módulos que lo gestione automáticamente.**

### R2 — `googletag.cmd.push(initAdFallbackListener)` se ejecuta al cargar el script (riesgo: ALTO)

La línea 236 de `streaming.js` registra el listener de fallback fuera de cualquier función, en el top-level del archivo. Al moverlo a `ads.js`, si `googletag` no existe en ese momento, falla silenciosamente. Este listener **debe registrarse una sola vez** — ni antes de que GPT esté disponible, ni repetirse en navegaciones.

### R3 — Variables `var` hoisted usadas cross-sección (riesgo: MEDIO)

`var streaming`, `var local_status`, `var volume`, `var artist`, `var cancion` se declaran en línea 2 y las usan funciones en secciones distintas. Deben quedar en `player.js` (el primer archivo que carga) para que estén disponibles globalmente.

### R4 — View Transitions y `astro:page-load` (riesgo: MEDIO)

`initGPT()` se dispara desde un listener de `astro:page-load`. Si ese listener está en `player.js` pero `initGPT` ya vive en `ads.js`, hay que garantizar que `ads.js` esté cargado antes de que el evento dispare. Con View Transitions el orden de ejecución no siempre es el mismo entre carga inicial y navegaciones.

### R5 — `Player.astro` tiene un único `<script src>` hoy (riesgo: MEDIO)

Al separar, hay que agregar múltiples `<script>` en orden estricto, ninguno con `defer` ni `async`:

```astro
<script src="/src/js/analytics.js"></script>
<script src="/src/js/ads.js"></script>
<script src="/src/js/votes.js"></script>
<script src="/src/js/player.js"></script>
```

Astro no bundlea ni procesa estos scripts externos — los pasa tal cual al HTML. Eso es intencional pero significa que el orden es responsabilidad nuestra.

### R6 — Build vs dev (riesgo: BAJO)

Astro puede comportarse diferente entre `dev` y `build` en el manejo de scripts externos. Validar siempre en `build` antes de cerrar cada fase.

---

## Plan de ejecución segura

Guía paso a paso para cada fase, incorporando los riesgos identificados.

### Antes de empezar cualquier fase

- [ ] Hacer commit limpio del estado actual (punto de rollback)
- [ ] Tener el sitio corriendo en dev con DevTools abierto (Network + Console)
- [ ] Confirmar que ads, player y analytics funcionan antes de tocar nada

### Orden de extracción recomendado

El orden importa por las dependencias entre secciones:

```
1. analytics.js  ← no depende de nada del proyecto
2. votes.js      ← no depende de ads ni player (solo DOM)
3. ads.js        ← depende de googletag (externo), no del player
4. player.js     ← depende de analytics.js (trackTritonPlaybackEvent)
```

### Protocolo por fase

Para **cada** fase (2, 3, 4, 5):

1. **Crear el archivo nuevo** con exactamente el código del bloque delimitado — sin cambiar ni una línea
2. **Agregar el `<script src>` en `Player.astro`** en la posición correcta (antes del script que lo necesita)
3. **Eliminar** ese bloque de `streaming.js`
4. **Verificar en dev:** sin errores en Console, funcionalidad intacta
5. **Verificar en build:** `npm run build && npm run preview` — comparar Network tab con estado anterior
6. **Commit** — un commit por fase, mensaje claro

### Verificaciones específicas por archivo extraído

| Archivo | Qué verificar |
| --- | --- |
| `analytics.js` | Eventos `play`, `pause`, `stop`, `resume` llegan a GA4 DebugView |
| `votes.js` | Flujo completo de votación: toast aparece, voto se registra |
| `ads.js` | Slots renderizan, fallback GPT→AdSense funciona, no hay slots duplicados en navegación |
| `player.js` | Player inicia, now playing actualiza, audio ads (VAST) no rompen |

### Punto crítico: extracción de `ads.js`

Al mover el bloque `[ADS]`, hay un detalle que **no está en el código pero sí en el comportamiento**:

- La línea `googletag.cmd.push(initAdFallbackListener)` debe mantenerse en el **top-level** de `ads.js`
- Debe ejecutarse **después** de que GPT (`gpt.js`) haya cargado — GPT se carga en `BaseHead.astro`, que carga antes que `Player.astro`, por lo que el orden natural lo garantiza
- Si en algún momento se mueve GPT a `defer`, este punto se rompe

---

## Principios de la refactorización

1. **Una fase a la vez** — no combinar extracciones. Cada fase tiene su propio PR y validación.
2. **Cero cambios de comportamiento** — solo mover código, nunca reescribirlo mientras se mueve.
3. **El orden de carga importa** — `analytics.js` antes que `player.js`, `ads.js` antes que ambos.
4. **Validar en build, no solo en dev** — Astro SSG puede comportarse diferente en build por el manejo de scripts.
5. **Fase 1 es gratis** — los comentarios de sección pueden hacerse hoy sin riesgo.
6. **Nunca `defer` ni `async`** en estos scripts — el orden de ejecución sincrónico es parte del contrato.
7. **Un commit por fase** — facilita rollback granular si algo falla en producción.
