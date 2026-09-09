# Metadata Agent — Beat 100.9

## Rol

Todo lo que el sitio le dice a una máquina sobre sí mismo: `<title>`, descripciones,
canónicas, Open Graph, Twitter Card, los datos estructurados, la política de
indexación en sus tres capas —más la del documento—, el juego de iconos, las
tarjetas de compartir y los sitemaps.

Es un agente **transversal y de bajo volumen pero alto riesgo**: casi todo su
alcance vive en dos archivos que comparte con frontend, y sus fallos son
**silenciosos**. Un `og:image` relativo, una canónica apuntando al host equivocado o
una capa de indexación desalineada no rompen nada en pantalla — se ven perfectos
desde el navegador y solo se notan semanas después, en el índice de Google o en un
enlace compartido que sale mudo.

---

## Archivos bajo responsabilidad

| Archivo | Qué le toca |
|---|---|
| `src/layouts/Base.astro` | `<title>`, `<meta name="description">`, `<link rel="canonical">`, `<meta robots>`, el bloque **Open Graph / Twitter Card**, `theme-color`, el juego de `<link rel="icon">` |
| `src/config/site.ts` | `SITE_URL`, `HOST_CANONICO`, `NOINDEX_SITIO`, `noIndexarHost()`, `IDIOMA`, `IDIOMA_REGION`, `LOCALE_OG`, `MEDIDA_TARJETA`, `TARJETA_COMPARTIR`, `urlAbsoluta()`, `SEGMENTOS_RESERVADOS` y el contrato de rutas |
| `src/middleware.ts` | **solo** el bloque final del `X-Robots-Tag`. La política de caché es de frontend |
| `src/pages/robots.txt.ts` | `robots.txt` por `Host` |
| `src/pages/sitemap.xml.ts`, `src/pages/news-sitemap.xml.ts` | las dos rutas que **proxean** los sitemaps del CMS |
| `src/lib/feeds.ts` | `SITEMAPS_ANUNCIADOS` y el proxy de feeds |
| `src/lib/jsonld.ts` | los datos estructurados: `serializar()`, `nodoPublicador`, `nodoEstacion`, `nodoNota`, `nodoMigaja` |
| `src/lib/cms/client.ts` | **solo** `medidaMedia()`, que da las medidas reales de la variante servida para `og:image:width/height` y para el `image` del JSON-LD. `urlMedia` es de frontend |
| `scripts/favicon.mjs` | genera el juego de iconos **y** las tarjetas de compartir —`og-beat.png` y una por sección— desde `public/img/beat-blanco.svg` |
| `src/pages/**/*.astro` | el `titulo`, la `descripcion` y la tarjeta (`imagen`, `imagenAlt`, `imagenAncho`, `imagenAlto`) que cada página le pasa a `Base` |

> **No es dueño exclusivo** de `Base.astro` ni de `middleware.ts`: los comparte con
> `agents/frontend.md` (maquetado, caché) y con `agents/analytics.md` (los scripts de
> medición viven en el mismo `<head>`). Cualquier cambio que toque el `<head>` se
> coordina con los dos.

---

## Las TRES capas de indexación

No son redundancia, son tres momentos distintos del rastreo. **Las tres leen las
mismas dos reglas y basta con que una cierre.**

| Capa | Dónde | Cuándo actúa |
|---|---|---|
| `robots.txt` | `src/pages/robots.txt.ts` | ANTES de que el rastreador pida nada |
| `X-Robots-Tag` | `src/middleware.ts` | en TODA respuesta: HTML, JSON de los proxies, RSS |
| `<meta robots>` | `src/layouts/Base.astro` | solo en HTML, segunda capa |

Y las dos reglas que las tres consultan:

- **`NOINDEX_SITIO`** — el dominio con el que se COMPILÓ. Falla del lado seguro: una
  configuración rota no indexa, en vez de indexar un duplicado.
