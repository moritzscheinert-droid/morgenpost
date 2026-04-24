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
    if (btn) btn.setAttribute('aria-label', on ? 'Hellmodus' : 'Dunkelmodus');
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
  let ttsState = { on: false, idx: 0, chunks: [], voice: null };

  function pickGermanVoice() {
    const voices = speechSynthesis.getVoices();
    const de = voices.filter(v => v.lang.startsWith('de'));
    if (!de.length) return null;
    // Bevorzuge Premium/Enhanced-Stimmen auf macOS / Google Deutsch auf Chrome
    const preferred = ['Yannick', 'Anna', 'Thomas', 'Google Deutsch', 'Microsoft Stefan'];
    for (const name of preferred) {
      const found = de.find(v => v.name.includes(name));
      if (found) return found;
    }
    // Fallback: erste lokale Stimme (meist besser als remote)
    return de.find(v => v.localService) || de[0];
  }

  function buildTTSChunks() {
    const chunks = [];
    // Kurzbriefing
    const intro = document.querySelector('.gzf-intro-text');
    if (intro) {
      chunks.push({ label: null, text: 'Kurzbriefing. ' + intro.textContent.trim() });
    }
    // Themenblöcke
    document.querySelectorAll('[id^="thema-"]').forEach((section, i) => {
      const titleEl = section.querySelector('.gzf-thema-title');
      const paras   = [...section.querySelectorAll('.gzf-thema-body p')];
      if (!paras.length) return;
      const title = titleEl
        ? titleEl.textContent.replace(/[↗↑↗]/g, '').trim()
        : '';
      chunks.push({
        label: section.id,
        text: `Thema ${i + 1}${title ? ': ' + title : ''}. ` + paras.map(p => p.textContent).join(' ')
      });
    });
    return chunks;
  }

  function highlightSection(id) {
    document.querySelectorAll('.naund-tts-reading').forEach(el => el.classList.remove('naund-tts-reading'));
    if (id) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('naund-tts-reading');
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }

  function speakChunk(idx) {
    if (idx >= ttsState.chunks.length) {
      stopTTS();
      return;
    }
    ttsState.idx = idx;
    const chunk = ttsState.chunks[idx];
    highlightSection(chunk.label);

    // Fortschrittsanzeige im Button aktualisieren
    const btn = document.getElementById('btn-tts');
    const total = ttsState.chunks.length;
    if (btn) btn.title = `Vorlesen (${idx + 1}/${total})`;

    const utt = new SpeechSynthesisUtterance(chunk.text);
    utt.lang = 'de-DE';
    utt.rate = 0.90;
    utt.pitch = 1.0;
    if (ttsState.voice) utt.voice = ttsState.voice;

    utt.onend = () => {
      if (ttsState.on) speakChunk(idx + 1);
    };
    utt.onerror = () => {
      if (ttsState.on) speakChunk(idx + 1);
    };
    speechSynthesis.speak(utt);
  }

  function stopTTS() {
    speechSynthesis.cancel();
    ttsState.on = false;
    highlightSection(null);
    const btn = document.getElementById('btn-tts');
    if (btn) {
      btn.classList.remove('active');
      btn.title = 'Vorlesen';
      btn.querySelector('.btn-icon').textContent = '▶';
    }
  }

  function toggleTTS() {
    const btn = document.getElementById('btn-tts');
    if (ttsState.on) {
      stopTTS();
    } else {
      const chunks = buildTTSChunks();
      if (!chunks.length) { toast('Kein Text zum Vorlesen'); return; }
      ttsState.chunks = chunks;
      ttsState.on = true;
      // Stimme laden (ggf. asynchron – getVoices() ist auf manchen Browsern lazy)
      const trySpeak = () => {
        ttsState.voice = pickGermanVoice();
        speakChunk(0);
      };
      if (speechSynthesis.getVoices().length) {
        trySpeak();
      } else {
        speechSynthesis.addEventListener('voiceschanged', trySpeak, { once: true });
      }
      if (btn) {
        btn.classList.add('active');
        btn.querySelector('.btn-icon').textContent = '⏹';
      }
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

  // ── Toolbar (FT-Stil) ────────────────────────────────────────────────────────
  function buildToolbar() {
    if (document.getElementById('naund-toolbar')) return;

    // Lesefortschrittsbalken
    const prog = document.createElement('div');
    prog.id = 'naund-prog';
    document.body.prepend(prog);

    const tb = document.createElement('div');
    tb.id = 'naund-toolbar';
    tb.setAttribute('role', 'toolbar');
    tb.setAttribute('aria-label', 'Lesewerkzeuge');

    // Label "Na und?"
    const lbl = document.createElement('span');
    lbl.className = 'naund-tb-label';
    lbl.textContent = 'Na und?';
    tb.appendChild(lbl);

    const sep0 = document.createElement('span');
    sep0.className = 'naund-tb-sep';
    tb.appendChild(sep0);

    const buttons = [
      { id: 'btn-dark',      icon: '☽',  title: 'Dunkelmodus'    },
      { id: 'btn-font-down', icon: 'A−', title: 'Schrift kleiner' },
      { id: 'btn-font-up',   icon: 'A+', title: 'Schrift größer'  },
      { id: 'btn-tts',       icon: '▶',  title: 'Vorlesen'        },
      { id: 'btn-share',     icon: '↑',  title: 'Seite teilen'    },
    ];

    buttons.forEach(({ id, icon, title }, i) => {
      if (i > 0) {
        const sep = document.createElement('span');
        sep.className = 'naund-tb-sep';
        tb.appendChild(sep);
      }
      const btn = document.createElement('button');
      btn.id = id;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.innerHTML = `<span class="btn-icon">${icon}</span>`;
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
    setTimeout(() => { obs.disconnect(); cb(); }, 3000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => waitForContent(onReady));
  } else {
    waitForContent(onReady);
  }

})();
