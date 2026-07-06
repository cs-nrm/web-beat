# Dynamic Ads — Google Ad Manager (sin fallback a AdSense)

Guía completa para implementar el sistema de publicidad dinámica en proyectos **Astro** con View Transitions. El sistema muestra únicamente anuncios de Google Ad Manager (GPT), en desktop y mobile. No hay fallback a AdSense — si GPT no tiene fill, el slot simplemente queda vacío.

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
│                  └── display() × N           ← solicita ads │
└─────────────────────────────────────────────────────────────┘
```

**Regla principal:** `destroySlots()` y todo lo que dependa de GPT SIEMPRE debe estar dentro de `googletag.cmd.push()`. Nunca fuera. Si se llama antes de que `gpt.js` termine de cargar (frecuente en mobile/red lenta), `googletag` es solo el stub `{ cmd: [] }` y lanzará un TypeError que cancela toda la inicialización.

---

## 1. BaseHead (scripts globales)

En el `<head>` del layout principal:

```html
<!-- Ad Manager (GPT) -->
<script async src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"></script>
<script is:inline>window.googletag = window.googletag || { cmd: [] };</script>
```

**Errores comunes:**
- ❌ Usar `<script defer src="gpt.js">` — `defer` hace que `document.write` (usado internamente) falle en browsers modernos.
- ✅ `async` para el script.
- ✅ El stub `window.googletag = window.googletag || { cmd: [] }` debe ir inmediatamente después del tag de GPT, inline.

---

## 2. Código JavaScript central

Este bloque va en el archivo JS principal del proyecto (el que se carga en todas las páginas).

```javascript
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

    // ── Responsive mappings ──────────────────────────────────────────────────
    // Sintaxis correcta: addSize([viewport_w, viewport_h], [ad_w, ad_h])
    // El primer addSize que haga match con el viewport actual se usa.
    // Ordenar de mayor a menor viewport.
    //
    // Formatos estandarizados a solo dos tamaños: leaderboard (728x90) y box (300x250).
    // El mismo objeto de mapping se reutiliza en todos los slots del mismo formato.
    var mappingLeaderboard = googletag.sizeMapping().addSize([768, 0], [728, 90]).addSize([0, 0], [320, 50]).build();
    var mappingBox         = googletag.sizeMapping().addSize([0, 0], [300, 250]).build();

    // ── Definición de slots ──────────────────────────────────────────────────
    // defineSlot(adUnitPath, sizes, divId)
    //   - adUnitPath: ruta del ad unit en AdManager  ej: "/12345678/SitioNombre"
    //   - sizes: array de tamaños que este slot puede servir
    //   - divId: id del div en el HTML
    //
    // USAR UN SLOT POR FORMATO (no pares desktop/mobile).
    // El sizeMapping le dice a GPT qué tamaño servir según viewport.
    //
    // Naming: cuando hay varios slots del mismo formato en el sitio, se numeran
    // secuencialmente — ad-slot-leaderboard1, ad-slot-leaderboard2, ad-slot-boxbanner1, etc.
    window.slotLeaderboard1 = googletag.defineSlot("/XXXXXXXX/Sitio", [[728, 90], [320, 50]], 'ad-slot-leaderboard1').defineSizeMapping(mappingLeaderboard).addService(googletag.pubads());
    window.slotLeaderboard2 = googletag.defineSlot("/XXXXXXXX/Sitio", [[728, 90], [320, 50]], 'ad-slot-leaderboard2').defineSizeMapping(mappingLeaderboard).addService(googletag.pubads());
    window.slotBoxbanner1   = googletag.defineSlot("/XXXXXXXX/Sitio", [300, 250],              'ad-slot-boxbanner1').defineSizeMapping(mappingBox).addService(googletag.pubads());
    window.slotBoxbanner2   = googletag.defineSlot("/XXXXXXXX/Sitio", [300, 250],              'ad-slot-boxbanner2').defineSizeMapping(mappingBox).addService(googletag.pubads());

    googletag.pubads().setTargeting("test", "responsive");
    googletag.enableServices();

    // ── Solicitar los anuncios ───────────────────────────────────────────────
    // Solo llamar display() para slots que existan en el DOM actual.
    // Si un slot está en una página específica y no en otras, GPT falla
    // silenciosamente — no rompe otros slots.
    if (document.getElementById('ad-slot-leaderboard1')) googletag.display('ad-slot-leaderboard1');
    if (document.getElementById('ad-slot-leaderboard2')) googletag.display('ad-slot-leaderboard2');
    if (document.getElementById('ad-slot-boxbanner1'))   googletag.display('ad-slot-boxbanner1');
    if (document.getElementById('ad-slot-boxbanner2'))   googletag.display('ad-slot-boxbanner2');
  });
}

// ── Bootstrap: carga inicial ─────────────────────────────────────────────────
initGPT();
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

Patrón estándar para cualquier formato — un único div, sin markup de fallback:

```html
<div id="ad-slot-NOMBRE"></div>
```

