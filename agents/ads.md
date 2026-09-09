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
| `portada` | 1280 × 360 | 390 × 110 |
| `leaderboard` | 728 × 90 | 320 × 50 |
| `box` | 300 × 250 | 300 × 250 |

🔴 **El corte es 900px en los dos lados** —el `md` del design system y el
`sizeMapping` de GPT—. Si el CSS cortara en 900 y el mapping en 768, habría un
tramo en el que el marco es de escritorio y el creativo que sirve GAM es de móvil.

⚠️ **Dos de esas medidas no existen en Ad Manager**: 1280×350 y 390×110 son
nuevas. Un slot cuya medida no está dada de alta **nunca se llena**, y desde el
sitio se ve igual que un hueco sin demanda. Antes de dar por bueno un hueco vacío,
confirmar la medida en GAM.

🔴 **El leaderboard móvil pasó de 320×100 a 320×50 el 2026-09-09, y la historia es
la lección.** El código pedía 320×100 —una medida que NO está en el ad unit—, así
que GAM no tenía nada de ese tamaño y sirvió el **728×90 de escritorio** en un
hueco de 320: el creativo se salía de lado y se pintaba encima del Fenómeno en un
iPhone. Tres cosas fallaron a la vez y conviene reconocer cada una:

1. La medida se eligió sin estar dada de alta, que es justo lo que el párrafo de
   arriba advierte.
2. Se documentó como si viniera del lienzo. **El lienzo no dice nada de móvil**:
   el artboard `publicidad` es solo de escritorio y nombra 728×90, 300×250,
   300×600 y la portada en 970×250. Toda la columna de móvil de la tabla se
   inventó en `c79dbd4`.
3. Y el hueco no CONTENÍA, así que un creativo de otra medida podía romper la
   página. Eso ya está arreglado (`encajar()` en `anuncios.ts`), pero era el
   parachoques, no la causa.

🔴 **La portada es un formato de la casa y va A TODO LO ANCHO** (Carlos,
2026-09-09). No es una medida fija: es **una proporción**, 1600/450 = 3.556, y la
banda la aplica con `aspect-ratio`. Las dos «medidas» que había —1280×350 y
390×110— eran esa misma proporción escrita dos veces, y a 390 de ancho la
proporción da 110 exacto. Las derivadas que genera el CMS ya la siguen
(`…-1280x360.webp`).

⚠️ **Consecuencia para programático:** un creativo de GAM es de tamaño fijo, así
que nunca llenará el ancho —en 1920 se queda en 1280 centrado—. A todo lo ancho
solo llega por dos caminos: la **venta directa** del CMS (que es por donde funciona
hoy, con imágenes de 1600×450) o pedir `'fluid'` a GPT, que exige un creativo
fluido dado de alta en el ad unit. Lo segundo está sin hacer.

⚠️ **El lienzo dice 970×250 para la portada** y nadie ha resuelto esa diferencia.
970×250 es el «billboard» estándar de IAB; la proporción de la casa (3.556) no lo
es, así que su demanda programática es prácticamente nula. Decisión de Carlos.

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

### 🔴 La regla de GPT que no se negocia

**`destroySlots()` y TODO lo que dependa de `googletag` va DENTRO de
`googletag.cmd.push()`. Nunca fuera.**

El snippet del `<head>` crea `window.googletag = { cmd: [] }` de inmediato, pero la
librería real baja `async`. Si algo toca `googletag.destroySlots` antes de que
`gpt.js` termine —frecuente en móvil o con red lenta— está tocando el stub, que no
tiene ese método: **TypeError, y la inicialización entera se cancela**. Se ve como
«los anuncios no salen hoy», sin error visible en la página.

Está implementada y documentada en `src/scripts/anuncios.ts`; se anota aquí porque
es la lección que sobrevive a cualquier reescritura del motor.

⚠️ Y la segunda: **View Transitions hace un swap completo del DOM.** Los `div` de
los slots anteriores desaparecen y GPT se queda con referencias a nodos huérfanos,
así que en cada navegación hay que destruir y volver a definir. `anuncios.ts` lo
hace registrando el oyente UNA vez; si se registrara por navegación, la enésima
ejecutaría la inicialización n veces.

⚠️ Tercera, de las que cuestan una tarde: `sizeMapping().addSize()` necesita **dos**
argumentos —viewport y tamaños—. `addSize([970, 250])` a secas compila y no mapea
nada.

---

## Dónde va cada hueco, y por qué

🔴 **La colocación NO se improvisa: sale del artboard `publicidad` del lienzo**
(`design/Nuevo sitio de beat full/Sitio Beat 2026 publicidad.dc.html`). Su dirección
**5a «Mosaico»** es la que este sitio implementó, y dice literalmente:

> «La portada de 970 × 250 abre sobre el header, **el leaderboard separa el mosaico
> del marquee** y **el box vive como riel junto al archivo**.»

⚠️ El lienzo describe SOLO el Inicio. Para cualquier otra página, la colocación es
una decisión de Carlos, no una traducción del diseño: no la inventes.

