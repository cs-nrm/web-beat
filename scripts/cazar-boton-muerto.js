/**
 * CAZADOR DEL BOTÓN MUERTO — se pega en la consola de Chrome, en v2.
 *
 * Existe porque el fallo solo ocurre en la máquina de Carlos y no se puede
 * reproducir desde aquí: toda pestaña que puedo manejar corre en segundo plano, y
 * ahí Chrome suspende `requestAnimationFrame`, congela las transiciones y no
 * registra desplazamientos de maquetación. O sea que las tres familias de causas
 * que quedan vivas son justo las tres que mi entorno no puede observar.
 *
 * Esto las observa desde dentro. Vigila el puntero y, cuando pasa por encima de un
 * control que DEBERÍA responder y no responde, guarda el porqué: qué elemento
 * ganó el hit-test, qué cursor calculó el navegador, si algún ancestro está
 * `inert` o con `pointer-events: none`, si hay una transición de vista corriendo,
 * a cuántos fotogramas por segundo iba la página en ese instante, y qué se movió.
 *
 * USO
 *   1. Abre https://v2.beatdigital.mx, F12 → Consola, pega esto, Enter.
 *   2. Usa el sitio hasta que un botón se sienta muerto.
 *   3. Si lo caza solo, lo verás en rojo en la consola.
 *      Si no, en el momento exacto en que se sienta muerto pulsa la tecla  ,  (coma).
 *   4. Escribe  copy(beatDiagnostico())  y pégamelo.
 *
 * No toca nada de la página: solo lee. Se apaga con  beatCazador.parar()
 */
