# Movimiento e interacción — el contrato

El design system dice cómo se ve el sitio. Esto dice cómo se **comporta**.

🔴 **Por qué existe.** Sin este documento acabamos donde acabamos: cinco tarjetas
con tres comportamientos distintos, una regla vieja peleando con una nueva por la
misma propiedad, y el mismo tipo de fallo tres veces. Ninguna de esas tres cosas
fue un descuido puntual — las tres salen de no haber decidido por escrito qué le
toca a cada rol.

Esto no es una lista de deseos. Es una **tabla de decisiones**: cada fila ya está
resuelta, y apartarse de ella exige razón escrita en el mismo commit.

---

## 1. Un efecto por rol, y un solo efecto por elemento

| Rol | Tratamiento | Dónde vive |
|---|---|---|
| Título de sección o titular display | **Descifrado** al entrar en pantalla, una vez | `escribir.ts` · `[data-escribir]` |
| Imagen editorial | **Parallax** ligado al scroll. Nada al entrar. | `animation-timeline: view()` |
| Lista de texto | **Cascada** de entrada, 70 ms entre ítems | `[data-cascada]` |
| Cabecera de sección | **Barrido** de luz, una vez | `[data-barrido]` |
| Cifra que es un dato | **Conteo** desde cero | `[data-contar]` |
| Tarjeta con enlace | **Luz que sigue al cursor** + **inclinación** + la foto se desplaza | `cursor.ts` · `[data-luz]` |
| Enlace de «ver más» | Texto + subrayado que se dibuja + flecha que sale y entra | `Remate.astro` |
| Fondo del sitio | **Luz que recorre la cuadrícula**, posición y ritmo al azar | `rejilla.ts` |

⚠️ **Nunca dos efectos escribiendo la misma propiedad CSS sobre el mismo
elemento.** Es lo que nos costó el hover: dos reglas de la misma capa y la misma
especificidad peleando por `transform`, y el empate lo resolvía el orden en el
archivo — o sea, por accidente. Si dos gestos deben convivir sobre un elemento, van
en propiedades distintas (`transform`, `translate`, `scale`, `rotate` son
independientes y se componen).

**El reparto vigente sobre una foto de tarjeta:**

| Propiedad | Quién la usa |
|---|---|
| `translate` | parallax del scroll |
| `scale` | el aire que el desplazamiento necesita |
| `transform` | el desplazamiento hacia el cursor |

---

⚠️ **La imagen NO tiene animación de entrada, y es una decisión.** Hubo una: una
máscara que subía desde abajo al aparecer. Se retiró porque se leía como una
cortinilla abriéndose, y en una rejilla de tarjetas eso ocurre varias veces por
pantalla — con la agravante de que se repetía en cada vuelta al inicio. Lo que
conserva la imagen es el parallax, que **responde al lector** en vez de ejecutarse
solo. Si alguna vez vuelve a plantearse una entrada para la media, esta es la razón
por la que no la hay.

---

## 2. Lo que NO lleva movimiento

- 🔴 **Las creatividades de publicidad.** Es contenido de un tercero servido por su
  ad server. Lo que se le monte encima no lo hemos acordado con nadie, y en un
  formato medido por viewability, alterarlo es meterse donde no toca.
- **El texto de cuerpo.** Partirlo en letras destruye enlaces y negritas, y un
  párrafo que se mueve mientras se lee es un estorbo, no un efecto.
- **La interfaz funcional del player.** Los controles contestan (hover, foco), pero
  no se animan solos: son mandos, no decoración.
- **Cualquier cosa por debajo del umbral de texto grande** si el efecto baja la
  opacidad. Ver §4.

---

## 3. 🔴 Ningún efecto puede dejar el contenido inalcanzable

Esta es la regla que más veces hemos roto —tres— y la que más caro sale, porque el
fallo no se ve en desarrollo: se ve en producción, como una foto en negro o un
titular ilegible.

**Tres condiciones, y las tres son obligatorias:**

1. **Sin JavaScript, todo se ve.** El estado escondido cuelga de un atributo que
   pone el script (`[data-animando]`, `[data-escribiendo]`). Si vive suelto en el
   CSS, un fallo de carga lo deja escondido para siempre.

2. **No se esconde nada hasta que el mecanismo que lo devuelve demuestre que
   funciona.** El observador entrega su primera tanda ANTES de que se esconda nada.
   Si no entrega —pestaña oculta, motor sin soporte— no se esconde nada y la página
   se ve completa.

3. **El estado final no depende de que una animación termine.** Al acabar se retira
   el andamiaje, y el elemento vuelve a su estado natural. Una transición que no
   corre no puede dejar una foto recortada.

