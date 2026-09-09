# Lo que el front de Beat necesita de `cms-estaciones`

> Documento de traspaso, para trabajarse en la sesión de `cms-estaciones`.
> Escrito desde `web-beat` (rama `beat`) el **2026-08-21**.
> Tipos del front fijados en `cms-estaciones@abfd52a0` — cuando algo de aquí
> aterrice, del lado del front basta `pnpm sync:types` y re-fijar el lock.

Convención: ✅ verificado contra el CMS o la API · ⚠️ inferido, confirmar ·
🔴 bloquea algo concreto.

---

## 1. Colecciones que faltaban — casi cerrado

> **Actualizado 2026-08-21.** De las tres que pedí: `eventos` ✅ aterrizó,
> `bonus-beat` ❌ ya no hace falta (cabe en `listas`), y **solo queda `paginas`**.

### ✅ `eventos` — Agenda (§5) — ATERRIZÓ el 2026-08-21

Salió calcada de lo pedido, incluido el detalle marcado en rojo:
`accion: 'ninguna' | 'rsvp' | 'boletos'` (los dos CTA distintos del diseño) y
`tipo: 'propio' | 'cobertura' | 'festival'` (los filtros del lienzo). Fechas reales.

<details><summary>Lo que se había pedido</summary>

Campos derivados del lienzo v14 (`e.*` y `proximo.*`):
`titulo`, `slug`, `descripcion`/`bajada`, `lugar`, `ciudad`, `inicio` (con hora),
`fin`, `portada`, `estacion`, y

- **`tipo`** — el lienzo pinta filtros `TODOS · PROPIOS · COBERTURAS · FESTIVALES`,
  así que son al menos: cobertura, activación propia, presencia en festival.
- 🔴 **`accion`** — el diseño muestra **dos CTA distintos, `RSVP` y `BOLETOS`**. No
  basta una URL: el evento tiene que saber cuál aplica. Y el §5 del PDF dice
  "boletos cuando aplique (vínculo a venta de terceros **o tienda propia**)", así
  que el destino puede ser interno o externo.
- Fechas **como `date` reales**, no texto. El sitio viejo tenía cinco formatos
  distintos en ACF y un archivo entero (`formatters.js`) solo para lidiar con eso.

</details>

### ~~`bonus-beat`~~ — ❌ YA NO HACE FALTA (resuelto 2026-08-21)

Cabe en `listas`, y la vía es mejor que una colección propia.

Mi requisito original decía que no cabía porque "`especiales.playlist` es un array de
relaciones plano, sin texto por ítem" y el mapa de sitio pide "las 3 canciones
semanales **con su viñeta**". Eso era cierto de `especiales` — pero yo estaba mirando
la colección equivocada. `listas` ahora tiene **`canciones[].comentario`**, y la
descripción del campo usa la palabra exacta del mapa de sitio: *"la **viñeta** que
acompaña a la canción en el sitio: por qué está aquí, qué contar de ella"*.

Así que Bonus Beat es un **tipo de lista**, no un tipo de contenido:
- `tipos-de-lista` → la estación crea uno llamado «Bonus Beat»
- `listas.tipo` → apunta a él · `listas.fecha` → la semana (el viernes)
- `listas.canciones` → las 3 entradas, cada una con su `cancion` y su `comentario`
- Los enlaces a plataformas salen de `canciones.{spotify,appleMusic,youtube,deezer}`

Y encaja con la intención del cambio: "qué listas existen lo define cada estación, no
el código". Si mañana quieren una lista nueva, la crean sin tocar código.

### `paginas` — §8 y legales
Para «Beat para marcas» (§8: audiencia y perfil del oyente, espacios patrocinables,
casos de éxito, contacto comercial) más el aviso de privacidad y los términos.
`titulo`, `slug`, `contenido` (Lexical), SEO. El front ya reserva `/marcas`,
`/avisodeprivacidad` y `/terminosycondiciones`.

### ❌ Ya NO hacen falta
`charts` y `promociones` quedaron fuera del alcance del relanzamiento. Y `listas`
ya la construiste.

---

## 2. 🔴 Colecciones de Comunidad (§6 — el objetivo estratégico #1)

El mapa de sitio lo dice así: *"convierte oyente pasivo en base de datos propia, el
activo más valioso y menos dependiente de algoritmos"*. Hoy es la única sección que
**no se puede ni empezar**, porque `users` es staff con `create` restringido a
superadmin: no hay registro público posible.

