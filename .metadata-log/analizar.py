#!/usr/bin/env python3
"""Analiza una captura del canal SBM de Triton y reporta consistencia.

Uso: python3 analizar.py crudo-*.sse
"""
import json, re, sys, glob
from datetime import datetime, timezone, timedelta

CDMX = timezone(timedelta(hours=-6))
archivos = sys.argv[1:] or sorted(glob.glob('.metadata-log/crudo-*.sse'))

def eventos(texto):
    """El SSE prefija cada línea con 'data: '. Se reconstruye el JSON por bloque."""
    for bloque in re.split(r'\n\s*\n', texto):
        crudo = '\n'.join(
            l[5:].lstrip() if l.startswith('data:') else ''
            for l in bloque.splitlines()
        ).strip()
        if not crudo:
            continue
        try:
            yield json.loads(crudo)
        except json.JSONDecodeError:
            yield {'_sinParsear': crudo[:120]}

for ruta in archivos:
    texto = open(ruta, encoding='utf-8', errors='replace').read()
    evs = list(eventos(texto))
    print(f"\n{'='*74}\n{ruta}  —  {len(evs)} eventos, {len(texto)} bytes\n{'='*74}")

    malos = [e for e in evs if '_sinParsear' in e]
    tipos, nombres = {}, {}
    filas = []
    for e in evs:
        if '_sinParsear' in e:
            continue
        tipos[e.get('type')] = tipos.get(e.get('type'), 0) + 1
        n = e.get('name')
        nombres[n] = nombres.get(n, 0) + 1
        p = e.get('parameters', {})
        filas.append({
            'name': n,
            'ts': e.get('timestamp'),
            'titulo': p.get('cue_title'),
            'artista': p.get('track_artist_name'),
            'dur': p.get('cue_time_duration'),
            'inicio': p.get('cue_time_start'),
            'cue_id': p.get('cue_id'),
            'ad_type': p.get('ad_type'),
            'program_id': p.get('program_id'),
        })

    print(f"type:   {tipos}")
    print(f"name:   {nombres}")
    if malos:
        print(f"⚠️  {len(malos)} bloques sin parsear: {malos[:2]}")

    print(f"\n{'+ms':>8}  {'name':<6} {'dur':>6}  título — artista")
    for f in filas:
        t = f['titulo'] or '(sin título)'
        a = f" — {f['artista']}" if f['artista'] else ''
        print(f"{f['ts']:>8}  {f['name']:<6} {str(f['dur'] or '—'):>6}  {t}{a}")

    # ── Consistencia ──
    print("\n--- consistencia ---")
    canciones = [f for f in filas if f['name'] == 'track']
    anuncios  = [f for f in filas if f['name'] == 'ad']
    print(f"  canciones: {len(canciones)}   cortinillas/anuncios: {len(anuncios)}")

    sinTitulo  = [f for f in filas if not f['titulo']]
    sinArtista = [f for f in canciones if not f['artista']]
    print(f"  sin cue_title: {len(sinTitulo)}   canciones sin artista: {len(sinArtista)}")
    if sinArtista:
        print("    →", [f['titulo'] for f in sinArtista][:5])

    ids = [f['cue_id'] for f in filas if f['cue_id']]
    print(f"  cue_id únicos: {len(set(ids))}/{len(ids)}" + ("  ⚠️ hay repetidos" if len(set(ids)) != len(ids) else "  ✅"))

    # ¿Los timestamps avanzan? ¿Hay huecos largos sin nada?
    ts = [f['ts'] for f in filas if isinstance(f['ts'], int)]
    if len(ts) > 1:
        desordenado = any(b < a for a, b in zip(ts, ts[1:]))
        huecos = [b - a for a, b in zip(ts, ts[1:])]
        print(f"  orden temporal: {'⚠️ desordenado' if desordenado else '✅ monótono'}")
        print(f"  hueco entre eventos: min {min(huecos)/1000:.1f}s · mediana {sorted(huecos)[len(huecos)//2]/1000:.1f}s · MÁX {max(huecos)/1000:.1f}s")
        print(f"  ventana cubierta: {(ts[-1]-ts[0])/1000/60:.1f} min")

    # cue_time_start como reloj de pared
    inicios = [int(f['inicio']) for f in filas if f['inicio'] and f['inicio'].isdigit()]
    if inicios:
        a = datetime.fromtimestamp(min(inicios)/1000, CDMX)
        b = datetime.fromtimestamp(max(inicios)/1000, CDMX)
        print(f"  cue_time_start: {a:%H:%M:%S} → {b:%H:%M:%S} (CDMX)")

    # La duración, para confirmar la unidad
    durs = [(f['titulo'], int(f['dur'])) for f in filas if f['dur'] and f['dur'].isdigit()]
    if durs:
        print("\n--- duraciones (¿décimas de segundo?) ---")
        for t, d in durs[:8]:
            print(f"  {d:>6} → {d/10/60:>4.1f} min si son décimas · {d/1000:>5.1f} s si son ms   {t[:42]}")
