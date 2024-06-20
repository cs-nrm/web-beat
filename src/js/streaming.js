var streaming;
var local_status;
const buttonPause = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /></svg>';
const buttonPlay = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play-filled" width="44" height="44" viewBox="0 0 24 24" stroke-width="1.5" stroke="#2c3e50" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 4v16a1 1 0 0 0 1.524 .852l13 -8a1 1 0 0 0 0 -1.704l-13 -8a1 1 0 0 0 -1.524 .852z" stroke-width="0" fill="currentColor" /></svg>';
const bigButtonPause = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-pause" width="65" height="65" viewBox="0 0 24 24" stroke-width="1.5" stroke="#fff" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /><path d="M14 5m0 1a1 1 0 0 1 1 -1h2a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-2a1 1 0 0 1 -1 -1z" /></svg>';
const bigButtonPlay = '<svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-player-play" width="65" height="65" viewBox="0 0 24 24" stroke-width="1.5" stroke="#fff" fill="none" stroke-linecap="round" stroke-linejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 4v16l13 -8z" /></svg>';
const buttongLoading = '<img width="60" height="60" src="https://storage.googleapis.com/nrm-web/oye/recursos/loading-normal.gif" style="padding:20px;"/>';
var volume;
var artist;
var cancion;
var hora;
const radioButton = document.getElementById('radiobutton');
const player = document.getElementById('player');
const secchome = document.getElementById('home');



