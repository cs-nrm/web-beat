#!/usr/bin/env python3
"""Mide la CONTINUIDAD del stream de audio de Beat.

Responde la pregunta que importa: ¿el stream se interrumpe por sí solo, desde una
conexión estable? Si sí, los cortes que reportan los oyentes no son (solo) su
internet. Si no, la evidencia apunta a la red del oyente.

Lee el stream en trozos y registra cuándo llega cada uno. Un HUECO —bytes que
dejan de llegar más de N segundos— es un corte medible.

Uso: python3 medir-audio.py <minutos> [umbral_seg]
"""
import sys, time, json, urllib.request, uuid
from datetime import datetime, timezone, timedelta

CDMX = timezone(timedelta(hours=-6))
MIN = float(sys.argv[1]) if len(sys.argv) > 1 else 60
UMBRAL = float(sys.argv[2]) if len(sys.argv) > 2 else 2.0
BITRATE_ESPERADO = 48_000 / 8  # 6 KB/s nominal

sbmid = str(uuid.uuid4())
url = (f"https://14023.live.streamtheworld.com/XHSONFMAAC.aac"
       f"?Dist=WebBeat&tdsdk=js-2.9&swm=false&sbmid={sbmid}")
salida = f".metadata-log/audio-{datetime.now(CDMX):%Y%m%d-%H%M}.jsonl"

def anotar(d):
    d['t'] = datetime.now(CDMX).isoformat(timespec='seconds')
    with open(salida, 'a') as f:
        f.write(json.dumps(d, ensure_ascii=False) + '\n')
    print(json.dumps(d, ensure_ascii=False), flush=True)

fin = time.time() + MIN * 60
reconexiones = 0
anotar({'ev': 'inicio', 'min': MIN, 'umbral_s': UMBRAL, 'url': url.split('?')[0]})

while time.time() < fin:
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=20) as r:
            anotar({'ev': 'conectado', 'http': r.status, 'reconexion': reconexiones})
            ultimo = time.time()
            bytes_ventana = 0
            inicio_ventana = time.time()
            total = 0
            while time.time() < fin:
                trozo = r.read(4096)
                ahora = time.time()
                if not trozo:
                    anotar({'ev': 'fin_de_flujo', 'total_bytes': total})
                    break
                hueco = ahora - ultimo
                if hueco >= UMBRAL:
                    # 🔴 Esto es un CORTE: los bytes dejaron de llegar.
                    anotar({'ev': 'HUECO', 'segundos': round(hueco, 2),
                            'total_bytes': total})
                ultimo = ahora
                total += len(trozo)
                bytes_ventana += len(trozo)
                # Resumen de caudal cada 60 s: si baja del nominal, hay problema.
                if ahora - inicio_ventana >= 60:
                    kbps = bytes_ventana * 8 / (ahora - inicio_ventana) / 1000
                    anotar({'ev': 'caudal', 'kbps': round(kbps, 1),
                            'vs_nominal': f"{bytes_ventana/(ahora-inicio_ventana)/BITRATE_ESPERADO:.2f}x",
                            'total_mb': round(total / 1_048_576, 2)})
                    bytes_ventana = 0
                    inicio_ventana = ahora
    except Exception as e:
        anotar({'ev': 'ERROR', 'tipo': type(e).__name__, 'msg': str(e)[:120]})
    if time.time() < fin:
        reconexiones += 1
        anotar({'ev': 'reconectando', 'n': reconexiones})
        time.sleep(2)

anotar({'ev': 'terminado', 'reconexiones': reconexiones})
