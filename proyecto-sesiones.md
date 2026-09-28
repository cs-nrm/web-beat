# proyecto-sesiones — Cuentas de oyente y señal premium

Beat va a dejar de ser un sitio anónimo: cuentas de oyente, y una **membresía de paga
que da la señal sin cortes comerciales**. Este documento es el acta del proyecto y se
escribió el 28 sep 2026, antes de que exista una sola línea de código.

**Nada de esto está construido todavía.** `oyentes`, `playlists`, `guardados` y
`suscripciones` siguen en `PENDIENTES_EN_EL_CMS`
([src/lib/cms/client.ts:248-255](src/lib/cms/client.ts)), no hay `src/pages/mi/`, no
hay cookie de sesión y el servidor no toca el audio. Lo que sí hay es el diseño, y
está medido contra el código y contra la documentación de Triton.

> **Rutas.** Todo lo que este documento cita con `archivo:línea` **existe y se
> comprobó** el 28 sep 2026. Los archivos que todavía no existen están agrupados
> aparte, en «Archivos que este documento propone crear». Si citas algo nuevo aquí,
> compruébalo con `ls` antes de escribirlo: las actas se reescribieron enteras en
> septiembre porque entre seis citaban más de cuarenta archivos inexistentes.

---

## Lo que decidió Carlos

- Primero **login + audio premium**. Playlists y likes vienen después.
- **Cuenta única NRM desde el día 1**, con cuatro puertas de entrada: enlace mágico,
  correo y contraseña, Google y Apple, y teléfono con SMS.
- La **membresía es solo de Beat** por ahora, aunque la cuenta sea del grupo.
- La segunda señal es **la misma programación sin los cortes**: locutores y programas
  incluidos. Eso mantiene honesto el «EN VIVO» de la barra.
- **Entrada automática**: con sesión y membresía vigente, el carril premium se activa
  solo. Hay vuelta al aire normal, no como función sino porque si la señal premium se
  cae hay que tener a dónde caer.
- El enlace premium es **totalmente independiente**, no un mount hermano de `XHSONFM`.
- Pasarela por elegir.

---

## Cómo sale el audio, y por qué eso decide el diseño

La cadena real es **DALET (Galaxy) → salida a una computadora con tarjeta de audio →
Station Manager, el software de Triton, en ese equipo → servidores de Triton → el
mount que lee el sitio.**

Los cortes comerciales van **dentro de la señal del playout**. Triton no los inserta
ni los sustituye. De ahí sale la consecuencia que ordena todo lo demás:

**El claim `td-ads: 'none'` del token de Triton no sirve para nada aquí.** Gobierna la
inserción del lado de Triton, y en Beat no hay inserción que apagar. Quien retome esto
y lea la documentación de Triton va a encontrar ese camino primero: no es el nuestro.

El nuestro es el otro que la misma página describe —*Player Streaming Connection*,
sección «Access Token»—:

> For example, you can **restrict access to specific content** (e.g., higher bitrate
> stream) **to registered listeners only**. *Alternatively*, you can deliver fewer ads
> or even advertising-free content to authorized players or registered listeners who
> are logged in.

El *«Alternatively»* separa dos caminos. El segundo es el de la sustitución
publicitaria y está muerto para Beat. **El nuestro es el primero**, y el ejemplo que
ponen —un stream de mayor bitrate— es literalmente otro enlace.

Así que el producto es: **una segunda programación en DALET sin huecos de anuncios,
hacia un enlace nuevo que Triton restringe**, y un pase firmado por nuestro servidor
que es lo único que lo abre.

---

## Qué se puede y qué no

### Se puede, y está verificado

| | Cómo se sabe |
|---|---|
| Sesiones de oyente en el mismo Payload | Payload 3.85.2 admite varias colecciones autenticables |
| Firmar el `tdtok` en nuestro servidor | JWT HS256 con `kid` de Triton, y es la única vía que Triton considera segura |
| Sin dependencias nuevas | WebCrypto (`crypto.subtle`) basta |
| Meter el token en la URL del stream | `trackingParameters` se serializa literal a la query — verificado en el bundle 2.9.80 |
| Una segunda señal desde el mismo equipo | Station Manager documenta selector de dispositivo de captura **por mount** |
| Apuntar a esa señal sin tocar la interfaz del SDK | Si es estación propia, `sdk.play({ station })` sigue siendo la llamada de hoy |
| Separar la audiencia premium del reporte | Triton reporta por *stations, groups, mounts and publishers* |

### No se puede, y no lo arregla ningún código

