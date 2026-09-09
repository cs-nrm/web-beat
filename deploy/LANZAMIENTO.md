# Lanzamiento — 10 sep 2026, 10:09

`beatdigital.mx` deja de servir el v1 y sirve el v2.

---

## ⏪ Vuelta atrás — léelo primero

Dos comandos, segundos, sin DNS de por medio:

```bash
sudo a2dissite 020-beatdigital && sudo systemctl reload apache2
```

Funciona porque el corte **suma** un vhost en vez de quitar uno: `000-default`
sigue en su sitio sirviendo el v1 estático, intacto. Al deshabilitar el nuevo, el
comodín vuelve a atender `beatdigital.mx` como hoy.

El script lo imprime al terminar, salga bien o mal.

---

## Los pasos, en orden

Cada uno dice qué esperar. Si algo no coincide, **para** y revisa antes de seguir.

### HOY

**1 · Desplegar v2 con la tabla de redirecciones**

```bash
cd /var/www/web-beat-v2 && git pull --ff-only origin beat && sudo ./scripts/desplegar-v2.sh
```

→ Termina en `✓ v2 desplegado en <commit>`.
Es el único paso que TIENE que estar hecho antes del corte.

**2 · Copiar el vhost**

```bash
sudo cp /var/www/web-beat-v2/deploy/apache/020-beatdigital.conf /etc/apache2/sites-available/
```

→ Sin salida. **No libera nada**: Apache solo lee `sites-enabled`, y esto no
recarga nada.

**3 · Ensayo, validando el vhost nuevo**

```bash
sudo VHOST_NUEVO=020-beatdigital.conf VALIDAR_NUEVO=1 ./scripts/cambiar-dominio.sh
```

→ Todo en verde, salvo el aviso de `www`, que es esperado.
→ **No recarga Apache.** `VALIDAR_NUEVO=1` enlaza el vhost un instante para que
Apache lo analice y lo desenlaza; sin recargar, el sitio sigue en el v1.

**4 · Decidir las dos que caducan hoy**

- `PUBLIC_METRICOOL_HASH` es de BUILD: si no entra hoy, ponerlo después obliga a
  reconstruir el sitio ya lanzado.
- `PUBLICIDAD_TOKEN` es de runtime, pero sin ella las campañas vendidas no cuentan
  impresiones ni clics.

### MAÑANA, 10 SEP

**5 · Repetir el ensayo (10:00)**

```bash
sudo VHOST_NUEVO=020-beatdigital.conf ./scripts/cambiar-dominio.sh
```

→ Todo en verde. Confirma que nada cambió durante la noche.

**6 · El corte (10:09)**

```bash
sudo VHOST_NUEVO=020-beatdigital.conf CONFIRMAR=1 ./scripts/cambiar-dominio.sh
```

→ ~20 segundos. Tiene que terminar en:
`✓ beatdigital.mx sirve el v2 y está indexable`
→ 🔴 La línea que importa es `✓ INDEXABLE: <meta robots> dice index, follow`.

**7 · Comprobar a mano**

```bash
curl -sI https://beatdigital.mx/news/ | head -2
curl -s https://beatdigital.mx/ | grep -c 'href="/noticias/'
```

→ `301` hacia `/beat-scanner`, y un número ≥ 1.
→ Y en el teléfono: que suene el directo, que una canción abra el visor y que
«En vivo» devuelva la señal.

**8 · Ampliar el certificado a www**

```bash
sudo certbot certonly --webroot -w /var/www/acme -d beatdigital.mx -d www.beatdigital.mx --expand
```

→ Ahora sí funciona: el vhost nuevo ya sirve el ápex y lleva el `Alias` del reto.
Antes del corte falla con 404 — comprobado el 9 sep.

**9 · Limpieza** *(cuando quieras, no es del lanzamiento)*

```bash
sudo rm /etc/apache2/sites-available/{oye897,oye897-le-ssl,wordpress-http,wordpress-https}.conf
sudo apachectl configtest && sudo systemctl reload apache2
```

### SI ALGO SALE MAL, EN CUALQUIER PASO

```bash
sudo a2dissite 020-beatdigital && sudo systemctl reload apache2
```

---

## Detalle de cada paso

### Hoy (9 sep)

### 1. Desplegar v2 con la tabla de redirecciones

