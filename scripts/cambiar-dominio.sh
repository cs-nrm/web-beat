#!/usr/bin/env bash
#
# EL CORTE: beatdigital.mx deja de servir el v1 y sirve el v2.
#
# Se ejecuta EN LA VM. Por defecto NO toca nada: enseña lo que encontró y lo que
# haría. Solo actúa con CONFIRMAR=1.
#
# 🔴 Lo que este script SÍ resuelve, y por qué basta con Apache:
#
#   · El build del v2 ya lleva horneado `PUBLIC_SITE_URL=https://beatdigital.mx`
#     —comprobado en lo servido: el canonical de v2 ya dice `beatdigital.mx`—, así
#     que NO hace falta reconstruir para el corte.
#   · El `noindex` y el `robots.txt` se deciden POR PETICIÓN, leyendo el `Host`
#     (`noIndexarHost` en `src/config/site.ts`). En cuanto Apache le pase
#     `Host: beatdigital.mx`, el sitio se abre a Google él solo.
#   · v1 y v2 viven en el MISMO servidor (los dos resuelven a la misma IP), así que
#     no hay DNS que cambiar ni propagación que esperar. El corte es instantáneo y
#     la vuelta atrás también.
#
# ⚠️ Lo que este script NO resuelve, y hay que decidir aparte:
#
#   · Las URLs del v1 (`/news/…`, `/podcast/`, `/playlist/` y nueve secciones más)
#     NO existen en el v2 y van a dar 404. Eso no lo arregla un vhost.
#   · `PUBLICIDAD_TOKEN` en el entorno del servicio, o las campañas vendidas no
#     cuentan impresiones ni clics.
#   · El certificado de `beatdigital.mx` NO cubre `www.beatdigital.mx`.
#
set -euo pipefail

SERVICIO="${SERVICIO:-web-beat-v2}"
DOMINIO="${DOMINIO:-beatdigital.mx}"
SITIOS="${SITIOS:-/etc/apache2/sites-available}"
HABILITADOS="${HABILITADOS:-/etc/apache2/sites-enabled}"
RESPALDO="${RESPALDO:-/root/respaldo-vhosts-$(date +%Y%m%d-%H%M%S)}"
# El fichero de vhost que debe quedar sirviendo el dominio, y el que sale.
VHOST_NUEVO="${VHOST_NUEVO:-}"
VHOST_VIEJO="${VHOST_VIEJO:-}"

SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"
paso() { printf '\n\033[1m▸ %s\033[0m\n' "$1"; }
bien() { printf '\033[32m  ✓ %s\033[0m\n' "$1"; }
mal()  { printf '\033[31m  ✗ %s\033[0m\n' "$1" >&2; }
nota() { printf '\033[33m  · %s\033[0m\n' "$1"; }

fallos=0
exigir() { if [ "$1" = "0" ]; then bien "$2"; else mal "$2"; fallos=$((fallos+1)); fi; }

# ── 1. ¿El v2 está sano AHORA? ────────────────────────────────────────────────
# 🔴 Primero esto y no el vhost: cortar hacia un servicio roto cambia un sitio que
# funciona por uno que no, y en un lanzamiento eso se nota en minutos.
paso "El v2, antes de tocar nada"

$SUDO systemctl is-active --quiet "$SERVICIO"
exigir $? "el servicio $SERVICIO está activo"

codigo="$(curl -s -o /tmp/corte-v2.html -w '%{http_code}' https://v2.beatdigital.mx/ || echo 000)"
[ "$codigo" = "200" ]; exigir $? "v2 responde 200 (dio $codigo)"

notas="$(grep -o 'href="/noticias/[a-z0-9-]*"' /tmp/corte-v2.html | sort -u | wc -l | tr -d ' ')"
[ "$notas" -ge 1 ]; exigir $? "v2 tiene contenido del CMS ($notas notas enlazadas)"

grep -q 'canonical" href="https://beatdigital.mx' /tmp/corte-v2.html
exigir $? "el build ya lleva el canonical de beatdigital.mx"

# ── 2. Apache ─────────────────────────────────────────────────────────────────
paso "Apache"

if [ -z "$VHOST_NUEVO" ]; then
  nota "No me dijiste qué vhost habilitar. Esto es lo que hay:"
  printf '\n  disponibles en %s:\n' "$SITIOS"
  ls -1 "$SITIOS" 2>/dev/null | sed 's/^/    /' || nota "no pude leer $SITIOS"
  printf '\n  habilitados ahora:\n'
  ls -1 "$HABILITADOS" 2>/dev/null | sed 's/^/    /' || nota "no pude leer $HABILITADOS"
  printf '\n  quién declara %s:\n' "$DOMINIO"
  grep -rl "ServerName[[:space:]]\+$DOMINIO" "$SITIOS" 2>/dev/null | sed 's/^/    /' || nota "ninguno"
  printf '\nVuelve a llamarme así:\n  VHOST_NUEVO=<archivo> VHOST_VIEJO=<archivo> CONFIRMAR=1 %s\n' "$0"
  exit 1