| | Por qué |
|---|---|
| **Esconder la URL del audio** | El redirect repite el query tal cual. El techo es que caduque en ~60 s |
| **Revocar a un suscriptor en Triton** | La llave HMAC es del cliente entero: rotarla tumba Beat, OYE, Sabrosita y Stereo Cien a la vez. Lo único por usuario es forense, con el id en `sub` |
| **Limitar sesiones simultáneas en Triton** | No existe. Si se quiere, se cuenta de nuestro lado |
| **Distinguir un rechazo por token de una caída de red** | Por HTTP progresivo todo se colapsa en `LIVE_FAILED`. El 453 solo se maneja en la ruta HLS, que Beat no tiene |
| **Mandar el token al canal de metadatos** | El SDK 2.9 arma la URL del SBM **sin** `trackingParameters`. Es estructural: no se parchea desde el front |
| **Cubrir la señal premium con la licencia de radio** | Son tres expedientes nuevos, y se cobran sobre ingresos de suscripción |

### Lo que falta preguntarle a Triton

Ninguna de estas decide si el producto existe; deciden cómo se comporta cuando algo
falla. Van en el mismo correo que el alta.

1. **¿Qué devuelve el enlace al rechazar?** Es la que más pesa: sin un código
   distinguible, un token inválido se ve igual que una caída de red.
2. **¿El `_SBM` del enlace restringido queda restringido también?** Si sí, los
   suscriptores pierden el «qué suena» y no hay arreglo posible desde aquí.
3. ¿Una conexión ya abierta revalida, o solo se valida al conectar?
4. Costos: enlace, encoder y horas de escucha. No hay nada público.

---

## Lo que le toca al CMS (`cms-estaciones`)

Es el trabajo que **bloquea todo lo demás**, y va en el otro repo. La base está en
[docs/lo-que-el-front-necesita-del-cms.md](docs/lo-que-el-front-necesita-del-cms.md)
§2; lo que sigue lo completa y **lo corrige en un punto** (el nombre de `membresias`).

### Colecciones nuevas

| Colección | Qué lleva |
|---|---|
| `oyentes` | `auth: true`, **separada de `users`**. Email único **global** —es lo que hace real la cuenta única NRM—, `estacionOrigen` (rel a `estaciones`), `estaciones[]` (dónde tiene actividad), `nombre`, `verificado`, y el campo denormalizado `premiumHasta` (fecha) |
| `playlists` | `oyente` (rel), `nombre`, `slug`, `publica`, `estacion`, y `canciones` como array ordenable de relaciones a `canciones` |
| `guardados` | `oyente` + relación polimórfica a `noticias` / `podcasts` / `especiales` |
| `membresias` | `oyente`, `estado`, `vigenteHasta` (fecha), `pasarela`, `idExterno`, `ultimoEventoProcesado` |

**`membresias` y NO `suscripciones`.** Ese slug ya está tomado por el newsletter del
§6 ([src/lib/cms/client.ts:248-255](src/lib/cms/client.ts), y el §2 del documento de
traspaso). Mezclar filas de dinero con filas de boletín en la misma tabla rompe el
control de acceso, porque el boletín acepta anónimos y la membresía no. Cuando se
cree, hay que corregir las dos referencias en el mismo commit.

### Campos nuevos en colecciones que ya existen

- **`estaciones.tritonEstacionPremium`** — el nombre de la estación restringida en
  Triton. Va en el CMS por la misma razón que `tritonMount`
  ([src/lib/cms/estacion.ts](src/lib/cms/estacion.ts)): nada de la estación se
  hardcodea en el front.
- **`estaciones.premiumActivo`** (booleano) — el interruptor. Misma forma y mismo
  motivo que `preroll` y su `prerollActivo()`.
- **`bitacora.senal`** — discriminador de señal. **No es estética.** Por las licencias
  (ver abajo) la señal premium se reporta aparte, y SOMEXFON reparte por tocadas
  monitoreando la señal radiodifundida: una señal que solo vive en internet no se
  monitorea off-air, así que el reporte sale de NRM. Añadirlo hoy cuesta un campo;
  dentro de seis meses cuesta una migración, y sin él no hay nada que reportar. Toca
  también la ingesta: `../cms-estaciones/src/endpoints/bitacoraIngesta.ts`.

### Control de acceso — lo más serio de esta sección

Hoy **la lectura del CMS es pública y sin autenticación**: `pedirAlCms` manda solo
`Accept` ([src/lib/cms/client.ts:173-176](src/lib/cms/client.ts)). El día que exista
`oyentes` en ese Payload, un `GET /api/oyentes` desde fuera sería **el padrón de
correos de las cuatro estaciones**.

- `oyentes.read` → `false` para el anónimo, `{ id: { equals: req.user.id } }` para el
  propio oyente.
- `playlists` / `guardados` / `membresias` → un oyente solo lee y escribe lo suyo, y
  lo aplica Payload, no un `where` del front.
