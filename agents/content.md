# Content Agent — Beat 100.9

## Rol
Integración con WordPress headless via REST API, routing de páginas, colecciones de contenido Astro y SEO/meta tags.

---

## Archivos bajo responsabilidad

### Capa de datos
| Archivo | Propósito |
|---|---|
| `src/lib/api.js` | Cliente WordPress REST API |
| `src/lib/formatters.js` | Formateo de fechas y horas |
| `src/consts.ts` | Constantes globales (`SITE_TITLE`, `SITE_DESCRIPTION`) |
| `src/content/config.ts` | Schema Zod para colecciones Astro (blog) |
| `src/content/` | Colecciones de contenido local (MDX/Markdown) |

### Configuración de build
| Archivo | Sección relevante |
|---|---|
| `astro.config.mjs` | Integraciones: Sitemap, MDX, RSS; site URL |
| `src/pages/rss.xml.js` | Feed RSS |
| `src/pages/robots.txt.ts` | Reglas para crawlers |

### SEO y meta (en `BaseHead.astro`)
- Canonical URLs por página
- OpenGraph (og:title, og:description, og:image, og:url)
- Twitter Cards
- Article meta (published_time, modified_time, author)
- Robots meta (index, follow)
- Yoast SEO compatibility class

---

## API WordPress

```javascript
// src/lib/api.js
const BASE = 'https://beatdigital.com.mx/wp-json/wp/v2'

getArticles(cat)  // GET /posts?categories={cat}&per_page=70&_embed
```

- **Backend:** WordPress en GCP en `beatdigital.com.mx`
- **Frontend:** Astro SSG en `beatdigital.mx`
- `_embed` incluye featured media y author en una sola request
- Errores devuelven mensajes descriptivos (no throws silenciosos)

---

## Colecciones de contenido (`src/content/`)

Schema Zod del blog:
```typescript
{
  title: z.string(),
  description: z.string(),
  pubDate: z.coerce.date(),
  updatedDate: z.coerce.date().optional(),
  heroImage: z.string().optional(),
}
```

---

## Estructura de páginas (53 rutas)

### Páginas estáticas
| Ruta | Archivo |
|---|---|
| `/` | `index.astro` |
| `/en-vivo/` | `en-vivo.astro` |
| `/programacion/` | `programacion.astro` |
| `/lanzamientos/` | `lanzamientos.astro` |
| `/playlist/` | `playlist.astro` |
| `/live/` | `live.astro` |
| `/beat-ten/` | `beat-ten.astro` |
| `/mejores-tracks-2025/` | `mejores-tracks-2025.astro` |
| `/que-plan/` | `que-plan.astro` |
| `/alexa/` | `alexa.astro` |
| `/pruebas/` | `pruebas.astro` (testing) |
| `/avisodeprivacidad/` | `avisodeprivacidad.astro` |
| `/terminosycondiciones/` | `terminosycondiciones.astro` |

### Secciones dinámicas (WP API)
Cada sección tiene tres archivos: `index.astro`, `[slug].astro`, `[...page].astro`

| Sección | Ruta | Categoría WP |
|---|---|---|
| Beatzilla | `/beatzilla/` | tech/gaming |
| News | `/news/` | noticias generales |
| Purple Noise | `/purple-noise/` | DJs femeninas |
| Rebels | `/rebels/` | show Rebels |
| Corona Capital | `/corona-capital/` | festival |
| EDC | `/edc/` | festival |
| Tomorrowland | `/tomorrowland/` | festival |
| Ultra Music | `/ultra-music/` | festival |
| Locutores | `/locutores/` | perfiles |
| Promociones | `/promociones/` | promos |
| Podcast | `/podcast/` | podcasts (con sub-rutas) |
| Beat Recordings | `/_beat-recordings/` | sello discográfico |
| Beat Trends | `/_beat-trends/` | tendencias |
| Entrevistas | `/_entrevistas/` | entrevistas |
| Eventos | `/_eventos/` | eventos |
| Nerdosis | `/_nerdosis/` | cultura nerd |

> Secciones con prefijo `_` en el directorio no generan rutas públicas con ese prefijo — son rutas normales, el `_` es solo convención interna.

### Feeds y utilidades
| Ruta | Archivo |
|---|---|
| `/rss.xml` | `src/pages/rss.xml.js` |
| `/robots.txt` | `src/pages/robots.txt.ts` |
| `/sitemap-index.xml` | Generado automáticamente por `@astrojs/sitemap` |

---

## Formatters (`src/lib/formatters.js`)

| Función | Input acepta | Output |
|---|---|---|
| `formatFecha(date)` | ISO, slash-separated, digits, texto | `"27 mar 2026"` |
| `formatHora(date)` | mismos formatos | `"14:30"` |
| `parseToDate(date)` | mismos formatos | `Date` object |

Los formatters manejan los 4 formatos que devuelve la API de WordPress según el tipo de contenido.

---

## SEO

**Constantes base** (`src/consts.ts`):
```typescript
SITE_TITLE = "Beat 100.9 FM"
SITE_DESCRIPTION = "Total Music"
```

**Por página** (props en `BaseHead.astro`):
- `title` — aparece en `<title>` y `og:title`
- `description` — meta description y `og:description`
- `image` — `og:image` (default: `/img/beat-share.jpg`)
- `canonicalURL` — URL canónica explícita

**Integración Yoast:** los campos de Yoast en WP se exponen via REST API y se mapean a las meta tags del `<head>`.

---

## Paginación

Las rutas `[...page].astro` usan el helper de Astro `paginate()`:
- 10 artículos por página (configuración estándar)
- URLs: `/beatzilla/`, `/beatzilla/2/`, `/beatzilla/3/`, etc.
- Prev/next links en `<head>` para SEO

---

## Troubleshooting frecuente

| Síntoma | Causa probable | Solución |
|---|---|---|
| Artículos no cargan en build | WP API inaccesible en build time | Verificar que `beatdigital.com.mx` esté up |
| Fechas con formato incorrecto | Formato inesperado de WP | Agregar caso en `formatters.js` |
| Página 404 en slug dinámico | Slug no devuelto por `getStaticPaths()` | Verificar que el post esté publicado en WP |
| Sitemap incompleto | Ruta no incluida en `astro.config.mjs` | Revisar config de `@astrojs/sitemap` |
| RSS sin artículos | Error silencioso en fetch | Revisar consola de build para errores de API |

---

## Contexto de negocio

El WordPress en `beatdigital.com.mx` es el CMS operado por el equipo editorial de NRM. El frontend en Astro (`beatdigital.mx`) es un cliente de solo lectura — no escribe al WP. Cambios de categorías o taxonomías en WP pueden romper el fetch si `api.js` usa IDs de categoría hardcodeados.
