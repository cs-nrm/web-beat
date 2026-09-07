/**
 * Genera el juego de iconos del sitio a partir del logotipo de marca.
 *
 * 🔴 Existe porque los que había eran de la marca ANTERIOR: una abeja amarilla
 * fechada en marzo de 2025, que seguía saliendo en la pestaña de un sitio que
 * lleva meses siendo blanco y negro. Un icono no se revisa nunca, así que la
 * única forma de que no vuelva a quedarse viejo es que se REGENERE desde el
 * mismo archivo que el resto del sitio usa como logo.
 *
 *   pnpm favicon
 *
 * ⚠️ La marca del icono es la **B** del logotipo, no el logotipo entero. A 16px
 * un wordmark de cinco letras y un «100.9» es una mancha gris: lo que sobrevive
 * a esa medida es una sola forma. Se recorta del propio SVG —no es un archivo
 * aparte— porque dos archivos que tienen que decir lo mismo acaban no
 * diciéndolo.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGEN = resolve(raiz, 'public/img/beat-blanco.svg');
const DESTINO = resolve(raiz, 'public/favicon');
/** La tarjeta de compartir no es un icono: va donde el resto de las imágenes. */
const DESTINO_OG = resolve(raiz, 'public/img/og-beat.png');

/** El fondo del icono: el negro del sitio, no negro puro. */
const FONDO = { r: 5, g: 7, b: 6, alpha: 1 };
/** Aire alrededor de la letra, en proporción del lado. */
const MARGEN = 0.17;

/**
 * La **B** sola, sobre lienzo transparente.
 *
 * Se queda con el PRIMER `<path>` del logotipo, que es la B. No se recorta por
 * coordenadas a mano: se pinta el path solo y luego `trim()` encuentra su caja
 * real. Así, si el logotipo se redibuja, el recorte se recalcula en vez de
 * quedarse apuntando a un sitio que ya no existe.
 */
function svgDeLaB() {
  const svg = readFileSync(ORIGEN, 'utf8');
  const caja = svg.match(/viewBox="([^"]+)"/)?.[1];
  const primerPath = svg.match(/<path[^>]*\sd="([^"]+)"[^>]*>/)?.[1];
  if (!caja || !primerPath) {
    throw new Error(`No pude leer el viewBox o el primer path de ${ORIGEN}`);
  }
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${caja}">` +
      `<path fill="#FAFBFA" d="${primerPath}"/></svg>`,
  );
}

/** La B recortada a su caja, en alta resolución, para reescalar sin perder filo. */
async function letra() {
  return sharp(svgDeLaB(), { density: 900 })
    .resize({ width: 1400 })
    .trim()
    .png()
    .toBuffer();
}

/** Un icono cuadrado: la letra centrada sobre el negro del sitio. */
async function icono(letraPng, lado) {
  const interior = Math.round(lado * (1 - MARGEN * 2));
  const dentro = await sharp(letraPng)
    .resize({ width: interior, height: interior, fit: 'inside' })
    .toBuffer();

  return sharp({
    create: { width: lado, height: lado, channels: 4, background: FONDO },
  })
    .composite([{ input: dentro, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * Un `.ico` con varias medidas dentro.
 *
 * Se escribe a mano porque `sharp` no sabe emitir ICO. El formato es un
 * directorio de entradas de 16 bytes seguido de las imágenes; desde hace años
 * los navegadores aceptan PNG dentro del contenedor, así que no hay que armar
 * mapas de bits BMP con su máscara AND.
 */
function ico(imagenes) {
  const cabecera = Buffer.alloc(6);
  cabecera.writeUInt16LE(0, 0); // reservado
  cabecera.writeUInt16LE(1, 2); // 1 = icono
  cabecera.writeUInt16LE(imagenes.length, 4);

  let desplazamiento = 6 + imagenes.length * 16;
  const entradas = [];
  for (const { lado, png } of imagenes) {
    const e = Buffer.alloc(16);
    // 256 se codifica como 0. Aquí no llegamos, pero la regla se respeta.
    e.writeUInt8(lado >= 256 ? 0 : lado, 0);
    e.writeUInt8(lado >= 256 ? 0 : lado, 1);
    e.writeUInt8(0, 2); // paleta
    e.writeUInt8(0, 3); // reservado
    e.writeUInt16LE(1, 4); // planos
    e.writeUInt16LE(32, 6); // bits por píxel
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(desplazamiento, 12);
    entradas.push(e);
    desplazamiento += png.length;
  }

  return Buffer.concat([cabecera, ...entradas, ...imagenes.map((i) => i.png)]);
}

/**
 * La máscara de Safari: una silueta monocroma sobre transparente.
 *
 * Safari la recolorea él, así que va en NEGRO y sin fondo. Es el único archivo
 * del juego que no lleva la caja negra.
 */
function mascaraSafari() {
  const svg = readFileSync(ORIGEN, 'utf8');
  const caja = svg.match(/viewBox="([^"]+)"/)[1];
  const d = svg.match(/<path[^>]*\sd="([^"]+)"[^>]*>/)[1];
  const [, , ancho, alto] = caja.split(/\s+/).map(Number);
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- Generado por scripts/favicon.mjs desde public/img/beat-blanco.svg. No editar a mano. -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}">\n` +
    `  <path fill="#000000" d="${d}"/>\n</svg>\n`
  );
}