- `membresias.update` → solo el endpoint del webhook, nunca el oyente.
- Se comprueba con `curl` desde fuera de la VPC esperando 403, **antes y después de
  cada despliegue del CMS**.
- Cada colección nueva necesita su columna en `payload_locked_documents_rels`.

### Adaptador de correo — hoy no existe

`../cms-estaciones/src/payload.config.ts` no tiene `email:` y su `package.json` no
trae nodemailer ni resend. Sin adaptador no hay enlace mágico, ni verificación, ni
recuperación de contraseña, ni el aviso de renovación a cinco días que exige la ley.
**Entra en la primera fase, no en la última.**

### El webhook de pagos

`POST /api/membresias/webhook`, calcado de
`../cms-estaciones/src/endpoints/registrarPublicidad.ts`, que ya tiene el molde con su
secreto compartido y su 503 si falta la variable.

Aterriza **en el CMS y no en Astro**: el servicio de Astro se reinicia en cada
despliegue y un webhook perdido es alguien que pagó y no entra. Y tres reglas que no
son opcionales:

1. **Cuerpo crudo** para verificar la firma. Cualquier parser que lo toque la rompe.
2. **Idempotencia** por id de evento. Llegan duplicados por diseño.
3. **Reconsultar a la pasarela** en vez de creerle al cuerpo. Eso hace irrelevante el
   orden de llegada, que también es aleatorio por diseño. Es la línea que más vale de
   toda la sección de pagos.

### Cuando todo esto exista

Quitar las colecciones de `PENDIENTES_EN_EL_CMS`
([src/lib/cms/client.ts:248-255](src/lib/cms/client.ts)) y **no** añadirlas a
`COLECCIONES_POR_ESTACION` ([src/lib/cms/client.ts:221-237](src/lib/cms/client.ts)) —
el porqué está en la sección del front.

---

## Lo que le toca al front (`web-beat`)

> **El CMS dice QUIÉN es y SI PAGÓ. El front dice QUÉ SUENA y CON QUÉ CREDENCIAL.**
> El secreto del webhook vive en la VM del CMS; la llave de Triton, en la de Astro.
> Ninguno cruza. Y la llave de Triton **no va a un campo del CMS**: un campo en el
> panel la pone al alcance de cualquier editor, y vale por las cuatro estaciones.

**El orden no se puede invertir: sesión → firmador → endpoint → player.** Escribir el
carril de audio antes degrada a «sin derecho» para todo el mundo, en silencio y con el
interruptor encendido.

### Dónde vive la sesión

Colección `oyentes` con `auth: true` en el mismo Payload, y Astro como **BFF y solo
BFF**. El navegador nunca habla con el CMS: es la línea roja de
[agents/content.md](agents/content.md), y en producción `CMS_URL` es una IP privada de
la VPC, así que ni podría.

No un proveedor externo (Clerk, Auth0): `playlists` y `guardados` tienen que
relacionarse con un documento de oyente dentro del CMS de todas formas, así que habría
**dos identidades que reconciliar**. Y Payload 3 trae `useSessions: true` por defecto
—razonado en `../cms-estaciones/src/collections/Users.ts:23`— así que cerrar sesión la
invalida del lado del servidor de verdad.

Tampoco tabla propia: este repo no tiene base de datos, ni ORM, ni migraciones.

### La cookie, y por qué va firmada

`beat_sesion`: `httpOnly`, `sameSite: 'lax'`, `path: '/'`, **sin `domain`**, y `secure`
deducido de `x-forwarded-proto` — exactamente el cálculo de
[src/pages/api/votar.ts:149-155](src/pages/api/votar.ts) y por la misma razón medida:
Apache habla HTTP con el servicio, así que un `secure: true` fijo haría que el
navegador descartara la cookie **en silencio** y el login «no funcionaría» sin un solo
error. Ese cálculo se extrae a `src/lib/sesion/cookie.ts` y `votar.ts` pasa a
importarlo.

`lax` y no `strict` porque al volver de la pasarela la navegación es cross-site, y con
`strict` el oyente aterrizaría deslogueado justo después de pagar.

**Va firmada por nosotros y lleva dentro el id del oyente y `premiumHasta`, con vida
corta.** No es elegancia: el camino caliente firma un token cada pocas decenas de
segundos por oyente, y resolver eso contra el CMS sería un `where` que varía por
petición —la regla 2 de [agents/content.md](agents/content.md), la que costó 836 de
1,103 errores por hora en `web-enfoque`— y además desalojaría la caché compartida del
proceso (`MAX_ENTRADAS = 800`, FIFO por URL completa,
[src/lib/cms/client.ts:53-67](src/lib/cms/client.ts)), dejando al sitio entero
pegándole al CMS en cada render.

