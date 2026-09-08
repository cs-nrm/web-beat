# Ad Ops Agent — Beat 100.9

## Rol

Todo el inventario publicitario del sitio: los huecos, sus medidas, quién los
llena, y el punto donde se enchufa una red nueva.

🔴 **Este documento se reescribió por completo el 2026-09-08.** El anterior
describía la arquitectura del v1 —`BillBoard.astro`, `LeaderBoard.astro`,
`LeaderBoard2.astro`, `SuperLeader.astro`, `BoxBanner.astro`, `DoubleBox.astro`,
`Modal.astro`, `SliderBuenfin.astro`, `BaseHead.astro`— y **nueve de esos diez
archivos no existen en este repo.** Un agente que manda a editar archivos fantasma
es peor que no tener agente: hace perder una tarde y luego hace dudar del resto de
la documentación.

---

## Cómo funciona el inventario en v2

**UN componente, tres formatos, dos fuentes.** No hay un archivo por hueco.

| Archivo | Qué le toca |
|---|---|
| `src/components/Anuncio.astro` | El marco. Declara el slot con `data-*`, reserva el espacio y decide entre venta directa y programático |
| `src/scripts/anuncios.ts` | El motor de GPT: descubre los slots por sus `data-*`, los define, los pinta y los cierra si vienen vacíos |
| `src/lib/cms/publicidad.ts` | La venta DIRECTA: campañas de la colección `publicidad`, su vigencia y el conteo de impresiones |
| `src/layouts/Base.astro` | La carga de `gpt.js` y el stub de `window.googletag` |
| `public/ads.txt` | Los sellers autorizados |
| `.env` | `PUBLIC_GAM_NETWORK_ID`, `PUBLIC_GAM_AD_UNIT`, `PUBLICIDAD_TOKEN` |

### Los tres formatos, y sus medidas

Salen del lienzo v13/v14, no del sitio actual. Viven en `MEDIDAS`, en
`Anuncio.astro`:

| Formato | Escritorio (≥900px) | Móvil |
|---|---|---|
| `portada` | 1280 × 350 | 390 × 110 |
| `leaderboard` | 728 × 90 | 320 × 100 |
| `box` | 300 × 250 | 300 × 250 |

🔴 **El corte es 900px en los dos lados** —el `md` del design system y el
`sizeMapping` de GPT—. Si el CSS cortara en 900 y el mapping en 768, habría un
tramo en el que el marco es de escritorio y el creativo que sirve GAM es de móvil.

⚠️ **Tres de esas medidas no existían en Ad Manager al escribir esto**: 1280×350 y
390×110 son nuevas, y el leaderboard móvil hoy es 320×50, no 320×100. Un slot cuya
medida no está dada de alta **nunca se llena**, y desde el sitio se ve igual que un
hueco sin demanda. Antes de dar por bueno un hueco vacío, confirmar la medida en
GAM.

### El marco se reserva y luego desaparece

Las dos mitades hacen falta, por razones distintas:

- **Se reserva** porque si el espacio apareciera al cargar el creativo, todo lo de
  abajo se movería. Eso es CLS y penaliza.
- **Desaparece** si no hay nada que poner. Una banda de 350px encabezando el Inicio
  sin anuncio dentro no es un marco, es un agujero en lo primero que ve el lector.

🔴 Y lo cierra por DOS caminos: cuando GAM contesta «sin relleno», **y** cuando pasa
el plazo sin que conteste (`PLAZO_VACIO`, 3.5s). El segundo no es un detalle: un
bloqueador de anuncios o un `gpt.js` que no bajó son el modo de falla más común, y
sin ese camino la banda se queda abierta para siempre — el patrón de «estado muerto
sin salida» que movimiento.md §3 prohíbe.

---

## Dónde va cada hueco, y por qué

🔴 **La colocación NO se improvisa: sale del artboard `publicidad` del lienzo**
(`design/Nuevo sitio de beat full/Sitio Beat 2026 publicidad.dc.html`). Su dirección
**5a «Mosaico»** es la que este sitio implementó, y dice literalmente:

> «La portada de 970 × 250 abre sobre el header, **el leaderboard separa el mosaico
> del marquee** y **el box vive como riel junto al archivo**.»

⚠️ El lienzo describe SOLO el Inicio. Para cualquier otra página, la colocación es
una decisión de Carlos, no una traducción del diseño: no la inventes.

### Estado al 2026-09-08

