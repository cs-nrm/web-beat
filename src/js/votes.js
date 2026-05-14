// ===== [VOTES] showVoteToast, detectarNavegador, detectarDispositivo, registerVote =====
const VOTE_COLOR = '#ef4444';

function showVoteToast(message) {
  try {
    if (window.Toastify) {
      Toastify({
        text: message,
        className: "info",
        style: {
          background: "linear-gradient(to right, #ec4899, #a855f7)",
          'border-radius': '6px',
          'box-shadow': 'var(--tw-ring-offset-shadow, 0 0 #0000), var(--tw-ring-shadow, 0 0 #0000), var(--tw-shadow)'
        },
        offset: { x: '10rem', y: '20rem' }
      }).showToast();
      return;
    }
  } catch (_) { }
  console.log(message);
}

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
 * @param {string} seccion
 * @param {string} artista
 * @param {string} cancion
 * @param {HTMLElement|null} btn
 * @returns {Promise}
 */
function registerVote(seccion, artista, cancion, btn = null) {
  return new Promise((resolve, reject) => {
    const url = 'https://beatdigital.com.mx/6456heu2/8s4v3f1l3s.php';

    if (btn) {
      const svg = btn.querySelector('svg');
      const fillColor = svg ? (svg.style.fill || '').toLowerCase() : '';
      if (fillColor === VOTE_COLOR) {
        console.log('Ya votaste por esta canción.');
        return resolve({ status: 'already' });
      }
      if (btn.disabled) {
        return resolve({ status: 'disabled' });
      }
      btn.disabled = true;
    }

    const safe = (s) => (s || '').toString().replace('&', '%26');
    const { navegador, sistema } = detectarNavegador();

    const data = {
      artista: safe(artista),
      cancion: safe(cancion),
      seccion: seccion,
      dispositivo: detectarDispositivo(),
      navegador,
      sistema_operativo: sistema,
    };

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data)
    })
      .then(function(res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function(resp) {
        if (btn) btn.disabled = false;

        if (resp && resp.status === 'success') {
          if (btn) {
            const svg = btn.querySelector('svg');
            if (svg) svg.style.fill = VOTE_COLOR;
          }
          showVoteToast(resp.message || 'Gracias por tu voto');
          return resolve(resp);
        }

        if (resp && (resp.status === 'blocked' || resp.status === 'skipped')) {
          showVoteToast(resp.message || 'No se pudo registrar tu voto.');
          return resolve(resp);
        }

        showVoteToast((resp && resp.message) || 'Error al votar.');
        return reject(resp || new Error('vote-error'));
      })
      .catch(function(xhr) {
        if (btn) btn.disabled = false;
        const msg = (xhr && xhr.responseJSON && xhr.responseJSON.message)
          ? xhr.responseJSON.message
          : 'No se pudo registrar el voto. Intenta de nuevo.';
        showVoteToast(msg);
        reject(new Error('network-fail'));
      });
  });
}

// Exponer globalmente por si algún componente externo las llama
window.registerVote = registerVote;
window.showVoteToast = showVoteToast;
