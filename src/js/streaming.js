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

// ===== Optimized polling for current song (conditional requests + adaptive cadence)
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
    // Removed debug console.warn
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
  // Removed debug console.log
  try {
    $('.like').off('click').on('click', function () {
      $(this).find('svg').css('fill', '#d6d8d7');
    });
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

function initGPT() {
  googletag.destroySlots();

  googletag.cmd.push(function () {
    var mapping2 = googletag.sizeMapping().addSize([300, 250]).build();
    //var mapping3 = googletag.sizeMapping().addSize([728, 90]).build();
    //var mapping31 = googletag.sizeMapping().addSize([320, 50]).build();
    var mapping32 = googletag.sizeMapping().addSize([728, 90]).build();
    var mapping32 = googletag.sizeMapping().addSize([600, 300]).build();
    var mapping321 = googletag.sizeMapping().addSize([320, 50]).build();
    var mapping4 = googletag.sizeMapping().addSize([728, 90]).build();
    var mapping41 = googletag.sizeMapping().addSize([320, 50]).build();
    //var mapping42 = googletag.sizeMapping().addSize([728, 90]).build();
    //var mapping421 = googletag.sizeMapping().addSize([320, 50]).build();   
    var mapping5 = googletag.sizeMapping().addSize([300, 600]).build();
    //var mapping6 = googletag.sizeMapping().addSize([728, 90]).build();
    //var mapping61 = googletag.sizeMapping().addSize([320, 50]).build();
    var mapping14 = googletag.sizeMapping().addSize([600, 800]).build();
    var mapping141 = googletag.sizeMapping().addSize([320, 480]).build();

    var mapping201 = googletag.sizeMapping().addSize([300, 250]).build();
    var mapping202 = googletag.sizeMapping().addSize([300, 250]).build();
    var mapping203 = googletag.sizeMapping().addSize([300, 250]).build();
    var mapping204 = googletag.sizeMapping().addSize([300, 250]).build();
    var mapping205 = googletag.sizeMapping().addSize([300, 250]).build();





    window.slot2 = googletag.defineSlot("/21799830913/Beat", [300, 250], 'ad-slot2').defineSizeMapping(mapping2).addService(googletag.pubads());
    //window.slot3 = googletag.defineSlot("/21799830913/Beat", [728, 90],'ad-slot3').defineSizeMapping(mapping3).addService(googletag.pubads());
    //window.slot31 = googletag.defineSlot("/21799830913/Beat", [320, 50],'ad-slot31').defineSizeMapping(mapping31).addService(googletag.pubads());
    window.slot32 = googletag.defineSlot("/21799830913/Beat", [728, 90], 'ad-slot32').defineSizeMapping(mapping32).addService(googletag.pubads());
    //window.slot32 = googletag.defineSlot("/21799830913/Beat", [600, 300],'ad-slot32').defineSizeMapping(mapping32).addService(googletag.pubads());
    window.slot321 = googletag.defineSlot("/21799830913/Beat", [320, 50], 'ad-slot321').defineSizeMapping(mapping321).addService(googletag.pubads());
    window.slot4 = googletag.defineSlot("/21799830913/Beat", [728, 90], 'ad-slot4').defineSizeMapping(mapping4).addService(googletag.pubads());
    window.slot41 = googletag.defineSlot("/21799830913/Beat", [320, 50], 'ad-slot41').defineSizeMapping(mapping41).addService(googletag.pubads());
    //window.slot42 = googletag.defineSlot("/21799830913/Beat", [728, 90],'ad-slot42').defineSizeMapping(mapping42).addService(googletag.pubads());
    //window.slot421 = googletag.defineSlot("/21799830913/Beat", [320, 50],'ad-slot421').defineSizeMapping(mapping421).addService(googletag.pubads());
    window.slot5 = googletag.defineSlot("/21799830913/Beat", [300, 600], 'ad-slot5').defineSizeMapping(mapping5).addService(googletag.pubads());
    //window.slot6 = googletag.defineSlot("/21799830913/Beat", [728, 90],'ad-slot6').defineSizeMapping(mapping6).addService(googletag.pubads());
    //window.slot61 = googletag.defineSlot("/21799830913/Beat", [320, 50],'ad-slot61').defineSizeMapping(mapping61).addService(googletag.pubads());
    window.slot14 = googletag.defineSlot("/21799830913/Beat", [600, 800], 'ad-slot14').defineSizeMapping(mapping14).addService(googletag.pubads());
    window.slot141 = googletag.defineSlot("/21799830913/Beat", [320, 480], 'ad-slot141').defineSizeMapping(mapping141).addService(googletag.pubads());
    window.slot201 = googletag.defineSlot("/21799830913/Beat/Box", [300, 250], 'ad-slot201').defineSizeMapping(mapping201).addService(googletag.pubads());
    window.slot202 = googletag.defineSlot("/21799830913/Beat/Box2", [300, 250], 'ad-slot202').defineSizeMapping(mapping202).addService(googletag.pubads());
    window.slot203 = googletag.defineSlot("/21799830913/Beat/Box3", [300, 250], 'ad-slot203').defineSizeMapping(mapping203).addService(googletag.pubads());
    window.slot204 = googletag.defineSlot("/21799830913/Beat/Box4", [300, 250], 'ad-slot204').defineSizeMapping(mapping204).addService(googletag.pubads());
    window.slot205 = googletag.defineSlot("/21799830913/Beat/Box5", [300, 250], 'ad-slot205').defineSizeMapping(mapping205).addService(googletag.pubads());

    googletag.pubads().setTargeting("test", "responsive");
    googletag.enableServices();
    googletag.display('ad-slot2');
    googletag.display('ad-slot3');
    googletag.display('ad-slot31');
    googletag.display('ad-slot32');
    googletag.display('ad-slot321');
    googletag.display('ad-slot4');
    googletag.display('ad-slot41');
    googletag.display('ad-slot42');
    googletag.display('ad-slot421');
    googletag.display('ad-slot5');
    googletag.display('ad-slot6');
    googletag.display('ad-slot61');
    googletag.display('ad-slot14');
    googletag.display('ad-slot141');
    googletag.display('ad-slot201');
    googletag.display('ad-slot202');
    googletag.display('ad-slot203');
    googletag.display('ad-slot204');
    googletag.display('ad-slot205');

    //googletag.pubads().refresh([slot3]);
    //setInterval(function(){googletag.pubads().refresh([slot3]);}, 180000);
  });
}
initGPT();
function safeRefreshSlots() {
  if (window.googletag && googletag.apiReady && googletag.pubads) {
    // Repite para cada slot, si tienes más
    if (window.slot2) googletag.pubads().refresh([window.slot2]);
    if (window.slot3) googletag.pubads().refresh([window.slot3]);
    if (window.slot31) googletag.pubads().refresh([window.slot31]);
    if (window.slot32) googletag.pubads().refresh([window.slot32]);
    if (window.slot321) googletag.pubads().refresh([window.slot321]);
    if (window.slot4) googletag.pubads().refresh([window.slot4]);
    if (window.slot41) googletag.pubads().refresh([window.slot41]);
    if (window.slot42) googletag.pubads().refresh([window.slot42]);
    if (window.slot421) googletag.pubads().refresh([window.slot421]);
    if (window.slot5) googletag.pubads().refresh([window.slot5]);
    if (window.slot6) googletag.pubads().refresh([window.slot6]);
    if (window.slot61) googletag.pubads().refresh([window.slot61]);
    if (window.slot201) googletag.pubads().refresh([window.slot201]);
    if (window.slot202) googletag.pubads().refresh([window.slot202]);
    if (window.slot203) googletag.pubads().refresh([window.slot203]);
    if (window.slot204) googletag.pubads().refresh([window.slot204]);
    if (window.slot205) googletag.pubads().refresh([window.slot205]);
    // O simplemente: googletag.pubads().refresh();
    console.log('Banners refrescados post navegación');
  } else {
    setTimeout(safeRefreshSlots, 400);
  }
}



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
  /*streaming.addEventListener( 'track-cue-point', onTrackCuePoint );
  streaming.addEventListener( 'list-loaded', onListLoaded );
  streaming.addEventListener( 'list-empty', onListEmpty);
  streaming.addEventListener( 'nowplaying-api-error', onNowPlayingApiError);
  streaming.addEventListener( 'ad-break-cue-point', adBreakCuePoint);*/
  streaming.addEventListener('autoplay', autoplay);

}

