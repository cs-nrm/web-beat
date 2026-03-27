# Ad Ops Agent — Beat 100.9

## Rol
Gestión de inventario publicitario programático: Google Ad Manager (GAM), AdSense fallback, sizeMapping responsivo y roadmap hacia Prebid.js / AdX.

---

## Archivos bajo responsabilidad

### Componentes de ad units
| Archivo | Formato | Tamaños |
|---|---|---|
| `src/components/BillBoard.astro` | Billboard | 970×250 desktop / 320×50 mobile |
| `src/components/LeaderBoard.astro` | Leaderboard | 728×90 desktop / 320×50 mobile |
| `src/components/LeaderBoard2.astro` | Leaderboard variante | igual que LeaderBoard |
| `src/components/SuperLeader.astro` | Super Leaderboard | 970×90 desktop |
| `src/components/BoxBanner.astro` | Medium Rectangle | 300×250 |
| `src/components/DoubleBox.astro` | Half Page | 300×600 |

### Lógica central de ads
| Archivo | Sección relevante |
|---|---|
| `src/js/streaming.js` | Funciones: `initGPT()`, `adFallback()`, `initAdFallbackListener()`, `destroySlots()`, y definición de slots 2–6 y 14, 201–205 |
| `src/components/BaseHead.astro` | Bloques de carga: GPT (`gpt.js` sin `defer`) y AdSense (`adsbygoogle.js`) |

### Certificación y documentación
| Archivo | Propósito |
|---|---|
| `public/ads.txt` | Sellers autorizado: tritondigital, google, latamconnect, smartadserver |
| `dynamicAds.md` | Fuente de verdad de la arquitectura actual (413 líneas) |

---

## Configuración de red

- **GAM Network ID:** `21799830913`
- **Ad Unit base path:** `/21799830913/Beat`
- **AdSense Publisher ID:** `ca-pub-7423640555477330`
- **Slot IDs activos:** slot2–slot6, slot14, slot201–slot205 (11 slots)

---

## Arquitectura de fallback (GPT → AdSense)

```
initGPT()
  └─ define slots + sizeMapping
  └─ googletag.display()

initAdFallbackListener()  ← se registra UNA sola vez
  └─ escucha slotRenderEnded
  └─ si isEmpty → adFallback() muestra AdSense
  └─ si fill    → oculta div AdSense

adFallback(gptDivId, adsenseDivId)
  └─ espera a que el elemento tenga width > 0
  └─ usa AbortController para cancelar en navegación
  └─ pushea adsbygoogle solo cuando el slot es visible
```

**Patrón HTML de cada componente:**
```html
<!-- GPT slot -->
<div id="ad-slotN"></div>

<!-- AdSense fallback (display:none por defecto) -->
<div id="ad-slotN-adsense" style="display:none">
  <ins class="adsbygoogle" ...></ins>
</div>
```

---

## Reglas críticas de implementación

1. `destroySlots()` **siempre** dentro de `googletag.cmd.push()` — nunca fuera, rompe en redes lentas.
2. `gpt.js` se carga **sin `defer`** — el `defer` rompe el `document.write` interno de GPT.
3. AdSense se carga **una sola vez** en `BaseHead.astro`, no por componente.
4. Un solo slot por formato (sizeMapping maneja desktop/mobile internamente).
5. En View Transitions: `initGPT()` se re-ejecuta en `astro:page-load`; el listener **no** se re-registra (tiene guard de estado).

---

## sizeMapping responsivo

| Breakpoint | Formatos activos |
|---|---|
| `≥ 768px` (desktop) | 970×250, 728×90, 970×90 |
| `0px` (mobile) | 320×50, 300×250, 300×600 |

---

## Sellers autorizados (ads.txt)

```
tritondigital.com, 7833, DIRECT
latamconnect.com.mx, [id], DIRECT
google.com, pub-7423640555477330, DIRECT, f08c47fec0942fa0
smartadserver.com, 5366, DIRECT
```

---

## Roadmap activo

| Etapa | Estado |
|---|---|
| Google Ad Manager (GAM) | ✅ en producción |
| AdSense fallback | ✅ en producción |
| Prebid.js (header bidding) | 🔜 pendiente |
| Google Ad Exchange (AdX) | 🔜 pendiente (requiere certificación NRM) |

---

## Troubleshooting frecuente

| Síntoma | Causa probable | Solución |
|---|---|---|
| `TypeError: googletag.destroySlots is not a function` | `destroySlots()` fuera de `cmd.push()` | Moverlo dentro del callback |
| AdSense aparece aunque GPT tiene fill | Listener acumulado en navegación | Verificar guard de `initAdFallbackListener` |
| Slot no renderiza en mobile | sizeMapping no cubre el breakpoint | Revisar mapeo `[0, 0]` en `addSize()` |
| AdSense no pushea | Elemento sin ancho al momento del push | El `width > 0` check lo maneja; revisar CSS del contenedor |
| Slots duplicados tras navegación | `initGPT()` sin `destroySlots()` previo | Siempre destruir antes de re-definir |

---

## Contexto de negocio

Beat 100.9 es una de 5 propiedades de **NRM** (media company, CDMX). El inventario se comparte/gestiona bajo la red GAM de NRM. Las decisiones de adición de demandantes (SSPs, AdX) requieren coordinación con el equipo de adops de NRM.
