# Ad Ops Agent — Beat 100.9

## Rol

Todo el inventario publicitario del sitio: los huecos, sus medidas, quién los
llena, y el punto donde se enchufa una red nueva.

**Este documento se reescribió por completo el 2026-09-08.** El anterior
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
| `src/components/Takeover.astro` | El modal a pantalla completa: sus tres variantes, su slot de GAM y todo su comportamiento |
| `src/scripts/anuncios.ts` | El motor de GPT: descubre los slots por sus `data-*`, los define, los pinta y los cierra si vienen vacíos |
| `src/lib/cms/publicidad.ts` | La venta DIRECTA: campañas de la colección `publicidad`, su vigencia y el conteo de impresiones |
| `src/pages/api/anuncio/[id].ts` | El proxy. `GET` cuenta el clic y redirige; `POST` cuenta la impresión del takeover |
| `src/layouts/Base.astro` | La carga de `gpt.js` y el stub de `window.googletag` |
| `public/ads.txt` | Los sellers autorizados |
| `.env` | `PUBLIC_GAM_NETWORK_ID`, `PUBLIC_GAM_AD_UNIT`, `PUBLICIDAD_TOKEN` |

### Los formatos, y sus medidas

Salen del lienzo v13/v14, no del sitio actual. Viven en `MEDIDAS`, en
`Anuncio.astro`:

| Formato | Escritorio (≥900px) | Móvil |
|---|---|---|
| `portada` | 1280 × 360 | 390 × 110 |
| `leaderboard` | 728 × 90 | 320 × 50 |
| `box` | 300 × 250 | 300 × 250 |

**El corte es 900px en los dos lados** —el `md` del design system y el
`sizeMapping` de GPT—. Si el CSS cortara en 900 y el mapping en 768, habría un
tramo en el que el marco es de escritorio y el creativo que sirve GAM es de móvil.

**Dos de esas medidas no existen en Ad Manager**: 1280×350 y 390×110 son
nuevas. Un slot cuya medida no está dada de alta **nunca se llena**, y desde el
sitio se ve igual que un hueco sin demanda. Antes de dar por bueno un hueco vacío,
confirmar la medida en GAM.

**El leaderboard móvil pasó de 320×100 a 320×50 el 2026-09-09, y la historia es
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

**La portada es un formato de la casa y va A TODO LO ANCHO** (Carlos,
2026-09-09). No es una medida fija: es **una proporción**, 1600/450 = 3.556, y la
banda la aplica con `aspect-ratio`. Las dos «medidas» que había —1280×350 y
390×110— eran esa misma proporción escrita dos veces, y a 390 de ancho la
proporción da 110 exacto. Las derivadas que genera el CMS ya la siguen
(`…-1280x360.webp`).

**Consecuencia para programático:** un creativo de GAM es de tamaño fijo, así
que nunca llenará el ancho —en 1920 se queda en 1280 centrado—. A todo lo ancho
solo llega por dos caminos: la **venta directa** del CMS (que es por donde funciona
hoy, con imágenes de 1600×450) o pedir `'fluid'` a GPT, que exige un creativo
fluido dado de alta en el ad unit. Lo segundo está sin hacer.

**El lienzo dice 970×250 para la portada** y nadie ha resuelto esa diferencia.
970×250 es el «billboard» estándar de IAB; la proporción de la casa (3.556) no lo
es, así que su demanda programática es prácticamente nula. Decisión de Carlos.

### El TAKEOVER, el cuarto formato (2026-09-13)

Lo que el equipo comercial llama **«el modal»**: el overlay a pantalla completa que
tapa el Inicio al entrar. Vive en `src/components/Takeover.astro` y **no se pinta
con `Anuncio.astro`**.

**Es un `tipo` más de la colección `publicidad`, no una colección aparte**
(decisión de Carlos en el CMS, 2026-09-11). Tiene anunciante, vigencia, contadores y
`estado` igual que los otros dos; lo único que lo distingue es dónde lo pinta el
sitio. En Enfoque SÍ es una colección propia (`takeovers`), porque allá nació de
mudar al CMS un `Modal.astro` que se prendía y apagaba comentando HTML: **no se
traduce campo por campo entre los dos repos**.