function getStatus(s) {
  local_status = s.data.code;
  const secchome = document.getElementById('home');
  // Removed debug console.log(local_status);
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
    $('.text-player').addClass('playing').html('<div style="font-weight:bold;">Estás escuchando...</div>');
    $('#radiobutton').addClass('playerplaying');
    // Fetch current song immediately when playback starts (avoid invoking inside setTimeout)
    getInfoMusic(true);
    setTimeout(startSongPolling(), 500); // Start polling after a short delay to allow song info to be fetched

  }
  if (local_status == 'LIVE_STOP' || local_status == 'LIVE_PAUSE') {
    document.getElementById('loading').classList.remove('show');
    document.getElementById('loading').classList.add('hide');
    document.getElementById('play-pause').classList.add('show');
    document.getElementById('play-pause').classList.remove('hide');
    document.getElementById('play-pause').innerHTML = buttonPlay;
    document.getElementById('big-play').innerHTML = bigButtonPlay;
    $('.text-player').removeClass('playing');
    $('#radiobutton').removeClass('playerplaying');
    $('.text-player').html('');
    setTimeout(function () {
      $('.text-player').html('ESCUCHA LA RADIO <span style="color: #e94543;    font-weight: bold;    font-size: 12px;">EN VIVO</span> AHORA');
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
  $('#td_container').removeClass('pub_active');
  $('#full-cover').css('display', 'none');
}

/*function onTrackCuePoint( event ){
   var cueTitle = event.data.cuePoint.cueTitle;
   var artistName = event.data.cuePoint.artistName;         
   //console.log('cueTitle: ' + cueTitle);
   //console.log('cambio de cancion');
   console.log(event.data.cuePoint);

   const codtit = cueTitle.replace('&', '%26');
   const codart = artistName.replace('&', '%26');
   document.getElementById('infoMusic').innerHTML = '<div class="current-song">' + artistName + ' / ' + cueTitle + '</div><div class="share-current"><div class="like"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="28" height="28" stroke-width="1"> <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"></path> </svg> </div> <div class="share-wp"><a href="https://api.whatsapp.com/send/?text=Estoy%20escuchando%20' + codtit +'%20de%20'+ codart +'%20en%20https://beatdigital.mx/" target="_blank"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="28" height="28" stroke-width="1"> <path d="M13 4v4c-6.575 1.028 -9.02 6.788 -10 12c-.037 .206 5.384 -5.962 10 -6v4l8 -7l-8 -7z"></path> </svg> </div></div>';
   $('.like').on('click',function(){
      console.log('click');
       $(this).find('svg').css('fill','#d6d8d7');
  });
}*/

/*function adBreakCuePoint( e ){
  console.log('PAUSA COMERCIAL');
  document.getElementById('infoMusic').innerHTML = 'PAUSA COMERCIAL';
}

function onListLoaded( e ){
  console.log( 'tdplayer::onListLoaded' );
  console.log( e.data );
      $.each( e.data.list, function(index, item){
      console.log(index + ' Artist : ' + item.artistName );
      console.log(' Title : ' + item.cueTitle );
      console.log(' Time : ' + item.cueTimeStart );
      } );
}

function onListEmpty( e ){
      console.log( 'tdplayer::onListEmpty' );
}
 
function onNowPlayingApiError( e ){
  console.log( 'tdplayer::onNowPlayingApiError' + e );
}*/

function startAd(e) {
  $('#td_container').addClass('pub_active');
  $('#full-cover').css('display', 'block');
  document.getElementById('big-play').innerHTML = buttongLoading;
  $('.text-player').html('<div style="font-style: italic; line-height:11px; font-weight:bold; font-size:11px;">Iniciamos después del anuncio...</div>');
}

var start = function () {
  //console.log('trata la pub primero');    
  streaming.playAd('vastAd', { url: 'https://pubads.g.doubleclick.net/gampad/ads?sz=600x360&iu=/21799830913/Beat/VideoVast&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&url=[referrer_url]&description_url=[description_url]&correlator=[timestamp]' });
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
  // Also fetch song right after requesting playback, in case status event is delayed
  getInfoMusic(true);
}


function stop() {
  //console.log('stopped');
  streaming.stop();
}

function errorAd(e) {
  streaming.play({
    station: 'XHSONFM',
    trackingParameters: {
      Dist: 'WebBeat'
    }
  });
  // Ensure current song is shown even if ad failed and we jump to live
  getInfoMusic(true);
  //console.log(e);
  //console.log('error ad');

}
/* Callback function called to notify that the SDK is ready to be used */
function onPlayerReady() {
  console.log('streaming ready');
  document.getElementById('loading').classList.remove('show');
  document.getElementById('loading').classList.add('hide');
  document.getElementById('play-pause').classList.add('show');
  document.getElementById('play-pause').classList.remove('hide');
  vol = streaming.getVolume();
  //console.log(vol);

}


/* Callback function called to notify that the player configuration has an error. */
function onConfigurationError(e) {
  //console.log(e);
  //console.log(e.data.errors);
  //Error code : object.data.errors[0].code
  //Error message : object.data.errors[0].message
}
/* Callback function called to notify that a module has not been loaded properly */
function onModuleError(object) {
  console.log(object);
  console.log(object.data.errors);
  //Error code : object.data.errors[0].code
  //Error message : object.data.errors[0].message
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
  // Autoplay path should also fetch current song promptly
  getInfoMusic(true);
}


initPlayerSDK();

volume = document.getElementById('vol');
volume.addEventListener('input', function () {
  //console.log(volume.value);
  streaming.setVolume(volume.value);

});

// === [VOTOS] Helpers y función reutilizable ===
const VOTE_COLOR = '#ef4444';

function detectarNavegador() {
  var ua = navigator.userAgent, tem,
    M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];

  if (/trident/i.test(M[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return { navegador: 'IE', sistema: 'Windows' };
  }

  if (M[1] === 'Chrome') {
    tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
    if (tem != null) return { navegador: tem.slice(1).join(' ').replace('OPR', 'Opera'), sistema: 'Unknown' };
  }

  M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
  if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);

  let sistema = "Desconocido";
  if (navigator.appVersion.indexOf("Win") != -1) sistema = "Windows";
  if (navigator.appVersion.indexOf("Mac") != -1) sistema = "MacOS";
  if (navigator.appVersion.indexOf("X11") != -1) sistema = "UNIX";
  if (navigator.appVersion.indexOf("Linux") != -1) sistema = "Linux";

  return { navegador: M.join(' '), sistema: sistema };
}

function detectarDispositivo() {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
}

/**
 * Registra un voto en el backend.
 * @param {string} seccion - Ej: 'Radio', 'Hot parade', 'Lanzamientos'
 * @param {string} artista - Nombre del artista (sin codificar)
 * @param {string} cancion - Título de la canción (sin codificar)
 * @param {jQuery|null} $btn - Botón/elemento clicado (opcional) para manejar UI
 * @returns {Promise}
 */
function registerVote(seccion, artista, cancion, $btn = null) {
  return new Promise((resolve, reject) => {
    const url = 'https://beatdigital.com.mx/6456heu2/8s4v3f1l3s.php';

    // Protección de doble click o voto ya marcado
    if ($btn) {
      const $svg = $btn.find('svg');
      const fillColor = ($svg.css('fill') || '').toLowerCase();
      if (fillColor === VOTE_COLOR) {
        console.log('Ya votaste por esta canción.');
        return resolve({ status: 'already' });
      }
      if ($btn.prop('disabled')) {
        return resolve({ status: 'disabled' });
      }
      $btn.prop('disabled', true);
    }

    const safe = (s) => (s || '').toString().replace('&', '%26');
    const { navegador, sistema } = detectarNavegador();

    $.post(
      url,
      {
        artista: safe(artista),
        cancion: safe(cancion),
        seccion: seccion, // El backend actual puede ignorarlo; ya preparado para futuro
        dispositivo: detectarDispositivo(),
        navegador,
        sistema_operativo: sistema,
      },
      function (resp) {
        if ($btn) $btn.prop('disabled', false);
        if (resp && resp.status === 'success') {
          if ($btn) $btn.find('svg').css('fill', VOTE_COLOR);
          console.log('Voto registrado con éxito.');
          resolve(resp);
        } else {
          console.log((resp && resp.message) || 'Error al votar.');
          reject(resp || new Error('vote-error'));
        }
      },
      'json'
    ).fail(function () {
      if ($btn) $btn.prop('disabled', false);
      console.log('No se pudo registrar el voto. Intenta de nuevo.');
      reject(new Error('network-fail'));
    });
  });
}



function getInfoMusic(forceFresh = false) {
  // Abort any previous request to avoid overlap
  if (songController) {
    try { songController.abort(); } catch (e) { }
  }
  songController = new AbortController();

  // Optionally bypass caches on first load or when explicitly requested
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
      // Removed debug console.log for HTTP status
      // Handle 304 Not Modified to skip parsing & DOM work
      if (res.status === 304) {
        if (songFirstLoad || forceFresh) {
          // Removed debug console.log for first-load 304
          songFirstLoad = false;
          getInfoMusic(true);
          return Promise.reject({ _skip: true });
        }
        // Removed debug console.log for 304 skip
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
      // Removed debug console.log for payload
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
        // Removed debug console.log for parsed song
      }

      // Avoid unnecessary DOM churn when nothing changed
      const sameSong = (songPrevTitle === cancion) && (songPrevArtist === artist);
      // Removed debug console.log for compare

      let painted = false;
      if (cancion === '') {
        // Removed debug console.log for commercial/element
        painted = renderNowPlaying('', artist);
      } else {
        // Removed debug console.log for updating DOM
        painted = renderNowPlaying(cancion, artist);
        $('.like').off('click.vote').on('click.vote', function (e) {
          e.preventDefault();
          const $btn = $(this);
          registerVote('Radio', artist, cancion, $btn)
            .then(() => {
              // Hook opcional: aquí podrías disparar un toast/analytics
            })
            .catch(() => {
              // Manejo ya se hizo con logs; deja el catch vacío para no romper UX
            });
        });
      }

      if (painted) {
        songPrevTitle = cancion;
        songPrevArtist = artist;
      } else if (sameSong) {
        // If we couldn't paint and it's the same song, just schedule next poll
        // Removed debug console.warn for could not paint
        scheduleNextSongFetch(currentPollInterval());
        return;
      }
      scheduleNextSongFetch(currentPollInterval());
    })
    .catch((err) => {
      // Ignore controlled early-exit when 304 was handled
      if (err && err._skip) return;
      // On network/API errors, back off a bit
      const backoff = Math.min(currentPollInterval() * 2, 300000); // cap at 5 min
      scheduleNextSongFetch(backoff);
      // Removed debug console.warn for error/backoff
    });
}