(() => {
  const CONTROLES = '.fr-capsula, .nt-compartir-uno, .fr-visor-arranque, .fr-track, a[href], button';
  const MAX = 150;

  const anterior = window.beatCazador;
  if (anterior && anterior.parar) anterior.parar();

  const registro = [];
  const desplazamientos = [];
  let fps = 0;
  let cuadros = 0;
  let ventana = performance.now();
  let vivo = true;

  const desc = (e) => {
    if (!e) return 'null';
    if (e.nodeType !== 1) return String(e.nodeName);
    const cls = typeof e.className === 'string' && e.className
      ? '.' + e.className.trim().split(/\s+/).slice(0, 4).join('.')
      : '';
    return e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + cls;
  };

  /** La cadena de ancestros que puede estar apagando al control. */
  const cadena = (el) => {
    const malos = [];
    for (let e = el; e && e !== document.documentElement; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const razones = [];
      if (e.hasAttribute('inert')) razones.push('inert');
      if (cs.pointerEvents === 'none') razones.push('pointer-events:none');
      if (e.hasAttribute('data-navegando')) razones.push('data-navegando');
      if (cs.visibility === 'hidden') razones.push('visibility:hidden');
      if (e.hasAttribute('disabled')) razones.push('disabled');
      if (razones.length) malos.push(desc(e) + ' → ' + razones.join(', '));
    }
    return malos;
  };

  /** Todo lo fijo o absoluto que cubre este punto y NO es el control. */
  const encima = (x, y, control) =>
    document.elementsFromPoint(x, y)
      .filter((e) => !control.contains(e) && e !== control)
      .slice(0, 4)
      .map((e) => {
        const cs = getComputedStyle(e);
        return `${desc(e)} [pos:${cs.position} z:${cs.zIndex} pe:${cs.pointerEvents}]`;
      });

  const foto = (motivo, x, y) => {
    const arriba = document.elementFromPoint(x, y);
    const control = arriba && arriba.closest ? arriba.closest(CONTROLES) : null;
    const bajoElPuntero = document.querySelectorAll(':hover');
    return {
      motivo,
      hora: new Date().toISOString().slice(11, 23),
      puntero: [Math.round(x), Math.round(y)],
      fps,
      encimaDelPunto: desc(arriba),
      controlAlcanzado: desc(control),
      cursorCalculado: arriba ? getComputedStyle(arriba).cursor : '?',
      hoverActual: [...bajoElPuntero].slice(-3).map(desc),
      apagadores: control ? cadena(control) : cadena(arriba),
      tapando: control ? encima(x, y, control) : [],
      inertEnLaPagina: [...document.querySelectorAll('[inert]')].map(desc),
      navegandoPegado: [...document.querySelectorAll('[data-navegando]')].map(desc),
      animacionesVivas: document.getAnimations().length,
      /*
        Una transición de vista en curso se reconoce por sus pseudo-elementos
        animándose. Es lo único observable desde la página: no hay API que diga
        «hay una transición viva», y la capa ::view-transition tapa el viewport
        entero mientras dura.
      */
      pseudoDeTransicion: document
        .getAnimations()
        .filter((a) => a.effect && a.effect.pseudoElement && String(a.effect.pseudoElement).includes('view-transition'))
        .map((a) => a.effect.pseudoElement),
      scroll: Math.round(scrollY),
      visibilidad: document.visibilityState,
    };
  };

  const guardar = (f) => {
    registro.push(f);
    if (registro.length > MAX) registro.shift();
  };

  // ── el pulso: cuántos fotogramas está pintando de verdad ──
  const latir = (t) => {
    if (!vivo) return;
    cuadros++;
    if (t - ventana >= 500) {
      fps = Math.round((cuadros * 1000) / (t - ventana));
      cuadros = 0;
      ventana = t;
    }
    requestAnimationFrame(latir);
  };
  requestAnimationFrame(latir);

  // ── el vigía: cada movimiento del ratón sobre un control ──
  let ultimo = { x: 0, y: 0 };
  const alMover = (e) => {
    ultimo = { x: e.clientX, y: e.clientY };
    const arriba = document.elementFromPoint(e.clientX, e.clientY);
    if (!arriba || !arriba.closest) return;
    const control = arriba.closest(CONTROLES);
    if (!control) return;

    const cursor = getComputedStyle(arriba).cursor;
    const deberiaSerMano = control.matches('.fr-capsula, .nt-compartir-uno, .fr-visor-arranque, .fr-track, a[href], button');
    const hoverPuesto = control.matches(':hover');
    const apagado = cadena(control).length > 0;

    if ((deberiaSerMano && cursor !== 'pointer') || !hoverPuesto || apagado) {
      const f = foto(
        !hoverPuesto ? 'el control NO tiene :hover' : apagado ? 'un ancestro lo apaga' : 'cursor ' + cursor,
        e.clientX,
        e.clientY,
      );
      guardar(f);
      console.warn('%c⚠ botón muerto', 'color:#ff6e93;font-weight:bold', f.motivo, f);
    }
  };

  // ── clics que no llegan a su control ──
  const alPulsar = (e) => {
    const arriba = document.elementFromPoint(e.clientX, e.clientY);
    const control = arriba && arriba.closest ? arriba.closest(CONTROLES) : null;
    if (!control) guardar(foto('clic que no cayó en ningún control', e.clientX, e.clientY));
  };

  // ── desplazamientos de maquetación: lo que se mueve bajo un cursor quieto ──
  let po = null;
  try {
    po = new PerformanceObserver((l) => {
      for (const s of l.getEntries()) {
        if (s.value < 0.0005) continue;
        desplazamientos.push({
          t: Math.round(s.startTime),
          valor: +s.value.toFixed(4),
          traselToque: s.hadRecentInput,
          quien: (s.sources || []).map(
            (o) => `${desc(o.node)}  y:${Math.round(o.previousRect.top)}→${Math.round(o.currentRect.top)}`,
          ),
        });
      }
    });
    po.observe({ type: 'layout-shift', buffered: true });
  } catch {}

  const alTeclear = (e) => {
    if (e.key !== ',') return;
    const f = foto('DISPARADO A MANO por Carlos', ultimo.x, ultimo.y);
    guardar(f);
    console.log('%c● capturado a mano', 'color:#7ee787;font-weight:bold', f);
  };

  document.addEventListener('pointermove', alMover, { passive: true, capture: true });
  document.addEventListener('pointerdown', alPulsar, { passive: true, capture: true });
  document.addEventListener('keydown', alTeclear, true);

  window.beatDiagnostico = () =>
    JSON.stringify(
      {
        url: location.href,
        pantalla: [innerWidth, innerHeight, devicePixelRatio],
        agente: navigator.userAgent,
        menosMovimiento: matchMedia('(prefers-reduced-motion: reduce)').matches,
        fpsAhora: fps,
        anomalias: registro,
        desplazamientos: desplazamientos.slice(-40),
      },
      null,
      1,
    );

  window.beatCazador = {
    parar() {
      vivo = false;
      document.removeEventListener('pointermove', alMover, true);
      document.removeEventListener('pointerdown', alPulsar, true);
      document.removeEventListener('keydown', alTeclear, true);
      po && po.disconnect();
      console.log('cazador apagado');
    },
    registro,
    desplazamientos,
  };

  console.log(
    '%c🎯 cazador armado',
    'color:#7ee787;font-weight:bold',
    '\n· Usa el sitio. Lo que cace sale en rojo.' +
      '\n· Cuando un botón se sienta muerto, pulsa la tecla  ,  (coma).' +
      '\n· Al final:  copy(beatDiagnostico())  y me lo pegas.',
  );
})();