### Las ocho colocaciones de box, aprobadas el 2026-09-08

Están DECIDIDAS, con su razón. No se re-proponen ni se mueven sin Carlos:

| Página | Dónde | Por qué |
|---|---|---|
| `/fenomeno-residente` | Tercera columna, bajo la playlist | El riel ya existe y terminaba en aire |
| `/bonus-beat` | Tras la última edición, antes de «EDICIONES ANTERIORES» | El corte natural de la página |
| `/bonus-beat/*` | Riel a la derecha de las canciones | Igual que la nota: columna de lectura + riel |
| `/programacion` | Tras «AL AIRE AHORA», antes de la parrilla | El único punto de corte que tiene |
| `/programas/*` | Riel junto a los datos del programa | Ahí ya había una columna estrecha |
| `/eventos` | Intercalado cada 6 eventos | Lista larga sin corte; el intercalado es lo que rinde |
| `/eventos/*` | Riel bajo «CUÁNDO / DÓNDE» | La columna de datos ya estaba, y le sobraba un hueco |
| `/especiales/*` | Columna de la playlist del tema | Misma estructura que `/fenomeno-residente` |

🔴 Dos de ellas viven en un COMPONENTE y no en la página, porque la columna es
del componente: `Fenomeno.astro` (las dos del tema) y `Agenda.astro` (el
intercalado). En los dos casos el NOMBRE del hueco lo pasa la página por una prop
—`anuncio`— y no se deduce del contexto: el nombre es la llave con la que GAM
factura, así que se escribe donde se decidió la colocación. Y por eso el Inicio,
que usa los mismos componentes, no hereda ningún box.

### Estado al 2026-09-08

✅ = declarado y se pinta con los datos de hoy. ⚠️ = declarado, y hoy no se pinta
porque le falta el CONTENIDO del que cuelga (no porque el hueco esté mal).

| Superficie | portada | leaderboard | box |
|---|---|---|---|
| Inicio | ✅ `inicio-portada` | ✅ `inicio-leader` | ⚠️ `inicio-box` |
| `/scanner`, `/editorial`, `/etiqueta/*` (`IndiceScanner`) | — | ✅ `scanner-leader` | ✅ `scanner-box` |
| `/noticias/*` | — | — | ✅ `nota-box` |
| `/fenomeno-residente` | — | ✅ `fenomeno-leader` | ✅ `fenomeno-box` |
| `/bonus-beat` | — | ✅ `lista-leader` | ⚠️ `lista-box` |
| `/bonus-beat/*` | — | ✅ `edicion-leader` | ✅ `edicion-box` |
| `/programacion` | — | ✅ `programacion-leader` | ⚠️ `programacion-box` |
| `/programas/*` | — | ✅ `programa-leader` | ⚠️ `programa-box` |
| `/eventos` | — | ✅ `agenda-leader` | ⚠️ `agenda-box` (+ `-2`, `-3`…) |
| `/eventos/*` | — | ✅ `evento-leader` | ✅ `evento-box` |
| `/especiales/*` | — | ✅ `especial-leader` | ✅ `especial-box` |
| `/en-vivo`, `/alexa`, legales | — | ✗ | ✗ |

🔴 **`/en-vivo` no lleva box, y es una decisión tomada** (Carlos, 2026-09-08): es
la página a la que alguien va a ESCUCHAR, y un anuncio al lado de la señal hace
que un sitio de radio se sienta barato. No se propone otra vez.

#### Los cuatro ⚠️, y de qué contenido cuelga cada uno

Ninguno es un hueco roto: los cuatro esperan un dato del CMS. Comprobados uno por
uno forzando datos en la capa `src/lib/cms/*` (ver «Cómo se verifica»).

- **`inicio-box`** — vive en `ArchivoTemas.astro`, donde el lienzo lo pone («de
  riel junto al archivo»), y ese bloque no se pinta con el archivo vacío: hoy hay
  un solo especial del Fenómeno y es el vigente, así que se excluye. **No
  moverlo**: sería contradecir el lienzo para tapar un hueco de contenido.
- **`lista-box`** — marca el corte entre la última edición y «EDICIONES
  ANTERIORES», así que cuelga de que HAYA ediciones anteriores. `bonus-beat` tiene
  una sola capturada. Sin esa condición, el box quedaría a 40px del leaderboard
  del pie: una página que termina en dos anuncios seguidos.
- **`programacion-box`** — va tras «AL AIRE AHORA», que sale de la parrilla, que
  sale de `programas`: cero documentos. Sin ese panel encima, el box sería lo
  primero bajo el titular de la sección.
- **`agenda-box`** — se intercala cada SEIS eventos de la lista y nunca de cola
  (ver abajo). Hoy hay un evento capturado, o sea cero filas.

⚠️ **`programa-box` está en `/programas/*`, que no se puede probar con datos**:
`programas` tiene cero documentos y la ruta responde 404 para cualquier slug.
Comprobado con un programa fabricado en `obtenerPrograma`.

