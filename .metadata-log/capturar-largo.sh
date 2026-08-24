#!/usr/bin/env bash
# Captura CRUDA del canal SBM de Triton. NO filtra nada: todo lo que llegue va al
# archivo, tal cual, incluidos los cuerpos de error. El filtrado es del analizador.
# Uso: ./capturar-largo.sh <minutos>
set -u
MIN="${1:-170}"

# 🔴 Sin esto una captura larga NO SIRVE en una laptop.
# Medido el 2026-08-21: una captura de 420 min murió a los 111 porque se cerró la
# tapa («Entering Sleep state due to Clamshell Sleep», 17:06). Los cue points se
# cortan de golpe y el archivo PARECE el fallo del emisor que estamos buscando —
# horas de conexión abierta sin un solo evento— cuando es la máquina durmiendo.
# `caffeinate -is` mantiene el sistema despierto mientras dure el proceso.
if command -v caffeinate >/dev/null && [ -z "${SIN_CAFEINA:-}" ]; then
  exec caffeinate -is env SIN_CAFEINA=1 "$0" "$@"
fi
DIR="$(cd "$(dirname "$0")" && pwd)"
STAMP=$(date +%Y%m%d-%H%M)
SALIDA="$DIR/largo-$STAMP.sse"
BITACORA="$DIR/largo-$STAMP.log"
FIN=$(( $(date +%s) + MIN*60 ))
B="https://14023.live.streamtheworld.com"

# 🔴 UN solo sbmid y UNA sola conexión de audio que lo sostenga: la sesión la
# registra el audio. Un sbmid nuevo por reconexión da 404 "Invalid or expired
# Session ID"; dos canales SBM con el mismo sbmid dan 409 Conflict.
SBMID=$(python3 -c "import uuid;print(uuid.uuid4())")
: > "$SALIDA"
echo "$(date -u +%FT%TZ) inicio sbmid=$SBMID min=$MIN" >> "$BITACORA"

curl -sN --max-time "$((MIN*60+120))" -A "Mozilla/5.0" \
  "$B/XHSONFMAAC.aac?Dist=WebBeat&tdsdk=js-2.9&swm=false&sbmid=$SBMID" -o /dev/null &
AUDIO=$!
trap 'kill $AUDIO 2>/dev/null' EXIT
sleep 5

N=0; ESPERA=1
while [ "$(date +%s)" -lt "$FIN" ]; do
  N=$((N+1)); RESTA=$(( FIN - $(date +%s) ))
  [ "$RESTA" -le 5 ] && break
  echo "### $(date -u +%FT%TZ) conexion=$N" >> "$SALIDA"
  # 🔴 Se escribe DIRECTO al archivo, sin temporal. La versión anterior bufferizaba
  # en un temporal y volcaba al cerrar, "para no contaminar el archivo de datos" —
  # y con eso una conexión larga no mostraba NADA hasta terminar. El requisito es
  # ver todo en el momento; los cuerpos de error los descarta el analizador.
  HTTP=$(curl -sN --max-time "$RESTA" -w '%{http_code}' \
    -H 'Accept: text/event-stream' \
    "$B/XHSONFMAAC_SBM?sbmid=$SBMID" 2>/dev/null >> "$SALIDA" || true)
  case "$HTTP" in
    200|"")
      # 200 al cerrar, o vacío porque `--max-time` cortó una conexión sana.
      ESPERA=1 ;;
    504)
      # NORMAL, no es fallo: el canal se cae por INACTIVIDAD (~90 s sin cue points),
      # y a media canción eso pasa siempre. Se descubrió porque la primera captura
      # aguantó 9.5 min: había caído en un bloque comercial con eventos cada ~19 s.
      # Reconectar de inmediato; retroceder aquí sería perderse los cue points.
      ESPERA=1 ;;
    *)
      ESPERA=$(( ESPERA * 2 )); [ "$ESPERA" -gt 120 ] && ESPERA=120 ;;
  esac
  echo "$(date -u +%FT%TZ) conexion=$N http=${HTTP:-corte} bytes=$(wc -c < "$SALIDA" | tr -d ' ') espera=${ESPERA}s audio=$(kill -0 $AUDIO 2>/dev/null && echo si || echo NO)" >> "$BITACORA"
  kill -0 $AUDIO 2>/dev/null || { echo "$(date -u +%FT%TZ) audio caido, fin" >> "$BITACORA"; break; }
  sleep "$ESPERA"
done
echo "$SALIDA"
