// ===== [PLAYER - GLOBALS + SVG CONSTANTS] =====
var streaming;
var local_status;
const buttonPause = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /></svg>';
const buttonPlay = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play-filled" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" stroke-width="0" fill="currentColor" /></svg>';
const bigButtonPause = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause" width="35" height="35" viewBox="0 0 24 24" stroke-width="1.5" stroke="#000" fill="#000" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /></svg>';
const bigButtonPlay = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play" width="35" height="35" viewBox="0 0 24 24" stroke-width="1.5" stroke="#000" fill="#000" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 4v16l13 -8z" /></svg>';
const buttongLoading = '<img width="40" height="40" src="https://storage.googleapis.com/nrm-web/oye/recursos/loading-normal.gif" style="padding:5px;"/>';
const buttonPodcastPlay = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play" width="80" height="80" viewBox="0 0 24 24" stroke-width="2" stroke="#FFAA1F" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 4v16l13 -8z" /></svg>';
const buttonPodcastPause = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause" width="80" height="80" viewBox="0 0 24 24" stroke-width="1.5" stroke="#FFAA1F" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /></svg>';
const buttonPodcastPlayRebels = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play" width="80" height="80" viewBox="0 0 24 24" stroke-width="2" stroke="#F2400D" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 4v16l13 -8z" /></svg>';
const buttonPodcastPauseRebels = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause" width="80" height="80" viewBox="0 0 24 24" stroke-width="1.5" stroke="#F2400D" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /></svg>';
var volume;
var artist;
var cancion;
var hora;
const radioButton = document.getElementById('radiobutton');
const player = document.getElementById('player');
const secchome = document.getElementById('home');
var coverbase = "https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=0aa2713d85e04243944924876ba71f05&format=json";

let lastStreamStatus = null;

// Handler refs for delegated events — needed to remove them before re-adding on each page navigation
let _voteToptenHandler = null;
let _votePropuestasHandler = null;
let _voteLanzamientosHandler = null;
let _voteTracks2025Handler = null;
let _playVideoFloatHandler = null;
let _radiobuttonFloatingHandler = null;

// ===== [PLAYER - SONG POLLING] renderNowPlaying, scheduleNextSongFetch, startSongPolling =====
let songETag = null;
let songLastModified = null;
let songPrevTitle = null;
let songPrevArtist = null;
let songTimer = null;
let songController = null;
let songFirstLoad = true;
const songURL = "https://cdn.nrm.com.mx/cdn/beat/playlist/cancion.json";

const BASE_INTERVAL_MS = 30000; // default 30s

function renderNowPlaying(titleText, artistText) {
  const host = document.querySelector('.text-player');
  if (!host) {
    return false;
  }
  const isCommercial = !titleText || titleText === '';
  const label = isCommercial ? (artistText || 'PAUSA COMERCIAL') : (titleText + ' / ' + artistText);

  const codtit = encodeURIComponent(titleText || '');
  const codart = encodeURIComponent(artistText || '');
  const share = isCommercial ? '' : (
    '<div class="share-current">' +
    '<div class="like">\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="28" height="28" stroke-width="1">\n  <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"></path>\n</svg>\n</div>' +
    '<div class="share-wp">\n<a href="https://api.whatsapp.com/send/?text=Estoy%20escuchando%20' + codtit + '%20de%20' + codart + '%20en%20https://beatdigital.mx/" target="_blank">\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="28" height="28" stroke-width="1">\n  <path d="M13 4v4c-6.575 1.028 -9.02 6.788 -10 12c-.037 .206 5.384 -5.962 10 -6v4l8 -7l-8 -7z"></path>\n</svg>\n</a>\n</div></div>'
  );

  host.innerHTML = '<div style="font-weight:bold;">Estás escuchando...</div>' +
    '<div class="now-playing" style="line-height:11px; font-size:12px;">' + label + '</div>' +
    share;
  try {
    const likeBtn = host.querySelector('.like');
    if (likeBtn) {
      likeBtn.addEventListener('click', function() {
        const svg = this.querySelector('svg');
        if (svg) svg.style.fill = '#d6d8d7';
      });
    }
  } catch (_) { }
  return true;
}

function scheduleNextSongFetch(delayMs) {
  clearTimeout(songTimer);
  songTimer = setTimeout(getInfoMusic, delayMs);
}

function currentPollInterval() {
  // Faster while playing and tab visible; slower when paused or tab hidden
  const visible = !document.hidden;
  const isPlaying = local_status === 'LIVE_PLAYING';
  if (isPlaying && visible) return 15000;
  if (visible) return BASE_INTERVAL_MS;
  return 60000; // throttle in background
}

function startSongPolling() {
  clearTimeout(songTimer);
  getInfoMusic();
}

document.addEventListener('visibilitychange', () => {
  // When tab visibility changes, reschedule with the new cadence
  scheduleNextSongFetch(currentPollInterval());
});

// Abort in-flight fetches during Astro navigations to avoid race conditions
document.addEventListener('astro:before-preparation', () => {
  if (songController) try { songController.abort(); } catch (e) { }
});

