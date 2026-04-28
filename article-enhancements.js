/**
 * Na und? — Article Enhancements (Phase 3)
 * TOC active-highlight · Collapsible TOC · Scroll-fade
 * Kein GSAP — nur IntersectionObserver + native Browser-APIs
 */
(function () {
  'use strict';

  /* ════════════════════════════════════════════════════════════════
     TOC ACTIVE HIGHLIGHT (IntersectionObserver)
     Beobachtet .gzf-thema-Blöcke und hebt den passenden
     TOC-Eintrag hervor sobald der Artikel in den Viewport tritt.
  ════════════════════════════════════════════════════════════════ */
  function initTocHighlight() {
    const toc = document.querySelector('.toc-box');
    if (!toc) return;

    const tocLinks = Array.from(toc.querySelectorAll('.toc-item a'));
    if (!tocLinks.length) return;

    // Artikel-Targets aus den href-Attributen ableiten
    const targets = tocLinks.map(a => {
      const id = a.getAttribute('href');
      return id ? document.querySelector(id) : null;
    });

    let currentIdx = -1;

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const idx = targets.indexOf(entry.target);
          if (idx === -1) return;
          if (entry.isIntersecting && idx !== currentIdx) {
            // Alten aktiven Eintrag deaktivieren
            if (currentIdx >= 0) {
              const prev = toc.querySelectorAll('.toc-item')[currentIdx];
              if (prev) {
                prev.classList.remove('toc-active');
                prev.querySelector('a')?.removeAttribute('aria-current');
              }
            }
            // Neuen aktiven Eintrag setzen
            const curr = toc.querySelectorAll('.toc-item')[idx];
            if (curr) {
              curr.classList.add('toc-active');
              curr.querySelector('a')?.setAttribute('aria-current', 'location');
            }
            currentIdx = idx;
          }
        });
      },
      // Eintrag gilt als aktiv wenn er im oberen Drittel des Viewports ist
      { rootMargin: '-10% 0px -65% 0px', threshold: 0 }
    );

    targets.forEach(el => { if (el) obs.observe(el); });

    // Smooth-Scroll + Collapsible schließen bei Klick
    tocLinks.forEach((a, idx) => {
      a.addEventListener('click', e => {
        const target = targets[idx];
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });

        const collapsible = toc.classList.contains('toc-collapsible') ? toc : null;
        if (collapsible) {
          collapsible.classList.remove('toc-open');
          collapsible.querySelector('.toc-toggle')
            ?.setAttribute('aria-expanded', 'false');
          const icon = collapsible.querySelector('.toc-toggle-icon');
          if (icon) icon.textContent = '▾';
        }
      });
    });
  }

  /* ════════════════════════════════════════════════════════════════
     COLLAPSIBLE TOC (Variante B)
     Greift nur wenn .toc-collapsible auf .toc-box gesetzt ist.
     Ersetzt .toc-label durch einen Toggle-Button.
  ════════════════════════════════════════════════════════════════ */
  function initCollapsibleToc() {
    const toc = document.querySelector('.toc-box.toc-collapsible');
    if (!toc) return;

    const label = toc.querySelector('.toc-label');
    const list  = toc.querySelector('.toc-list');
    if (!list) return;

    const labelText = label ? label.textContent.trim() : 'In dieser Ausgabe';
    if (label) label.remove();

    const btn = document.createElement('button');
    btn.className = 'toc-toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'naund-toc-list');
    btn.innerHTML =
      '<span>' + labelText + '</span>' +
      '<span class="toc-toggle-icon" aria-hidden="true">▾</span>';

    list.id = 'naund-toc-list';
    toc.prepend(btn);

    btn.addEventListener('click', () => {
      const open = toc.classList.toggle('toc-open');
      btn.setAttribute('aria-expanded', String(open));
      btn.querySelector('.toc-toggle-icon').textContent = open ? '▴' : '▾';
    });
  }

  /* ════════════════════════════════════════════════════════════════
     SCROLL FADE-IN
     Setzt .art-visible auf .gzf-thema sobald sichtbar.
     Deaktiviert bei prefers-reduced-motion (CSS übernimmt das).
  ════════════════════════════════════════════════════════════════ */
  function initScrollFade() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const items = document.querySelectorAll('.gzf-thema');
    if (!items.length) return;

    // Klasse erst jetzt setzen → opacity: 0 greift nur wenn JS aktiv ist
    document.documentElement.classList.add('art-fade-ready');

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('art-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    items.forEach(el => obs.observe(el));
  }

  /* ════════════════════════════════════════════════════════════════
     INIT
  ════════════════════════════════════════════════════════════════ */
  function init() {
    initCollapsibleToc(); // vor TOC-Highlight, weil der Button erst hier entsteht
    initTocHighlight();
    initScrollFade();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