- **`noIndexarHost(hostname)`** — el `Host` de ESTA petición. Es la que muerde: la
  beta y el sitio real son la MISMA imagen de Docker, así que sin esta regla
  `v2.beatdigital.mx` serviría un duplicado exacto compitiéndole al sitio real.

### La cuarta entrada: `noticias.meta.noIndex` (2026-09-07)

Las tres capas de arriba hablan del **despliegue**. Desde el 2026-09-07 hay una
cuarta regla, y es de otra naturaleza: **la trae el DOCUMENTO** —`meta.noIndex` de
una nota, que la redacción marca en el admin— y solo puede evaluarse cuando ya se
sabe qué documento se sirve.

| Dónde | Qué pone |
|---|---|
| `src/pages/noticias/[slug].astro` | la cabecera `X-Robots-Tag` de SU propia respuesta |
| `src/layouts/Base.astro` (prop `noIndex`) | el `<meta robots>` del documento |

- 🔴 **NO puede vivir en el middleware**, que es donde está el resto de la política:
  cuando el middleware corre no sabe qué documento se va a servir, ni si existe. Por
  eso la nota pone su propia cabecera, y por eso `Astro.response.headers` se escribe
  en el frontmatter de la PÁGINA — desde el layout ya es tarde, la respuesta va en
  camino.
- ⚠️ **Se combina con `||`, igual que las otras**: solo puede CERRAR. Un `false` del
  CMS no abre la preproducción, así que equivocarse en el admin no tiene
  consecuencias.
- ⚠️ La cabecera es de esa respuesta y no se contagia: el resto del sitio sigue
  indexable (comprobado, ver «Cómo se verifica»).

### 🔴 De qué depende, fuera de este repo

1. **`security.allowedDomains` en `astro.config.mjs`.** Sin esa lista,
   `context.url.hostname` es SIEMPRE `localhost` en producción, y las tres capas
   marcarían el sitio real como despliegue de prueba.
2. **`ProxyPreserveHost On` en el vhost de Apache.** Por omisión Apache reescribe el
   `Host` hacia el backend. Si alguien lo apaga: la indexación NO se abre —
   «localhost» tampoco es el canónico — pero `Astro.url` deja de decir la verdad y
   `checkOrigin` **responde 403 a todo POST**. Falla silenciosa por un lado y
   ruidosa por el otro, que es la peor combinación para diagnosticarla.

⚠️ **Corolario:** meter delante un proxy que reescriba el `Host` abre las tres capas
a la vez. Ver `docs/despliegue-v2.md`.

---

## Open Graph y Twitter Card

Se agregaron el 2026-09-07; antes **no había ni una etiqueta**. Los tres botones de
compartir de la nota funcionaban, pero lo que llegaba a Facebook era un enlace pelado.

```
Base.astro
  ├─ og:site_name · og:locale (LOCALE_OG) · og:type · og:title
  ├─ og:description  ← `descripcion` de la página, o RESUMEN_CASA
  ├─ og:url          ← la canónica, NO el host que sirve
  ├─ og:image        ← `imagen` de la página, o /img/og-beat.png
  ├─ og:image:alt · og:image:width · og:image:height   ← solo si el dato existe
  ├─ article:published_time · article:modified_time  (solo con tipo="article")
  └─ twitter:card · twitter:site
```

Reglas que hay que respetar:

- 🔴 **`og:image` va ABSOLUTA o no cuenta.** Facebook y X descartan una ruta relativa
  **sin decir nada**: la publicación sale sin imagen y desde el sitio no se nota. Se
  resuelve una sola vez en el layout, contra `SITE_URL`.
- 🔴 **Nunca SVG en `og:image`.** Ninguna de las dos plataformas lo acepta.
- 🔴 **Las tres etiquetas de la imagen se eligen JUNTAS y del mismo lado.** Si la
  página trae imagen propia, el `alt` y las medidas son los de ESA imagen o no van;
  jamás los del respaldo. Y unas medidas que no correspondan al archivo son peores
  que ninguna: las plataformas reservan el hueco con ellas antes de bajar la imagen,
  así que el error se ve como un recorte en la publicación y no como un fallo.
