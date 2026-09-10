# Pendientes después del corte — 10 sep 2026

El corte se hizo el 10 sep 2026. `beatdigital.mx` sirve el v2. Este documento es lo
que quedó abierto, ordenado por lo que cuesta dejarlo así.

Cada punto dice **cómo se comprobó**, porque no todos tienen el mismo respaldo:

| | |
|---|---|
| ✅ **medido** | comprobado contra el sitio vivo o reproducido en una terminal |
| 🟡 **leído** | dos revisores independientes lo confirmaron leyendo el código, sin ejecutarlo |
| ⬜ **sin verificar** | lo propuso un revisor y nadie lo ha contrastado. Puede estar mal |

---

## Lo que pasó el día del corte, para que no se pierda

El primer intento del corte **no cambió nada** y el script lo reportó como
«responde, pero NO parece el v2». La causa no estaba en el vhost nuevo ni en el
script:

🔴 **`beatdigital.mx` era un `ServerAlias` del vhost de `oyedigital.mx`**, en
`000-default-le-ssl.conf`, en el puerto 443. Ese archivo se carga antes que el
`020`, y Apache se queda con el PRIMER vhost que reclama un nombre. El `a2ensite`
del 020 no le quitaba el dominio a nadie: el 020 simplemente no recibía peticiones.

Se quitó ese alias **a mano en la VM**, y es el único cambio del lanzamiento que
**no está versionado en este repo**. Está respaldado en
`/root/respaldo-000-default-le-ssl.conf.bak`.

⚠️ La premisa del `020` —«este archivo SUMA, no reemplaza»— es verdad solo cuando
nadie más reclama el nombre. Antes de dar por bueno un corte por vhost, la
comprobación que faltaba es `apachectl -S | grep -i <dominio>`, que enseña los
alias; `apachectl configtest` **no** avisa de un nombre duplicado entre vhosts.

Se descartó por el camino una hipótesis que parecía buena: que el
`grep -qi "AQUÍ LA MÚSICA SE ELIGE"` del script fallara por el plegado de acentos
fuera de un locale UTF-8. Se midió en la VM: `LANG=C.UTF-8` y el `grep` casa. No
era eso.

---

## 1 · La analítica del sitio real cuenta también el tráfico de preproducción ✅

`v2.beatdigital.mx` sigue habilitado y sirve **el mismo proceso** que el sitio real,
así que arrastra el mismo `GTM-PN2NKB2P` y el mismo comScore `6906652` que se
hornearon para producción. Medido: el HTML de v2 los trae.

Los anuncios sí están protegidos por host —`Anuncio.astro:231` comprueba
`!noIndexarHost(...)`— pero los cuatro contenedores de medición de `Base.astro`
(508, 563, 594, 627) solo miran que la variable no venga vacía.

**Arreglo**, y es el mismo patrón que ya usa `Anuncio.astro`: añadir
`!noIndexarHost(Astro.url.hostname)` a la condición de los cuatro. Deja la
preproducción sin medir, que es lo correcto, y no obliga a apagar v2.

---

## 2 · Contenido duplicado por la barra final ✅

Las dos formas de la misma URL responden 200 y cada una se declara canónica de sí
misma:

    /beat-scanner   ->  <link rel="canonical" href="https://beatdigital.mx/beat-scanner">
    /beat-scanner/  ->  <link rel="canonical" href="https://beatdigital.mx/beat-scanner/">

Google ve dos páginas idénticas y reparte la autoridad entre las dos. Muerde ahora
justo donde más duele: son las URLs que heredan los enlaces del v1.

**Arreglo** (`src/layouts/Base.astro:196`): normalizar la barra antes de construir
el canónico, para que las dos formas apunten a una sola.

---

## 3 · `/sitemap-index.xml` da 404 ✅

Es el nombre que genera el v1, y probablemente el que está dado de alta en Search
Console. Medido: 404 en el sitio nuevo.

**Antes de arreglarlo, mirar qué sitemap está registrado.** Si es ese, un 301 a
`/sitemap.xml` en la tabla de redirecciones; si Search Console ya apunta al bueno,
no hay nada que hacer y este punto se cierra.

---

## 4 · `PUBLICIDAD_TOKEN` sigue sin ponerse 🟡

Sin ella, las campañas vendidas **no cuentan impresiones ni clics**. Es de runtime,
así que no hace falta reconstruir — pero sí reiniciar el servicio, y desde el corte
un reinicio son unos segundos de 502 **en el sitio real**. Conviene hacerlo fuera
de hora punta, no «cuando sea», que es como lo describe el plan.

---

## 5 · GA4 va a contar las páginas vistas al doble 🟡

