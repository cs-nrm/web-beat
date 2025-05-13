var streaming;
var local_status;
const buttonPause = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /></svg>';
const buttonPlay = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play-filled" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" stroke-width="0" fill="currentColor" /></svg>';
const bigButtonPause = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause" width="35" height="35" viewBox="0 0 24 24" stroke-width="1.5" stroke="#000" fill="#000" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /></svg>';
const bigButtonPlay = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play" width="35" height="35" viewBox="0 0 24 24" stroke-width="1.5" stroke="#000" fill="#000" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 4v16l13 -8z" /></svg>';
const buttongLoading = '<img width="40" height="40" src="https://storage.googleapis.com/nrm-web/oye/recursos/loading-normal.gif" style="padding:5px;"/>';
const buttonPodcastPlay = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play" width="80" height="80" viewBox="0 0 24 24" stroke-width="2" stroke="#FFAA1F" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 4v16l13 -8z" /></svg>';
const buttonPodcastPause = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause" width="80" height="80" viewBox="0 0 24 24" stroke-width="1.5" stroke="#FFAA1F" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /></svg>';
var volume;
var artist;
var cancion;
var hora;
const radioButton = document.getElementById('radiobutton');
const player = document.getElementById('player');
const secchome = document.getElementById('home');
var coverbase = "https://ws.audioscrobbler.com/2.0/?method=track.getInfo&api_key=0aa2713d85e04243944924876ba71f05&format=json";


