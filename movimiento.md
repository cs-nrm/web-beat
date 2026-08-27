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

## 8. Cómo se verifica

🔴 **Recargar no basta.** Los tres fallos de contenido inalcanzable aparecieron
solo en el flujo **Home → nota → atrás**, porque el estado vive en el DOM y el DOM
sobrevive a la navegación.

⚠️ Y el servidor de desarrollo **sirve hojas de estilo viejas** tras una navegación
del lado del cliente. Nos ha engañado tres veces. Ante cualquier duda:
`pnpm build && pnpm preview --port 4322`, o reiniciar el servidor.