Es el único paso que **tiene** que estar hecho antes del corte: sin él, el momento
de más tráfico es el que encuentra las URLs del v1 dando 404.

```bash
cd /var/www/web-beat-v2 && git pull --ff-only origin beat && sudo ./scripts/desplegar-v2.sh
```

Termina con `✓ v2 desplegado en <commit>`. Si falla, no sigas: comprueba primero.

### 2. El vhost a su sitio

```bash
sudo cp /var/www/web-beat-v2/deploy/apache/020-beatdigital.conf /etc/apache2/sites-available/
```

Copiar **no** habilita. Hasta el `a2ensite` de mañana, ese archivo no hace nada.

### 3. Ensayo

```bash
sudo VHOST_NUEVO=020-beatdigital.conf ./scripts/cambiar-dominio.sh
```

Sin `CONFIRMAR=1` no toca Apache. Tiene que decir:

```
✓ el servicio web-beat-v2 está activo
✓ v2 responde 200
✓ v2 tiene contenido del CMS (N notas enlazadas)
✓ el build ya lleva el canonical de beatdigital.mx
✓ existe /etc/apache2/sites-available/020-beatdigital.conf
✓ el vhost nuevo lleva ProxyPreserveHost On
✓ el vhost nuevo declara ServerName beatdigital.mx
✓ apachectl configtest pasa
✓ certificado de beatdigital.mx válido hasta …
· AVISO: el certificado NO cubre www.beatdigital.mx
```

El aviso de `www` es esperado. Todo lo demás tiene que ir en verde.

### 4. Decisiones que solo se pueden tomar hoy

- **`PUBLIC_METRICOOL_HASH`** es de BUILD. Si no entra en el artefacto de hoy,
  ponerlo después obliga a reconstruir el sitio ya lanzado. Sin él, no hay
  medición de Metricool el día uno.
- **`PUBLICIDAD_TOKEN`** es de runtime, así que se puede añadir cuando sea — pero
  sin ella las campañas vendidas **no cuentan impresiones ni clics**. Si el corte
  se hace con campañas activas, el primer día no se factura.

---

## Mañana, antes de las 10:09

Repetir el ensayo. Confirma que el servicio sigue sano y que nada cambió durante
la noche:

```bash
sudo VHOST_NUEVO=020-beatdigital.conf ./scripts/cambiar-dominio.sh
```

---

## 10:09 — el corte

```bash
sudo VHOST_NUEVO=020-beatdigital.conf CONFIRMAR=1 ./scripts/cambiar-dominio.sh
```

Respalda los vhosts, habilita el nuevo, recarga Apache y comprueba solo:

```
✓ beatdigital.mx responde 200
✓ está sirviendo el v2
✓ INDEXABLE: <meta robots> dice index, follow
✓ sin X-Robots-Tag de noindex
✓ robots.txt abierto
✓ sitemap con N URLs
```

🔴 **`INDEXABLE` es el objetivo del corte.** Todo lo demás es fontanería. Si sale
en rojo, casi siempre es `ProxyPreserveHost`: Node está recibiendo
`Host: localhost` y no reconoce el dominio canónico.

---

## Justo después

### Comprobar a mano lo que el script no ve

```bash
curl -sI https://beatdigital.mx/news/ | head -2          # 301 → /beat-scanner
curl -s https://beatdigital.mx/ | grep -c 'href="/noticias/'   # ≥ 1
```

Y en el teléfono: que suene el directo, que una canción de Bonus Beat abra el
visor, y que «En vivo» devuelva la señal.

### Ampliar el certificado a www

Ahora sí funciona: `020-beatdigital.conf` sirve el ápex y lleva el `Alias` del reto
a `/var/www/acme`. Antes del corte esto falla con 404 — comprobado el 9 sep.

```bash
sudo certbot certonly --webroot -w /var/www/acme \
  -d beatdigital.mx -d www.beatdigital.mx --expand
```

Después, añadir `ServerAlias www.beatdigital.mx` a los dos bloques del vhost y un
301 de www al ápex. Ver la nota al final del propio archivo.

### Limpieza de la copia de servidor

Inerte, sin prisa:

```bash
sudo rm /etc/apache2/sites-available/{oye897,oye897-le-ssl,wordpress-http,wordpress-https}.conf
sudo apachectl configtest && sudo systemctl reload apache2
```

---

## Tiempos

Los números medidos van marcados; el resto son estimaciones honestas.