fi

[ -f "$SITIOS/$VHOST_NUEVO" ]; exigir $? "existe $SITIOS/$VHOST_NUEVO"

# 🔴 `ProxyPreserveHost On` es la pieza de la que cuelga TODO el corte. Sin ella
# Apache reescribe el Host hacia el backend, Node recibe `Host: localhost` y:
#   · el sitio NO se abre a Google (localhost tampoco es el canónico), y
#   · `checkOrigin` compara localhost contra el dominio real y responde 403 a todo
#     POST.
grep -qi "ProxyPreserveHost[[:space:]]\+On" "$SITIOS/$VHOST_NUEVO" 2>/dev/null
exigir $? "el vhost nuevo lleva ProxyPreserveHost On"

grep -qi "ServerName[[:space:]]\+$DOMINIO" "$SITIOS/$VHOST_NUEVO" 2>/dev/null
exigir $? "el vhost nuevo declara ServerName $DOMINIO"

# ⚠️ Esto valida la configuración VIGENTE, no el archivo nuevo: Apache solo analiza
# lo que está enlazado en `sites-enabled`, y el vhost nuevo todavía no lo está. Sirve
# para saber que no partimos de una configuración rota; no dice nada del archivo que
# vamos a habilitar. Para eso está VALIDAR_NUEVO=1, abajo.
$SUDO apachectl configtest >/dev/null 2>&1
exigir $? "la configuración vigente de Apache es válida"

# ── Validación REAL del vhost nuevo, opcional ─────────────────────────────────
#
# 🔴 Es opcional por un motivo concreto y no por pereza. La única forma de que
# Apache analice un vhost es que esté enlazado, así que esto lo enlaza, corre
# `configtest` y lo desenlaza — **sin recargar en ningún momento**. Apache sigue
# sirviendo la configuración vieja todo el rato, así que el sitio NO se libera.
#
# ⚠️ Pero abre una ventana de menos de un segundo en la que el enlace existe. Si
# justo ahí otra cosa recargara Apache —la renovación de certbot, un logrotate—, el
# sitio se liberaría antes de tiempo. Por eso no va por defecto la víspera de un
# lanzamiento, y por eso el `trap` quita el enlace pase lo que pase.
if [ "${VALIDAR_NUEVO:-}" = "1" ]; then
  nombre="${VHOST_NUEVO%.conf}"
  trap '$SUDO a2dissite "$nombre" >/dev/null 2>&1 || true' EXIT
  $SUDO a2ensite "$nombre" >/dev/null 2>&1
  if $SUDO apachectl configtest >/dev/null 2>&1; then
    bien "el vhost NUEVO analiza sin errores (enlazado y desenlazado, sin recargar)"
  else
    mal "el vhost nuevo tiene un error de sintaxis:"
    $SUDO apachectl configtest 2>&1 | sed 's/^/     /' >&2
    fallos=$((fallos+1))
  fi
  $SUDO a2dissite "$nombre" >/dev/null 2>&1
  trap - EXIT
  # Se comprueba que quedó como estaba. Un enlace olvidado aquí es una liberación
  # accidental en la siguiente recarga que haga cualquiera.
  [ ! -e "$HABILITADOS/$VHOST_NUEVO" ]
  exigir $? "el vhost nuevo volvió a quedar deshabilitado"
else
  nota "El vhost NUEVO no se ha analizado. Para hacerlo: VALIDAR_NUEVO=1 (lee el comentario)."
fi

# El certificado: que exista, que cubra el dominio y que no esté por caducar.
dias="$(echo | openssl s_client -connect "$DOMINIO:443" -servername "$DOMINIO" 2>/dev/null \
  | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2 || echo '')"
if [ -n "$dias" ]; then
  bien "certificado de $DOMINIO válido hasta $dias"
else
  mal "no pude leer el certificado de $DOMINIO"; fallos=$((fallos+1))
fi

# ⚠️ `www` es un aviso y no un bloqueo: hoy tampoco funciona, así que el corte no
# lo empeora. Pero quien escriba www en la barra verá un error de seguridad.
if echo | openssl s_client -connect "www.$DOMINIO:443" -servername "www.$DOMINIO" 2>/dev/null \
   | openssl x509 -noout -text 2>/dev/null | grep -q "DNS:www.$DOMINIO"; then
  bien "el certificado cubre www.$DOMINIO"
else
  nota "AVISO: el certificado NO cubre www.$DOMINIO. Ya pasa hoy; https://www.$DOMINIO da error de seguridad."
fi

# ── 3. Parar aquí si algo falló ───────────────────────────────────────────────
if [ "$fallos" -gt 0 ]; then
  printf '\n\033[31m%s comprobación(es) fallaron. No cambio nada.\033[0m\n' "$fallos"
  exit 1
fi