**`fuente` decide todo, y `admanager` es el caso NORMAL** («casi siempre son
provenientes de Ad Manager», Carlos). Ahí el CMS no guarda pieza ni enlace: el slot
está fijo en el sitio, el creativo lo pone Google y la campaña del CMS es solo la
VIGENCIA y el permiso — «durante estos días pídele el modal a GAM».

**Se decide por `fuente`, jamás por «si viene imagen, píntala».** Una campaña que
empezó con creatividad propia y se pasó a Ad Manager **conserva** su `imagen` y su
`enlace` viejos en la base —el CMS no los limpia a propósito, para no borrarle a
nadie lo que ya eligió— y la API los devuelve. Son basura inerte. `obtenerTakeover()`
los anula en la capa de datos para que la plantilla no pueda equivocarse.

| Campo del CMS | Qué hace en el sitio |
|---|---|
| `fuente` | `propia` (imagen/video del CMS) o `admanager` (slot de GAM) |
| `imagen` | La pieza; con video es además el `poster` y el respaldo |
| `imagenMovil` | Opcional. Si falta, se usa `imagen` |
| `video` | Opcional, solo con `propia`. Un mp4 corto |
| `frecuencia` | `sesion` (`sessionStorage`) o `siempre`. **No hay «por día»** |
| `orden` | Con varios vigentes gana el más bajo. Nunca se apilan dos modales |

**No existen y no hay que esperarlos**: rutas donde aparece, retardo antes de
abrir, si se puede cerrar, y a los cuántos segundos. Nada de eso está en el CMS —el
markup, la cruz y el timing son del front—. Si hiciera falta, se pide y se agrega.

#### Las medidas y el corte por ALTO

`600×800` y `320×480`, heredadas del `ad-slot14` del sitio viejo. El lienzo no dice
nada de este formato.

**Es el único formato cuyo `sizeMapping` mira el ALTO del viewport**, y la razón
está medida (Enfoque, 2026-09-08): un 600×800 en una laptop de 720px de alto **no
cabe**, y el lector tendría que hacer scroll dentro del overlay para ver el final del
anuncio. Se pide la pieza grande solo con ≥768 de ancho **y** ≥860 de alto.

Ese par (768 × 860) está escrito DOS veces —en el `mapping` y en el
`@media (min-height:)` que reserva `.tk-slot`— y tienen que coincidir. Comprobado en
el build servido el 2026-09-13: a 1280×900 el hueco mide 600×800; a 1024×700 y a
375×812, 320×480.

**`/…/Beat/Takeover` no existe todavía en GAM.** Pedir una ruta que no existe no
falla —GAM la atiende contra el padre y el modal se llena igual—, lo que se pierde es
poder medir este formato por separado. El día que ad ops cree el bloque empieza a
reportarse solo, sin desplegar. Y si alguien va a ponerle una protección para
bloquearle la programática, **el bloque hijo tiene que existir primero**: aplicada
sobre el padre, apaga la programática de TODO el sitio.

#### Las reglas de comportamiento, y cuál pagó cada una

Casi todas vienen medidas de la primera campaña de Enfoque (`leap auto`, 8-9 sep) o
del build servido de Beat el 13-sep.

1. **Si ya se vio en esta sesión, el nodo se va del DOM en un script EN LÍNEA**,
   antes de que `anuncios.ts` descubra el slot. Pedirle el anuncio a Google y decidir
   después le factura al anunciante un modal que nadie vio.
2. **La llave de sesión lleva `id:updatedAt`.** Con una llave fija por campaña,
   corregir la pieza no se la vuelve a mostrar a quien ya la vio; con una llave fija
   a secas, la campaña siguiente nace YA VISTA para quien tenga la pestaña abierta —
   y eso no truena, simplemente no se muestra.
3. **Se marca al MOSTRAR, no al cerrar.** Al cerrar, un recargar a media pantalla
   lo vuelve a abrir. Y un takeover que nunca se vio no debe gastar la sesión.
4. **Con Ad Manager el overlay espera INVISIBLE** (`opacity: 0`, con el hueco
   midiendo de verdad) y se revela solo cuando llega creativo. Enfoque lo revelaba de
   inmediato y el lector veía una caja vacía ~1.5 s en cada visita: GAM contesta
   entre **1700 y 2659 ms** con red de cable.
5. **El plazo de respaldo son 10 s, no 3.** Existe por el bloqueador de anuncios
   —con `gpt.js` bloqueado el evento no llega nunca—, y con 3 s se cierra en firme
   una impresión que venía en camino por 3G. Esperar no cuesta nada: no se ve nada.