//function initPlayer(){
    function initPlayerSDK(){
        var tdPlayerConfig = {
             coreModules: [{
               id: 'MediaPlayer',
               playerId: 'td_container' ,
               audioAdaptive: false,
               plugins: [ {id:"vastAd"}]
             }],
             // The callbacks are defined in your source code.
             playerReady: onPlayerReady,
             moduleError: onModuleError,
             audioAdaptive: true,
             analytics: {
                active: true,
                debug: false,
                appInstallerId: 'beatpag',            
                trackingId: 'UA-63005013-1',
                trackingEvents: [ 'play', 'stop', 'pause', 'resume', 'all' ],
                sampleRate: 100,     
                category: 'Reproduccion Radio Pag' 
             }
            };
        // The call to loadModules() as been removed.
        streaming = new TDSdk( tdPlayerConfig );
        streaming.addEventListener( 'stream-status', getStatus );
        streaming.addEventListener( 'ad-playback-complete', completeAd );
        streaming.addEventListener( 'ad-playback-start', startAd );
        streaming.addEventListener( 'ad-playback-error', errorAd );
        streaming.addEventListener( 'track-cue-point', onTrackCuePoint );
        streaming.addEventListener( 'list-loaded', onListLoaded );
        streaming.addEventListener( 'list-empty', onListEmpty);
        streaming.addEventListener( 'nowplaying-api-error', onNowPlayingApiError);
        streaming.addEventListener( 'ad-break-cue-point', adBreakCuePoint);
        
      }
    
     function getStatus(s){
        local_status = s.data.code;
        const secchome = document.getElementById('home');        
         //console.log(local_status);
         if( local_status == 'GETTING_STATION_INFORMATION' || local_status == 'LIVE_CONNECTING' || local_status == 'LIVE_BUFFERING' ){
            document.getElementById('loading').classList.add('show');
            document.getElementById('loading').classList.remove('hide');
            document.getElementById('play-pause').classList.remove('show');
            document.getElementById('play-pause').classList.add('hide'); 
            document.getElementById('big-play').innerHTML = buttongLoading;    
            
         }
         if (local_status == 'LIVE_PLAYING'){                        
            document.getElementById('play-pause').innerHTML = buttonPause;
            document.getElementById('loading').classList.remove('show');
            document.getElementById('loading').classList.add('hide');
            document.getElementById('play-pause').classList.add('show');
            document.getElementById('play-pause').classList.remove('hide'); 
            document.getElementById('big-play').innerHTML = bigButtonPause; 
           // $('.text-player').html('');
            //$('.text-player').attr('id','infoMusic');
            $('.text-player').html('<div style="font-weight:bold;">Estas escuchando...</div><div id="infoMusic" style="line-height:11px; font-size:12px;"></div>');
            $('.text-player').addClass('playing');
            $('#radiobutton').addClass('playerplaying');
            //getInfoMusic();
            
         }
         if(local_status == 'LIVE_STOP' || local_status == 'LIVE_PAUSE') {
            document.getElementById('loading').classList.remove('show');
            document.getElementById('loading').classList.add('hide');
            document.getElementById('play-pause').classList.add('show');
            document.getElementById('play-pause').classList.remove('hide'); 
            document.getElementById('play-pause').innerHTML = buttonPlay;            
            document.getElementById('big-play').innerHTML = bigButtonPlay; 
            $('.text-player').removeClass('playing');
            $('#radiobutton').removeClass('playerplaying');
            $('.text-player').html('');
            setTimeout( function(){
                $('.text-player').html('ESCUCHA LA RADIO EN VIVO <span style="color: #df104a;    font-weight: bold;    font-size: 12px;">GRATIS</span> AHORA');             
            },1000);
                
            //$('.text-player').attr('id','');            
         }

     }
     

    function completeAd(e){                
        streaming.play({
            station:'XHSONFM',
            trackingParameters:{
            Dist: 'WebBeat'
            }
        }); 
        //$('#td_container').width('1px');
        //$('#td_container').height('1px');       
        $('#td_container').removeClass('pub_active');
        $('#full-cover').css('display','none');
      }
      
      function onTrackCuePoint( event ){
         var cueTitle = event.data.cuePoint.cueTitle;
         var artistName = event.data.cuePoint.artistName;         
         //console.log('cueTitle: ' + cueTitle);
         //console.log('cambio de cancion');
         //console.log(event.data.cuePoint);

         const codtit = cueTitle.replace('&', '%26');
         const codart = artistName.replace('&', '%26');
         document.getElementById('infoMusic').innerHTML = '<div class="current-song">' + artistName + ' / ' + cueTitle + '</div><div class="share-current"><div class="like"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="28" height="28" stroke-width="1"> <path d="M19.5 12.572l-7.5 7.428l-7.5 -7.428a5 5 0 1 1 7.5 -6.566a5 5 0 1 1 7.5 6.572"></path> </svg> </div> <div class="share-wp"><a href="https://api.whatsapp.com/send/?text=Estoy%20escuchando%20' + codtit +'%20de%20'+ codart +'%20en%20https://beta.beatdigital.mx/" target="_blank"> <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" width="28" height="28" stroke-width="1"> <path d="M13 4v4c-6.575 1.028 -9.02 6.788 -10 12c-.037 .206 5.384 -5.962 10 -6v4l8 -7l-8 -7z"></path> </svg> </div></div>';
      }

      function adBreakCuePoint( e ){
        //console.log('PAUSA COMERCIAL');
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
     }

      function startAd(e){
        //$('#td_container').width('600px');
        //$('#td_container').height('360px');
        $('#td_container').addClass('pub_active');
        $('#full-cover').css('display','block');
        document.getElementById('big-play').innerHTML = buttongLoading;    
        $('.text-player').html('<div style="font-style: italic; line-height:11px; font-weight:bold; font-size:11px;">Iniciamos después del anuncio...</div>'); 
      }
      
      var start = function(){
        //console.log('trata la pub primero');    
        streaming.playAd( 'vastAd', { url:'https://pubads.g.doubleclick.net/gampad/ads?sz=600x360&iu=/21799830913/Beat/VideoVast&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&url=[referrer_url]&description_url=[description_url]&correlator=[timestamp]' } );	        
      };


      function pause(){
        streaming.stop();
      }

      
      function play(){
        streaming.play({
            station:'XHSONFM',
            trackingParameters:{
            Dist: 'WebBeat'
            }
        });        
      }      
   

      function stop(){
        //console.log('stopped');
        streaming.stop();
      }

      function errorAd(e){        
        streaming.play({
            station:'XHSONFM',
            trackingParameters:{
            Dist: 'WebBeat'
            }
        });
        //console.log(e);
        //console.log('error ad');
        
      }
    /* Callback function called to notify that the SDK is ready to be used */
    function onPlayerReady(){                
        console.log('streaming ready');        
        document.getElementById('loading').classList.remove('show');
        document.getElementById('loading').classList.add('hide');
        document.getElementById('play-pause').classList.add('show');
        document.getElementById('play-pause').classList.remove('hide'); 
        vol = streaming.getVolume();
        //console.log(vol);

    }

  
    /* Callback function called to notify that the player configuration has an error. */
    function onConfigurationError( e ) {
        //console.log(e);
        //console.log(e.data.errors);
        //Error code : object.data.errors[0].code
        //Error message : object.data.errors[0].message
    }
    /* Callback function called to notify that a module has not been loaded properly */
    function onModuleError( object ){
        console.log(object);
        console.log(object.data.errors);
        //Error code : object.data.errors[0].code
        //Error message : object.data.errors[0].message
    }
    
    /* Callback function called to notify that an Ad-Blocker was detected */
    function onAdBlockerDetected(){
        console.log( 'AdBlockerDetected' );
    }

    initPlayerSDK();        
        volume = document.getElementById('vol');
        volume.addEventListener('input', function(){
            //console.log(volume.value);
            streaming.setVolume(volume.value);

        });

        /*function getInfoMusic(){
            fetch("https://cdn.nrm.com.mx/cdn/beat/playlist/cancion.json")
            .then((res) => {
                if (!res.ok) {
                    throw new Error
                        ('HTTP error! Status: ${res.status}');
                }
                return res.json();
            })
            .then((data) => {                
                switch( data.categoria ){
                    case 'COMERCIALES' :
                        artist = 'PAUSA COMERCIAL';
                        cancion = '';
                    break;
                    case 'DROP' :
                        artist = 'PAUSA COMERCIAL';
                        cancion = '';
                    break;
                    case 'NUEVA PRODUCCION' :
                        artist = 'PAUSA COMERCIAL';
                        cancion = '';
                    break;
                    case 'ELEMENTOS' :
                        artist = 'PAUSA COMERCIAL';
                        cancion = '';
                    break;
                    
                    
                    case 'RANDOM':
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    case 'MUSICA-DANCE':
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real; 
                    break;
                    case 'MUSICA-HOUSE':
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    case 'MUSICA-DANCE':
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    case 'MÚSICA-DREAM':
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    case 'MUSICA-ELECTRONICA':
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    case 'MUSICA-PROGRESIVO':
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    case 'MUSICA-RETRO':
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    case 'MUSICA-RANDOM ANDRE':
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    case 'LADO F':
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    default:
                        artist = data.dj;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    

                }                 
                if (cancion == ''){
                    document.getElementById('infoMusic').innerHTML = artist;
                }else{
                    document.getElementById('infoMusic').innerHTML = artist + ' / ' + cancion;
                }
            })
           // console.log('repetido');   
        }
        getInfoMusic();
        setInterval( getInfoMusic, 30000);*/
        

        
        function getInfoProg(){
            //fetch("https://beatdigital.mx/wp-json/wp/v2/posts?_embed&per_page=30&categories=3312&_fields[]=acf")
            fetch("https://contenido.beatdigital.mx/wp-json/wp/v2/posts?_embed&per_page=100&categories=515&_fields[]=jetpack_featured_media_url&_fields[]=acf")            
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
                //const hora = fecha.getHours() + ':' + fecha.getUTCMinutes() + ':' + fecha.getSeconds();
                const dias = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
                const dia = dias[fecha.getDay()];                
                const hora = dayjs(fecha).format('HH:mm:ss');
                //console.log(hora);
                let siguientePrograma = null;
                data.map(function(prog,i,el){                    
                    if(prog.acf[dia] === true){
                        var h_i;
                        if( prog.acf.hora_fin >= hora &&  prog.acf.hora_inicio <= hora){
                           // console.log(prog.acf.hora_inicio);
                            /*console.log(prog.acf.hora_inicio);
                            console.log(prog.acf.hora_fin);
                            console.log(prog.acf.programa);*/
                            
                            $('.banner-prog img').attr('src', prog.jetpack_featured_media_url);
                            $('.envivo-prog').html(prog.acf.programa);
                            $('.envivo-now').html( prog.acf.hora_inicio + ' - ' + prog.acf.hora_fin);
                            $('.envivo-prog-tab').html(prog.acf.programa);                            

                        }

                        if (prog.acf.hora_inicio > hora) {
                            if (!siguientePrograma || prog.acf.hora_inicio < siguientePrograma.acf.hora_inicio) {
                                siguientePrograma = prog;
                            }
                        }
                        

                    }

                });   
                if (siguientePrograma) {
                    //console.log("Siguiente programa:", siguientePrograma.acf.programa);
                    $('.envivo-next').html(siguientePrograma.acf.hora_inicio + ' - ' + siguientePrograma.acf.hora_fin);
                    $('.envivo-prog-next-tab').html(siguientePrograma.acf.programa);
                }                                             
            });
           // console.log('repetido');   
        }
        
        setTimeout(getInfoProg, 20000);
        setInterval( getInfoProg, 300000);       
        
