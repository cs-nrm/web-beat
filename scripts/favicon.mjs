/**
 * Genera el juego de iconos del sitio —y las tarjetas de compartir— a partir del
 * logotipo de marca.
 *
 * 🔴 Existe porque los que había eran de la marca ANTERIOR: una abeja amarilla
 * fechada en marzo de 2025, que seguía saliendo en la pestaña de un sitio que
 * lleva meses siendo blanco y negro. Un icono no se revisa nunca, así que la
 * única forma de que no vuelva a quedarse viejo es que se REGENERE desde el
 * mismo archivo que el resto del sitio usa como logo.
 *
 *   pnpm favicon
 *
 * ⚠️ Se corre A MANO y lo que produce se COMMITEA. `sharp` es `devDependency`, así
 * que nada de este archivo existe en producción: lo que se sirve son PNG estáticos
 * de `public/`, igual que el favicon. Compilar no los regenera — si el logotipo o
 * el nombre de una sección cambian, hay que acordarse de correr esto.
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
/** Las tarjetas de compartir no son iconos: van donde el resto de las imágenes. */
const DESTINO_IMG = resolve(raiz, 'public/img');
const DESTINO_OG = resolve(DESTINO_IMG, 'og-beat.png');

/** El fondo del icono: el negro del sitio, no negro puro. */
const FONDO = { r: 5, g: 7, b: 6, alpha: 1 };
/** Aire alrededor de la letra, en proporción del lado. */
const MARGEN = 0.17;
/**
 * La medida de TODAS las tarjetas de compartir, la de respaldo y las de sección.
 *
 * ⚠️ Es la misma que `TARJETA_COMPARTIR` en `src/config/site.ts`, de donde las
 * páginas sacan el `og:image:width/height`. Si cambia aquí, cambia allá: unas
 * medidas que no correspondan al archivo se ven como un recorte raro en la
 * publicación y no se notan desde el sitio.
 */
const TARJETA = { ancho: 1200, alto: 630 };

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
 * Se usa cuando la página que se comparte no tiene imagen propia: el Inicio, los
 * legales, y cualquier ruta que no sea una nota ni una sección. Una nota usa su
 * foto y una sección la tarjeta con su nombre — ver más abajo.
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
    create: { width: TARJETA.ancho, height: TARJETA.alto, channels: 4, background: FONDO },
  })
    .composite([{ input: marca, gravity: 'centre' }])
    .png()
    .toBuffer();
}

/**
 * 🔴 UNA TARJETA POR SECCIÓN: el nombre de la sección sobre el negro de la marca.
 *
 * Hasta ahora las seis secciones compartían `og-beat.png` con el Inicio y los
 * legales, así que compartir `/editorial` y compartir `/programacion` llegaba a
 * WhatsApp con la MISMA imagen: la tarjeta no añadía nada a lo que el enlace ya
 * decía, y en un feed la imagen se ve antes que el texto. El Inicio y los legales
 * sí se quedan con el respaldo — son las páginas que se comparten como «la casa».
 *
 * 🔴 El wordmark SE QUEDA, junto al nombre y más chico que él. Una tarjeta que
 * solo dijera «EDITORIAL» sobre negro no identifica a nadie —el dominio va en gris
 * pequeño y en WhatsApp puede no verse—, y el nombre de la sección no lo sostiene
 * solo: «Agenda» o «Editorial» son palabras de cualquier medio. Además el wordmark
 * es la única parte de la tarjeta que es arte de marca de verdad —sale del vector—
 * mientras que el nombre se compone con la tipografía que preste el sistema. En el
 * respaldo el wordmark ES el asunto y va a 460px; aquí es la firma y va a 300.
 *
 * ⚠️ El nombre NO va en Archivo, la tipografía de display del sitio, y no hay
 * forma limpia de que vaya: librsvg compone el texto con las tipografías del
 * SISTEMA, y las del front son `.woff2` de `public/fuentes/`, un formato que
 * fontconfig no indexa. Se pide una pila grotesca y en la Mac donde esto se corre
 * resuelve a Helvetica Neue Bold. Consecuencia asumida: la letra de la tarjeta no
 * es exactamente la del titular de la página, y regenerar en otra máquina puede
 * dar otra letra. Se acepta porque el PNG se COMMITEA —no se genera en el
 * despliegue— y porque lo que dice de quién es la tarjeta es el wordmark.
 */
