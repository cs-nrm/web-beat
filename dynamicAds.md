# Dynamic Ads — Google Ad Manager + AdSense Fallback

Guía completa para implementar el sistema de publicidad dinámica en proyectos **Astro** con View Transitions. El sistema muestra anuncios de Google Ad Manager (GPT) como prioridad y, si no hay fill, imprime AdSense automáticamente — en desktop y mobile.

---

## Arquitectura general

```
┌─────────────────────────────────────────────────────────────┐
│  Página carga / navega (Astro View Transitions)             │
│                                                             │
│  initGPT() ──► googletag.cmd.push()                        │
│                  ├── destroySlots()          ← limpia slots │
│                  ├── defineSlot() × N        ← define slots │
│                  ├── enableServices()                       │
│                  ├── display() × N           ← solicita ads │
│                  └── adFallback() × N        ← registra FB  │
│                                                             │
│  initAdFallbackListener() (una sola vez, al inicio)        │
│    └── slotRenderEnded                                      │
│          ├── isEmpty: false → muestra GPT, oculta AdSense  │
│          └── isEmpty: true  → oculta GPT, muestra AdSense  │
└─────────────────────────────────────────────────────────────┘
```

**Regla principal:** `destroySlots()` y todo lo que dependa de GPT SIEMPRE debe estar dentro de `googletag.cmd.push()`. Nunca fuera. Si se llama antes de que `gpt.js` termine de cargar (frecuente en mobile/red lenta), `googletag` es solo el stub `{ cmd: [] }` y lanzará un TypeError que cancela toda la inicialización.

---

## 1. BaseHead (scripts globales)

En el `<head>` del layout principal, estos dos bloques en este orden exacto:

```html
<!-- AdSense — una sola vez, aquí, NO en los componentes -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>

<!-- Ad Manager (GPT) -->
<script async src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"></script>
<script is:inline>window.googletag = window.googletag || { cmd: [] };</script>
```

**Errores comunes:**
- ❌ Usar `<script defer src="gpt.js">` — `defer` hace que `document.write` (usado internamente) falle en browsers modernos.
- ❌ Cargar el script de AdSense dos veces (una en BaseHead y otra dentro del componente).
- ✅ `async` para ambos scripts.
- ✅ El stub `window.googletag = window.googletag || { cmd: [] }` debe ir inmediatamente después del tag de GPT, inline.

---

## 2. Código JavaScript central

Este bloque va en el archivo JS principal del proyecto (el que se carga en todas las páginas). Añadir **antes** de cualquier otra lógica que dependa de ads.