6. **Sin animación de entrada.** Con `animation: … both` el fotograma inicial
   (`opacity: 0`) se aplica antes de arrancar, y en una pestaña que el navegador no
   está pintando Chrome la deja pausada ahí: capa montada, scroll bloqueado y nada
   visible. La regla es «si está montada, se ve», que es una invariante comprobable
   con `getComputedStyle` — y en este repo eso importa el doble.
7. **La impresión de `propia` se cuenta al MOSTRAR, por `sendBeacon` al proxy**, y
   no en el render como la portada. El modal sale una vez por sesión: contar renders
   multiplicaría por cinco lo que se le factura a quien abre el Inicio cinco veces.
   Con `admanager` no se cuenta — ese número lo lleva Google.
8. **El intro y el takeover coinciden** en la primera visita de una sesión: los
   dos tapan la pantalla, los dos salen una vez y los dos viven en el Inicio. Van EN
   FILA (el takeover espera a que `data-intro` se limpie, con red de 4 s). Con Ad
   Manager casi nunca cuesta tiempo: los ~2 s de GAM transcurren bajo el intro.
9. **El plazo en pantalla cuenta desde que SE VE**, no desde que se monta, y se
   decide una sola vez. Enfoque sondeaba `video.paused` cada segundo y se le cerraba
   el overlay cuando el lector pausaba el spot, o a mitad en una pestaña de fondo.

#### Lo que este formato NO hace

- **No reserva hueco en la página**: sin campaña no emite nada. Un rectángulo vacío
  tapando el Inicio no es un marco, es el sitio roto.
- **No usa `encajar()`.** No le hace falta: es `position: fixed` con
  `overflow-y: auto`, así que un creativo más grande de lo pedido hace scroll dentro
  del velo y no puede romper el Inicio que está detrás.
- **No va envuelto en `.anuncio`.** El motor colapsa el marco de un hueco vacío
  buscando ese ancestro, y aquí colapsar el marco sería esconder la caja dejando el
  overlay puesto.
- **No sale fuera del Inicio.** Un modal encima de una nota que alguien vino a leer
  es otra conversación, y no está tenida.

#### Cómo se prueba

`?takeover=imagen|video|admanager` sobre el **build servido** (entrada
`web-beat-build`), que es donde la cascada dice la verdad. Apagado en el host
canónico: un takeover que cualquiera invoca por la URL es un modal a pantalla
completa servido desde nuestro dominio, y con Ad Manager una impresión facturada que
nadie pidió.

La puerta de «GAM sí trajo creativo» no se puede disparar sola mientras no haya
campaña: se reinserta el nodo que emite el servidor, se dispara `astro:page-load` y
se emite a mano un `beat:anuncio-render` con `vacio: false`.

### El marco se reserva y luego desaparece

Las dos mitades hacen falta, por razones distintas:

- **Se reserva** porque si el espacio apareciera al cargar el creativo, todo lo de
  abajo se movería. Eso es CLS y penaliza.
- **Desaparece** si no hay nada que poner. Una banda de 350px encabezando el Inicio
  sin anuncio dentro no es un marco, es un agujero en lo primero que ve el lector.

Y lo cierra por DOS caminos: cuando GAM contesta «sin relleno», **y** cuando pasa
el plazo sin que conteste (`PLAZO_VACIO`, 3.5s). El segundo no es un detalle: un
bloqueador de anuncios o un `gpt.js` que no bajó son el modo de falla más común, y
sin ese camino la banda se queda abierta para siempre — el patrón de «estado muerto
sin salida» que movimiento.md §3 prohíbe.

### La regla de GPT que no se negocia

**`destroySlots()` y TODO lo que dependa de `googletag` va DENTRO de
`googletag.cmd.push()`. Nunca fuera.**

El snippet del `<head>` crea `window.googletag = { cmd: [] }` de inmediato, pero la
librería real baja `async`. Si algo toca `googletag.destroySlots` antes de que
`gpt.js` termine —frecuente en móvil o con red lenta— está tocando el stub, que no
tiene ese método: **TypeError, y la inicialización entera se cancela**. Se ve como
«los anuncios no salen hoy», sin error visible en la página.

Está implementada y documentada en `src/scripts/anuncios.ts`; se anota aquí porque
es la lección que sobrevive a cualquier reescritura del motor.

