# Streaming Agent — Beat 100.9

## Rol

La señal: el player de radio en vivo, el SDK de Triton, los audio ads del pre-roll,
el «qué suena», y el árbitro que garantiza que solo suene una fuente a la vez.

🔴 **Este documento se reescribió por completo el 2026-09-08.** El anterior
describía el v1 y los cuatro archivos que reclamaba están muertos o son legado:

- `src/components/Player.astro` — **no existe.** El player vive en la cabecera:
  `src/components/Cabecera.astro`.
- `src/js/player.js`, `src/js/analytics.js`, `src/js/ads.js` — existen en el repo
  pero **`src/js/` entero es LEGADO**: comprobado con `grep`, ningún archivo de
  `src/` los importa, y `scripts/guardas.mjs` los excluye de las guardas de CI a
  propósito. Sus ports vivos son `src/scripts/player.ts`, `analitica.ts` y
  `anuncios.ts`. Editar los `.js` no tiene ningún efecto sobre el sitio.

Y describía una arquitectura que ya no es esta:

| El acta vieja decía | La realidad de v2 |
|---|---|
| El player flota abajo a la derecha (izquierda en móvil) | Va **en la CABECERA**, y es requisito de producto |
| Polling de `cdn.nrm.com.mx/…/cancion.json` a 15/30/60s | **Cero polling.** Los cue points vienen DENTRO del stream, por el canal SBM |
| Cover art desde Last.fm | No existe. ⚠️ Había una API key en claro en `player.js` que **nunca se usaba** |
| jQuery, Day.js, Flickity y `player-0.1.0.min.js` del CDN de NRM | Ninguno. La única dependencia externa es el SDK de Triton |
| El SDK cargado con la página | **A demanda**, al primer indicio de intención |
| `station: 'XHSONFM'` en la config | Sale del CMS (`estaciones.tritonMount`) y baja por `data-mount` |
| Carrusel Flickity de la programación dentro del player | La parrilla es `src/components/inicio/PanelSenal.astro`, en el Inicio |

Un agente que manda a editar archivos fantasma es peor que no tener agente: hace
perder una tarde y luego hace dudar del resto de la documentación.

---

## Archivos bajo responsabilidad

| Archivo | Qué le toca |
|---|---|
| `src/scripts/player.ts` | El núcleo: construir el SDK, la máquina de 6 estados, los cue points, el pre-roll VAST, el modal del anuncio, el volumen y la marquesina |
| `src/scripts/audio.ts` | 🔴 El **árbitro**: solo una fuente suena a la vez. Lo comparten radio, video, podcast y pista |
| `src/scripts/pista.ts` | Las pistas a demanda de Bonus Beat, en la MISMA barra. Un `<audio>` nativo, no Plyr |
| `src/scripts/senal.ts` | Que «HOY EN LA SEÑAL» avance solo, sin pedirle nada al servidor |
| `src/scripts/video.ts` | El visor de las cápsulas (Plyr a demanda). Entra aquí por el árbitro de audio |
| `src/components/Cabecera.astro` | **Solo los `data-*` y `#td_container` / `#td-telon`.** El marcado y el CSS son de `agents/frontend.md` |
| `src/lib/cms/estacion.ts` | De donde sale `tritonMount` |
| `src/lib/cms/aire.ts` | La bitácora, y hoy **solo** para el HISTORIAL |
| `src/pages/en-vivo/index.astro` | La sección de la señal. ⏳ Mínima a propósito |

> **No es dueño exclusivo de `Cabecera.astro`.** El marcado, el CSS y el plegado son
> de `agents/frontend.md`. **Los `data-*` son el contrato entre los dos** y no se
> renombran sin avisar: `#player[data-status]`, `[data-modo]`, `[data-mount]`,
> `[data-campo="sonando"]`, `[data-campo="hora"]`, `[data-campo="pista"]`,
> `[data-accion="play"|"volumen"|"progreso"|"directo"]`.

---

## 🔴 El «qué suena» viene DENTRO del stream, no de un JSON encuestado

Es el cambio de fondo respecto al v1 y conviene entenderlo antes de tocar nada.

