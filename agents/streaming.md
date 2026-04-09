# Streaming Agent — Beat 100.9

## Rol
Player de radio en vivo, integración Triton SDK, polling adaptativo de "now playing" y gestión de audio ads (VAST).

---

## Archivos bajo responsabilidad

| Archivo | Sección relevante |
|---|---|
| `src/components/Player.astro` | Markup completo del player flotante |
| `src/js/player.js` | Inicialización `TDSdk`, polling de canción, eventos Triton, cover art, controles del player y lógica de "PAUSA COMERCIAL" |
| `src/js/analytics.js` | Tracking `ga4Track()` y `trackTritonPlaybackEvent()` consumido por el player |
| `src/js/ads.js` | Integración `initGPT()` y refresh de slots disparados desde el player |

### Dependencias externas (CDN NRM)
| Librería | URL |
|---|---|
| jQuery | `https://storage.googleapis.com/nrm-web/nrm/lib/jquery.js` |
| Triton SDK | `https://sdk.listenlive.co/web/2.9/td-sdk.min.js` |
| Player lib | `https://storage.googleapis.com/nrm-web/nrm/lib/player-0.1.0.min.js` |
| Day.js | `https://storage.googleapis.com/nrm-web/nrm/lib/dayjs.min.js` |
| Flickity | `https://storage.googleapis.com/nrm-web/nrm/lib/flickity.pkgd.min.js` |

### APIs externas
| API | Propósito |
|---|---|
| `cdn.nrm.com.mx/cdn/beat/playlist/cancion.json` | "Now playing" — título y artista en curso |
| Last.fm `track.getInfo` | Cover art del track actual |

---

## Configuración Triton SDK

```javascript
TDSdk({
  coreModules: [{ id: 'MediaPlayer' }],
  plugins: [{ id: 'vastAd' }],       // audio ads
  analyticsEnabled: true,
  appInstallerId: 'beatpag',
  station: 'XHSONFM',
  distribution: 'WebBeat',
  gaTrackingId: 'G-8DSGT28PYF',
  sampleRate: 100
})
```

---

## Arquitectura del player

```
Player.astro
  └─ Float container (fixed: bottom-right desktop, bottom-left mobile)
  └─ Flickity carousel (programación de la semana)
  └─ Botón play/pause (SVG animado)
  └─ Volume control (solo desktop)
  └─ Now playing display (título / artista)
  └─ Share button (WhatsApp deep link)
  └─ transition:persist → sobrevive a View Transitions
```

---

## Polling adaptativo de "now playing"

El intervalo de polling se ajusta según estado del player y visibilidad de pestaña:

| Condición | Intervalo |
|---|---|
| Playing + tab visible | 15s |
| Tab visible (no playing) | 30s |
| Tab en background | 60s |

**Optimizaciones implementadas:**
- `ETag` / `Last-Modified` para requests condicionales (evita re-parsear si no cambió)
- `AbortController` cancela requests en vuelo al navegar (`astro:before-preparation`)
- `document.hidden` / `visibilitychange` ajusta cadencia dinámicamente

---

## Estados del display "now playing"

| Estado | Texto mostrado |
|---|---|
| Track normal | `{título} — {artista}` |
| Audio ad activo | `PAUSA COMERCIAL` |
| Sin señal / error | `Beat 100.9` (fallback) |
| Cargando | estado de transición |

---

## Eventos GA4 del player

Todos los eventos se envían vía `gtag()` con fallback a `dataLayer` (GTM):

| Evento Triton | Acción GA4 | Categoría |
|---|---|---|
| `stream-start` | `play` | `Triton SDK` |
| `stream-stop` | `stop` | `Triton SDK` |
| `stream-pause` | `pause` | `Triton SDK` |
| `stream-resume` | `resume` | `Triton SDK` |
| `ad-playback-start` | `ad_start` | `Triton SDK` |
| `ad-playback-complete` | `ad_complete` | `Triton SDK` |
| `ad-playback-error` | `ad_error` | `Triton SDK` |

---

## View Transitions

El player sobrevive a la navegación via `transition:persist`. Sin embargo:

- `astro:before-preparation` → cancela fetch de canción en vuelo
- `astro:page-load` → resume el polling con la cadencia correcta
- El estado play/pause se mantiene sin reinicialización

---

## Audio ads (VAST)

- Plugin `vastAd` de Triton SDK maneja el ciclo completo
- Durante ad: player muestra "PAUSA COMERCIAL", deshabilita controls
- Al completar: retoma track, re-habilita controls
- Errores de VAST no interrumpen la sesión de streaming

---

## Troubleshooting frecuente

| Síntoma | Causa probable | Solución |
|---|---|---|
| Player se reinicia al navegar | `transition:persist` faltante en el elemento | Verificar atributo en `Player.astro` |
| "Now playing" se congela | AbortController no se resetea | Revisar handler de `astro:before-preparation` |
| Cover art no carga | Last.fm rate limit o track no encontrado | El fallback es el logo de Beat |
| Audio ad sin sonido | VAST URL vacía o bloqueada por adblocker | Comportamiento esperado; no es bug |
| Polling muy frecuente en background | `visibilitychange` no disparado | Revisar binding del evento en `player.js` |

---

## Contexto de negocio

El streaming se distribuye bajo la estación **XHSONFM** en la red Triton Digital (ID de red: 7833, también en `ads.txt`). Los audio ads de Triton son un stream de ingresos separado al display advertising de GAM.