### El corte en sí: **~20 segundos**

| | |
|---|---|
| `a2ensite` + `configtest` | ~1 s |
| `systemctl reload apache2` | ~1 s — **y aquí cambia el sitio** |
| espera del script | 3 s |
| las seis comprobaciones | ~10-15 s |

🔴 **Sin caída.** `reload` es un *graceful* de Apache: las conexiones en curso
terminan con la configuración vieja y las nuevas entran con la nueva. Nadie ve un
error, ni siquiera un parpadeo.

🔴 **Sin propagación.** v1 y v2 están en la misma máquina y el DNS no se toca, así
que no hay TTL que esperar. La petición siguiente al `reload` ya recibe el v2.

🔴 **Sin CDN que purgar.** `beatdigital.mx` resuelve directo al origen —sin
cabeceras `Age`, `Via` ni `cf-*`—, así que no hay caché intermedia guardando el v1.

### Lo que sí tarda, y no depende de nosotros

**Hasta ~1 h 30 min** para quien visitó el v1 poco antes del corte.

El v1 no manda `Cache-Control` en su HTML, solo `Last-Modified`, así que los
navegadores aplican **caché heurística**: guardan la página ~10% del tiempo que
lleve sin modificarse. Todas las páginas del v1 comparten fecha —es un build
estático— y a las 10:09 esa fecha tendrá unas 15 horas, o sea hora y media de
frescura.

Solo afecta a páginas que esa persona **ya visitó**, se cura sola y un recargado
forzado la salta. No es un bloqueo; conviene saberlo si alguien dice «yo sigo
viendo el viejo».

**De días a semanas** para que Google reindexe. Los 301 y el sitemap se lo dicen
desde el minuto uno, pero el reindexado no es cosa de minutos. No lo midas el
mismo día.

### Lo que tarda cada paso

| Paso | Tiempo |
|---|---|
| **Hoy** · desplegar v2 | ~2-4 min (el `install` y el `build` son de segundos —medido: 0.4 s y 5.5 s en local—, el resto es la descarga de paquetes nuevos) |
| **Hoy** · copiar el vhost | segundos |
| **Hoy** · ensayo | ~15 s |
| **Mañana** · repetir el ensayo | ~15 s |
| **10:09** · el corte | **~20 s** |
| Comprobación a mano + teléfono | ~10 min |
| Expand de `www` | ~1 min |

⚠️ El `build` de 5.5 s es en un portátil. En la VM cuenta con más, y sobre todo con
la **descarga de paquetes**: este despliegue trae dependencias nuevas porque cambió
el lockfile con la subida de Astro. Es el único paso de mañana con red de por
medio, y por eso va HOY y no mañana.

### El resumen

**De pulsar Enter a que el dominio sirva el sitio nuevo: unos veinte segundos, sin
caída.** Todo lo demás del plan es preparación y comprobación.

---

## Lo que el corte NO arregla

Nada de esto bloquea, pero se va a ver:

| | |
|---|---|
| `programas` `autores` `paginas` `podcasts` | 0 documentos. `/programacion` sale vacía |
| Redes sociales | vacías en el CMS → el pie dice «Próximamente» |
| `especiales` | 1, y la rejilla del archivo excluye al vigente: no pinta tarjetas |
| `listas` | 2, y una se llama «Bonus Beat de Prueba» |
| `noticias` | 9 |
| Medidas de anuncio | `1280×360` y `390×110` no están de alta en Ad Manager |
| `www` | sin certificado hasta el paso de arriba |

Todo eso se llena desde el CMS después, sin desplegar.

---

## Por qué basta con Apache

Verificado contra lo servido, no supuesto:

- El build del v2 **ya lleva** `PUBLIC_SITE_URL=https://beatdigital.mx`: su canonical
  ya dice el dominio real. No hay que reconstruir para el corte.
- El `noindex`, el `X-Robots-Tag`, el `robots.txt` y el sitemap se deciden **por
  petición**, leyendo el `Host`. Con `ProxyPreserveHost On` y el `ServerName`
  nuevo, las cuatro capas se abren solas.
- v1 y v2 están en el **mismo servidor** (`34.169.1.149` los dos). Sin DNS, sin
  propagación: el corte y la vuelta atrás son instantáneos.
- El backend es **el mismo proceso** en `127.0.0.1:4322`. El vhost nuevo solo le
  pone otro nombre delante.