El precio hay que escribirlo: **cancelar tarda lo que dure la cookie corta, más los
60 s del último token.** Para una membresía mensual es irrelevante.

**Cuenta única NRM son las mismas credenciales, no la misma sesión.** Los cuatro
dominios son registrables distintos: ninguna cookie puede abarcarlos. Es física del
navegador, no una decisión. El SSO de verdad es otro proyecto.

### El transporte por oyente

Las colecciones por oyente **no entran en `COLECCIONES_POR_ESTACION`**
([src/lib/cms/client.ts:221-237](src/lib/cms/client.ts)) y **no pasan por
`cmsFetch`**. Un `where[oyente][equals]=<id>` genera una entrada de caché por visitante
y ninguna acierta nunca. Y peor: la clave de caché es la URL completa, así que si
alguien parcheara `pedirAlCms` para reenviar el `Authorization` del oyente, **la caché
le serviría los guardados del primero al segundo**.

Va en un archivo aparte, con su propio timeout, que no toca `CACHE` ni `EN_VUELO`.

### El pase de aire

Se firma en el servidor: HS256, header `{alg:'HS256', typ:'JWT', kid}`, claims `iat`,
`exp`, `aud:'td'`, `td-reg: true`, y **`sub` con el id del oyente** — Triton lo
recomienda para poder identificar a quien filtre una URL, y es lo único que convierte
una rotación de llave de cuatro estaciones en la baja de una cuenta.

**La primitiva se nombra ahora, no al implementar.** Este repo no tiene `@types/node`
a propósito, ni `jose`, ni `jsonwebtoken`, y `grep -rn 'node:' src/` da cero. Un
`import { createHmac } from 'node:crypto'` puede pasar `pnpm check` y reventar
`astro check` dentro de `pnpm build`, que es la puerta que corre en CI **y en la VM**,
abortando el despliegue a medias. **Se usa WebCrypto (`crypto.subtle`)**, que es
asíncrono y del lado servidor no molesta.

`TRITON_TOKEN_SECRETO` y `TRITON_TOKEN_KID`, **sin prefijo `PUBLIC_`**, leídas en
ejecución con `envServidor()` ([src/lib/env.ts:32-43](src/lib/env.ts)) — la regla ya
escrita en [.env.example](.env.example) para `PUBLICIDAD_TOKEN`.

**El nombre de la estación premium baja junto con el token**, nunca por SSR ni por un
`data-*`: el endpoint responde `{ estacion, tdtok, vence }` con `private, no-store`.
`/api/` ya está en `SIN_CACHE` ([src/middleware.ts:19](src/middleware.ts)), así que no
hay que tocar el middleware. Sin derecho responde **204 y no 403**: un 403 en la
consola de cada oyente libre es ruido que enmascara los errores de verdad, y un cuerpo
vacío no delata que exista un segundo enlace.

**Lo que sí baja por SSR es `premiumActivo`**, que es constante de estación igual que
`data-mount` y `data-preroll`: sobrevive a la caché de borde y al nodo persistido. Con
valor explícito `si`/`no` — un atributo a secas vale la cadena vacía y `!!''` es
`false`, que es la trampa 8 del CLAUDE.md. Lo que **no** puede bajar por SSR es el
derecho del oyente.

### Pedirlo como ESTACIÓN propia, no como mount

El primer impulso es pedir «un mount más en XHSONFM» y apuntar con
`sdk.play({ mount })`. Trae tres problemas:

- **El nombre se filtra.** Medido: el provisioning anónimo de `station=XHSONFM`
  devuelve los tres mounts en claro, y la API no acepta token.
- **Se pierde la escalera de compatibilidad.** Hoy `station: 'XHSONFM'` entrega tres
  mounts y el SDK ordena por plataforma y bitrate —por eso acaba en `XHSONFMAAC`—.
  Pidiendo un mount único se pierde el respaldo MP3: se rompería justo en los equipos
  donde hoy funciona.
- **Hay que ampliar la interfaz `SdkTriton`**
  ([src/scripts/player.ts:53-56](src/scripts/player.ts)), que solo declara `station`.

Con estación propia y su propio par AAC + MP3 los tres desaparecen, y como nada de
`XHSONFM` se toca, el aire libre —y lo que sea que lo consuma hoy sin que nos
enteremos, incluida [src/pages/alexa.astro](src/pages/alexa.astro)— queda igual.

El bitrate y el formato se deciden en el alta: **solo los cambia Triton**.

### El ciclo de vida del token — las cuatro trampas

Las cuatro están medidas y las cuatro son invisibles recargando.

