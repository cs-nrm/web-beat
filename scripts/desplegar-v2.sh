#!/usr/bin/env bash
#
# Despliegue del SITIO (beatdigital.mx). Se ejecuta EN LA VM.
#
# 🔴 Desde el 10 sep 2026 esto despliega el sitio real, no una preproducción. Antes
# apuntaba a `v2.beatdigital.mx`, que era el mismo proceso con otro nombre; ese
# nombre se apagó el día del corte. El script conserva su nombre de archivo a
# propósito —renombrarlo rompería la memoria muscular y los documentos que lo
# citan—, pero ya no hay ningún «v2» al que desplegar.
#
# 🔴 Por qué existe: el despliegue se hacía a mano y ya falló de tres formas
# distintas, todas silenciosas o confusas:
#
#   1. `pnpm build` reventando en corepack —«Cannot find matching keyid»— porque
#      corepack resuelve la versión contra el registro de npm y verifica la firma
#      con llaves que ya rotaron. Se evita FIJANDO la versión al invocarlo, que es
#      lo que hace este script.
#   2. El sitio respondiendo **200 con la casa vacía** por falta de `CMS_URL` en el
#      entorno del proceso. Sin error en ningún log. Este script lo comprueba
#      DESPUÉS de reiniciar, que es el único momento en que se puede saber.
#   3. Un reinicio que no levanta y nadie mirando `systemctl`.
#
# ⚠️ Y por eso ahora ESTO SÍ TOCA EL AIRE. Cada corrida reinicia el servicio que
# sirve beatdigital.mx: son unos segundos de 502 para quien esté navegando. No es
# un despliegue de prueba y no hay red debajo —hoy no existe un entorno donde
# ensayar, ver `deploy/PENDIENTES.md`—.
#
# ⚠️ `main` sigue siendo el sitio VIEJO, estático, que un cron reconstruye cada 15
# minutos en `/var/www/web-beat`. No es el destino de nada de esto.
#
# Uso:   sudo ./scripts/desplegar-v2.sh
#        RAMA=otra ./scripts/desplegar-v2.sh
#        URL=https://otro.host ./scripts/desplegar-v2.sh
set -euo pipefail

RUTA="${RUTA:-/var/www/web-beat-v2}"
RAMA="${RAMA:-beat}"
SERVICIO="${SERVICIO:-web-beat-v2}"
# 🔴 El destino contra el que se COMPRUEBA. Era v2.beatdigital.mx; desde el corte
# es el dominio real, porque es el único nombre que sirve este proceso.
URL="${URL:-https://beatdigital.mx}"
COREPACK="${COREPACK:-/usr/bin/corepack}"
PNPM="${PNPM:-pnpm@9.0.0}"
# Segundos de espera tras el reinicio antes de dar por bueno el arranque.
ESPERA="${ESPERA:-6}"

# `sudo` solo si hace falta: el script se corre indistintamente como root o no.
SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

paso() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }
fallo() { printf '\n\033[31m✗ %s\033[0m\n' "$1" >&2; }
bien() { printf '\033[32m  ✓ %s\033[0m\n' "$1"; }

# ── 0. Dónde estamos ──────────────────────────────────────────────────────────
[ -d "$RUTA/.git" ] || { fallo "No hay repo en $RUTA"; exit 1; }
cd "$RUTA"

actual="$(git rev-parse --abbrev-ref HEAD)"
if [ "$actual" != "$RAMA" ]; then
  fallo "La VM está en la rama '$actual' y se esperaba '$RAMA'. No sigo:
  cambiar de rama en un despliegue no es un despliegue, es otra cosa."
  exit 1
fi

# El commit de partida, para poder volver. Se imprime al final pase lo que pase.
ANTES="$(git rev-parse HEAD)"
trap 'printf "\n\033[33mPara volver atrás:\033[0m\n  cd %s && git reset --hard %s && %s\n" "$RUTA" "$ANTES" "$0"' EXIT

# ── 1. Traer ──────────────────────────────────────────────────────────────────
paso "Trayendo origin/$RAMA"
# `--ff-only` a propósito: si la VM divergió, que FALLE en vez de fabricar un
# merge que no existe en ninguna rama y que nadie ha revisado.
git pull --ff-only origin "$RAMA"
DESPUES="$(git rev-parse HEAD)"

if [ "$ANTES" = "$DESPUES" ]; then
  bien "Ya estaba al día en $(git rev-parse --short HEAD). Se reconstruye igual."
else
  git --no-pager log --oneline "$ANTES..$DESPUES" | sed 's/^/  /'
fi

# ── 2. Dependencias ───────────────────────────────────────────────────────────
paso "Dependencias"
# 🔴 `COREPACK_ENABLE_DOWNLOAD_PROMPT=0` y la versión FIJADA en la invocación.
# Sin fijarla, corepack entra por `getDefaultVersion` → `fetchLatestStableVersion`
# y muere verificando la firma del registro. Con ella, ni consulta.
#
# ⚠️ `--frozen-lockfile`: si el lock y el `package.json` no cuadran, que falle. Un
# despliegue no es el sitio donde resolver un árbol de dependencias.
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 "$COREPACK" "$PNPM" install --frozen-lockfile