// ===== [PLAYER - TRITON SDK] initPlayerSDK, getStatus, startAd, completeAd, play, pause, stop =====
function initPlayerSDK() {
  var tdPlayerConfig = {
    coreModules: [{
      id: 'MediaPlayer',
      playerId: 'td_container',
      audioAdaptive: false,
      plugins: [{ id: "vastAd" }]
    }],
    // The callbacks are defined in your source code.
    playerReady: onPlayerReady,
    moduleError: onModuleError,
    audioAdaptive: true,
    analytics: {
      active: true,
      debug: false,
      appInstallerId: 'beatpag',
      trackingId: 'G-8DSGT28PYF',
      trackingEvents: ['play', 'stop', 'pause', 'resume', 'all'],
      sampleRate: 100,
      category: 'Reproduccion Radio Pag'
    }
  };
  // The call to loadModules() as been removed.
  streaming = new TDSdk(tdPlayerConfig);
  streaming.addEventListener('stream-status', getStatus);
  streaming.addEventListener('ad-playback-complete', completeAd);
  streaming.addEventListener('ad-playback-start', startAd);
  streaming.addEventListener('ad-playback-error', errorAd);
  streaming.addEventListener('autoplay', autoplay);
}

function getStatus(s) {
  const prevStatus = lastStreamStatus;
  local_status = s.data.code;
  lastStreamStatus = local_status;
  const secchome = document.getElementById('home');

  // ===== Manual GA4 events with clean names
  if (prevStatus !== local_status) {
    if (local_status === 'LIVE_PLAYING') {
      const ev = (prevStatus === 'LIVE_PAUSE') ? 'resume' : 'play';
      trackTritonPlaybackEvent(ev);
    }
    if (local_status === 'LIVE_PAUSE') {
      trackTritonPlaybackEvent('pause');
    }
    if (local_status === 'LIVE_STOP') {
      trackTritonPlaybackEvent('stop');
    }
  }

  if (local_status == 'GETTING_STATION_INFORMATION' || local_status == 'LIVE_CONNECTING' || local_status == 'LIVE_BUFFERING') {
    document.getElementById('loading').classList.add('show');
    document.getElementById('loading').classList.remove('hide');
    document.getElementById('play-pause').classList.remove('show');
    document.getElementById('play-pause').classList.add('hide');
    document.getElementById('big-play').innerHTML = buttongLoading;
  }
  if (local_status == 'LIVE_PLAYING') {
    document.getElementById('play-pause').innerHTML = buttonPause;
    document.getElementById('loading').classList.remove('show');
    document.getElementById('loading').classList.add('hide');
    document.getElementById('play-pause').classList.add('show');
    document.getElementById('play-pause').classList.remove('hide');
    document.getElementById('big-play').innerHTML = bigButtonPause;
    const textPlayer = document.querySelector('.text-player');
    if (textPlayer) { textPlayer.classList.add('playing'); textPlayer.innerHTML = '<div style="font-weight:bold;">Estás escuchando...</div>'; }
    document.getElementById('radiobutton').classList.add('playerplaying');
    // Fetch current song immediately when playback starts
    getInfoMusic(true);
    setTimeout(startSongPolling, 500);
  }
  if (local_status == 'LIVE_STOP' || local_status == 'LIVE_PAUSE') {
    document.getElementById('loading').classList.remove('show');
    document.getElementById('loading').classList.add('hide');
    document.getElementById('play-pause').classList.add('show');
    document.getElementById('play-pause').classList.remove('hide');
    document.getElementById('play-pause').innerHTML = buttonPlay;
    document.getElementById('big-play').innerHTML = bigButtonPlay;
    const textPlayer = document.querySelector('.text-player');
    if (textPlayer) { textPlayer.classList.remove('playing'); textPlayer.innerHTML = ''; }
    document.getElementById('radiobutton').classList.remove('playerplaying');
    setTimeout(function () {
      const tp = document.querySelector('.text-player');
      if (tp) tp.innerHTML = 'ESCUCHA LA RADIO <span style="color: #e94543;    font-weight: bold;    font-size: 12px;">EN VIVO</span> AHORA';
    }, 500);
  }
}


function completeAd(e) {
  streaming.play({
    station: 'XHSONFM',
    trackingParameters: {
      Dist: 'WebBeat'
    }
  });
  // Ensure current song is shown as soon as we resume after ad
  getInfoMusic(true);
  document.getElementById('td_container').classList.remove('pub_active');
  document.getElementById('full-cover').style.display = 'none';
}

function startAd(e) {
  document.getElementById('td_container').classList.add('pub_active');
  document.getElementById('full-cover').style.display = 'block';
  document.getElementById('big-play').innerHTML = buttongLoading;
  const tp = document.querySelector('.text-player');
  if (tp) tp.innerHTML = '<div style="font-style: italic; line-height:11px; font-weight:bold; font-size:11px;">Iniciamos después del anuncio...</div>';
}

var start = function () {
  streaming.playAd('vastAd', { url: 'https://pubads.g.doubleclick.net/gampad/ads?sz=600x360&iu=/23349147378/Beat/VideoVast&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&url=[referrer_url]&description_url=[description_url]&correlator=[timestamp]' });
};


function pause() {
  streaming.stop();
}