El sitio viejo consulta `cancion.json` cada 15–60 s y de paso adivina los cortes
comerciales revisando si la `categoria` está en una lista. Dos problemas:

1. **Ese JSON refleja lo que hace el PLAYOUT, no lo que el oyente escucha.** Con el
   búfer del stream de por medio, el sitio muestra una canción que todavía no suena.
   Es un desfase que el polling no puede arreglar por más frecuente que sea — medido:
   **5 segundos**.
2. **Encuestar cuesta una petición por intervalo, por oyente, para siempre.**

Los cue points llegan por el canal **SBM** (el `_SBM` que se ve como `eventsource` en
la red), así que vienen **alineados con el audio** y solo cuando algo cambia. El SDK
ya tiene ese canal abierto: el sitio viejo lo tiene conectado y no lo usa.

🔴 **Y por eso `Base.astro` ya NO consulta la bitácora** (Carlos, 2026-09-03). Esa
consulta corría en CADA página del sitio para un dato que solo es cierto si alguien
está escuchando. ⚠️ El efecto visible: hasta que alguien pulsa play, la barra dice el
nombre de la estación en vez de una canción. **Eso es MÁS honesto, no menos** — antes
afirmaba saber qué sonaba para un oyente que no estaba oyendo nada.

⚠️ **Lo que NO se puede mover al SDK es el HISTORIAL** —«LO QUE SONÓ» del Inicio y de
`/en-vivo`—: los cue points solo cuentan el presente, y solo mientras haya una
conexión abierta. Eso sigue saliendo de `bitacora`, y por eso `src/lib/cms/aire.ts`
sigue vivo.

### Los cinco campos, verificados y no adivinados

Verificados el 2026-08-21 conectando al canal SBM directo (`XHSONFMAAC_SBM`) sobre la
señal real. Tres cosas de las que depende todo, y cada una ya rompió el «qué suena»:

- 🔴 **El tipo del cue point se llama `type`, NO `name`.** El canal manda `name:
  "track"`, el SDK lo renombra a `type` al construir el objeto, y el código
  preguntaba por `name`: **se descartaba el 100% de los cue points** y la barra se
  quedaba en «Beat 100.9» para siempre. ⚠️ Y lo destapó un endurecimiento anterior —
  la condición aceptaba también la cadena vacía, y ese hueco (que se cerró con razón)
  era lo único que dejaba pasar los cue points. **Cerrar un agujero sin comprobar qué
  pasaba por él es cómo se rompe algo arreglándolo.**
- 🔴 **TODO evento del SDK llega envuelto en `.data`.** El emisor común de los módulos
  entrega `{ data: <lo que el módulo emitió> }`, así que lo nuestro está en
  `e.data.cuePoint` y se leía `e.cuePoint`. ⚠️ La pista llevaba todo el tiempo veinte
  líneas más arriba: `alCambiarEstado` ya leía `e.data?.code`, y por eso la máquina de
  estados SÍ funcionaba.
- ⚠️ **`cue_time_duration` viene en DÉCIMAS de segundo**, no en milisegundos.
  Leerlo como ms daría 46 minutos para una canción de cuatro. (Los eventos VAST sí lo
  mandan en ms, pero llegan por otro evento.)

Y dos que parecen paranoia y no lo son:

- 🔴 **LISTA BLANCA ESTRICTA: solo `track` se pinta.** El SDK conoce siete tipos
  —`track`, `ad-break`, `custom`, `hls`, `metadata`, `speech`, `empty`— y el de
  `custom` es lo que cada estación configure, así que puede traer códigos internos. Ya
  se vieron cue points de `ad` con títulos como «FRASE BEAT 100.9 FM
  (ROMPECORTE)-01» y anunciantes como «RDF1382026 \ BANXICO CONTIGO 2026». Con lista
  negra, un tipo nuevo entra solo y aparece en la barra sin que nadie se entere.
- 🔴 **Una canción CADUCA sola, aunque no llegue nada nuevo.** Cuando los locutores
  hablan en vivo, **Triton no manda NADA** (medido en una captura de 2h44 del canal:
  los únicos tipos que existen son `track` y `ad`). Sin la caducidad, la barra se
  queda enseñando la última canción mientras alguien habla encima — que es
  exactamente lo que Carlos reportó. La duración sale del propio cue point, más 25 s
  de tolerancia porque el cue point llega ~5 s por delante del audio.

