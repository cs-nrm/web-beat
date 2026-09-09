# Content Agent — Beat 100.9

## Rol

La capa de datos y el contrato de URLs: cómo este front le pregunta al CMS, qué
rutas existen, y cómo un documento de Payload se convierte en algo que se lee en
pantalla.

🔴 **Este documento se reescribió por completo el 2026-09-08.** El anterior
describía un sitio distinto —no una versión anterior de este, **otro sitio**— y
seguirlo hoy no rompe una cosa: rompe el punto de partida.

Lo que decía y lo que hay:

| El acta vieja decía | La realidad de v2 |
|---|---|
| Backend WordPress headless en `beatdigital.com.mx/wp-json/wp/v2` | **Payload** (`cms-estaciones`), por su API REST, solo desde el servidor |
| `src/lib/api.js`, `src/lib/formatters.js`, `src/consts.ts` | **Ninguno existe.** Ver la tabla de abajo |
| `src/content/` + `src/content/config.ts` con schema Zod | **No existe.** No hay colecciones de contenido de Astro, ni MDX, ni Markdown |
| `src/pages/rss.xml.js` y `@astrojs/sitemap` | **No existen.** Los feeds los genera el CMS y este dominio los proxea |
| Astro SSG, 53 rutas, 16 secciones por categoría de WP | **SSR** (`output: 'server'`, adaptador node), 23 archivos de ruta, 5 secciones |
| `getStaticPaths()` y `paginate()` | **No se usan en ninguna ruta.** Todo se resuelve por petición |
| SEO y Open Graph «en `BaseHead.astro`» | `BaseHead.astro` no existe, y el SEO es de `agents/metadata.md` |
| Compatibilidad con Yoast | No hay Yoast: la ficha SEO es el grupo `noticias.meta` de Payload |

Un agente que manda a editar archivos fantasma es peor que no tener agente: hace
perder una tarde y luego hace dudar del resto de la documentación.

---

## Archivos bajo responsabilidad

### La capa de datos

| Archivo | Qué le toca |
|---|---|
| `src/lib/cms/client.ts` | El transporte: `cmsFetch`, `cmsFetchEstacion`, la caché con deduplicación, y `urlMedia` / `urlArchivo` |
| `src/lib/cms/noticias.ts` | Beat Scanner y Editorial: el índice, la nota, las relacionadas y el filtro `distribucion` |
| `src/lib/cms/categorias.ts` | Categorías y etiquetas, siempre **por slug** |
| `src/lib/cms/listas.ts` | Bonus Beat y cualquier tipo de lista que la estación cree |
| `src/lib/cms/especiales.ts` | El Fenómeno Residente: el especial vigente y sus piezas polimórficas |
| `src/lib/cms/eventos.ts` | La Agenda, con su corte «desde hoy» redondeado al día |
| `src/lib/cms/programacion.ts` | La parrilla, resuelta contra el reloj **en el servidor** |
| `src/lib/cms/aire.ts` | La bitácora del playout: «lo que sonó» |
| `src/lib/cms/estacion.ts` | Los datos de marca, memorizados por proceso |
| `src/lib/nota.ts` | Presentación derivada de una nota: firma, categoría, fecha, sección, enlaces de compartir |
| `src/lib/video.ts` | `noticias.video` a algo que el reproductor entiende (id de YouTube ya validado) |
| `src/types/payload.ts` | Los tipos generados del CMS. **No se editan a mano** |
| `payload-types.lock.json` y `scripts/sync-payload-types.mjs` | El commit del CMS al que están fijados esos tipos, y cómo se re-sincronizan |
| `src/config/site.ts` | El contrato de rutas: `rutaNota`, `rutaEspecial`, `rutaEvento`, `rutaLista`, `rutaPrograma`, y `SEGMENTOS_RESERVADOS` |
| `src/config/navegacion.ts` | Qué secciones existen, y qué categoría del CMS llena a cada una |
| `src/pages/**` | Las 23 rutas: qué consulta cada una y cómo degrada si viene vacía |

⚠️ **`src/lib/cms/publicidad.ts` NO es de este agente**, aunque viva en la misma
carpeta: es la venta directa y es de `agents/ads.md`.

