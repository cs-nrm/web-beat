# CLAUDE.md — puerta de entrada

Front público de **Beat 100.9**: Astro SSR sobre `cms-estaciones`, el Payload
multi-estación de NRM. Sirve `beatdigital.mx` y es el modelo del que salen los de
OYE, Sabrosita y Stereo Cien: nada de la estación está escrito a mano, todo se
resuelve por `ESTACION_CODIGO`.

🔴 **El sitio está AL AIRE desde el 10 sep 2026.** La rama viva es `beat`, no
`main`. Lo que se empuja a `beat` es código de producción.

`main` es el sitio viejo (WordPress/SSG): ya no atiende `beatdigital.mx` —lo hace
el vhost `020-beatdigital.conf`— pero sigue montado en el servidor, y eso es justo
lo que hace que la vuelta atrás sea de dos comandos. No se toca.

---

## 🔴 Antes de escribir una línea: el contexto ya está escrito

Este repo lleva ~130 KB de contexto de dominio en `agents/*.md`, y **nada de eso
se carga solo**: fue escrito para que lo descubra Codex por `.agents/`. Si vas a
tocar un área, **lee su acta primero**. Casi todas las reglas que contienen las
pagó un fallo real, y ahí está escrito cuál.

| Área | Acta | Alcance |
|---|---|---|
| ads | [agents/ads.md](agents/ads.md) | Huecos publicitarios, medidas, GAM y venta directa |
| analytics | [agents/analytics.md](agents/analytics.md) | Contenedores de medición y eventos del front |
| content | [agents/content.md](agents/content.md) | Colecciones de Payload, rutas y contrato de URLs |
| deploy | [agents/deploy.md](agents/deploy.md) | La VM, el despliegue y los fallos silenciosos |
| frontend | [agents/frontend.md](agents/frontend.md) | Design system, componentes, cromo y movimiento |
| metadata | [agents/metadata.md](agents/metadata.md) | Títulos, canónicas, Open Graph, indexación y sitemaps |
| streaming | [agents/streaming.md](agents/streaming.md) | Player de Triton, «qué suena» y árbitro de audio |

Cada acta tiene un gemelo en `.agents/agents/<nombre>.yaml`: el encargo operativo
que descubre Codex. **Si corriges una, corrige la otra** — se contradicen en
cuanto alguien toca solo una.

⚠️ **`src/layouts/Base.astro` lo comparten cuatro agentes** —metadata, ads,
analytics y frontend— y `src/middleware.ts` dos. Por eso cada acta tiene su
sección «Lo que este agente NO hace»: es lo que evita que se pisen.

Y hay dos documentos transversales que se citan desde el código:

- [movimiento.md](movimiento.md) — el contrato de movimiento y de color. Vigente.
- [docs/lo-que-el-front-necesita-del-cms.md](docs/lo-que-el-front-necesita-del-cms.md) — el traspaso con el CMS.

---

## Arrancar y las puertas

```bash
pnpm install
pnpm dev          # http://localhost:4321
```

🔴 **`CMS_URL` hace o rompe el arranque.** Va SIN prefijo `PUBLIC_`, así que se lee
en EJECUCIÓN. Si falta, el sitio responde **200 con la casa vacía**: cabecera, pie
y menú perfectos, y ni una noticia. Sin error en pantalla y sin error en ningún
log. `pnpm dev` carga `.env`; `pnpm preview` y el servicio **no**.

| Comando | Qué hace |
|---|---|
| `pnpm build` | **La puerta.** `astro check` + guardas + build + guarda de cascada |
| `pnpm check` | `astro check` + guardas. ⚠️ NO basta como puerta |
| `pnpm sync:types` | Trae los tipos de Payload a `src/types/payload.ts` |
| `pnpm fuentes` | Regenera las fuentes auto-hospedadas de `public/fuentes/` |
| `pnpm favicon` | Regenera iconos y tarjetas de compartir |

⚠️ **`pnpm check` da 0 errores en cosas que el compilador del build sí rechaza**
(un comentario de llaves dentro de la lista de atributos de una etiqueta Astro).
La puerta es `pnpm build`, y es la misma que corre CI y la que corre la VM: si
falla allá, el despliegue se aborta a medias.

Las guardas de [scripts/guardas.mjs](scripts/guardas.mjs) y
[scripts/guarda-cascada.mjs](scripts/guarda-cascada.mjs) tienen **cero falsos
positivos** como regla, y salida explícita `guarda-ok <regla>: <razón>` que obliga
a escribir el porqué en el archivo.

---

## Las trampas que cuestan una tarde

Ninguna es teórica: las ocho ya pasaron.

1. 🔴 **Los worktrees de la app de escritorio nacen sobre `main` (el sitio
   viejo)**, no sobre `beat` — otro árbol de archivos por completo. Los archivos
   del encargo «no existen» y parece que las rutas estén mal. Antes de tocar nada:
   `git merge-base --is-ancestor HEAD beat`; si no, `git reset --hard beat` sobre
   la misma rama `claude/*` (conserva el nombre que la app sigue para el PR).
   Tampoco traen `node_modules`.

2. 🔴 **Todo efecto se prueba en el flujo Home → nota → atrás**, no solo
   recargando. Ahí se han roto cuatro cosas distintas y ninguna se veía en carga
   limpia: el DOM sobrevive a la navegación de Astro y el JavaScript no se
   recarga.