1. **Ni un `await` entre el clic y `sdk.play()`.** WebKit exige que el `play()` salga
   dentro del gesto: 2 de 4 arranques mudos en un iPhone 17 Pro, medido el 2026-09-11
   ([src/scripts/player.ts:150-184](src/scripts/player.ts)). `reproducir()`
   ([:860-872](src/scripts/player.ts)) sigue siendo síncrona y lee el token que haya.
   El reintento tras un fallo **tampoco** puede traer token nuevo por `fetch`: ese
   `play()` también sale fuera del gesto.
2. **No colgarlo de `precargarEnIntencion()`.**
   [src/scripts/player.ts:1185-1191](src/scripts/player.ts) reparte
   `if (esOyenteConocido()) { … } else { precargarEnIntencion() }`, y
   `esOyenteConocido()` lee `beatYaEscucho` de `localStorage`. **Un suscriptor es por
   definición alguien que ya dio play**, así que nunca pisa esa rama y nunca pediría el
   pase: pagaría y oiría comerciales, siempre. Y encima se registra con `{once:true}` y
   llama a `quitar()` ([:1014-1033](src/scripts/player.ts)): una sola vez por
   documento.
3. **No fiarlo a un `setInterval`.** El caso principal de una radio es la pantalla
   apagada, y ahí los temporizadores de una pestaña oculta se estrangulan a un minuto
   o más, y iOS los suspende. Hay que refrescar también en `visibilitychange` y al
   hilo de los eventos de `stream-status`.
4. **No pedirlo una vez y confiar.** Un token de 60 s ya caducó cuando el dedo llega si
   la persona leyó la portada noventa segundos, que es el camino normal.

El carril necesita guarda de una sola ejecución por documento (el patrón de
`iniciarPlayer()`, `if (iniciado) return`, no la marca del botón) y enganche a
`astro:page-load`: `prepararPlayer()` **no** se vuelve a ejecutar al navegar, así que
quien se suscribe y vuelve al Inicio no tendría carril premium hasta recargar a mano.

Y una trampa de mecánica: **`reproducir()` construye un literal nuevo de
`trackingParameters` en cada llamada**, así que mutar en sitio el objeto que guardó el
SDK en `_currentLiveApiParams` se autodestruye en cuanto se vuelve a llamar. O se
reutiliza un objeto estable por sesión, o se abandona el truco y se asume que toda
reconexión pasa por `reproducir()`.

### El rechazo, que no se puede distinguir

Verificado en el bundle 2.9.80: por HTTP progresivo cualquier fallo del servidor se
colapsa en `{status:'streamUnavailable', code:'LIVE_FAILED'}` y `__onStreamFailed`
llama a `__reconnect()`, que tras agotar el iterador entra en retroceso exponencial
`min(delay << intento, 60000)` **sin límite**. El 453 existe pero **solo se maneja en
la ruta HLS**, que Beat no tiene. Un token inválido se ve igual que una caída de red.

- **La guarda premium va dentro de `abrirEpisodio()`**, que es la única puerta a la
  escalera: cubre las tres entradas (`LIVE_FAILED`, `LIVE_STOP`, `LIVE_RECONNECTING`)
  con una línea. Ponerla dentro de una rama deja fuera `LIVE_RECONNECTING`, que llama
  a `abrirEpisodio()` por su cuenta y concede gracia al SDK — reconectando con el token
  muerto.
- **La caída al enlace libre es un escalón DENTRO de la escalera**, no una rama
  paralela. Escalera corta para premium (dos escalones) y al agotarla caer al libre en
  vez de rendirse. Un intento único convertiría cualquier microcorte de red en una
  degradación con acusación falsa: el suscriptor tratado peor que el oyente gratuito
  justo en el escenario para el que se escribió la escalera
  (`ESPERAS_RECONEXION`, [src/scripts/player.ts:248-255](src/scripts/player.ts)). El
  contador vive **por episodio**, no por evento.
- **Un cambio de señal deliberado no es una parada.** `pedirParada()` + `stop()` +
  `reproducir()` en la misma tarea choca con `paradaEsNuestra()`, que es verdadera
  2000 ms ([src/scripts/player.ts:245-325](src/scripts/player.ts)): si la conexión
  nueva falla dentro de esa ventana, `alCambiarEstado` entra por la guarda de parada
  propia, pinta `'pausa'` y **nadie reintenta**. Hace falta una marca propia de «cambio
  en curso».
- **Toda ruta que vuelva de un `await` y vaya a llamar a `play()` repite
  `laSenalSigueSiendoSuya()`** ([src/scripts/player.ts:710-720](src/scripts/player.ts)).
  Si no, el oyente que abrió un video mientras esperaba acaba con dos audios — el bug
  que [src/scripts/audio.ts](src/scripts/audio.ts) existe para impedir.

