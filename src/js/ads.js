// ===== [ADS] adFallback, initAdFallbackListener, initGPT, safeRefreshSlots =====
// Estado global, se resetea en cada initGPT() para que la navegación funcione correctamente
window._adFallbackStates = window._adFallbackStates || {};

// Crea el <ins> dinámicamente para evitar que AdSense lo auto-inicialice en display:none
function scheduleAdsensePush(fb) {
  // Eliminar cualquier <ins> previo (por navegación SPA)
  const old = fb.querySelector('ins.adsbygoogle');
  if (old) old.remove();

  // Crear <ins> fresco con las dimensiones del contenedor
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.style.width = (fb.dataset.adWidth || '300') + 'px';
  ins.style.maxWidth = '100%';
  ins.style.height = (fb.dataset.adHeight || '250') + 'px';
  ins.dataset.adClient = fb.dataset.adClient;
  ins.dataset.adSlot = fb.dataset.adSlot;
  ins.dataset.adFormat = fb.dataset.adFormat || 'auto';
  fb.appendChild(ins);

  let attempts = 0;
  const maxAttempts = 10;
  const delay = 80;

  const checkAndPush = () => {
    const insWidth = ins.offsetWidth;
    if (insWidth > 0) {
      try { (window.adsbygoogle = window.adsbygoogle || []).push({}); }
      catch (e) { console.error('scheduleAdsensePush: push failed', e); }
    } else {
      attempts++;
      if (attempts < maxAttempts) setTimeout(checkAndPush, delay);
    }
  };

  setTimeout(checkAndPush, 50);
}

// Registra un grupo de slots con su fallback. Llamar dentro de initGPT() tras destroySlots()
function adFallback(slots, fallbackId) {
  const state = { slots, fallbackId, loaded: {}, rendered: 0 };
  slots.forEach(id => { state.loaded[id] = false; });
  window._adFallbackStates[fallbackId] = state;
}

// Listener único — se registra UNA sola vez después del primer initGPT()
function initAdFallbackListener() {
  googletag.pubads().addEventListener('slotRenderEnded', function(event) {
    const id = event.slot.getSlotElementId();
    for (const state of Object.values(window._adFallbackStates)) {
      if (!state.slots.includes(id)) continue;
      if (!event.isEmpty) state.loaded[id] = true;
      state.rendered++;
      if (state.rendered < state.slots.length) break;
      // Todos los slots del grupo han respondido
      const showGPT = state.slots.every(s => state.loaded[s]);
      state.slots.forEach(s => {
        const el = document.getElementById(s);
        if (el) el.style.display = showGPT ? '' : 'none';
      });
      const fb = document.getElementById(state.fallbackId);
      if (fb) {
        fb.style.display = showGPT ? 'none' : 'block';
        if (!showGPT) {
          scheduleAdsensePush(fb);
        }
      }
      break;
    }
  });
}