3. ⚠️ **El panel del navegador miente con las animaciones.** Reporta
   `visibilityState: hidden` siempre, así que transiciones, `rAF`,
   `IntersectionObserver` y los eventos de scroll están congelados: un elemento
   bien animado y uno atascado se leen IGUAL. Y las capturas devuelven un lienzo
   plano del color de fondo (`#050706`). Fiable: la GEOMETRÍA
   (`getBoundingClientRect`, `getComputedStyle`) y el estado del DOM (atributos,
   clases). Para animación, mirar atributos; nunca pedir una imagen.

4. ⚠️ **La cascada CSS se prueba sobre un build SERVIDO, no sobre `astro dev`**:
   `beat.css` entra en `layer(proyecto)` y los dos discrepan. Hay una entrada
   `web-beat-build` en [.claude/launch.json](.claude/launch.json) que levanta el
   build en el 4322 cargando `.env`.

5. ⚠️ **`src/js/` es LEGADO.** `ads.js`, `analytics.js`, `player.js` y `votes.js`
   existen, pero ningún archivo de `src/` los importa y las guardas los excluyen a
   propósito. Sus ports vivos están en `src/scripts/`. **Editarlos no tiene ningún
   efecto sobre el sitio.** Ver [src/js/README.md](src/js/README.md).

6. ⚠️ **Los diseños nuevos no están en `design/`.** Los artboards llegan hasta v14
   y ahí se quedan; los lienzos posteriores llegan **como captura en el chat**, y
   esa captura ES la especificación. Buscarlos en el repo es tiempo perdido. Lo
   que sí sigue vigente es `design/Nuevo sitio de beat full/Sitio Beat 2026
   publicidad.dc.html` y `movimiento.md`.

7. ⚠️ **Una zona sin contenido se deja vacía y sin rótulo.** Nada de «pronto habrá
   más X»: el rótulo que la encabezaba también se va (colapsa el bloque con `&&` y
   borra el CSS huérfano). La única excepción es el aviso que delata una AVERÍA
   —una categoría que el front pide y el CMS no tiene—, porque sin él una sección
   rota se ve idéntica a una vacía.

8. ⚠️ **Un atributo sin valor vale la cadena vacía**, y `!!''` es `false`. Para
   `data-compacta` a secas, `hasAttribute`. Así se quedó plegado el menú al volver
   al Inicio.

---

## Despliegue

🔴 **Ya no hay preproducción.** `v2.beatdigital.mx` lo parecía, pero era el mismo
proceso con otro nombre, y se apagó el 10 sep. Un push a `beat` con el deploy
encendido va **directo al aire**, y cada despliegue reinicia el servicio: unos
segundos de 502 para quien esté navegando. Un entorno de pruebas de verdad
—proceso, puerto y build propios— está por hacer.

| | |
|---|---|
| VM | `beat-astro`, ruta `/var/www/web-beat-v2` |
| Servicio | **systemd** `web-beat-v2`. ⚠️ No es pm2 |
| Delante | Apache como proxy inverso, `020-beatdigital.conf` |
| Despliegue | [scripts/desplegar-v2.sh](scripts/desplegar-v2.sh), se ejecuta EN la VM |
| CI | [.github/workflows/ci.yml](.github/workflows/ci.yml) en PRs · [deploy.yml](.github/workflows/deploy.yml) en pushes a `beat`, **apagado** tras `DEPLOY_HABILITADO` |

Lo demás —los tres fallos silenciosos, la vuelta atrás, por qué pnpm va fijado en
corepack— está en [agents/deploy.md](agents/deploy.md). El registro del corte y lo
que quedó abierto, en [deploy/LANZAMIENTO.md](deploy/LANZAMIENTO.md) y
[deploy/PENDIENTES.md](deploy/PENDIENTES.md).

---

## Vocabulario

🔴 **No se dice «v2».** Era el entorno de prueba que se convirtió en el sitio; se
retiró del vocabulario el 10 sep 2026. Ahora es **«el sitio»** y lo anterior es
**«el sitio viejo»**.

⚠️ Pero el nombre sigue vivo donde no es texto y **no se toca a la ligera**:
`/var/www/web-beat-v2`, el servicio de systemd `web-beat-v2`,
`scripts/desplegar-v2.sh`, `docs/despliegue-v2.md`. Renombrarlos es tocar systemd
y rutas del servidor, no un buscar-y-reemplazar.

---

## Cómo se escribe aquí

- **Todo va en español** (código, comentarios, commits, documentos). Los nombres
  de archivo y de función también.
- **El porqué va en el código.** Comentarios con 🔴 para lo que no se debe romper
  y ⚠️ para las trampas medidas. **Léelos antes de cambiar la línea que
  comentan**; casi todos existen porque algo ya falló ahí.
- **Toda ruta que se cite en un documento tiene que existir**, y se comprueba con
  `ls`/`test -e` antes de escribirla, no de memoria. Las actas se reescribieron
  enteras el 7-9 sep 2026 justo por esto: entre las seis viejas citaban más de
  cuarenta archivos inexistentes, que es peor que no tener documentación.
- **El mensaje del commit lleva el diagnóstico**: qué se midió, contra qué, y qué
  se descartó por el camino. Ver `git log` para el tono.
- ⚠️ `[skip deploy]` en el asunto del commit salta la puerta y el despliegue. No
  lo escribas literal en un commit que sí quieras desplegar.