function getInfoProg() {
  fetch("https://beatdigital.com.mx/wp-json/wp/v2/posts?_embed&per_page=100&categories=515&_fields[]=jetpack_featured_media_url&_fields[]=acf&_fields[]=content")
    .then((res) => {
      if (!res.ok) {
        throw new Error
          ('HTTP error! Status: ${res.status}');
      }
      return res.json();
    })
    .then((data) => {
      //console.log(data);
      const fecha = new Date();
      const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const dia = dias[fecha.getDay()];
      const hora = dayjs(fecha).format('HH:mm:ss');
      //console.log(hora);
      let siguientePrograma = null;
      data.map(function (prog, i, el) {
        if (prog.acf[dia] === true) {
          var h_i;
          if (prog.acf.hora_fin >= hora && prog.acf.hora_inicio <= hora) {
            $('.banner-prog img').attr('src', prog.jetpack_featured_media_url);
            $('.envivo-prog').html(prog.acf.programa);
            $('.envivo-now').html(prog.acf.hora_inicio + ' - ' + prog.acf.hora_fin);
            $('.envivo-prog-tab').html(prog.acf.programa);
            $('.envivo-desc').html(prog.content.rendered);
          }
          if (prog.acf.hora_inicio > hora) {
            if (!siguientePrograma || prog.acf.hora_inicio < siguientePrograma.acf.hora_inicio) {
              siguientePrograma = prog;
            }
          }
        }
      });
      if (siguientePrograma) {
        $('.envivo-next').html(siguientePrograma.acf.hora_inicio + ' - ' + siguientePrograma.acf.hora_fin);
        $('.envivo-prog-next-tab').html(siguientePrograma.acf.programa);
      }
    });
}