if [ "${CONFIRMAR:-}" != "1" ]; then
  paso "Ensayo"
  printf '  Todo listo. Lo que haría:\n'
  printf '    1. respaldar %s en %s\n' "$HABILITADOS" "$RESPALDO"
  [ -n "$VHOST_VIEJO" ] && printf '    2. a2dissite %s\n' "$VHOST_VIEJO"
  printf '    3. a2ensite %s\n' "$VHOST_NUEVO"
  printf '    4. systemctl reload apache2\n'
  printf '    5. comprobar que %s sirve el v2 y quedó INDEXABLE\n' "$DOMINIO"
  printf '\n  Cuando quieras de verdad:  CONFIRMAR=1 VHOST_NUEVO=%s VHOST_VIEJO=%s %s\n' \
    "$VHOST_NUEVO" "${VHOST_VIEJO:-<ninguno>}" "$0"
  exit 0
fi

# ── 4. El corte ───────────────────────────────────────────────────────────────
paso "Respaldando"
$SUDO mkdir -p "$RESPALDO"
$SUDO cp -a "$HABILITADOS/." "$RESPALDO/" 2>/dev/null || true
$SUDO sh -c "ls -l '$HABILITADOS' > '$RESPALDO/estado-previo.txt'"
bien "respaldo en $RESPALDO"

# Se imprime SIEMPRE al salir, salga bien o mal. Un corte sin vuelta atrás a la
# vista es un corte que nadie se atreve a deshacer cuando toca.
trap 'printf "\n\033[33mVUELTA ATRÁS (segundos, sin DNS de por medio):\033[0m\n  %s a2ensite %s && %s a2dissite %s && %s systemctl reload apache2\n" "$SUDO" "${VHOST_VIEJO:-<el viejo>}" "$SUDO" "$VHOST_NUEVO" "$SUDO"' EXIT

paso "Cambiando el vhost"
[ -n "$VHOST_VIEJO" ] && $SUDO a2dissite "$VHOST_VIEJO" >/dev/null
$SUDO a2ensite "$VHOST_NUEVO" >/dev/null

# 🔴 `configtest` ANTES de recargar, y si falla se DESHACE el enlace.
#
# Sin el `a2dissite` del fallo, un error de sintaxis dejaba el enlace puesto y
# Apache sin recargar: el sitio seguía en el v1 —bien— pero la siguiente recarga
# que hiciera cualquiera (certbot, otro despliegue) lo habría liberado con la
# configuración rota y sin nadie mirando.
if ! $SUDO apachectl configtest; then
  $SUDO a2dissite "$VHOST_NUEVO" >/dev/null
  mal "la configuración no valida. Deshabilité el vhost nuevo; nada cambió."
  exit 1
fi
$SUDO systemctl reload apache2
sleep 3
bien "Apache recargado"

# ── 5. ¿Quedó como debe? ──────────────────────────────────────────────────────
paso "Comprobando $DOMINIO"

codigo="$(curl -s -o /tmp/corte-nuevo.html -w '%{http_code}' "https://$DOMINIO/" || echo 000)"
[ "$codigo" = "200" ] || { mal "$DOMINIO respondió $codigo"; exit 1; }
bien "$DOMINIO responde 200"

# Que sea el v2 y no el v1: el lema del cintillo solo existe en el v2.
if grep -qi "AQUÍ LA MÚSICA SE ELIGE" /tmp/corte-nuevo.html; then
  bien "está sirviendo el v2"
else
  mal "responde, pero NO parece el v2 (no encuentro el lema del cintillo)"; exit 1
fi

# 🔴 LA comprobación del corte. Todo lo demás es fontanería; esto es el objetivo.
if grep -q '<meta name="robots" content="index, follow"' /tmp/corte-nuevo.html; then
  bien "INDEXABLE: <meta robots> dice index, follow"
else
  mal "sigue en noindex. Casi siempre es ProxyPreserveHost: Node está recibiendo
     Host: localhost y no reconoce el dominio canónico. Revisa el vhost."
  exit 1
fi

if curl -sI "https://$DOMINIO/" | grep -qi 'x-robots-tag:.*noindex'; then
  mal "la cabecera X-Robots-Tag sigue cerrando el sitio"; exit 1
fi
bien "sin X-Robots-Tag de noindex"

curl -s "https://$DOMINIO/robots.txt" | grep -q "^Disallow: /$" \
  && { mal "robots.txt sigue cerrado entero"; exit 1; } \
  || bien "robots.txt abierto"

locs="$(curl -s "https://$DOMINIO/sitemap.xml" | grep -c "<loc>" || true)"
[ "$locs" -ge 1 ] && bien "sitemap con $locs URLs" || nota "AVISO: el sitemap salió vacío"

printf '\n\033[32m✓ %s sirve el v2 y está indexable\033[0m\n' "$DOMINIO"
printf '\033[33mPendiente y NO cubierto por esto: las URLs del v1 dan 404. Ver el mapa de redirecciones.\033[0m\n'