⚠️ **`src/js/` entero es LEGADO.** Comprobado con `grep`: ningún archivo de `src/`
importa `src/js/ads.js`, `analytics.js`, `player.js` ni `votes.js`, y
`scripts/guardas.mjs` los excluye a propósito. `src/js/README.md` explica qué se
portó de cada uno y qué se reescribió. Editarlos no tiene ningún efecto.

---

## Las tres reglas del cliente del CMS

Son las que más caro se pagan si se rompen, y las tres tienen un incidente detrás.

### 🔴 1. El navegador NUNCA habla con el CMS

`src/lib/cms/client.ts` tiene un guard que revienta si alguien lo arrastra a un
bundle de cliente. Se importa solo en frontmatter de `.astro` (SSR) o en
`src/pages/api/*`. La única excepción es la MEDIA, que el navegador sí carga directo
del origen público del CMS.

No es una preferencia arquitectónica: el `CMS_URL` de producción es una **IP privada
de la VPC** y el 3000 no se expone a internet. Un import mal puesto no falla en
local —donde el CMS es alcanzable— y falla en producción.

### 🔴 2. Nada que varíe por PETICIÓN entra en un `where`

La clave de caché es la consulta entera, así que un parámetro que cambia en cada
visita **genera una entrada por visita y ninguna acierta nunca.** La lección está
pagada en `web-enfoque`: un `where[id][not_equals]` produjo **836 de 1,103 errores
por hora**.

De ahí dos patrones que parecen rodeos y no lo son:

- La Agenda redondea su corte al **inicio del día** en hora de México
  (`desdeHoy()`), no a «ahora». Todas las visitas de la jornada comparten una
  entrada. El costo es que un evento que empezó hace tres horas sigue listado hasta
  medianoche — que además es lo correcto para una agenda.
- El especial vigente se resuelve con `sort: '-numero'` y `limit: 1`, no filtrando
  por `inicio <= hoy <= fin`. Y de paso nunca deja la sección vacía.

⚠️ Y la misma regla vale en el BORDE: `src/lib/feeds.ts` tiene un conjunto CERRADO
de secciones y un tope de páginas por lo mismo — `?seccion=<lo que sea>` es una
clave de caché regalada.

### 🔴 3. Todo degrada, nada tumba la página

Cada función del CMS devuelve `null` o `[]` en el `catch`, y cada componente decide
no pintarse. El Inicio se ACORTA cuando una colección está vacía; no enseña un
encabezado con nada debajo. `Base.astro` cae a un objeto de marca mínimo si
`estaciones` no responde, y el sitio se sirve igual.

Es la regla de la casa y viene de `web-enfoque`, que responde 200 con cero notas
cuando su CMS no está. ⚠️ Hay colecciones **hoy vacías en producción** —`programas`,
`bitacora`, `transmisiones`, `paginas`— así que estos caminos no son teóricos: son
lo que se ve en pantalla ahora mismo.

---

## Rutas: una por COLECCIÓN, no por sección

🔴 Es la decisión 10 del plan, y explica casi todo el mapa de URLs:

| Ruta | Archivo | De dónde sale |
|---|---|---|
| `/` | `src/pages/index.astro` | nueve consultas en paralelo, una por bloque |
| `/noticias/<slug>` | `src/pages/noticias/[slug].astro` | `noticias` |
| `/beat-scanner` y `/beat-scanner/<categoria>` | `src/pages/beat-scanner.astro`, `src/pages/beat-scanner/[categoria].astro` | `noticias` filtradas por categoría |
| `/editorial` | `src/pages/editorial.astro` | igual, con la otra categoría |
| `/etiqueta/<slug>` | `src/pages/etiqueta/[slug].astro` | `etiquetas` |
| `/especiales/<slug>` y `/fenomeno-residente` | `src/pages/especiales/[slug].astro`, `src/pages/fenomeno-residente/index.astro` | `especiales` |
| `/<tipoLista>` y `/<tipoLista>/<slug>` | `src/pages/[tipoLista]/index.astro`, `src/pages/[tipoLista]/[lista].astro` | `tipos-de-lista` + `listas` |
| `/eventos` y `/eventos/<slug>` | `src/pages/eventos/index.astro`, `src/pages/eventos/[slug].astro` | `eventos` |
| `/programacion` y `/programas/<slug>` | `src/pages/programacion/index.astro`, `src/pages/programas/[slug].astro` | `programas` |
| `/en-vivo` | `src/pages/en-vivo/index.astro` | `programas` + `bitacora` |
| `/alexa`, `/avisodeprivacidad`, `/terminosycondiciones` | páginas estáticas | texto escrito en el repo |

