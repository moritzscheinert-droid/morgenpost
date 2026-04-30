/**
 * Na und? — PWA Install-Banner
 * Zeigt beim 2. Besuch einmalig einen dezenten Installations-Hinweis.
 */
(function () {
  const VISIT_KEY    = 'naund-visit-count';
  const DISMISS_KEY  = 'naund-install-dismissed';
  const INSTALLED_KEY = 'naund-installed';

  // beforeinstallprompt abfangen (Chrome/Edge)
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
  });

  // Besuchszähler hochzählen
  const visits = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) + 1;
  localStorage.setItem(VISIT_KEY, visits);

  // Nicht zeigen wenn: bereits dismissed oder bereits als PWA geöffnet
  if (localStorage.getItem(DISMISS_KEY)) return;
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  if (window.navigator.standalone) return; // iOS Safari PWA

  document.addEventListener('DOMContentLoaded', () => {
    // Kurz warten, damit die Seite zuerst geladen erscheint
    setTimeout(showBanner, 2500);
  });

  function showBanner() {
    if (document.getElementById('naund-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'naund-install-banner';
    banner.setAttribute('role', 'complementary');
    banner.setAttribute('aria-label', 'App-Installation');
    banner.innerHTML = `
      <span class="naund-install-text">
        <strong>Na und?</strong> als App installieren — offline lesen, schnellerer Zugriff
      </span>
      <div class="naund-install-actions">
        <button id="naund-install-btn" aria-label="Na und? als App installieren">Installieren</button>
        <button id="naund-install-dismiss" aria-label="Banner schließen">Nicht jetzt</button>
      </div>`;
    document.body.appendChild(banner);

    document.getElementById('naund-install-btn').addEventListener('click', () => {
      if (deferredPrompt) {
        // Nativer Browser-Dialog (Chrome/Edge)
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(result => {
          if (result.outcome === 'accepted') {
            localStorage.setItem(INSTALLED_KEY, '1');
            localStorage.setItem(DISMISS_KEY, '1');
          }
          deferredPrompt = null;
          banner.remove();
        });
      } else {
        // Weiterleitung zur Anleitung (Safari, Firefox, etc.)
        window.location.href = '/morgenpost/install-guide.html';
      }
    });

    document.getElementById('naund-install-dismiss').addEventListener('click', () => {
      localStorage.setItem(DISMISS_KEY, '1');
      banner.remove();
    });
  }
})();
