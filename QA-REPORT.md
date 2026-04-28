# Na und? — QA-Report

**Datum:** 28.04.2026  
**Geprüfte Phasen:** 1 (Design Tokens) · 2 (Scroll-Animationen) · 3 (Artikelseite) · 4 (Archivseite)  
**Geprüfte Dateien:** `design-tokens.css`, `app.css`, `app.js`, `article-layout.css`, `article-enhancements.js`, `scroll-animations.css`, `scroll-animations.js`, `archive-layout.css`, `archiv.html`

---

## Zusammenfassung

| Status | Anzahl |
|---|---|
| ✅ BESTANDEN | 50 |
| ❌ FEHLER | 1 |
| ⚠️ WARNUNG | 8 |
| **Gesamt** | **59** |

**1 Fehler gefunden und direkt behoben (E12).**

---

## A — Design Tokens & Farbsystem

| # | Test | Status | Hinweis |
|---|---|---|---|
| A1 | `design-tokens.css` vorhanden | ✅ | 568 Zeilen, syntaktisch korrekt |
| A2 | Alle Custom Properties in beiden Modi | ✅ | `--color-bg/surface/text/text-muted/accent/accent-soft/border/border-heavy/border-rule/live` in Light + Dark definiert. Border-System (`--border-thin/thick/rule/double`) in `:root` (mode-unabhängig korrekt, da sie `var(--color-border*)` referenzieren) |
| A3 | Kein Rotholz-Überbleibsel | ✅ | Keiner der Werte `#c45a4a`, `#993c2a`, `#2a1c1a`, `#382828`, `#c9a84c`, `#d4af37` gefunden |
| A4 | Kein Gold-Überbleibsel | ✅ | Kein `gold`, `amber`, `#c9a`, `#d4a` gefunden |
| A5 | Keine hartcodierten Farben in CSS/JS | ✅ | `article-layout.css`, `archive-layout.css`, `scroll-animations.css`, `scroll-animations.js`: null Treffer für `#[hex]` oder `rgb()` |
| A6 | WCAG AA Kontrast-Check | ✅ | Alle 8 Kombinationen geprüft (Python-Berechnung): |
| | | | Hellmodus: Text 18.7:1 · Muted 4.8:1 · Akzent 6.0:1 · Live 5.7:1 |
| | | | Dunkelmodus: Text 15.3:1 · Muted 6.6:1 · Akzent 6.3:1 · Live 4.8:1 |
| | | | Minimum: 4.8:1 (WCAG AA: 4.5:1 ✓) |

---

## B — Theme Toggle

| # | Test | Status | Hinweis |
|---|---|---|---|
| B1 | `theme-toggle.js` vorhanden | ⚠️ | Datei existiert nicht als eigene Datei. Funktionalität vollständig in `app.js` integriert (Zeilen 21–31, 361–363, 475–477). Funktionell vollwertig, aber abweichend vom Dateinamen der Spec. |
| B2 | System-Preference wird gelesen | ✅ | `app.js` Z.476: `window.matchMedia('(prefers-color-scheme: dark)').matches` |
| B3 | localStorage-Persistenz | ✅ | `app.js` Z.362: `localStorage.setItem(DARK_KEY, on ? '1' : '0')` |
| B4 | localStorage hat Vorrang | ✅ | `app.js` Z.477: `stored !== null ? stored === '1' : prefersDark` |
| B5 | Toggle-Button mit SVG-Icons | ✅ | Mond- und Sonnen-SVG in `app.js` Z.14–15, Button via `initToolbar()` injiziert |
| B6 | Farb-Transition ~300ms | ✅ | `design-tokens.css` Z.198: `transition: background-color var(--transition-normal), color var(--transition-normal)` auf `html` |
| B7 | Kein FOUC | ✅ | `archiv.html` hat Inline-Script in `<head>`. Issue-Seiten sind staticrypt-verschlüsselt — Passwort-Dialog erscheint zuerst, danach läuft `app.js` vor dem ersten Paint der Inhaltsseite. |

---

## C — Typografie

