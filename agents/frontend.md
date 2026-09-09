# Frontend Agent — Beat 100.9

## Rol

Cómo se ve y cómo se siente el sitio: el design system, los componentes, la
cabecera y el pie, la maqueta de cada bloque, y el movimiento. Es el agente con más
archivos y el que más comparte.

🔴 **Este documento se reescribió por completo el 2026-09-08.** El anterior
describía el sitio v1 y **casi ninguno de los archivos que reclamaba existe.**
Comprobado uno por uno: de los 17 componentes que listaba, **cero**; de los 28
layouts —los `CardsHome*`, los `Slider*`, `Layout.astro`, `BlogPost.astro`—,
**cero**; `public/fonts/`, tampoco. Solo sobrevivieron cuatro entradas de su tabla:
`src/styles/`, `tailwind.config.js`, `public/favicon/` y `public/img/`.

Y lo que describía como stack tampoco es el de aquí:

| El acta vieja decía | La realidad de v2 |
|---|---|
| Tailwind 3.4.1 por `@astrojs/tailwind` | **Tailwind 4** por el plugin de Vite. Esa integración se quedó en Tailwind 3 y Astro 5 |
| Anton, BebasNeue, FjallaOne, FiraSans, Roboto, Poppins, Audiowide, Gendy, Atkinson | **Tres familias variables**, auto-hospedadas: Archivo, Schibsted Grotesk, Martian Mono |
| Flickity desde el CDN de NRM | **No hay carruseles ni jQuery.** Ni una dependencia de CDN para maqueta |
| Breakpoints `md:` 768px, `lg:` 1024px | **`md:` es 900px**, sobreescrito con los del design system |
| Archivos `_` experimentales, `Navidad.astro`, `SliderBuenfin.astro` | No existe ninguno. No hay convención `_` de experimentales |
| «Sistema de favicons» a mano en `public/favicon/` | Se **GENERA** con `pnpm favicon`, y es de `agents/metadata.md` |

Un agente que manda a editar archivos fantasma es peor que no tener agente: hace
perder una tarde y luego hace dudar del resto de la documentación.

---

## Archivos bajo responsabilidad

### El cascarón y el cromo

| Archivo | Qué le toca |
|---|---|
| `src/layouts/Base.astro` | El cascarón: el orden del `body`, `data-vista`, el `<slot name="sobre-cabecera">`, la barra de progreso y el cableado de los módulos de `src/scripts/` |
| `src/components/Cabecera.astro` | La barra clara del player + la barra oscura de navegación, y su plegado. Lleva `transition:persist` |
| `src/components/MenuLleno.astro` | El menú a pantalla completa. Va FUERA de la cabecera a propósito |
| `src/components/Pie.astro` | El pie: secciones, redes, apps, legales y la tira de marcas de NRM |
| `src/components/NavSecciones.astro` | La tira de pastillas de los interiores |
| `src/components/Intro.astro` | El intro de una vez por sesión |
| `src/config/navegacion.ts` | **Solo los rótulos y el orden.** Qué categoría llena cada sección es de `agents/content.md` |
| `src/middleware.ts` | **Solo** la política de caché del HTML. El bloque del `X-Robots-Tag` es de `agents/metadata.md` |

### Los bloques de contenido

| Archivo | Qué le toca |
|---|---|
| `src/components/inicio/Mosaico.astro` | La portada de Beat Scanner |
| `src/components/inicio/PilaScanner.astro` | La pila de Editorial |
| `src/components/inicio/Fenomeno.astro` | El bloque del Fenómeno Residente, con su visor de cápsulas |
| `src/components/inicio/ArchivoTemas.astro` | El archivo de temas del Fenómeno |
| `src/components/inicio/BonusBeat.astro` | Las tres canciones con su viñeta |
| `src/components/inicio/Agenda.astro` | La agenda |
| `src/components/inicio/Marquee.astro` | La tira que corre |
| `src/components/IndiceScanner.astro` | El interior compartido de `/beat-scanner`, `/editorial` y `/etiqueta/*` |
| `src/components/TarjetaNota.astro` | La tarjeta de nota, en todos sus contextos |
| `src/components/Lexical.astro` | El cuerpo de la nota, desde el Lexical del CMS |
| `src/components/Embed.astro` | Los bloques incrustados del cuerpo |
| `src/components/CabezaSeccion.astro`, `Remate.astro`, `RejillaEdiciones.astro`, `PaginaTexto.astro`, `Icono.astro` | Las piezas compartidas |