🔴 **Una nota va en `/noticias/<slug>` y no en `/<seccion>/<slug>`** porque
`noticias.categorias` es `hasMany` **sin categoría primaria**: derivar el path de
`categorias[0]` haría que reordenar un array en el admin cambiara una URL viva en
silencio. Para PINTAR sí se elige la primera (`nombreCategoria` en `src/lib/nota.ts`)
y ahí es aceptable, porque reordenar cambia una etiqueta y no una URL.

🔴 **`/bonus-beat` es una ruta DINÁMICA y eso no es un descuido.** El primer segmento
es el `slug` de un documento de `tipos-de-lista`, que es dato editorial: la estación
crea «Bonus Beat» hoy y «Beat Ten» mañana, y las dos secciones tienen que existir sin
que nadie despliegue.

⚠️ **Por eso `bonus-beat` es el ÚNICO segmento que NO va en `SEGMENTOS_RESERVADOS`**,
y está explicado allí: esa lista se comprueba antes que nada, así que reservarlo lo
bloquearía justamente a él y `/bonus-beat` respondería 404 con el contenido cargado y
todo en su sitio.

⚠️ **Y todo lo demás SÍ va en la lista.** Sin eso, `[tipoLista]` reclama el segmento,
dispara una consulta al CMS en cada visita y responde 404. La lección está pagada en
`web-enfoque`: a su lista equivalente le faltaba una entrada y provocó
`ERR_TOO_MANY_REDIRECTS` en una sección del menú. `SEGMENTOS_RESERVADOS` se mantiene
**en sintonía con `src/pages/`** — es la regla, y es lo que hay que revisar al añadir
una ruta.

⚠️ **Una sección que se muda deja 301 detrás.** `/scanner` → `/beat-scanner` vive en
los `redirects` de `astro.config.mjs`, con dos entradas extra escritas a mano para
que no haya CADENA de redirecciones. De esos 301 dependen la migaja de cada nota ya
publicada, el sitemap que emite el CMS y lo que la estación haya compartido.

---

## Los tipos: generados y FIJADOS a un commit

`src/types/payload.ts` sale del CMS, y `payload-types.lock.json` guarda a qué commit
de `cms-estaciones` corresponde. Se re-sincroniza a propósito con `pnpm sync:types`,
nunca solo.

🔴 **Eso es lo que hace que un cambio en el CMS no rompa el front hasta que alguien
lo decida.** El precio es que hay colecciones **más nuevas que el lock**, y su tipo
se declara a mano en el módulo que las usa: `Banner` en `src/lib/cms/publicidad.ts` y
`EntradaBitacora` en `src/lib/cms/aire.ts`. Los dos archivos lo dicen en su cabecera.

⚠️ **`pnpm sync:types:check` está en el `check`, no es opcional.** Un tipo
desincronizado no se ve en pantalla: se ve como un campo que llega `undefined` en una
sola ruta.

---

## Dos trampas de Payload que ya mordieron aquí

- ⚠️ **`!= 'pieza'` NO devuelve las filas con NULL en Postgres.** Por eso el filtro de
  `noticias.ts` es un `or` con `exists: false` al lado: sin él se perderían todas las
  notas que nunca tocaron el campo `distribucion`. Está documentado igual del lado
  del CMS.
- ⚠️ **Los campos vacíos del admin llegan como cadena vacía, no como `null`.** Por eso
  el grupo `meta` se lee con `?.trim() ||` y **nunca con `??`**: con `??` una cadena
  vacía ganaría y la nota se compartiría sin titular. Vale para cualquier campo de
  texto opcional del CMS, no solo para `meta`.