const PILA_TEXTO = 'Helvetica Neue, Helvetica, Arial, sans-serif';
/** La caja que puede ocupar el nombre: 80% del ancho de la tarjeta. */
const CAJA_NOMBRE = { ancho: 960, alto: 300 };
/** Tope del cuerpo, para que «AGENDA» no salga al doble que «PROGRAMACIÓN». */
const CUERPO_MAX = 170;
/** Por debajo de esto se reparte en dos líneas en vez de encoger. */
const CUERPO_MIN = 118;
const MARCA_ANCHO = 300;
/** Aire entre el wordmark y el nombre. */
const AIRE = 52;
/** Lienzo de composición del texto, holgado a propósito: ver `mideNombre`. */
const LIENZO = 6000;

/**
 * ⚠️ La lista vive AQUÍ, escrita a mano, y hay que mantenerla en sintonía con
 * `SECCIONES` de `src/config/navegacion.ts` —y con `tipos-de-lista` del CMS, de
 * donde sale `/bonus-beat`—. Este script es `.mjs` y no puede importar el `.ts` del
 * front, así que no hay forma de derivarla. Lo que sí es inofensivo es olvidarse:
 * una sección sin tarjeta cae a `og-beat.png`, que es lo que tenían todas.
 *
 * 🔴 El texto es el del `h1` de cada sección, no el del `<title>` ni el de la nav:
 * la tarjeta es la puerta de esa página y tiene que decir lo que la página dice al
 * abrirla. Por eso «EL FENÓMENO RESIDENTE» con su artículo y «AGENDA» y no
 * «EVENTOS» (ver `CabezaSeccion` en cada `index.astro`).
 *
 * ⚠️ El ARCHIVO se nombra por la ruta y el TEXTO por el rótulo, que en `/eventos`
 * no coinciden. Por la ruta porque es lo que la página escribe al lado de su
 * `imagen=`, y es lo que se busca cuando algo no cuadra.
 *
 * ⚠️ Y aquí las mayúsculas SÍ van dentro del dato, al contrario que en la migaja
 * del JSON-LD (ver `SeccionEditorial` en `config/navegacion.ts`): esto es un
 * dibujo, no texto que una máquina vaya a citar. Lo que un rastreador lee de esta
 * imagen es el `og:image:alt`, y ese lo escribe la página.
 */
const TARJETAS_SECCION = [
  ['og-editorial.png', 'EDITORIAL'],
  ['og-beat-scanner.png', 'BEAT SCANNER'],
  ['og-eventos.png', 'AGENDA'],
  ['og-fenomeno-residente.png', 'EL FENÓMENO RESIDENTE'],
  ['og-bonus-beat.png', 'BONUS BEAT'],
  ['og-programacion.png', 'PROGRAMACIÓN'],
];

/**
 * El nombre compuesto, en una o dos líneas, sobre lienzo transparente.
 *
 * Mayúsculas, peso 800 y tracking negativo: es el `.cs-titulo` de
 * `CabezaSeccion.astro`, para que la tarjeta se vea como la cabecera de la página
 * que abre y no como una pieza de otro sitio.
 */
function svgNombre(lineas, cuerpo) {
  const escapar = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const filas = lineas
    .map(
      (l, i) =>
        `<tspan x="${LIENZO / 2}" dy="${i === 0 ? 0 : (cuerpo * 0.94).toFixed(1)}">` +
        `${escapar(l)}</tspan>`,
    )
    .join('');
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${LIENZO}" ` +
      `height="${Math.round(cuerpo * (0.94 * (lineas.length - 1) + 1.8))}">` +
      `<text x="${LIENZO / 2}" y="${Math.round(cuerpo * 1.1)}" text-anchor="middle" ` +
      `font-family="${PILA_TEXTO}" font-size="${cuerpo}" font-weight="800" ` +
      `letter-spacing="${(-0.03 * cuerpo).toFixed(2)}" fill="#FAFBFA">${filas}</text></svg>`,
  );
}

/**
 * Cuánto MIDE de verdad ese nombre compuesto, acentos incluidos.
 *
 * Es el mismo truco que `letra()`: se compone y `trim()` encuentra la caja real,
 * en vez de estimarla a partir del cuerpo y del número de letras. Aquí no queda
 * otra —el ancho de cada glifo lo decide una tipografía que este archivo no
 * elige—, y es lo que permite garantizar que nada se sale.
 *
 * 🔴 El lienzo va holgado y se comprueba: si el texto tocara el borde, `trim()`
 * devolvería una caja recortada, el cálculo de abajo saldría optimista y la
 * tarjeta se generaría con el nombre cortado. Es justo el fallo que nadie ve hasta
 * que la imagen está publicada.
 */