Y la segunda: **View Transitions hace un swap completo del DOM.** Los `div` de
los slots anteriores desaparecen y GPT se queda con referencias a nodos huérfanos,
así que en cada navegación hay que destruir y volver a definir. `anuncios.ts` lo
hace registrando el oyente UNA vez; si se registrara por navegación, la enésima
ejecutaría la inicialización n veces.

Tercera, de las que cuestan una tarde: `sizeMapping().addSize()` necesita **dos**
argumentos —viewport y tamaños—. `addSize([970, 250])` a secas compila y no mapea
nada.

**Y la cuarta, encontrada el 2026-09-13 midiendo el takeover: el oyente de
`slotRenderEnded` se registra UNA vez por contexto de JavaScript, no por vista.**
`addEventListener` de GPT **acumula**, y una navegación de Astro no recarga el
contexto: registrándolo dentro de la inicialización, la enésima navegación tenía n
oyentes y cada render llegaba n veces. Medido en el build servido con el flujo Inicio
→ nota → atrás: el render de `beat-takeover-slot` entró **tres** veces y el de
`ad-nota-box` dos.

No había roto nada —`marcar()` es idempotente y GPT lleva sus impresiones por su
cuenta, así que no hubo conteo doble— y por eso llevaba ahí desde el principio sin
que nadie lo notara. Deja de ser inocuo en cuanto algo que NO sea idempotente cuelgue
de ese evento, y el takeover ya cuelga. El conjunto `atendidos` tuvo que subir al
módulo con él: el oyente vive más que la vista, así que no puede quedarse mirando el
conjunto de la primera.

---

## Dónde va cada hueco, y por qué

**La colocación NO se improvisa: sale del artboard `publicidad` del lienzo**
(`design/Nuevo sitio de beat full/Sitio Beat 2026 publicidad.dc.html`). Su dirección
**5a «Mosaico»** es la que este sitio implementó, y dice literalmente:

> «La portada de 970 × 250 abre sobre el header, **el leaderboard separa el mosaico
> del marquee** y **el box vive como riel junto al archivo**.»

El lienzo describe SOLO el Inicio. Para cualquier otra página, la colocación es
una decisión de Carlos, no una traducción del diseño: no la inventes.

### Las colocaciones de box, aprobadas el 2026-09-08

Están DECIDIDAS, con su razón. No se re-proponen ni se mueven sin Carlos:

Eran ocho. La de `/programacion` se retiró el 2026-09-09 al partirse la página
en dos y queda tachada en la tabla, no borrada: fue una colocación aprobada y su
vuelta necesita una decisión, no un `git revert`.

| Página | Dónde | Por qué |
|---|---|---|
| `/fenomeno-residente` | Tercera columna, bajo la playlist | El riel ya existe y terminaba en aire |
| `/bonus-beat` | Tras la última edición, antes de «EDICIONES ANTERIORES» | El corte natural de la página |
| `/bonus-beat/*` | Riel a la derecha de las canciones | Igual que la nota: columna de lectura + riel |
| ~~`/programacion`~~ | ~~Tras «AL AIRE AHORA», antes de la parrilla~~ | **RETIRADA el 2026-09-09** — ver abajo |
| `/programas/*` | Riel junto a los datos del programa | Ahí ya había una columna estrecha |
| `/eventos` | Intercalado cada 6 eventos | Lista larga sin corte; el intercalado es lo que rinde |
| `/eventos/*` | Riel bajo «CUÁNDO / DÓNDE» | La columna de datos ya estaba, y le sobraba un hueco |
| `/especiales/*` | Columna de la playlist del tema | Misma estructura que `/fenomeno-residente` |

Dos de ellas viven en un COMPONENTE y no en la página, porque la columna es
del componente: `Fenomeno.astro` (las dos del tema) y `Agenda.astro` (el
intercalado). En los dos casos el NOMBRE del hueco lo pasa la página por una prop
—`anuncio`— y no se deduce del contexto: el nombre es la llave con la que GAM
factura, así que se escribe donde se decidió la colocación. Y por eso el Inicio,
que usa los mismos componentes, no hereda ningún box.

### Estado al 2026-09-08

✅ = declarado y se pinta con los datos de hoy. = declarado, y hoy no se pinta
porque le falta el CONTENIDO del que cuelga (no porque el hueco esté mal).

