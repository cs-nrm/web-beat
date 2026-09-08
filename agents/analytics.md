# Analytics Agent — Beat 100.9

## Rol

La medición del sitio: quién carga los contenedores de analítica y qué eventos
emite el front. En v1 eran cinco scripts en el `<head>` y dos funciones colgadas de
`window`; en v2 es **una mitad y falta la otra**.

🔴 **Este documento se reescribió por completo el 2026-09-08.** El anterior
describía el v1 y mandaba a editar dos archivos:

- `src/components/BaseHead.astro` — **no existe en este repo.** El `<head>` es
  `src/layouts/Base.astro`.
- `src/components/head/AnalyticsScripts.astro` — **tampoco existe**, y nunca
  existió: era una casilla del `ROADMAP.md` del v1, que este documento citaba como
  si fuera un plan vivo. ⚠️ Ese roadmap es del sitio viejo entero; no se sigue.

Y describía cinco sistemas activos —GTM, GA4, comScore, Hotjar, Metricool— con sus
ids, sus snippets y su orden de carga. **Ninguno de los cinco se carga en v2.** Ver
abajo, porque es el hallazgo que define el trabajo de este agente.

---

## 🔴 El estado real: hay emisor y no hay receptor

Comprobado el 2026-09-08 con un barrido sobre `src/`, `public/` y `scripts/`: en
todo el repo **no hay un solo snippet de GTM, comScore, Hotjar ni Metricool.** El
único consumidor de una variable de analítica es el SDK de Triton, en
`src/scripts/player.ts`, que le pasa `PUBLIC_GA_ID` a su propio `trackingId` — y esa
variable va **vacía** en `.env.example`.

La consecuencia hay que decirla completa, porque desde el navegador no se ve:

```
player.ts / anuncios.ts / pista.ts
  └─ ga4(evento, params)            en src/scripts/analitica.ts
      ├─ ¿window.gtag?    → no existe: nadie lo define
      ├─ ¿window.dataLayer? → no existe: lo crearía GTM, y GTM no se carga
      └─ el try/catch se lo traga en silencio
```

O sea que **hoy los eventos del player, de los anuncios y de las pistas no llegan a
ninguna parte.** No es un fallo de `analitica.ts` —está bien escrito y su doble
envío es correcto— es que falta la capa que crea `dataLayer`. Y falla del modo más
caro de diagnosticar: sin error en consola, sin nada raro en pantalla, y con un
módulo de analítica que parece estar funcionando.

⚠️ **Esto no se «arregla» poniendo los ids en el `.env`.** Las cinco variables
existen y están declaradas (`.env.example` y `src/env.d.ts`), pero nadie las lee: el
trabajo pendiente es escribir el cargador. Con los ids puestos y sin cargador, el
resultado es idéntico al de hoy.

---

## Archivos bajo responsabilidad

| Archivo | Qué le toca |
|---|---|
| `src/scripts/analitica.ts` | El emisor: `ga4()` y `eventoTriton()`, con el doble envío `gtag` → `dataLayer` |
| `src/layouts/Base.astro` | El `<head>`, que es **donde va el cargador que falta**. Hoy solo lleva `gpt.js` (de ads) |
| `.env.example` y `src/env.d.ts` | Las cinco `PUBLIC_*` de medición y la regla de que sin valor no se carga |
| `src/scripts/player.ts` | Solo las llamadas a `eventoTriton()` y el bloque `analytics` del SDK. El resto es de `agents/streaming.md` |
| `src/scripts/anuncios.ts` | Solo el `ga4('anuncios_init', …)`. El motor de GPT es de `agents/ads.md` |
| `src/scripts/pista.ts` | Solo `ga4('pista_play')` y `ga4('pista_fin')` |

⚠️ **`src/js/analytics.js` es LEGADO y no se toca.** Existe en el repo, pero
`src/js/` entero es material de consulta del v1: comprobado con `grep`, ningún
archivo de `src/` lo importa, y `scripts/guardas.mjs` lo excluye de las guardas de
CI a propósito. Su port vivo es `src/scripts/analitica.ts`. Editar el `.js` no tiene
ningún efecto sobre el sitio.

> **No es dueño exclusivo de `Base.astro`.** El `<head>` lo comparten
> `agents/metadata.md` (título, canónica, Open Graph, indexación), `agents/ads.md`
> (la carga de `gpt.js` y el stub de `googletag`) y `agents/frontend.md`. Cualquier
> cambio ahí se coordina con los tres.

---

## Los eventos que el front YA emite

Están escritos y probados; lo que falta es quién los reciba. Vienen de tres sitios:

| Evento | Lo emite | Parámetros |
|---|---|---|
| `play` · `pause` · `stop` · `resume` | `player.ts`, desde `stream-status` | `category: 'Triton SDK'`, `station`, `dist` |
| `ad_start` · `ad_complete` · `ad_error` | `player.ts`, desde los `ad-playback-*` | los mismos |
| `anuncios_init` | `anuncios.ts`, en cada `astro:page-load` | `ruta` |
| `pista_play` · `pista_fin` | `pista.ts`, las pistas de Bonus Beat | `titulo`, `artista` |

Tres cosas que no son obvias y hay que conservar:

- 🔴 **`station` y `dist` viajan como PARÁMETROS, no como constantes.** En el v1
  estaban pegados como `XHSONFM` / `WebBeat` dentro del archivo, y era lo único que
  impedía que el mismo código sirviera a las otras tres estaciones de NRM. Hoy
  `station` sale del `data-mount` que el SSR pone en la barra, que a su vez viene de
  `estaciones.tritonMount` en el CMS.
- 🔴 **`resume` se distingue de `play` mirando el estado ANTERIOR** del stream. Sin
  eso, reanudar tras una pausa se contaría como una reproducción nueva y las
  sesiones saldrían infladas — justo la métrica con la que se justifican los CPMs.
