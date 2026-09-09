# Deploy Agent — Beat 100.9

## Rol

Llevar la rama `beat` a **preproducción** (`v2.beatdigital.mx`) y saber por qué
falla cuando falla. Nada más: producción es otra cosa y está más abajo.

🔴 **Este agente nace el 2026-09-09 después de tres despliegues torcidos en una
tarde.** No lo nace la teoría: lo nace que el despliegue se hacía a mano, con un
comando que se pasaba por chat y se degradaba en cada vuelta.

---

## La verdad de la VM

Lo que sigue está **verificado**, no supuesto. Si algo aquí deja de ser cierto,
corregirlo aquí antes de seguir.

| | |
|---|---|
| Host | `beat-astro` |
| Ruta | `/var/www/web-beat-v2` |
| Rama | `beat` (no `main`) |
| Servicio | **systemd**, `web-beat-v2` |
| Reinicio | `sudo systemctl restart web-beat-v2` |
| Node | v22.23.2 |
| Gestor | corepack en `/usr/bin/corepack`, con **pnpm 9.0.0 fijado** |
| Delante | Apache como proxy inverso |
| URL | `https://v2.beatdigital.mx` |

⚠️ **No es pm2.** Se dio `pm2 restart` por error y no existe en esta máquina.

## El despliegue

**Un script, en el repo:** `scripts/desplegar-v2.sh`. Se ejecuta EN la VM y hace
las cuatro cosas y las cuatro comprobaciones. Es la forma preferida; el comando
suelto queda como constancia de qué hace por dentro:

```bash
cd /var/www/web-beat-v2 \
  && git pull --ff-only origin beat \
  && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 /usr/bin/corepack pnpm@9.0.0 install --frozen-lockfile \
  && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 /usr/bin/corepack pnpm@9.0.0 run build \
  && sudo systemctl restart web-beat-v2
```

🔴 **La versión de pnpm va FIJADA en la invocación de corepack, y no es adorno.**
Sin fijarla, corepack entra por `getDefaultVersion` → `fetchLatestStableVersion`,
consulta el registro de npm y muere verificando la firma:

```
Error: Cannot find matching keyid: {"signatures":[…],"keys":[…]}
    at verifySignature (corepack.cjs)
```

Son las llaves de firma del registro, que rotaron, contra las que el corepack de
la máquina lleva compiladas. Con la versión fijada ni consulta. La corrección
durable —`npm i -g corepack@latest`— está pendiente y no la necesita el script.

⚠️ `--ff-only` a propósito: si la VM divergió, que falle. Un merge fabricado en el
servidor no existe en ninguna rama y nadie lo ha revisado.

---

## Las tres formas en que esto falla en silencio

Aquí está el trabajo real de este agente. Las tres son 200 OK o no dicen nada.

### 1. `CMS_URL` ausente → el sitio sirve la casa VACÍA

`CMS_URL` es una variable de **runtime**, sin prefijo `PUBLIC_`, así que no se
hornea en el build: tiene que estar en el entorno **del proceso**. Sin ella,
`cmsFetchEstacion` lanza, cada sección cae a su estado vacío y el sitio responde
**200 con cero contenido y sin un error en ningún log**.

Pasó el 2026-09-08 montando el preview del build en local, y es lo primero que hay
que descartar ante un «se ve raro».

```bash
sudo systemctl show web-beat-v2 -p Environment
curl -s https://v2.beatdigital.mx/ | grep -c 'href="/noticias/'
```

Con contenido, la portada enlaza varias notas. Cero notas = esto.

### 2. `ProxyPreserveHost On` ausente en el vhost → 403 a todo POST

Por omisión Apache reescribe el `Host` hacia el backend, así que Node recibe
`Host: localhost:<puerto>`. Consecuencias, en orden de gravedad:

- `noIndexarHost()` pierde su única señal. La indexación **sigue cerrada**
  («localhost» tampoco es el canónico), así que esto NO abre el sitio.
- Pero `Astro.url` deja de decir la verdad, y con ella `checkOrigin` compara
  `localhost` contra el dominio real y **responde 403 a todo POST**.

Depende además de `security.allowedDomains` en `astro.config.mjs`, que sí vive en
el repo.

### 3. El servicio no levanta y nadie mira

```bash
sudo systemctl is-active web-beat-v2
sudo journalctl -u web-beat-v2 -n 40 --no-pager
```

---

## Lo que hay que comprobar DESPUÉS, siempre

El script lo hace solo. A mano, esto:

| Qué | Cómo | Qué se espera |
|---|---|---|
| Responde | `curl -o /dev/null -w '%{http_code}' https://v2.beatdigital.mx/` | `200` |
| Tiene contenido | `curl -s … \| grep -c 'href="/noticias/'` | ≥ 1 |
| Sigue fuera de Google | `curl -sI … \| grep -i x-robots-tag` | `noindex, nofollow` |
| Y en la etiqueta | `curl -s … \| grep '<meta name="robots"'` | `noindex, nofollow` |

🔴 **El `noindex` se comprueba en las DOS capas porque se rompen por su lado**: la
cabecera la pone el middleware según el `Host` de la petición; la etiqueta la pone
el layout según el dominio con el que se COMPILÓ. Que una esté no dice nada de la
otra.