| # | Test | Status | Hinweis |
|---|---|---|---|
| C1 | Schriften geladen | ✅ | Lokale WOFF2-Dateien via `@font-face` statt Google Fonts CDN — bessere Performance, kein Datenschutzproblem. Technisch abweichend von „@import" in der Spec, aber überlegen. |
| C2 | Font-Variablen | ⚠️ | Definiert als `--font-display` / `--font-serif` / `--font-sans` statt `--font-headline` / `--font-body` / `--font-ui`. Naming-Abweichung von der Spec, aber alle drei Variablen existieren und sind konsistent im gesamten Codebase verwendet. |
| C3 | Typografie-Skala | ✅ | `--font-size-xs` bis `--font-size-4xl` (7 Stufen) in `design-tokens.css` |
| C4 | Zeilenhöhen | ✅ | `--line-height-tight/normal/relaxed` definiert |
| C5 | Artikelseite Textbreite | ✅ | `article-layout.css` Z.22: `max-width: 65ch` auf `.gzf-thema-body` |
| C6 | Silbentrennung + `lang="de"` | ✅ | `article-layout.css` Z.24–25: `hyphens: auto; -webkit-hyphens: auto`. `newsletter.py` Z.1847: `<html lang="de">`. |
| C7 | Überschriften linksbündig | ✅ | `article-layout.css` Z.68: `text-align: left` auf `.gzf-thema-title`. `design-tokens.css`: kein `text-align` auf `h1`–`h4` (Default: left). |

---

## D — Startseite Animationen

| # | Test | Status | Hinweis |
|---|---|---|---|
| D1 | GSAP geladen | ✅ | `newsletter.py` Z.2145–2146: GSAP 3.12.5 + ScrollTrigger via cdnjs, plus `scroll-animations.js`. Seite ist staticrypt-verschlüsselt, daher nicht via `grep` auf fertiger HTML prüfbar — in newsletter.py verifiziert. |
| D2 | `scroll-animations.js` valides JS | ✅ | 140 Zeilen, syntaktisch korrekt |
| D3 | Graceful Degradation | ✅ | `gsap.set()` setzt `opacity: 0` — ohne JS bleibt CSS-Default `opacity: 1`. Kein CSS-`opacity: 0`. |
| D4 | Reduced Motion | ✅ | Z.22: `if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;` — frühzeitig, vor allen Animationen |
| D5 | GSAP-Verfügbarkeit geprüft | ✅ | Z.19: `if (typeof gsap === 'undefined' \|\| typeof ScrollTrigger === 'undefined') return;` |
| D6 | Nur `opacity`/`transform` animiert | ✅ | Ausschließlich `opacity`, `y`, `scale`, `scaleX` — kein `margin`, `color`, `background` etc. |
| D7 | Kein Scroll-Hijacking | ✅ | Kein `ScrollTrigger.pin()` im Script |
| D8 | Keine hartcodierten Farben im JS | ✅ | Null `#`-Hex oder `rgb()`-Werte in `scroll-animations.js` |

---

## E — Artikelseite

| # | Test | Status | Hinweis |
|---|---|---|---|
| E1 | `article-layout.css` vorhanden | ✅ | 450 Zeilen, syntaktisch korrekt |
| E2 | `article-enhancements.js` vorhanden | ✅ | 156 Zeilen (nach Fix), syntaktisch korrekt |
| E3 | Kein GSAP | ✅ | Beide Dateien: kein GSAP-Aufruf, kein CDN-Link — ausschließlich `IntersectionObserver` |
| E4 | Kurzbriefing-Kasten | ✅ | `background: var(--color-surface)` · `border-top: var(--border-rule)` · kein linker Rand · Label nutzt `var(--color-text)` |
| E5 | Perspektiven-Kasten | ✅ | `background: var(--color-surface)` · `border-top: var(--border-thick)` · kein farbiger Rand |
| E6 | Artikel-Trennung | ✅ | `.gzf-thema-title`: `border-top: var(--border-double)` |
| E7 | Links im Fließtext | ✅ | `.gzf-thema-body a`: `color: var(--color-accent)` |
| E8 | Lesefortschrittsbalken | ✅ | `#naund-prog`: `background: var(--color-text)` — NYT-Stil, nicht Akzentfarbe |
| E9 | TOC vorhanden | ✅ | Beide Varianten implementiert: Sticky Sidebar (≥1200px via Media Query) + Collapsible (via CSS-Klasse) |
| E10 | TOC Accessibility | ✅ | `role="navigation"` via `newsletter.py` · Fokus-Styles: `focus-visible` mit `outline: 2px solid var(--color-accent)` · `aria-current="location"` per JS gesetzt |
| E11 | Reduced Motion | ✅ | `article-enhancements.js` `initScrollFade()`: prüft `prefers-reduced-motion: reduce` |
| E12 | Ohne JS lesbar | ❌ → ✅ | **BEHOBEN:** CSS hatte `opacity: 0` auf `.gzf-thema` in `@media (prefers-reduced-motion: no-preference)` ohne JS-Guard → alle Artikel ohne JavaScript unsichtbar. Fix: `opacity: 0` jetzt nur bei `.art-fade-ready .gzf-thema`, Klasse wird erst von `initScrollFade()` per JS gesetzt. |