---

## Las reglas del player, y por qué

- 🔴 **El player es PERSISTENTE, y es requisito de producto.** El §4.1 del mapa de
  sitio lo dice: «el reproductor en vivo es persistente… es la afirmación, en la
  propia experiencia de usuario, de que Beat sigue siendo, antes que cualquier otra
  cosa, una estación de radio en vivo». De ahí `transition:persist` en la cabecera —
  sin él la señal se cortaría al cambiar de página. ⚠️ Y necesita el `<ClientRouter />`
  de `Base.astro`: estuvo faltando, así que el atributo estaba puesto y no servía de
  nada.
- 🔴 **`#td_container` y `#td-telon` van DENTRO del bloque persistente.** Es el
  `playerId` del módulo MediaPlayer, donde el SDK monta el elemento de audio y el
  pre-roll. ⚠️ Estuvo FUERA por un `</div>` mal puesto, y no se notaba porque la
  cabecera sí persistía: **lo visible seguía ahí y solo se iba el audio.**
- 🔴 **El SDK se carga A DEMANDA.** Medido en el cable: `td-sdk.min.js` son 363 KB
  gzip, y con el plugin `vastAd` arrastra el IMA de Google, que son 491 KB más y
  viajan **sin comprimir**. Total **854 KB**. Como el player vive en la cabecera, eso
  se bajaba en TODAS las páginas aunque nadie le diera play. Para comparar: el CSS del
  sitio entero son 10 KB gzip.
- 🔴 **Y se precarga al primer indicio de INTENCIÓN**, no cuando el navegador esté
  ocioso. Con `requestIdleCallback` los 854 KB salían de la ruta crítica pero se
  descargaban igual en cada visita: quien nunca da play pagaba los datos completos, y
  en datos móviles en México eso no es un detalle. «Intención» es acercar el puntero a
  la barra, enfocarla con el teclado o tocarla.
- 🔴 **Un fallo de carga NO se memoriza.** Antes se guardaba la promesa tal cual, así
  que un fallo —red inestable, CDN bloqueado, un bloqueador— quedaba memorizado como
  promesa RECHAZADA y **la radio no volvía a arrancar EN TODA LA SESIÓN** aunque la
  red se recuperara. El oyente da play, no pasa nada; da play otra vez, nada. Sin
  error visible y sin salida. Y siendo el player, los audio ads del pre-roll son
  ingresos.
- 🔴 **El mismo patrón en `iniciarPlayer()`**: la bandera `iniciado` se pone ANTES de
  construir para evitar reentradas, así que si el constructor lanzara se quedaría
  echada con `sdk` en null. Por eso hay un `try` que deshace lo andado. Es el patrón
  de «estado muerto sin salida» que `movimiento.md` §3 prohíbe, aplicado al audio.
- 🔴 **La intención de arranque se GUARDA hasta `playerReady`.** El SDK ignora
  `play()` hasta que dispara ese evento, así que el PRIMER clic de la sesión no
  reproducía nada y el segundo sí. Era el camino que toma **todo visitante nuevo**, y
  era silencioso: sin error, sin nada raro, solo un botón que parece no hacer caso.
- 🔴 **Hay un TOPE de conexión de 20 s.** Sin él, si Triton no llega nunca a
  `LIVE_PLAYING` —mount caído, un VAST que se cuelga sin emitir evento— el oyente se
  queda mirando «Conectando…» indefinidamente. 20 s es holgado a propósito: la cadena
  real son la descarga del SDK, el pre-roll y después la conexión al stream.
- 🔴 **El modal del anuncio se cierra solo a los 45 s.** Si `ad-playback-complete` no
  llega nunca, el telón se queda a pantalla completa y el sitio queda inservible. El
  v1 tiene ese riesgo abierto.
- 🔴 **Al PARAR se deja de anunciar la canción.** Si el oyente pausó, la barra no puede
  seguir diciendo qué suena: para él no suena nada, y la señal sigue corriendo sin él,
  así que al reanudar ya será otra.
