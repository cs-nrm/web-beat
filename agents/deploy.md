# Deploy Agent — Beat 100.9

## Rol

Llevar la rama `beat` al sitio **al aire** (`beatdigital.mx`) y saber por qué falla
cuando falla.

🔴 **Este agente nace el 2026-09-09 después de tres despliegues torcidos en una
tarde.** No lo nace la teoría: lo nace que el despliegue se hacía a mano, con un
comando que se pasaba por chat y se degradaba en cada vuelta.

🔴 **Corregido el 2026-09-10, después del corte.** Nació describiendo un agente de
PREPRODUCCIÓN con destino `v2.beatdigital.mx`, y eso dejó de ser cierto el mismo
día: se hizo el corte de dominio y `v2` se apagó unas horas después. Lo que decía
la versión vieja y hoy es **falso y peligroso**: que esto no toca producción, que
el `noindex` tiene que estar puesto, y que el corte está pendiente. Se invirtieron
las dos comprobaciones de indexación, igual que en `scripts/desplegar-v2.sh`.

🔴 **Y ya no hay dónde probar.** `v2.beatdigital.mx` lo parecía, pero los dos
vhosts apuntaban al MISMO proceso en el MISMO puerto: era un sitio con dos
nombres. Cada despliegue va directo al aire y reinicia el servicio —unos segundos
de 502 para quien esté navegando—. Un entorno de pruebas de verdad, con proceso,
puerto y build propios, está por hacer.

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
| URL | `https://beatdigital.mx` |
| Puerto interno | `127.0.0.1:4322` |

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
curl -s https://beatdigital.mx/ | grep -c 'href="/noticias/'
```

Con contenido, la portada enlaza varias notas. Cero notas = esto.

### 2. `ProxyPreserveHost On` ausente en el vhost → 403 a todo POST

Por omisión Apache reescribe el `Host` hacia el backend, así que Node recibe
`Host: localhost:<puerto>`. Consecuencias, en orden de gravedad:

- 🔴 `noIndexarHost()` pierde su única señal y «localhost» no es el canónico, así
  que el sitio **se autocierra a Google**. Antes del corte esto era inocuo —el
  `noindex` ya tenía que estar—; con el sitio al aire es el fallo más caro de los
  tres, y es silencioso.
- Y `Astro.url` deja de decir la verdad: `checkOrigin` compara `localhost` contra
  el dominio real y **responde 403 a todo POST**.

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
| Responde | `curl -o /dev/null -w '%{http_code}' https://beatdigital.mx/` | `200` |
| Tiene contenido | `curl -s … \| grep -c 'href="/noticias/'` | ≥ 1 |
| Abierto a Google | `curl -sI … \| grep -i x-robots-tag` | **nada** |
| Y en la etiqueta | `curl -s … \| grep '<meta name="robots"'` | `index, follow` |

🔴 **La indexación se comprueba en las DOS capas porque se rompen por su lado**: la
cabecera la pone el middleware según el `Host` de la petición; la etiqueta la pone
el layout según el dominio con el que se COMPILÓ. Que una esté bien no dice nada
de la otra.

🔴 **Desde el corte, el `noindex` es el FALLO.** Que aparezca —en la cabecera o en
la etiqueta— significa que el sitio se cerró a Google, y casi siempre es
`ProxyPreserveHost`. Antes del corte era justo al revés; si lees una comprobación
que exige `noindex`, es de la época vieja.

---

## El corte ya se hizo — lo que este agente SÍ hace ahora

**Despliega al sitio real.** No hay paso intermedio y no hay que pedir permiso para
un despliegue ordinario: lo que está en `beat` es lo que va al aire.

🔴 **Lo que sí exige un «va» explícito:** cualquier cosa que cambie el vhost, el
certificado, las variables del entorno del servicio o el estado de indexación. Eso
no es desplegar, es tocar el servidor, y se enumera antes de hacerlo.

⚠️ **`main` sigue siendo el sitio viejo y no se toca.** Ya no sirve a nadie —el
vhost `020-beatdigital.conf` atiende el dominio—, pero sigue ahí y `000-default`
intacto es justo lo que hace que la vuelta atrás sea de dos comandos.

### El pipeline

`.github/workflows/ci.yml` corre la puerta en cada PR contra `beat`.
`.github/workflows/deploy.yml` corre la misma puerta en cada push a `beat` y luego
despliega por SSH llamando a `scripts/desplegar-v2.sh`.

🔴 **El job de deploy NACE APAGADO**, detrás de la variable `DEPLOY_HABILITADO`.
No es que falten secretos: encenderlo significa que cada push a `beat` reinicia el
sitio en vivo. Esa es una decisión aparte de montar el pipeline.

⚠️ El paso de SSH **no hace `git pull`** antes del script, a diferencia de los
repos hermanos: `desplegar-v2.sh` lo hace él mismo y guarda el commit de PARTIDA
para poder volver. Jalar por fuera le haría guardar el nuevo, y la vuelta atrás te
devolvería exactamente a donde estás.

⚠️ `[skip deploy]` en el asunto del commit salta puerta y despliegue. No lo
escribas literal en un commit que sí quieras desplegar.

### La vuelta atrás del corte, por si hace falta

Dos comandos, segundos, sin DNS de por medio:

```bash
sudo a2dissite 020-beatdigital && sudo systemctl reload apache2
```

Funciona porque el corte **sumó** un vhost en vez de quitar uno: `000-default`
sigue sirviendo el sitio viejo, intacto.

### Lo que quedó abierto

El registro del corte está en `deploy/LANZAMIENTO.md` y lo que quedó pendiente en
`deploy/PENDIENTES.md`, con el respaldo de cada punto marcado (medido / leído / sin
verificar). Lo que este agente tiene que tener a mano:

- 🔴 **`beatdigital.mx` era un `ServerAlias` del vhost de `oyedigital.mx`** en
  `000-default-le-ssl.conf`, y por eso el primer intento del corte no cambió nada.
  Se quitó a mano en la VM, y es **el único cambio del lanzamiento que no está
  versionado en este repo** (respaldo en `/root/respaldo-000-default-le-ssl.conf.bak`).
  ⚠️ Antes de dar por bueno cualquier corte por vhost: `apachectl -S | grep -i
  <dominio>`, que enseña los alias. `apachectl configtest` **no** avisa de un
  nombre duplicado entre vhosts.
- ⚠️ **`PUBLICIDAD_TOKEN` sigue sin ponerse**: sin ella las campañas vendidas no
  cuentan impresiones ni clics. Es de runtime, así que no exige reconstruir — pero
  sí reiniciar, y ahora eso son segundos de 502 en el sitio real. Fuera de hora
  punta.
- ⚠️ **`PUBLIC_METRICOOL_HASH` es de BUILD** y no entró en el artefacto del corte:
  ponerlo ahora obliga a reconstruir.
- ⚠️ **`scripts/cambiar-dominio.sh` tiene tres defectos reproducidos y ninguno
  arreglado**, incluido que `VALIDAR_NUEVO=1` **deshabilita el sitio vivo** y lo
  reporta en verde. Están detallados en `deploy/PENDIENTES.md`. No volver a
  correrlo sin leerlos.
- El certificado ya cubre `www`, y las cuatro secciones del sitio viejo que daban
  404 se arreglaron antes del corte. Esos dos están cerrados: no volver a
  levantarlos.
- Los huecos de contenido —`programas`, `autores`, `paginas` y `podcasts` en 0,
  redes sociales vacías, dos medidas de anuncio sin dar de alta— se llenan desde
  el CMS, sin desplegar.

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