- **`oyentes`** — colección con `auth: true`, **separada de `users`**. Payload admite
  varias colecciones autenticables. Propuesta: **cuenta única NRM** (email único
  global) + `estacionOrigen` (dónde se registró) + `estaciones` (array, dónde tiene
  actividad). Un login sirve a las 4 marcas desde el día 1 y no obliga a resolver
  identidad cross-brand después.
- **`playlists`** — `oyente` (rel), `nombre`, `slug`, `publica`, `estacion`, y
  `canciones` como **array ordenable de relaciones a `canciones`**. Ese encaje es lo
  que hace valiosa la feature: `canciones` es el catálogo real que alimenta la
  bitácora, así que "esto que suena → a mi playlist" sale directo del now-playing.
- **`guardados`** — favoritos: `oyente` + relación polimórfica a
  `noticias`/`podcasts`/`especiales`.
- **`suscripciones`** — el newsletter del §6. ⚠️ Decisión abierta: quién ENVÍA
  (Mailchimp/Brevo/Resend) o si el CMS solo guarda la lista.

El formulario de sugerencia musical **no necesita colección**: usa el
`plugin-form-builder` que ya está, con `form-submissions.create` abierto a anónimos.

🔴 Access control estricto: un oyente solo lee y escribe lo suyo. Y cada colección
nueva necesita su columna en `payload_locked_documents_rels`.

---

## 3. 🔴 Cambios a lo que YA existe (los fáciles de pasar por alto)

No son colecciones nuevas, así que se olvidan. Y dos de ellos bloquean el SEO.

### ✅ A4 — `getNewsURL` consciente de la estación — RESUELTO 2026-08-21

Ya pasa la base de cada estación con `baseDeEstacion(estacion.dominio)`.

<details><summary>El problema que era</summary>
✅ Verificado en `src/seo/site.ts`: arma `${SITE_URL}/noticias/<slug>` con `SITE_URL`
saliendo de **un solo** `NEXT_PUBLIC_SITE_URL` para las 4 estaciones. O sea que **el
sitemap de Beat saldría con el dominio del CMS**.

El dato ya existe y no se usa: **`estaciones.dominio`** es obligatorio e indexado,
creado literalmente "para que los fronts resuelvan host → estación". Hay que
enhebrar la estación en `getNewsURL`/`getPodcastURL`, y que
`NEWS_PUBLICATION_NAME` salga de `estaciones.nombrePublicacion` en vez del env único.

ℹ️ El PATH (`/noticias/<slug>`) ya es el correcto: el front adoptó el mismo contrato
(una ruta por colección). Solo falta el host.

</details>

### ✅ A5 — Feeds por estación — RESUELTO 2026-08-21

Cada estación con sus feeds, y el sitemap dejó de ser plano.

<details><summary>El problema que era</summary>
`sitemap.xml`, `news-sitemap.xml`, `rss.xml` y `podcasts/rss.xml` usan
`overrideAccess: true` y filtran solo por `estado` → hoy emitirían **las 4 estaciones
en un mismo feed**. Resolver por host (para eso está `dominio` indexado) o rutear.

⚠️ Y que el sitemap sea un **índice con hijos paginados**, no un `<urlset>` plano:
en Enfoque el plano con tope de 1,000 dejó ~102,000 notas sin vía de descubrimiento.

</details>

### A7 — Webhook de revalidación
No existe ningún `afterChange` que avise al front. Mientras no exista, el front vive
de TTL corto y **no se puede encender Cache Everything** en el CDN. No bloquea el
desarrollo, sí el rendimiento en producción.

### ℹ️ CORS: Beat NO lo necesita
El commit de `listas` pide agregar los 4 dominios a `CORS_ORIGINS` "para que los
sitios puedan llamar al endpoint de votos desde el navegador". **Para Beat no hace
falta**: la arquitectura es BFF y el navegador nunca habla con el CMS — el voto irá
por un proxy `/api/votar` de Astro. Aplica a los otros tres fronts, no a este.

---

## 3-bis. 🔴 Consecuencia del cambio de `listas.tipo` a relación

`listas.tipo` pasó de un `select` con valores fijos a una relación con
`tipos-de-lista`. La mitigación está bien —el slug solo se genera del nombre si está
vacío, así que renombrar no rompe una ruta viva, y borrar un tipo en uso está
bloqueado con `ON DELETE RESTRICT`—.