### Estilos y tipografía

| Archivo | Qué le toca |
|---|---|
| `src/styles/base.css` | 🔴 **El orden de capas.** Es el archivo más importante de este agente |
| `src/styles/beat.css` | Los deltas del proyecto sobre el design system |
| `src/styles/ds/` | El design system, **copiado del lienzo. No se edita** |
| `src/styles/fuentes.css` | Las `@font-face` auto-hospedadas. 🤖 Generado, no se toca a mano |
| `tailwind.config.js` | Mapea las CSS vars del DS a utilidades. **Ni un valor literal** |
| `scripts/fuentes.mjs` → `public/fuentes/` | `pnpm fuentes` genera los ocho `.woff2` |
| `scripts/guarda-cascada.mjs` | La guarda que lee el CSS **construido** y caza dos reglas peleando |
| `public/img/beat-blanco.svg`, `beat-intro.svg` | El wordmark y la marca del intro |

### El movimiento

| Archivo | Qué le toca |
|---|---|
| `src/scripts/cabecera.ts` | El plegado, con sus dos umbrales |
| `src/scripts/menu.ts` | Abrir, cerrar y dónde queda el foco |
| `src/scripts/revelar.ts` | Lo que aparece al entrar en pantalla |
| `src/scripts/escribir.ts` | El texto que se descifra |
| `src/scripts/cursor.ts` | Publica la posición del puntero; el CSS decide qué dibujar |
| `src/scripts/rejilla.ts` | La luz que recorre la trama del fondo |
| `src/scripts/intro.ts` | Una vez por sesión, y con salida |
| `src/scripts/progreso.ts` | La barra de progreso de navegación |
| `movimiento.md` | 🔴 **El contrato de movimiento e interacción.** Se lee antes de animar nada |

⚠️ **`src/js/` entero es LEGADO** y no se toca: comprobado con `grep`, ningún archivo
de `src/` lo importa, y `scripts/guardas.mjs` lo excluye a propósito. Su port vivo
está en `src/scripts/`.

> **No es dueño exclusivo de `Base.astro`.** El `<head>` lo comparte con
> `agents/metadata.md` (título, canónica, Open Graph, iconos, indexación, JSON-LD) y
> `agents/analytics.md` (la medición, cuando exista). Y el `<slot
> name="sobre-cabecera">` lo llena `agents/ads.md`. Cualquier cambio ahí se coordina
> con los tres.

---

## 🔴 El orden de capas, que es lo primero que hay que entender

Vive en `src/styles/base.css` y es la línea que sostiene todo lo demás:

```css
@layer theme, base, ds, proyecto, components, utilities;
```

**Sin eso, el design system le gana a TODA utilidad de Tailwind, en silencio.** El CSS
sin capa vence al CSS en capas —es la cascada— y Tailwind 4 mete todo lo suyo en
`@layer` mientras el DS venía suelto. Dos casos medidos sobre el sitio ya construido:

- `ds/tokens/base.css` declara `img,svg,video{display:block}`, así que `hidden` **no
  ocultaba ninguno de los tres.** Se vio como dos lupas apiladas en la cabecera.
- `.beat-label` fijaba 11px y le ganaba a `text-[9.5px]` de la nav. **El tamaño
  escrito en el marcado no era el que se pintaba.**

Con el orden declarado: el DS gana al preflight de Tailwind (que es lo que queremos,
los resets de marca mandan), `beat.css` gana al DS (son los deltas del proyecto), y
las utilidades ganan a los dos — que es para lo que existen.