Y una de `depth`, que es la que más tiempo cuesta:

⚠️ **El `depth` insuficiente no da error: da un número.** Una relación sin poblar
llega como `id`, así que `imagen.url` es `undefined` y la foto no se pinta. De ahí que
cada consulta declare su `depth` con la razón al lado —`depth: 2` en `listas` para que
la portada de cada canción llegue, `depth: 1` en los índices— y que
`src/lib/cms/especiales.ts` **descarte** las piezas que llegaron como id en vez de
pintar una cápsula que no se puede enlazar.

---

## Lo que este agente NO hace

- **El `<head>`: título, descripción, canónica, Open Graph, JSON-LD, indexación,
  sitemaps y el grupo `noticias.meta`** — todo eso es de `agents/metadata.md`. ⚠️ Es
  el reparto que más se confunde, porque el acta vieja de este agente reclamaba el
  SEO entero.
- **La maqueta**: componentes, estilos, design system y las animaciones — son de
  `agents/frontend.md`. Este agente decide qué DATO baja; el otro, cómo se ve.
- **El player, el SDK de Triton y el «qué suena»** — son de `agents/streaming.md`.
  ⚠️ Se cruzan en `src/lib/cms/aire.ts`: la bitácora ya **no** alimenta la barra del
  player (lo hace el SDK, en banda), y solo queda como HISTORIAL para el Inicio y
  `/en-vivo`.
- **La publicidad**, programática y vendida — es de `agents/ads.md`, incluido
  `src/lib/cms/publicidad.ts`.
- **Escribir al CMS.** El front es cliente de **solo lectura**. Las dos únicas
  excepciones previstas son las escrituras de oyente (Comunidad, que no existe) y el
  conteo de publicidad, que va por proxy de servidor.
- **Pedirle campos nuevos al CMS.** Eso se escribe en
  `docs/lo-que-el-front-necesita-del-cms.md`, que es el documento de traspaso, y ⚠️ su
  regla de oro aplica aquí: **el lienzo es un mockup de diseño, no una especificación
  de datos.** Ya pasó una vez —el «4 218 escuchando» se leyó como requisito y era
  decoración.

---

## Cómo se verifica

🔴 **La comprobación que importa es que la ruta responda y degrade bien**, y eso no se
ve mirando una sola página con contenido: las colecciones vacías son el estado real de
varias secciones.

```bash
# Las rutas públicas, de un tirón: nada debe dar 500, y lo que no exista debe dar 404.
for u in / /beat-scanner /editorial /eventos /fenomeno-residente /bonus-beat \
         /programacion /en-vivo /alexa /avisodeprivacidad /terminosycondiciones \
         /sitemap.xml /news-sitemap.xml /robots.txt; do
  printf '%-28s %s\n' "$u" "$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:4321$u")"
done

# Que las rutas VIEJAS sigan redirigiendo, en UN salto.
curl -sI http://localhost:4321/scanner          | grep -i '^location\|^HTTP'
curl -sI http://localhost:4321/scanner/editorial | grep -i '^location\|^HTTP'

# Un slug que no existe: 404, no 500.
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4321/noticias/no-existe
```

⚠️ **Sin `CMS_URL` el sitio responde 200 con TODO vacío**, y eso es correcto por
diseño — pero significa que un 200 no demuestra que la consulta funcione. Para eso se
mira el contenido:

```bash
# ¿Trae notas de verdad, o es el estado vacío?
curl -s http://localhost:4321/beat-scanner | grep -c 'href="/noticias/'
```

🔴 **Y toda ruta nueva se prueba con Inicio → nota → atrás.** No es ceremonia: es
donde se han roto tres cosas en este repo, porque con View Transitions el `body` se
reemplaza y el estado que vivía ahí desaparece. Un enlace que funciona al recargar
puede estar roto al navegar.

```bash
# Antes de dar nada por bueno: los tipos y las guardas.
pnpm check
```

Contexto del despliegue: `docs/despliegue-v2.md`. Lo que se le pidió al CMS y qué
aterrizó: `docs/lo-que-el-front-necesita-del-cms.md`.
