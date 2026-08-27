#!/usr/bin/env node
/**
 * Guarda de cascada: dos reglas peleando por la misma propiedad.
 *
 * 🔴 Existe por un fallo concreto. Un bloque de micro-interacciones aplicaba
 * `transform: scale(1.045)` a la foto de la tarjeta; meses después se le añadió un
 * hover que también escribía `transform`. Misma capa, misma especificidad: el
 * empate lo resolvía el ORDEN EN EL ARCHIVO, o sea por accidente. Movería el bloque
 * quien lo moviera, el hover cambiaba sin que nadie tocara el hover.
 *
 * 🔴 Y por eso lee el CSS CONSTRUIDO y no el fuente: el conflicto no existe en
 * ningún archivo por separado, solo en la cascada ensamblada. Una guarda sobre las
 * fuentes no lo habría visto nunca.
 *
 * Fiel a la regla de la casa —cero falsos positivos— solo mira:
 *   · las propiedades de transformación, que son las que se pisan en silencio
 *   · reglas con selector IDÉNTICO, no parecido
 *   · fuera de `prefers-reduced-motion`, donde pisar es justo lo que se quiere
 */
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';

const PROPS = ['transform', 'translate', 'scale', 'rotate'];

/** Quita cada bloque `@keyframes` completo, contando llaves para no cortar a medias. */
function recortarKeyframes(css) {
  let salida = '';
  let i = 0;
  while (i < css.length) {
    const inicio = css.indexOf('@keyframes', i);
    if (inicio === -1) {
      salida += css.slice(i);
      break;
    }
    salida += css.slice(i, inicio);
    let j = css.indexOf('{', inicio);
    if (j === -1) break;
    let prof = 0;
    for (; j < css.length; j++) {
      if (css[j] === '{') prof++;
      else if (css[j] === '}' && --prof === 0) {
        j++;
        break;
      }
    }
    i = j;
  }
  return salida;
}

/**
 * Parte una lista de selectores por sus comas de PRIMER NIVEL.
 *
 * 🔴 Comparar el texto completo del selector no sirve, y esta guarda no cazó nada
 * hasta descubrirlo: en la práctica casi todos los conflictos son entre una regla
 * de selector AGRUPADO y otra de selector suelto. `.a, .b, .c { transform }` y
 * `.a { transform }` pelean por `.a`, pero como cadenas no se parecen en nada.
 *
 * Las comas dentro de paréntesis —`:is(a, b)`, `:not(a, b)`— no separan nada, así
 * que se cuenta la profundidad.
 */
function partirSelectores(lista) {
  const partes = [];
  let actual = '';
  let prof = 0;
  for (const c of lista) {
    if (c === '(') prof++;
    else if (c === ')') prof--;
    if (c === ',' && prof === 0) {
      partes.push(actual.trim());
      actual = '';
      continue;
    }
    actual += c;
  }
  if (actual.trim()) partes.push(actual.trim());
  return partes;
}

const hojas = globSync('dist/client/**/*.css');
if (!hojas.length) {
  console.log('· guarda-cascada: no hay CSS construido todavía, se omite.');
  process.exit(0);
}

const fallos = [];

for (const hoja of hojas) {
  let css = readFileSync(hoja, 'utf8');

  /*
   * Se recortan los bloques de menos movimiento antes de nada: ahí anular lo de
   * arriba es el comportamiento correcto, no un conflicto.
   */
  css = css.replace(/@media[^{]*prefers-reduced-motion[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');

  /*
   * 🔴 Y se recortan los `@keyframes`, que es lo primero que hizo saltar esta
   * guarda en falso. Sus pasos se llaman `0%`, `50%`, `to`… en TODOS los bloques,
   * así que dos animaciones sin ninguna relación parecían la misma regla escrita
   * dos veces. Escribir `transform` en el 0% de dos animaciones distintas no es un
   * conflicto: es lo normal.
   */
  css = recortarKeyframes(css);

  /*
   * 🔴 Se recorre con PILA DE CONTEXTO, no con una expresión regular sobre todo el
   * archivo. La primera versión daba falso positivo con `.pila-carta`: escribe
   * `transform` en la regla base y otra vez en su ajuste de móvil. Eso es CSS
   * responsivo normal —cada media query manda en su ancho— y no un empate resuelto
   * por orden. Solo cuentan las escrituras que compiten DE VERDAD: mismo selector
   * y mismo contexto.
   */
  const escrituras = new Map();
  const contexto = [];
  let i = 0;
  let prelude = '';

  while (i < css.length) {
    const c = css[i];
    if (c === '{') {
      const cabeza = prelude.trim();
      prelude = '';
      if (cabeza.startsWith('@')) {
        contexto.push(cabeza);
        i++;
        continue;
      }
      // Regla normal: se lee su cuerpo hasta la llave de cierre de este nivel.
      let j = i + 1;
      let prof = 1;
      for (; j < css.length && prof > 0; j++) {
        if (css[j] === '{') prof++;
        else if (css[j] === '}') prof--;
      }
      const cuerpo = css.slice(i + 1, j - 1);
      for (const prop of PROPS) {
        // `transform:` pero no `transform-origin:` ni `transition:...transform`
        if (!new RegExp(`(^|;)\\s*${prop}\\s*:`).test(cuerpo)) continue;
        for (const sel of partirSelectores(cabeza)) {
          const clave = `${contexto.join(' ▸ ')} :: ${sel} :: ${prop}`;
          const previo = escrituras.get(clave) ?? { veces: 0, reglas: [] };
          previo.veces++;
          // Se guarda el valor para que el mensaje diga QUÉ pelea con qué.
          if (previo.reglas.length < 3) previo.reglas.push(cuerpo.match(new RegExp(`${prop}\\s*:\\s*([^;]+)`))?.[1]?.trim().slice(0, 46) ?? '');
          escrituras.set(clave, previo);
        }
      }
      i = j;
      continue;
    }
    if (c === '}') {
      contexto.pop();
      prelude = '';
      i++;
      continue;
    }
    prelude += c;
    i++;
  }

  for (const [clave, dato] of escrituras) {
    if (dato.veces < 2) continue;
    const [ctx, selector, prop] = clave.split(' :: ');
    fallos.push(
      `${hoja}${ctx ? `\n    dentro de ${ctx.slice(0, 70)}` : ''}` +
        `\n    «${selector}» recibe "${prop}" desde ${dato.veces} reglas:` +
        dato.reglas.map((v) => `\n      · ${prop}: ${v}`).join('') +
        `\n    Gana la que quede más abajo en el archivo, o sea por accidente de orden.` +
        `\n    Deja una sola, o reparte los gestos entre transform / translate / scale (ver movimiento.md §1).`,
    );
  }
}

if (fallos.length) {
  console.error(`\n✗ guarda-cascada: ${fallos.length} conflicto(s)\n` + fallos.map((f) => '  ' + f).join('\n\n') + '\n');
  process.exit(1);
}
console.log(`✓ guarda-cascada: ${hojas.length} hoja(s), sin propiedades en disputa.`);