```javascript
// ===== Ad Fallback: GPT → AdSense =====
window._adFallbackStates = window._adFallbackStates || {};

/**
 * Registra un slot GPT con su div de AdSense fallback.
 * Llamar dentro de initGPT() → cmd.push(), después de defineSlot().
 *
 * @param {string[]} slots      - Array de IDs de divs GPT (ej: ['ad-slot4'])
 * @param {string}   fallbackId - ID del div AdSense (ej: 'ad-slot4-adsense')
 */
function adFallback(slots, fallbackId) {
  const state = { slots, fallbackId, loaded: {}, rendered: 0 };
  slots.forEach(id => { state.loaded[id] = false; });
  window._adFallbackStates[fallbackId] = state;
}

/**
 * Registra el listener de slotRenderEnded UNA SOLA VEZ al inicio.
 * Llamar con: googletag.cmd.push(initAdFallbackListener);
 */
function initAdFallbackListener() {
  googletag.pubads().addEventListener('slotRenderEnded', function(event) {
    const id = event.slot.getSlotElementId();
    for (const state of Object.values(window._adFallbackStates)) {
      if (!state.slots.includes(id)) continue;
      if (!event.isEmpty) state.loaded[id] = true;
      state.rendered++;
      if (state.rendered < state.slots.length) break;
      // Todos los slots del grupo respondieron
      const showGPT = state.slots.every(s => state.loaded[s]);
      state.slots.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = showGPT ? '' : 'none';
      });
      const fb = document.getElementById(state.fallbackId);
      if (fb) {
        fb.style.display = showGPT ? 'none' : 'block';
        if (!showGPT) {
          // Esperar a que el div sea visible antes de hacer push
          const schedulePush = () => {
            if (fb.offsetWidth > 0) {
              try { (adsbygoogle = window.adsbygoogle || []).push({}); }
              catch (e) { console.error('adFallback: adsbygoogle push failed', e); }
            } else {
              setTimeout(schedulePush, 50);
            }
          };
          requestAnimationFrame(schedulePush);
        }
      }
      break;
    }
  });
}

/**
 * Inicializa (o reinicializa) todos los slots de GPT.
 * Se llama en carga inicial Y en cada navegación (astro:page-load).
 *
 * IMPORTANTE: destroySlots() y TODO lo que dependa de GPT va DENTRO del cmd.push.
 * Si se llama fuera, en mobile/red lenta GPT aún no cargó y lanza TypeError.
 */
function initGPT() {
  googletag.cmd.push(function () {
    googletag.destroySlots(); // seguro aquí: GPT ya cargó cuando cmd se ejecuta
    window._adFallbackStates = {}; // reset del estado por cada navegación

    // ── Responsive mappings ──────────────────────────────────────────────────
    // Sintaxis correcta: addSize([viewport_w, viewport_h], [ad_w, ad_h])
    // El primer addSize que haga match con el viewport actual se usa.
    // Ordenar de mayor a menor viewport.
    //
    // Ejemplo con breakpoint md (768px) de Tailwind:
    var mappingBillboard  = googletag.sizeMapping().addSize([768, 0], [970, 250]).addSize([0, 0], [320,  50]).build();
    var mappingLeader     = googletag.sizeMapping().addSize([768, 0], [728,  90]).addSize([0, 0], [320,  50]).build();
    var mappingSuperLeader= googletag.sizeMapping().addSize([768, 0], [970,  90]).addSize([0, 0], [320,  50]).build();
    var mappingBox        = googletag.sizeMapping().addSize([0, 0],   [300, 250]).build();
    var mappingDoubleBox  = googletag.sizeMapping().addSize([0, 0],   [300, 600]).build();

    // ── Definición de slots ──────────────────────────────────────────────────
    // defineSlot(adUnitPath, sizes, divId)
    //   - adUnitPath: ruta del ad unit en AdManager  ej: "/12345678/SitioNombre"
    //   - sizes: array de tamaños que este slot puede servir
    //   - divId: id del div en el HTML
    //
    // USAR UN SLOT POR FORMATO (no pares desktop/mobile).
    // El sizeMapping le dice a GPT qué tamaño servir según viewport.
    window.slotBillboard   = googletag.defineSlot("/XXXXXXXX/Sitio", [[970, 250], [320, 50]], 'ad-slot-billboard').defineSizeMapping(mappingBillboard).addService(googletag.pubads());
    window.slotLeader      = googletag.defineSlot("/XXXXXXXX/Sitio", [[728,  90], [320, 50]], 'ad-slot-leader').defineSizeMapping(mappingLeader).addService(googletag.pubads());
    window.slotSuperLeader = googletag.defineSlot("/XXXXXXXX/Sitio", [[970,  90], [320, 50]], 'ad-slot-superleader').defineSizeMapping(mappingSuperLeader).addService(googletag.pubads());
    window.slotBox         = googletag.defineSlot("/XXXXXXXX/Sitio", [300, 250],              'ad-slot-box').defineSizeMapping(mappingBox).addService(googletag.pubads());
    window.slotDoubleBox   = googletag.defineSlot("/XXXXXXXX/Sitio", [300, 600],              'ad-slot-doublebox').defineSizeMapping(mappingDoubleBox).addService(googletag.pubads());

    googletag.pubads().setTargeting("test", "responsive");
    googletag.enableServices();

    // ── Solicitar los anuncios ───────────────────────────────────────────────
    // Solo llamar display() para slots que existan en el DOM actual.
    // Si un slot está en una página específica y no en otras, GPT falla
    // silenciosamente — no rompe otros slots.
    googletag.display('ad-slot-billboard');
    googletag.display('ad-slot-leader');
    googletag.display('ad-slot-superleader');
    googletag.display('ad-slot-box');
    googletag.display('ad-slot-doublebox');

    // ── Registrar fallbacks ──────────────────────────────────────────────────
    // Solo registrar los slots que tengan div AdSense fallback en el HTML.
    // Slots sin fallback (ej: ads de modal) no necesitan registrarse aquí.
    adFallback(['ad-slot-billboard'],   'ad-slot-billboard-adsense');
    adFallback(['ad-slot-leader'],      'ad-slot-leader-adsense');
    adFallback(['ad-slot-superleader'], 'ad-slot-superleader-adsense');
    adFallback(['ad-slot-box'],         'ad-slot-box-adsense');
    adFallback(['ad-slot-doublebox'],   'ad-slot-doublebox-adsense');
  });
}

// ── Bootstrap: carga inicial ─────────────────────────────────────────────────
initGPT();
// El listener se registra UNA SOLA VEZ aquí (no dentro de initGPT)
// para no acumular listeners duplicados en cada navegación.
googletag.cmd.push(initAdFallbackListener);
```