### El modo del aire está repartido en dos implementaciones

No es un literal en tres sitios: son **dos mecanismos distintos y siete puntos de
llamada**, y eso hace obligatorio un `ponerModoDelAire()` único e importable.

- [src/scripts/player.ts](src/scripts/player.ts) lo escribe directo en `:1111` y
  `:1720`.
- [src/scripts/pista.ts](src/scripts/pista.ts) tiene **su propio `modo()`** (el setter
  está en `:503`), llamado con `'directo'` desde `:320`, `:331`, `:365`, `:675` y
  `:757` — este último dentro de `volverAlDirecto()` (`:725`).

El síntoma si no se unifica: un suscriptor oye una pista de Bonus Beat, toca «EN VIVO»
y vuelve al aire **con anuncios** mientras la interfaz dice otra cosa.

### El «qué suena», el historial y los avisos

- **Los cue points no necesitan código nuevo**: el canal SBM es por mount y el SDK abre
  el del mount que reproduce. Se conservan la lista blanca estricta y las tres cosas
  que ya costaron un arreglo cada una (el tipo se llama `type`, todo llega envuelto en
  `.data`, `cue_time_duration` en décimas). Ver [agents/streaming.md](agents/streaming.md).
- **Al cambiar de señal se vuelve a la frecuencia antes de reproducir.** Quitar un
  hueco de tres minutos obliga a llenarlo con otra cosa, así que **alrededor de cada
  corte las dos señales suenan distinto**. Arrastrar el título es afirmar algo falso.
- **El aviso de la caída no va en el campo «sonando»**: `pintarEstado('sonando')`
  termina en `restaurarSonando()`
  ([src/scripts/player.ts:515-525](src/scripts/player.ts)) y lo borraría justo cuando
  la caída se consuma. Vive en el propio control.
- **`ad-break-cue-point` en premium delata una avería** —la segunda programación trae
  huecos—, así que se conserva «PAUSA COMERCIAL», que es verdad, y se añade un aviso
  que **no** dependa de `DEPURA`: la traza solo se enciende en dev o con
  `?depurar=player`, o sea que en producción no se entera nadie.
- **`ctxAnalitica()` lee `dataset.mount`**
  ([src/scripts/player.ts:345-360](src/scripts/player.ts)): todo evento de un premium
  se reportaría con el enlace gratuito. Hay que añadir la señal.
- **El aviso de caída necesita un destino que exista.** Hoy no hay contenedor de
  medición en el sitio (ver [agents/analytics.md](agents/analytics.md)): un evento a
  GA se descarta en un `catch`. Va un endpoint propio al CMS, más las alertas de stream
  y de *dead air* del propio mount en la consola de Triton, que sí son editables por el
  cliente. Y alguien de la estación tiene que tener asignado enterarse: hoy, un domingo
  a las 3 a.m., el primero en notarlo sería un suscriptor.

### Lo que NO se apaga, y lo que no se promete

El **display de GAM y la venta directa se quedan** para el suscriptor: lo que se vende
es audio sin comerciales. Queda preparado —un `return` temprano en
[src/scripts/anuncios.ts](src/scripts/anuncios.ts)— y no se aplica sin que Carlos lo
diga.

**El pre-roll VAST no se vende como beneficio**: hoy está vacío —GAM devuelve
`<VAST version="3.0"/>`, 156 bytes, sin un solo `<Ad>`, medido el 2026-09-10
([src/scripts/player.ts:137-145](src/scripts/player.ts))— y `prerollActivo()` está
apagado por omisión ([src/lib/cms/estacion.ts](src/lib/cms/estacion.ts)). Saltarlo es
una línea sin promesa asociada.

**No se proxea el stream por Astro.** Metería los bytes de todos los premium por un
proceso Node sin CDN que se reinicia en cada despliegue, rompería el canal SBM del que
sale el «qué suena» y rompería la medición que NRM le reporta a los anunciantes.

**Stream Access Control no es la herramienta**: sus reglas son geografía, DMA, radio,
IP, referrer y user-agent, ninguna lee un token. Lo único que aporta es el *referrer
checking* contra el hotlinking casual.

### El CSRF, y tres comentarios que hay que corregir

`security.checkOrigin: true` **no cubre lo que este repo cree**. Verificado en
`node_modules/astro/dist/core/app/origin-check.js` (Astro 7.2.10): solo rechaza si el
`content-type` es de formulario (`x-www-form-urlencoded`, `multipart/form-data`,
`text/plain`). Un POST con `application/json` pasa el filtro.

