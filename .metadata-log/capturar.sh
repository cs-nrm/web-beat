#!/usr/bin/env bash
# Captura el canal SBM de Triton durante N segundos y lo guarda crudo.
set -u
DUR="${1:-600}"
DIR="$(cd "$(dirname "$0")" && pwd)"
SBMID=$(python3 -c "import uuid;print(uuid.uuid4())")
H=14023
BASE="https://$H.live.streamtheworld.com"
STAMP=$(date +%Y%m%d-%H%M%S)
# El audio registra la sesión; sin esto el SBM responde 404 "Invalid or expired Session ID".
curl -sN --max-time "$((DUR+10))" -A "Mozilla/5.0" \
  "$BASE/XHSONFMAAC.aac?Dist=WebBeat&tdsdk=js-2.9&swm=false&sbmid=$SBMID" -o /dev/null &
sleep 3
curl -sN --max-time "$DUR" -H 'Accept: text/event-stream' \
  "$BASE/XHSONFMAAC_SBM?sbmid=$SBMID" -o "$DIR/crudo-$STAMP.sse"
wait 2>/dev/null
echo "$DIR/crudo-$STAMP.sse"
