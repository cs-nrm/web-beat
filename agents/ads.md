# Ad Ops Agent — Beat 100.9

## Rol
Gestión de inventario publicitario programático: Google Ad Manager (GAM), sizeMapping responsivo y roadmap hacia Prebid.js / AdX. El fallback a AdSense fue removido del proyecto — GAM es la única fuente de anuncios.

---

## Archivos bajo responsabilidad

### Componentes de ad units
Estandarizados a dos formatos: **leaderboard (728×90)** y **box (300×250)**. Solo DoubleBox (skyscraper vertical) y el slot de Modal quedan fuera del estándar — no se tocan.

| Archivo | Div ID | Formato | Tamaños |
|---|---|---|---|
| `src/components/BillBoard.astro` | `ad-slot-leaderboard1` | Leaderboard | 728×90 desktop / 320×50 mobile |
| `src/components/LeaderBoard.astro` | `ad-slot-leaderboard2` | Leaderboard | 728×90 desktop / 320×50 mobile |
| `src/components/LeaderBoard2.astro` | `ad-slot-leaderboard3` | Leaderboard | 728×90 desktop / 320×50 mobile |
| `src/components/SuperLeader.astro` | `ad-slot-leaderboard4` | Leaderboard | 728×90 desktop / 320×50 mobile (antes 970×90) |
| `src/components/BoxBanner.astro` | `ad-slot-boxbanner1` | Box | 300×250 |
| `src/layouts/SliderBuenfin.astro` | `ad-slot-boxbanner2`…`ad-slot-boxbanner6` | Box (carrusel, 5 slots) | 300×250 |
| `src/components/DoubleBox.astro` | `ad-slot5` | Half Page (sin cambios, no estandarizado) | 300×600 |
| `src/components/Modal.astro` | `ad-slot14` | Modal (sin cambios, no estandarizado; actualmente comentado/inactivo en el HTML) | 600×800 desktop / 320×480 mobile |

### Lógica central de ads
| Archivo | Sección relevante |
|---|---|
| `src/js/ads.js` | Funciones: `initGPT()`, `destroySlots()`, `safeRefreshSlots()`. Mapping único `mappingLeaderboard` reusado por los 4 slots leaderboard y `mappingBox` reusado por los 6 slots box. |
| `src/components/BaseHead.astro` | Bloque de carga actual: GPT (`gpt.js` sin `defer`). Ya no se carga `adsbygoogle.js`. |

### Certificación y documentación
| Archivo | Propósito |
|---|---|
| `public/ads.txt` | Sellers autorizado: tritondigital, google, latamconnect, smartadserver |
| `dynamicAds.md` | Fuente de verdad de la arquitectura actual (413 líneas) |

---

## Configuración de red

- **GAM Network ID:** `21799830913` (verificar contra el path activo en `ads.js`, ver Troubleshooting)
- **Ad Unit base path:** `/21799830913/Beat`
- **Slot IDs activos:** `ad-slot-leaderboard1`–`4`, `ad-slot-boxbanner1`–`6`, `ad-slot5` (DoubleBox), `ad-slot14` (Modal), `ad-slot-videonota` (11 slots + videonota)

---

## Arquitectura (solo GAM, sin fallback)

```
initGPT()
  └─ destroySlots() dentro de cmd.push
  └─ define slots + sizeMapping
  └─ googletag.display()
```

Si un slot no tiene fill, el div queda vacío — no hay una segunda capa de anuncios.

**Patrón HTML de cada componente:**
```html
<!-- GPT slot, único div. IDs: ad-slot-leaderboardN / ad-slot-boxbannerN -->
<div id="ad-slot-leaderboard1"></div>
```

---

## Reglas críticas de implementación

1. `destroySlots()` **siempre** dentro de `googletag.cmd.push()` — nunca fuera, rompe en redes lentas.
2. `gpt.js` se carga **sin `defer`** — el `defer` rompe el `document.write` interno de GPT.
3. AdSense se carga **una sola vez** en `BaseHead.astro`, no por componente.
4. Un solo slot por formato (sizeMapping maneja desktop/mobile internamente).
5. En View Transitions: `initGPT()` se re-ejecuta en `astro:page-load`; el listener **no** se re-registra (tiene guard de estado).

> Nota: el roadmap contempla mover los scripts a `src/components/head/AdScripts.astro`, pero hoy la carga real sigue viviendo en `BaseHead.astro`.

---

## sizeMapping responsivo

| Breakpoint | Formatos activos |
|---|---|
| `≥ 768px` (desktop) | 728×90 (leaderboard ×4), 600×800 (modal, sin usar) |
| `0px` (mobile) | 320×50 (leaderboard), 300×250 (box ×6), 300×600 (double box), 320×480 (modal, sin usar) |

---

## Sellers autorizados (ads.txt)

```
tritondigital.com, 7833, DIRECT
latamconnect.com.mx, [id], DIRECT
google.com, pub-7423640555477330, DIRECT, f08c47fec0942fa0
smartadserver.com, 5366, DIRECT
```

> Nota: `public/ads.txt` sigue listando publisher IDs de AdSense (`pub-7423640555477330`, `pub-3354798231881818`) por compatibilidad/uso en otros contextos de la cuenta de Google. No se tocó al remover el fallback — confirmar con NRM si deben limpiarse.

---

## Roadmap activo

| Etapa | Estado |
|---|---|
| Google Ad Manager (GAM) | ✅ en producción |
| AdSense fallback | ❌ removido — GAM es la única fuente de anuncios |
| Prebid.js (header bidding) | 🔜 pendiente |
| Google Ad Exchange (AdX) | 🔜 pendiente (requiere certificación NRM) |

---

## Troubleshooting frecuente

| Síntoma | Causa probable | Solución |
|---|---|---|
| `TypeError: googletag.destroySlots is not a function` | `destroySlots()` fuera de `cmd.push()` | Moverlo dentro del callback |
| Slot no renderiza en mobile | sizeMapping no cubre el breakpoint | Revisar mapeo `[0, 0]` en `addSize()` |
| Slots duplicados tras navegación | `initGPT()` sin `destroySlots()` previo | Siempre destruir antes de re-definir |
| Slot vacío sin ningún anuncio | GAM sin fill para ese inventario/geo | Comportamiento esperado — ya no hay fallback a AdSense |

---

## Contexto de negocio

Beat 100.9 es una de 5 propiedades de **NRM** (media company, CDMX). El inventario se comparte/gestiona bajo la red GAM de NRM. Las decisiones de adición de demandantes (SSPs, AdX) requieren coordinación con el equipo de adops de NRM.