---

## F — Archivseite

| # | Test | Status | Hinweis |
|---|---|---|---|
| F1 | `archiv.html` vorhanden | ✅ | 351 Zeilen, valides HTML5 |
| F2 | `archive-layout.css` vorhanden | ✅ | 286 Zeilen, syntaktisch korrekt |
| F3 | `design-tokens.css` eingebunden | ✅ | Explizit via `<link>` (+ indirekt via `app.css` @import — doppelt geladen, harmlos) |
| F4 | Theme-Toggle funktioniert | ✅ | `app.js` eingebunden (enthält Theme-Logik) + Anti-FOUC-Script in `<head>` |
| F5 | Daten-Array vorhanden | ✅ | 3 Ausgaben (24./26./28.04.2026) mit allen Feldern |
| F6 | Karten-Rendering | ✅ | Bild · Datum (formatiert) · Titel · Teaser · Lesezeit · „Lesen →" |
| F7 | Live-Suche | ✅ | 150ms Debounce · Case-insensitive · Titel + Teaser + Datum durchsucht |
| F8 | Leerer Zustand | ✅ | Meldung „Keine Ausgaben gefunden für ‚…'" + Reset-Button |
| F9 | Links korrekt | ✅ | `/morgenpost/issues/2026-04-2X_na-und.html` — alle 3 Dateien existieren |
| F10 | Semantisches HTML | ⚠️ | `<main>` ✅ · `<nav>` ✅ · `<label>` für Suchfeld ✅ · Kein `<article>` für Karten (stattdessen `<li>`). Semantisch korrekt für eine Liste, aber `<article>` wäre puristisch richtiger. |
| F11 | `aria-live="polite"` | ✅ | Auf dem äußeren Container von `#arch-list` + `#arch-empty` |
| F12 | Ohne JS nutzbar | ✅ | `<noscript>`-Meldung vorhanden |

---

## G — Cross-Cutting Concerns

| # | Test | Status | Hinweis |
|---|---|---|---|
| G1 | Einbindungsreihenfolge | ✅ | `app.css` hat `@import url('./design-tokens.css')` als erste Zeile → Tokens immer zuerst. `archiv.html` bindet `design-tokens.css` zusätzlich explizit (doppelt, harmlos). |
| G2 | Konsistente Utility-Bar | ✅ | `app.js` injiziert Toolbar auf allen Seiten identisch (`initToolbar()`) |
| G3 | Keine Console-Errors | ✅ | Code-Review: null-sichere Zugriffe, GSAP-Check vor Nutzung, `?.`-Operator für optionale DOM-Elemente, `try/catch`-freie Abschnitte ohne kritische Fehlerquellen |
| G4 | Keine CSS-Warnings | ✅ | Alle Custom Properties korrekt referenziert, keine fehlenden Semikolons, keine ungültigen Werte identifiziert |
| G5 | Responsive | ✅ | Alle 3 Seiten: Media Queries für 600px/768px/1024px/1200px vorhanden |
| G6 | Keine toten Links | ⚠️ | „← Alle Ausgaben"-Button in bestehenden Issue-Seiten verlinkt auf `/morgenpost/` (Index) statt `/morgenpost/archiv.html`. Spec schreibt vor, Issue-Dateien nicht zu ändern. Intern konsistent, aber Nutzer landen nicht auf der Archivseite. |
| G7 | Dateigrößen | ⚠️ | `design-tokens.css`: 568 Zeilen (Limit: 500) — enthält Artikel-Overrides für `design-tokens.css`. `app.js`: 519 Zeilen (Limit: 300) — enthält alle App-Features. Kein automatischer Refactor laut Spec. |