### 🔴 Y su consecuencia: hay cosas que NO se pueden arreglar desde `beat.css`

Cuando lo que hay que cambiar es un valor que puso una **utilidad de Tailwind**
—`h-header`, `hidden`, un ancho—, desde `beat.css` no se gana **ni con toda la
especificidad del mundo**, porque las capas mandan sobre la especificidad. Los
estilos de un componente `.astro` no llevan capa, así que ganan a todas.

De ahí que el plegado de la cabecera y los dos modos de la barra vivan en el
`<style>` de `Cabecera.astro` y no en `beat.css`. Está anotado ahí con la medición:
antes de moverlo, la barra se quedaba en 56px.

⚠️ **Y por eso `!important` casi nunca es la respuesta aquí**: el síntoma de «no me
hace caso» suele ser una capa, no una especificidad.

---

## El design system es una COPIA, y tiene dos parches

`src/styles/ds/` viene de
`design/Nuevo sitio de beat full/_ds/copy-of-beat-100-9-design-system-d47698bf-a64c-44d3-8ece-771863d80f6f/`.

🔴 **No se edita**, para poder re-sincronizarlo cuando cambie el lienzo. Pero hay dos
intervenciones que **hay que volver a aplicar** en cada re-sincronización, y las dos
están anotadas en `src/styles/ds/styles.css`:

1. **Los `@import` van CON COMILLAS**, no con `url()`. Tailwind 4 procesa el CSS con
   Lightning y trata `@import url("…")` como importación EXTERNA: no la inlinea y la
   descarta al empaquetar. ⚠️ Resultado medido: los nueve archivos de tokens no se
   cargan y **desaparecen todas las variables de marca**. El sitio no truena — se
   degrada en silencio a fondo transparente y tipografías del sistema.
2. **El `@import` de Google Fonts está neutralizado.** Las fuentes son
   auto-hospedadas (ver abajo).

⚠️ Y `tailwind.config.js` tiene su propia regla: **ni un valor literal.** Solo mapea
`var(--*)` del DS. El precio asumido es que los modificadores de opacidad
(`bg-surface-card/50`) no funcionan al usar `var()` en `colors`; para transparencias
se usa el token que corresponda.

---

## Las decisiones visuales que NO se deshacen

- 🔴 **El sitio va en BLANCO Y NEGRO** (Carlos, 2026-08-27). El DS trae una paleta
  cálida y Beat no la usa: lo que resalta va en blanco y negrita, y si hace falta se
  le pone luz. Se hace **redefiniendo los tokens de texto** en `beat.css`, no tocando
  los usos: así quien escriba `--text-accent` obtiene el color correcto sin saber que
  hubo una decisión. ⚠️ Los tokens `--luz-*` NO se tocan — siguen sirviendo en
  superficies y bordes, donde el naranja es identidad y no texto.
- 🔴 **La única excepción es el rojo `--rojo-aire`** de la barra del player: el punto
  que parpadea y el título de lo que suena. Es la luz de tally de un estudio. **No se
  abre una segunda excepción** (ver `movimiento.md` §8).
- 🔴 **El sitio es SOLO oscuro** (Carlos, 2026-08-20). No hay `data-theme` ni
  conmutador. `color-scheme: dark` en el `<html>` le dice al navegador que pinte de
  oscuro su propio cromo.
- 🔴 **En los INTERIORES la barra oscura nace recogida** (Carlos, 2026-09-01), y en
  MÓVIL está recogida siempre (2026-09-03). Se decide por **RUTA** y no lo declara
  cada página: lo que hay que acordarse de poner en cada archivo nuevo es lo que un
  día se olvida. ⚠️ El plegado móvil va en **CSS y no solo en el script**, porque el
  servidor no puede saber el ancho de la pantalla — sin la regla se vería un
  fotograma de barra oscura antes de que el JavaScript la recogiera.