| Superficie | portada | leaderboard | box |
|---|---|---|---|
| Inicio | ✅ `inicio-portada` | ✅ `inicio-leader` | ⚠️ `inicio-box` |
| `/scanner`, `/editorial`, `/etiqueta/*` (`IndiceScanner`) | — | ✅ `scanner-leader` | ✅ `scanner-box` |
| `/noticias/*` | — | — | ✅ `nota-box` |
| `/fenomeno-residente` | — | ✅ | ✗ |
| `/bonus-beat` y `/bonus-beat/*` | — | ✅ | ✗ |
| `/programacion` y `/programas/*` | — | ✅ | ✗ |
| `/eventos` y `/eventos/*` | — | ✅ | ✗ |
| `/especiales/*` | — | ✅ | ✗ |
| `/en-vivo`, `/alexa`, legales | — | ✗ | ✗ |

⚠️ **`inicio-box` está en el código y hoy no se pinta.** Vive en
`ArchivoTemas.astro` —donde el lienzo lo pone, «de riel junto al archivo»— y ese
bloque no se renderiza cuando el archivo está vacío: hoy hay un solo especial del
Fenómeno y es el vigente, así que se excluye. Se llena solo en cuanto capturen un
segundo tema. **No moverlo**: moverlo sería contradecir el lienzo para tapar un
hueco de contenido.

---

## Agregar una red nueva (ShowHeroes y las que vengan)

🔴 **Casi siempre NO se toca el código.** La regla de este proyecto es que Ad
Manager es la ÚNICA fuente de anuncios programáticos: una red nueva entra como
demanda DENTRO de GAM, no como un script propio en el sitio. Si una red se puede
servir por GAM, el trabajo es de AdOps en el panel y aquí no hay nada que hacer.

Solo hace falta código cuando la red necesita un hueco que todavía no existe. En
ese caso:

1. **Un formato nuevo** se agrega a `MEDIDAS` en `Anuncio.astro` y al tipo de la
   prop `formato`. Nada más: el motor descubre el slot por sus `data-*`.
2. **Un hueco nuevo** es un `<Anuncio formato="…" nombre="…" />` en la página. El
   `nombre` se concatena al ad unit del env y el script valida el formato.
3. Si la red exige su propio script, va en `Base.astro` junto al de GPT, y se
   documenta aquí por qué no pudo entrar por GAM.

### ⚠️ ShowHeroes: el documento que hay está MAL

`showheroes-videonota.md` es del v1 y seguirlo hoy rompe cosas:

- Manda editar `src/js/ads.js`, que **es código legado y no se importa en ninguna
  parte de v2** (comprobado). El motor es `src/scripts/anuncios.ts`.
- Manda editar `src/pages/[seccion]/[slug].astro`, ruta que **no existe**: la nota
  vive en `/noticias/[slug]`.
- 🔴 Y el `defineSlot` que propone apunta a **`/23349147378/StereoCien`** — la
  unidad de OTRA estación. Copiado tal cual, el sitio de Beat pediría inventario de
  Stereo Cien.

El formato que pedía —400×311— es uno de los tres del v1 que hoy no se usan. Si
ShowHeroes vuelve a la mesa, se agrega como formato nuevo por el camino de arriba,
con el ad unit de Beat (`PUBLIC_GAM_AD_UNIT=Beat`) y confirmando la medida en GAM.

⚠️ `dynamicAds.md` es de la misma época y describe los 13 slots del v1. Sirve como
historia, no como referencia.

---

## Lo que este agente NO hace

- **La política de caché** y el `<head>` como maquetado — son de `agents/frontend.md`.
- **La medición** (GTM, GA4, comScore) — es de `agents/analytics.md`. ⚠️ Se cruzan
  en una cosa: `PUBLICIDAD_TOKEN` vacío en preproducción evita sumar impresiones y
  clics a campañas facturables, y los ids de analítica van vacíos por lo mismo. Ver
  `docs/despliegue-v2.md`.
- **Las etiquetas del `<head>`** (canónicas, Open Graph, indexación) — son de
  `agents/metadata.md`.
- **Decidir dónde va un hueco** en una página que el lienzo no describe. Eso se
  propone y lo aprueba Carlos.

---

## Cómo se verifica

Un hueco que no se llena y un hueco que no existe se ven IGUAL desde el sitio, así
que no se da nada por bueno mirando la página:

```bash
# Qué huecos declara una ruta, y de qué formato.
curl -s https://v2.beatdigital.mx/ | grep -o 'class="anuncio es-[a-z]*'

# Que el marco se haya cerrado solo cuando no hay relleno.
curl -s https://v2.beatdigital.mx/ | grep -o 'data-vacio'
```

⚠️ En preproducción `PUBLICIDAD_TOKEN` va VACÍO a propósito: con token, cada visita
de revisión sumaría impresiones y clics a campañas que se le facturan a un
anunciante real. Comprobado que un barrido que clicó un banner en v2 no generó
ningún conteo. **No lo pongas para «probar que funciona».**