### Manejo de navegación con Astro View Transitions

En el handler de `astro:page-load`, reinicializar GPT después del DOM swap:

```javascript
document.addEventListener('astro:page-load', () => {
  // ... resto del código de la página ...

  // Reinicializa slots tras el DOM swap de View Transitions
  if (window.googletag && googletag.apiReady) {
    initGPT();
  } else {
    window.googletag = window.googletag || { cmd: [] };
    googletag.cmd.push(function() { initGPT(); });
  }
});
```

**Por qué es necesario:** Astro View Transitions hace un swap completo del DOM. Los divs `#ad-slot-*` anteriores desaparecen y GPT pierde su referencia. `destroySlots()` + re-`defineSlot()` + re-`display()` reconstruye todo contra los nuevos nodos.

---

## 3. Estructura HTML de cada componente de anuncio

Patrón estándar para cualquier formato:

```html
<!-- El div GPT no lleva style="display:none" — GPT lo controla vía adFallback -->
<div id="ad-slot-NOMBRE"></div>

<!-- El div AdSense SÍ lleva display:none — solo se muestra si GPT falla -->
<div id="ad-slot-NOMBRE-adsense" style="display:none;">
  <ins class="adsbygoogle"
    style="display:block; width:100%; height:Xpx;"
    data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX"
    data-ad-slot="XXXXXXXXXX"
    data-ad-format="horizontal"
    data-full-width-responsive="true"></ins>
</div>
```

**Reglas:**
- ❌ No poner `<script>` inline en los componentes para inicializar GPT — todo va en el JS central.
- ❌ No cargar `adsbygoogle.js` aquí — ya está en BaseHead.
- ❌ No llamar `(adsbygoogle).push({})` al cargar el componente — lo llama `adFallback` cuando corresponde.
- ✅ Los IDs deben coincidir exactamente con los usados en `defineSlot()`, `display()` y `adFallback()`.

### Ejemplos por formato

#### Billboard (970×250 desktop / 320×50 mobile)
```html
<div class="billboard mx-auto text-center w-full lg:w-[970px] h-[250px]">
  <span class="text-xs text-zinc-500">PUBLICIDAD</span>
  <div id="ad-slot-billboard"></div>
  <div id="ad-slot-billboard-adsense" style="display:none;">
    <ins class="adsbygoogle"
      style="display:block; width:100%; height:250px;"
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX"
      data-ad-slot="XXXXXXXXXX"
      data-ad-format="horizontal"
      data-full-width-responsive="true"></ins>
  </div>
</div>
```

#### Leaderboard (728×90 desktop / 320×50 mobile)
```html
<div class="leader mx-auto text-center w-full lg:w-[728px] h-[90px]">
  <span class="text-xs text-zinc-500">PUBLICIDAD</span>
  <div id="ad-slot-leader"></div>
  <div id="ad-slot-leader-adsense" style="display:none;">
    <ins class="adsbygoogle"
      style="display:block; width:100%; height:90px;"
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX"
      data-ad-slot="XXXXXXXXXX"
      data-ad-format="horizontal"
      data-full-width-responsive="true"></ins>
  </div>
</div>
```

