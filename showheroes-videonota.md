# Implementación ShowHeroes - Video Flotante en Interiores (Ad Manager)

## Contexto
ShowHeroes entrega el video flotante vía Google Ad Manager. El script anterior de Viralize (`viralize.tv`) ya no funciona y debe ser eliminado.

---

## Cambio 1: `src/js/ads.js`

### 1a. Agregar el size mapping (junto a los demás mappings):
```js
var mappingVideoNota = googletag.sizeMapping().addSize([0, 0], [400, 311]).build();
```

### 1b. Definir el slot (junto a los demás `defineSlot`):
```js
window.slotVideoNota = googletag.defineSlot("/23349147378/StereoCien", [400, 311], 'ad-slot-videonota').defineSizeMapping(mappingVideoNota).addService(googletag.pubads());
```

### 1c. Llamar al display del slot (junto a los demás `googletag.display`):
```js
if (document.getElementById('ad-slot-videonota')) googletag.display('ad-slot-videonota');
```

> Nota: el slot `videonota` **no** lleva `adFallback` (no tiene fallback de AdSense).

---

## Cambio 2: Páginas de interiores de contenido (`src/pages/[seccion]/[slug].astro`)

### Eliminar el script viejo de Viralize:
```html
<script is:inline data-wid="auto" type="text/javascript" src="https://content.viralize.tv/display/?zid=AAGEvmBi3yVQL6nZ&u=%%REFERRER_URL_ESC%%"></script>
```

### Reemplazarlo con el div del slot, **dentro del `<div class="w-full">`**, justo después del contenido renderizado:
```html
<div class="w-full">
  <Fragment set:html={post.content.rendered} />
  <div id="ad-slot-videonota"></div>
</div>
```

Hacer este reemplazo en **todos los slugs de interiores** (donde se lee la nota), no en páginas de listado o home.

---

## Verificación
- Buscar que no quede ninguna referencia a `viralize.tv` en el proyecto.
- Confirmar que el div `id="ad-slot-videonota"` aparece en el HTML renderizado de una nota interior.
- En Ad Manager, el slot debe estar configurado con el line item de ShowHeroes apuntando al placement correspondiente.