Lo avisa `.env.example:86`: hay que **desmarcar** en el panel de GA4 «Medición
mejorada → Vistas de página → Cambios de página basados en eventos del historial del
navegador». Viene encendido por defecto y se dispara con el `pushState` del
ClientRouter de Astro.

Desde hoy GTM está recibiendo tráfico real, así que cada día que pase son datos que
hay que descontar después.

---

## 6 · La tarjeta de compartir del Inicio es WebP ⬜

WhatsApp no la pinta. Es de build, así que entra en el siguiente despliegue o no
entra. Sin verificar: hay que comprobar qué formato sirve hoy el CMS antes de
tocarlo.

---

## 7 · Los tres defectos de `scripts/cambiar-dominio.sh` ✅

Reproducidos en una terminal, no deducidos. Ninguno está arreglado.

1. **`set -euo pipefail` + `comando; exigir $?`**: la primera comprobación que falla
   mata el script **sin imprimir nada**. El bloque «N comprobación(es) fallaron. No
   cambio nada.» es código inalcanzable. Es lo que pasó cuando faltaba el vhost: el
   script murió mudo.
   **Arreglo:** `rc=0; <comando> || rc=$?; exigir "$rc" "..."` en los nueve sitios.

2. **El `trap` de vuelta atrás imprime un error de sintaxis.** Con `VHOST_VIEJO`
   vacío —el caso del plan— sale `a2ensite <el viejo> && …`, y bash contesta
   `syntax error near unexpected token '&&'`: no ejecuta nada, ni el `a2dissite` ni
   el `reload`. Se imprime siempre, salga bien o mal el corte.
   **Arreglo:** sin `VHOST_VIEJO`, imprimir solo
   `a2dissite $VHOST_NUEVO && systemctl reload apache2`. Nunca un `<marcador>`
   dentro de una línea pensada para copiar y pegar.

3. **`VALIDAR_NUEVO=1` después del corte deshabilita el sitio vivo** y lo reporta en
   verde: enlaza, valida, desenlaza — y lo que desenlaza es el vhost que está
   sirviendo el dominio.
   **Arreglo:** abortar al entrar en ese bloque si `$HABILITADOS/$VHOST_NUEVO` ya
   existe.

---

## 8 · `ads.txt`: dos sellers, no catorce 🟡

Un revisor lo dio por «siete semanas atrás, 14 sellers perdidos». **Medido: es
falso.** La rama tiene 531 líneas y `main` 529, y solo aparecen dos nombres en el v1
que no estén en el nuevo: `Media.net` y `flashb.id`. Vale la pena confirmarlos con
AdOps, pero no es una fuga de inventario.

Sigue abierto lo que ya sabíamos: `viralize.com` sin confirmar (comparte el seller
id 7587 con `showheroes.com`, así que quitarlo puede dejar inventario sin pujar).

---

## 9 · La limpieza del paso 9 del plan es más delicada de lo que dice ⬜

`sudo rm` de `oye897*` y `wordpress-*` **sin comprobar si están habilitados**. Un
enlace colgado en `sites-enabled` rompe TODA recarga futura de Apache, incluida la
vuelta atrás. Y ahora hay una razón más: `000-default-le-ssl.conf` dejó de ser
inerte el día que le quitamos el alias.

Antes de cualquier `rm`: `ls -l /etc/apache2/sites-enabled/ | grep -E 'oye897|wordpress'`
y `a2dissite` de lo que aparezca.

---

## 10 · Lo que el corte sigue sin arreglar, y se llena desde el CMS

Sin desplegar, cuando haya contenido: `programas`, `autores`, `paginas` y `podcasts`
en 0 · redes sociales vacías en las 4 estaciones · `especiales` con 1 documento, y
la rejilla del archivo excluye al vigente · una lista se llama «Bonus Beat de
Prueba» · dos medidas de anuncio sin dar de alta en Ad Manager.

---

## El resto de la auditoría

La revisión se corrió con ocho revisores y dos escépticos por hallazgo, y se detuvo
a medias por coste. Estado real: **87 hallazgos**, de los cuales 2 confirmados por
los dos escépticos, 30 descartados, 5 disputados y **50 sin verificar**.

Los 50 sin verificar **no son una lista de tareas**: ahí dentro hay lecturas
equivocadas mezcladas con hallazgos buenos, y el punto 8 de arriba es el ejemplo de
por qué no conviene tratarlos como ciertos. Quedan crudos en el journal del
workflow, y la revisión es reanudable sin repetir lo ya hecho.

Los que descartaron los escépticos y **no** hay que volver a levantar: las cuatro
secciones del v1 en 404 (arregladas en `c71baba` antes del corte), la analítica
ausente del artefacto (resuelta poniendo las cuatro variables en el `.env` de la
VM), y el `www` (cerrado el mismo día en `80b317b` y `001e99d`).
