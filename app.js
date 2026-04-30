/**
 * Na und? — App Features
 * Dunkelmodus · Schriftgröße · Vorlesen · Teilen · Lesefortschritt · Suche · Benachrichtigungen
 */
(function () {
  'use strict';

  const DARK_KEY  = 'naund-dark';
  const FONT_KEY  = 'naund-font';
  const scrollKey = () => 'naund-scroll' + location.pathname;
  const SEEN_KEY  = 'naund-last-seen';

  // ── SVG-Icons ────────────────────────────────────────────────────────────────
  const SVG_MOON  = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="14" height="14"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const SVG_SUN   = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true" width="14" height="14"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const SVG_PLAY  = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="13" height="13"><path d="M5 3l14 9-14 9V3z"/></svg>';
  const SVG_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="13" height="13"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
  const SVG_SHARE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="13" height="13"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>';

  // ── Dunkelmodus ──────────────────────────────────────────────────────────────
  function applyDark(on) {
    document.documentElement.setAttribute('data-theme', on ? 'dark' : 'light');
    document.documentElement.classList.remove('naund-dark');
    // btn-dark existiert nicht mehr (alte Toolbar entfernt) — kein Update nötig
  }
  // Global exportieren damit settings-panel.js es aufrufen kann
  window._naundApplyDark = applyDark;

  // ── Schriftgröße ────────────────────────────────────────────────────────────
  let fontStep = parseInt(localStorage.getItem(FONT_KEY) || '0');
  function applyFont() {
    document.body.style.fontSize = (11 + fontStep) + 'pt';
    // Artikel-Selektoren haben fixe pt-Werte → separater <style>-Override nötig
    let el = document.getElementById('naund-font-style');
    if (!el) {
      el = document.createElement('style');
      el.id = 'naund-font-style';
      document.head.appendChild(el);
    }
    if (fontStep === 0) { el.textContent = ''; return; }
    const pt = (9 + fontStep * 1.5).toFixed(1);
    el.textContent = `.gzf-thema-body,.gzf-thema-body p,.gzf-intro-text{font-size:${pt}pt!important}`;
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
        share(title.textContent.replace(/[↗]/g, '').trim(),
              location.origin + location.pathname + '#' + el.id);
      });
      title.appendChild(btn);
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
    // Gespeicherten Wert lesen; falls keiner gesetzt ist, System-Preference nutzen
    const stored = localStorage.getItem(DARK_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyDark(stored !== null ? stored === '1' : prefersDark);
    applyFont();

    // Neue Utility-Bar (settings-panel.js muss geladen sein)
    if (typeof window.naundBuildUtilityBar === 'function') {
      window.naundBuildUtilityBar();
    }

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
    setTimeout(() => { obs.disconnect(); cb(); }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForContent(onReady));
  } else {
    waitForContent(onReady);
  }

})();
