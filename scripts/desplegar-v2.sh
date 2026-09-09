#!/usr/bin/env bash
#
# Despliegue de PREPRODUCCIÓN (v2.beatdigital.mx). Se ejecuta EN LA VM.
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
# ⚠️ NO despliega a producción. Producción es otra rama (`main`), otro dominio y
# otra decisión. Ver `agents/deploy.md`.
#
# Uso:   sudo ./scripts/desplegar-v2.sh
#        RAMA=otra ./scripts/desplegar-v2.sh
set -euo pipefail

RUTA="${RUTA:-/var/www/web-beat-v2}"
RAMA="${RAMA:-beat}"
SERVICIO="${SERVICIO:-web-beat-v2}"
URL="${URL:-https://v2.beatdigital.mx}"
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

codigo="$(curl -s -o /tmp/beat-v2-portada.html -w '%{http_code}' "$URL/")"
[ "$codigo" = "200" ] || { fallo "La portada respondió $codigo"; exit 1; }
bien "portada 200"

# El contenido del CMS: con `CMS_URL` puesto, la portada enlaza varias notas. Sin
# él, el sitio se pinta entero SIN una sola. Es la señal más barata y la que
# distingue "desplegado" de "desplegado y vacío".
notas="$(grep -o 'href="/noticias/[a-z0-9-]*"' /tmp/beat-v2-portada.html | sort -u | wc -l | tr -d ' ')"
if [ "$notas" -lt 1 ]; then
  fallo "La portada respondió 200 pero SIN CONTENIDO (0 notas enlazadas).
  Casi siempre es \`CMS_URL\` ausente en el entorno del servicio — es una variable
  de RUNTIME, sin prefijo PUBLIC_, así que no basta con que estuviera en el build.
  Revisa:  $SUDO systemctl show $SERVICIO -p Environment"
  exit 1
fi
bien "$notas notas enlazadas en la portada"

# ⚠️ En PREPRODUCCIÓN el `noindex` tiene que estar PUESTO. Se comprueba en las dos
# capas independientes, porque cada una se rompe por su lado: la cabecera la pone
# el middleware por `Host`, la etiqueta la pone el layout por el dominio del build.
if curl -sI "$URL/" | grep -qi 'x-robots-tag:.*noindex'; then
  bien "X-Robots-Tag: noindex"
else
  fallo "FALTA el X-Robots-Tag noindex. v2 quedaría indexable y le competiría al
  sitio real como duplicado. Suele ser \`ProxyPreserveHost On\` ausente en el vhost:
  sin él Node recibe Host: localhost y el middleware pierde su única señal."
  exit 1
fi

grep -q '<meta name="robots" content="noindex' /tmp/beat-v2-portada.html \
  && bien "<meta robots> noindex" \
  || { fallo "FALTA el <meta robots> noindex (revisa PUBLIC_SITE_URL del build)"; exit 1; }

printf '\n\033[32m✓ v2 desplegado en %s\033[0m\n' "$(git rev-parse --short HEAD)"
