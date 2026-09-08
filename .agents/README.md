# Agentes del proyecto

Cada agente son DOS archivos y hacen cosas distintas:

- `.agents/agents/<nombre>.yaml` — la definición que Codex descubre. Es el
  encargo operativo: alcance, prioridades, supuestos y cómo se verifica.
- `agents/<nombre>.md` — el contexto detallado del dominio: el por qué de cada
  regla, los incidentes que las pagaron, y el reparto con los demás agentes.

Mapeo actual:

| Definición | Contexto | Alcance en una línea |
|---|---|---|
| `ads.yaml` | `agents/ads.md` | El inventario publicitario: huecos, medidas, GAM y venta directa |
| `analytics.yaml` | `agents/analytics.md` | La medición: contenedores y eventos del front |
| `content.yaml` | `agents/content.md` | La capa de datos del CMS Payload, las rutas y el contrato de URLs |
| `frontend.yaml` | `agents/frontend.md` | Design system, componentes, cromo y movimiento |
| `metadata.yaml` | `agents/metadata.md` | Títulos, canónicas, Open Graph, indexación y sitemaps |
| `streaming.yaml` | `agents/streaming.md` | El player de Triton, el «qué suena» y el árbitro de audio |

---

## 🔴 Los seis están auditados contra el código de v2

Las actas se escribieron para el sitio **v1** (WordPress + SSG) y este repo es el
**v2** (Payload + Astro SSR). Reclamaban archivos que no existen, y eso es peor que
no tener documentación: hace perder una tarde y luego hace dudar del resto.

Se reescribieron por completo, y en cada una queda escrito qué decía la versión
vieja y qué la sustituyó:

- `ads` y `metadata` — 2026-09-07/08.
- `analytics`, `content`, `frontend` y `streaming` — 2026-09-08. ⚠️ Entre las
  cuatro citaban **más de cuarenta archivos inexistentes**: los 17 componentes y 28
  layouts del v1, `BaseHead.astro`, `Player.astro`, `src/lib/api.js`,
  `src/consts.ts` y `src/content/`, entre otros.

### Lo que hay que saber antes de leer cualquiera

- 🔴 **`src/js/` entero es LEGADO.** `ads.js`, `analytics.js`, `player.js` y
  `votes.js` existen, pero ningún archivo de `src/` los importa (comprobado con
  `grep`) y `scripts/guardas.mjs` los excluye de las guardas de CI a propósito. Sus
  ports vivos están en `src/scripts/`. **Editarlos no tiene ningún efecto sobre el
  sitio.** Ver `src/js/README.md`.
- 🔴 **Hay cuatro documentos de la RAÍZ que son del v1 y no se siguen:**
  `ROADMAP.md`, `dynamicAds.md`, `showheroes-videonota.md` y `README.md`. El de
  ShowHeroes además manda copiar un `defineSlot` que apunta al ad unit de OTRA
  estación. Están detallados en `agents/ads.md` y en el encargo de cada acta.
- ⚠️ **`Base.astro` lo comparten cuatro agentes** —metadata, ads, analytics y
  frontend—, y `middleware.ts` dos. Por eso cada acta tiene una sección de **«Lo que
  este agente NO hace»**: es lo que evita que se pisen.

### La regla al escribir un acta

**Toda ruta que se cite tiene que existir, y se comprueba con `ls`/`test -e` antes
de escribirla — no de memoria.** Es el fallo que esta auditoría vino a corregir.