#### El intercalado de `/eventos`

Vive en `Agenda.astro` (`CADA = 6`) y la regla tiene DOS mitades: cada seis filas,
**y solo si debajo quedan filas**. La segunda es la que evita que el box sea la
cola de una agenda corta — «un box solo después de dos eventos es más anuncio que
contenido» (Carlos)— y de paso que caiga junto al leaderboard del pie.

Medido: 6 eventos → ningún box; 7 (6 filas) → ninguno; 8 → uno; 13 → uno; 14 →
dos; 40 (el tope de `obtenerAgenda`) → seis.

⚠️ Los ids se NUMERAN (`agenda-box`, `agenda-box-2`, …) porque en una agenda larga
hay más de uno y **dos huecos con el mismo id hacen que GPT pinte solo el
primero**. En el reporte de GAM eso además dice qué posición de la lista rinde.

#### ⚠️ El riel en móvil queda encima del leaderboard

Por debajo de 900px todas las páginas de detalle colapsan a una columna, y el box
del riel cae al final del contenido: a **32px** del leaderboard que esas páginas ya
tenían. Pasa en `/especiales/*`, `/bonus-beat/*`, `/eventos/*`, `/programas/*` y
—mientras el archivo esté vacío— en `/fenomeno-residente`.

No se tocó, y por eso: la salida sería mover el leaderboard debajo del bloque de
«otros/lo que sigue» de cada página, y mover un hueco que ya está vendido es
decisión de Carlos. Con los dos huecos vacíos —que es el estado de hoy— no se ve
nada: el marco se cierra solo. Se nota el día que los dos se llenen a la vez.

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

### ShowHeroes: pendiente, y lo que de verdad pide

🔴 **Esto SIGUE en pie** (Carlos, 2026-09-08): el documento que lo describía se
borró por equivocado, no por cancelado. Lo que el proyecto quiere es un **video
flotante en los interiores de contenido**, servido por ShowHeroes **a través de Ad
Manager** — no con un script de la red.

Lo que hace falta cuando se retome, ya traducido a v2:

1. Un formato nuevo en `MEDIDAS` (`Anuncio.astro`): **400 × 311**, que es uno de los
   tres del v1 que hoy no se usan.
2. Un `<Anuncio formato="videonota" nombre="nota-video" />` en
   `src/pages/noticias/[slug].astro`, **después del cuerpo de la nota** — en los
   interiores donde se lee, no en listados ni en el Inicio.
3. En Ad Manager: el line item de ShowHeroes apuntando a ese placement, con el ad
   unit de **Beat** (`PUBLIC_GAM_AD_UNIT=Beat`), y la medida 400×311 dada de alta.
4. Nada de `src/js/ads.js` ni de scripts inline: el motor lo descubre por los
   `data-*` del componente.

⚠️ **`public/ads.txt` todavía declara `viralize.com, 7587, DIRECT`** (línea 283).
Viralize era la red ANTERIOR de este mismo hueco y su script ya no está en el
sitio, así que ese seller autoriza a alguien que ya no vende. Es una decisión de
AdOps, no de código: no se toca sin confirmarlo, pero hay que confirmarlo.

### ⚠️ Y por qué el documento que había estaba MAL

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

🔴 Y hay un tercer caso que el `curl` NO distingue: un hueco que **no se pinta
porque le falta el contenido del que cuelga** (los cuatro ⚠️ de la tabla). Ahí no
sirve mirar la ruta: hay que FORZAR los datos. El camino es meter un retorno
temporal al principio de la función de `src/lib/cms/*` que alimenta la página
—`obtenerAgenda`, `obtenerListas`, `obtenerParrillaDeHoy`, `obtenerPrograma`—,
levantar `astro dev`, comprobar por `curl`, y revertir con `git checkout --`. Así
se comprobaron las cuatro y la matriz del intercalado de `/eventos`.

⚠️ Y en el navegador el marco vacío **desaparece a los 3.5s** (`PLAZO_VACIO`), y
además GPT le pone `display:none` al div del slot, así que una captura tardía no
enseña nada. Para medir el marco reservado —que es el peor caso del maquetado— hay
que quitarle el `data-vacio` al `.anuncio` **y** el `display` en línea al
`.anuncio-hueco`.

⚠️ Al forzar la parrilla salió a la luz un desborde que **no es de publicidad**:
`.pr-horario` lleva `white-space: nowrap`, y un programa de lunes a domingo
—«LUN · MAR · MIÉ · JUE · VIE · SÁB · DOM 00:00–23:59»— saca la página 120px a lo
ancho a 390px. Es de `/programacion`, no del hueco; queda anotado aquí porque se
descubrió aquí.

⚠️ En preproducción `PUBLICIDAD_TOKEN` va VACÍO a propósito: con token, cada visita
de revisión sumaría impresiones y clics a campañas que se le facturan a un
anunciante real. Comprobado que un barrido que clicó un banner en v2 no generó
ningún conteo. **No lo pongas para «probar que funciona».**