/* abrir barra*/
/*const openbarra = function(){
    player.classList.remove('h-0');
    player.classList.add('h-16');
    player.classList.add('border-4');    
}*/
/* cerrar barra*/
/*const hidebarra = function(){
    player.classList.remove('h-16');
    player.classList.add('h-0');
    player.classList.remove('border-4');                
}*/
/* cerrar y abrir barra*/
/*const transitionBarra = function(){    
    hidebarra();
    setTimeout( function(){        
        openbarra();
    }, 500);
}*/


const radioActive = function(){
    $('#player-inner').addClass('active');
    $('#player-v-podcast').removeClass('active');
    $('#player-v-video').removeClass('active');
    $('.player-float').removeClass('hide');
}

const podcastActive = function(){
    //transitionPlayer();
    $('#player-inner').removeClass('active');
    $('#player-v-podcast').addClass('active');
    $('#player-v-video').removeClass('active');
    $('.player-float').addClass('hide');
    $('.player-float').removeClass('active');
    //$('#radiobutton').addClass('playerplaying'); 
}

const videoActive = function(){
    $('#player-inner').removeClass('active');
    $('#player-v-podcast').removeClass('active');
    $('#player-v-video').addClass('active');
}

const radioStop = function(){
        transitionPlayer();
        streaming.stop();
        $('#player').attr('data-status','init');                
        //hidebarra();
        $('#player-inner').removeClass('active');
}