**Reglas:**
- ❌ No poner `<script>` inline en los componentes para inicializar GPT — todo va en el JS central.
- ❌ No agregar divs ni `<ins>` de AdSense — el fallback fue removido del proyecto.
- ✅ Los IDs deben coincidir exactamente con los usados en `defineSlot()` y `display()`.
- ✅ Solo dos formatos estándar: **leaderboard** (728×90) y **box** (300×250). Cualquier formato horizontal nuevo se estandariza a leaderboard. Formatos verticales/especiales (double box, modal) quedan fuera del estándar y se manejan caso por caso.
- ✅ Si hay varios slots del mismo formato, numerarlos: `ad-slot-leaderboard1`, `ad-slot-leaderboard2`... `ad-slot-boxbanner1`, `ad-slot-boxbanner2`...

### Ejemplos por formato

#### Leaderboard (728×90 desktop / 320×50 mobile)
```html
<div class="leaderboard mx-auto text-center w-full lg:w-[728px] h-[90px]">
  <span class="text-xs text-zinc-500">PUBLICIDAD</span>
  <div id="ad-slot-leaderboard1"></div>
</div>
```

#### Box / Medium Rectangle (300×250, fijo)
```html
<div class="boxbanner mx-auto text-center w-[300px] h-[250px]">
  <span class="text-xs text-zinc-500">PUBLICIDAD</span>
  <div id="ad-slot-boxbanner1"></div>
</div>
```

---

## 4. Checklist de implementación en un proyecto nuevo

### Paso 1 — Identificar datos del proyecto
- [ ] **AdManager network ID** (número en la ruta del ad unit, ej: `/21799830913/`)
- [ ] **Nombre del sitio** en AdManager (ej: `Beat`, `Oye`, `Ke Buena`)
- [ ] **Formatos activos en este sitio** (no todos los sitios tienen todos los formatos)

### Paso 2 — BaseHead
- [ ] Añadir `<script async src="gpt.js">`
- [ ] Añadir `<script is:inline>window.googletag = window.googletag || { cmd: [] };</script>` inmediatamente después

### Paso 3 — JS central
- [ ] Copiar la función `initGPT()` al archivo JS principal
- [ ] Adaptar en `initGPT()`:
  - Rutas de ad units (`/XXXXXXXX/Sitio`)
  - IDs de divs (`ad-slot-*`)
  - Tamaños de slots
  - Breakpoint del sizeMapping (768px = Tailwind `md:`, ajustar si el proyecto usa otro)
- [ ] Verificar que `initGPT()` se llame al final
- [ ] Añadir `initGPT()` en el handler `astro:page-load`

### Paso 4 — Componentes HTML
- [ ] Crear un componente por formato (BillBoard, LeaderBoard, BoxBanner, etc.)
- [ ] Cada componente: solo el div GPT, sin markup adicional
- [ ] Sin `<script>` inline en los componentes
- [ ] IDs de divs idénticos a los usados en el JS

### Paso 5 — Verificación
- [ ] Desktop: ¿se ve publicidad de GPT?
- [ ] Mobile: ¿se ve publicidad de GPT?
- [ ] Navegar de home a una interna: ¿siguen apareciendo los banners?
- [ ] Navegar de vuelta al home: ¿siguen apareciendo los banners?
- [ ] Consola del browser: ¿sin errores de `destroySlots is not a function`?

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

### ❌ "Doble impresión / se ve publicidad duplicada"
**Causa:** Existían dos slots separados (uno desktop, uno mobile) definidos simultáneamente. Ambos piden anuncio aunque solo uno sea visible por CSS.

**Solución:** Un solo slot por formato con `sizeMapping` responsive. GPT elige el tamaño según el viewport real del usuario.

### ❌ "GPT falla silenciosamente en ciertos slots"
**Causa:** `googletag.display('ad-slot-X')` se llama pero `#ad-slot-X` no existe en el DOM de esa página (slot de una sección que no está incluida).

**Comportamiento:** GPT falla silenciosamente para ese slot pero no rompe los demás. No es un error crítico, pero genera peticiones de red innecesarias.

**Solución:** Si un slot solo aparece en ciertas páginas, verificar existencia antes de llamar `display()`:
```javascript
if (document.getElementById('ad-slot-especial')) {
  googletag.display('ad-slot-especial');
}
```

### ⚠️ "El slot queda vacío / no aparece nada"
**Causa:** Sin fallback, si GAM no tiene fill para un slot (baja demanda, geo/targeting sin cobertura), el div simplemente queda vacío. Esto es el comportamiento esperado desde que se removió AdSense — ya no hay una segunda capa de anuncios.

---

## 6. Sintaxis de sizeMapping — referencia rápida

```javascript
// ✅ Correcto: addSize([viewport_ancho, viewport_alto], [ad_ancho, ad_alto])
googletag.sizeMapping()
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

- **No tiene fallback a AdSense.** Si GAM no rellena un slot, queda vacío. (Removido intencionalmente — ver historial de git para el sistema anterior con fallback.)
- **No refresca automáticamente** los banners cada N minutos. Si se necesita refresh por tiempo, usar `setInterval(() => googletag.pubads().refresh([slot]), 180000)`.
- **No maneja ads de video** (VAST). El SDK de Triton/streaming tiene su propio flujo.
- **No aplica a Google Tag Manager (GTM)** — GPT y GTM son independientes; este sistema solo gestiona GPT directamente.
- **No incluye Consent Management** (CMP/GDPR). Si el sitio requiere consentimiento, configurar `googletag.pubads().setPrivacySettings()` antes de `enableServices()`.
