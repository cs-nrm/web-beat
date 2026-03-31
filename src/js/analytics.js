// ===== [ANALYTICS] ga4Track, trackTritonPlaybackEvent =====
function ga4Track(eventName, params = {}) {
  try {
    // GA4 via gtag
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, params);
      return;
    }
    // GA4 via dataLayer (GTM)
    if (Array.isArray(window.dataLayer)) {
      window.dataLayer.push({ event: eventName, ...params });
      return;
    }
  } catch (_) { }
}

function trackTritonPlaybackEvent(eventName, extra = {}) {
  // Mantén params simples (GA4 recomienda snake_case, pero GA acepta ambos; esto es pragmático)
  ga4Track(eventName, {
    category: 'Triton SDK',
    station: 'XHSONFM',
    dist: 'WebBeat',
    ...extra,
  });
}

// Exponer globalmente para que streaming.js pueda llamarlas independientemente del scope
window.ga4Track = ga4Track;
window.trackTritonPlaybackEvent = trackTritonPlaybackEvent;