const initPlayer = function(){
    transitionPlayer();
    $('#player-v-podcast').removeClass('active');
    $('#player-v-video').removeClass('active');
    $('.player-float').removeClass('hide');
    $('#radiobutton').removeClass('playerplaying'); 
    $('.player-float').removeClass('hide');
    $('.player-float').addClass('active');    
}

const transitionPlayer = function(){
    $('#radiobutton').width('0px');
    setTimeout( function(){
        $('#radiobutton').width('250px');
    }, 500);
}


const playerstatus = function(){
    var state  = $('#player').attr('data-status');
    return state;
};

const playstopRadio = function(){
            transitionPlayer();
            //console.log(local_status);
            const getplayingstatus = playerstatus();
            if(getplayingstatus == 'podcast-playing'){
                //transitionBarra();
                const containerpodcast  = document.getElementById('iframepodcast');
                containerpodcast.innerHTML ='';                
            }                
                                               
            if(getplayingstatus == 'video-playing'){
                
            }

            if( local_status == null || local_status == 'undefined' || local_status == '' || local_status == 'LIVE_STOP' ){                                
                //console.log('aqui debe iniciar');
                start();     
                $('#player').attr('data-status','radio-playing');
                //transitionBarra(); 
                radioActive();   
            }else if( local_status == 'LIVE_PLAYING' || local_status == 'GETTING_STATION_INFORMATION' || local_status == 'LIVE_CONNECTING' || local_status == 'LIVE_BUFFERING'){                
                radioStop();
            }
};


$('#big-play').on('click',function(){    
        //console.log('click en radiobutton');
        playstopRadio();      
});


$('#return-live').on('click',function(){    
       playstopRadio();    
});

/*$('.radio-link').on('click',function(){    
       playstopRadio();    
});*/



/*$('#play-pause').on('click', function(){
    playstopRadio();
});*/



  

/* NAVIGATION */ 
document.addEventListener('astro:before-preparation', ev => {
  //  console.log('insert spin');    
    document.querySelector('main').classList.add('loading');    
    document.querySelector('.preloader').classList.add('showpreloader');
});


