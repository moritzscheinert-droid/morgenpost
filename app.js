/**
 * Na und? — App Features
 * Dunkelmodus · Schriftgröße · Vorlesen · Teilen · Lesefortschritt · Suche · Benachrichtigungen
 */
(function () {
  'use strict';

  const DARK_KEY   = 'naund-dark';
  const FONT_KEY   = 'naund-font';
  const scrollKey  = () => 'naund-scroll' + location.pathname;
  const SEEN_KEY   = 'naund-last-seen';

  // ── Dunkelmodus ─────────────────────────────────────────────────────────────
  function applyDark(on) {
    document.documentElement.classList.toggle('naund-dark', on);
    const btn = document.getElementById('btn-dark');
    if (btn) btn.textContent = on ? '☀' : '🌙';
  }

  // ── Schriftgröße ────────────────────────────────────────────────────────────
  let fontStep = parseInt(localStorage.getItem(FONT_KEY) || '0');
  function applyFont() {
    document.body.style.fontSize = (11 + fontStep) + 'pt';
  }

  // ── Lesefortschritt ─────────────────────────────────────────────────────────
  function initProgress() {
    const bar = document.getElementById('naund-prog');
    if (!bar) return;
    function update() {
      const h = document.body.scrollHeight - window.innerHeight;
      const p = h > 0 ? (window.scrollY / h * 100) : 0;
      bar.style.width = Math.min(100, p) + '%';
      if (h > 50) localStorage.setItem(scrollKey(), Math.round(window.scrollY));
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function restoreScroll() {
    const y = parseInt(localStorage.getItem(scrollKey()) || '0');
    if (y > 200) setTimeout(() => window.scrollTo({ top: y, behavior: 'instant' }), 80);
  }

  // ── Toast ───────────────────────────────────────────────────────────────────
  function toast(msg) {
    const el = document.createElement('div');
    el.className = 'naund-toast';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, 2200);
  }

  // ── Teilen ──────────────────────────────────────────────────────────────────
  function share(title, url) {
    if (navigator.share) {
      navigator.share({ title, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => toast('Link kopiert!')).catch(() => {});
    }
  }

  // ── TTS ─────────────────────────────────────────────────────────────────────
  let ttsOn = false;
  function toggleTTS() {
    const btn = document.getElementById('btn-tts');
    if (ttsOn) {
      speechSynthesis.cancel();
      ttsOn = false;
      if (btn) { btn.textContent = '▶'; btn.classList.remove('active'); }
    } else {
      const paras = [...document.querySelectorAll('.gzf-intro-text, .gzf-thema-body p')];
      if (!paras.length) { toast('Kein Text zum Vorlesen'); return; }
      const utt = new SpeechSynthesisUtterance(paras.map(p => p.textContent).join(' '));
      utt.lang = 'de-DE';
      utt.rate = 0.92;
      utt.onend = () => { ttsOn = false; if (btn) { btn.textContent = '▶'; btn.classList.remove('active'); } };
      speechSynthesis.speak(utt);
      ttsOn = true;
      if (btn) { btn.textContent = '⏹'; btn.classList.add('active'); }
    }
  }

  // ── Thema-Share-Buttons ──────────────────────────────────────────────────────
  function addTopicShare() {
    document.querySelectorAll('[id^="thema-"]').forEach(el => {
      const title = el.querySelector('.gzf-thema-title');
      if (!title || el.querySelector('.naund-topic-share')) return;
      const btn = document.createElement('button');
      btn.className = 'naund-topic-share';
      btn.title = 'Thema teilen';
      btn.innerHTML = '&#8599;';
      btn.addEventListener('click', e => {
        e.stopPropagation();
        share(title.textContent.replace('Weiterentwicklung','').trim(),
              location.origin + location.pathname + '#' + el.id);
      });
      title.appendChild(btn);
    });
  }

  // ── Toolbar ──────────────────────────────────────────────────────────────────
  function buildToolbar() {
    if (document.getElementById('naund-toolbar')) return;

    // Fortschrittsbalken
    const prog = document.createElement('div');
    prog.id = 'naund-prog';
    document.body.prepend(prog);

    // Toolbar-Pill
    const tb = document.createElement('div');
    tb.id = 'naund-toolbar';

    const buttons = [
      { id: 'btn-dark',      label: '🌙',  title: 'Dunkelmodus'    },
      { id: 'btn-font-down', label: 'A−',  title: 'Schrift kleiner' },
      { id: 'btn-font-up',   label: 'A+',  title: 'Schrift größer'  },
      { id: 'btn-tts',       label: '▶',   title: 'Vorlesen'        },
      { id: 'btn-share',     label: '↑',   title: 'Seite teilen'    },
    ];

    buttons.forEach(({ id, label, title }) => {
      const btn = document.createElement('button');
      btn.id = id;
      btn.textContent = label;
      btn.title = title;
      tb.appendChild(btn);
    });

    document.body.appendChild(tb);

    // Events binden
    const dark = localStorage.getItem(DARK_KEY) === '1';
    applyDark(dark);

    document.getElementById('btn-dark').addEventListener('click', () => {
      const on = !document.documentElement.classList.contains('naund-dark');
      localStorage.setItem(DARK_KEY, on ? '1' : '0');
      applyDark(on);
    });

    document.getElementById('btn-font-down').addEventListener('click', () => {
      if (fontStep > -3) { fontStep--; localStorage.setItem(FONT_KEY, fontStep); applyFont(); }
    });

    document.getElementById('btn-font-up').addEventListener('click', () => {
      if (fontStep < 5) { fontStep++; localStorage.setItem(FONT_KEY, fontStep); applyFont(); }
    });

    document.getElementById('btn-tts').addEventListener('click', toggleTTS);

    document.getElementById('btn-share').addEventListener('click', () => {
      share(document.title, location.href);
    });
  }

  // ── Neue Ausgabe Banner (Index-Seite) ────────────────────────────────────────
  async function checkNewIssue() {
    try {
      const res  = await fetch('/morgenpost/issues/meta.json', { cache: 'no-store' });
      const meta = await res.json();
      if (!meta.length) return;
      const latest = meta[0];
      const seen   = localStorage.getItem(SEEN_KEY);
      if (seen && seen !== latest.filename) {
        showNewIssueBanner(latest);
      }
      // Lese-Tracking: beim Öffnen einer Ausgabe als "gesehen" markieren
    } catch (_) {}
  }

  function showNewIssueBanner(issue) {
    if (document.getElementById('naund-new-banner')) return;
    const b = document.createElement('div');
    b.id = 'naund-new-banner';
    b.innerHTML = `
      <span>&#9733; Neue Ausgabe: <strong>${issue.first_topic || 'Na und?'}</strong></span>
      <a href="issues/${issue.filename}">Jetzt lesen &rarr;</a>
      <button id="naund-banner-close" aria-label="Schließen">&times;</button>`;
    document.body.prepend(b);
    document.getElementById('naund-banner-close').addEventListener('click', () => b.remove());
  }

  // ── Suche (Index-Seite) ──────────────────────────────────────────────────────
  function initSearch() {
    const grid = document.querySelector('.archive-grid');
    if (!grid) return;

    const wrap = document.createElement('div');
    wrap.id = 'naund-search-wrap';
    wrap.innerHTML = `
      <input id="naund-search" type="search" placeholder="Ausgaben durchsuchen…" autocomplete="off">
      <span id="naund-search-count"></span>`;
    grid.parentElement.insertBefore(wrap, grid);

    const input  = document.getElementById('naund-search');
    const count  = document.getElementById('naund-search-count');
    const cards  = [...grid.querySelectorAll('.arch-card')];

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      let visible = 0;
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const show = !q || text.includes(q);
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });
      count.textContent = q ? `${visible} Treffer` : '';
    });
  }

  // ── Ausgabe als gesehen markieren ────────────────────────────────────────────
  function markSeen() {
    // Auf einer Ausgaben-Seite: Dateiname aus URL extrahieren
    const match = location.pathname.match(/([^/]+\.html)$/);
    if (match) localStorage.setItem(SEEN_KEY, match[1]);
  }

  // ── Service Worker ───────────────────────────────────────────────────────────
  function registerSW() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/morgenpost/sw.js').catch(() => {});
    }
  }

  // ── Benachrichtigungen ───────────────────────────────────────────────────────
  function initNotifications() {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    // Sanfter Hinweis nach 8 Sekunden nur auf der Index-Seite
    if (!document.querySelector('.featured')) return;
    setTimeout(() => {
      const banner = document.createElement('div');
      banner.id = 'naund-notif-prompt';
      banner.innerHTML = `
        <span>&#128276; Benachrichtigungen aktivieren wenn eine neue Ausgabe erscheint?</span>
        <button id="btn-notif-yes">Ja, bitte</button>
        <button id="btn-notif-no">Nein</button>`;
      document.body.appendChild(banner);
      document.getElementById('btn-notif-yes').addEventListener('click', () => {
        Notification.requestPermission().then(p => {
          banner.remove();
          if (p === 'granted') toast('Benachrichtigungen aktiviert ✓');
        });
      });
      document.getElementById('btn-notif-no').addEventListener('click', () => {
        banner.remove();
        localStorage.setItem('naund-notif-dismissed', '1');
      });
    }, 8000);
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  function onReady() {
    applyDark(localStorage.getItem(DARK_KEY) === '1');
    applyFont();
    buildToolbar();
    registerSW();

    const isIssuePage = !!document.querySelector('.gzf-intro, .gzf-thema');
    const isIndexPage = !!document.querySelector('.featured, .archive-grid');

    if (isIssuePage) {
      initProgress();
      restoreScroll();
      addTopicShare();
      markSeen();
    }

    if (isIndexPage) {
      checkNewIssue();
      initSearch();
      if (!localStorage.getItem('naund-notif-dismissed')) initNotifications();
    }
  }

  // Warten bis Inhalt sichtbar ist (Staticrypt decryptet asynchron)
  function waitForContent(cb) {
    const ready = () => !!document.querySelector(
      '.gzf-intro, .gzf-thema, .featured, .archive-grid, .container'
    );
    if (ready()) { cb(); return; }
    const obs = new MutationObserver(() => {
      if (ready()) { obs.disconnect(); cb(); }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // Fallback: nach 3s auf jeden Fall starten
    setTimeout(() => { obs.disconnect(); cb(); }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForContent(onReady));
  } else {
    waitForContent(onReady);
  }

})();