- 🔴 **El corte es 900px**, en el CSS y en el `sizeMapping` de GPT. Los breakpoints de
  Tailwind están sobreescritos con los del DS por eso: si `md:` significara 768 en el
  código y 900 en el diseño, sería la clase de desalineación que nadie detecta hasta
  que algo se ve mal en tablet.
- **Un control que no hace nada se RETIRA, no se deja inerte.** Ya se hizo dos veces:
  el buscador (Beat no lleva) y el botón de «ampliar el reproductor», que invitaba a
  pulsarlo para no pasar nada. Un botón muerto en el marcado es alcanzable con el
  tabulador y se anuncia en un lector de pantalla — y enseña al lector a desconfiar
  de los demás.

---

## Las trampas de Astro que ya costaron algo aquí

- ⚠️ **Astro NO admite comentarios de llaves dentro de la lista de atributos.** Los
  parsea como atributos sueltos y rompe el build con errores que no lo mencionan.
  **Van cinco tropiezos iguales en este repo**, dos en la misma sesión, y dos quedaron
  commiteados sin que nadie los viera. El comentario va ANTES de la etiqueta.
- ⚠️ **`astro check` no basta como puerta.** Uno de esos casos daba **0 errores** en
  `pnpm check` y solo tronó el compilador del build. La puerta es `pnpm build`.
- ⚠️ **Un atributo booleano se pasa como booleano**: `inert={compacta}`, no
  `inert={compacta ? '' : undefined}`. Astro pinta el atributo cuando el valor es
  CIERTO, y una cadena vacía es falsa — así que la versión «correcta en HTML» no se
  emitía nunca. Comprobado en el HTML servido: cero apariciones de `inert`, y la barra
  plegada seguía siendo navegable con el tabulador.
- ⚠️ **Tailwind 4 quitó `cursor: pointer` de su preflight.** Un `<button>` se comporta
  como texto: el puntero no cambia y el control no se anuncia como pulsable. Hay que
  ponerlo a mano.
- ⚠️ **`transition:persist` necesita un NOMBRE explícito.** Sin nombre, Astro genera
  uno por POSICIÓN y no coincide entre páginas: medido, el Inicio emitía
  `astro-gyrtbwwo-3` y una nota `astro-gyrtbwwo-5`, porque la nota tiene más elementos
  con directiva de transición delante. Con nombres distintos no hay nada que
  emparejar y el nodo se reemplaza **en silencio** — la barra de progreso se moría a
  mitad de la navegación y desde el código se veía correcta.

---

## Las tres reglas del movimiento

Están completas en `movimiento.md` y este agente las hace cumplir. Las tres que más
se rompen:

- 🔴 **Ningún efecto puede dejar el contenido inalcanzable** (§3). El caso canónico:
  el intro se va **por CSS** —termina en `opacity: 0` + `visibility: hidden` +
  `pointer-events: none`— y no con un `remove()` desde JavaScript. Si el script no
  corre, el sitio queda usable. El handoff lo tenía al revés.
- 🔴 **El contenido no depende de la animación para existir.** El titular va completo
  en el HTML del servidor y el revoltijo se monta encima; el original queda en
  `aria-label` con las letras en `aria-hidden`, para que un lector de pantalla
  anuncie el titular de verdad. Y las animaciones van por TIEMPO, no atadas al
  scroll: una atada al scroll deja el titular a medio descifrar si el lector no baja.
- 🔴 **Dos gestos sobre el mismo elemento van en propiedades DISTINTAS** (§1):
  `translate` y `rotate` por separado, nunca un `transform` compuesto. Es lo que
  `scripts/guarda-cascada.mjs` vigila, y existe por un caso real — un `scale` de
  micro-interacción y un `transform` de hover, misma capa y misma especificidad, con
  el empate resuelto por el ORDEN EN EL ARCHIVO.