| Superficie | portada | leaderboard | box |
|---|---|---|---|
| Inicio | ✅ `inicio-portada` | ✅ `inicio-leader` | `inicio-box` |
| `/scanner`, `/editorial`, `/etiqueta/*` (`IndiceScanner`) | — | ✅ `scanner-leader` | ✅ `scanner-box` |
| `/noticias/*` | — | — | ✅ `nota-box` |
| `/fenomeno-residente` | — | ✅ `fenomeno-leader` | ✅ `fenomeno-box` |
| `/bonus-beat` | — | ✅ `lista-leader` | `lista-box` |
| `/bonus-beat/*` | — | ✅ `edicion-leader` | ✅ `edicion-box` |
| `/programacion` | — | ✅ `programacion-leader` | retirado (ver abajo) |
| `/programas/*` | — | ✅ `programa-leader` | `programa-box` |
| `/eventos` | — | ✅ `agenda-leader` | `agenda-box` (+ `-2`, `-3`…) |
| `/eventos/*` | — | ✅ `evento-leader` | ✅ `evento-box` |
| `/especiales/*` | — | ✅ `especial-leader` | ✅ `especial-box` |
| `/en-vivo`, `/alexa`, legales | — | ✗ | ✗ |

El **takeover** no entra en esta tabla porque no es una superficie más: es un
overlay, solo vive en el Inicio y su columna sería una sola celda. Su estado al
2026-09-13 es «declarado y sin campaña que lo dispare» — el CMS todavía no tiene
ninguno capturado, así que en el sitio no se ve nada. Ver la sección del takeover
más arriba.

**`/en-vivo` no lleva box, y es una decisión tomada** (Carlos, 2026-09-08): es
la página a la que alguien va a ESCUCHAR, y un anuncio al lado de la señal hace
que un sitio de radio se sienta barato. No se propone otra vez.

#### Los , y de qué contenido cuelga cada uno

Ninguno es un hueco roto: esperan un dato del CMS. Comprobados uno por uno
forzando datos en la capa `src/lib/cms/*` (ver «Cómo se verifica»).

Eran cuatro hasta el 2026-09-09; `programacion-box` ya no es uno de ellos
porque dejó de existir, no porque se haya llenado.

- **`inicio-box`** — vive en `ArchivoTemas.astro`, donde el lienzo lo pone («de
  riel junto al archivo»), y ese bloque no se pinta con el archivo vacío: hoy hay
  un solo especial del Fenómeno y es el vigente, así que se excluye. **No
  moverlo**: sería contradecir el lienzo para tapar un hueco de contenido.
- **`lista-box`** — marca el corte entre la última edición y «EDICIONES
  ANTERIORES», así que cuelga de que HAYA ediciones anteriores. `bonus-beat` tiene
  una sola capturada. Sin esa condición, el box quedaría a 40px del leaderboard
  del pie: una página que termina en dos anuncios seguidos.
- **`programacion-box`** — **RETIRADO el 2026-09-09, y hace falta una decisión
  de Carlos para que vuelva.**

  Iba tras «AL AIRE AHORA» y colgaba de que hubiera algo al aire. Ese día
  `/programacion` se partió en dos y **el panel se mudó entero a `/en-vivo`**
  («la primera, que dice Al aire ahora, que se convierta en lo que lleva
  en-vivo»), así que la colocación se quedó sin el corte del que dependía.

  No se reubicó, y los dos sitios que quedan explican por qué: arriba del todo
  sería un anuncio antes de cualquier contenido —justo lo que la condición
  original evitaba— y tras la rejilla quedaría pegado al leaderboard del pie, o
  sea una página que termina en dos anuncios seguidos, que es el mismo error que
  `lista-box` tiene prohibido cometer.

  👉 Y **no se mueve a `/en-vivo` siguiendo al panel**: esa página no lleva box
  por decisión tomada (ver arriba). Si `/programacion` tiene que volver a
  monetizarse con un box, la colocación se acuerda desde cero.
- **`agenda-box`** — se intercala cada SEIS eventos de la lista y nunca de cola
  (ver abajo). Hoy hay un evento capturado, o sea cero filas.

**`programa-box` está en `/programas/*`, que no se puede probar con datos**:
`programas` tiene cero documentos y la ruta responde 404 para cualquier slug.
Comprobado con un programa fabricado en `obtenerPrograma`.

#### El intercalado de `/eventos`