function play() {
  streaming.play({
    station: 'XHSONFM',
    trackingParameters: {
      Dist: 'WebBeat'
    }
  });
  getInfoMusic(true);
}


function stop() {
  streaming.stop();
}

function errorAd(e) {
  streaming.play({
    station: 'XHSONFM',
    trackingParameters: {
      Dist: 'WebBeat'
    }
  });
  getInfoMusic(true);
}

/* Callback function called to notify that the SDK is ready to be used */
function onPlayerReady() {
  console.log('streaming ready');
  document.getElementById('loading').classList.remove('show');
  document.getElementById('loading').classList.add('hide');
  document.getElementById('play-pause').classList.add('show');
  document.getElementById('play-pause').classList.remove('hide');
  vol = streaming.getVolume();
}


/* Callback function called to notify that the player configuration has an error. */
function onConfigurationError(e) {
}
/* Callback function called to notify that a module has not been loaded properly */
function onModuleError(object) {
  console.log(object);
  console.log(object.data.errors);
}

/* Callback function called to notify that an Ad-Blocker was detected */
function onAdBlockerDetected() {
  console.log('AdBlockerDetected');
}

const autoplay = function () {
  streaming.play({
    station: 'XHSONFM',
    trackingParameters: {
      Dist: 'WebBeat',
      autoplay: 1
    }
  });
  getInfoMusic(true);
}


initPlayerSDK();

volume = document.getElementById('vol');
volume.addEventListener('input', function () {
  streaming.setVolume(volume.value);
});

// ===== [PLAYER - MUSIC INFO + COVER ART] getInfoMusic, getInfoProg =====
function getInfoMusic(forceFresh = false) {
  // Abort any previous request to avoid overlap
  if (songController) {
    try { songController.abort(); } catch (e) { }
  }
  songController = new AbortController();

  const baseURL = songURL + ((forceFresh || songFirstLoad) ? (songURL.includes('?') ? '&' : '?') + '_ts=' + Date.now() : '');
  const reqURL = new URL(baseURL, location.href);
  const crossOrigin = reqURL.origin !== location.origin;

  const fetchOpts = { method: 'GET', cache: (forceFresh || songFirstLoad) ? 'no-store' : 'no-cache', signal: songController.signal, mode: 'cors' };
  if (!crossOrigin) {
    const headers = {};
    if (songETag) headers['If-None-Match'] = songETag;
    if (songLastModified) headers['If-Modified-Since'] = songLastModified;
    if (Object.keys(headers).length) fetchOpts.headers = headers;
  }

  fetch(reqURL, fetchOpts)
    .then((res) => {
      if (res.status === 304) {
        if (songFirstLoad || forceFresh) {
          songFirstLoad = false;
          getInfoMusic(true);
          return Promise.reject({ _skip: true });
        }
        scheduleNextSongFetch(currentPollInterval());
        return Promise.reject({ _skip: true });
      }
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      songETag = res.headers.get('ETag') || songETag;
      songLastModified = res.headers.get('Last-Modified') || songLastModified;
      return res.json();
    })
    .then((data) => {
      songFirstLoad = false;
      let categoria = data.categoria;
      switch (categoria) {
        case 'COMERCIALES':
        case 'DROP':
        case 'NUEVA PRODUCCION':
        case 'Elementos RANDOM':
        case 'ELEMENTOS':
          artist = 'PAUSA COMERCIAL';
          cancion = '';
          break;
        default:
          artist = data.dj;
          cancion = data.title;
          hora = data.hora_real;
      }

      const sameSong = (songPrevTitle === cancion) && (songPrevArtist === artist);

      let painted = false;
      if (cancion === '') {
        painted = renderNowPlaying('', artist);
      } else {
        painted = renderNowPlaying(cancion, artist);
        const likeBtn = document.querySelector('.like');
        if (likeBtn) {
          likeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            registerVote('Radio', artist, cancion, this)
              .then(() => {})
              .catch(() => {});
          });
        }
      }

      if (painted) {
        songPrevTitle = cancion;
        songPrevArtist = artist;
      } else if (sameSong) {
        scheduleNextSongFetch(currentPollInterval());
        return;
      }
      scheduleNextSongFetch(currentPollInterval());
    })
    .catch((err) => {
      if (err && err._skip) return;
      const backoff = Math.min(currentPollInterval() * 2, 300000);
      scheduleNextSongFetch(backoff);
    });
}