Pero cambia una cosa para el front: **los slugs de las listas ahora son dato
editorial, no valores de código.** Antes el enum garantizaba `topten` /
`hot-parade` / `lanzamientos`. Ahora dependen de cómo se nombren al capturar.

→ El front **no hardcodea** esas rutas: lee `tipos-de-lista` de la estación y las
construye desde el slug. Es lo coherente con la intención del cambio ("qué listas
existen lo define cada estación, no el código") y significa que crear «Bonus Beat» o
cualquier lista nueva no necesita un despliegue.

⚠️ Lo único que hace falta acordar es **cómo se van a llamar**, porque el slug ES la
URL pública. Si el tipo se llama «Top Ten», la ruta será `/top-ten` y no `/topten`.

## 4. Datos de configuración (admin, no código)

- 🔴 **`categoriasMusicales` de Beat** — ✅ verificado VACÍA el 2026-08-21. La lista
  blanca **falla cerrado**, así que la ingesta descarta el 100% de lo que manda el
  playout. Es lo que alimenta el "qué suena ahora", que el §4.1 del mapa llama la
  decisión de producto más importante del sitio. Insumos: `~/Desktop/CATEGORIAS
  BEAT.xlsx` y la lista que ya filtraba el `/playlist` viejo (`RANDOM`,
  `MUSICA-DANCE`, `MUSICA-HOUSE`, `MÚSICA-DREAM`, `MUSICA-ELECTRONICA`,
  `MUSICA-PROGRESIVO`, `MUSICA-RETRO`, `MUSICA-RANDOM ANDRE`, `LADO F`).
- **Redes sociales de la estación** — ✅ verificado: las cinco en `null`. **El pie del
  sitio las necesita** y hoy degrada a "Próximamente". Están en el footer del sitio
  viejo: FB `beat1009fm`, X `BEATOFICIAL`, más IG, YouTube y TikTok.

---

## 5. ⚠️ Campos que el diseño pide y hay que confirmar antes de crear

🔴 **Regla al leer el lienzo:** es un mockup de diseño, no una especificación de
datos. Sus cifras son relleno verosímil. Ya pasó una vez: el contador de "4 218
escuchando" se leyó como requisito y era decoración. **Nada de aquí se vuelve campo
sin confirmarlo.**

- ❌ **La CLASIFICACIÓN de un programa — NO VA. Decisión de Carlos, 2026-09-09:**
  «no lo necesitamos, el diseño se lo inventó».

  Se deja escrito porque el lienzo sigue pidiéndola y se va a volver a proponer. El
  diseño de `/programacion` pinta tres filtros sobre la parrilla —`SHOW
  INTERNACIONAL · SHOW SINDICADO · PRODUCCIÓN BEAT`— y una rejilla «SHOWS
  INTERNACIONALES» con su conteo. Se pidió el campo, **se acordó cerrado**
  (`tipoDeShow: 'internacional' | 'sindicado' | 'propio'`, `select` opcional sin
  default), se construyó el front entero contra él… y se retiró **sin desplegar
  nada**: internacional / sindicado / propio no es una distinción que la estación
  lleve en la operación. Apareció en el lienzo, no en la radio.

  🔴 **Cero cambios de esquema y cero deploy.** No hay `tipoDeShow`, no hay
  migración y no hay commit que esperar. El lock en `cms-estaciones@eb0ad49` sigue
  válido y **no hay que correr `pnpm sync:types`**.

  🔴 **Y no hay camino B.** `programas` no tiene NINGUNA taxonomía con la que
  aproximarla —ni `categorias` ni `etiquetas` ni nada parecido—: sus campos son
  `nombre`, `descripcionCorta`, `descripcion`, `locutores`, `imagen`, `horarios[]`,
  el contacto al aire (`whatsapp`/`telefono`/`hashtag`), `slug` y `estado`.
  Confirmado por la sesión del CMS. Así que si vuelve, vuelve con un campo nuevo,
  con quien lo capture, y con el contrato acordado otra vez desde cero.

  ⚠️ Del lado del front se quitó todo —las casillas, la sección, el conteo y
  `clasificacionDe()`— y **no quedó tolerancia ni flag**: una casilla que no puede
  encenderse nunca es peor que no tenerla. Está en el historial de git.

  ℹ️ Lo único que sobrevive de ese viaje, y vale por sí solo: **el rótulo con marca
  se arma desde `estaciones.nombrePublicacion`, no escrito a mano.** El valor del
  CMS iba a ser `'propio'` justamente para no llevar «Beat» dentro, porque el mismo
  campo lo usarían Oye, Sabrosita y Stereo Cien. Ese es el patrón del repo y se va
  a repetir con cualquier otro rótulo que el diseño pida con la marca adentro.

- ✅ **Imagen del hero: UNA sola, con punto focal — RESUELTO el 2026-09-09.** No se
  crea un `imagenApaisada`.

  El hero de `/programacion` es una franja apaisada, así que la `imagen` del
  programa —que puede venir vertical— se recorta fuerte. Lo que lo hace viable es
  que
  **`media` lleva `focalPoint: true`**: todo documento trae `focalX`/`focalY` en
  porcentaje, y el front los pinta como `object-position` (`puntoFocal()` en
  `lib/cms/client.ts`). Sin eso, `object-fit: cover` recorta por el centro, que en
  una foto vertical de un DJ es el pecho.

  🔴 **Los `sizes` del CMS son solo de ANCHO y conservan la proporción: ninguno es
  un recorte.** `thumbnail` 400 / `card` 768 / `large` 1280. No esperar un cuadrado
  ni un 16:9 del CMS — el recorte lo hace el front.

  Por qué no dos campos: son ~39 programas y la mitad llegaría sin el apaisado el
  día del lanzamiento, así que el fallback a `imagen` haría falta igual, y el editor
  se quedaría con dos casillas sin regla de cuál gana. ⚠️ Esto sigue vigente aunque
  la clasificación se haya caído: el punto focal era dato REAL que ya venía en la
  respuesta y no se estaba usando, y el hero lo necesita igual. Si algún día Carlos quiere
  arte de hero de verdad, el patrón ya existe y no es un campo suelto:
  `cabeceraField` (`src/fields/cabecera.ts`), que es lo que usa `especiales` para
  esta misma división hero-vs-tarjeta. **No se construyó nada para eso.**

- 🔴 **`programas.estado` NO lo filtra el servidor** (avisado por la sesión del CMS,
  2026-09-09). Su acceso de lectura es `lecturaPublicaTotal` (`() => true`), no el
  de `noticias`: **los archivados llegan igual**. El front ya filtra
  `where[estado][equals]=activo` en sus dos consultas de listado, pero conviene
  tenerlo escrito, porque por analogía con las notas uno supone que el servidor
  protege — y aquí esa condición es la ÚNICA defensa.

  ⚠️ Lo que **no** filtra es `obtenerPrograma(slug)`, y es a propósito: la ayuda del
  propio campo dice «Archivar lo saca de la parrilla sin borrar su página ni sus
  episodios».

- ℹ️ **Los episodios de un programa no tienen campo inverso** en `programas`, y es
  a propósito: se piden con `?where[programa][equals]=<id>` sobre `/api/podcasts`,
  donde el servidor sí filtra borradores y despublicados. Aplica a `/programas/*`.

- **Duración por cápsula.**- **Duración por cápsula.** El artboard 14g pide "las once cápsulas con día y
  duración". `canciones.duracion` existe, pero `noticias` no tiene duración. ¿Es
  dato editorial o relleno?
- **`bandcamp` y `beatport` en `canciones`.** El lienzo los muestra en Bonus Beat;
  la colección tiene spotify/appleMusic/youtube/deezer. Son dos campos de texto,
  pero el criterio es no engordar el esquema con decoración.
- **`semestres`** para agrupar el histórico del Fenómeno Residente. Probablemente
  derivable de `inicio`/`fin` de `especiales` sin campo nuevo.
- 🔴 **`masLeido`** — el artboard 14c pinta "lo más leído" al costado de la nota. Eso
  necesita métricas de pageviews, que el CMS no tiene. **Es una decisión de
  arquitectura, no un campo**: ¿GA4, un contador propio, o se quita del diseño?

---

## 6. Lo que NO necesito

- Que se toque nada del front.
- Acceso de escritura: el front es cliente de **solo lectura**, salvo las escrituras
  de oyente (Comunidad) y el voto, que van por proxy.
- Que se coordine el momento: los tipos están fijados a un commit, así que un cambio
  en el CMS no rompe el front hasta que yo re-sincronice a propósito.

**Lo único que necesito saber es que algo aterrizó**, para correr `pnpm sync:types` y
re-fijar el lock.