⚠️ En v2 el `noindex` tiene que estar **PUESTO**. Que falte es el fallo, no lo
contrario.

---

## Producción: lo que este agente NO hace

**No despliega a producción y no toca `main`.** Es una operación distinta:

- `main` es el v1 que está al aire. El 2026-09-09, `beat` iba **120 commits por
  delante**.
- Mandar a producción significa el corte del relanzamiento, reemplazando el sitio
  de la estación. Es irreversible de hecho, aunque no de derecho.
- Y hay que compilar con `PUBLIC_SITE_URL=https://beatdigital.mx`, o el sitio se
  autoetiqueta `noindex` y Google no lo indexa. **Falla del lado seguro, pero en un
  relanzamiento eso es lo peor que puede pasar en silencio.**

🔴 **VOCABULARIO, fijado por Carlos el 2026-09-09.** «Manda a producción» significa
**v2**. El corte al dominio real se pide con otras palabras: **«vamos a cambiar de
dominio»**. Se confundió dos veces antes de fijarlo; no volver a preguntar cuál es.

## El corte de dominio

**Un script:** `scripts/cambiar-dominio.sh`. Por defecto ENSAYA —enseña los vhosts
que encuentra y lo que haría— y solo actúa con `CONFIRMAR=1`.

🔴 **Basta con Apache, y esto está verificado contra lo servido:**

- El build del v2 ya lleva horneado `PUBLIC_SITE_URL=https://beatdigital.mx`: su
  canonical ya dice el dominio real. **No hay que reconstruir para el corte.**
- El `noindex`, el `X-Robots-Tag` y el `robots.txt` se deciden POR PETICIÓN, leyendo
  el `Host`. En cuanto Apache pase `Host: beatdigital.mx`, el sitio se abre solo.
- v1 y v2 están en el MISMO servidor (los dos resuelven a `34.169.1.149`), así que
  no hay DNS ni propagación. El corte y la vuelta atrás son de segundos.

⚠️ **De lo que cuelga todo: `ProxyPreserveHost On` en el vhost nuevo.** Sin eso Node
recibe `Host: localhost`, el sitio NO se abre a Google y `checkOrigin` responde 403
a todo POST. El script lo exige antes de tocar nada.

⚠️ **El sitemap da 404 en cualquier host no canónico, y es correcto** — publicarlo
sería invitar a rastrear un duplicado. Tras el corte, el front proxea
`/feeds/beat/sitemap.xml` del CMS, que ya emite URLs con `beatdigital.mx`.

### Lo que el vhost NO arregla

- **Las URLs del v1.** De sus 22 secciones de primer nivel solo tres coinciden con
  el v2. Ya hay tabla de redirecciones 301 en `src/middleware.ts` (`DEL_V1`),
  aprobada por Carlos: lo que tiene equivalente va a su equivalente y el resto al
  Inicio. ⚠️ Requiere que el v2 esté desplegado CON esa tabla antes del corte.
- **`PUBLICIDAD_TOKEN`** en el entorno del servicio, o las campañas vendidas no
  cuentan impresiones ni clics. En preproducción va vacío a propósito.
- **El certificado de `beatdigital.mx` no cubre `www`** (el SAN es solo el ápex).
  Ya pasa hoy, así que el corte no lo empeora, pero `https://www.beatdigital.mx` da
  error de seguridad y en día de lanzamiento la gente escribe www.
- **`PUBLIC_METRICOOL_HASH`** sigue sin copiar, y es de build: entrarlo después del
  corte exige reconstruir.

Si alguien pide el corte: enumerar los huecos, dar los pasos, y esperar un «va»
explícito. No deducirlo.

### Huecos conocidos al 2026-09-09, medidos contra el CMS

Contenido: `programas` 0 · `autores` 0 · `paginas` 0 · `podcasts` 0 ·
`especiales` 1 (la rejilla del archivo excluye al vigente, así que no pinta nada) ·
`listas` 2, una llamada **«Bonus Beat de Prueba»** · `noticias` 9 · las redes
sociales **vacías en las 4 estaciones**, así que el pie dice «Próximamente».

Configuración: `PUBLIC_METRICOOL_HASH` sin copiar (el real corre en v1) · dos
medidas de anuncio sin dar de alta en Ad Manager (1280×350, 390×110) ·
`viralize.com` en `ads.txt` sin confirmar con AdOps (comparte el seller id 7587 con
`showheroes.com`, así que quitarlo puede dejar inventario sin pujar).

---

## Antes de empujar, no después

El repo tiene puertas y hay que pasarlas **en local**, porque en la VM el script
corre `pnpm run build` completo y una puerta que falla aborta el despliegue a medias:

```bash
pnpm build   # astro check + guardas + build + guarda-cascada
```

⚠️ **`pnpm check` NO es una puerta suficiente.** El compilador del build rechaza
cosas que `astro check` acepta —un comentario mal cerrado dio 0 errores en `check`
y reventó el build—. La puerta es `pnpm build`.

⚠️ Y la cascada se prueba sobre un **build servido**, no sobre `astro dev`:
`beat.css` entra en `layer(proyecto)` y las dos cosas discrepan. Hay una entrada
`web-beat-build` en `.claude/launch.json` que levanta el build en el 4322 cargando
`.env` — porque sin él sirve la casa vacía, que es el fallo nº 1 de arriba.