En la práctica el ataque no sale —`sameSite: 'lax'` no manda la cookie cross-site y un
JSON cross-origin exige preflight que nadie contesta— pero **no se puede apoyar el
login en un filtro que no lo mira**. Los tres comentarios que afirman lo contrario
—[astro.config.mjs](astro.config.mjs) en dos sitios y
[deploy/apache/020-beatdigital.conf](deploy/apache/020-beatdigital.conf)— se corrigen
en el mismo commit, porque si no alguien volverá a apoyarse en ellos.

Cada `/api/sesion/*`, `/api/mi/*` y `/api/aire/*` lleva el freno `sec-fetch-site` de
[src/pages/api/votar.ts:70-80](src/pages/api/votar.ts) y rechaza cualquier
`content-type` que no sea `application/json`.

---

## El cobro

Detrás de un adaptador con dos funciones, así que cambiar de proveedor es reescribir un
archivo. Se elige por **lo que la pasarela NO puede hacer**:

| | Tarjeta recurrente | Efectivo/SPEI recurrente | Comisión publicada |
|---|---|---|---|
| Stripe Billing | sí, con portal de cliente | **no** — OXXO es de un solo uso, tope 10,000 MXN, no enchufa a Billing | 3.6% + $3 + 0.7% Billing |
| Conekta | sí | **sí** — única con referencia FIJA reutilizable mes a mes | 3.4% + $3 tarjeta · 2.6% + $3 efectivo |
| Mercado Pago | sí (preapproval) | listado, pero no documenta si cobra solo | 3.49% + $4 al instante |
| Openpay/BBVA | solo tarjeta | no | sin tarifa pública |

El efectivo se modela como **recarga, no como suscripción**: el campo es
`vigenteHasta`, y el pago confirmado hace `max(hoy, vigenteHasta) + 30 días`. Eso
vuelve irrelevantes el dunning y los reintentos para esa mitad del público, y el mismo
campo sirve para las dos.

**Lo que la ley exige desde el 13 dic 2025** (LFPC art. 76 Bis fr. VIII y IX) son
pantallas y endpoints: consentimiento expreso con periodicidad, monto y fecha; **aviso
de renovación con cinco días naturales**; y un botón de cancelación **inmediata** que
no puede abrir un ticket. Más, por la LFPDPPP (ley nueva del 20 mar 2025): aviso
simplificado con liga al integral, canal ARCO con reloj de 20 días para responder y 15
para ejecutar, y persona designada. Y CFDI por cada cobro o factura global.

Las dos páginas legales de hoy —[src/pages/avisodeprivacidad.astro](src/pages/avisodeprivacidad.astro)
y [src/pages/terminosycondiciones.astro](src/pages/terminosycondiciones.astro)— están
escritas para un sitio anónimo y son texto legal de TELEVIDEO, S.A. de C.V.: las
reescribe un abogado, no este repo.

### Licencias — afectan al precio y a la interfaz

La licencia de radiodifusión **no** ampara un canal exclusivo de internet y de paga.
Son tres expedientes: **SACM** (autores, ventanilla EMMAC-SACM), **SOMEXFON**
(productores de fonogramas) y **ANDI/EJE** (intérpretes, que no están en SOMEXFON). Al
calcularse sobre ingresos por suscripción son **costo variable por suscriptor**.

Y hay un requisito de producto escondido: la tarifa de internet de SOMEXFON está
redactada como música **«sin la posibilidad de atrasar, adelantar, pausar o
seleccionar canciones o canales en específico»**. Traducido: la señal premium sigue
siendo un directo, sin saltar canción, sin elegir canal y **sin anunciar por adelantado
qué va a sonar**. El «qué suena» por SBM es reactivo y por eso es seguro; un «a
continuación» no lo sería.

---

## Fases

| | Qué |
|---|---|
| **F0 — Alta y permisos** | El correo a Triton (alta del enlace restringido, clave de firma y las cuatro preguntas), el adaptador de correo del CMS, cerrar `oyentes.read`, abrir los expedientes de licencia |
| **F1 — Sesión** | Las colecciones con su control de acceso, las cuatro puertas de entrada, el BFF, `/mi/`, el chip de cuenta pintado desde el cliente, las páginas legales |
| **F2 — Pase de aire** | El firmador, el endpoint, el carril del player y `ponerModoDelAire()`. Se valida con una cohorte a la que se le pone `premiumHasta` a mano, **antes** de que exista el cobro |
| **F3 — Cobro** | Pasarela, webhook, checkout con consentimiento expreso y paso fiscal, cancelación inmediata, aviso a cinco días, timbrado |

**F0 y F1 corren en paralelo.** La capa de sesión sirve igual pase lo que pase con el
audio. **F2 no arranca** hasta ver con `curl` que el enlace nuevo rechaza sin token, y
sin las preguntas 1 y 2 contestadas por escrito no se pueden escribir las ramas de
[src/scripts/player.ts](src/scripts/player.ts).