**Y una prohibición de forma:** ninguna bandera que se ponga antes de una llamada
asíncrona puede liberarse *solo* dentro del callback. Si el callback no llega, la
bandera se queda echada y nada vuelve a intentarlo. Se guarda el identificador y se
cancela, o se limpia también en el camino de error. Nos costó la inclinación de las
tarjetas y, en `player.ts`, la radio entera de la sesión.

---

## 4. Contraste, medido y no estimado

Todo efecto que baje la opacidad del texto tiene que seguir cumpliendo WCAG 1.4.3
**en su estado apagado**, no solo al terminar.

| | umbral | a 0.4 de opacidad |
|---|---|---|
| Texto normal | 4.5:1 | bajada gris 16px → **2.37 ❌** |
| Texto grande (≥24px, o ≥18.66px en negrita) | 3:1 | display blanco 26px → **3.37 ✅** |

Por eso el descifrado **comprueba el tamaño en código** antes de partir nada: sobre
texto chico no actúa. La garantía es de código, no de comentario.

---

## 5. Menos movimiento

`prefers-reduced-motion: reduce` apaga todo lo de este documento. No lo acelera: lo
apaga. Un texto en movimiento perpetuo, una luz que persigue el cursor o un fondo
que nunca para son exactamente lo que esa preferencia existe para quitar.

Cada efecto lo comprueba **en el script**, además de en el CSS: así ni siquiera se
parte el texto en `span` ni se registran oyentes.

---

## 6. Forma de la media: retícula o pieza suelta

La pregunta «¿por qué unas imágenes tienen esquinas redondeadas y otras no?» tiene
respuesta, pero no era la que parecía. No son dos criterios en conflicto: son dos
**contextos** distintos, y los dos son deliberados.

| Contexto | Radio | Por qué |
|---|---|---|
| Pieza de una **retícula** — mosaico, índice de Scanner | **0** | El `gap: 2px` sobre `--border-hairline` ES la línea que separa las piezas. Redondearlas rompe la retícula y deja huecos grises en las esquinas. |
| Pieza que **flota** sobre el fondo — tarjetas apiladas, visor, hero de nota | `--r-media` | Necesita borde propio: no hay retícula que la delimite. |
| **Publicidad** | lo que sirva el anunciante | No se toca. Ver §2. |

Se usa el token semántico `--r-media`, no `--r-3`. Valen lo mismo hoy, pero uno
dice *qué es* y el otro *cuánto mide*: el día que la marca cambie el radio de la
media, se cambia en un sitio.

⚠️ Inventariado el 2026-08-27: solo las tarjetas apiladas cumplían esto. El hero de
la nota y el marco del visor estaban en cero por descuido, no por decisión.

---

## 7. Qué recibe el hover del cursor

Mismo criterio: no es «todas las imágenes», es **todo lo que sea un enlace a otra
página**.

| | Recibe |
|---|---|
| Tarjeta que es un enlace | luz + inclinación + la foto se desplaza |
| Tarjeta que ya usa su `transform` (la pila) | luz + la foto se desplaza, **sin** inclinación |
| Media que NO es un enlace — hero de nota, visor | nada: no lleva a ningún sitio, así que no debe insinuar que sí |
| Publicidad | nada |

---

## 8. 🔴 El sitio va en blanco y negro

Decisión de Carlos, 2026-08-27. El design system trae una paleta cálida
—`--luz-ambar`, `--luz-coral`, `--luz-ink`— y **Beat no la usa para texto**.

| Qué | Cómo |
|---|---|
| Lo que resalta | **blanco y en negrita**, y si hace falta con luz (`beat-resplandor`) |
| Lo demás | gris, o sin negrita |
| Enlaces | blanco **+ subrayado** |
| Sección en curso en la nav | blanco, **negrita** y con luz; el resto gris y sin negrita |

✨ Se aplica **redefiniendo los tokens**, no cambiando los usos:

```css
--text-accent: var(--mist-0);
--text-live:   var(--mist-0);
--text-link:   var(--mist-0);
```

⚠️ Quedaban dos naranjas fuera del alcance de los tokens, y se cerraron el
2026-09-01:

- **La línea coral bajo la sección activa de la nav.** Estaba ahí porque los cinco
  enlaces se pintaban idénticos —`font-bold text-mist-0` como utilidades en el
  marcado— y no había nada que distinguiera al activo, así que hubo que añadirle
  algo encima. Con los inactivos en gris y sin negrita, el activo se distingue por
  lo que ya es. **El portador de la accesibilidad pasa a ser el PESO**, que no es
  color y por tanto cumple WCAG 1.4.1 sin necesidad de la línea.
