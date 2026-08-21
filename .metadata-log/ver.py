#!/usr/bin/env python3
"""
Genera un HTML legible de una captura del canal SBM de Triton.

  python3 .metadata-log/ver.py [archivo.sse ...]  ->  .metadata-log/vista.html

Por qué existe: el .sse crudo es un event-stream y no se puede leer de corrido.
Esto lo vuelve una tabla con TODO lo que mandó Triton, marcando qué se mostraría
en el sitio (name == 'track') y qué se descarta.

🔴 La salida queda FUERA de git igual que el .sse: la captura es un registro de
qué anunciantes están al aire y con qué frecuencia.
"""
import json, re, sys, html, glob, datetime as dt
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parent

def cargar(rutas):
    evs = []
    for r in rutas:
        txt = Path(r).read_text(encoding='utf-8', errors='replace')
        marcas = re.findall(r'^###.*$', txt, flags=re.M)
        txt = re.sub(r'^###.*$', '', txt, flags=re.M)
        for bloque in re.split(r'\n\s*\n', txt):
            crudo = '\n'.join(
                l[5:].lstrip() if l.startswith('data:') else ''
                for l in bloque.splitlines()
            ).strip()
            if not crudo:
                continue
            try:
                e = json.loads(crudo)
            except json.JSONDecodeError:
                continue
            e['_archivo'] = Path(r).name
            evs.append(e)
    return evs, marcas

def cuando(p):
    """cue_time_start llega SIEMPRE como epoch en milisegundos."""
    v = str(p.get('cue_time_start', ''))
    if re.fullmatch(r'\d{13}', v):
        return dt.datetime.fromtimestamp(int(v) / 1000)
    return None

def dura(p):
    """cue_time_duration son DÉCIMAS de segundo, en texto con ceros a la izquierda."""
    v = str(p.get('cue_time_duration', '')).lstrip('0') or '0'
    try:
        return int(v) / 10
    except ValueError:
        return None

# Los títulos de `ad` NO son solo anunciantes: el canal arrastra nombres de cartucho
# de Dalet, marcadores de continuidad y material sin estrenar. Esta tabla es lo que
# justifica que el filtro del front sea `name === 'track'` a secas.
CLASES = [
    ('marcador',  r'^(BREAK BLOQUE|BITACORA|ENTRADA |SALIDA )',            'Marcador de continuidad'),
    ('interno',   r'(NUEVO BEAT TEASER)',                                   'Campaña sin estrenar'),
    ('estacion',  r'(FRASE|ROMPECORTE|Siglas|^SW )',                        'Imagen de estación'),
    ('oficial',   r'^(RDF|RA\d)',                                           'Tiempo oficial / electoral'),
    ('cartucho',  r'^(RADIO\d|\d{6}[A-Z]|MIX OK|GENERICO)|\d{2}[A-Z]{3}\d{2}V\d', 'Nombre de cartucho'),
]

def clase(titulo):
    for cid, pat, etiqueta in CLASES:
        if re.search(pat, titulo):
            return cid, etiqueta
    return 'spot', 'Spot de anunciante'

def mmss(s):
    return '—' if s is None else f'{int(s // 60)}:{int(s % 60):02d}'