/**
 * 🔴 La tarjeta de RESPALDO para compartir: 1200×630, el wordmark sobre el negro
 * del sitio.
 *
 * Se usa cuando la página que se comparte no tiene foto propia —la portada, una
 * sección, los legales—. Una nota sí la tiene y usa la suya.
 *
 * Se genera aquí y no se sube a mano por lo mismo que los iconos: sale del MISMO
 * `beat-blanco.svg`, así que no puede quedarse en una marca anterior sin que nadie
 * lo note. Es exactamente lo que había pasado con el favicon.
 *
 * ⚠️ 1200×630 es la medida que piden Facebook y X para la tarjeta grande, y es
 * 1.91:1 — no cuadrada. Reutilizar el logo de 1024×768 que ya estaba en `public/`
 * habría hecho que las dos lo recortaran por su cuenta, cada una a su manera.
 *
 * ⚠️ Y es PNG, no SVG: ninguna de las dos plataformas acepta SVG en `og:image`.
 */
async function tarjetaCompartir() {
  const svg = readFileSync(ORIGEN, 'utf8');
  // El wordmark completo, a poco más de un tercio del ancho de la tarjeta.
  const marca = await sharp(Buffer.from(svg), { density: 600 })
    .resize({ width: 460 })
    .png()
    .toBuffer();

  return sharp({
    create: { width: 1200, height: 630, channels: 4, background: FONDO },
  })
    .composite([{ input: marca, gravity: 'centre' }])
    .png()
    .toBuffer();
}

const MEDIDAS = [
  ['favicon-16x16.png', 16],
  ['favicon-32x32.png', 32],
  ['favicon-48x48.png', 48],
  ['apple-touch-icon.png', 180],
  ['android-chrome-192x192.png', 192],
  ['android-chrome-256x256.png', 256],
  ['android-chrome-512x512.png', 512],
  ['mstile-150x150.png', 150],
];

const MANIFIESTO = {
  name: 'Beat 100.9',
  short_name: 'Beat',
  icons: [
    { src: '/favicon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: '/favicon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    {
      src: '/favicon/android-chrome-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  /*
    Los dos en el negro del sitio. Estaban en `#ffffff`, que era del generador
    que los creó: en Android eso pinta una barra blanca sobre un sitio negro.
  */
  theme_color: '#050706',
  background_color: '#050706',
  display: 'standalone',
  start_url: '/',
};

async function main() {
  mkdirSync(DESTINO, { recursive: true });
  const b = await letra();

  for (const [nombre, lado] of MEDIDAS) {
    writeFileSync(resolve(DESTINO, nombre), await icono(b, lado));
    console.log(`  ${nombre.padEnd(30)} ${lado}×${lado}`);
  }

  const paraIco = [];
  for (const lado of [16, 32, 48]) paraIco.push({ lado, png: await icono(b, lado) });
  writeFileSync(resolve(DESTINO, 'favicon.ico'), ico(paraIco));
  console.log(`  ${'favicon.ico'.padEnd(30)} 16+32+48`);

  writeFileSync(resolve(DESTINO, 'safari-pinned-tab.svg'), mascaraSafari());
  writeFileSync(
    resolve(DESTINO, 'site.webmanifest'),
    `${JSON.stringify(MANIFIESTO, null, 2)}\n`,
  );
  writeFileSync(
    resolve(DESTINO, 'browserconfig.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n` +
      `<browserconfig>\n  <msapplication>\n    <tile>\n` +
      `      <square150x150logo src="/favicon/mstile-150x150.png"/>\n` +
      `      <TileColor>#050706</TileColor>\n` +
      `    </tile>\n  </msapplication>\n</browserconfig>\n`,
  );
  console.log('  safari-pinned-tab.svg · site.webmanifest · browserconfig.xml');

  writeFileSync(DESTINO_OG, await tarjetaCompartir());
  console.log(`  ${'img/og-beat.png'.padEnd(30)} 1200×630  (respaldo para compartir)`);

  console.log('\n✓ iconos y tarjeta de compartir regenerados desde public/img/beat-blanco.svg');
}

main().catch((e) => {
  console.error('🔴 No se pudieron generar los iconos:', e.message);
  process.exit(1);
});
