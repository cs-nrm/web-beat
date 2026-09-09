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

## Hoy (9 sep)

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