const radioActive = function () {
  $('#player-inner').addClass('active');
  $('#player-v-podcast').removeClass('active');
  $('#player-v-video').removeClass('active');
  $('.player-float').removeClass('hide');
}

const podcastActive = function () {
  //transitionPlayer();
  $('#player-inner').removeClass('active');
  $('#player-v-podcast').addClass('active');
  $('#player-v-video').removeClass('active');
  $('.player-float').addClass('hide');
  $('.player-float').removeClass('active');
}

const videoActive = function () {
  $('#player-inner').removeClass('active');
  $('#player-v-podcast').removeClass('active');
  $('#player-v-video').addClass('active');
}

const radioStop = function () {
  transitionPlayer();
  streaming.stop();
  $('#player').attr('data-status', 'init');
  $('#player-inner').removeClass('active');
}

const initPlayer = function () {
  transitionPlayer();
  $('#player-v-podcast').removeClass('active');
  $('#player-v-video').removeClass('active');
  $('.player-float').removeClass('hide');
  $('#radiobutton').removeClass('playerplaying');
  $('.player-float').removeClass('hide');
  $('.player-float').addClass('active');
}

const transitionPlayer = function () {
  $('#radiobutton').width('0px');
  setTimeout(function () {
    $('#radiobutton').width('250px');
  }, 500);
}


