/**
 * La IP del oyente, para reenviársela al CMS en las escrituras que él frena por IP.
 *
 * Por qué hace falta. El voto del Top Ten tiene en el CMS un tope de 30 por minuto
 * POR IP (`votarEnLista` en `cms-estaciones`), que la lee de `x-forwarded-for`. Pero
 * quien le habla al CMS es ESTE servidor, no el navegador: sin reenviarla, el CMS ve
 * la IP de la VM de Beat para todos, y todos los oyentes del sitio comparten un solo
 * tope de 30 votos por minuto. Bastaba con anunciar una votación al aire para que,
 * del voto 31 en adelante, cada oyente leyera «Demasiados votos seguidos» aunque
 * fuera el primero que emitía. Así estuvo desde el 21 sep 2026 hasta el 27 nov 2026.
 *
 * **Se toma el ÚLTIMO valor de `x-forwarded-for`, nunca el primero.** Es lo único
 * delicado de este archivo:
 *
 *  · Delante de este proceso está Apache (`deploy/apache/020-beatdigital.conf`), y
 *    `mod_proxy` AGREGA al final de la cabecera la IP con la que se le conectaron. Si
 *    el navegador ya traía una `x-forwarded-for` inventada, Apache no la borra: queda
 *    `<lo que inventó>, <su IP real>`. El primer valor lo escribe cualquiera; el
 *    último lo escribió Apache.
 *  · Por eso NO sirve `Astro.clientAddress`, aunque parezca hecho para esto: el
 *    adaptador de node toma el PRIMER valor en cuanto el `Host` está en
 *    `allowedDomains`, y en producción siempre lo está (`getFirstForwardedValue` en
 *    `astro/dist/core/app/node.js`, Astro 7.2). Con él, un `curl` con una IP distinta
 *    en cada petición se saltaría el tope del CMS.
 *  · Y es de fiar porque el servicio escucha en `127.0.0.1:4322`: nadie más que
 *    Apache llega hasta aquí, así que el último salto siempre es suyo.
 *
 * Trampa para el futuro: esto supone UN solo proxy de confianza delante. Si algún día
 * se pone otro (Cloudflare, un balanceador), el último valor será la IP de ESE proxy y
 * los oyentes que entren por el mismo nodo volverán a compartir tope, en silencio. Ahí
 * hay que tomar la cabecera propia del proxy nuevo (`cf-connecting-ip`) o el penúltimo.
 *
 * Sin `x-forwarded-for` —`pnpm dev` en local, sin Apache— cae a la dirección del
 * socket. Si lo que queda no parece una IP devuelve `null`, y entonces no se reenvía
 * nada: el CMS vuelve a su propia lectura, que es justo como funcionaba antes.
 */
import type { APIContext } from 'astro';

/**
 * Forma de IPv4 o de IPv6 (incluida la mapeada, `::ffff:1.2.3.4`). No valida rangos:
 * solo descarta basura, porque el valor lo escribe Apache y no el navegador.
 *
 * No es `isIP` de `node:net` porque el repo no trae los tipos de Node y `astro
 * check` —la puerta del build— rechaza el import. Una dependencia nueva por una
 * comprobación de forma no se paga.
 */
const PARECE_IP = /^(?:\d{1,3}(?:\.\d{1,3}){3}|[0-9a-f]*:[0-9a-f:.]*)$/i;

export function ipDelOyente(contexto: Pick<APIContext, 'request' | 'clientAddress'>): string | null {
  const reenviada = contexto.request.headers.get('x-forwarded-for');

  let candidata: string | undefined;
  if (reenviada) {
    candidata = reenviada
      .split(',')
      .map((valor) => valor.trim())
      .filter(Boolean)
      .at(-1);
  } else {
    /*
      Se lee DENTRO del `try`, y por eso la función recibe el contexto entero y no la
      IP ya desestructurada: `clientAddress` es un getter que LANZA cuando el
      adaptador no la conoce. Desestructurarlo en la firma del endpoint tumbaría el
      voto entero por un dato que solo es un extra.
    */
    try {
      candidata = contexto.clientAddress;
    } catch {
      candidata = undefined;
    }
  }

  return candidata && PARECE_IP.test(candidata) ? candidata : null;
}