- **La nota pasa ficha propia** (`imagen`, `tipo="article"`, `publicado`,
  `modificado`) y **cada sección pasa su tarjeta**. El Inicio, los legales y todo lo
  demás caen al respaldo de marca.
- **Las tarjetas se GENERAN, no se suben**: `pnpm favicon` las saca del mismo
  `beat-blanco.svg` del logo, a 1200×630. Así no pueden quedarse en una marca
  anterior sin que nadie lo note — que es exactamente lo que había pasado con el
  favicon, que siguió meses con la abeja amarilla de 2025.
- **De `twitter:` solo se emite `twitter:card`** (y `twitter:site`). X lee el resto de
  Open Graph; duplicar `twitter:title` y compañía sería mantener dos veces lo mismo
  para que digan lo mismo. Por eso tampoco hay `twitter:image:alt`.

### Las tarjetas por SECCIÓN (2026-09-08)

Hasta ese día `/editorial`, `/beat-scanner`, `/eventos`, `/fenomeno-residente`,
`/bonus-beat` y `/programacion` compartían todas `og-beat.png`: compartir una
sección y compartir otra llegaba a WhatsApp con la MISMA imagen, así que la tarjeta
no añadía nada a lo que el enlace ya decía. Ahora cada una tiene la suya, con el
nombre de la sección sobre el negro de la marca.

- **El wordmark se queda junto al nombre**, y más chico que él. Una tarjeta que solo
  dijera «EDITORIAL» sobre negro no identifica a nadie —«Agenda» o «Editorial» son
  palabras de cualquier medio— y el dominio se ve en gris pequeño o no se ve. En el
  respaldo el wordmark ES el asunto y va a 460px; en una de sección es la firma y va
  a 300.
- **Se generan al COMPILAR**, en `scripts/favicon.mjs`, y el PNG se commitea.
  `sharp` es `devDependency`: nada de esto existe en producción, donde solo hay
  archivos estáticos en `public/img/`. ⚠️ Compilar el sitio **no** las regenera — si
  cambia el logo o el nombre de una sección, hay que correr `pnpm favicon`.
- 🔴 **Cada página pasa su `imagen` escrita a mano** (`imagen="/img/og-editorial.png"`
  + su `alt` + `MEDIDA_TARJETA`). No hay detección de archivos en ejecución: la
  página declara con qué se comparte, se ve con un `grep`, y una sección sin tarjeta
  cae al respaldo en vez de pedir un archivo que no existe. La única excepción es
  `/bonus-beat`, cuya ruta es dinámica (`[tipoLista]`): ahí la tarjeta se busca por
  slug en un mapa del propio archivo.
- ⚠️ **La lista de secciones está escrita DOS veces** y hay que mantenerla en
  sintonía: en `scripts/favicon.mjs` (que es `.mjs` y no puede importar el `.ts` de
  `config/navegacion.ts`) y en el `imagen=` de cada página. Olvidarse es inofensivo
  —se comparte con la tarjeta de marca— y es lo que había antes.
- ⚠️ **El texto de la tarjeta es el del `h1`** de esa sección, no el del `<title>`:
  la tarjeta es la puerta de la página y tiene que decir lo que la página dice al
  abrirla. De ahí «AGENDA» en un archivo que se llama `og-eventos.png` (el archivo
  se nombra por la RUTA) y «EL FENÓMENO RESIDENTE» con su artículo.
- ⚠️ **El `alt` describe el texto HORNEADO en el PNG**, no una variable. En
  `/bonus-beat` es explícito: armarlo con `tipo.nombre` haría que un renombre en el
  CMS dejara el `alt` describiendo unas letras que no están en la imagen.
- ⚠️ **El cuerpo y el reparto en líneas se MIDEN, no se escriben**: el script compone
  el texto, `trim()` le da la caja real y de ahí sale el cuerpo que cabe. Si en una
  línea la letra queda chica se prueban los cortes por palabra y gana el que la deja
  más grande — «EL FENÓMENO RESIDENTE» pasa de 79px a dos líneas de 138. Hay guardas
  que truenan si algo no cabe: una tarjeta con el nombre cortado se ve perfecta desde
  el sitio y solo se nota ya publicada.
