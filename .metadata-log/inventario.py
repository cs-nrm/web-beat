#!/usr/bin/env python3
"""Inventario del canal SBM: QUÉ puede llegar, no cuánto.

Responde: ¿qué valores de `name` existen? ¿qué campos? ¿hay algo que huela a
interno y que no debería salir en pantalla?

Uso: python3 inventario.py [archivo.sse ...]
"""
import json, re, sys, glob
from collections import Counter, defaultdict

archivos = sys.argv[1:] or sorted(glob.glob('.metadata-log/*.sse'))

nombres = Counter()
tipos = Counter()
campos_por_nombre = defaultdict(Counter)
ejemplos = defaultdict(list)
sinNombre = []
sinParsear = []
total = 0

for ruta in archivos:
    texto = open(ruta, encoding='utf-8', errors='replace').read()
    # Las marcas de reconexión no son eventos.
    texto = re.sub(r'^###.*$', '', texto, flags=re.M)
    for bloque in re.split(r'\n\s*\n', texto):
        crudo = '\n'.join(
            l[5:].lstrip() if l.startswith('data:') else ''
            for l in bloque.splitlines()
        ).strip()
        if not crudo:
            continue
        try:
            e = json.loads(crudo)
        except json.JSONDecodeError:
            sinParsear.append(crudo[:100]); continue
        total += 1
        tipos[e.get('type')] += 1
        n = e.get('name')
        nombres[n if n is not None else '(SIN NOMBRE)'] += 1
        p = e.get('parameters', {}) or {}
        if n is None:
            sinNombre.append(e)
        for k in p:
            campos_por_nombre[n][k] += 1
        if len(ejemplos[n]) < 4:
            ejemplos[n].append(p)

print(f"╔══ INVENTARIO — {total} eventos en {len(archivos)} archivo(s)")
print(f"╠══ type:  {dict(tipos)}")
print(f"╚══ name:  {dict(nombres)}\n")

if sinParsear:
    print(f"⚠️  {len(sinParsear)} bloques sin parsear (primeros 2): {sinParsear[:2]}\n")
if sinNombre:
    print(f"🔴 {len(sinNombre)} eventos SIN `name` — con lista blanca estricta NO se pintan.")
    print(f"   ejemplo: {sinNombre[0]}\n")

for n in nombres:
    clave = None if n == '(SIN NOMBRE)' else n
    print(f"── name = {n!r}  ({nombres[n]} eventos)")
    print(f"   campos: {dict(campos_por_nombre[clave])}")
    for ej in ejemplos[clave][:3]:
        t = ej.get('cue_title', '—')
        a = ej.get('track_artist_name')
        print(f"     · {t!r}" + (f" — {a!r}" if a else ""))
    print()

# ¿Qué se PINTARÍA con la lista blanca estricta?
print("═══ Lo que el sitio mostraría (solo name == 'track') ═══")
pintables = nombres.get('track', 0)
print(f"  {pintables} de {total} eventos ({pintables*100//max(total,1)}%)")
print(f"  Se descartan: {', '.join(f'{k} ({v})' for k, v in nombres.items() if k != 'track')}")