# ── 3. Compilar ───────────────────────────────────────────────────────────────
paso "Compilando"
COREPACK_ENABLE_DOWNLOAD_PROMPT=0 "$COREPACK" "$PNPM" run build

# ── 4. Reiniciar ──────────────────────────────────────────────────────────────
paso "Reiniciando $SERVICIO"
$SUDO systemctl restart "$SERVICIO"
sleep "$ESPERA"

if ! $SUDO systemctl is-active --quiet "$SERVICIO"; then
  fallo "El servicio no está activo. Lo último que dijo:"
  $SUDO journalctl -u "$SERVICIO" -n 25 --no-pager >&2
  exit 1
fi
bien "servicio activo"

# ── 5. Comprobar lo que no se ve ──────────────────────────────────────────────
# 🔴 Aquí está el valor del script. Un despliegue "correcto" puede dejar el sitio
# respondiendo 200 y completamente vacío, y eso no sale en ningún log.
paso "Comprobando el sitio servido"

# ⚠️ El `|| echo 000` no es adorno. Sin él, si el sitio no responde —Node todavía
# arrancando, TLS caído, el host apagado— `curl` sale distinto de cero, la
# ASIGNACIÓN hereda ese estado y `set -e` mata el script AQUÍ, antes del `fallo`.
# O sea: el peor momento posible es el único en que no imprime el diagnóstico.
codigo="$(curl -s -o /tmp/beat-portada.html -w '%{http_code}' "$URL/" || echo 000)"
[ "$codigo" = "200" ] || { fallo "La portada de $URL respondió $codigo"; exit 1; }
bien "portada 200"

# El contenido del CMS: con `CMS_URL` puesto, la portada enlaza varias notas. Sin
# él, el sitio se pinta entero SIN una sola. Es la señal más barata y la que
# distingue "desplegado" de "desplegado y vacío".
# ⚠️ Mismo motivo que arriba, y aquí muerde más: con `pipefail`, un `grep` que no
# encuentra nada devuelve 1, la tubería entera devuelve 1 y `set -e` mata el
# script. Es decir, el caso «cero notas» —justo el fallo que este bloque existe
# para cazar— salía mudo en vez de con su diagnóstico.
notas="$(grep -o 'href="/noticias/[a-z0-9-]*"' /tmp/beat-portada.html | sort -u | wc -l | tr -d ' ' || true)"
notas="${notas:-0}"
if [ "$notas" -lt 1 ]; then
  fallo "La portada respondió 200 pero SIN CONTENIDO (0 notas enlazadas).
  Casi siempre es \`CMS_URL\` ausente en el entorno del servicio — es una variable
  de RUNTIME, sin prefijo PUBLIC_, así que no basta con que estuviera en el build.
  Revisa:  $SUDO systemctl show $SERVICIO -p Environment"
  exit 1
fi
bien "$notas notas enlazadas en la portada"

# 🔴 Las dos capas de indexación, y desde el corte se comprueban AL REVÉS.
#
# Hasta el 10 sep 2026 este script desplegaba la preproducción y exigía que el
# `noindex` ESTUVIERA. Ahora despliega el sitio real, así que exige lo contrario:
# que NO esté. La comprobación no se borró al cambiar de destino porque sigue
# valiendo lo mismo —es la que caza que Node haya perdido el `Host`—, solo que el
# resultado bueno es el opuesto.
#
# Se miran las dos capas por separado porque se rompen por su lado: la cabecera la
# pone el middleware con el `Host` de la petición, la etiqueta la pone el layout
# combinando ese `Host` con el dominio del build. Que una esté bien no dice nada
# de la otra.
if curl -sI "$URL/" | grep -qi 'x-robots-tag:.*noindex'; then
  fallo "El sitio salió CERRADO a Google: la cabecera X-Robots-Tag dice noindex.
  Casi siempre es \`ProxyPreserveHost On\` ausente en el vhost: sin él Node recibe
  Host: localhost, no reconoce el dominio canónico y cierra el sitio. También lo
  causa \`SITIO_NOINDEX=1\` olvidada en el .env de la VM."
  exit 1
fi
bien "sin X-Robots-Tag de noindex"

grep -q '<meta name="robots" content="index, follow"' /tmp/beat-portada.html \
  && bien "<meta robots> index, follow" \
  || { fallo "El <meta robots> NO dice 'index, follow'. Revisa PUBLIC_SITE_URL del
  build (tiene que ser https://beatdigital.mx) y SITIO_NOINDEX en el .env."; exit 1; }

printf '\n\033[32m✓ desplegado en %s — %s indexable y con contenido\033[0m\n' \
  "$(git rev-parse --short HEAD)" "$URL"