- ⚠️ **El nombre NO va en Archivo**, la tipografía de display del sitio: librsvg
  compone con las tipografías del SISTEMA y las del front son `.woff2`, que
  fontconfig no indexa. Se pide una pila grotesca (Helvetica Neue / Helvetica /
  Arial). Consecuencia asumida: regenerar en otra máquina puede dar otra letra. Se
  acepta porque el PNG se commitea y porque lo que identifica la marca en la tarjeta
  es el wordmark, que sí es el vector real.

---

## Canónicas y el contrato de URLs

- La canónica se arma **siempre** contra `SITE_URL`, nunca contra el host que sirve.
  Lo mismo hacen `og:url` y los enlaces de compartir de la nota. Efecto secundario
  conocido y deseado: **compartir desde v2 enseña la ficha del sitio en producción.**
- **Una ruta por COLECCIÓN, no por sección** (decisión 10 del plan). Las notas van en
  `/noticias/<slug>` y NO en `/<seccion>/<slug>`, porque `noticias.categorias` es
  `hasMany` sin categoría primaria: derivar el path de `categorias[0]` haría que
  reordenar un array cambiara una URL viva en silencio.
- `SEGMENTOS_RESERVADOS` se mantiene **en sintonía con `src/pages/`**. La lección
  está pagada en `web-enfoque`: a su lista equivalente le faltaba una entrada y
  provocó `ERR_TOO_MANY_REDIRECTS` en una sección del menú.
- Una sección que se muda **deja 301 detrás**, no un 404. Ver los `redirects` de
  `astro.config.mjs` para `/scanner` → `/beat-scanner`: de esos 301 dependen la
  migaja de cada nota ya publicada y lo que la estación haya compartido.
- ⚠️ Si un cambio deja dos URLs sirviendo lo mismo, se colapsa una en la otra con
  301 en **un solo salto**. Ya pasó con `/scanner/editorial`, que daba dos.

---

## Sitemaps

🔴 **Los genera el CMS. Estas rutas solo los sirven bajo nuestro dominio.**

`/sitemap.xml` y `/news-sitemap.xml` son proxies (`src/lib/feeds.ts`). El path que el
CMS emite (`getNewsURL` en `cms-estaciones/src/seo/site.ts`) ya coincide con el
nuestro, así que **al corte solo cambia el host, no el path**.

⚠️ Consecuencia práctica: **las rutas de sección del front NO están en el sitemap.**
Si hace falta declararlas, es una decisión nueva — no un arreglo.

⚠️ Los dos sitemaps son **bloqueantes del corte de dominio**, no de la
preproducción. Ver la lista de `docs/despliegue-v2.md`.

---

## Títulos y descripciones

- **Patrón del título:** `<lo específico> — Beat 100.9`. El Inicio es la excepción.
- **Descripción: ≤ 160 caracteres.** Google corta ahí, y desde que existe Open Graph
  esa misma frase es lo que se ve al compartir en WhatsApp o Facebook: **deja de ser
  texto para un buscador y pasa a ser una frase que lee una persona.**
- Una descripción **dice qué ES la página antes de qué tiene.** Enumerar secciones
  («el Fenómeno Residente», «Bonus Beat») no funciona para quien nunca ha entrado, y
  quien ya conoce el sitio no lee la descripción.
- **Nada de «Total Music».** Era el lema del v1 y se retiró del sitio el 2026-09-07.
- `RESUMEN_CASA` (en `Base.astro`) es el respaldo de cualquier página sin descripción
  propia. ⚠️ Tiene que decir lo mismo que la descripción del Inicio; son dos textos
  que se desincronizan solos.

---

## El grupo `meta` del CMS (`noticias.meta`)

