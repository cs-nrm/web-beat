// ===== [ADS] initGPT, safeRefreshSlots =====
function initGPT() {
  googletag.cmd.push(function () {
    googletag.destroySlots(); // dentro de cmd.push: GPT siempre está listo aquí

    // Responsive mappings: addSize([viewport_w, viewport_h], [ad_w, ad_h])
    // Formatos estandarizados: leaderboard (728x90) y box (300x250).
    var mappingLeaderboard = googletag.sizeMapping().addSize([768, 0], [728, 90]).addSize([0, 0], [320, 50]).build();
    var mappingBox         = googletag.sizeMapping().addSize([0, 0], [300, 250]).build();
    var mapping5           = googletag.sizeMapping().addSize([0, 0], [300, 600]).build();
    var mapping14          = googletag.sizeMapping().addSize([768, 0], [600, 800]).addSize([0, 0], [320, 480]).build();
    var mappingVideoNota   = googletag.sizeMapping().addSize([0, 0], [400, 311]).build();

    window.slotLeaderboard1 = googletag.defineSlot("/23349147378/Beat", [[728, 90], [320, 50]], 'ad-slot-leaderboard1').defineSizeMapping(mappingLeaderboard).addService(googletag.pubads());
    window.slotLeaderboard2 = googletag.defineSlot("/23349147378/Beat", [[728, 90], [320, 50]], 'ad-slot-leaderboard2').defineSizeMapping(mappingLeaderboard).addService(googletag.pubads());
    window.slotLeaderboard3 = googletag.defineSlot("/23349147378/Beat", [[728, 90], [320, 50]], 'ad-slot-leaderboard3').defineSizeMapping(mappingLeaderboard).addService(googletag.pubads());
    window.slotLeaderboard4 = googletag.defineSlot("/23349147378/Beat", [[728, 90], [320, 50]], 'ad-slot-leaderboard4').defineSizeMapping(mappingLeaderboard).addService(googletag.pubads());
    window.slot5  = googletag.defineSlot("/23349147378/Beat", [300, 600], 'ad-slot5').defineSizeMapping(mapping5).addService(googletag.pubads());
    window.slot14 = googletag.defineSlot("/23349147378/Beat", [[600, 800], [320, 480]], 'ad-slot14').defineSizeMapping(mapping14).addService(googletag.pubads());
    window.slotBoxbanner1 = googletag.defineSlot("/23349147378/Beat", [300, 250], 'ad-slot-boxbanner1').defineSizeMapping(mappingBox).addService(googletag.pubads());
    window.slotBoxbanner2 = googletag.defineSlot("/23349147378/Beat/Box", [300, 250], 'ad-slot-boxbanner2').defineSizeMapping(mappingBox).addService(googletag.pubads());
    window.slotBoxbanner3 = googletag.defineSlot("/23349147378/Beat/Box2", [300, 250], 'ad-slot-boxbanner3').defineSizeMapping(mappingBox).addService(googletag.pubads());
    window.slotBoxbanner4 = googletag.defineSlot("/23349147378/Beat/Box3", [300, 250], 'ad-slot-boxbanner4').defineSizeMapping(mappingBox).addService(googletag.pubads());
    window.slotBoxbanner5 = googletag.defineSlot("/23349147378/Beat/Box4", [300, 250], 'ad-slot-boxbanner5').defineSizeMapping(mappingBox).addService(googletag.pubads());
    window.slotBoxbanner6 = googletag.defineSlot("/23349147378/Beat/Box5", [300, 250], 'ad-slot-boxbanner6').defineSizeMapping(mappingBox).addService(googletag.pubads());
    if (document.getElementById('ad-slot-videonota')) {
      window.slotVideoNota = googletag.defineSlot("/23349147378/Beat", [400, 311], 'ad-slot-videonota').defineSizeMapping(mappingVideoNota).addService(googletag.pubads());
    }

    googletag.pubads().setTargeting("test", "responsive");
    googletag.enableServices();
    if (document.getElementById('ad-slot-leaderboard1')) googletag.display('ad-slot-leaderboard1');
    if (document.getElementById('ad-slot-leaderboard2')) googletag.display('ad-slot-leaderboard2');
    if (document.getElementById('ad-slot-leaderboard3')) googletag.display('ad-slot-leaderboard3');
    if (document.getElementById('ad-slot-leaderboard4')) googletag.display('ad-slot-leaderboard4');
    if (document.getElementById('ad-slot5'))  googletag.display('ad-slot5');
    if (document.getElementById('ad-slot14')) googletag.display('ad-slot14');
    if (document.getElementById('ad-slot-boxbanner1')) googletag.display('ad-slot-boxbanner1');
    if (document.getElementById('ad-slot-boxbanner2')) googletag.display('ad-slot-boxbanner2');
    if (document.getElementById('ad-slot-boxbanner3')) googletag.display('ad-slot-boxbanner3');
    if (document.getElementById('ad-slot-boxbanner4')) googletag.display('ad-slot-boxbanner4');
    if (document.getElementById('ad-slot-boxbanner5')) googletag.display('ad-slot-boxbanner5');
    if (document.getElementById('ad-slot-boxbanner6')) googletag.display('ad-slot-boxbanner6');
    if (document.getElementById('ad-slot-videonota')) googletag.display('ad-slot-videonota');

    googletag.pubads().refresh([window.slot5]);

    // Limpiar intervalo anterior si existe (por navegación SPA)
    if (window.slot5RefreshInterval) {
      clearInterval(window.slot5RefreshInterval);
    }

    // Crear intervalo para refresh cada 10 segundos
    window.slot5RefreshInterval = setInterval(function(){
      googletag.pubads().refresh([window.slot5]);
    }, 180000);
  });
}
// initGPT() NO se llama aquí — astro:page-load dispara en carga inicial Y en navegaciones,
// así que centralizar ahí evita la doble inicialización que destruía el anuncio del modal.

function safeRefreshSlots() {
  if (window.googletag && googletag.apiReady && googletag.pubads) {
    if (window.slotLeaderboard1) googletag.pubads().refresh([window.slotLeaderboard1]);
    if (window.slotLeaderboard2) googletag.pubads().refresh([window.slotLeaderboard2]);
    if (window.slotLeaderboard3) googletag.pubads().refresh([window.slotLeaderboard3]);
    if (window.slotLeaderboard4) googletag.pubads().refresh([window.slotLeaderboard4]);
    if (window.slot5)  googletag.pubads().refresh([window.slot5]);
    if (window.slotBoxbanner1) googletag.pubads().refresh([window.slotBoxbanner1]);
    if (window.slotBoxbanner2) googletag.pubads().refresh([window.slotBoxbanner2]);
    if (window.slotBoxbanner3) googletag.pubads().refresh([window.slotBoxbanner3]);
    if (window.slotBoxbanner4) googletag.pubads().refresh([window.slotBoxbanner4]);
    if (window.slotBoxbanner5) googletag.pubads().refresh([window.slotBoxbanner5]);
    if (window.slotBoxbanner6) googletag.pubads().refresh([window.slotBoxbanner6]);
    console.log('Banners refrescados post navegación');
  } else {
    setTimeout(safeRefreshSlots, 400);
  }
}

// Exponer globalmente para que player.js pueda llamar initGPT y safeRefreshSlots
window.initGPT = initGPT;
window.safeRefreshSlots = safeRefreshSlots;
