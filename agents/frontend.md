# Frontend Agent — Beat 100.9

## Rol
Sistema de diseño, componentes UI, layouts (Cards y Sliders), estilos con Tailwind CSS y navegación con View Transitions.

---

## Archivos bajo responsabilidad

### Componentes UI (`src/components/`)
| Archivo | Propósito |
|---|---|
| `Header.astro` | Navegación principal |
| `Footer.astro` | Pie de página |
| `PreSiteHeader.astro` | Barra superior pre-header |
| `MenuRadio.astro` | Menú de radio |
| `MenuLineal.astro` | Menú lineal |
| `MenuLogo.astro` | Menú con logo |
| `BarNrm.astro` | Barra de red NRM (5 propiedades) |
| `Modal.astro` | Diálogo modal |
| `Notificacion.astro` | Widget de notificaciones |
| `DiaRadio.astro` | Vista de día en programación |
| `Separator.astro` | Separador visual entre secciones |
| `Article.astro` | Tarjeta de artículo |
| `relatedPost.astro` | Widget de posts relacionados |
| `Share.astro` | Botones de compartir en redes |
| `FormattedDate.astro` | Componente de fecha formateada |
| `HeaderLink.astro` | Link de navegación con estado activo |
| `BaseHead.astro` | `<head>` global: fuentes, favicons, meta base |

### Layouts (`src/layouts/`)

**Cards (grids de contenido):**
| Archivo | Sección |
|---|---|
| `CardsHomeNews.astro` | Noticias generales |
| `CardsHomeTecnologia.astro` | Beatzilla / Tech |
| `CardsHomeUltra.astro` | Ultra Music |
| `CardsHomeNerdosis.astro` | Nerdosis |
| `CardsHomeCorona.astro` | Corona Capital |
| `CardsHomeTomorrow.astro` | Tomorrowland |
| `CardsHomeEdc.astro` | EDC |
| `Cardsbz.astro` | Beatzilla (variante) |
| `CardsRebels.astro` | Rebels |
| `CardsPodcast.astro` | Podcasts |
| `CardsRecordings.astro` | Beat Recordings |
| `CardsVideo.astro` | Videos |
| `CardsVideoTopTen.astro` | Top 10 videos |
| `CardsTracks2025.astro` | Mejores tracks 2025 |
| `CardMoreNews.astro` | Más noticias |
| `Cardsq.astro` | Genérico / misceláneos |
| `_CardsHomeTrends.astro` | Experimental (prefijo `_`) |

**Sliders (carouseles Flickity):**
| Archivo | Sección |
|---|---|
| `SliderPortada.astro` | Hero / portada home |
| `SliderPodcast.astro` | Podcast carousel |
| `SliderPromociones.astro` | Promociones |
| `SliderDestacadosPlan.astro` | Destacados de ¿Qué Plan? |
| `SliderConciertosPlan.astro` | Conciertos de ¿Qué Plan? |
| `SliderLocutores.astro` | Locutores |
| `SliderBuenfin.astro` | Buen Fin (seasonal) |

**Layouts principales:**
| Archivo | Propósito |
|---|---|
| `Layout.astro` | Template base de todas las páginas |
| `BlogPost.astro` | Layout de artículo individual |
| `HomeHeader.astro` | Header específico del home |
| `Cards.astro` | Grid genérico reutilizable |

### Estilos y assets
| Ruta | Contenido |
|---|---|
| `src/styles/` | CSS global y utilidades |
| `tailwind.config.js` | Configuración de Tailwind (content: `src/**`) |
| `public/fonts/` | Anton, BebasNeue, FjallaOne, FiraSans, Roboto, Poppins, Audiowide, Gendy, Atkinson |
| `public/favicon/` | Favicon set completo (iOS, Android, Windows, SVG) |
| `public/img/` | Logos, backgrounds, social share image |

---

## Stack de estilos

- **Framework:** Tailwind CSS 3.4.1
- **Fuente display:** Anton / AntonSC (headings), BebasNeue, FjallaOne
- **Fuente cuerpo:** FiraSans (Light/Regular/Bold), Roboto, Poppins
- **Fuente especial:** Audiowide (branding Beat), Gendy, Atkinson
- **Carousel:** Flickity (cargado desde CDN NRM)

---

## Patrones de componentes

### Convención de archivos experimentales
Archivos con prefijo `_` (ej. `_CardsHomeTrends.astro`) son variantes en desarrollo, no usadas en producción todavía.

### Seasonal / one-off
- `Navidad.astro` — comentado en código, no activo
- `SliderBuenfin.astro` — activo solo en temporada Buen Fin

### Cards vs Sliders
- **Cards:** grids estáticos CSS, no requieren JS
- **Sliders:** instancias Flickity, requieren que la librería esté cargada en el layout padre

---

## View Transitions

Astro View Transitions está habilitado globalmente. Consideraciones de UI:

- Elementos con `transition:persist` sobreviven a la navegación (Player, radio button, controles de volumen)
- Animaciones de entrada/salida definidas en `Layout.astro`
- No agregar event listeners en `onMount` sin limpiarlos en `astro:before-preparation`

---

## Sistema de favicons (`public/favicon/`)

```
apple-touch-icon.png       → iOS home screen
favicon.ico                → fallback universal
favicon-16x16.png          → navegadores legacy
favicon-32x32.png          → navegadores modernos
android-chrome-192x192.png → Android / PWA
android-chrome-256x256.png → Android hi-res
android-chrome-512x512.png → Android splash
mstile-150x150.png         → Windows tiles
safari-pinned-tab.svg      → Safari pinned tab
site.webmanifest           → PWA manifest
browserconfig.xml          → IE/Edge legacy
```

---

## Responsive design

Tailwind breakpoints en uso:
- `md:` → 768px+ (desktop layout)
- `lg:` → 1024px+ (wide desktop)

El player y los ads tienen lógica propia de responsividad (ver `agents/streaming.md` y `agents/ads.md`).

---

## Troubleshooting frecuente

| Síntoma | Causa probable | Solución |
|---|---|---|
| Slider no funciona | Flickity no cargado antes del componente | Verificar orden de scripts en `Layout.astro` |
| Fuente no carga | Ruta incorrecta en `@font-face` | Verificar paths en `src/styles/` vs `public/fonts/` |
| Layout roto en mobile | Clase Tailwind faltante en breakpoint `md:` | Revisar clases responsive en el componente |
| Componente experimental en producción | Archivo `_` importado por error | Verificar que solo archivos sin `_` estén en imports activos |
| Transición visual rota | Elemento sin `transition:name` único | Agregar nombre único en elementos persistentes |