Es la ficha que la redacción captura **para los buscadores y para lo que se
comparte**: `title`, `description`, `image`, `canonicalUrl`, `noIndex`. Estaba
poblado y el front lo ignoraba entero hasta el 2026-09-07 — medido contra
`admin.nrm.com.mx`, había un titular de 94 caracteres acortado a mano a 82 que nadie
usaba. Lo lee `src/pages/noticias/[slug].astro`.

⚠️ **Cada campo se toma solo si trae algo** (`?.trim() ||`, nunca `??`): un campo del
admin que se abrió y se dejó en blanco llega como cadena vacía, y con `??` eso
ganaría y la nota se compartiría sin titular.

Las cinco decisiones (Carlos, 2026-09-07):

| Campo | Qué se hace |
|---|---|
| `meta.title` | **gana** en `<title>` y `og:title` |
| `meta.description` | **gana** en `<meta description>` y `og:description` |
| `meta.image` | es la que se COMPARTE; el hero sigue siendo lo que se ve |
| `meta.noIndex` | se honra, en las **dos** capas que pueden saberlo |
| `meta.canonicalUrl` | **se ignora** — a propósito |

- **`title` y `description` ganan porque para eso existe el grupo.** El titular del
  buscador puede ser más corto que el que lee quien ya entró. Lo que NO cambian es el
  `h1` ni la bajada de la página.
- **`image` se comparte, el hero se ve.** Son dos trabajos distintos y la redacción
  los captura por separado: en la nota de Amelie Lens el hero es un 3:2 recortado
  para la página y `meta.image` es la foto de prensa, que es la que funciona dentro
  de una tarjeta de Facebook. ⚠️ El `alt` y las medidas viajan CON la foto elegida,
  nunca mezclados: son documentos de media distintos con su propio `alt`.
- **`noIndex` se honra en dos capas** — la cabecera la pone la página, el `<meta>` el
  layout. Ver «La cuarta entrada» más arriba.
- 🔴 **`canonicalUrl` se IGNORA, y no es un olvido.** Sirve para contenido SINDICADO
  —una nota publicada primero en otro sitio, cuya autoridad le pertenece a ese otro—
  y choca de frente con la doctrina de rutas de este repo: toda URL se arma contra
  `SITE_URL` y nunca contra otra cosa. Honrarlo sería darle a un campo de texto del
  admin la capacidad de sacar una nota del índice de este dominio sin que se note en
  ninguna pantalla. ⚠️ Hoy está vacío en las 11 notas, así que no se está perdiendo
  nada; el día que la estación republique contenido de terceros es una decisión que
  se toma de nuevo, no un pendiente que se arregla.

---

## Datos estructurados (JSON-LD)

Se agregaron el 2026-09-07 y viven en `src/lib/jsonld.ts`. Se emiten con
`set:html` + `is:inline` — ⚠️ sin `is:inline` Astro se lleva el bloque al bundle,
donde ningún rastreador lo va a leer.

```
Inicio  → nodoEstacion (RadioStation + sameAs de las redes)   ← en Base.astro
Nota    → nodoNota (NewsArticle) + nodoMigaja (BreadcrumbList) ← en [slug].astro
```

- 🔴 **El JSON-LD es una AFIRMACIÓN sobre lo que hay en la página, no promoción.**
  De ahí la regla que decide todos los casos: **el `headline` nunca sigue a
  `meta.title`** —lleva el `h1` visible— y el `image` lleva el hero, aunque el
  `<title>` y la `og:image` de la misma nota sí usen el grupo `meta`. Un `<title>`
  puede diferir legítimamente del titular; un `headline` que no coincida con lo que
  la página pinta es el marcado que Google lee como engañoso, y ahí no se pierde la
  propiedad: se pierde la ficha. El caso vivo es
  `fenomeno-residente-capsula-1-2` — su `meta.title` dice «Fenómeno Residente
  Cápsula 1» y su `h1` dice «Kraftwerk Parte 1». Lo mismo con `description`, que
  lleva el `resumen`.