- **El acento de Plyr** (`--plyr-color-main`), que era la barra de progreso del
  visor de cápsulas: naranja a pantalla completa.

⚠️ Y una trampa de capas que se repite: el color y el peso NO pueden ir como
utilidades de Tailwind en el marcado si `beat.css` tiene que poder cambiarlos. Las
utilidades van en una capa POSTERIOR a `proyecto`, así que desde ahí no hay
especificidad que valga.

Eran 14 usos en siete archivos. Cambiarlos uno a uno garantizaba que el próximo
componente volviera a traer naranja, porque el token seguiría diciendo ámbar.
Redefiniéndolo, quien escriba `--text-accent` obtiene el color correcto sin
enterarse de que hubo una decisión — que es como debe funcionar un token.

⚠️ Los `--luz-*` NO se tocan. Siguen sirviendo en superficies, bordes y las estelas
de marca, donde el umbral es 3:1 y el naranja es identidad, no texto. Lo que cambia
es a qué apunta el TEXTO.

🔴 **Y hay UNA excepción, exactamente una: el punto de «al aire» va en rojo**
(`--rojo-aire`, decisión de Carlos del 2026-09-03). Se sostiene porque no es
decoración: el rojo de «al aire» es la luz de tally de un estudio, una convención
que significa algo concreto. Un punto blanco parpadeando no dice «estamos
emitiendo»; dice que algo parpadea.

Que sea el ÚNICO color de la interfaz es lo que lo hace funcionar: donde nada más
tiene tono, el ojo va ahí solo. En cuanto haya un segundo color, este deja de
significar. **Si alguna vez hace falta otro acento, la pregunta no es «¿cuál?»
sino «¿a costa de qué?».**

⚠️ Y el enlace pierde el color pero **conserva el subrayado**, que ya tenía. Sin él
esto rompería WCAG 1.4.1: el color no puede ser lo único que distingue un enlace.

---

---

## 9. 🔴 El cromo de un interior, y qué es una tira de pastillas

Decisión de Carlos, 2026-09-01. Son dos reglas y salen del mismo problema: había
**dos controles con la misma pinta haciendo cosas distintas**.

### La barra oscura no se muestra en un interior

Fuera del Inicio, la página nace como si ya se hubiera hecho scroll: solo la barra
CLARA del player, con su wordmark y su hamburguesa. Lo decide `Base.astro` por
RUTA (`data-vista` en el `body`), no cada página — lo que hay que acordarse de
poner en cada archivo nuevo es lo que un día se olvida.

Dentro de una sección, lo que orienta es dónde estás, y eso ya lo dice la tira de
secciones. Dos navegaciones apiladas repiten el mismo trabajo y se comen 56px de
la primera pantalla justo donde empieza a leerse.

⚠️ La cabecera lleva `transition:persist`, así que su marcado del servidor se
descarta al navegar. El estado se reconcilia en `astro:after-swap` —antes de
pintar— y NO en `astro:page-load`, que llega un fotograma tarde y deja ver la
barra oscura aparecer y plegarse.

### Una tira de pastillas son las SECCIONES, nunca un filtro

| | Forma | Dónde |
|---|---|---|
| Navegar el sitio | **pastillas**, la activa invertida en blanco | `NavSecciones.astro`, arriba del titular |
| Filtrar una lista | **texto con subrayado**, la activa en negrita | dentro de la página, pegado a lo que filtra |

🔴 Y sin «TODO» en las secciones: no hay nada que reiniciar, porque una sección no
es un estado de filtro.

De dónde sale: en el Scanner la tira eran las CATEGORÍAS de `noticias`, y las que
la redacción creó se llaman igual que las secciones —`Agenda`, `Beat Scanner`,
`Bonus Beat`, `Fenómeno Residente`—. Parecía el menú del sitio y no lo era: pulsar
«Fenómeno Residente» llevaba a un listado de notas etiquetadas, no a la sección.
La Agenda del Inicio repetía el mismo gesto con sus tipos de evento.

**La regla general: si dos controles hacen cosas de distinto alcance, tienen que
verse distintos.** Cuando la forma no significa nada, el lector deja de leerla.

### Nada de bajadas de sección

Ninguna cabecera de interior lleva una frase describiendo la sección. Eran relleno
—«Notas, entrevistas y reportajes…», «TRES TRACKS CADA VIERNES»—, prometían cosas
que el sitio no sostiene, y empujaban el contenido real media pantalla hacia
abajo. Lo que describe la sección va en la `<meta description>`, que es quien lo
lee.

