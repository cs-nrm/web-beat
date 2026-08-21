# Lo que el front de Beat necesita de `cms-estaciones`

> Documento de traspaso, para trabajarse en la sesión de `cms-estaciones`.
> Escrito desde `web-beat` (rama `beat`) el **2026-08-21**.
> Tipos del front fijados en `cms-estaciones@abfd52a0` — cuando algo de aquí
> aterrice, del lado del front basta `pnpm sync:types` y re-fijar el lock.

Convención: ✅ verificado contra el CMS o la API · ⚠️ inferido, confirmar ·
🔴 bloquea algo concreto.

---

## 1. 🔴 Colecciones que no existen y el sitio necesita

Tres de las nueve secciones del mapa de sitio **no tienen dónde guardarse**, así que
el equipo editorial no puede capturarlas aunque quiera. Esto está en el camino
crítico del CONTENIDO, no del código.

### `eventos` — Agenda (§5 del mapa)
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

### `bonus-beat` — §4
El mapa pide "archivo cronológico de las 3 canciones semanales **con su viñeta**".
Se intentó encajar en `especiales` (que ya tiene `playlist`, `numero`,
`inicio`/`fin`) y **no cabe**: `especiales.playlist` es un array de relaciones
plano, sin texto por ítem. Es una colección ligera:

`semana` (date), `slug` (derivable de la fecha), `estacion`, y un array de 3 ×
`{ cancion → canciones, viñeta (textarea) }`.

Los enlaces a plataformas salen gratis de `canciones.{spotify,appleMusic,youtube,deezer}`.

### `paginas` — §8 y legales
Para «Beat para marcas» (§8: audiencia y perfil del oyente, espacios patrocinables,
casos de éxito, contacto comercial) más el aviso de privacidad y los términos.
`titulo`, `slug`, `contenido` (Lexical), SEO. El front ya reserva `/marcas`,
`/aviso-de-privacidad` y `/terminos-y-condiciones`.

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

### A4 — `getNewsURL` consciente de la estación
✅ Verificado en `src/seo/site.ts`: arma `${SITE_URL}/noticias/<slug>` con `SITE_URL`
saliendo de **un solo** `NEXT_PUBLIC_SITE_URL` para las 4 estaciones. O sea que **el
sitemap de Beat saldría con el dominio del CMS**.

El dato ya existe y no se usa: **`estaciones.dominio`** es obligatorio e indexado,
creado literalmente "para que los fronts resuelvan host → estación". Hay que
enhebrar la estación en `getNewsURL`/`getPodcastURL`, y que
`NEWS_PUBLICATION_NAME` salga de `estaciones.nombrePublicacion` en vez del env único.

ℹ️ El PATH (`/noticias/<slug>`) ya es el correcto: el front adoptó el mismo contrato
(una ruta por colección). Solo falta el host.

### A5 — Feeds por estación
`sitemap.xml`, `news-sitemap.xml`, `rss.xml` y `podcasts/rss.xml` usan
`overrideAccess: true` y filtran solo por `estado` → hoy emitirían **las 4 estaciones
en un mismo feed**. Resolver por host (para eso está `dominio` indexado) o rutear.

⚠️ Y que el sitemap sea un **índice con hijos paginados**, no un `<urlset>` plano:
en Enfoque el plano con tope de 1,000 dejó ~102,000 notas sin vía de descubrimiento.

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

- **Duración por cápsula.** El artboard 14g pide "las once cápsulas con día y
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