Vive en `Agenda.astro` (`CADA = 6`) y la regla tiene DOS mitades: cada seis filas,
**y solo si debajo quedan filas**. La segunda es la que evita que el box sea la
cola de una agenda corta — «un box solo después de dos eventos es más anuncio que
contenido» (Carlos)— y de paso que caiga junto al leaderboard del pie.

Medido: 6 eventos → ningún box; 7 (6 filas) → ninguno; 8 → uno; 13 → uno; 14 →
dos; 40 (el tope de `obtenerAgenda`) → seis.

Los ids se NUMERAN (`agenda-box`, `agenda-box-2`, …) porque en una agenda larga
hay más de uno y **dos huecos con el mismo id hacen que GPT pinte solo el
primero**. En el reporte de GAM eso además dice qué posición de la lista rinde.

#### El riel en móvil queda encima del leaderboard

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

**Casi siempre NO se toca el código.** La regla de este proyecto es que Ad
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

**Esto SIGUE en pie** (Carlos, 2026-09-08): el documento que lo describía se
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

**`public/ads.txt` todavía declara `viralize.com, 7587, DIRECT`** (línea 283).
Viralize era la red ANTERIOR de este mismo hueco y su script ya no está en el
sitio, así que ese seller autoriza a alguien que ya no vende. Es una decisión de
AdOps, no de código: no se toca sin confirmarlo, pero hay que confirmarlo.

### Y por qué el documento que había estaba MAL

`showheroes-videonota.md` es del v1 y seguirlo hoy rompe cosas:

- Manda editar `src/js/ads.js`, que **es código legado y no se importa en ninguna
  parte de v2** (comprobado). El motor es `src/scripts/anuncios.ts`.
- Manda editar `src/pages/[seccion]/[slug].astro`, ruta que **no existe**: la nota
  vive en `/noticias/[slug]`.
- Y el `defineSlot` que propone apunta a **`/23349147378/StereoCien`** — la
  unidad de OTRA estación. Copiado tal cual, el sitio de Beat pediría inventario de
  Stereo Cien.

El formato que pedía —400×311— es uno de los tres del v1 que hoy no se usan. Si
ShowHeroes vuelve a la mesa, se agrega como formato nuevo por el camino de arriba,
con el ad unit de Beat (`PUBLIC_GAM_AD_UNIT=Beat`) y confirmando la medida en GAM.

`dynamicAds.md` es de la misma época y describe los 13 slots del v1. Sirve como
historia, no como referencia.

---

## Lo que este agente NO hace

- **La política de caché** y el `<head>` como maquetado — son de `agents/frontend.md`.
- **La medición** (GTM, GA4, comScore) — es de `agents/analytics.md`. Se cruzan
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

Y hay un tercer caso que el `curl` NO distingue: un hueco que **no se pinta
porque le falta el contenido del que cuelga** (los cuatro de la tabla). Ahí no
sirve mirar la ruta: hay que FORZAR los datos. El camino es meter un retorno
temporal al principio de la función de `src/lib/cms/*` que alimenta la página
—`obtenerAgenda`, `obtenerListas`, `obtenerParrillaDeHoy`, `obtenerPrograma`—,
levantar `astro dev`, comprobar por `curl`, y revertir con `git checkout --`. Así
se comprobaron las cuatro y la matriz del intercalado de `/eventos`.

Y en el navegador el marco vacío **desaparece a los 3.5s** (`PLAZO_VACIO`), y
además GPT le pone `display:none` al div del slot, así que una captura tardía no
enseña nada. Para medir el marco reservado —que es el peor caso del maquetado— hay
que quitarle el `data-vacio` al `.anuncio` **y** el `display` en línea al
`.anuncio-hueco`.

Al forzar la parrilla salió a la luz un desborde que **no es de publicidad**:
`.pr-horario` lleva `white-space: nowrap`, y un programa de lunes a domingo
—«LUN · MAR · MIÉ · JUE · VIE · SÁB · DOM 00:00–23:59»— saca la página 120px a lo
ancho a 390px. Es de `/programacion`, no del hueco; queda anotado aquí porque se
descubrió aquí.

En preproducción `PUBLICIDAD_TOKEN` va VACÍO a propósito: con token, cada visita
de revisión sumaría impresiones y clics a campañas que se le facturan a un
anunciante real. Comprobado que un barrido que clicó un banner en v2 no generó
ningún conteo. **No lo pongas para «probar que funciona».**