const playerstatus = function () {
  var state = $('#player').attr('data-status');
  return state;
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
    //console.log('start');                               
    start();
    $('#player').attr('data-status', 'radio-playing');
    radioActive();
  } else if (local_status == 'LIVE_STOP') {
    //console.log('else play');
    play();
  }
  else if (local_status == 'LIVE_PLAYING' || local_status == 'GETTING_STATION_INFORMATION' || local_status == 'LIVE_CONNECTING' || local_status == 'LIVE_BUFFERING') {
    radioStop();
  }
};




$('#big-play').on('click', function () {
  playstopRadio();
});


$('#return-live').on('click', function () {
  playstopRadio();
});


/* NAVIGATION */

document.addEventListener('astro:before-preparation', ev => {
  //  console.log('insert spin');    
  document.querySelector('main').classList.add('loading');
  document.querySelector('.preloader').classList.add('showpreloader');
});


document.addEventListener('astro:page-load', ev => {
  // console.log('pageload');

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
      opacity: 0.15, // Default value for inactive opacity
    }
    const PROXIMITY = 10
    const UPDATE = (event) => {
      // get the angle based on the center point of the card and pointer position
      for (const CARD of CARDS) {
        // Check the card against the proximity and then start updating
        const CARD_BOUNDS = CARD.getBoundingClientRect()
        // Get distance between pointer and outerbounds of card
        if (
          event?.x > CARD_BOUNDS.left - CONFIG.proximity &&
          event?.x < CARD_BOUNDS.left + CARD_BOUNDS.width + CONFIG.proximity &&
          event?.y > CARD_BOUNDS.top - CONFIG.proximity &&
          event?.y < CARD_BOUNDS.top + CARD_BOUNDS.height + CONFIG.proximity) {
          // If within proximity set the active opacity
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
    $('.card .glows').css('display', 'none');
    $('.card').find('.glows').removeClass('glows');


  } else {
    console.log('Unknown');
  }




  /* efectos */
  /* 
  (function($){
      $(document).ready(function(){
      
          const fullheight = document.body.scrollHeight - window.innerHeight;
          const range = fullheight/5;
          const range2 = range * 2;
          const range3 = range * 3;
          const range4 = range * 4;
          const range5 = range * 5;

          const header = $('header');
          
          window.addEventListener('scroll', function(e){
             // console.log(window.scrollY );
              if( window.scrollY > 0 && window.scrollY <= range ){                    
                  document.styleSheets[1].addRule('body::before','filter: hue-rotate(0deg) blur(5px)');
                  document.styleSheets[1].addRule('body::before','transition: filter 0.5s ease-in-out;');
              }
              
              if( window.scrollY > range && window.scrollY <= range2 ){                    
                  document.styleSheets[1].addRule('body::before','filter: hue-rotate(90deg) blur(5px)');
                  document.styleSheets[1].addRule('body::before','transition: filter 0.5s ease-in-out;');
              }

              if( window.scrollY > range2 && window.scrollY <= range3 ){                    
                  document.styleSheets[1].addRule('body::before','filter: hue-rotate(180deg) blur(5px)');
                  document.styleSheets[1].addRule('body::before','transition: filter 0.5s ease-in-out;');
              }

              if( window.scrollY > range3 && window.scrollY <= range4 ){
                  document.styleSheets[1].addRule('body::before','filter: hue-rotate(270deg) blur(5px)');
                  document.styleSheets[1].addRule('body::before','transition: filter 0.5s ease-in-out;');
              }

              if( window.scrollY > range4 ){                    
                  document.styleSheets[1].addRule('body::before','filter: hue-rotate(0deg) blur(5px)');
                  document.styleSheets[1].addRule('body::before','transition: filter 0.5s ease-in-out;');
              }



              if (header.hasClass('is-pinned') ){
                  header.addClass('compress');
                  $('header .logo').addClass('compress-logo');
              }
              if($(document).scrollTop() <= 1){
                  header.css('position','sticky');
                  header.removeClass('compress');
                  $('header .logo').removeClass('compress-logo');
              }
          });
      });
  })(jQuery);*/

  /* publicidad google refresh*/
  googletag.pubads().refresh();

  /* =======COMSCORE*/
  var ts = Math.round((new Date()).getTime() / 1000 * Math.random() * 10);
  // cowensole.log(ts);
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

  $('.like').on('click', function () {
    console.log('like');
    $(this).find('svg').css('fill', '#d6d8d7');
  });

  if (secenvivo) {
    console.log('envivo');
    getInfoProg();
    setInterval(getInfoProg, 300000);
    $('#radiobutton').addClass('en-vivo');
    console.log(local_status);



    if (local_status == null || local_status == 'undefined' || local_status == '' || local_status == 'LIVE_STOP') {
      console.log('stat ' + local_status);
      playstopRadio();
      //autoplay();            
    }
    //console.log( $('.logo-player img'));
    $('.logo-player img').attr('src', '/img/logo-beat.png');
    $('#big-play').removeClass('border-4');

  } else {
    $('#radiobutton').removeClass('en-vivo');
    $('#big-play').addClass('border-4');
    $('.logo-player img').attr('src', '/img/beat-digital-logo.png');
  }

  const secprogram = document.getElementById('programacion');

  if (secchome) {
    var elem = document.querySelector('.carousel-main');
    var flkty = new Flickity(elem, {
      // options
      cellAlign: 'right',
      prevNextButtons: true,
      //    autoPlay: 5000,
      pageDots: false,
      pauseAutoPlayOnHover: true,
      freeScroll: true,
      wrapAround: true
    });
    flkty.select(2);
    flkty.reloadCells();



    var elembuenfin = document.querySelector('.carousel-buenfin');
    var flktybuenfin = new Flickity(elembuenfin, {
      // options
      cellAlign: 'right',
      prevNextButtons: true,
      //    autoPlay: 5000,
      pageDots: false,
      pauseAutoPlayOnHover: true,
      freeScroll: true,
      wrapAround: true

    });

  }



  if (secprogram || secchome) {
    var elempod = document.querySelector('.main-carousel');
    var flktypod = new Flickity(elempod, {
      contain: true,
      lazyLoad: 1,
      wrapAround: true,
      cellAlign: 'center',
      pageDots: false,
      autoPlay: 5000,
    });
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


  $('.audiopod').each(function () {
    $(this).on('click', function () {
      const getstatus = playerstatus();
      const podactive = $(this).find('.play-pause-podcast');
      const podcaststatus = podactive.attr('data-podcast-status');
      const containerpodcast = document.getElementById('iframepodcast');

      transitionPlayer();
      podcastActive();
      setTimeout(function () {
        $('#radiobutton').addClass('playerplaying');
      }, 600);


      if (getstatus == 'radio-playing') {
        radioStop();
      }

      podactive.html('<img class="loading-gif" src="https://storage.googleapis.com/nrm-web/oye/recursos/loading-normal.gif" />');

      $('.close-podcast').on('click', function () {
        initPlayer();
        const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
        const ply = new playerjs.Player(playerpodcast);
        ply.on('ready', () => {
          ply.pause();
          podactive.attr('data-podcast-status', 'ready');
        });
        $('.audiopod').each(function () {
          $('.audiopod').find('.play-pause-podcast').html(buttonPodcastPlay);
          $('.audiopod').find('.play-pause-podcast').attr('data-podcast-status', 'ready');
        });

      });

      if (getstatus == 'podcast-playing') {

        const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
        const ply = new playerjs.Player(playerpodcast);
        ply.on('ready', () => {
          ply.pause();
          podactive.attr('data-podcast-status', 'ready');
        });
        $('.audiopod').each(function () {
          $('.audiopod').find('.play-pause-podcast').html(buttonPodcastPlay);
          $('.audiopod').find('.play-pause-podcast').attr('data-podcast-status', 'ready');
        });
      }
      //console.log(podcaststatus);            
      if (podcaststatus == 'ready') {
        const ifr = $(this).find('.data-iframe').attr('data-iframe');
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
          podactive.attr('data-podcast-status', 'active');
          $('#player').attr('data-status', 'podcast-playing');
          playerpodcast.classList.add('iframestyle');
          ply.play();

          ply.on('play', () => {
            podactive.html(buttonPodcastPause);
          });

          ply.on('pause', () => {
            podactive.html(buttonPodcastPlay);
          });

        });
      }
      else if (podcaststatus == 'active') {
        const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
        const ply = new playerjs.Player(playerpodcast);
        ply.on('ready', () => {
          ply.pause();
          podactive.attr('data-podcast-status', 'ready');
        });

      }

    });
  });

  $('.audiopod-rebels').each(function () {
    $(this).on('click', function () {
      const getstatus = playerstatus();
      const podactive = $(this).find('.play-pause-podcast');
      const podcaststatus = podactive.attr('data-podcast-status');
      const containerpodcast = document.getElementById('iframepodcast');

      transitionPlayer();
      podcastActive();
      setTimeout(function () {
        $('#radiobutton').addClass('playerplaying');
      }, 600);


      if (getstatus == 'radio-playing') {
        radioStop();
      }

      podactive.html('<img class="loading-gif" src="https://storage.googleapis.com/nrm-web/oye/recursos/loading-normal.gif" />');

      $('.close-podcast').on('click', function () {
        initPlayer();
        const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
        const ply = new playerjs.Player(playerpodcast);
        ply.on('ready', () => {
          ply.pause();
          podactive.attr('data-podcast-status', 'ready');
        });
        $('.audiopod-rebels').each(function () {
          $('.audiopod-rebels').find('.play-pause-podcast').html(buttonPodcastPlayRebels);
          $('.audiopod-rebels').find('.play-pause-podcast').attr('data-podcast-status', 'ready');
        });

      });

      if (getstatus == 'podcast-playing') {

        const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
        const ply = new playerjs.Player(playerpodcast);
        ply.on('ready', () => {
          ply.pause();
          podactive.attr('data-podcast-status', 'ready');
        });
        $('.audiopod-rebels').each(function () {
          $('.audiopod-rebels').find('.play-pause-podcast').html(buttonPodcastPlayRebels);
          $('.audiopod-rebels').find('.play-pause-podcast').attr('data-podcast-status', 'ready');
        });
      }
      //console.log(podcaststatus);            
      if (podcaststatus == 'ready') {
        const ifr = $(this).find('.data-iframe').attr('data-iframe');
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
          podactive.attr('data-podcast-status', 'active');
          $('#player').attr('data-status', 'podcast-playing');
          playerpodcast.classList.add('iframestyle');
          ply.play();

          ply.on('play', () => {
            podactive.html(buttonPodcastPauseRebels);
          });

          ply.on('pause', () => {
            podactive.html(buttonPodcastPlayRebels);
          });

        });
      }
      else if (podcaststatus == 'active') {
        const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
        const ply = new playerjs.Player(playerpodcast);
        ply.on('ready', () => {
          ply.pause();
          podactive.attr('data-podcast-status', 'ready');
        });

      }

    });
  });

  $('.wp-block-image').each(function () {
    const datasrc = $(this).find('img').attr('data-src');
    $(this).find('img').attr('src', datasrc);
  });




  const containvideo = document.getElementById('content-w-video');
  if (containvideo) {
    console.log(navigator.userAgent);
    if (navigator.userAgent.indexOf("iPhone") != -1) {

      $('.wp-block-embed-youtube .wp-block-embed__wrapper iframe').each(function (t, el) {
        $(this).on('click', function () {
          const getstatus = playerstatus();
          if (getstatus == 'radio-playing') {
            radioStop();
            //hidebarra();
            $('#player').attr('data-status', 'video-playing');
          }
        });

      });

    } else {
      $('.wp-block-embed-youtube .wp-block-embed__wrapper').each(function () {
        console.log($(this).find('iframe'));
        const plyr = new Plyr($(this).find('iframe').parent(), {
          debug: true,
          controls: [
            'play-large', // The large play button in the center
            'restart', // Restart playback
            'rewind', // Rewind by the seek time (default 10 seconds)
            'play', // Play/pause playback
            'fast-forward', // Fast forward by the seek time (default 10 seconds)
            'progress', // The progress bar and scrubber for playback and buffering
            'current-time', // The current time of playback
            'duration', // The full duration of the media
            'mute', // Toggle mute
            'volume', // Volume control
            'captions', // Toggle captions
            'settings', // Settings menu
            'pip', // Picture-in-picture (currently Safari only)
            'airplay', // Airplay (currently Safari only)
            'download', // Show a download button with a link to either the current source or a custom URL you specify in your options
            'fullscreen',
          ],
          playsinline: true

        });
        //console.log(plyr);
        plyr.on('playing', function () {
          const getstatus = playerstatus();
          if (getstatus == 'radio-playing') {
            radioStop();
            //hidebarra();
            $('#player').attr('data-status', 'video-playing');
          }
        });

        $('#radiobutton').on('click', function () {
          plyr.pause();
        });
      });
    }


    /*voto*/
    $('.voto-pop').each(function () {
      $(this).on('click', function () {
        console.log($(this).attr('data-voto-id'));
        const id = $(this).attr('data-voto-id');
        const params = {
          "item_id": id,
          "user_id": 15,
          "type": "post",
          "user_ip": "0.0.0.0",
          "status": "like"
        };

        const Rparamas = {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer GoW1bJVNjV3SCoUfVblUJs6ddelYSrGmmadoZglqcWrFELxbvrksHfsIOKeYZcgFN0jKNFtpiJEB7YN8rwUsLONosH06pWU1UZ2zIL10n0kUM26ufABMlqyh',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(params)
        };

        fetch('https://beatdigital.com.mx/wp-json/wp-ulike-pro/v1/vote/', Rparamas)
          .then((res) => {
            if (!res.ok) {
              throw new Error
                ('HTTP error! Status: ${res.status}');
            }
            return res.json();
          })
          .then((data) => {
            console.log(data);
            $(this).addClass('voted');
            $(this).find('svg').attr('fill', 'white');
            Toastify({
              text: "Gracias por tu voto",
              className: "info",
              style: {
                background: "linear-gradient(to right, #ec4899, #a855f7)",
                'border-radius': '6px',
                'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)'
              },
              offset: {
                x: '10rem',
                y: '20rem'
              }
            }).showToast();
          });

      });
    });


  }


  // === [/VOTOS] ===
  $(document).off('click.vote_topten').on('click.vote_topten', '.like-topten', function (e) {
    console.log('like topten');
    e.preventDefault();
    const artist = $(this).data('artist') || '';
    const cancion = $(this).data('song') || '';
    const $btn = $(this);
    registerVote('TopTen', artist, cancion, $btn)
      .then(() => {
        // Hook opcional: aquí podrías disparar un toast/analytics
      })
      .catch(() => {
        // Manejo ya se hizo con logs; deja el catch vacío para no romper UX
      });
  });

  $(document).off('click.vote_lanzamientos').on('click.vote_lanzamientos', '.like-lanzamientos', function (e) {
    e.preventDefault();
    const artist = $(this).data('artist') || '';
    const cancion = $(this).data('song') || '';
    const $btn = $(this);
    registerVote('Lanzamientos', artist, cancion, $btn)
      .then(() => {
        // Hook opcional: aquí podrías disparar un toast/analytics
      })
      .catch(() => {
        // Manejo ya se hizo con logs; deja el catch vacío para no romper UX
      });
  });

  $(document).off('click.vote_tracks2025').on('click.vote_tracks2025', '.like-tracks2025', function (e) {
    e.preventDefault();
    const artist = $(this).data('artist') || '';
    const cancion = $(this).data('song') || '';
    const $btn = $(this);
    registerVote('Tracks2025', artist, cancion, $btn)
      .then(() => {
        // Hook opcional: aquí podrías disparar un toast/analytics
      })
      .catch(() => {
        // Manejo ya se hizo con logs; deja el catch vacío para no romper UX
      });
  });



});
