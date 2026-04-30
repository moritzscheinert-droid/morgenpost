/**
 * Na und? — Audio-Player
 * Inline-Player direkt unter dem Element mit [data-audio-src].
 * Wenn kein [data-audio-src] auf der Seite vorhanden: macht nichts.
 */
(function () {
  'use strict';

  var SVG_PLAY  = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16"><path d="M5 3l14 9-14 9V3z"/></svg>';
  var SVG_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="16" height="16"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';

  var SPEEDS = [1, 1.25, 1.5, 2];

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function formatTime(sec) {
    if (!isFinite(sec) || sec < 0) return '0:00';
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + pad(s);
  }

  function init() {
    var anchor = document.querySelector('[data-audio-src]');
    if (!anchor) return;

    var src = anchor.dataset.audioSrc;
    if (!src) return;

    // ── Audio-Element ──────────────────────────────────────────────────────
    var audio = new Audio(src);
    audio.preload = 'metadata';

    // ── Player-DOM aufbauen ───────────────────────────────────────────────
    var player = document.createElement('div');
    player.className = 'naund-audio-player';
    player.setAttribute('role', 'region');
    player.setAttribute('aria-label', 'Audio-Player');

    player.innerHTML = [
      '<button class="naund-ap-play" aria-label="Abspielen" title="Abspielen">',
        '<span class="naund-ap-play-icon">' + SVG_PLAY + '</span>',
      '</button>',
      '<div class="naund-ap-middle">',
        '<div class="naund-ap-chapter" aria-live="polite"></div>',
        '<div class="naund-ap-progress-wrap" role="slider" aria-label="Abspielposition" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0">',
          '<div class="naund-ap-progress-fill" style="width:0%"></div>',
        '</div>',
      '</div>',
      '<span class="naund-ap-time" aria-live="off">0:00 / 0:00</span>',
      '<button class="naund-ap-speed" aria-label="Geschwindigkeit: 1×" title="Geschwindigkeit ändern">1×</button>',
    ].join('');

    // Player nach dem Anchor-Element einfügen
    anchor.parentNode.insertBefore(player, anchor.nextSibling);

    var playBtn      = player.querySelector('.naund-ap-play');
    var playIcon     = player.querySelector('.naund-ap-play-icon');
    var chapterLbl   = player.querySelector('.naund-ap-chapter');
    var progressWrap = player.querySelector('.naund-ap-progress-wrap');
    var progressFill = player.querySelector('.naund-ap-progress-fill');
    var timeEl       = player.querySelector('.naund-ap-time');
    var speedBtn     = player.querySelector('.naund-ap-speed');

    var speedIdx = 0;

    // ── Mini-Player aufbauen ──────────────────────────────────────────────
    var miniPlayer = document.createElement('div');
    miniPlayer.className = 'naund-mini-player';
    miniPlayer.setAttribute('role', 'region');
    miniPlayer.setAttribute('aria-label', 'Mini Audio-Player');
    miniPlayer.innerHTML = [
      '<button class="naund-mini-play" aria-label="Abspielen">',
        '<span class="naund-mini-play-icon">' + SVG_PLAY + '</span>',
      '</button>',
      '<span class="naund-mini-chapter"></span>',
      '<span class="naund-mini-time">0:00</span>',
    ].join('');
    document.body.insertBefore(miniPlayer, document.body.firstChild);

    var miniPlayBtn   = miniPlayer.querySelector('.naund-mini-play');
    var miniPlayIcon  = miniPlayer.querySelector('.naund-mini-play-icon');
    var miniChapter   = miniPlayer.querySelector('.naund-mini-chapter');
    var miniTimeEl    = miniPlayer.querySelector('.naund-mini-time');

    // Mini-Player via IntersectionObserver
    var observer = new IntersectionObserver(function (entries) {
      var isVisible = entries[0].isIntersecting;
      if (isVisible) {
        miniPlayer.classList.remove('visible');
      } else {
        miniPlayer.classList.add('visible');
      }
    }, { threshold: 0.1 });
    observer.observe(player);

    // ── Chapters ──────────────────────────────────────────────────────────
    var chapters = null;

    function getCurrentChapterTitle() {
      if (!chapters || !chapters.length) return '';
      var title = '';
      chapters.forEach(function (ch) {
        if (audio.currentTime >= ch.time) title = ch.title;
      });
      return title;
    }

    var chapSrc = anchor.dataset.chaptersSrc;
    if (chapSrc) {
      fetch(chapSrc).then(function (r) { return r.json(); }).then(function (data) {
        function activate(duration) {
          chapters = data.sections.map(function (s) {
            return {
              title: s.title,
              time: (s.char_offset / (data.total_chars || 1)) * duration,
            };
          });
          updateChapter();
        }
        if (audio.duration) {
          activate(audio.duration);
        } else {
          audio.addEventListener('loadedmetadata', function () {
            activate(audio.duration);
          }, { once: true });
        }
      }).catch(function () {});
    }

    // ── UI-Update-Funktionen ──────────────────────────────────────────────
    function updatePlayState(playing) {
      playIcon.innerHTML    = playing ? SVG_PAUSE : SVG_PLAY;
      miniPlayIcon.innerHTML = playing ? SVG_PAUSE : SVG_PLAY;
      playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Abspielen');
      miniPlayBtn.setAttribute('aria-label', playing ? 'Pause' : 'Abspielen');
    }

    function updateProgress() {
      var dur = audio.duration || 0;
      var cur = audio.currentTime || 0;
      var pct = dur > 0 ? (cur / dur * 100) : 0;
      progressFill.style.width = pct + '%';
      progressWrap.setAttribute('aria-valuenow', Math.round(pct));
      var timeStr = formatTime(cur) + ' / ' + formatTime(dur);
      timeEl.textContent = timeStr;
      miniTimeEl.textContent = formatTime(cur);
    }

    function updateChapter() {
      var title = getCurrentChapterTitle();
      chapterLbl.textContent = title;
      miniChapter.textContent = title || document.title;
    }

    // ── Audio Events ──────────────────────────────────────────────────────
    audio.addEventListener('play',  function () { updatePlayState(true); });
    audio.addEventListener('pause', function () { updatePlayState(false); });
    audio.addEventListener('ended', function () { updatePlayState(false); });
    audio.addEventListener('timeupdate', function () {
      updateProgress();
      updateChapter();
    });
    audio.addEventListener('loadedmetadata', function () {
      updateProgress();
    });

    // ── Play/Pause ────────────────────────────────────────────────────────
    function togglePlay() {
      if (audio.paused) { audio.play().catch(function () {}); }
      else              { audio.pause(); }
    }
    playBtn.addEventListener('click', togglePlay);
    miniPlayBtn.addEventListener('click', togglePlay);

    // ── Progress-Bar Klick ────────────────────────────────────────────────
    progressWrap.addEventListener('click', function (e) {
      var rect = progressWrap.getBoundingClientRect();
      var pct  = (e.clientX - rect.left) / rect.width;
      if (audio.duration) {
        audio.currentTime = pct * audio.duration;
      }
    });

    // Keyboard-Navigation auf der Progress-Bar
    progressWrap.addEventListener('keydown', function (e) {
      var step = (e.shiftKey ? 30 : 5);
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + step);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        audio.currentTime = Math.max(0, audio.currentTime - step);
        e.preventDefault();
      }
    });

    // ── Geschwindigkeit ───────────────────────────────────────────────────
    speedBtn.addEventListener('click', function () {
      speedIdx = (speedIdx + 1) % SPEEDS.length;
      var speed = SPEEDS[speedIdx];
      audio.playbackRate = speed;
      var label = speed === 1 ? '1×' : speed + '×';
      speedBtn.textContent = label;
      speedBtn.setAttribute('aria-label', 'Geschwindigkeit: ' + label);
    });

    // Mini-Player initialisieren
    miniChapter.textContent = document.title;
    updateProgress();
  }

  // Starten wenn DOM bereit
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
