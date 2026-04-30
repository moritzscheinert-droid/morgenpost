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
    const btn = document.getElementById('btn-dark');
    if (btn) {
      btn.setAttribute('aria-label', on ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren');
      btn.title = on ? 'Hellmodus' : 'Dunkelmodus';
      const icon = btn.querySelector('.btn-icon');
      if (icon) icon.innerHTML = on ? SVG_MOON : SVG_SUN;
    }
  }

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

  // ── TTS ─────────────────────────────────────────────────────────────────────

  function updateTTSButton(status) {
    const btn = document.getElementById('btn-tts');
    if (!btn) return;
    const icon = btn.querySelector('.btn-icon');
    btn.classList.remove('active', 'tts-paused');
    if (status === 'playing') {
      if (icon) icon.innerHTML = SVG_PAUSE;
      btn.classList.add('active');
      btn.title = 'Pause';
    } else if (status === 'paused') {
      if (icon) icon.innerHTML = SVG_PLAY;
      btn.classList.add('tts-paused');
      btn.title = 'Weiter';
    } else {
      if (icon) icon.innerHTML = SVG_PLAY;
      btn.title = 'Vorlesen';
    }
  }

  // ── HTML5 Audio (vorberechnete MP3) ──────────────────────────────────────────
  function buildAudioBar() {
    if (document.getElementById('naund-audiobar')) return;
    const bar = document.createElement('div');
    bar.id = 'naund-audiobar';
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Audio-Steuerung');

    const lbl = document.createElement('span');
    lbl.id = 'naund-chapter-lbl';
    bar.appendChild(lbl);

    [
      { id: 'btn-prev-ch',  icon: '⏮︎', title: 'Voriges Thema',   hidden: true },
      { id: 'btn-back15',   icon: '⏪︎', title: '15 Sekunden zurück' },
      { id: 'btn-fwd15',    icon: '⏩︎', title: '15 Sekunden vor'    },
      { id: 'btn-next-ch',  icon: '⏭︎', title: 'Nächstes Thema',  hidden: true },
    ].forEach(({ id, icon, title, hidden }) => {
      const btn = document.createElement('button');
      btn.id = id; btn.title = title;
      btn.setAttribute('aria-label', title);
      btn.innerHTML = `<span class="btn-icon">${icon}</span>`;
      if (hidden) btn.style.display = 'none';
      bar.appendChild(btn);
    });
    document.body.appendChild(bar);
  }

  function initAudioPlayer() {
    const audio = document.getElementById('naund-audio');
    if (!audio) return false;

    buildAudioBar();
    document.getElementById('naund-audiobar').style.display = 'flex';

    audio.addEventListener('play',  () => updateTTSButton('playing'));
    audio.addEventListener('pause', () => updateTTSButton(audio.ended ? 'idle' : 'paused'));
    audio.addEventListener('ended', () => updateTTSButton('idle'));

    document.getElementById('btn-tts').addEventListener('click', () => {
      if (audio.paused) audio.play();
      else              audio.pause();
    });

    // Skip ±15s
    document.getElementById('btn-back15').addEventListener('click', () => {
      audio.currentTime = Math.max(0, audio.currentTime - 15);
      if (audio.paused) audio.play();
    });
    document.getElementById('btn-fwd15').addEventListener('click', () => {
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 15);
      if (audio.paused) audio.play();
    });

    // Chapter navigation
    let chapters = null;

    function getCurrentChIdx() {
      if (!chapters) return 0;
      let idx = 0;
      chapters.forEach((ch, i) => { if (audio.currentTime >= ch.time) idx = i; });
      return idx;
    }

    function updateChapterLabel() {
      if (!chapters) return;
      const lbl = document.getElementById('naund-chapter-lbl');
      if (lbl) lbl.textContent = chapters[getCurrentChIdx()]?.title || '';
    }

    audio.addEventListener('timeupdate', updateChapterLabel);

    document.getElementById('btn-prev-ch').addEventListener('click', () => {
      if (!chapters) return;
      const idx = getCurrentChIdx();
      const chStart = chapters[idx]?.time || 0;
      const target = (audio.currentTime - chStart > 3 || idx === 0)
        ? chStart : (chapters[idx - 1]?.time || 0);
      audio.currentTime = target;
      if (audio.paused) audio.play();
    });

    document.getElementById('btn-next-ch').addEventListener('click', () => {
      if (!chapters || getCurrentChIdx() + 1 >= chapters.length) return;
      audio.currentTime = chapters[getCurrentChIdx() + 1].time;
      if (audio.paused) audio.play();
    });

    const chapSrc = audio.dataset.chapters;
    if (chapSrc) {
      fetch(chapSrc).then(r => r.json()).then(data => {
        function activate(duration) {
          chapters = data.sections.map(s => ({
            title: s.title,
            time: (s.char_offset / (data.total_chars || 1)) * duration,
          }));
          ['btn-prev-ch', 'btn-next-ch'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = '';
          });
          updateChapterLabel();
        }
        if (audio.duration) activate(audio.duration);
        else audio.addEventListener('loadedmetadata', () => activate(audio.duration), { once: true });
      }).catch(() => {});
    }

    return true;
  }

  // ── Web Speech API Fallback (ältere Ausgaben ohne MP3) ───────────────────────
  let wssState = { status: 'idle', idx: 0, chunks: [], voice: null, keepAlive: null };

  function pickGermanVoice() {
    const voices = speechSynthesis.getVoices();
    const de = voices.filter(v => v.lang.startsWith('de'));
    if (!de.length) return null;
    for (const name of ['Yannick', 'Anna', 'Thomas', 'Google Deutsch', 'Microsoft Stefan']) {
      const v = de.find(v => v.name.includes(name));
      if (v) return v;
    }
    return de.find(v => v.localService) || de[0];
  }

  function buildTTSChunks() {
    const chunks = [];
    const intro = document.querySelector('.gzf-intro-text');
    if (intro) chunks.push({ text: 'Kurzbriefing. ' + intro.textContent.trim() });
    document.querySelectorAll('[id^="thema-"]').forEach((sec, i) => {
      const titleEl = sec.querySelector('.gzf-thema-title');
      const paras   = [...sec.querySelectorAll('.gzf-thema-body p')];
      if (!paras.length) return;
      const t = titleEl ? titleEl.textContent.replace(/[↗↑]/g, '').trim() : '';
      chunks.push({ text: `Thema ${i + 1}: ${t}. ` + paras.map(p => p.textContent).join(' ') });
    });
    return chunks;
  }

  function wssStop() {
    if (wssState.keepAlive) { clearInterval(wssState.keepAlive); wssState.keepAlive = null; }
    speechSynthesis.cancel();
    wssState.status = 'idle';
    updateTTSButton('idle');
  }

  function wssSpeak(idx) {
    if (idx >= wssState.chunks.length) { wssStop(); return; }
    wssState.idx = idx;
    const utt = new SpeechSynthesisUtterance(wssState.chunks[idx].text);
    utt.lang = 'de-DE'; utt.rate = 0.90; utt.pitch = 1.0;
    if (wssState.voice) utt.voice = wssState.voice;
    utt.onend   = () => { if (wssState.status === 'playing') wssSpeak(idx + 1); };
    utt.onerror = (e) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      if (wssState.status === 'playing') wssSpeak(idx + 1);
    };
    speechSynthesis.speak(utt);
  }

  function initWebSpeech() {
    document.getElementById('btn-tts').addEventListener('click', () => {
      if (wssState.status === 'idle') {
        const chunks = buildTTSChunks();
        if (!chunks.length) { toast('Kein Text zum Vorlesen'); return; }
        wssState.chunks = chunks;
        wssState.status = 'playing';
        const go = () => { wssState.voice = pickGermanVoice(); wssSpeak(0); };
        speechSynthesis.getVoices().length ? go()
          : speechSynthesis.addEventListener('voiceschanged', go, { once: true });
        wssState.keepAlive = setInterval(() => {
          if (wssState.status === 'playing' && speechSynthesis.speaking && !speechSynthesis.paused) {
            speechSynthesis.pause(); speechSynthesis.resume();
          }
        }, 12000);
        updateTTSButton('playing');
      } else if (wssState.status === 'playing') {
        speechSynthesis.pause(); wssState.status = 'paused'; updateTTSButton('paused');
      } else {
        speechSynthesis.resume(); wssState.status = 'playing'; updateTTSButton('playing');
      }
    });
  }

  function initTTS() {
    if (!initAudioPlayer()) initWebSpeech();
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

  // ── Toolbar ──────────────────────────────────────────────────────────────────
  function buildToolbar() {
    if (document.getElementById('naund-toolbar')) return;

    const prog = document.createElement('div');
    prog.id = 'naund-prog';
    document.body.prepend(prog);

    const tb = document.createElement('div');
    tb.id = 'naund-toolbar';
    tb.setAttribute('role', 'toolbar');
    tb.setAttribute('aria-label', 'Lesewerkzeuge');

    const lbl = document.createElement('span');
    lbl.className = 'naund-tb-label';
    lbl.textContent = 'Na und?';
    tb.appendChild(lbl);

    const sep0 = document.createElement('span');
    sep0.className = 'naund-tb-sep';
    tb.appendChild(sep0);

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const buttons = [
      { id: 'btn-dark',      icon: isDark ? SVG_MOON : SVG_SUN, title: isDark ? 'Hellmodus' : 'Dunkelmodus' },
      { id: 'btn-font-down', icon: 'A−', title: 'Schrift kleiner' },
      { id: 'btn-font-up',   icon: 'A+', title: 'Schrift größer'  },
      { id: 'btn-tts',       icon: SVG_PLAY, title: 'Vorlesen'    },
      { id: 'btn-share',     icon: SVG_SHARE, title: 'Seite teilen' },
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

    document.getElementById('btn-dark').addEventListener('click', () => {
      const on = document.documentElement.getAttribute('data-theme') !== 'dark';
      localStorage.setItem(DARK_KEY, on ? '1' : '0');
      applyDark(on);
    });

    document.getElementById('btn-font-down').addEventListener('click', () => {
      if (fontStep > -3) { fontStep--; localStorage.setItem(FONT_KEY, fontStep); applyFont(); }
    });

    document.getElementById('btn-font-up').addEventListener('click', () => {
      if (fontStep < 5) { fontStep++; localStorage.setItem(FONT_KEY, fontStep); applyFont(); }
    });

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
    // Gespeicherten Wert lesen; falls keiner gesetzt ist, System-Preference nutzen
    const stored = localStorage.getItem(DARK_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyDark(stored !== null ? stored === '1' : prefersDark);
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
      initTTS();
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