- **La ficha de la estación va solo en el Inicio**, y en el layout: los dos datos que
  la sostienen —nombre público y redes— ya están resueltos ahí y son los mismos que
  pintan la cabecera y el pie. Resolverlos otra vez abriría la puerta a que el
  `sameAs` enlace a una cuenta distinta de la que el lector ve.
- **La migaja va en la forma NORMAL del nombre** —«Editorial», «Beat Scanner»—, no en
  mayúsculas: Google la enseña literalmente al lector, y la mayúscula es el
  `text-transform` de la pastilla, una decisión de CSS. De ahí `nombre` junto a
  `rotulo` en `SECCIONES_EDITORIALES` (`config/navegacion.ts`).
- **`author` se OMITE cuando no hay firma**, y hoy pasa. Un «Redacción Beat» de
  relleno sería un dato que la página no dice.

---

## Lo que este agente NO hace

- **La política de caché** del middleware — es de `agents/frontend.md`.
- **Los scripts de medición** del `<head>` — son de `agents/analytics.md`.
- **Los `alt` de las imágenes.** Salen de `media.alt` en el CMS; es contenido, no
  metadato del sitio (`agents/content.md`).

---

## Cómo se verifica

Los fallos de este agente no se ven en pantalla, así que **no se dan por buenos
mirando la página**. Lo que sí sirve:

```bash
# Las tres capas, contra los DOS hosts. Tienen que discrepar.
curl -sI https://v2.beatdigital.mx/    | grep -i x-robots-tag   # noindex
curl -sI https://beatdigital.mx/       | grep -i x-robots-tag   # ausente
curl -s  https://v2.beatdigital.mx/robots.txt                   # Disallow: /

# La ficha de una nota, entera y con la imagen absoluta.
curl -s https://beatdigital.mx/noticias/<slug> | grep -E 'og:|twitter:|canonical'

# Que cada sección traiga SU tarjeta y el Inicio y los legales el respaldo.
for u in / /editorial /beat-scanner /eventos /fenomeno-residente /bonus-beat \
         /programacion /avisodeprivacidad; do
  curl -s "http://localhost:4321$u" | grep -o 'og:image" content="[^"]*"'
done
```

⚠️ Una `og:image` relativa **pasa toda validación local** y falla solo en la
plataforma. Si se cambia algo del bloque de compartir, se comprueba que la URL salga
con `https://` y host.

🔴 **`meta.noIndex` no se puede comprobar en local a secas**: en `localhost` las dos
reglas del despliegue ya cierran, así que la respuesta sale `noindex` de todas formas
y la prueba no demuestra nada. Hay que abrir el despliegue y forzar el campo:

```bash
# 1. `SITIO_NOINDEX=0` abre las dos reglas del despliegue (el escape hatch de
#    site.ts). Se lee en EJECUCIÓN, así que hace falta levantar el servidor con
#    ella — el dev server que ya esté arriba no la va a tomar.
CMS_URL=… pnpm build
SITIO_NOINDEX=0 CMS_URL=… npx astro preview --port 4323

# 2. Sin tocar nada: la nota tiene que salir indexable. Si no, la prueba no aísla.
curl -sI http://localhost:4323/noticias/<slug> | grep -i x-robots-tag   # ausente
curl -s  http://localhost:4323/noticias/<slug> | grep 'name="robots"'   # index, follow

# 3. Forzar `const noIndex = true` en `[slug].astro`, reconstruir, y las DOS capas:
curl -sI http://localhost:4323/noticias/<slug> | grep -i x-robots-tag   # noindex, nofollow
curl -s  http://localhost:4323/noticias/<slug> | grep 'name="robots"'   # noindex, nofollow
curl -sI http://localhost:4323/ | grep -i x-robots-tag                  # ausente: no se contagia
```

⚠️ Las 11 notas del CMS tienen `noIndex` en `false`, así que este campo **solo se
puede probar forzándolo**. Comprobado así el 2026-09-08.

Contexto operativo del despliegue y del corte: `docs/despliegue-v2.md`.