function getInfoProg() {
  fetch("https://beatdigital.com.mx/wp-json/wp/v2/posts?_embed&per_page=100&categories=515&_fields[]=_links&_fields[]=_embedded&_fields[]=acf&_fields[]=content")
    .then((res) => {
      if (!res.ok) {
        throw new Error('HTTP error! Status: ${res.status}');
      }
      return res.json();
    })
    .then((data) => {
      const fecha = new Date();
      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const dia = dias[fecha.getDay()];
      const hora = dayjs(fecha).format('HH:mm:ss');
      let siguientePrograma = null;
      data.map(function (prog, i, el) {
        if (prog.acf[dia] === true) {
          if (prog.acf.hora_fin >= hora && prog.acf.hora_inicio <= hora) {
            const bannerImg = document.querySelector('.banner-prog img');
            if (bannerImg) bannerImg.src = prog._embedded['wp:featuredmedia'][0].media_details.sizes['full'].source_url;
            const envivoProgEl = document.querySelector('.envivo-prog');
            if (envivoProgEl) envivoProgEl.innerHTML = prog.acf.programa;
            const envivoNow = document.querySelector('.envivo-now');
            if (envivoNow) envivoNow.innerHTML = prog.acf.hora_inicio + ' - ' + prog.acf.hora_fin;
            const envivoProgTab = document.querySelector('.envivo-prog-tab');
            if (envivoProgTab) envivoProgTab.innerHTML = prog.acf.programa;
            const envivoDesc = document.querySelector('.envivo-desc');
            if (envivoDesc) envivoDesc.innerHTML = prog.content.rendered;
          }
          if (prog.acf.hora_inicio > hora) {
            if (!siguientePrograma || prog.acf.hora_inicio < siguientePrograma.acf.hora_inicio) {
              siguientePrograma = prog;
            }
          }
        }
      });
      if (siguientePrograma) {
        const envivoNext = document.querySelector('.envivo-next');
        if (envivoNext) envivoNext.innerHTML = siguientePrograma.acf.hora_inicio + ' - ' + siguientePrograma.acf.hora_fin;
        const envivoNextTab = document.querySelector('.envivo-prog-next-tab');
        if (envivoNextTab) envivoNextTab.innerHTML = siguientePrograma.acf.programa;
      }
    });
}



// ===== [PLAYER - CONTROLS] radioActive, podcastActive, videoActive, initPlayer, transitionPlayer =====
const radioActive = function () {
  document.getElementById('player-inner').classList.add('active');
  document.getElementById('player-v-podcast').classList.remove('active');
  document.getElementById('player-v-video').classList.remove('active');
  const playerFloat = document.querySelector('.player-float');
  if (playerFloat) playerFloat.classList.remove('hide');
}

const podcastActive = function () {
  document.getElementById('player-inner').classList.remove('active');
  document.getElementById('player-v-podcast').classList.add('active');
  document.getElementById('player-v-video').classList.remove('active');
  const playerFloat = document.querySelector('.player-float');
  if (playerFloat) { playerFloat.classList.add('hide'); playerFloat.classList.remove('active'); }
}

const videoActive = function () {
  document.getElementById('player-inner').classList.remove('active');
  document.getElementById('player-v-podcast').classList.remove('active');
  document.getElementById('player-v-video').classList.add('active');
}

const radioStop = function () {
  transitionPlayer();
  streaming.stop();
  document.getElementById('player').setAttribute('data-status', 'init');
  document.getElementById('player-inner').classList.remove('active');
}

const initPlayer = function () {
  transitionPlayer();
  document.getElementById('player-v-podcast').classList.remove('active');
  document.getElementById('player-v-video').classList.remove('active');
  const playerFloat = document.querySelector('.player-float');
  if (playerFloat) { playerFloat.classList.remove('hide'); playerFloat.classList.add('active'); }
  document.getElementById('radiobutton').classList.remove('playerplaying');
}

const transitionPlayer = function () {
  document.getElementById('radiobutton').style.width = '0px';
  setTimeout(function () {
    document.getElementById('radiobutton').style.width = '250px';
  }, 500);
}


const playerstatus = function () {
  return document.getElementById('player').getAttribute('data-status');
};

const playstopRadio = function () {
  transitionPlayer();
  const getplayingstatus = playerstatus();
  if (getplayingstatus == 'podcast-playing') {
    const containerpodcast = document.getElementById('iframepodcast');
    containerpodcast.innerHTML = '';
  }

  if (getplayingstatus == 'video-playing') {

  }
  console.log(getplayingstatus);
  console.log(local_status);

  if (local_status == null || local_status == 'undefined' || local_status == '') {
    start();
    document.getElementById('player').setAttribute('data-status', 'radio-playing');
    radioActive();
  } else if (local_status == 'LIVE_STOP') {
    play();
  }
  else if (local_status == 'LIVE_PLAYING' || local_status == 'GETTING_STATION_INFORMATION' || local_status == 'LIVE_CONNECTING' || local_status == 'LIVE_BUFFERING') {
    radioStop();
  }
};


document.getElementById('big-play').addEventListener('click', function () {
  playstopRadio();
});

const returnLive = document.getElementById('return-live');
if (returnLive) returnLive.addEventListener('click', function () {
  playstopRadio();
});


/* NAVIGATION */

document.addEventListener('astro:before-preparation', ev => {
  document.querySelector('main').classList.add('loading');
  document.querySelector('.preloader').classList.add('showpreloader');
});


