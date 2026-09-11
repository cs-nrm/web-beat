# Agentes del proyecto

Cada agente son DOS archivos y hacen cosas distintas:

- `.agents/agents/<nombre>.yaml` — la definición que Codex descubre. Es el
  encargo operativo: alcance, prioridades, supuestos y cómo se verifica.
- `agents/<nombre>.md` — el contexto detallado del dominio: el por qué de cada
  regla, los incidentes que las pagaron, y el reparto con los demás agentes.

⚠️ **Los dos se corrigen a la vez.** Una definición y su contexto que se
contradicen es exactamente el fallo que esta carpeta vino a cerrar.

Mapeo actual:

| Definición | Contexto | Alcance en una línea |
|---|---|---|
| `ads.yaml` | `agents/ads.md` | El inventario publicitario: huecos, medidas, GAM y venta directa |
| `analytics.yaml` | `agents/analytics.md` | La medición: contenedores y eventos del front |
| `content.yaml` | `agents/content.md` | La capa de datos del CMS Payload, las rutas y el contrato de URLs |
| `deploy.yaml` | `agents/deploy.md` | La VM, el despliegue al sitio al aire y los fallos que son 200 OK |
| `frontend.yaml` | `agents/frontend.md` | Design system, componentes, cromo y movimiento |
| `metadata.yaml` | `agents/metadata.md` | Títulos, canónicas, Open Graph, indexación y sitemaps |
| `streaming.yaml` | `agents/streaming.md` | El player de Triton, el «qué suena» y el árbitro de audio |

🔴 **Esto lo descubre Codex, no Claude Code.** Quien llegue con otro agente no
carga nada de aquí solo: la puerta de entrada es `CLAUDE.md`, en la raíz.

---

## 🔴 Los seis primeros están auditados contra el código de este repo

Las actas se escribieron para el **sitio viejo** (WordPress + SSG) y este repo es el
rewrite (Payload + Astro SSR). Reclamaban archivos que no existen, y eso es peor que
no tener documentación: hace perder una tarde y luego hace dudar del resto.

Se reescribieron por completo, y en cada una queda escrito qué decía la versión
vieja y qué la sustituyó:

- `ads` y `metadata` — 2026-09-07/08.
- `analytics`, `content`, `frontend` y `streaming` — 2026-09-08. ⚠️ Entre las
  cuatro citaban **más de cuarenta archivos inexistentes**: los 17 componentes y 28
  layouts del sitio viejo, `BaseHead.astro`, `Player.astro`, `src/lib/api.js`,
  `src/consts.ts` y `src/content/`, entre otros.
- `deploy` nace el 2026-09-09 ya contra este código, y se corrigió el **2026-09-10**
  después del corte de dominio: describía un agente de preproducción con destino
  `v2.beatdigital.mx` —un host que ya no existe— y exigía que el `noindex`
  ESTUVIERA. Hoy es al revés, y cada despliegue va directo al aire.

### Lo que hay que saber antes de leer cualquiera

- 🔴 **`src/js/` entero es LEGADO.** `ads.js`, `analytics.js`, `player.js` y
  `votes.js` existen, pero ningún archivo de `src/` los importa (comprobado con
  `grep`) y `scripts/guardas.mjs` los excluye de las guardas de CI a propósito. Sus
  ports vivos están en `src/scripts/`. **Editarlos no tiene ningún efecto sobre el
  sitio.** Ver `src/js/README.md`.
- 🔴 **Ya no se dice «v2».** Era el entorno de prueba que se convirtió en el sitio;
  se retiró del vocabulario el 10 sep 2026. Ahora es «el sitio» y lo anterior «el
  sitio viejo». ⚠️ El nombre sigue vivo donde no es texto —`/var/www/web-beat-v2`,
  el servicio de systemd, `scripts/desplegar-v2.sh`, `docs/despliegue-v2.md`— y ahí
  no se toca: es systemd y rutas del servidor, no un buscar-y-reemplazar.
- ⚠️ **Tres documentos de la raíz que eran del sitio viejo YA SE BORRARON:**
  `ROADMAP.md`, `dynamicAds.md` y `showheroes-videonota.md` (el de ShowHeroes
  mandaba copiar un `defineSlot` que apunta al ad unit de OTRA estación). Están en
  el historial de git, y lo que seguía pendiente de ellos está recogido en
  `agents/ads.md`. Si un acta todavía manda desconfiar de ellos, esa línea es de
  antes del borrado. **El `README.md` de la raíz sí se reescribió y está vigente.**
- ⚠️ **`src/layouts/Base.astro` lo comparten cuatro agentes** —metadata, ads,
  analytics y frontend—, y `src/middleware.ts` dos. Por eso cada acta tiene una
  sección de **«Lo que este agente NO hace»**: es lo que evita que se pisen.

### La regla al escribir un acta

**Toda ruta que se cite tiene que existir, y se comprueba con `ls`/`test -e` antes
de escribirla — no de memoria.** Es el fallo que esta auditoría vino a corregir.
