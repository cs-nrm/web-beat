/**
 * Baja las webfonts a `public/fuentes/` y genera `src/styles/fuentes.css`.
 *
 * Solo los subconjuntos `latin` y `latin-ext`: el español no necesita más, y el
 * `unicode-range` hace que `latin-ext` solo se descargue si aparece un carácter
 * que lo requiera, así que incluirlo es gratis en tiempo de ejecución.
 *
 * Diferencia respecto al script equivalente de `web-enfoque`: las tres familias de
 * Beat son VARIABLES y con más de un eje, así que este sí captura `font-style`
 * (Schibsted Grotesk trae eje de itálica) y `font-stretch` (Archivo y Martian Mono
 * traen eje de ancho, y el DS usa Archivo expandido a wdth 125). Allá se
 * hardcodeaba `font-style: normal` porque ninguna familia lo necesitaba.
 */
import { mkdir, writeFile } from 'node:fs/promises';

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const DEST = 'public/fuentes';
const SUBSETS = new Set(['latin', 'latin-ext']);

/**
 * 🔴 Estas NO son las tipografías de marca de Beat: son sustitutos. El propio DS
 * lo dice ("no licensed brand fonts were provided"). Cuando lleguen las
 * licenciadas, se cambian los `.woff2` de `public/fuentes/` y las familias de
 * `ds/tokens/typography.css`; el resto del sitio no se toca.
 *
 * Los rangos se recortan a lo que el DS usa de verdad, no al máximo que ofrece
 * cada familia:
 *   · Archivo   — display. wdth 100..125 (el DS define 125 y 100), wght 400..800.
 *   · Schibsted — texto. wght 400..800, CON itálica: no la usa ningún rol
 *                 `--type-*`, pero el cuerpo editorial viene de Lexical y puede
 *                 traer `<em>`; sin cara real el navegador sintetiza una oblicua,
 *                 que en una cara de texto se ve mal.
 *   · Martian   — metadata y etiquetas. Solo wght 400..600 (`--type-mono` 400 y
 *                 `--type-label` 600); no se pide el eje de ancho.
 */
const FAMILIAS = [
  { nombre: 'Archivo', consulta: 'Archivo:wdth,wght@100..125,400..800', archivo: 'archivo' },
  { nombre: 'Schibsted Grotesk', consulta: 'Schibsted+Grotesk:ital,wght@0,400..800;1,400..800', archivo: 'schibsted-grotesk' },
  { nombre: 'Martian Mono', consulta: 'Martian+Mono:wght@400..600', archivo: 'martian-mono' },
];

await mkdir(DEST, { recursive: true });

const bloques = [];
let totalBytes = 0;

for (const fam of FAMILIAS) {
  const url = `https://fonts.googleapis.com/css2?family=${fam.consulta}&display=swap`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`Google Fonts respondió ${res.status} para ${fam.nombre}`);
  const css = await res.text();

  // Cada @font-face viene precedido por un comentario con el nombre del subset.
  const encontrados = [...css.matchAll(/\/\*\s*([\w[\]-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)];
  if (!encontrados.length) throw new Error(`No pude parsear el CSS de ${fam.nombre}`);
  let n = 0;

  for (const [, subset, bloque] of encontrados) {
    if (!SUBSETS.has(subset)) continue;
    const campo = (re) => (bloque.match(re) || [])[1]?.trim();
    const peso = campo(/font-weight:\s*([^;]+);/) ?? '400';
    const estilo = campo(/font-style:\s*([^;]+);/) ?? 'normal';
    const ancho = campo(/font-stretch:\s*([^;]+);/);
    const rango = campo(/unicode-range:\s*([^;]+);/);
    const urlFuente = campo(/url\((https:[^)]+)\)/);
    if (!urlFuente) continue;

    const italica = estilo.startsWith('italic') || estilo.startsWith('oblique');
    const nombreLocal = `${fam.archivo}-var${italica ? '-italic' : ''}-${subset}.woff2`;

    const bin = Buffer.from(
      await (await fetch(urlFuente, { headers: { 'User-Agent': UA } })).arrayBuffer(),
    );
    await writeFile(`${DEST}/${nombreLocal}`, bin);
    totalBytes += bin.length;
    n++;
    console.log(`  ${nombreLocal.padEnd(44)} ${(bin.length / 1024).toFixed(1).padStart(6)} KB  (${estilo}, peso ${peso}${ancho ? `, ancho ${ancho}` : ''})`);

    bloques.push(
      [
        `/* ${fam.nombre} · ${subset} · ${estilo} · peso ${peso}${ancho ? ` · ancho ${ancho}` : ''} */`,
        `@font-face {`,
        `  font-family: '${fam.nombre}';`,
        `  font-style: ${estilo};`,
        `  font-weight: ${peso};`,
        ...(ancho ? [`  font-stretch: ${ancho};`] : []),
        `  font-display: swap;`,
        `  src: url('/fuentes/${nombreLocal}') format('woff2');`,
        ...(rango ? [`  unicode-range: ${rango};`] : []),
        `}`,
      ].join('\n'),
    );
  }
  console.log(`${fam.nombre}: ${n} archivos\n`);
}

const cabecera = `/* ============================================================
   WEBFONTS AUTO-HOSPEDADAS
   ------------------------------------------------------------
   El DS las cargaba con \`@import url(fonts.googleapis.com…)\` DENTRO del CSS
   (\`ds/tokens/fonts.css\`). Esa es la forma más lenta que existe: el navegador
   descarga el CSS, lo parsea, DESCUBRE el @import, pide OTRO CSS a otro dominio y
   solo entonces pide los woff2 — una cadena en serie de 3+ viajes, toda ella
   bloqueando el pintado. En red móvil se nota. El propio readme del DS pide
   exactamente este cambio.

   Ahora los woff2 se sirven desde nuestro dominio: una sola conexión, sin DNS/TLS
   a terceros, cacheables por el CDN como cualquier otro asset, y sin mandarle a
   Google la IP del lector en cada visita.

   Las tres familias son VARIABLES: un archivo por subset cubre todo el rango de
   pesos pedido. Schibsted Grotesk lleva además su cara itálica real.

   🔴 Y son SUSTITUTOS, no las tipografías de marca de Beat ("no licensed brand
   fonts were provided", dice el DS). Al llegar las licenciadas se reemplazan estos
   archivos y las familias de \`ds/tokens/typography.css\`; nada más cambia.

   🤖 GENERADO por \`scripts/fuentes.mjs\` — no editar a mano. Volver a correr
   \`pnpm fuentes\` si cambian las familias o los rangos.

   Licencias: las tres son SIL Open Font License 1.1, que permite auto-hospedarlas
   y redistribuirlas.
   ============================================================ */

`;

await writeFile('src/styles/fuentes.css', cabecera + bloques.join('\n\n') + '\n');
console.log(`TOTAL: ${(totalBytes / 1024).toFixed(1)} KB en ${bloques.length} archivos`);