async function mideNombre(lineas, cuerpo) {
  const { info } = await sharp(svgNombre(lineas, cuerpo))
    .trim()
    .png()
    .toBuffer({ resolveWithObject: true });
  if (info.width >= LIENZO - 40) {
    throw new Error(`«${lineas.join(' ')}» no cabe en el lienzo de medida: sube LIENZO`);
  }
  return { ancho: info.width, alto: info.height };
}

/** El cuerpo más grande con el que ese bloque cabe entero en la caja. */
function cuerpoQueCabe(medida) {
  return Math.min(
    CUERPO_MAX,
    Math.floor((CAJA_NOMBRE.ancho / medida.ancho) * 100),
    Math.floor((CAJA_NOMBRE.alto / medida.alto) * 100),
  );
}

/**
 * Cómo se reparte el nombre: una línea, o dos si en una sola la letra se queda
 * chica.
 *
 * ⚠️ El caso que obliga a esto es real y es el más largo que hay: «EL FENÓMENO
 * RESIDENTE» pide un cuerpo de 79px en una línea —la mitad de lo que piden los
 * demás— y partido en «EL FENÓMENO / RESIDENTE» sube a 138. Se prueban todos los
 * cortes por palabra y gana el que deja la letra más grande, así que la decisión
 * no depende de dónde le parezca a nadie que se corta.
 */
async function reparteNombre(nombre) {
  const medida = await mideNombre([nombre], 100);
  let mejor = { lineas: [nombre], cuerpo: cuerpoQueCabe(medida) };
  if (mejor.cuerpo >= CUERPO_MIN) return mejor;

  const palabras = nombre.split(' ');
  for (let i = 1; i < palabras.length; i++) {
    const lineas = [palabras.slice(0, i).join(' '), palabras.slice(i).join(' ')];
    const cuerpo = cuerpoQueCabe(await mideNombre(lineas, 100));
    if (cuerpo > mejor.cuerpo) mejor = { lineas, cuerpo };
  }
  return mejor;
}

/**
 * La tarjeta de una sección: wordmark arriba, nombre debajo, el bloque centrado.
 *
 * Se centra el BLOQUE medido, no cada pieza por su cuenta: así una sección de dos
 * líneas y una de una sola se ven de la misma familia en vez de bailar en vertical.
 */
async function tarjetaSeccion(nombre) {
  const { lineas, cuerpo } = await reparteNombre(nombre);
  const texto = await sharp(svgNombre(lineas, cuerpo))
    .trim()
    .png()
    .toBuffer({ resolveWithObject: true });
  const marca = await sharp(readFileSync(ORIGEN), { density: 600 })
    .resize({ width: MARCA_ANCHO })
    .png()
    .toBuffer({ resolveWithObject: true });

  const bloque = marca.info.height + AIRE + texto.info.height;
  const arriba = Math.round((TARJETA.alto - bloque) / 2);
  // Guarda, por lo mismo que la de `mideNombre`: una tarjeta pisada o cortada se
  // ve perfecta desde el sitio y solo se nota en la publicación.
  if (texto.info.width > CAJA_NOMBRE.ancho || arriba < 40) {
    throw new Error(`«${nombre}» no cabe en la tarjeta: ${texto.info.width}px, bloque ${bloque}px`);
  }

  return sharp({
    create: { width: TARJETA.ancho, height: TARJETA.alto, channels: 4, background: FONDO },
  })
    .composite([
      { input: marca.data, top: arriba, left: Math.round((TARJETA.ancho - marca.info.width) / 2) },
      {
        input: texto.data,
        top: arriba + marca.info.height + AIRE,
        left: Math.round((TARJETA.ancho - texto.info.width) / 2),
      },
    ])
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

  for (const [archivo, nombre] of TARJETAS_SECCION) {
    writeFileSync(resolve(DESTINO_IMG, archivo), await tarjetaSeccion(nombre));
    console.log(`  ${`img/${archivo}`.padEnd(30)} 1200×630  «${nombre}»`);
  }

  console.log('\n✓ iconos y tarjetas de compartir regenerados desde public/img/beat-blanco.svg');
}

main().catch((e) => {
  console.error('🔴 No se pudieron generar los iconos:', e.message);
  process.exit(1);
});