document.addEventListener('astro:page-load', ev => {
   // console.log('pageload');

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


    /* efectos */ 
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
    })(jQuery);


   const getplayingstatus = playerstatus();
    document.querySelector('main').classList.remove('loading');    
    document.querySelector('.preloader').classList.remove('showpreloader');
    
    const secchome = document.getElementById('home');
    const secenvivo = document.getElementById('envivo');

    if ( secenvivo ){   
        //console.log('envivo');
        getInfoProg();
        $('#radiobutton').addClass('en-vivo');
        //console.log(local_status);

        if( local_status == null || local_status == 'undefined' || local_status == '' || local_status == 'LIVE_STOP' ){  
            playstopRadio();
        }        
        //console.log( $('.logo-player img'));
        $('.logo-player img').attr('src','/img/logo-beat.png');
        $('#big-play').removeClass('border-4');

    }else{
        $('#radiobutton').removeClass('en-vivo');
        $('#big-play').addClass('border-4');
        $('.logo-player img').attr('src','/img/beat-digital-logo.png');
    }

    
    if ( secchome ){        
        //console.log(getplayingstatus);
        /*if( getplayingstatus == 'radio-playing'){
             document.getElementById('big-play').innerHTML = bigButtonPause; 
        }*/

                var elem = document.querySelector('.carousel-main');
        var flkty = new Flickity( elem, {
            // options
            cellAlign: 'center',
            prevNextButtons: true,
        //    autoPlay: 5000,
            pageDots: false,
            pauseAutoPlayOnHover: true,
            freeScroll: true,
            wrapAround: true
        });
        flkty.select(2);
        flkty.reloadCells();   

       /* var elemnav = document.querySelector('.carousel-nav');
        var flktynav = new Flickity( elemnav, {
            // options
            cellAlign: 'center',
            contain: true,
            asNavFor: '.carousel-main',
            prevNextButtons: false,
            pageDots: false, 
            pauseAutoPlayOnHover: true
        }); 
        */

        var elempod = document.querySelector('.main-carousel');
        var flktypod = new Flickity( elempod, {
            contain: true,
            lazyLoad: 1, 
            wrapAround: true, 
            cellAlign: 'center',
            pageDots: false
            //autoPlay: true
        });


    }
    
    const imagenNota = document.getElementById("imagen-nota");
    if( imagenNota ){
        const imgNotaOriginal = imagenNota.getElementsByTagName('img');
        const imgNotaOriginal2 = imgNotaOriginal[0].getAttribute('src');
        imagenNota.style.backgroundImage = "url("+imgNotaOriginal2+")";
    }
    
    
    if( getplayingstatus == 'podcast-playing'){
        const containerpodcast  = document.getElementById('iframepodcast');
        //containerpodcast.innerHTML ='';
        initPlayer();
        //hidebarra();
    }

   /* $('#big-play').on('click', function(){
        playstopRadio();
    });*/
    
    $('.audiopod').each(function(){   
        $(this).on('click',function(){
            const getstatus = playerstatus();
            const podactive = $(this).find('.play-pause-podcast');
            const podcaststatus = podactive.attr('data-podcast-status');
            const containerpodcast  = document.getElementById('iframepodcast');
            
            transitionPlayer();
            podcastActive();
            setTimeout( function(){
                $('#radiobutton').addClass('playerplaying'); 
            },600);
            
            
            if (getstatus == 'radio-playing'){
                radioStop();                
            }            
                                                
            podactive.html('<img class="loading-gif" src="https://storage.googleapis.com/nrm-web/oye/recursos/loading-normal.gif" />');
            
            $('.close-podcast').on('click',function(){
                initPlayer();
                const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];                
                const ply =  new playerjs.Player(playerpodcast);
                ply.on('ready', ()=> {
                    ply.pause();
                    podactive.attr('data-podcast-status','ready');
                });
                $('.audiopod').each(function(){
                    $('.audiopod').find('.play-pause-podcast').html(buttonPodcastPlay);
                    $('.audiopod').find('.play-pause-podcast').attr('data-podcast-status','ready');
                });
                
            });
            
            if (getstatus == 'podcast-playing'){
                
                const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];                
                const ply =  new playerjs.Player(playerpodcast);
                ply.on('ready', ()=> {
                    ply.pause();
                    podactive.attr('data-podcast-status','ready');
                });
                $('.audiopod').each(function(){
                    $('.audiopod').find('.play-pause-podcast').html(buttonPodcastPlay);
                    $('.audiopod').find('.play-pause-podcast').attr('data-podcast-status','ready');
                });
            }
            //console.log(podcaststatus);            
            if(podcaststatus == 'ready'){
                //transitionBarra();
                const ifr = $(this).find('.data-iframe').attr('data-iframe');
                const ifrsrc = ifr.split('src="');
                const src = ifrsrc[1].split('"');
                //const playerpodcast = document.getElementById('playerpodcast');
                //<iframe src="https://omny.fm/shows/beat-trends/amor-de-lejos-amor-de-ya-no-aplica/embed?size=square&style=cover&image=0&description=1&download=1&playlistImages=1&playlistShare=1&share=1&subscribe=0&background=efefef&foreground=2b2b2c&highlight=e1b01c" allow="autoplay; clipboard-write" width="300" height="300" frameborder="0" title="Amor de lejos, amor de… Ya no aplica"></iframe>           
                containerpodcast.innerHTML ='';
                const playerpodcast = document.createElement('iframe');
                playerpodcast.setAttribute('src',src[0]+"?image=0&share=0&download=1&description=0&background=efefef&foreground=2b2b2c&highlight=e1b01c");
                playerpodcast.setAttribute('width','300');
                playerpodcast.setAttribute('height','190');
                playerpodcast.setAttribute('frameborder','0');
                playerpodcast.setAttribute('allow','autoplay');
                playerpodcast.setAttribute('transition:persist','');
                //console.log(playerpodcast);
                containerpodcast.appendChild(playerpodcast);            
                const ply =  new playerjs.Player(playerpodcast);
                 
                ply.on('ready', ()=> {
                    podactive.attr('data-podcast-status','active');
                    $('#player').attr('data-status','podcast-playing');
                    playerpodcast.classList.add('iframestyle');
                    ply.play(); 
                    
                    ply.on('play', ()=>{
                        podactive.html(buttonPodcastPause); 
                    });
    
                    ply.on('pause', ()=>{
                        podactive.html(buttonPodcastPlay); 
                    });
                    
                });   
            }
            else if(podcaststatus == 'active'){
                /*if( getplayingstatus == 'podcast-playing'){
                    const containerpodcast  = document.getElementById('iframepodcast');
                    containerpodcast.innerHTML ='';
                    hidebarra();
                }*/
                //containerpodcast.innerHTML = '';
                //hidebarra();                
                const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
                //console.log(playerpodcast);
                const ply =  new playerjs.Player(playerpodcast);
                ply.on('ready', ()=> {
                    ply.pause();
                    podactive.attr('data-podcast-status','ready');
                });                
                
            }

        });
    });
    
    $('.wp-block-image').each(function(){        
        const datasrc = $(this).find('img').attr('data-src');        
        $(this).find('img').attr('src',datasrc);
    });

    
        
  

    const containvideo = document.getElementById('content-w-video');
    if (containvideo){
        //console.log('sccion pop');  
        console.log(navigator.userAgent);
        if(navigator.userAgent.indexOf("iPhone") != -1){
            
        $('.wp-block-embed-youtube .wp-block-embed__wrapper iframe').each(function(t,el){
            //console.log($(this));   
            //const ele = $(this).attr('id','el-'+t);     
            $(this).on('click',function(){
                const getstatus = playerstatus();
                if( getstatus == 'radio-playing'){
                    radioStop();   
                    //hidebarra();
                    $('#player').attr('data-status','video-playing');
                }
            });            
            
        });        

        }else{                      
        $('.wp-block-embed-youtube .wp-block-embed__wrapper').each(function(){
            console.log($(this).find('iframe'));            
            const plyr = new Plyr($(this).find('iframe').parent(),{
                debug:true,
                controls:[
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
            plyr.on('playing',function(){
                const getstatus = playerstatus();
                if( getstatus == 'radio-playing'){
                    radioStop();   
                    //hidebarra();
                    $('#player').attr('data-status','video-playing');
                }
            });
            
            $('#radiobutton').on('click', function(){
                plyr.pause();
            });     
        }); 
        }
        
        
        /*voto*/
        $('.voto-pop').each(function(){
            $(this).on('click', function(){
                console.log($(this).attr('data-voto-id'));
                const id = $(this).attr('data-voto-id');                                
                /*const params = {
                    "search": id, 
                    "per_page": 1000                    
                };*/
                const params = {
                    "item_id":id,
                    "user_id":15,
                    "type":"post",
                    "user_ip":"0.0.0.0",
                    "status":"like"
                };
                
                const Rparamas = {
                    method: 'POST',
                    headers: {
                        'Authorization': 'Bearer GoW1bJVNjV3SCoUfVblUJs6ddelYSrGmmadoZglqcWrFELxbvrksHfsIOKeYZcgFN0jKNFtpiJEB7YN8rwUsLONosH06pWU1UZ2zIL10n0kUM26ufABMlqyh',
                        'Content-Type': 'application/json'
                    },                    
                    body: JSON.stringify( params )
                };
                    
                fetch('https://contenido.beatdigital.mx/wp-json/wp-ulike-pro/v1/vote/', Rparamas)
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
                        $(this).find('svg').attr('fill','white');
                        Toastify({
                            text: "Gracias por tu voto",
                            className: "info",
                            style: {
                              background: "linear-gradient(to right, #ec4899, #a855f7)",
                              'border-radius': '6px',
                              'box-shadow':'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)' 
                            },
                            offset:{
                                x:'10rem',
                                y:'20rem'
                            }
                        }).showToast();
                });

            });            
        });
        
        /*------------------- */
        
    } 

        
       
});