⚠️ **Y `prefers-reduced-motion` no es opcional.** El parpadeo del punto de aire va
tras `motion-safe:`, y la marquesina del título se cambia por puntos suspensivos: se
pierde el final del título, que es peor — pero un texto que se mueve solo, sin forma
de pararlo, es justo lo que esa preferencia existe para quitar (WCAG 2.2.2).

---

## Lo que este agente NO hace

- **Las etiquetas del `<head>`**: título, descripción, canónica, Open Graph, iconos,
  `theme-color`, indexación, JSON-LD y las tarjetas de compartir — todo eso es de
  `agents/metadata.md`, incluido `scripts/favicon.mjs` y los `og-*.png` de
  `public/img/`.
- **La medición** — es de `agents/analytics.md`.
- **Los huecos de publicidad**: `src/components/Anuncio.astro`, sus medidas y su
  colocación son de `agents/ads.md`. ⚠️ Y el marco se reserva y luego DESAPARECE: eso
  es `movimiento.md` §10, y es la regla de «estado muerto sin salida» aplicada a una
  banda de 350px.
- **La política de caché de `src/middleware.ts`** sí es de este agente; el bloque del
  `X-Robots-Tag` del mismo archivo NO — es de `agents/metadata.md`.
- **El player**: `src/scripts/player.ts`, `audio.ts`, `pista.ts`, `senal.ts` y
  `video.ts` son de `agents/streaming.md`. ⚠️ Se cruzan en `Cabecera.astro`, que es
  donde vive el marcado del player: **el marcado es de este agente y el comportamiento
  del otro.** Los `data-*` son el contrato entre los dos y no se renombran sin avisar.
- **Qué DATO baja a cada componente** — es de `agents/content.md`. Este agente decide
  cómo se ve; el otro, de dónde sale.
- **Decidir la maqueta de una pantalla que el lienzo no describe.** El lienzo cubre el
  Inicio (13a/14a), Scanner (14b/14e) y la nota (14c/14f). ⚠️ `/en-vivo` sigue sin
  lienzo propio: lo que tiene desde el 2026-09-09 es el panel «AL AIRE AHORA» que
  Carlos mandó traer de `/programacion`, no un diseño inventado. Lo que le falte
  encima de eso se le pide a él.

---

## Cómo se verifica

🔴 **Toda maqueta se prueba con Inicio → nota → atrás.** No es ceremonia: es donde se
han roto tres cosas en este repo. Con View Transitions el `body` se reemplaza en cada
navegación y solo sobrevive lo que lleva `transition:persist`, así que un componente
que se ve perfecto al recargar puede estar muerto al navegar.

⚠️ **Y el panel del navegador MIENTE sobre las animaciones.** Una animación que ya
terminó se ve idéntica a una que nunca arrancó, y un elemento reemplazado por el
router se ve idéntico a uno que persistió. Lo que sirve es dejar un testigo:

```js
// En la consola, ANTES de navegar. Si tras volver el valor sigue ahí, persistió.
document.getElementById('beat-cabecera').dataset.testigo = '1';
```

```bash
# La puerta real, en este orden. `astro check` NO basta: hay errores de Astro que
# solo salen en el compilador del build (van cinco casos).
pnpm check      # astro check + las guardas de fuentes
pnpm build      # + la guarda de cascada, que lee el CSS CONSTRUIDO

# ¿Se cargaron los tokens del DS, o se degradó en silencio a fondo transparente?
curl -s http://localhost:4321/ | grep -c 'surface-canvas'

# El plegado de la cabecera en un interior: `inert` tiene que APARECER.
curl -s http://localhost:4321/beat-scanner | grep -o 'inert'
```

⚠️ **El contraste se MIDE, no se estima** (`movimiento.md` §4): sobre un fondo oscuro
el ojo perdona lo que la norma no.

⚠️ Y en móvil se comprueba **a 375px**, no encogiendo la ventana a ojo. Ahí se
descubrió que la onda del player se comía la barra y el título de lo que suena
quedaba en **5 píxeles** — el peor reparto posible: la barra existe para decir qué
suena, y lo que sobrevivía era el adorno.
