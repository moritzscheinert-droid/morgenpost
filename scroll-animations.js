/**
 * Na und? — Scroll-Animationen (Phase 2)
 * GSAP 3 + ScrollTrigger · nur Startseite (index)
 *
 * Genutzte Klassen (alle bereits in newsletter.py vorhanden):
 *   .masthead, .masthead h1, .masthead-right, .subline
 *   .featured, .featured-img, .featured-body
 *   .featured-label, .featured-title, .featured-date,
 *   .featured-topic, .featured-cta, .rss-link
 *   .archive-grid, .arch-card
 *   .container h2  (Archiv-Überschrift)
 *
 * Neu per JS eingefügt:
 *   .naund-divider  (Trennlinie vor dem Archiv-Grid)
 */
(function () {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  // Keine Animationen bei prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  gsap.registerPlugin(ScrollTrigger);

  // ── 1. Hero-Titel Reveal (einmalig beim Laden) ───────────────────────────────
  const heroTitle    = document.querySelector('.masthead h1');
  const heroSubtitle = document.querySelector('.masthead-right');
  const subline      = document.querySelector('.subline');

  if (heroTitle) {
    const els = [heroTitle, heroSubtitle, subline].filter(Boolean);
    gsap.set(els, { opacity: 0, y: 20 });

    gsap.timeline({ delay: 0.1 })
      .to(heroTitle,    { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out' })
      .to(heroSubtitle, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.7')
      .to(subline,      { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }, '-=0.55');
  }

  // ── 2. Hero-Bild Parallax ────────────────────────────────────────────────────
  // .featured hat overflow: hidden — das Bild kann sich darin verschieben
  const heroImg = document.querySelector('.featured-img');

  if (heroImg) {
    gsap.fromTo(heroImg,
      { y: -28, scale: 1.06 },
      {
        y: 36,
        scale: 1.0,
        ease: 'none',
        scrollTrigger: {
          trigger: '.featured',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1.2,
        }
      }
    );
  }

  // ── 3. Ausgaben-Info Stagger-Reveal ─────────────────────────────────────────
  const featuredBody = document.querySelector('.featured-body');

  if (featuredBody) {
    const items = featuredBody.querySelectorAll(
      '.featured-label, .featured-title, .featured-date, ' +
      '.featured-topic, .featured-cta, .rss-link'
    );
    if (items.length) {
      gsap.set(items, { opacity: 0, y: 20 });
      gsap.to(items, {
        opacity: 1, y: 0,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.10,
        scrollTrigger: {
          trigger: featuredBody,
          start: 'top 82%',
          toggleActions: 'play none none none',
        }
      });
    }
  }

  // ── 4. Trennlinie wächst + Archiv-Überschrift ────────────────────────────────
  const archiveGrid = document.querySelector('.archive-grid');
  const archiveH2   = document.querySelector('.container h2');

  if (archiveH2 && archiveGrid) {
    // Trennlinie via JS vor dem Grid einfügen
    const divider = document.createElement('div');
    divider.className = 'naund-divider';
    archiveGrid.parentElement.insertBefore(divider, archiveGrid);

    gsap.set(divider, { scaleX: 0, transformOrigin: 'left center' });
    gsap.to(divider, {
      scaleX: 1,
      duration: 0.85,
      ease: 'power3.inOut',
      scrollTrigger: {
        trigger: archiveH2,
        start: 'top 88%',
        toggleActions: 'play none none none',
      }
    });

    gsap.set(archiveH2, { opacity: 0, y: 14 });
    gsap.to(archiveH2, {
      opacity: 1, y: 0,
      duration: 0.6,
      ease: 'power2.out',
      delay: 0.15,
      scrollTrigger: {
        trigger: archiveH2,
        start: 'top 88%',
        toggleActions: 'play none none none',
      }
    });
  }

  // ── 5. Archiv-Karten Stagger ─────────────────────────────────────────────────
  const cards = document.querySelectorAll('.arch-card');

  if (cards.length) {
    gsap.set(cards, { opacity: 0, y: 32 });
    gsap.to(cards, {
      opacity: 1, y: 0,
      duration: 0.6,
      ease: 'power2.out',
      stagger: { amount: 0.45, from: 'start' },
      scrollTrigger: {
        trigger: '.archive-grid',
        start: 'top 88%',
        toggleActions: 'play none none none',
      }
    });
  }

})();