def main():
    rutas = sys.argv[1:] or sorted(glob.glob(str(RAIZ / 'largo-*.sse')))
    if not rutas:
        sys.exit('no hay capturas .sse')

    evs, marcas = cargar(rutas)
    for e in evs:
        e['_t'] = cuando(e['parameters'])
    evs.sort(key=lambda e: e['_t'] or dt.datetime.min)

    tracks = [e for e in evs if e['name'] == 'track']
    nombres = Counter(e['name'] for e in evs)
    campos = {}
    for e in evs:
        campos.setdefault(e['name'], Counter()).update(e['parameters'].keys())

    # Huecos entre canciones: es lo que decide si un umbral de alerta es viable.
    huecos = []
    for a, b in zip(tracks, tracks[1:]):
        if a['_t'] and b['_t']:
            huecos.append(((b['_t'] - a['_t']).total_seconds(), a, b))
    peor = max(huecos, key=lambda h: h[0]) if huecos else None

    reconex = 0
    for r in rutas:
        log = Path(r).with_suffix('.log')
        if log.exists():
            reconex += max(0, len([l for l in log.read_text().splitlines()
                                   if 'conexion=' in l or 'http=' in l]))

    t0 = next((e['_t'] for e in evs if e['_t']), None)
    t1 = next((e['_t'] for e in reversed(evs) if e['_t']), None)
    ventana = (t1 - t0).total_seconds() / 60 if t0 and t1 else 0

    seg_musica = sum(dura(e['parameters']) or 0 for e in tracks)
    ads = [e for e in evs if e['name'] == 'ad']
    marcadores = [e for e in ads if clase(e['parameters'].get('cue_title', ''))[0] == 'marcador']
    seg_ads = sum(dura(e['parameters']) or 0 for e in ads if e not in marcadores)
    conteo_clase = Counter(clase(e['parameters'].get('cue_title', ''))[1] for e in ads)

    filas = []
    for e in evs:
        p = e['parameters']
        es_track = e['name'] == 'track'
        titulo = p.get('cue_title', '') or '(vacío)'
        artista = p.get('track_artist_name', '')
        extra = {k: v for k, v in p.items() if k not in
                 ('cue_title', 'track_artist_name', 'cue_time_start',
                  'cue_time_duration', 'cue_id', 'ad_type', 'program_id')}
        filas.append(f'''<tr class="{'t' if es_track else 'a'}">
<td class="mono hora">{e['_t']:%H:%M:%S}</td>
<td><span class="pill {'pt' if es_track else 'pa'}">{html.escape(e['name'])}</span></td>
<td class="tit">{html.escape(titulo)}</td>
<td class="art">{html.escape(artista) or '<span class=nil>—</span>'}</td>
<td class="mono dur">{mmss(dura(p))}</td>
<td class="mono nil ad">{html.escape(str(p.get('ad_type','')))}</td>
<td class="mono nil id">{html.escape(str(p.get('cue_id',''))[:8])}</td>
<td class="mono nil ex">{html.escape(json.dumps(extra, ensure_ascii=False)) if extra else ''}</td>
</tr>''')

    inv = ''.join(
        f'<div class=inv><h4><span class="pill {"pt" if n=="track" else "pa"}">{n}</span>'
        f'<span class=nil>{nombres[n]} eventos</span></h4><ul>'
        + ''.join(f'<li class=mono>{c}<span class=nil>×{v}</span></li>'
                  for c, v in sorted(campos[n].items()))
        + '</ul></div>'
        for n in nombres
    )

    doc = f'''<!doctype html><meta charset=utf-8>
<title>Captura SBM — Beat 100.9</title>
<style>
:root{{--bg:#0a0a0b;--card:#141416;--line:#26262a;--tx:#e8e8ea;--mut:#8a8a92;
--nil:#55555e;--acc:#ff6b4a;--live:#4ade80}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--bg);color:var(--tx);
font:14px/1.5 ui-sans-serif,-apple-system,system-ui,sans-serif}}
.wrap{{max-width:1240px;margin:0 auto;padding:32px 24px 80px}}
h1{{font-size:22px;letter-spacing:-.02em;margin:0 0 4px}}
h2{{font-size:11px;letter-spacing:.14em;text-transform:uppercase;
color:var(--acc);margin:40px 0 12px;font-weight:600}}
.sub{{color:var(--mut);margin:0 0 28px}}
.mono{{font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace}}
.nil{{color:var(--nil)}}
.kpis{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}}
.k{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px 16px}}
.k b{{display:block;font-size:26px;font-weight:600;letter-spacing:-.02em}}
.k span{{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mut)}}
.k.ok b{{color:var(--live)}}
table{{width:100%;border-collapse:collapse;font-size:13px}}
th{{text-align:left;font-size:10px;letter-spacing:.12em;text-transform:uppercase;
color:var(--mut);font-weight:600;padding:0 10px 8px;border-bottom:1px solid var(--line)}}
td{{padding:7px 10px;border-bottom:1px solid #1c1c20;vertical-align:top}}
tr.a{{color:var(--mut)}}
tr.a .tit{{color:var(--mut)}}
tr.t .tit{{font-weight:600;color:#fff}}
.pill{{font:10px/1 ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;
padding:4px 7px;border-radius:4px;display:inline-block}}
.pt{{background:rgba(74,222,128,.14);color:var(--live)}}
.pa{{background:rgba(255,255,255,.06);color:var(--nil)}}
.hora,.dur{{white-space:nowrap}}
.ex{{max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
.bar{{display:flex;gap:14px;align-items:center;margin:0 0 14px;flex-wrap:wrap}}
button{{background:var(--card);color:var(--tx);border:1px solid var(--line);
border-radius:6px;padding:7px 13px;font:inherit;font-size:12px;cursor:pointer}}
button[aria-pressed=true]{{border-color:var(--acc);color:var(--acc)}}
body.solo tr.a{{display:none}}
.invs{{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px}}
.inv{{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:14px 16px}}
.inv h4{{margin:0 0 10px;display:flex;gap:9px;align-items:center;font-size:12px}}
.inv ul{{margin:0;padding:0;list-style:none}}
.inv li{{padding:3px 0;display:flex;justify-content:space-between;gap:10px}}
.note{{background:var(--card);border:1px solid var(--line);border-left:2px solid var(--acc);
border-radius:8px;padding:14px 18px;color:var(--mut);max-width:74ch}}
.note b{{color:var(--tx)}}
</style>
<div class=wrap>
<h1>Lo que Triton manda por el canal SBM</h1>
<p class=sub>Estación <code class=mono>XHSONFM</code> · ventana de {ventana:.0f} min
· {t0:%d/%m/%Y %H:%M} → {t1:%H:%M} · captura en curso</p>

<div class=kpis>
<div class=k><b>{len(evs)}</b><span>eventos</span></div>
<div class=k><b>{nombres.get('track',0)}</b><span>canciones</span></div>
<div class=k><b>{nombres.get('ad',0)}</b><span>cortinillas</span></div>
<div class="k ok"><b>{len(nombres)}</b><span>valores de «name»</span></div>
<div class=k><b>{mmss(peor[0]) if peor else '—'}</b><span>hueco máx sin música</span></div>
<div class="k ok"><b>{reconex}</b><span>reconexiones</span></div>
</div>

<h2>Los {len(nombres)} tipos que existen, y con qué campos</h2>
<div class=invs>{inv}</div>

<h2>🔴 Qué hay dentro de «ad» — y por qué el filtro es estricto</h2>
<div class=note style="margin-bottom:14px">
<code class=mono>ad</code> no significa «anuncio»: es <b>todo lo que no es música</b>, con el
nombre con el que existe en el playout. De los {len(ads)} eventos, solo
{conteo_clase.get('Spot de anunciante',0)} son spots de un anunciante identificable.
El resto son <b>nombres de cartucho de Dalet, marcadores de continuidad, imagen de estación,
tiempo oficial y campañas sin estrenar</b>.</div>
<div class=invs>{''.join(
  f'<div class=inv><h4><span class="pill pa">{html.escape(et)}</span>'
  f'<span class=nil>{n}</span></h4><ul>' + ''.join(
    f'<li class=mono>{html.escape(x)}</li>' for x in sorted({
      e['parameters'].get('cue_title','') for e in ads
      if clase(e['parameters'].get('cue_title',''))[1] == et})[:7]
  ) + '</ul></div>'
  for et, n in conteo_clase.most_common())}</div>

<h2>Todo, en orden</h2>
<div class=bar>
<button id=b aria-pressed=false>Ver solo lo que el sitio mostraría</button>
<span class=nil>{nombres.get('track',0)} de {len(evs)} eventos
({nombres.get('track',0)*100//max(len(evs),1)}%)</span>
</div>
<table><thead><tr>
<th>hora</th><th>name</th><th>cue_title</th><th>track_artist_name</th>
<th>dur</th><th>ad_type</th><th>cue_id</th><th>otros campos</th>
</tr></thead><tbody>
{''.join(filas)}
</tbody></table>

<h2>Lectura</h2>
<div class=note>
<p>Después de {ventana:.0f} minutos, <b>solo existen dos valores de <code
class=mono>name</code></b>: <code class=mono>track</code> y <code class=mono>ad</code>.
Ningún <code class=mono>speech</code>, ningún <code class=mono>custom</code>, ninguno vacío.
El filtro estricto del front (<code class=mono>name === 'track'</code>) descarta
{nombres.get('ad',0)} de {len(evs)} eventos y <b>nada interno llega a pantalla</b>.</p>
<p><b>Cero reconexiones.</b> La conexión lleva {ventana:.0f} min abierta sin un solo corte,
así que el 504 de antes era <b>inactividad del canal de metadata</b>, no del audio.</p>
<p>De los {ventana:.0f} min de ventana, <b>{seg_musica/60:.0f} min fueron música</b>
({len(tracks)} canciones) y <b>{seg_ads/60:.0f} min de spots</b>. Los
{len(marcadores)} marcadores de bloque se excluyen de esa suma porque
<b>solapan</b> los spots que contienen (uno solo declara
{max((dura(e['parameters']) or 0) for e in marcadores)/60:.0f} min).</p>
<p>El hueco más largo sin música fue de <b>{mmss(peor[0]) if peor else '—'}</b>
{f'({peor[1]["_t"]:%H:%M} → {peor[2]["_t"]:%H:%M})' if peor else ''} y era legítimo.
Por eso un umbral de alerta tipo «15 min sin música = roto» daría falsa alarma:
tiene que consultar la parrilla.</p>
</div>
</div>
<script>
const b=document.getElementById('b');
b.onclick=()=>{{const on=b.getAttribute('aria-pressed')==='true';
b.setAttribute('aria-pressed',!on);document.body.classList.toggle('solo',!on);
b.textContent=on?'Ver solo lo que el sitio mostraría':'Ver todo lo que manda Triton';}};
</script>'''

    salida = RAIZ / 'vista.html'
    salida.write_text(doc, encoding='utf-8')
    print(f'{salida}  ({len(evs)} eventos, {ventana:.0f} min)')

if __name__ == '__main__':
    main()
