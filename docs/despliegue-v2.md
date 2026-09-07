# Despliegue de v2 (preproducción) y corte de dominio

Cómo está montado `v2.beatdigital.mx`, cómo se actualiza, cómo se revierte, y qué
hay que hacer el día de la liberación.

Escrito el 2026-09-03, al montarlo.

---

## Lo primero, porque es lo que sorprende

**El sitio que hoy sirve `beatdigital.mx` NO es WordPress.** Es este mismo repo,
rama `main`, Astro **estático**, en `/var/www/web-beat`. Un cron reconstruye cada
15 minutos y copia a `/var/www/html/dist`, que es el `DocumentRoot` de Apache:

```bash
# /var/www/build.sh — lo corre el cron cada 15 min
cd /var/www/web-beat/src && git pull origin main && npm run build
cp -Rf /var/www/web-beat/dist /var/www/html
```

Sí existe un WordPress, pero **en otro dominio** (`beatdigital.com.mx`), y el v1
lo consume por REST. El día del corte se apaga el front Astro; ese WordPress
sigue en pie sirviendo a otras cosas. Son dos apagados distintos.

🔴 **`/var/www/web-beat` es del cron y está clavado en `main`.** No es sitio para
probar nada: un `git checkout` ahí lo deshace el cron en menos de 15 minutos. Por
eso v2 vive en un directorio aparte. Y ojo con `/var/www/buildfull.sh`, hoy
comentado en el crontab: empieza con `git reset --hard` y `git clean -fd`.

---

## Cómo está montado v2

| Pieza | Dónde |
|---|---|
| Código | `/var/www/web-beat-v2`, rama `beat` |
| Entorno | `/var/www/web-beat-v2/.env` (`640 root:www-data`, ignorado por git) |
| Proceso | `web-beat-v2.service` → `127.0.0.1:4322`, como `www-data` |
| Apache | `/etc/apache2/sites-available/010-v2-beatdigital.conf` |
| Certificado | `/etc/letsencrypt/live/v2.beatdigital.mx/` (separado del de producción) |

A diferencia del v1, **v2 no sirve archivos de una carpeta**: es un proceso Node
y Apache le habla por delante. Si el servicio está caído, v2 da 502 — no aparece
el sitio viejo.

### Detalles que cuestan una tarde si no están escritos

- **`pnpm` no está instalado, y el `corepack` del `PATH` está roto.** Hay un
  `corepack` 0.28.1 en `/usr/local/bin` (de un `npm -g` de 2024) que le hace
  sombra al del paquete de Node 22. El viejo trae las llaves de firma del
  registro incrustadas y ya rotaron: falla con `Cannot find matching keyid`.
  **Usar siempre la ruta absoluta:** `/usr/bin/corepack pnpm@9.0.0 …`
  (Lo mismo pasa con `npm`: el de `/usr/local/bin` le hace sombra al del paquete.)

- **El prefijo `010` del vhost no es decorativo.** Apache usa el PRIMER vhost como
  predeterminado para cualquier `Host` que nadie reclame, y ese papel lo tiene
  `000-default` (el v1). Si el de v2 ordenara antes, v2 se volvería el sitio por
  omisión de la máquina.

- **`ProxyPreserveHost On` es obligatorio.** Sin él Apache reescribe el `Host` a
  `127.0.0.1:4322`, el adaptador de node no lo valida contra `allowedDomains`,
  cae a `localhost`, y `checkOrigin` responde **403 a todo POST**. Además es lo
  que hace que la protección de preproducción funcione (ver abajo).

- **`/.well-known/acme-challenge/` no se proxea ni se redirige.** Se sirve del
  disco desde `/var/www/acme`. Sin esa excepción, Node contesta 404 al reto y
  certbot falla con un mensaje que no menciona el proxy. Las renovaciones
  automáticas entran por ahí: si se rompe, el certificado deja de renovarse.

---

## Por qué v2 no compite con el sitio real en Google

v2 se construye con la URL **canónica** horneada
(`PUBLIC_SITE_URL=https://beatdigital.mx`), no con la de v2. Lo protege la regla
**por host**, en cuatro capas, y está medido con el mismo artefacto:

| | `Host: v2.beatdigital.mx` | `Host: beatdigital.mx` |
|---|---|---|
| `X-Robots-Tag` | `noindex, nofollow` | *(ausente)* |
| `<meta robots>` | `noindex, nofollow` | `index, follow` |
| `/robots.txt` | `Disallow: /` | `Allow: /` |
| `/sitemap.xml` | 404 | 200 |

🔴 **Esa es la razón de que el corte no necesite reconstruir**: el mismo binario
sirve preproducción protegida o sitio real, según quién le entregue el `Host`.

⚠️ **Corolario:** no meter delante un proxy que reescriba el `Host`. Las cuatro
capas leen la misma señal y se abrirían todas a la vez, convirtiendo v2 en un
duplicado indexable del sitio real. Con vhosts por nombre esto no pasa, porque el
`Host` **es** lo que selecciona el vhost.

---

## Actualizar v2

🔴 **Esto se corre EN EL SERVIDOR, no en la Mac.** Parece obvio escrito, y no lo
es leyendo solo el bloque de abajo: pegado en la terminal del proyecto falla con
`cd: no such file or directory: /var/www/web-beat-v2`, que no dice en ningún
momento que el problema sea la máquina. Pasó (2026-09-07, dos veces seguidas).

```bash
ssh beat
```

`beat` es un alias en el `/etc/hosts` de la Mac que apunta a la IP del servidor
—la misma a la que resuelve `v2.beatdigital.mx`—. Si pide usuario, es
`usuario@beat`. Y ya dentro:

```bash
cd /var/www/web-beat-v2 && git pull --ff-only origin beat \
  && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 /usr/bin/corepack pnpm@9.0.0 install --frozen-lockfile \
  && COREPACK_ENABLE_DOWNLOAD_PROMPT=0 /usr/bin/corepack pnpm@9.0.0 run build \
  && sudo systemctl restart web-beat-v2
```

Encadenado con `&&` **a propósito**: si el build falla no se reinicia el
servicio, y v2 sigue sirviendo la versión anterior desde memoria.

⚠️ `sudo` solo en el `systemctl`: el servicio corre como `www-data` y reiniciarlo
necesita root. Si entraste como root, sobra. Y si prefieres no entrar, `ssh -t
beat '…'` con el comando entre comillas funciona igual — el `-t` es lo que le deja
a `sudo` pedir la contraseña.

⚠️ **`corepack` a secas NO sirve**, y falla con un error que habla de firmas y no
de rutas (`Cannot find matching keyid`). Por eso el comando lleva
`/usr/bin/corepack` con ruta absoluta — está explicado arriba, en los detalles del
montaje. Lo mismo vale para cualquier `corepack prepare …` que se teclee a mano.

⚠️ El aviso **«Update available! 9.0.0 → 12.3.4»** que imprime pnpm es cosmético y
NO hay que hacerle caso: `package.json` fija `packageManager: "pnpm@9.0.0"` y
corepack respeta ese pin. Si algún día se sube, se sube en la Mac —cambiando el
pin, regenerando el lockfile y verificando el build— y el servidor lo recoge en el
siguiente pull. El servidor nunca debe adelantarse al repo: el despliegue usa
`--frozen-lockfile`, así que un lockfile desfasado revienta aquí, que es el peor
sitio para descubrirlo.

Solo se despliega lo que esté en `origin/beat`. Un commit que viva únicamente en
la Mac no llega.