- ⚠️ **`aria-busy` y no `disabled`** mientras conecta: deshabilitar el botón le
  quitaría el foco a quien navega con teclado, y el oyente debe poder cancelar una
  conexión que tarda.
- ⚠️ **Guarda contra listeners DUPLICADOS.** Con View Transitions este módulo puede
  volver a evaluarse en cada navegación, y como el botón vive en un bloque persistente
  **es el MISMO nodo**: sin la marca `data-cableado` acumularía un listener por página
  visitada, y a la quinta el clic dispararía cinco veces.
- ⚠️ **`audioAdaptive` solo cuenta dentro del módulo MediaPlayer.** El de nivel raíz es
  decorativo —no está en la config que el SDK lee— y se conserva porque los cuatro
  repos hermanos lo tienen y quitarlo invita a que alguien «arregle» el de arriba por
  simetría. Hoy el del módulo está en `false`, o sea que Beat opta por el mount fijo
  (MP3 48 kbps por HTTP progresivo, sin escalón al que caer). **Es sospechoso de ser
  la causa de los cortes que reportan los oyentes**, y sigue abierto.

---

## 🔴 El árbitro de audio: solo una fuente a la vez

`src/scripts/audio.ts` es pequeño y es el archivo que evita el peor bug de audio
posible. Cuatro fuentes pueden sonar en Beat: el radio (Triton), el video de una nota
(YouTube/Vimeo/mp4), el audio de un episodio, y las pistas de Bonus Beat.

Cada una se **registra** con una forma de pausarse y **reclama** el canal al empezar.
Funciona en los DOS sentidos, que es donde estaba el bug del sitio viejo: ahí el
player paraba el radio al abrir un video, **pero no al revés**.

- 🔴 **El registro vive en `window` a propósito.** El player y el media de una nota se
  cargan en módulos distintos y el bundler puede separarlos en chunks: sin un punto
  común compartirían la interfaz pero no la instancia, y cada uno tendría su propio
  registro vacío.
- 🔴 **El radio reclama el canal en el CLIC, no en `reproducir()`.** `reproducir()`
  solo corre cuando el SDK está listo, así que reclamar ahí dejaba una ventana de
  varios segundos —la descarga del SDK más el VAST— en la que el radio ya estaba
  «conectando» y el video de la nota **seguía sonando**. Los dos a la vez, que es
  exactamente lo que el árbitro existe para evitar.
- ⚠️ **Registrar REEMPLAZA, no acumula.** Con View Transitions una nota puede montarse
  varias veces en la misma sesión, y dos entradas con el mismo id dejarían una
  apuntando a un elemento que ya no está en el DOM.

### La barra tiene DOS modos, y no comparten estado

`#player[data-modo]` vale `directo` o `pista`. El botón de play lo comparten los dos
módulos —la barra es persistente y es el mismo nodo— así que **cada uno ignora los
clics que no son suyos** (`mandaLaPista()`). Sin eso, pulsar pausa sobre una pista
arrancaría además el radio.

- 🔴 **El título de la pista va en SU PROPIO elemento**, no reutilizando el del
  directo. `player.ts` guarda el texto original de `[data-campo="sonando"]` para
  restaurarlo tras un corte comercial; si la pista escribiera ahí, ese «original»
  pasaría a ser una canción de Bonus Beat y **el radio volvería del anuncio anunciando
  la pista**. Dos modos, dos elementos, cero estado compartido.
- 🔴 **Y hay una puerta de vuelta visible al directo.** Mientras suena una pista el
  oyente está FUERA de la señal, y este sitio afirma ser una radio en vivo: sacar a
  alguien del directo sin una salida visible sería una trampa, no una función. ⚠️ Dice
  «EN VIVO», no «volver al directo» — «directo» es español de España (Carlos,
  2026-09-03).

---

## Diagnóstico: ya existe, úsalo

🔴 El «qué suena» falla EN SILENCIO: si el cue point no llega, o llega y se descarta,
la barra se queda con el nombre de la estación y **no hay forma de distinguir las dos
cosas mirando la pantalla.** Ya costó dos arreglos a ciegas, así que hay una traza:

```
?depurar=player   → la enciende, y se queda encendida al navegar
?depurar=no       → la apaga
sessionStorage.beatDepurar = '1'   → desde la consola
```

