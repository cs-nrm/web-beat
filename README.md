# web-beat — front público de Beat 100.9

Astro SSR sobre `cms-estaciones`, el Payload multi-estación de NRM. Este repo sirve
`beatdigital.mx` y es el modelo del que salen los de OYE, Sabrosita y Stereo Cien:
nada de la estación está escrito a mano, todo se resuelve por `ESTACION_CODIGO`.

> ⚠️ El README anterior era el del starter «Astro Starter Kit: Blog», sin tocar:
> documentaba `src/content/`, `getCollection()`, MDX, RSS y sitemap — cuatro cosas
> que este proyecto no usa. Si algo de lo que sigue no coincide con el código, gana
> el código y esto es un bug.

## Arrancar

```bash
pnpm install
pnpm dev
```

🔴 **`CMS_URL` es la variable que hace o rompe el arranque.** Va SIN prefijo
`PUBLIC_`, así que se lee en EJECUCIÓN y Vite no la hornea en el bundle. Si falta,
el sitio responde **200 con cero contenido**: cabecera, pie y menú perfectos, y ni
una noticia. No hay error en pantalla y el monitoreo ve un 200 — es el peor modo de
falla que existe, y ya costó un despliegue en `web-enfoque`.

`pnpm dev` sí carga `.env`. `pnpm preview` y el contenedor **no**:

```bash
CMS_URL=https://admin.nrm.com.mx pnpm preview
```

## Los comandos que importan

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo |
| `pnpm check` | `astro check` + las guardas del repo |
| `pnpm build` | `check` + guardas + build + guarda de cascada |
| `pnpm favicon` | Regenera el juego de iconos **y** las tarjetas de compartir desde `public/img/beat-blanco.svg` |
| `pnpm fuentes` | Regenera las fuentes auto-hospedadas en `public/fuentes/` |
| `pnpm sync:types` | Trae los tipos de Payload a `src/types/payload.ts` |

⚠️ **`pnpm check` NO basta como puerta.** Da 0 errores en cosas que el compilador
del build sí rechaza — por ejemplo un comentario de llaves dentro de la lista de
atributos de una etiqueta de Astro. Antes de dar algo por bueno, `pnpm build`.

## Cómo está armado

```
src/
  pages/        23 rutas SSR. Una ruta por COLECCIÓN, no por sección
  components/   piezas de UI; `Anuncio.astro` es el único hueco publicitario
  layouts/      Base.astro — el <head>, el chrome y las reglas de indexación
  lib/cms/      10 módulos, uno por colección de Payload. SOLO server-side
  lib/          nota.ts (presentación), jsonld.ts, video.ts, feeds.ts
  scripts/      el runtime de cliente, uno por comportamiento
  styles/       base.css declara el @layer del que cuelga todo lo demás
  config/       site.ts (URLs e indexación) y navegacion.ts (menú, pie, secciones)
```

⚠️ **`src/js/` NO es código vivo.** Son los archivos del v1 que quedan como
material de port —el núcleo de Triton de `player.js` sigue siendo la referencia— y
ningún archivo de `src/` los importa. Ver `src/js/README.md`.

## Antes de tocar algo

Este repo lleva el porqué escrito en el propio código: comentarios con 🔴 para lo
que no se debe romper y ⚠️ para las trampas medidas. **Léelos antes de cambiar la
línea que comentan** — casi todos existen porque algo ya falló ahí.

Y hay siete agentes con su alcance delimitado, en `agents/*.md`:

| Agente | Qué le toca |
|---|---|
| `ads` | El inventario publicitario: huecos, medidas, GAM y venta directa |
| `analytics` | La medición. 🔴 Hoy hay emisor y NO hay receptor: leer su acta |
| `content` | Las colecciones del CMS y cómo se leen |
| `deploy` | La VM, el despliegue y los tres fallos que son 200 OK |
| `frontend` | Maquetado, design system y la política de caché |
| `metadata` | Títulos, canónicas, Open Graph, indexación y sitemaps |
| `streaming` | El player, la señal de Triton y los cue points |

`CLAUDE.md` es la puerta de entrada para quien llegue con un agente: el mapa de
las actas, las puertas y las trampas que cuestan una tarde.

## Documentos que sí valen

| Archivo | Qué es |
|---|---|
| `CLAUDE.md` | La puerta de entrada: actas, puertas, trampas y vocabulario |
| `movimiento.md` | El contrato de movimiento y de color. Vigente, y se cita desde el código |
| `deploy/LANZAMIENTO.md` | El corte del 10 sep 2026, paso a paso, y la vuelta atrás |
| `deploy/PENDIENTES.md` | Lo que quedó abierto tras el corte, con el respaldo de cada punto |
| `docs/despliegue-v2.md` | Cómo está montado el servicio y cómo se actualiza. ⚠️ Escrito antes del corte |
| `docs/lo-que-el-front-necesita-del-cms.md` | Traspaso con el CMS |
| `src/js/README.md` | Qué falta portar del v1 y las reglas que el port debe respetar |

⚠️ Se borraron tres documentos del v1 que describían un código que ya no existe y
que ya habían provocado errores reales: `ROADMAP.md`, `dynamicAds.md` y
`showheroes-videonota.md`. Lo que seguía pendiente de ellos —la implementación de
ShowHeroes— está recogido en `agents/ads.md`. Están en el historial de git.
