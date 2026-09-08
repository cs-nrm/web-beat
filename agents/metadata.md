# Metadata Agent — Beat 100.9

## Rol

Todo lo que el sitio le dice a una máquina sobre sí mismo: `<title>`, descripciones,
canónicas, Open Graph, Twitter Card, la política de indexación en sus tres capas, el
juego de iconos y los sitemaps.

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
| `src/config/site.ts` | `SITE_URL`, `HOST_CANONICO`, `NOINDEX_SITIO`, `noIndexarHost()`, `IDIOMA`, `IDIOMA_REGION`, `LOCALE_OG`, `urlAbsoluta()`, `SEGMENTOS_RESERVADOS` y el contrato de rutas |
| `src/middleware.ts` | **solo** el bloque final del `X-Robots-Tag`. La política de caché es de frontend |
| `src/pages/robots.txt.ts` | `robots.txt` por `Host` |
| `src/pages/sitemap.xml.ts`, `src/pages/news-sitemap.xml.ts` | las dos rutas que **proxean** los sitemaps del CMS |
| `src/lib/feeds.ts` | `SITEMAPS_ANUNCIADOS` y el proxy de feeds |
| `scripts/favicon.mjs` | genera el juego de iconos **y** `public/img/og-beat.png` desde `public/img/beat-blanco.svg` |
| `src/pages/**/*.astro` | el `titulo` y la `descripcion` que cada página le pasa a `Base` |

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
  ├─ article:published_time  (solo con tipo="article")
  └─ twitter:card · twitter:site
```

Reglas que hay que respetar:

- 🔴 **`og:image` va ABSOLUTA o no cuenta.** Facebook y X descartan una ruta relativa
  **sin decir nada**: la publicación sale sin imagen y desde el sitio no se nota. Se
  resuelve una sola vez en el layout, contra `SITE_URL`.
- 🔴 **Nunca SVG en `og:image`.** Ninguna de las dos plataformas lo acepta.
- **Solo la NOTA pasa ficha propia** (`imagen`, `tipo="article"`, `publicado`). Es lo
  único que se comparte de verdad; el resto cae al respaldo de marca.
- **La tarjeta de respaldo se GENERA**, no se sube: `pnpm favicon` la saca del mismo
  `beat-blanco.svg` del logo, a 1200×630. Así no puede quedarse en una marca
  anterior sin que nadie lo note — que es exactamente lo que había pasado con el
  favicon, que siguió meses con la abeja amarilla de 2025.
- **De `twitter:` solo se emite `twitter:card`** (y `twitter:site`). X lee el resto de
  Open Graph; duplicar `twitter:title` y compañía sería mantener dos veces lo mismo
  para que digan lo mismo.

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

## Lo que este agente NO hace

- **Datos estructurados (JSON-LD).** Hoy no hay ninguno. `NewsArticle` y
  `RadioStation` serían lo obvio para este sitio, pero es trabajo nuevo, no un
  arreglo pendiente.
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
```

⚠️ Una `og:image` relativa **pasa toda validación local** y falla solo en la
plataforma. Si se cambia algo del bloque de compartir, se comprueba que la URL salga
con `https://` y host.

Contexto operativo del despliegue y del corte: `docs/despliegue-v2.md`.