Enseña cada `stream-status`, cada cue point **con el motivo de su descarte**, y a los
45 s sonando avisa si llegaron cero cue points. Ese aviso es el que separa los dos
diagnósticos: cero cue points apunta al canal SBM y a cómo está configurada la
estación en Triton, no a este código.

⚠️ **No va detrás de `import.meta.env.DEV` a secas**, que es lo que había: el sitio
que se mira es el compilado, y ahí ese log no existiría. **Un diagnóstico que solo
funciona donde no está el problema no sirve de nada.**

---

## Lo que este agente NO hace

- **El marcado y el CSS de la barra** —la onda, la marquesina, el plegado, los dos
  modos— son de `agents/frontend.md`. Este agente pone el comportamiento; los `data-*`
  son la frontera.
- **La publicidad de DISPLAY** (GPT, los huecos, las medidas) es de `agents/ads.md`.
  ⚠️ Se cruzan en el ad unit: el VAST del pre-roll lo arma `player.ts` con
  `PUBLIC_GAM_NETWORK_ID` / `PUBLIC_GAM_AD_UNIT`. 🔴 **Jamás se hardcodea** — en los
  repos hermanos está pegado por copy-paste como `/<network>/StereoCien`, y servir
  impresiones de una estación a la cuenta de otra es un bug de dinero. Hay un grep en
  CI (`scripts/guardas.mjs`) que lo vigila.
- **A dónde llegan los eventos** — es de `agents/analytics.md`. Este agente los EMITE
  con `eventoTriton()`. ⚠️ Y hoy no llegan a ninguna parte: no hay contenedor de
  medición cargado en v2. Está documentado allí; no se arregla desde aquí.
- **Las consultas al CMS** — son de `agents/content.md`, incluidos
  `src/lib/cms/estacion.ts` y `aire.ts`. Este agente solo consume `tritonMount` y el
  historial.
- **El `<head>`** — de `agents/metadata.md`.
- **Diseñar `/en-vivo`.** Es mínima a propósito: su pantalla no está en el lienzo v14,
  y `transmisiones` y `bitacora` están vacías en producción. Inventarle un diseño es
  una decisión de Carlos, no una traducción.
- **Cambiar el mount o la configuración de la estación en Triton.** Eso vive en el
  panel de Triton y en el CMS, no aquí.

---

## Cómo se verifica

🔴 **Con la traza encendida, y navegando.** Los dos fallos históricos de este agente
—el audio que se corta al navegar y el cue point que se descarta— son invisibles en
una sola página recargada.

```
1. Abre  /?depurar=player  y dale play. En la consola tienen que salir los estados
   del stream y, en menos de 45 s, al menos un cue point con «✅ a pantalla».
2. Navega a una nota y vuelve al Inicio SIN tocar el player. El audio no se corta y
   la barra sigue diciendo la misma canción.
3. Abre el video de una nota: el radio se calla. Dale play al radio: el video se
   calla. Los DOS sentidos — el v1 solo hacía uno.
4. Repite el paso 2 cinco veces y dale play. Si suena una vez, la guarda de
   listeners funciona; si dispara cinco, se rompió.
```

```js
// El testigo de persistencia. Antes de navegar:
document.getElementById('td_container').dataset.testigo = '1';
// Después de volver: si no está, el nodo se reemplazó y el audio se habría cortado.
```

```bash
# Que el mount baje del CMS y no esté hardcodeado en ninguna parte.
curl -s http://localhost:4321/ | grep -o 'data-mount="[^"]*"'
grep -rn "XHSONFM" src/scripts/ src/components/    # solo debe salir en comentarios

# La guarda del ad unit, que cubre el VAST del pre-roll.
pnpm check
```

⚠️ **Un `vastAd` bloqueado por un adblocker NO es un bug**: el stream funciona igual y
el SDK lo avisa por `adBlockerDetected`. Lo que sí es un bug es que el telón se quede
puesto — para eso está el cierre a los 45 s.

⚠️ **Y el pre-roll va UNA vez por sesión**, no en cada play. Si suena en el segundo
play, se rompió `yaSonoElAnuncio`.