#### Box / Medium Rectangle (300×250, fijo)
```html
<div class="box mx-auto text-center w-[300px] h-[250px]">
  <span class="text-xs text-zinc-500">PUBLICIDAD</span>
  <div id="ad-slot-box"></div>
  <div id="ad-slot-box-adsense" style="display:none;">
    <ins class="adsbygoogle"
      style="display:block; width:100%; height:250px;"
      data-ad-client="ca-pub-XXXXXXXXXXXXXXXXX"
      data-ad-slot="XXXXXXXXXX"
      data-ad-format="rectangle"
      data-full-width-responsive="true"></ins>
  </div>
</div>
```

---

## 4. Checklist de implementación en un proyecto nuevo

### Paso 1 — Identificar datos del proyecto
- [ ] **AdManager network ID** (número en la ruta del ad unit, ej: `/21799830913/`)
- [ ] **Nombre del sitio** en AdManager (ej: `Beat`, `Oye`, `Ke Buena`)
- [ ] **AdSense publisher ID** (`ca-pub-XXXXXXXXXXXXXXXXX`)
- [ ] **AdSense ad slot IDs** — uno por formato (billboard, leaderboard, box, etc.)
- [ ] **Formatos activos en este sitio** (no todos los sitios tienen todos los formatos)

### Paso 2 — BaseHead
- [ ] Añadir `<script async src="adsbygoogle.js">` una sola vez
- [ ] Añadir `<script async src="gpt.js">`
- [ ] Añadir `<script is:inline>window.googletag = window.googletag || { cmd: [] };</script>` inmediatamente después
- [ ] Verificar que AdSense NO esté cargándose dos veces (buscar duplicados en el proyecto)

### Paso 3 — JS central
- [ ] Copiar las funciones `adFallback()`, `initAdFallbackListener()` e `initGPT()` al archivo JS principal
- [ ] Adaptar en `initGPT()`:
  - Rutas de ad units (`/XXXXXXXX/Sitio`)
  - IDs de divs (`ad-slot-*`)
  - Tamaños de slots
  - Breakpoint del sizeMapping (768px = Tailwind `md:`, ajustar si el proyecto usa otro)
- [ ] Verificar que `initGPT()` y `googletag.cmd.push(initAdFallbackListener)` se llamen al final
- [ ] Añadir `initGPT()` en el handler `astro:page-load`

### Paso 4 — Componentes HTML
- [ ] Crear un componente por formato (BillBoard, LeaderBoard, BoxBanner, etc.)
- [ ] Cada componente: div GPT sin `display:none` + div AdSense con `display:none`
- [ ] Sin `<script>` inline en los componentes
- [ ] Sin `adsbygoogle.push({})` en los componentes
- [ ] IDs de divs idénticos a los usados en el JS

### Paso 5 — Verificación
- [ ] Desktop: ¿se ve publicidad? (GPT o AdSense)
- [ ] Mobile: ¿se ve publicidad? (GPT o AdSense)
- [ ] Navegar de home a una interna: ¿siguen apareciendo los banners?
- [ ] Navegar de vuelta al home: ¿siguen apareciendo los banners?
- [ ] Consola del browser: ¿sin errores de `destroySlots is not a function` o `adsbygoogle push failed`?

---

## 5. Errores conocidos y sus soluciones

### ❌ "Mobile no muestra publicidad" / "destroySlots is not a function"
**Causa:** `googletag.destroySlots()` se llama fuera de `cmd.push`. En mobile/red lenta, `gpt.js` no terminó de cargar → `googletag` es solo el stub `{ cmd: [] }` que no tiene ese método → TypeError → toda la inicialización aborta.

**Solución:** `destroySlots()` dentro del `cmd.push`:
```javascript
// ❌ Mal
function initGPT() {
  googletag.destroySlots(); // fuera → crash si GPT no cargó
  googletag.cmd.push(function() { ... });
}

// ✅ Bien
function initGPT() {
  googletag.cmd.push(function() {
    googletag.destroySlots(); // dentro → GPT siempre está listo aquí
    ...
  });
}
```

### ❌ "Los banners desaparecen al navegar entre páginas"
**Causa:** Astro View Transitions swap el DOM. Los divs `#ad-slot-*` se reemplazan por nuevos nodos; GPT sigue apuntando a los viejos.