Lo que sí va encima del titular es un **dato**: `ACTUALIZADO 21 AGO`, `7 TEMAS`,
`2 EDICIONES · 21 AGO`. Un dato informa; una descripción le repite al lector dónde
acaba de entrar.

---

## 10. 🔴 Un hueco de publicidad se reserva, y luego desaparece

Las dos mitades hacen falta, y por razones distintas:

- **Se reserva** con su medida antes de que llegue nada. Si el espacio apareciera
  al cargar el creativo, todo lo de abajo se movería: eso es CLS y penaliza.
- **Desaparece** si no hay nada que poner. Una banda negra de 350px encabezando el
  Inicio, vacía, no es un marco: es un agujero en lo primero que se ve. Es lo que
  pasaba, porque las medidas de portada del lienzo (1280×350) todavía no existen
  en Ad Manager y el hueco no se llenaba nunca.

Lo cierra `anuncios.ts` con `data-vacio`, y por DOS caminos:

1. GAM contesta «sin relleno» (`slotRenderEnded` con `isEmpty`).
2. **Pasa el plazo y GAM no contesta** — un bloqueador, un `gpt.js` que no bajó,
   la red que corta `securepubads`.

🔴 El segundo no es un extra: es el modo de falla MÁS COMÚN, y sin él la banda se
queda abierta para siempre. Es el patrón de «bandera que solo se suelta dentro del
callback» de §3, aplicado al dinero.

⚠️ Y `data-vacio` se RETIRA cuando sí hay anuncio. Si sobreviviera a una
navegación, el hueco quedaría escondido con un creativo dentro: servido,
facturado y sin que nadie lo vea.

**La portada admite varias campañas a la vez** y rota entre ellas por MINUTO, en
el servidor. No es un carrusel, a propósito: uno que cambia solo cae bajo WCAG
2.2.2 (haría falta poder pararlo), descarga N creativos de 1280×350 para enseñar
uno, y la entrega se mide en impresiones, no en segundos en pantalla. Y la
elección es determinista y no `Math.random()`: la respuesta se cachea en el borde,
así que una elección al azar quedaría congelada para todos los lectores de ese TTL
— la campaña «rotatoria» sería siempre la misma.


## 11. Cómo se verifica

🔴 **Recargar no basta.** Los tres fallos de contenido inalcanzable aparecieron
solo en el flujo **Home → nota → atrás**, porque el estado vive en el DOM y el DOM
sobrevive a la navegación.

⚠️ Y el servidor de desarrollo **sirve hojas de estilo viejas** tras una navegación
del lado del cliente. Nos ha engañado cinco veces. Ante cualquier duda:
`pnpm build && CMS_URL=… node dist/server/entry.mjs`, o reiniciar el servidor.

⚠️ El panel del navegador reporta `visibilityState: hidden`, y con eso están
CONGELADAS las transiciones, `requestAnimationFrame`, el `IntersectionObserver`,
los eventos de scroll y las líneas de tiempo de scroll. Un elemento correctamente
animado y uno atascado se leen IGUAL. Para medir el estado de destino, inyecta
`* { transition: none !important; animation: none !important }` antes de leer — o
mejor, lee el DOM (atributos, clases) en vez de valores calculados.

🔴 **Quinto caso, 2026-09-01:** la marca de «sección en curso» de la nav se
quedaba pegada al navegar. La pinta el servidor, y la cabecera es persistente, así
que el nodo que sobrevive es el de la página ANTERIOR: entrar a Agenda y volver al
Inicio dejaba «AGENDA» marcada sobre el mosaico del Inicio, y le decía «página
actual» a un lector de pantalla desde una sección en la que ya no estabas. Se
reconcilia en `astro:after-swap`, con **la misma regla que el servidor** — si las
dos divergen, la marca cambia al navegar y no se sabe cuál manda.

**La lección general, que ya va por tres formas distintas: nada que dependa de la
RUTA puede quedarse escrito dentro del bloque persistente.** Ni el estado plegado,
ni la sección activa, ni lo que venga después.

🔴 **Cuarto caso, 2026-09-01, cazado exactamente en ese flujo:** al volver de un
interior al Inicio la barra oscura se quedaba plegada. La causa era una lectura
`!!cabecera.dataset.compacta` sobre un atributo que se escribe como
`data-compacta` a secas — su valor es la CADENA VACÍA, y `!!''` es `false`. El
estado que se creía tener nunca coincidía con el real, así que la función se salía
por su atajo sin tocar nada. El bug llevaba semanas en el archivo y solo se
manifestó cuando algo distinto del scroll empezó a poner el atributo. **Para leer
un atributo sin valor, `hasAttribute`.**