Todo va detrás de interruptores de **ejecución** (`SESIONES_HABILITADAS`, y
`estaciones.premiumActivo` para el audio), sin prefijo `PUBLIC_`. Apagar es editar el
`.env` y `systemctl restart`, no reconstruir y desplegar a las once de la noche. Es la
vuelta atrás, y con este despliegue es lo más valioso del plan.

---

## Cómo se verifica

**No hay entorno de pruebas.** Levantar uno exige añadir su host a `allowedDomains`
([astro.config.mjs](astro.config.mjs)), que es **configuración de build**: un
`pnpm build` y un despliegue del sitio vivo, con su ventana de 502. Y no hay un segundo
Payload: los oyentes de prueba aterrizarían en la base de producción de las cuatro
estaciones. Como mínimo, prefijo obligatorio en los correos de prueba y borrado
verificado.

**La llave HMAC no se prueba desde un portátil.** Vale por las cuatro estaciones y su
única remediación documentada es rotarla. La medición corre en la VM, leyendo la clave
solo de `process.env`.

```
1. Login → Inicio → nota → atrás. El chip sigue diciendo el nombre en las tres.
   Y: suscribirse en /mi y volver al Inicio con un enlace — el carril premium tiene
   que activarse SIN recargar.
2. Con ?depurar=player y sesión premium: dar play y comprobar en el panel de red que
   la URL lleva &tdtok=. Leer `currentSrc` del elemento que crea el SDK para saber en
   qué mount acabó (el método de agents/streaming.md).
3. Oyente conocido (con `beatYaEscucho` en localStorage): dar play SIN rozar antes la
   barra. Tiene que llevar tdtok igual.
4. iPhone, primer play del día en frío: suena al primer toque. Si pide un segundo, se
   reintrodujo el fallo del gesto.
5. Pantalla bloqueada media hora y luego un túnel: al reconectar el token va fresco.
6. Token caducado a propósito: dos escalones y caída al enlace libre, con el aviso
   visible DESPUÉS de que entre la señal.
7. Premium sonando → pista de Bonus Beat → botón «EN VIVO»: vuelve a la señal que
   corresponde, no al aire con anuncios.
8. Premium sonando → abrir el video de una nota mientras se espera un token: no
   pueden sonar los dos.
9. curl a /api/oyentes desde fuera de la VPC: 403.
10. `pnpm build` como puerta, que es la misma que corre CI y la VM.
```

Y una medición que va **antes** de escribir el cableado: poner una clave inventada en
`trackingParameters` y ver a cuántos destinos sale además del stream. El SDK se
construye con `analytics: { active: true, sampleRate: 100 }`
([src/scripts/player.ts:1318-1335](src/scripts/player.ts)); si los parámetros se
replican al beacon de Triton o a GA, `trackingParameters` deja de ser vía viable.

---

## Archivos que este documento propone crear

**Ninguno existe todavía.** Están aquí para que nadie los busque en el árbol y crea que
se le rompió el checkout.

| Ruta | Qué haría |
|---|---|
| `src/lib/sesion/cookie.ts` | La cookie firmada. `votar.ts` pasa a importar de aquí su cálculo de `secure` |
| `src/lib/cms/oyente.ts` | El transporte por oyente, fuera de la caché compartida |
| `src/lib/aire/token.ts` | El firmador del `tdtok` con WebCrypto |
| `src/lib/pago/pasarela.ts` | El adaptador de la pasarela |
| `src/pages/api/sesion/*` | Entrar, salir, registrar, y quién soy |
| `src/pages/api/aire/pase.ts` | Devuelve `{ estacion, tdtok, vence }` o 204 |
| `src/scripts/pase.ts` | El ciclo de vida del pase en el cliente |
| `src/pages/mi/*` | El área privada |

Y del lado del CMS, todo lo de «Lo que le toca al CMS».

---

## Lo que queda por decidir

- **El precio**, después de las cotizaciones de licencias. Son costo variable por
  suscriptor.
- **Quién opera y vigila la segunda señal.** Una programación permanente en DALET, una
  segunda salida de audio, y alguien que se entere cuando se caiga.
- ¿Habrá prueba gratuita? Es justo el caso que la fracción VIII obliga a avisar con
  cinco días.
- **A nombre de qué entidad se cobra.** El aviso de privacidad vigente nombra a
  TELEVIDEO, S.A. de C.V.; el holding es NRM Comunicaciones, S.A. de C.V. Son dos, y
  de eso salen el RFC emisor y a nombre de quién se contrata la pasarela.
- ¿Quién timbra los CFDI? El diseño del webhook cambia si la factura se emite en el
  mismo flujo o en un job nocturno.
