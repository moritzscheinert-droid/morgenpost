/**
 * Na und? — Settings Panel & Utility-Bar
 * Ersetzt buildToolbar() aus app.js.
 * Läuft nach app.js (app.js muss zuerst geladen sein, da applyDark/applyFont
 * aus app.js verwendet werden).
 */
(function () {
  'use strict';

  var DARK_KEY         = 'naund-dark';
  var FONT_SIZE_KEY    = 'naund-font-size';

  var DEFAULT_FONT     = 17;
  var MIN_FONT         = 14;
  var MAX_FONT         = 22;

  var SVG_SUN  = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" width="15" height="15"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  var SVG_MOON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="15" height="15"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  var SVG_GEAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="15" height="15"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
  var SVG_UP   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="15" height="15"><path d="M18 15l-6-6-6 6"/></svg>';

  var panelEl  = null;
  var gearBtn  = null;
  var panelOpen = false;

  // ── Fokus-Trap ──────────────────────────────────────────────────────────────
  function getFocusable(container) {
    return Array.from(container.querySelectorAll(
      'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
    )).filter(function (el) {
      return !el.closest('[hidden]') && getComputedStyle(el).display !== 'none';
    });
  }

  function trapFocus(e) {
    if (!panelEl || !panelOpen) return;
    var focusable = getFocusable(panelEl);
    if (!focusable.length) return;
    var first = focusable[0];
    var last  = focusable[focusable.length - 1];
    if (e.key === 'Tab') {
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    if (e.key === 'Escape') {
      closePanel();
    }
  }

  // ── Panel öffnen/schließen ──────────────────────────────────────────────────
  function openPanel() {
    if (!panelEl) return;
    panelOpen = true;
    panelEl.classList.add('open');
    if (gearBtn) gearBtn.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', trapFocus);
    // Fokus auf ersten fokussierbaren Element im Panel
    requestAnimationFrame(function () {
      var focusable = getFocusable(panelEl);
      if (focusable.length) focusable[0].focus();
    });
  }

  function closePanel() {
    if (!panelEl) return;
    panelOpen = false;
    panelEl.classList.remove('open');
    if (gearBtn) {
      gearBtn.setAttribute('aria-expanded', 'false');
      gearBtn.focus();
    }
    document.removeEventListener('keydown', trapFocus);
  }

  // Klick außerhalb schließt Panel
  function onDocClick(e) {
    if (!panelOpen) return;
    if (panelEl && !panelEl.contains(e.target) && gearBtn && !gearBtn.contains(e.target)) {
      closePanel();
    }
  }

  // ── Theme-Toggle ────────────────────────────────────────────────────────────
  function getThemeMode() {
    var val = localStorage.getItem(DARK_KEY);
    if (val === '1') return 'dark';
    if (val === '0') return 'light';
    return 'system';
  }

  function updateThemeToggleIcon() {
    var btn = document.getElementById('utb-theme');
    if (!btn) return;
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.querySelector('.utb-btn-icon').innerHTML = isDark ? SVG_MOON : SVG_SUN;
    btn.setAttribute('aria-label', isDark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren');
    btn.title = isDark ? 'Hellmodus' : 'Dunkelmodus';
  }

  // Ruft applyDark() aus app.js auf, falls vorhanden
  function applyTheme(mode) {
    var dark;
    if (mode === 'dark') {
      dark = true;
      localStorage.setItem(DARK_KEY, '1');
    } else if (mode === 'light') {
      dark = false;
      localStorage.setItem(DARK_KEY, '0');
    } else {
      localStorage.removeItem(DARK_KEY);
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    // app.js-Funktion aufrufen falls verfügbar
    if (typeof window._naundApplyDark === 'function') {
      window._naundApplyDark(dark);
    }
    updateThemeToggleIcon();
    // Segmented-Control-Buttons im Panel synchronisieren
    if (panelEl) {
      var btns = panelEl.querySelectorAll('[data-theme-val]');
      btns.forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.themeVal === mode);
        btn.setAttribute('aria-checked', btn.dataset.themeVal === mode ? 'true' : 'false');
      });
    }
  }

  // ── Schriftgröße ────────────────────────────────────────────────────────────
  function getCurrentFontSize() {
    return parseInt(localStorage.getItem(FONT_SIZE_KEY) || DEFAULT_FONT, 10);
  }

  function applyFontSize(px) {
    px = Math.max(MIN_FONT, Math.min(MAX_FONT, px));
    localStorage.setItem(FONT_SIZE_KEY, px);
    document.documentElement.style.fontSize = px + 'px';
    // Slider + Wert-Anzeige aktualisieren
    if (panelEl) {
      var slider = panelEl.querySelector('#settings-font-slider');
      var val    = panelEl.querySelector('#settings-font-val');
      if (slider) slider.value = px;
      if (val)    val.textContent = px + 'px';
    }
  }

  // ── applySettings: liest localStorage und wendet alles an ──────────────────
  function applySettings() {
    // Theme
    var darkVal = localStorage.getItem(DARK_KEY);
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = darkVal === '1' ? true : darkVal === '0' ? false : prefersDark;
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Font size
    var fs = parseInt(localStorage.getItem(FONT_SIZE_KEY) || DEFAULT_FONT, 10);
    document.documentElement.style.fontSize = fs + 'px';
  }

  // Global exportieren damit andere Skripte es nutzen können
  window.naundApplySettings = applySettings;

  // ── Panel-Inhalt aufbauen ───────────────────────────────────────────────────
  function buildPanel() {
    if (document.getElementById('naund-settings-panel')) return;

    var currentMode  = getThemeMode();
    var currentFs    = getCurrentFontSize();

    panelEl = document.createElement('div');
    panelEl.id = 'naund-settings-panel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', 'Einstellungen');
    panelEl.setAttribute('aria-modal', 'true');

    panelEl.innerHTML = [
      /* Panel-Header */
      '<div class="settings-panel-header">',
        '<span class="settings-panel-title">Einstellungen</span>',
        '<button class="settings-panel-close" aria-label="Einstellungen schließen" title="Schließen">&#x2715;</button>',
      '</div>',

      /* ── Sektion: Darstellung ── */
      '<div class="settings-section" role="group" aria-labelledby="settings-lbl-display">',
        '<div class="settings-section-label" id="settings-lbl-display">Darstellung</div>',

        /* Farbmodus */
        '<div class="settings-row">',
          '<span class="settings-row-label">Farbmodus</span>',
          '<div class="seg-control" role="radiogroup" aria-label="Farbmodus">',
            '<button role="radio" data-theme-val="light" aria-checked="' + (currentMode === 'light' ? 'true' : 'false') + '" class="' + (currentMode === 'light' ? 'active' : '') + '" aria-label="Hellmodus">&#9728; Hell</button>',
            '<button role="radio" data-theme-val="dark"  aria-checked="' + (currentMode === 'dark'  ? 'true' : 'false') + '" class="' + (currentMode === 'dark'  ? 'active' : '') + '" aria-label="Dunkelmodus">&#9790; Dunkel</button>',
            '<button role="radio" data-theme-val="system" aria-checked="' + (currentMode === 'system' ? 'true' : 'false') + '" class="' + (currentMode === 'system' ? 'active' : '') + '" aria-label="Systemeinstellung">&#9881; System</button>',
          '</div>',
        '</div>',

        /* Schriftgröße */
        '<div class="settings-row">',
          '<span class="settings-row-label">Schriftgröße</span>',
          '<div class="font-size-row">',
            '<button class="font-size-btn" id="settings-font-down" aria-label="Schrift kleiner" title="Kleiner">A&#8722;</button>',
            '<input class="settings-slider" id="settings-font-slider" type="range" min="' + MIN_FONT + '" max="' + MAX_FONT + '" value="' + currentFs + '" aria-label="Schriftgröße" aria-valuemin="' + MIN_FONT + '" aria-valuemax="' + MAX_FONT + '" aria-valuenow="' + currentFs + '">',
            '<button class="font-size-btn" id="settings-font-up" aria-label="Schrift größer" title="Größer">A+</button>',
            '<span class="font-size-value" id="settings-font-val" aria-live="polite">' + currentFs + 'px</span>',
          '</div>',
        '</div>',
      '</div>',

      /* ── Sektion: Über ── */
      '<div class="settings-section">',
        '<div class="settings-section-label">&Uuml;ber</div>',
        '<p class="settings-about-text">Na und? &mdash; Dreimal w&ouml;chentlicher Nachrichten-Digest</p>',
        '<div class="settings-about-links">',
          '<a href="/morgenpost/feed.xml" target="_blank" rel="noopener">RSS-Feed</a>',
          '<a href="/morgenpost/install-guide.html">App installieren</a>',
          '<button class="settings-link-copy" id="settings-copy-link" title="Link dieser Seite kopieren">Link kopieren</button>',
        '</div>',
      '</div>',
    ].join('');

    document.body.appendChild(panelEl);

    // ── Event-Listener im Panel ─────────────────────────────────────────────

    // Schließen-Button
    panelEl.querySelector('.settings-panel-close').addEventListener('click', closePanel);

    // Farbmodus-Buttons
    panelEl.querySelectorAll('[data-theme-val]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        applyTheme(btn.dataset.themeVal);
      });
    });

    // Schriftgröße — Slider
    var slider = panelEl.querySelector('#settings-font-slider');
    slider.addEventListener('input', function () {
      applyFontSize(parseInt(slider.value, 10));
    });

    // Schriftgröße — A- / A+
    panelEl.querySelector('#settings-font-down').addEventListener('click', function () {
      applyFontSize(getCurrentFontSize() - 1);
    });
    panelEl.querySelector('#settings-font-up').addEventListener('click', function () {
      applyFontSize(getCurrentFontSize() + 1);
    });

    // Link kopieren
    panelEl.querySelector('#settings-copy-link').addEventListener('click', function () {
      navigator.clipboard.writeText(location.href).then(function () {
        var btn = panelEl.querySelector('#settings-copy-link');
        btn.textContent = '✓ Kopiert';
        setTimeout(function () { btn.textContent = 'Link kopieren'; }, 2000);
      }).catch(function () {});
    });

    // Klick außerhalb schließt Panel
    document.addEventListener('click', onDocClick);
  }

  // ── Toolbar aufbauen ────────────────────────────────────────────────────────
  function buildUtilityBar() {
    if (document.getElementById('naund-utility-bar')) return;

    // Lesefortschrittsbalken (wenn noch nicht da)
    if (!document.getElementById('naund-prog')) {
      var prog = document.createElement('div');
      prog.id = 'naund-prog';
      prog.setAttribute('role', 'progressbar');
      prog.setAttribute('aria-hidden', 'true');
      document.body.prepend(prog);
    }

    var bar = document.createElement('div');
    bar.id = 'naund-utility-bar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Lesewerkzeuge');

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    bar.innerHTML = [
      '<a href="/morgenpost/" class="utb-brand" aria-label="Na und? – Zur Startseite">NA&nbsp;UND?</a>',
      '<span class="utb-sep" aria-hidden="true"></span>',
      '<button class="utb-btn" id="utb-theme" aria-label="' + (isDark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren') + '" title="' + (isDark ? 'Hellmodus' : 'Dunkelmodus') + '">',
        '<span class="utb-btn-icon">' + (isDark ? SVG_MOON : SVG_SUN) + '</span>',
      '</button>',
      '<span class="utb-sep" aria-hidden="true"></span>',
      '<button class="utb-btn" id="utb-gear" aria-label="Einstellungen" title="Einstellungen" aria-expanded="false" aria-controls="naund-settings-panel" aria-haspopup="dialog">',
        '<span class="utb-btn-icon">' + SVG_GEAR + '</span>',
      '</button>',
      '<span class="utb-sep" aria-hidden="true"></span>',
      '<button class="utb-btn" id="utb-scroll-top" aria-label="Zum Seitenanfang" title="Nach oben">',
        '<span class="utb-btn-icon">' + SVG_UP + '</span>',
      '</button>',
    ].join('');

    document.body.appendChild(bar);

    gearBtn = document.getElementById('utb-gear');

    // Theme-Toggle
    document.getElementById('utb-theme').addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var newMode = current === 'dark' ? 'light' : 'dark';
      applyTheme(newMode);
    });

    // Gear → Panel
    gearBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (panelOpen) {
        closePanel();
      } else {
        buildPanel();
        openPanel();
      }
    });

    // Scroll-to-top
    var scrollBtn = document.getElementById('utb-scroll-top');
    scrollBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Scroll-to-top Sichtbarkeit
    function updateScrollBtn() {
      if (window.scrollY > 300) {
        scrollBtn.classList.add('visible');
      } else {
        scrollBtn.classList.remove('visible');
      }
    }
    window.addEventListener('scroll', updateScrollBtn, { passive: true });
    updateScrollBtn();
  }

  // ── Öffentliche API & Auto-Init ─────────────────────────────────────────────
  window.naundBuildUtilityBar = buildUtilityBar;

  // Direkt ausführen — läuft nach app.js (defer, gleiche Reihenfolge im HTML)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildUtilityBar);
  } else {
    buildUtilityBar();
  }

})();
