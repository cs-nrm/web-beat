#!/usr/bin/env node
/**
 * Guardas de CI.
 *
 * Cada una existe por un error que ya costó algo en esta casa, no por prolijidad.
 *
 * 🔴 Regla de esta herramienta: **cero falsos positivos**. Una guarda que grita
 * por cosas correctas se desactiva a la semana, y entonces no protege de nada —
 * peor que no tenerla. Por eso los patrones son estrechos y hay una salida
 * explícita (`guarda-ok:`) que OBLIGA a escribir la razón en la misma línea.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs';

/*
 * `src/js/` son los archivos del sitio v1. No los referencia nadie —el runtime
 * nuevo vive en `src/scripts/`— y se conservan como material de consulta para el
 * paso 2 de B6 (lo acoplado a WordPress: getInfoProg, el player de podcast, el
 * video de nota). Se borran cuando ese paso cierre.
 */
const EXCLUIDOS = /^src\/js\//;

const fuentes = globSync('src/**/*.{ts,tsx,js,astro}').filter((f) => !EXCLUIDOS.test(f));
const fallos = [];

for (const archivo of fuentes) {
  const texto = readFileSync(archivo, 'utf8');
  const lineas = texto.split('\n');

  /*
   * Salida explícita: `guarda-ok <regla>: <razón>` en cualquier parte del archivo.
   *
   * Es por ARCHIVO y por REGLA, no por línea, y a propósito. Cuando el hallazgo
   * cae en un ATRIBUTO de una etiqueta no hay dónde poner un comentario en la
   * misma línea —Astro no admite comentarios dentro de la lista de atributos—, y
   * obligar a ello empujaría a desactivar la guarda entera. Nombrar la regla evita
   * que una exención escrita para una cosa tape otra distinta, y la razón queda
   * escrita y revisable en el diff.
   */
  const eximida = (regla) =>
    new RegExp(`guarda-ok\\s+${regla}:\\s*\\S`).test(texto);

  lineas.forEach((linea, i) => {
    const ubic = `${archivo}:${i + 1}`;

    /*
     * 🔴 El ad unit de GAM, escrito en el código.
     * En los repos hermanos está por copy-paste (`/<network>/StereoCien`), y
     * servir impresiones de una estación a la cuenta de otra es un bug de DINERO
     * que nadie ve hasta la facturación. Va siempre por env.
     *
     * El patrón busca una RUTA de ad unit (`/` + 8-12 dígitos + `/`), no un
     * número largo suelto: así un `program_id` en un comentario no dispara.
     */
    if (!eximida('ad-unit') && /["'`][^"'`]*\/\d{8,12}\/[^"'`]*["'`]/.test(linea)) {
      fallos.push(`${ubic}  ruta de ad unit escrita en el código. Usa PUBLIC_GAM_NETWORK_ID / PUBLIC_GAM_AD_UNIT.`);
    }

    /*
     * `set:html` con contenido que venga del CMS es XSS almacenado: basta que
     * alguien con acceso al editor escriba un `<script>`. El renderizador de
     * Lexical saca el texto COMO TEXTO, así que en la práctica no hace falta.
     *
     * Se busca el atributo (`set:html=`), no la palabra: los comentarios que
     * explican por qué NO se usa mencionan el nombre y no deben disparar.
     */
    if (!eximida('set:html') && /set:html\s*=/.test(linea)) {
      fallos.push(`${ubic}  set:html — si el valor viene del CMS es XSS. Si es una constante nuestra, anótalo con "guarda-ok set:html: <razón>".`);
    }
  });
}

if (fallos.length) {
  console.error(`\n✗ guardas: ${fallos.length} hallazgo(s)\n` + fallos.map((f) => '  ' + f).join('\n') + '\n');
  process.exit(1);
}
console.log(`✓ guardas: ${fuentes.length} archivos, sin hallazgos.`);
