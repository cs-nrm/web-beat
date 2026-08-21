#!/usr/bin/env bash
# Captura el canal SBM de forma continua, reconectando, y APENDA a un solo archivo.
# Uso: ./capturar-largo.sh <minutos_totales>
set -u
MIN="${1:-180}"
DIR="$(cd "$(dirname "$0")" && pwd)"
SALIDA="$DIR/largo-$(date +%Y%m%d-%H%M).sse"
FIN=$(( $(date +%s) + MIN*60 ))
H=14023
BASE="https://$H.live.streamtheworld.com"

while [ "$(date +%s)" -lt "$FIN" ]; do
  SBMID=$(python3 -c "import uuid;print(uuid.uuid4())")
  # El audio registra la sesión; sin él el SBM da 404.
  curl -sN --max-time 620 -A "Mozilla/5.0" \
    "$BASE/XHSONFMAAC.aac?Dist=WebBeat&tdsdk=js-2.9&swm=false&sbmid=$SBMID" -o /dev/null &
  AUDIO=$!
  sleep 3
  echo "### reconexión $(date -u +%Y-%m-%dT%H:%M:%SZ) sbmid=$SBMID" >> "$SALIDA"
  curl -sN --max-time 600 -H 'Accept: text/event-stream' \
    "$BASE/XHSONFMAAC_SBM?sbmid=$SBMID" >> "$SALIDA"
  kill $AUDIO 2>/dev/null
  wait $AUDIO 2>/dev/null
done
echo "$SALIDA"