- ⚠️ **`ga4()` nunca puede tumbar la reproducción**, y de eso se encarga su
  `try/catch`. Es correcto y se queda: una propiedad de analítica mal configurada no
  debe cortarle el radio a nadie. El precio es el silencio de hoy, y por eso está
  escrito aquí arriba.

---

## Lo que hay que respetar al escribir el cargador

Cuando se cablee la medición —que es el trabajo real de este agente— hay cuatro
cosas que este repo ya sabe y que no conviene descubrir otra vez:

- 🔴 **Sin valor, no se carga.** Es la regla que ya declara `.env.example`, y no es
  prolijidad: la preproducción y producción son la MISMA imagen de Docker, así que
  un id horneado ensucia la propiedad real con cada visita de revisión. Es el mismo
  razonamiento que deja `PUBLICIDAD_TOKEN` vacío en v2 (ver `agents/ads.md`).
- 🔴 **GA4 cuenta el DOBLE con View Transitions, y ya está anotado.** El
  `ClientRouter` navega con `pushState`, y la «Medición mejorada → Cambios de página
  basados en eventos del historial del navegador» de GA4 viene ENCENDIDA por
  omisión: dispara su propia página vista además de la nuestra. Se apaga en el panel
  de GA4, no en el código — o sea que el arreglo no está en este repo y hay que
  acordarse. Ver la sección de analítica de `.env.example`.
- ⚠️ **Un contenedor en el `<head>` de `Base.astro` se ejecuta UNA vez**, porque el
  layout no se vuelve a evaluar al navegar: el `ClientRouter` reemplaza el `body`.
  Lo que hace falta por navegación —una página vista— va por evento de Astro
  (`astro:page-load`), igual que ya hace `anuncios.ts`. Y lo que se registre en
  `document` necesita guarda contra duplicados, que es el patrón que siguen todos
  los módulos de `src/scripts/`.
- ⚠️ **comScore es el que más pesa comercialmente**, aunque sea el más pequeño: es
  lo que NRM reporta a los anunciantes para justificar los CPMs. Un cambio ahí
  afecta reportes de audiencia certificados, así que se coordina con adops de NRM y
  no se prueba en producción.

⚠️ **Y lo primero que hay que resolver es una pregunta, no un `<script>`:** si GA4
entra por GTM o directo. Si entran los dos, las páginas vistas salen duplicadas y el
síntoma —tráfico al doble— se parece tanto a un buen mes que puede tardar semanas en
levantar sospechas. El v1 lo tenía por GTM únicamente; conviene mantener esa
decisión y que GTM sea el único punto de control.

---

## Lo que este agente NO hace

- **El player y el SDK de Triton** — son de `agents/streaming.md`. Este agente solo
  mira las llamadas a `eventoTriton()` y el bloque `analytics` del constructor.
- **GPT, los huecos y el conteo de la venta directa** — son de `agents/ads.md`. ⚠️ Se
  cruzan en una cosa: el conteo de impresiones de una campaña vendida **no es
  analítica**, es facturación, y va por `PUBLICIDAD_TOKEN` de servidor a servidor.
- **Las etiquetas del `<head>`** —título, canónica, Open Graph, indexación, JSON-LD—
  son de `agents/metadata.md`.
- **Métricas de contenido para el lector**, tipo «lo más leído». No existen y no son
  un pendiente de este agente: es una decisión de arquitectura abierta (¿GA4, un
  contador propio, o se quita del diseño?), anotada en
  `docs/lo-que-el-front-necesita-del-cms.md` §5.
- **Un CMP o banner de consentimiento.** No hay ninguno y hoy no hace falta: Beat
  opera en México (LFPDPPP). Si NRM decide implementarlo, GTM es el punto donde se
  activan y desactivan etiquetas por consentimiento — pero eso empieza por cablear
  GTM, que es lo que falta.

---

## Cómo se verifica

🔴 **Lo primero es comprobar si hay receptor, porque hoy no lo hay.** Y no se puede
dar por bueno mirando el sitio: sin `dataLayer` los eventos se pierden en silencio y
la página se ve perfecta.

```bash
# ¿Se carga algún contenedor? Hoy esto no devuelve NADA, y es el hallazgo.
curl -s https://v2.beatdigital.mx/ | grep -oE 'GTM-[A-Z0-9]+|scorecardresearch|hotjar|metricool'

# ¿Existe el cargador en el código? Igual: hoy, vacío.
grep -rn "GTM-\|dataLayer\s*=\|_comscore\|hjid" src/ public/
```

Y en el navegador, una vez que el cargador exista:

```js
// En la consola, ANTES de dar play. Si `dataLayer` no es un array, no hay receptor.
Array.isArray(window.dataLayer)

// Los eventos del player, sin depender de GTM: se ve la cola crecer al dar play.
window.dataLayer = window.dataLayer || [];
const n = window.dataLayer.length;  // dale play, y vuelve a leer `length`
```

⚠️ **El diagnóstico del player ya está hecho y sirve para esto**: `?depurar=player`
en la URL enciende una traza que enseña cada `stream-status` y cada cue point con su
decisión (ver `src/scripts/player.ts`). Si la traza muestra los estados y `dataLayer`
no crece, el problema es de esta capa y no del player.

⚠️ Y se verifica **contra el HTML servido**, con `curl`, no abriendo la página: un
bloqueador de anuncios o una extensión de privacidad tumban estos scripts en el
navegador de quien revisa, así que «no aparece en la pestaña de red» no distingue
entre «no se carga» y «lo bloqueó tu navegador».

Contexto del despliegue y de qué está apagado en v2 a propósito:
`docs/despliegue-v2.md`.