function initGPT() {
  googletag.cmd.push(function () {
    googletag.destroySlots(); // dentro de cmd.push: GPT siempre está listo aquí
    window._adFallbackStates = {}; // reset inside cmd to avoid race condition

    // Responsive mappings: addSize([viewport_w, viewport_h], [ad_w, ad_h])
    var mapping2   = googletag.sizeMapping().addSize([0, 0], [300, 250]).build();
    var mapping3   = googletag.sizeMapping().addSize([768, 0], [970, 250]).addSize([0, 0], [320,  50]).build();
    var mapping32  = googletag.sizeMapping().addSize([768, 0], [728,  90]).addSize([0, 0], [320,  50]).build();
    var mapping4   = googletag.sizeMapping().addSize([768, 0], [728,  90]).addSize([0, 0], [320,  50]).build();
    var mapping5   = googletag.sizeMapping().addSize([0, 0], [300, 600]).build();
    var mapping6   = googletag.sizeMapping().addSize([768, 0], [970,  90]).addSize([0, 0], [320,  50]).build();
    var mapping14  = googletag.sizeMapping().addSize([768, 0], [600, 800]).addSize([0, 0], [320, 480]).build();
    var mapping201 = googletag.sizeMapping().addSize([0, 0], [300, 250]).build();
    var mapping202 = googletag.sizeMapping().addSize([0, 0], [300, 250]).build();
    var mapping203 = googletag.sizeMapping().addSize([0, 0], [300, 250]).build();
    var mapping204 = googletag.sizeMapping().addSize([0, 0], [300, 250]).build();
    var mapping205 = googletag.sizeMapping().addSize([0, 0], [300, 250]).build();


    window.slot2  = googletag.defineSlot("/21799830913/Beat", [300, 250], 'ad-slot2').defineSizeMapping(mapping2).addService(googletag.pubads());
    window.slot3  = googletag.defineSlot("/21799830913/Beat", [[970, 250], [320, 50]], 'ad-slot3').defineSizeMapping(mapping3).addService(googletag.pubads());
    window.slot32 = googletag.defineSlot("/21799830913/Beat", [[728, 90], [320, 50]], 'ad-slot32').defineSizeMapping(mapping32).addService(googletag.pubads());
    window.slot4  = googletag.defineSlot("/21799830913/Beat", [[728, 90], [320, 50]], 'ad-slot4').defineSizeMapping(mapping4).addService(googletag.pubads());
    window.slot5  = googletag.defineSlot("/21799830913/Beat", [300, 600], 'ad-slot5').defineSizeMapping(mapping5).addService(googletag.pubads());
    window.slot6  = googletag.defineSlot("/21799830913/Beat", [[970, 90], [320, 50]], 'ad-slot6').defineSizeMapping(mapping6).addService(googletag.pubads());
    window.slot14 = googletag.defineSlot("/21799830913/Beat", [[600, 800], [320, 480]], 'ad-slot14').defineSizeMapping(mapping14).addService(googletag.pubads());
    window.slot201 = googletag.defineSlot("/21799830913/Beat/Box", [300, 250], 'ad-slot201').defineSizeMapping(mapping201).addService(googletag.pubads());
    window.slot202 = googletag.defineSlot("/21799830913/Beat/Box2", [300, 250], 'ad-slot202').defineSizeMapping(mapping202).addService(googletag.pubads());
    window.slot203 = googletag.defineSlot("/21799830913/Beat/Box3", [300, 250], 'ad-slot203').defineSizeMapping(mapping203).addService(googletag.pubads());
    window.slot204 = googletag.defineSlot("/21799830913/Beat/Box4", [300, 250], 'ad-slot204').defineSizeMapping(mapping204).addService(googletag.pubads());
    window.slot205 = googletag.defineSlot("/21799830913/Beat/Box5", [300, 250], 'ad-slot205').defineSizeMapping(mapping205).addService(googletag.pubads());

    googletag.pubads().setTargeting("test", "responsive");
    googletag.enableServices();
    googletag.display('ad-slot2');
    googletag.display('ad-slot3');
    googletag.display('ad-slot32');
    googletag.display('ad-slot4');
    googletag.display('ad-slot5');
    googletag.display('ad-slot6');
    googletag.display('ad-slot14');
    googletag.display('ad-slot201');
    googletag.display('ad-slot202');
    googletag.display('ad-slot203');
    googletag.display('ad-slot204');
    googletag.display('ad-slot205');

    // once slots have been requested, set up fallbacks for billboards and leaders
    function initBillboardFallbacks() {
        adFallback(['ad-slot2'],  'ad-slot2-adsense');
        adFallback(['ad-slot3'],  'ad-slot3-adsense');
        adFallback(['ad-slot32'], 'ad-slot32-adsense');
        adFallback(['ad-slot4'],  'ad-slot4-adsense');
        adFallback(['ad-slot5'],  'ad-slot5-adsense');
        adFallback(['ad-slot6'],  'ad-slot6-adsense');
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBillboardFallbacks);
    } else {
        initBillboardFallbacks();
    }

    //googletag.pubads().refresh([slot3]);
    //setInterval(function(){googletag.pubads().refresh([slot3]);}, 180000);
  });
}
// initGPT() NO se llama aquí — astro:page-load dispara en carga inicial Y en navegaciones,
// así que centralizar ahí evita la doble inicialización que destruía el anuncio del modal.
// El listener de fallback se registra UNA sola vez aquí (no dentro de initGPT).
googletag.cmd.push(initAdFallbackListener);

function safeRefreshSlots() {
  if (window.googletag && googletag.apiReady && googletag.pubads) {
    if (window.slot2)  googletag.pubads().refresh([window.slot2]);
    if (window.slot3)  googletag.pubads().refresh([window.slot3]);
    if (window.slot32) googletag.pubads().refresh([window.slot32]);
    if (window.slot4)  googletag.pubads().refresh([window.slot4]);
    if (window.slot5)  googletag.pubads().refresh([window.slot5]);
    if (window.slot6)  googletag.pubads().refresh([window.slot6]);
    if (window.slot201) googletag.pubads().refresh([window.slot201]);
    if (window.slot202) googletag.pubads().refresh([window.slot202]);
    if (window.slot203) googletag.pubads().refresh([window.slot203]);
    if (window.slot204) googletag.pubads().refresh([window.slot204]);
    if (window.slot205) googletag.pubads().refresh([window.slot205]);
    console.log('Banners refrescados post navegación');
  } else {
    setTimeout(safeRefreshSlots, 400);
  }
}

// Exponer globalmente para que player.js pueda llamar initGPT y safeRefreshSlots
window.initGPT = initGPT;
window.safeRefreshSlots = safeRefreshSlots;