document.addEventListener('astro:page-load', ev => {

  if (navigator.userAgent.indexOf("Chrome") != -1 || navigator.userAgent.indexOf("Firefox") != -1 || navigator.userAgent.indexOf("MSIE") != -1 || !!document.documentMode == true) {
    /* ==========CURSOR HOVER ===========*/
    const CONTAINER = document.querySelector('.container')
    const CARDS = document.querySelectorAll('article')
    const CONFIG = {
      proximity: 40,
      spread: 80,
      blur: 20,
      gap: 32,
      vertical: false,
      opacity: 0.15,
    }
    const PROXIMITY = 10
    const UPDATE = (event) => {
      for (const CARD of CARDS) {
        const CARD_BOUNDS = CARD.getBoundingClientRect()
        if (
          event?.x > CARD_BOUNDS.left - CONFIG.proximity &&
          event?.x < CARD_BOUNDS.left + CARD_BOUNDS.width + CONFIG.proximity &&
          event?.y > CARD_BOUNDS.top - CONFIG.proximity &&
          event?.y < CARD_BOUNDS.top + CARD_BOUNDS.height + CONFIG.proximity) {
          CARD.style.setProperty('--active', 1)
        } else {
          CARD.style.setProperty('--active', CONFIG.opacity)
        }
        const CARD_CENTER = [
          CARD_BOUNDS.left + CARD_BOUNDS.width * 0.5,
          CARD_BOUNDS.top + CARD_BOUNDS.height * 0.5
        ]
        let ANGLE = Math.atan2(event?.y - CARD_CENTER[1], event?.x - CARD_CENTER[0]) * 180 / Math.PI
        ANGLE = ANGLE < 0 ? ANGLE + 360 : ANGLE;
        CARD.style.setProperty('--start', ANGLE + 90)
      }
    }
    document.body.addEventListener('pointermove', UPDATE)
    const RESTYLE = () => {
      CONTAINER.style.setProperty('--gap', CONFIG.gap)
      CONTAINER.style.setProperty('--blur', CONFIG.blur)
      CONTAINER.style.setProperty('--spread', CONFIG.spread)
      CONTAINER.style.setProperty('--direction', CONFIG.vertical ? 'column' : 'row')
    }
    RESTYLE();
    UPDATE();

  } else if (navigator.userAgent.indexOf("Safari") != -1) {
    console.log('Safari');
    document.querySelectorAll('.card .glows').forEach(function(el) {
      el.style.display = 'none';
      el.classList.remove('glows');
    });

  } else {
    console.log('Unknown');
  }


  /* publicidad: reinicializa slots tras el DOM swap de Astro View Transitions */
  if (window.googletag && googletag.apiReady) {
    initGPT();
  } else {
    window.googletag = window.googletag || { cmd: [] };
    googletag.cmd.push(function() { initGPT(); });
  }

  /* =======COMSCORE*/
  var ts = Math.round((new Date()).getTime() / 1000 * Math.random() * 10);
  self.COMSCORE && COMSCORE.beacon({
    c1: "2", c2: "6906652",
    options: {
      enableFirstPartyCookie: true,
      bypassUserConsentRequirementFor1PCookie: true
    }
  });

  fetch('/pageview_candidate.txt?' + ts)
    .then(function (resp) {
      console.log(resp);
    });
  /* =======COMSCORE*/


  const getplayingstatus = playerstatus();
  document.querySelector('main').classList.remove('loading');
  document.querySelector('.preloader').classList.remove('showpreloader');

  const secchome = document.getElementById('home');
  const secenvivo = document.getElementById('envivo');

  document.querySelectorAll('.like').forEach(function(el) {
    el.addEventListener('click', function() {
      console.log('like');
      const svg = this.querySelector('svg');
      if (svg) svg.style.fill = '#d6d8d7';
    });
  });

  if (secenvivo) {
    console.log('envivo');
    getInfoProg();
    setInterval(getInfoProg, 300000);
    document.getElementById('radiobutton').classList.add('en-vivo');
    console.log(local_status);

    if (local_status == null || local_status == 'undefined' || local_status == '' || local_status == 'LIVE_STOP') {
      console.log('stat ' + local_status);
      playstopRadio();
    }
    const logoImg = document.querySelector('.logo-player img');
    if (logoImg) logoImg.src = '/img/logo-beat.png';
    document.getElementById('big-play').classList.remove('border-4');

  } else {
    document.getElementById('radiobutton').classList.remove('en-vivo');
    document.getElementById('big-play').classList.add('border-4');
    const logoImg = document.querySelector('.logo-player img');
    if (logoImg) logoImg.src = '/img/beat-digital-logo.png';
  }

  const secprogram = document.getElementById('programacion') || document.getElementById('que-plan');

  if (secchome) {
    var elem = document.querySelector('.carousel-main');
    var flkty = new Flickity(elem, {
      cellAlign: 'right',
      prevNextButtons: true,
      pageDots: false,
      pauseAutoPlayOnHover: true,
      freeScroll: true,
      wrapAround: true
    });
    flkty.select(2);
    flkty.reloadCells();

    var elembuenfin = document.querySelector('.carousel-buenfin');
    var flktybuenfin = new Flickity(elembuenfin, {
      cellAlign: 'right',
      prevNextButtons: true,
      pageDots: false,
      pauseAutoPlayOnHover: true,
      freeScroll: true,
      wrapAround: true
    });

    var elemportada = document.querySelector('.carousel-portada');
    var flktyportada = new Flickity(elemportada, {
      cellAlign: 'center',
      prevNextButtons: false,
      pageDots: false,
      pauseAutoPlayOnHover: true,
      freeScroll: true,
      wrapAround: true,
      autoPlay: 5000,
    });
  }


  if (secprogram || secchome) {
    var elempod = document.querySelector('.main-carousel');
    if (elempod) {
      var flktypod = new Flickity(elempod, {
        contain: true,
        lazyLoad: 1,
        wrapAround: true,
        cellAlign: 'center',
        pageDots: false,
        autoPlay: 5000,
      });
    }

    var elemconciertos = document.querySelector('.main-conciertos');
    if (elemconciertos) {
      var flktyconciertos = new Flickity(elemconciertos, {
        contain: true,
        lazyLoad: 1,
        wrapAround: true,
        cellAlign: 'left',
        pageDots: false,
      });
    }

    var elemteatro = document.querySelector('.main-teatro');
    if (elemteatro) {
      var flktyteatro = new Flickity(elemteatro, {
        contain: true,
        lazyLoad: 1,
        wrapAround: true,
        cellAlign: 'left',
        pageDots: false,
      });
    }

    var elemfamiliar = document.querySelector('.main-familiar');
    if (elemfamiliar) {
      var flktyfamiliar = new Flickity(elemfamiliar, {
        contain: true,
        lazyLoad: 1,
        wrapAround: true,
        cellAlign: 'left',
        pageDots: false,
      });
    }
  }


  const imagenNota = document.getElementById("imagen-nota");
  if (imagenNota) {
    const imgNotaOriginal = imagenNota.getElementsByTagName('img');
    const imgNotaOriginal2 = imgNotaOriginal[0].getAttribute('src');
    imagenNota.style.backgroundImage = "url(" + imgNotaOriginal2 + ")";
  }


  if (getplayingstatus == 'podcast-playing') {
    const containerpodcast = document.getElementById('iframepodcast');
    initPlayer();
  }


  document.querySelectorAll('.audiopod').forEach(function(el) {
    el.addEventListener('click', function() {
      const getstatus = playerstatus();
      const podactive = this.querySelector('.play-pause-podcast');
      const podcaststatus = podactive.getAttribute('data-podcast-status');
      const containerpodcast = document.getElementById('iframepodcast');

      transitionPlayer();
      podcastActive();
      setTimeout(function () {
        document.getElementById('radiobutton').classList.add('playerplaying');
      }, 600);

      if (getstatus == 'radio-playing') {
        radioStop();
      }

      podactive.innerHTML = '<img class="loading-gif" src="https://storage.googleapis.com/nrm-web/oye/recursos/loading-normal.gif" />';

      const closePodcast = document.querySelector('.close-podcast');
      if (closePodcast) {
        closePodcast.addEventListener('click', function() {
          initPlayer();
          const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
          const ply = new playerjs.Player(playerpodcast);
          ply.on('ready', () => {
            ply.pause();
            podactive.setAttribute('data-podcast-status', 'ready');
          });
          document.querySelectorAll('.audiopod .play-pause-podcast').forEach(function(btn) {
            btn.innerHTML = buttonPodcastPlay;
            btn.setAttribute('data-podcast-status', 'ready');
          });
        });
      }

      if (getstatus == 'podcast-playing') {
        const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
        const ply = new playerjs.Player(playerpodcast);
        ply.on('ready', () => {
          ply.pause();
          podactive.setAttribute('data-podcast-status', 'ready');
        });
        document.querySelectorAll('.audiopod .play-pause-podcast').forEach(function(btn) {
          btn.innerHTML = buttonPodcastPlay;
          btn.setAttribute('data-podcast-status', 'ready');
        });
      }

      if (podcaststatus == 'ready') {
        const ifr = this.querySelector('.data-iframe').getAttribute('data-iframe');
        const ifrsrc = ifr.split('src="');
        const src = ifrsrc[1].split('"');
        containerpodcast.innerHTML = '';
        const playerpodcast = document.createElement('iframe');
        playerpodcast.setAttribute('src', src[0] + "?image=0&share=0&download=1&description=0&background=efefef&foreground=2b2b2c&highlight=e1b01c");
        playerpodcast.setAttribute('width', '300');
        playerpodcast.setAttribute('height', '190');
        playerpodcast.setAttribute('frameborder', '0');
        playerpodcast.setAttribute('allow', 'autoplay');
        playerpodcast.setAttribute('transition:persist', '');
        containerpodcast.appendChild(playerpodcast);
        const ply = new playerjs.Player(playerpodcast);

        ply.on('ready', () => {
          podactive.setAttribute('data-podcast-status', 'active');
          document.getElementById('player').setAttribute('data-status', 'podcast-playing');
          playerpodcast.classList.add('iframestyle');
          ply.play();

          ply.on('play', () => {
            podactive.innerHTML = buttonPodcastPause;
          });

          ply.on('pause', () => {
            podactive.innerHTML = buttonPodcastPlay;
          });
        });
      }
      else if (podcaststatus == 'active') {
        const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
        const ply = new playerjs.Player(playerpodcast);
        ply.on('ready', () => {
          ply.pause();
          podactive.setAttribute('data-podcast-status', 'ready');
        });
      }
    });
  });

  document.querySelectorAll('.audiopod-rebels').forEach(function(el) {
    el.addEventListener('click', function() {
      const getstatus = playerstatus();
      const podactive = this.querySelector('.play-pause-podcast');
      const podcaststatus = podactive.getAttribute('data-podcast-status');
      const containerpodcast = document.getElementById('iframepodcast');

      transitionPlayer();
      podcastActive();
      setTimeout(function () {
        document.getElementById('radiobutton').classList.add('playerplaying');
      }, 600);

      if (getstatus == 'radio-playing') {
        radioStop();
      }

      podactive.innerHTML = '<img class="loading-gif" src="https://storage.googleapis.com/nrm-web/oye/recursos/loading-normal.gif" />';

      const closePodcast = document.querySelector('.close-podcast');
      if (closePodcast) {
        closePodcast.addEventListener('click', function() {
          initPlayer();
          const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
          const ply = new playerjs.Player(playerpodcast);
          ply.on('ready', () => {
            ply.pause();
            podactive.setAttribute('data-podcast-status', 'ready');
          });
          document.querySelectorAll('.audiopod-rebels .play-pause-podcast').forEach(function(btn) {
            btn.innerHTML = buttonPodcastPlayRebels;
            btn.setAttribute('data-podcast-status', 'ready');
          });
        });
      }

      if (getstatus == 'podcast-playing') {
        const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
        const ply = new playerjs.Player(playerpodcast);
        ply.on('ready', () => {
          ply.pause();
          podactive.setAttribute('data-podcast-status', 'ready');
        });
        document.querySelectorAll('.audiopod-rebels .play-pause-podcast').forEach(function(btn) {
          btn.innerHTML = buttonPodcastPlayRebels;
          btn.setAttribute('data-podcast-status', 'ready');
        });
      }

      if (podcaststatus == 'ready') {
        const ifr = this.querySelector('.data-iframe').getAttribute('data-iframe');
        const ifrsrc = ifr.split('src="');
        const src = ifrsrc[1].split('"');
        containerpodcast.innerHTML = '';
        const playerpodcast = document.createElement('iframe');
        playerpodcast.setAttribute('src', src[0] + "?image=0&share=0&download=1&description=0&background=F2400D&foreground=F2400D&highlight=F2400D");
        playerpodcast.setAttribute('width', '300');
        playerpodcast.setAttribute('height', '190');
        playerpodcast.setAttribute('frameborder', '0');
        playerpodcast.setAttribute('allow', 'autoplay');
        playerpodcast.setAttribute('transition:persist', '');
        containerpodcast.appendChild(playerpodcast);
        const ply = new playerjs.Player(playerpodcast);

        ply.on('ready', () => {
          podactive.setAttribute('data-podcast-status', 'active');
          document.getElementById('player').setAttribute('data-status', 'podcast-playing');
          playerpodcast.classList.add('iframestyle');
          ply.play();

          ply.on('play', () => {
            podactive.innerHTML = buttonPodcastPauseRebels;
          });

          ply.on('pause', () => {
            podactive.innerHTML = buttonPodcastPlayRebels;
          });
        });
      }
      else if (podcaststatus == 'active') {
        const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
        const ply = new playerjs.Player(playerpodcast);
        ply.on('ready', () => {
          ply.pause();
          podactive.setAttribute('data-podcast-status', 'ready');
        });
      }
    });
  });

  document.querySelectorAll('.wp-block-image').forEach(function(el) {
    const img = el.querySelector('img');
    if (img && img.dataset.src) img.src = img.dataset.src;
  });


  const containvideo = document.getElementById('content-w-video');
  if (containvideo) {
    console.log(navigator.userAgent);
    if (navigator.userAgent.indexOf("iPhone") != -1) {

      document.querySelectorAll('.wp-block-embed-youtube .wp-block-embed__wrapper iframe').forEach(function(el) {
        el.addEventListener('click', function() {
          const getstatus = playerstatus();
          if (getstatus == 'radio-playing') {
            radioStop();
            document.getElementById('player').setAttribute('data-status', 'video-playing');
          }
        });
      });

    } else {
      document.querySelectorAll('.wp-block-embed-youtube .wp-block-embed__wrapper').forEach(function(el) {
        console.log(el.querySelector('iframe'));
        const plyr = new Plyr(el, {
          debug: true,
          controls: [
            'play-large',
            'restart',
            'rewind',
            'play',
            'fast-forward',
            'progress',
            'current-time',
            'duration',
            'mute',
            'volume',
            'captions',
            'settings',
            'pip',
            'airplay',
            'download',
            'fullscreen',
          ],
          playsinline: true
        });
        plyr.on('playing', function () {
          const getstatus = playerstatus();
          if (getstatus == 'radio-playing') {
            radioStop();
            document.getElementById('player').setAttribute('data-status', 'video-playing');
          }
        });

        document.getElementById('radiobutton').addEventListener('click', function () {
          plyr.pause();
        });
      });
    }
  }


  // === [/VOTOS] ===
  if (_voteToptenHandler) document.removeEventListener('click', _voteToptenHandler);
  _voteToptenHandler = function(e) {
    const btn = e.target.closest('.like-topten');
    if (!btn) return;
    console.log('like topten');
    e.preventDefault();
    const artist = btn.dataset.artist || '';
    const cancion = btn.dataset.song || '';
    registerVote('TopTen', artist, cancion, btn)
      .then(() => {})
      .catch(() => {});
  };
  document.addEventListener('click', _voteToptenHandler);

  if (_votePropuestasHandler) document.removeEventListener('click', _votePropuestasHandler);
  _votePropuestasHandler = function(e) {
    const btn = e.target.closest('.like-propuestas');
    if (!btn) return;
    e.preventDefault();
    const artist = btn.dataset.artist || '';
    const cancion = btn.dataset.song || '';
    registerVote('Propuestas', artist, cancion, btn)
      .then(() => {})
      .catch(() => {});
  };
  document.addEventListener('click', _votePropuestasHandler);

  if (_voteLanzamientosHandler) document.removeEventListener('click', _voteLanzamientosHandler);
  _voteLanzamientosHandler = function(e) {
    const btn = e.target.closest('.like-lanzamientos');
    if (!btn) return;
    e.preventDefault();
    const artist = btn.dataset.artist || '';
    const cancion = btn.dataset.song || '';
    registerVote('Lanzamientos', artist, cancion, btn)
      .then(() => {})
      .catch(() => {});
  };
  document.addEventListener('click', _voteLanzamientosHandler);

  if (_voteTracks2025Handler) document.removeEventListener('click', _voteTracks2025Handler);
  _voteTracks2025Handler = function(e) {
    const btn = e.target.closest('.like-tracks2025');
    if (!btn) return;
    console.log('like tracks2025');
    e.preventDefault();
    const artist = btn.dataset.artist || '';
    const cancion = btn.dataset.song || '';
    registerVote('Tracks2025', artist, cancion, btn)
      .then(() => {})
      .catch(() => {});
  };
  document.addEventListener('click', _voteTracks2025Handler);

  // === [Floating Video Player] ===
  if (_playVideoFloatHandler) document.removeEventListener('click', _playVideoFloatHandler);
  _playVideoFloatHandler = function(e) {
    const btn = e.target.closest('.play-video-float');
    if (!btn) return;
    e.preventDefault();
    const content = btn.getAttribute('data-video');
    if (content) createFloatingPlayer(content);
  };
  document.addEventListener('click', _playVideoFloatHandler);

  function createFloatingPlayer(content) {
    const existing = document.getElementById('floating-player-container');
    if (existing) existing.remove();

    const isMobile = window.innerWidth < 768;
    const bottomPos = isMobile ? '130px' : '20px';

    const container = document.createElement('div');
    container.id = 'floating-player-container';
    Object.assign(container.style, {
      position: 'fixed',
      bottom: bottomPos,
      right: '20px',
      width: '320px',
      height: '180px',
      zIndex: '9999',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      background: '#000',
      borderRadius: '8px',
      overflow: 'hidden'
    });

    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '&times;';
    Object.assign(closeBtn.style, {
      position: 'absolute',
      top: '0',
      right: '0',
      background: 'rgba(0,0,0,0.7)',
      color: '#fff',
      width: '24px',
      height: '24px',
      textAlign: 'center',
      lineHeight: '24px',
      cursor: 'pointer',
      zIndex: '10000',
      fontSize: '18px',
      fontWeight: 'bold'
    });
    closeBtn.addEventListener('click', function() {
      container.remove();
      if (_radiobuttonFloatingHandler) {
        const rb = document.getElementById('radiobutton');
        if (rb) rb.removeEventListener('click', _radiobuttonFloatingHandler);
        _radiobuttonFloatingHandler = null;
      }
    });

    const contentDiv = document.createElement('div');
    contentDiv.className = 'plyr__video-embed';
    Object.assign(contentDiv.style, {
      width: '100%',
      height: '100%'
    });

    const temp = document.createElement('div');
    temp.innerHTML = content;
    const iframe = temp.querySelector('iframe');

    if (iframe) {
      Object.assign(iframe.style, {
        width: '100%',
        height: '100%',
        border: 'none'
      });
      contentDiv.appendChild(iframe);
    } else {
      contentDiv.innerHTML = content;
    }

    container.appendChild(closeBtn);
    container.appendChild(contentDiv);
    document.body.appendChild(container);

    const plyr = new Plyr(contentDiv, {
      debug: false,
      controls: [
        'play-large', 'restart', 'rewind', 'play', 'fast-forward',
        'progress', 'current-time', 'duration', 'mute', 'volume',
        'captions', 'settings', 'pip', 'airplay', 'download', 'fullscreen'
      ],
      playsinline: true,
      autoplay: true
    });

    const plyrEl = container.querySelector('.plyr');
    if (plyrEl) {
      Object.assign(plyrEl.style, {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: '0',
        left: '0'
      });
    }

    plyr.on('playing', function () {
      const getstatus = playerstatus();
      if (getstatus == 'radio-playing') {
        radioStop();
        document.getElementById('player').setAttribute('data-status', 'video-playing');
      }
    });

    if (_radiobuttonFloatingHandler) {
      const rb = document.getElementById('radiobutton');
      if (rb) rb.removeEventListener('click', _radiobuttonFloatingHandler);
    }
    _radiobuttonFloatingHandler = function() { plyr.pause(); };
    const rb = document.getElementById('radiobutton');
    if (rb) rb.addEventListener('click', _radiobuttonFloatingHandler);
  }


});