### Comprobar que quedó

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://v2.beatdigital.mx/editorial
```

Cualquier ruta que solo exista en el commit nuevo sirve; lo que importa es no dar
por bueno un despliegue porque el comando terminó sin error. **La trampa concreta:
`git pull` puede decir «Already up to date» porque un intento anterior ya trajo los
commits antes de morirse en otro paso** — y entonces todo el encadenado se ve
limpio mientras el servicio sigue sirviendo el build viejo desde memoria.

---

## Revertir

```bash
a2dissite 010-v2-beatdigital && systemctl reload apache2
```

Deja el servidor como antes de todo esto. El proceso de Node puede seguir
corriendo sin que nadie lo alcance.

---

## El día del corte

No se toca el código ni se reconstruye. Se cambia quién atiende `beatdigital.mx`:
hoy el vhost estático del v1, después el proxy al 4322.

**Antes:**

1. Los sitemaps (`/sitemap.xml`, `/news-sitemap.xml`) tienen que estar
   funcionando: son bloqueantes del corte, no de la preproducción.
2. Encender la analítica en el `.env` y **reconstruir** — las `PUBLIC_*` se
   hornean al compilar. Ver abajo.
3. `CACHE_CMS_MS` sube a `300000`.
4. `/var/www/html/dist` acumula 482 directorios con HTML de mayo de 2025, porque
   el `cp -Rf` del v1 nunca borra. Si ese directorio se sigue sirviendo para
   algo, necesita limpieza y no otro `cp`.
5. 🔴 **Comprobar que las redirecciones de `/scanner` llegan vivas al corte.** La
   sección editorial se mudó a `/beat-scanner` el 2026-09-07 y se partió en dos
   (`/beat-scanner` y `/editorial`). Las rutas viejas responden 301 desde
   `astro.config.mjs`, y de eso dependen la migaja de cada nota ya publicada y todo
   lo que la estación haya compartido. Van en el mismo commit que las rutas nuevas,
   así que un merge normal a `main` las lleva juntas — lo que NO debe pasar es
   partir ese cambio en dos despliegues.

---

## Qué está apagado en v2, y por qué

En el `.env` de preproducción van vacías **a propósito**:

- `PUBLIC_GA_ID`, `PUBLIC_GTM_ID`, `PUBLIC_COMSCORE_C2`, `PUBLIC_HOTJAR_ID`.
  🔴 comScore es lo que NRM le reporta a los anunciantes para justificar CPMs:
  dispararlo desde un sitio de revisión inflaría una cifra de audiencia
  certificada con tráfico que no es audiencia.
- `PUBLICIDAD_TOKEN`. Con token, cada visita de revisión sumaría impresiones y
  clics a campañas que se le facturan a un anunciante real. **Comprobado**: un
  barrido que clicó un banner en v2 no generó ningún conteo.
- `SITIO_NOINDEX` va vacía para que decida el host. Ponerle `0` forzaría a
  **indexar** la preproducción.

Cambiar cualquiera de las `PUBLIC_*` exige reconstruir.

---

## Deuda del servidor (no estorba a v2, pero está ahí)

- Debian 11 fuera de soporte estándar. 544 días sin reiniciar.
- Tres repos de apt roídos: `bullseye-backports` en 404 (movido al archivo) y
  MySQL y sury.org con llaves expiradas. `unattended-upgrades` corre, así que no
  está aplicando todo lo que cree aplicar.
- 🔴 **`pnpm audit` / `npm audit` no funcionan desde esta VM.**
  `POST registry.npmjs.org/-/npm/v1/security/audits` → `ERR_SOCKET_TIMEOUT`,
  mientras `pnpm install` resuelve en 12 s. Los `GET` pasan y el `POST` no:
  apunta a filtrado de egreso sobre POST. Va a morder a cualquier herramienta que
  audite por POST desde aquí.
  **La vía que sí pasa:** OSV.dev, `POST https://api.osv.dev/v1/querybatch`, sin
  autenticación, hasta 1000 consultas por petición. Con él se auditó el árbol
  transitivo de producción de `beat` (409 paquetes, 428 pares `nombre@versión`):
  cero avisos conocidos. El instrumento se verificó antes con `lodash@4.17.15` y
  `minimist@1.2.0`, que sí salen positivos — un cero sin control positivo no vale.
- El `node_modules` del v1 está congelado en Astro **4.2.4** (enero 2024) aunque
  su `package.json` pida `^5.4.2`. Las 25 alertas de Dependabot de `main` son de
  esa cadena de compilación; lo único que baja al navegador en el v1 es
  `flickity`, que no tiene aviso. Un `npm install` ahí salta un major en el sitio
  vivo: no es una operación menor.
