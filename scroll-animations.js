/**
 * Na und? — Scroll-Animationen (kein GSAP)
 * Rein natives CSS + IntersectionObserver + rAF.
 * Animationsdauern/Easings in scroll-animations.css (--sa-dur-*, --sa-ease-*).
 */
(function () {
  'use strict';

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ── 1. Hero-Titel Reveal (sofort beim Laden, gestaffelt) ─────────────────────
  var heroEls = [
    document.querySelector('.masthead h1'),
    document.querySelector('.masthead-right'),
    document.querySelector('.subline'),
  ].filter(Boolean);

  heroEls.forEach(function (el, i) {
    el.classList.add('sa-hero');
    el.style.animationDelay = (i * 0.15) + 's';
  });

  // ── 2. Hero-Bild Parallax (rAF + scroll) ─────────────────────────────────────
  var heroImg      = document.querySelector('.featured-img');
  var heroSection  = heroImg && heroImg.closest('.featured');
  var rafPending   = false;

  if (heroImg && heroSection) {
    function updateParallax() {
      var rect     = heroSection.getBoundingClientRect();
      var vh       = window.innerHeight;
      // progress 0 = Bild oben im Viewport, 1 = Bild unten raus
      var progress = (vh - rect.top) / (vh + rect.height);
      var y        = (progress - 0.5) * 60; // ±30px Versatz
      heroImg.style.transform = 'translateY(' + y.toFixed(1) + 'px)';
      rafPending = false;
    }

    window.addEventListener('scroll', function () {
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(updateParallax);
      }
    }, { passive: true });

    updateParallax();
  }

  // ── 3. IntersectionObserver für alle Scroll-Reveals ──────────────────────────
  var obs = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('sa-visible');
      obs.unobserve(e.target);
    });
  }, { threshold: 0.10 });

  // Featured Body: gestaffelte Items
  var featuredItems = document.querySelectorAll(
    '.featured-label, .featured-title, .featured-date, .featured-topic, .featured-cta'
  );
  featuredItems.forEach(function (el, i) {
    el.classList.add('sa-reveal');
    el.style.animationDelay = (i * 0.10) + 's';
    obs.observe(el);
  });

  // Trennlinie + Archiv-Überschrift
  var archiveGrid = document.querySelector('.archive-grid');
  var archiveH2   = document.querySelector('.container h2');

  if (archiveGrid) {
    var divider = document.createElement('div');
    divider.className = 'naund-divider sa-reveal';
    archiveGrid.parentElement.insertBefore(divider, archiveGrid);
    obs.observe(divider);
  }

  if (archiveH2) {
    archiveH2.classList.add('sa-reveal');
    archiveH2.style.animationDelay = '0.15s';
    obs.observe(archiveH2);
  }

  // Archiv-Karten: gestaffelt, max. 0.42s Gesamtverzögerung
  var cards = document.querySelectorAll('.arch-card');
  cards.forEach(function (card, i) {
    card.classList.add('sa-reveal');
    card.style.animationDelay = Math.min(i * 0.06, 0.42) + 's';
    obs.observe(card);
  });

})();