---

## Fixes angewendet

### E12 — Artikelseite ohne JS unsichtbar

**Problem:** `article-layout.css` hatte:
```css
@media (prefers-reduced-motion: no-preference) {
  .gzf-thema { opacity: 0; transition: opacity 0.6s ease; }
}
```
Ohne JavaScript wurde `.art-visible` nie gesetzt → Artikel dauerhaft unsichtbar.

**Fix in `article-layout.css`** (1 Zeile geändert):
```css
/* vorher: */ .gzf-thema { opacity: 0; … }
/* nachher: */ .art-fade-ready .gzf-thema { opacity: 0; … }
```

**Fix in `article-enhancements.js`** (1 Zeile ergänzt in `initScrollFade()`):
```js
document.documentElement.classList.add('art-fade-ready');
```

`.art-fade-ready` wird nur gesetzt wenn JS aktiv ist → ohne JS bleibt `opacity: 1`.

---

## Offene Punkte (nicht automatisch behoben)

### ⚠️ G7 — Dateigröße

`design-tokens.css` (568 Zeilen) überschreitet 500-Zeilen-Limit.

**Lösungsvorschlag:** Artikel-Overrides (`/* ARTIKEL-OVERRIDES */`-Block, ca. 290 Zeilen) in eine separate `article-overrides.css` auslagern. Ladereihenfolge: `design-tokens.css` → `app.css` → `article-overrides.css` → `article-layout.css`. Die Overrides müssten in allen Issue-Seiten eingebunden werden (Änderung in `newsletter.py`).

`app.js` (519 Zeilen) überschreitet 300-Zeilen-Limit.

**Lösungsvorschlag:** TTS-Logik (~150 Zeilen) in separate `tts.js` auslagern. Risiko: Reihenfolge der Initialisierung muss gewartet werden.

### ⚠️ G6 — „← Alle Ausgaben" verlinkt auf Index statt Archiv

Bestehende Issue-Seiten (`issues/*.html`) haben einen „← Alle Ausgaben"-Button, der auf `/morgenpost/` zeigt. Mit Phase 4 wäre `/morgenpost/archiv.html` der bessere Zielort.

**Lösungsvorschlag:** In `newsletter.py` Z.2198 den Link-Text und `href` anpassen. Die bestehenden 3 HTML-Dateien müssten mit dem nächsten Deploy-Lauf neu generiert und verschlüsselt werden (via `staticrypt`).

### ⚠️ C2 — Font-Variable-Naming

Spec erwartet `--font-headline`, `--font-body`, `--font-ui`. Tatsächlich: `--font-display`, `--font-serif`, `--font-sans`.

**Lösungsvorschlag:** Entweder Aliasse in `design-tokens.css` ergänzen:
```css
--font-headline: var(--font-display);
--font-body:     var(--font-serif);
--font-ui:       var(--font-sans);
```
Oder Spec-Dokumentation anpassen (Namen sind im Codebase konsistent, nur von der Spec abweichend).

---

## Mögliche nächste Schritte

Da alle Tests bis auf den behobenen E12-Fehler bestanden sind, folgende Erweiterungen als nächste Phasen vorgeschlagen:

| Idee | Aufwand | Priorität |
|---|---|---|
| **Open Graph Meta-Tags** | gering | hoch — Vorschau-Bilder bei WhatsApp/Twitter-Shares |
| **Print-Stylesheet** | gering | mittel — sauberer Ausdruck, Toolbar/TOC ausblenden |
| **`<article>`-Elemente in Archivkarten** | minimal | niedrig — semantische Verbesserung |
| **Font-Alias-Variablen** | minimal | niedrig — Spec-Konformität herstellen |
| **`design-tokens.css` aufteilen** | mittel | niedrig — erst bei aktivem Wachstum nötig |
| **`← Alle Ausgaben` → Archiv umlenken** | minimal | mittel — bessere UX nach Phase 4 |