**Solución:** Llamar `initGPT()` en `astro:page-load`. Esto destruye los slots viejos y los redefine contra los nuevos nodos del DOM.

### ❌ "AdSense no se muestra aunque GPT está vacío"
**Causas frecuentes:**
1. El div `id="ad-slot-X-adsense"` tiene `display:none` pero `adFallback` no está registrado para ese slot (falta la línea `adFallback(['ad-slot-X'], 'ad-slot-X-adsense')` en `initGPT`).
2. El script de AdSense no cargó (falta en BaseHead o está duplicado con error).
3. `adsbygoogle.push({})` se llamó antes de que el div tenga ancho visible (el `schedulePush` con `offsetWidth > 0` soluciona esto).
4. Hay un `<script>` inline en el componente que interfiere con el listener central.

**Solución:** Revisar que el patrón completo esté aplicado: componente limpio (sin inline scripts) + slot registrado en `adFallback()`.

### ❌ "Doble impresión / se ve publicidad duplicada"
**Causa:** Existían dos slots separados (uno desktop, uno mobile) definidos simultáneamente. Ambos piden anuncio aunque solo uno sea visible por CSS.

**Solución:** Un solo slot por formato con `sizeMapping` responsive. GPT elige el tamaño según el viewport real del usuario.

### ❌ "El listener de slotRenderEnded se acumula en cada navegación"
**Causa:** `pubads().addEventListener(...)` dentro de `initGPT()`, que se llama en cada `astro:page-load`.

**Solución:** `initAdFallbackListener` se registra una sola vez vía `googletag.cmd.push(initAdFallbackListener)` fuera de `initGPT()`. El estado compartido `window._adFallbackStates` se resetea en cada `initGPT()`, así el listener siempre lee el estado fresco de la navegación actual.

### ❌ "GPT falla silenciosamente en ciertos slots"
**Causa:** `googletag.display('ad-slot-X')` se llama pero `#ad-slot-X` no existe en el DOM de esa página (slot de una sección que no está incluida).

**Comportamiento:** GPT falla silenciosamente para ese slot pero no rompe los demás. No es un error crítico, pero genera peticiones de red innecesarias.

**Solución:** Si un slot solo aparece en ciertas páginas, verificar existencia antes de llamar `display()`:
```javascript
if (document.getElementById('ad-slot-especial')) {
  googletag.display('ad-slot-especial');
  adFallback(['ad-slot-especial'], 'ad-slot-especial-adsense');
}
```

---

## 6. Sintaxis de sizeMapping — referencia rápida

```javascript
// ✅ Correcto: addSize([viewport_ancho, viewport_alto], [ad_ancho, ad_alto])
googletag.sizeMapping()
  .addSize([1024, 0], [970, 250])  // pantallas ≥ 1024px → billboard
  .addSize([768,  0], [728,  90])  // pantallas ≥ 768px  → leaderboard
  .addSize([0,    0], [320,  50])  // cualquier tamaño   → mobile banner
  .build();

// ❌ Incorrecto (sintaxis antigua / inventada):
googletag.sizeMapping().addSize([970, 250]).build(); // falta el primer argumento
```

**Breakpoints comunes:**

| Tailwind | px   | Uso típico |
|----------|------|-----------|
| `sm:`    | 640  | Tablet pequeña |
| `md:`    | 768  | Tablet / desktop inicio |
| `lg:`    | 1024 | Desktop |
| `xl:`    | 1280 | Desktop ancho |

---

## 7. Lo que NO hace este sistema

- **No refresca automáticamente** los banners cada N minutos. Si se necesita refresh por tiempo, usar `setInterval(() => googletag.pubads().refresh([slot]), 180000)`.
- **No maneja ads de video** (VAST). El SDK de Triton/streaming tiene su propio flujo.
- **No aplica a Google Tag Manager (GTM)** — GPT y GTM son independientes; este sistema solo gestiona GPT directamente.
- **No incluye Consent Management** (CMP/GDPR). Si el sitio requiere consentimiento, configurar `googletag.pubads().setPrivacySettings()` antes de `enableServices()`.