//function initPlayer(){
    function initPlayerSDK(){
        console.log( 'TD Player SDK is ready' );
        //Player SDK is ready to be used, this is where you can instantiate a new TDSdk instance.
        //Player configuration: list of modules        
        var tdPlayerConfig = {
        coreModules: [{
                id: 'MediaPlayer',
                playerId: 'td_container',
                audioAdaptive: true,
                plugins: [ {id:"vastAd"}]
            }],
            playerReady: onPlayerReady,
            configurationError: onConfigurationError,
            moduleError: onModuleError,
            adBlockerDetected: onAdBlockerDetected            
        };
        //Player instance
        streaming = new TDSdk( tdPlayerConfig );        
        streaming.addEventListener( 'stream-status', getStatus );
        streaming.addEventListener( 'ad-playback-complete', completeAd );
        streaming.addEventListener( 'ad-playback-start', startAd );
        streaming.addEventListener( 'ad-playback-error', errorAd );
       
    }
    
     function getStatus(s){
        local_status = s.data.code;
        const secchome = document.getElementById('home');        
         console.log(local_status);
         if( local_status == 'GETTING_STATION_INFORMATION' || local_status == 'LIVE_CONNECTING' || local_status == 'LIVE_BUFFERING' ){
            document.getElementById('loading').classList.add('show');
            document.getElementById('loading').classList.remove('hide');
            document.getElementById('play-pause').classList.remove('show');
            document.getElementById('play-pause').classList.add('hide'); 
            if(secchome){  document.getElementById('big-play').innerHTML = buttongLoading;    }
            
         }
         if (local_status == 'LIVE_PLAYING'){                        
            document.getElementById('play-pause').innerHTML = buttonPause;
            document.getElementById('loading').classList.remove('show');
            document.getElementById('loading').classList.add('hide');
            document.getElementById('play-pause').classList.add('show');
            document.getElementById('play-pause').classList.remove('hide'); 
            if(secchome){   document.getElementById('big-play').innerHTML = bigButtonPause; }
            
         }
         if(local_status == 'LIVE_STOP' || local_status == 'LIVE_PAUSE') {
            document.getElementById('loading').classList.remove('show');
            document.getElementById('loading').classList.add('hide');
            document.getElementById('play-pause').classList.add('show');
            document.getElementById('play-pause').classList.remove('hide'); 
            document.getElementById('play-pause').innerHTML = buttonPlay;
            
            if(secchome){ document.getElementById('big-play').innerHTML = bigButtonPlay;  }
         }

     }
     

    function completeAd(e){        
        streaming.play({
            station:'XEOYEFM',
            trackingParameters:{
            Dist: 'WebOye'
            }
        });        
      }

      function startAd(e){
        console.log(local_status);                
        streaming.playAd( 'vastAd', { url:'https://pubads.g.doubleclick.net/gampad/ads?sz=600x360&iu=/21799830913/Oye/VASTPrueba&ciu_szs=600x360&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&url=[referrer_url]&description_url=[description_url]&correlator=[timestamp]' } );
      }
      
      function pause(){
        streaming.pause();
      }

      function play(){
        streaming.play({
            station:'XEOYEFM',
            trackingParameters:{
            Dist: 'WebOye'
            }
        });        
      }

      function stop(){
        console.log('stopped');
        streaming.stop();
      }

   
      function errorAd(e){        
        streaming.play({
            station:'XEOYEFM',
            trackingParameters:{
            Dist: 'WebOye'
            }
        });
        
      }
    /* Callback function called to notify that the SDK is ready to be used */
    function onPlayerReady(){                
        console.log('streaming ready');        
        document.getElementById('loading').classList.remove('show');
        document.getElementById('loading').classList.add('hide');
        document.getElementById('play-pause').classList.add('show');
        document.getElementById('play-pause').classList.remove('hide'); 
        vol = streaming.getVolume();
        console.log(vol);

    }

  
    /* Callback function called to notify that the player configuration has an error. */
    function onConfigurationError( e ) {
        console.log(e);
        console.log(e.data.errors);
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

        function getInfoMusic(){
            fetch("https://cdn.nrm.com.mx/cdn/oye/playlist/cancion.json")
            .then((res) => {
                if (!res.ok) {
                    throw new Error
                        ('HTTP error! Status: ${res.status}');
                }
                return res.json();
            })
            .then((data) => {                
                switch( data.categoria ){
                    case 'PCRADIOS' :
                        artist = 'CORTE';
                        cancion = '';
                    break;
                    case 'OYE-DEBRAYE':
                        artist = 'EL DEBRAYE';
                        cancion = '';
                    break;
                    case 'OYE-TURNOS':
                        artist = 'EL DEBRAYE';
                        cancion = '';
                    break;                    
                    case 'OYE-CAP':
                        artist = 'CORTE';
                        cancion = '';
                    break;
                    case 'OYE-PRO':
                        artist = data.artista;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    case 'OYE-MUS':
                        artist = data.artista;
                        cancion = data.title;
                        hora = data.hora_real;
                    break;
                    default:
                        artist = data.artista;
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
        setInterval( getInfoMusic, 30000);
        

        
        function getInfoProg(){
            fetch("https://contenido.oyedigital.mx/wp-json/wp/v2/posts?_embed&per_page=30&categories=3312&_fields[]=acf")
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
                data.map(function(prog){                    
                    if(prog.acf[dia] === true){
                        if( prog.acf.hora_fin >= hora &&  prog.acf.hora_inicio <= hora){
                           // console.log(prog.acf.hora_inicio);
                            console.log(prog.acf.hora_inicio);
                            console.log(prog.acf.hora_fin);
                            console.log(prog.acf.programa);
                            console.log(prog.acf);
                            if( document.getElementById('nombreprog') ){
                                document.getElementById('nombreprog').innerHTML = prog.acf.programa;
                            }
                             
                            fetch("https://contenido.oyedigital.mx/wp-json/wp/v2/media/"+prog.acf.imagen_ahora_escuchas+"?_fields[]=link")
                            .then((rs) => {
                                if (!rs.ok) {
                                    throw new Error
                                        ('HTTP error! Status: ${res.status}');
                                }
                                return rs.json();
                            })
                            .then(function(d){
                                //console.log(d.link);
                                if(document.getElementById('imgprog')){                                    
                                    setTimeout(function(){
                                        document.getElementById('imgprog').getElementsByClassName('imgprog')[0].src = d.link;
                                    },2000);
                                }
                                
                            });                                                        
                        }
                    }

                });                                                
            });
           // console.log('repetido');   
        }
        
        //setTimeout(getInfoProg, 20000);
        setInterval( getInfoProg, 300000);       
        
/* abrir barra*/
const openbarra = function(){
    player.classList.remove('h-0');
    player.classList.add('h-16');
    player.classList.add('border-4');    
}
/* cerrar barra*/
const hidebarra = function(){
    player.classList.remove('h-16');
    player.classList.add('h-0');
    player.classList.remove('border-4');                
}
/* cerrar y abrir barra*/
const transitionBarra = function(){    
    hidebarra();
    setTimeout( function(){        
        openbarra();
    }, 500);
}

const radioActive = function(){
    $('#player-inner').addClass('active');
    $('#player-v-podcast').removeClass('active');
    $('#player-v-video').removeClass('active');
}

const podcastActive = function(){
    $('#player-inner').removeClass('active');
    $('#player-v-podcast').addClass('active');
    $('#player-v-video').removeClass('active');
}

const videoActive = function(){
    $('#player-inner').removeClass('active');
    $('#player-v-podcast').removeClass('active');
    $('#player-v-video').addClass('active');
}

const radioStop = function(){
        streaming.pause();
        $('#player').attr('data-status','init');                
        hidebarra();
        $('#player-inner').removeClass('active');
}


const playerstatus = function(){
    var state  = $('#player').attr('data-status');
    return state;
};

const playstopRadio = function(){
            console.log(local_status);
            const getplayingstatus = playerstatus();
            console.log(getplayingstatus);
            if (getplayingstatus == 'init'){
                openbarra();
            }
            
            if(getplayingstatus == 'podcast-playing'){
                transitionBarra();
                const containerpodcast  = document.getElementById('iframepodcast');
                containerpodcast.innerHTML ='';                
            }                
                                               
            if(getplayingstatus == 'video-playing'){
                
            }

            if( local_status == null || local_status == 'undefined' || local_status == '' || local_status == 'LIVE_STOP' ){                
                //streaming.playAd( 'vastAd', { url:'https://pubads.g.doubleclick.net/gampad/ads?sz=600x360&iu=/21799830913/Oye/VASTPrueba&ciu_szs=600x360&impl=s&gdfp_req=1&env=vp&output=vast&unviewed_position_start=1&url=[referrer_url]&description_url=[description_url]&correlator=[timestamp]' } );
                streaming.play({
                    station:'XEOYEFM',
                    trackingParameters:{
                    Dist: 'WebOye'
                    }
                });     

             $('#player').attr('data-status','radio-playing');
             transitionBarra(); 
             radioActive();   
            }else if( local_status == 'LIVE_PLAYING' || local_status == 'GETTING_STATION_INFORMATION' || local_status == 'LIVE_CONNECTING' || local_status == 'LIVE_BUFFERING'){                
                radioStop();
            }
};


$('#radiobutton').on('click',function(){    
        playstopRadio();      
});

$('#return-live').on('click',function(){    
       playstopRadio();    
});


$('#play-pause').on('click', function(){
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
   /*=============== SHOW MENU ===============*/
const showMenu = (toggleId, navId) =>{
    const toggle = document.getElementById(toggleId),
          nav = document.getElementById(navId);
    toggle.addEventListener('click', () =>{
        // Add show-menu class to nav menu
        nav.classList.toggle('show-menu');
        // Add show-icon to show and hide the menu icon
        toggle.classList.toggle('show-icon');
    });
 }
 
 showMenu('nav-toggle','nav-menu');

   const getplayingstatus = playerstatus();
    document.querySelector('main').classList.remove('loading');    
    document.querySelector('.preloader').classList.remove('showpreloader');
    
    const secchome = document.getElementById('home');
    if ( secchome ){
        getInfoProg();
        if( getplayingstatus == 'radio-playing'){
             document.getElementById('big-play').innerHTML = bigButtonPause; 
        }
    }
    
    const imagenNota = document.getElementById("imagen-nota");
    if( imagenNota ){
        const imgNotaOriginal = imagenNota.getElementsByTagName('img');
        const imgNotaOriginal2 = imgNotaOriginal[0].getAttribute('src');
        imagenNota.style.backgroundImage = "url("+imgNotaOriginal2+")";
    }
    
    
    if( getplayingstatus == 'podcast-playing'){
        const containerpodcast  = document.getElementById('iframepodcast');
        containerpodcast.innerHTML ='';
        hidebarra();
    }

    $('#big-play').on('click', function(){
        playstopRadio();
    });
    
    $('.audiopod').each(function(){   
        $(this).on('click',function(){
            const getstatus = playerstatus();
            const podactive = $(this).find('.play-pause-podcast');
            const podcaststatus = podactive.attr('data-podcast-status');
            const containerpodcast  = document.getElementById('iframepodcast');
            
            
            podcastActive();
            
            if (getstatus == 'radio-playing'){
                radioStop();                
            }            
                                                
            podactive.html('<img class="loading-gif" src="https://storage.googleapis.com/nrm-web/oye/recursos/loading-normal.gif" />');
            
            if (getstatus == 'podcast-playing'){
                
                const playerpodcast = document.getElementById('iframepodcast').getElementsByTagName('iframe')[0];
                //console.log(playerpodcast);
                const ply =  new playerjs.Player(playerpodcast);
                ply.on('ready', ()=> {
                    ply.pause();
                    podactive.attr('data-podcast-status','ready');
                });
                $('.audiopod').each(function(){
                    $('.audiopod').find('.play-pause-podcast').html(buttonPlay);
                    $('.audiopod').find('.play-pause-podcast').attr('data-podcast-status','ready');
                });
            }
            //console.log(podcaststatus);            
            if(podcaststatus == 'ready'){
                transitionBarra();
                const ifr = $(this).find('.data-iframe').attr('data-iframe');
                const ifrsrc = ifr.split('src="');
                const src = ifrsrc[1].split('"');
                //const playerpodcast = document.getElementById('playerpodcast');
                            
                containerpodcast.innerHTML ='';
                const playerpodcast = document.createElement('iframe');
                playerpodcast.setAttribute('src',src[0]+"?image=0&share=0&download=1&description=0&follow=0");
                playerpodcast.setAttribute('width','250');
                playerpodcast.setAttribute('height','300');
                playerpodcast.setAttribute('frameborder','0');
                playerpodcast.setAttribute('allow','autoplay');                
                //console.log(playerpodcast);
                containerpodcast.appendChild(playerpodcast);            
                const ply =  new playerjs.Player(playerpodcast);
                ply.on('ready', ()=> {
                    podactive.attr('data-podcast-status','active');
                    $('#player').attr('data-status','podcast-playing');
                    playerpodcast.classList.add('iframestyle');
                    ply.play(); 
                    
                    ply.on('play', ()=>{
                        podactive.html(buttonPause); 
                    });
    
                    ply.on('pause', ()=>{
                        podactive.html(buttonPlay); 
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
            console.log($(this));   
            //const ele = $(this).attr('id','el-'+t);     
            $(this).on('click',function(){
                const getstatus = playerstatus();
                if( getstatus == 'radio-playing'){
                    radioStop();   
                    hidebarra();
                    $('#player').attr('data-status','video-playing');
                }
            });            
            
        });        

        }else{                      
        $('.wp-block-embed-youtube .wp-block-embed__wrapper').each(function(){
            //console.log(e);            
            const plyr = new Plyr($(this),{
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
            console.log(plyr);
            plyr.on('playing',function(){
                const getstatus = playerstatus();
                if( getstatus == 'radio-playing'){
                    radioStop();   
                    hidebarra();
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
                        'Authorization': 'Bearer 31ifYsZyDJTM2ZZ9PxjDvTbUjRB7DgSNvG9eiJZZNT33Z3LEMo3RK7jlNc9XzXOvg3gwB2JuoDbT1L3KW6xoQBfqbsBoyBDYhQ597HPpFd8tremnnBpArzDW',
                        'Content-Type': 'application/json'
                    },                    
                    body: JSON.stringify( params )
                };
                    
                fetch('https://contenido.oyedigital.mx/wp-json/wp-ulike-pro/v1/vote/', Rparamas)
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

