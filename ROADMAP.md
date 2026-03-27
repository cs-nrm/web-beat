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

### Fase 2 — Extraer `src/js/ads.js` (riesgo: bajo)
Sacar las funciones de ads de `streaming.js` a su propio archivo.

- [ ] Crear `src/js/ads.js` con `adFallback()`, `initAdFallbackListener()`, `initGPT()`, `safeRefreshSlots()`
- [ ] Actualizar el `<script>` en `Layout.astro` (o donde se cargue) para incluir `ads.js` antes que `player.js`
- [ ] Eliminar esas funciones de `streaming.js`
- [ ] Verificar que los slots de ads sigan funcionando en dev y en build

**Dependencias:** `ads.js` necesita que `googletag` esté disponible en el scope global (viene de GPT en BaseHead — no cambia).

**Criterio de éxito:** Ads renderizan correctamente, fallback GPT→AdSense funciona, View Transitions re-inicializan correctamente.

---

### Fase 3 — Extraer `src/js/analytics.js` (riesgo: bajo)
Sacar helpers de GA4 de `streaming.js`.

- [ ] Crear `src/js/analytics.js` con `ga4Track()` y `trackTritonPlaybackEvent()`
- [ ] Cargar `analytics.js` antes que `player.js` (player depende de estas funciones)
- [ ] Eliminar esas funciones de `streaming.js`
- [ ] Verificar en GA4 DebugView que los eventos del player siguen llegando

**Dependencias:** `player.js` llama a `trackTritonPlaybackEvent()` — el orden de carga importa.

**Criterio de éxito:** Eventos `play`, `pause`, `stop`, `resume`, `ad_start`, `ad_complete` visibles en GA4 DebugView.

---

### Fase 4 — Extraer `src/js/votes.js` (riesgo: bajo-medio)
El sistema de votos es relativamente independiente pero interactúa con el DOM del player.

- [ ] Crear `src/js/votes.js` con `showVoteToast()`, `detectarNavegador()`, `detectarDispositivo()`, `registerVote()`
- [ ] Identificar qué funciones de `player.js` llaman a funciones de votes (si hay acoplamiento)
- [ ] Cargar `votes.js` después de que el DOM esté listo
- [ ] Eliminar esas funciones de `streaming.js`
- [ ] Verificar flujo completo de votación en dev

**Criterio de éxito:** Flujo de voto (toast + registro) funciona igual.

---

### Fase 5 — Renombrar `streaming.js` → `player.js` (riesgo: bajo)
Una vez extraídas las tres secciones, lo que queda es exclusivamente el player.

- [ ] Renombrar `src/js/streaming.js` a `src/js/player.js`
- [ ] Actualizar todos los `<script src="...streaming.js">` en los layouts/components que lo cargan
- [ ] Verificar que no haya referencias hardcodeadas al nombre del archivo

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

## Principios de la refactorización

1. **Una fase a la vez** — no combinar extracciones. Cada fase tiene su propio PR y validación.
2. **Cero cambios de comportamiento** — solo mover código, nunca reescribirlo mientras se mueve.
3. **El orden de carga importa** — `analytics.js` antes que `player.js`, `ads.js` antes que ambos.
4. **Validar en build, no solo en dev** — Astro SSG puede comportarse diferente en build por el manejo de scripts.
5. **Fase 1 es gratis** — los comentarios de sección pueden hacerse hoy sin riesgo.
