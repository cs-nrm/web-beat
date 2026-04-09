# Analytics Agent — Beat 100.9

## Rol
Instrumentación de medición del sitio y el player: Google Tag Manager, GA4, comScore, Hotjar y Metricool. Agente transversal — sus archivos se solapan con ads, streaming y frontend.

---

## Archivos bajo responsabilidad

| Archivo | Sección relevante |
|---|---|
| `src/components/BaseHead.astro` | Scripts de GTM, comScore, Hotjar y Metricool |
| `src/js/analytics.js` | Helpers `ga4Track()` y `trackTritonPlaybackEvent()` para eventos del player |

> Este agente **no es dueño exclusivo** de todos estos archivos — comparte `BaseHead.astro` con `agents/ads.md` y `agents/frontend.md`. El player consume `analytics.js`, así que cambios en eventos deben coordinarse con `agents/streaming.md`.

---

## Sistemas de tracking activos

| Sistema | ID / Hash | Propósito |
|---|---|---|
| Google Tag Manager | `GTM-PN2NKB2P` | Contenedor central, dispara GA4 y otros tags |
| Google Analytics 4 | `G-8DSGT28PYF` | Pageviews + eventos custom del player |
| comScore | `c2: 6906652` | Medición de audiencia para reportes de industria |
| Hotjar | Site ID `6498971` | Heatmaps y grabaciones de sesión |
| Metricool | Hash `4fd204bbc1425414335df4a54d190be0` | Métricas de redes sociales y web |

---

## Arquitectura GTM → GA4

```
BaseHead.astro
  └─ GTM snippet (noscript fallback incluido)
      └─ dispara GA4 (G-8DSGT28PYF)
      └─ dispara otros tags configurados en GTM UI

analytics.js (para eventos del player)
  └─ gtag('event', ...) — método directo
  └─ dataLayer.push(...) — fallback si gtag no disponible
```

Los eventos del player tienen **doble método** de envío para garantizar que lleguen independientemente del orden de carga de scripts.

---

## Eventos GA4 del player (desde analytics.js)

| Evento | Parámetros enviados |
|---|---|
| `play` | `category: "Triton SDK"`, `station: "XHSONFM"`, `distribution: "WebBeat"` |
| `pause` | ídem |
| `stop` | ídem |
| `resume` | ídem |
| `ad_start` | ídem + `ad_type: "audio"` |
| `ad_complete` | ídem |
| `ad_error` | ídem + `error_code` |

> Documentación completa de eventos del player en `agents/streaming.md`.

---

## comScore

```javascript
// En BaseHead.astro
var _comscore = _comscore || [];
_comscore.push({
  c1: "2",
  c2: "6906652",
  options: {
    bypassUserConsentRequirementFor1PCookie: true
  }
});
```

- `c1: "2"` → sitio web estándar
- `c2` → ID de publisher de NRM en comScore
- El bypass de consentimiento está habilitado — revisar si aplica LGPD/requisitos legales en el futuro

---

## Hotjar

```javascript
// En BaseHead.astro
(function(h,o,t,j,a,r){
  h.hj = h.hj || function(){...}
  h._hjSettings = { hjid: 6498971, hjsv: 6 }
  // ...
})();
```

- Heatmaps activos en todas las páginas
- Session recordings habilitadas
- Sin segmentación de páginas configurada desde el código (se configura en Hotjar UI)

---

## Metricool

```javascript
// En BaseHead.astro
// Beacon de tracking con hash único del sitio
// Hash: 4fd204bbc1425414335df4a54d190be0
```

- Tracking de visitas para el dashboard de Metricool
- Vinculado a la cuenta de redes sociales de Beat

---

## Orden de carga de scripts en BaseHead.astro

El orden importa para evitar race conditions:

```
1. GTM (primero — contenedor que gestiona otros tags)
2. comScore
3. Hotjar
4. Metricool
5. AdSense (ver agents/ads.md)
6. GPT (ver agents/ads.md)
```

---

## Consideraciones de privacidad

| Sistema | Cookie tipo | Consentimiento requerido |
|---|---|---|
| GA4 via GTM | 3rd party | Sí (GDPR/LGPD) |
| comScore | 1st party (bypass activo) | Configurado con bypass |
| Hotjar | 3rd party | Sí para grabaciones |
| Metricool | 1st party | Según política de privacidad |

> Beat opera principalmente en México (LFPDPPP), no en UE. Si la audiencia se expande o NRM decide implementar CMP, GTM es el punto de control para activar/desactivar tags por consentimiento.

---

## Troubleshooting frecuente

| Síntoma | Causa probable | Solución |
|---|---|---|
| Eventos de player no llegan a GA4 | `gtag` no definido al ejecutarse `analytics.js` o el player llama antes de tiempo | El fallback `dataLayer` debería capturarlos; verificar en GTM Preview |
| Pageviews duplicados | GA4 tag en GTM + tag directo en BaseHead | Verificar que GA4 solo se dispare desde GTM, no duplicado |
| Hotjar no graba | Adblocker o privacy browser | Comportamiento esperado |
| comScore sin datos | Script bloqueado | Verificar en Network tab que el beacon llegue a `sb.scorecardresearch.com` |
| GTM Preview no conecta | GTM snippet malformado | Validar estructura del snippet en BaseHead |

---

## Contexto de negocio

Las métricas de comScore son las que NRM reporta a anunciantes para justificar CPMs. GA4 es el sistema interno de análisis de comportamiento. Hotjar lo usa el equipo de producto para UX. Cambios en cualquiera de estos scripts deben coordinarse con el equipo de marketing/adops de NRM — especialmente comScore, ya que afecta reportes de audiencia certificados.

> Nota: el roadmap contempla mover estos scripts a `src/components/head/AnalyticsScripts.astro`, pero hoy la carga real sigue viviendo en `BaseHead.astro`.
