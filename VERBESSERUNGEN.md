# Na und? — Verbesserungsbericht

> Analysiert am 30. April 2026. Basis: alle Dateien im Projektroot + `/issues/` + `/fonts/` + `Newsletter/template.html`.

---

## Bestandsaufnahme

**Projektstruktur:**

| Datei / Ordner | Zweck |
|---|---|
| `index.html` | Startseite (Staticrypt-verschlüsselt, ~68 KB) |
| `archiv.html` | Archivseite mit Inline-Daten und JS-Rendering |
| `404.html` | Fehlerseite |
| `issues/*.html` | Ausgaben (3 vorhanden, alle Staticrypt-verschlüsselt) |
| `issues/meta.json` | Metadaten für "Neue Ausgabe"-Banner |
| `issues/audio/` | MP3-Audiodateien + Kapitel-JSON |
| `issues/images/` | Bilder zu den Ausgaben |
| `fonts/` | 4 selbst gehostete woff2-Schriften |
| `icons/` | PWA-Icons (192, 512, 1024 px) |
| `design-tokens.css` | CSS-Custom-Properties + Artikel-Overrides (~570 Zeilen) |
| `app.css` | Toolbar, Audiobar, Fortschrittsbalken, Toast (~350 Zeilen) |
| `article-layout.css` | Artikelseiten-Layout (TOC, Bilder, Fließtext) (~450 Zeilen) |
| `archive-layout.css` | Archivseiten-Layout (~290 Zeilen) |
| `scroll-animations.css` | Hover-Effekte, will-change (~65 Zeilen) |
| `print.css` | Druckstylesheet |
| `app.js` | Dunkelmodus, Schriftgröße, TTS, Audio, Toolbar, Suche, SW |
| `article-enhancements.js` | TOC-Highlight, Collapsible TOC, Scroll-Fade-in |
| `scroll-animations.js` | GSAP-Animationen (nur Startseite) |
| `sw.js` | Service Worker (Network-first, Push) |
| `manifest.json` | PWA-Manifest |
| `feed.xml` | RSS-Feed (manuell gepflegt) |
| `Newsletter/template.html` | Artikel-Template (ausserhalb des Web-Repos) |

**Technologien:** Kein Build-Tool, kein Framework. Vanilla HTML/CSS/JS. GSAP 3 + ScrollTrigger (externe CDN-Abhängigkeit, nur Startseite). Staticrypt für passwortgeschützten Zugang. Lokal gehostete Schriften (Playfair Display, Source Serif 4, Inter).

**Externe Abhängigkeiten:** GSAP (CDN, im verschlüsselten Index-Inhalt). Keine anderen externen Skripte auf unverschlüsselten Seiten.

---

## Kritische Probleme (sofort beheben)

### K1 — design-tokens.css doppelt geladen (Performance-Bug)

`archiv.html` (Zeile 28–29) und `404.html` (Zeile 26–27) laden `design-tokens.css` als direkten `<link>` **und** über `@import` in `app.css` (Zeile 6). Das erzeugt einen doppelten Netzwerk-Request und eine CSS-Import-Kaskade, die zusätzlich render-blockierend ist.

**IST (`archiv.html`, Zeilen 28–30):**
```html
<link rel="stylesheet" href="/morgenpost/design-tokens.css">
<link rel="stylesheet" href="/morgenpost/app.css">   <!-- importiert design-tokens intern nochmals -->
<link rel="stylesheet" href="/morgenpost/archive-layout.css">
```

**SOLL:** Den separaten `<link>` für `design-tokens.css` entfernen — `app.css` lädt es bereits per `@import`:
```html
<link rel="stylesheet" href="/morgenpost/app.css">
<link rel="stylesheet" href="/morgenpost/archive-layout.css">
```

Alternativ (besser für Performance): Den `@import` aus `app.css` entfernen und überall nur direkte `<link>`-Tags verwenden. `@import` innerhalb von CSS ist generell langsamer als parallele `<link>`-Tags, weil der Browser erst `app.css` herunterladen und parsen muss, bevor er `design-tokens.css` anfordern kann.

**Dateien:** `archiv.html` Z. 28, `404.html` Z. 26, `app.css` Z. 6  
**Aufwand:** Klein

---

### K2 — Falscher Fallback-Wert für `--color-surface` im Template (Visueller Bug)

`Newsletter/template.html` enthält als CSS-Fallback für `--color-surface` den Wert `#1c1818` — das ist die alte **Rotholz-Dunkelpalette** aus einem früheren Design-Iteration, nicht der aktuelle Hellmodus-Wert `#f7f7f7`. Wenn das Template ohne externe CSS-Tokens gerendert wird (z. B. beim Öffnen einer Ausgabe im E-Mail-Client oder als lokale Datei), erscheinen `analytics-box`, `toc-box`, `gzf-intro` und `gzf-perspektiven` mit einem schmutzigen Dunkel-Rötlichton statt einem hellen Grau.

**IST (`Newsletter/template.html`, Zeilen 121, 193, 218, 300):**
```css
background: var(--color-surface, #1c1818);
```

**SOLL:**
```css
background: var(--color-surface, #f7f7f7);
```

**Dateien:** `/Users/moritz/Desktop/Newsletter/template.html`, Zeilen 121, 193, 218, 300  
**Aufwand:** Klein (4 Zeilen)

---

### K3 — "Neue Ausgabe"-Banner funktioniert nie für Erstbesucher (Logik-Bug)

`app.js` Zeile 387: `if (seen && seen !== latest.filename)`. Der Banner wird nur angezeigt wenn `seen` **gesetzt** ist (also der Nutzer eine Ausgabe bereits geöffnet hatte) UND die gespeicherte Ausgabe nicht der neuesten entspricht. Erstbesucher (kein LocalStorage-Eintrag) sehen den Banner nie — obwohl das der wichtigste Anwendungsfall wäre.

**IST (`app.js`, Zeilen 386–390):**
```js
const seen   = localStorage.getItem(SEEN_KEY);
if (seen && seen !== latest.filename) {
  showNewIssueBanner(latest);
}
```

**SOLL:** Erstbesucher sollen bei ihrer allerersten Sitzung die neueste Ausgabe angezeigt bekommen. Rückkehrende Nutzer sollen den Banner sehen wenn eine neue Ausgabe seit ihrem letzten Besuch erschienen ist:
```js
const seen = localStorage.getItem(SEEN_KEY);
// Erstbesucher: kein Eintrag → Banner zeigen
// Rückkehrer: Eintrag vorhanden aber anders als neuste → Banner zeigen
if (!seen || seen !== latest.filename) {
  showNewIssueBanner(latest);
}
```

**Datei:** `app.js` Z. 387  
**Aufwand:** Klein (1 Zeichen ändern: `seen &&` → `!seen ||`)

---

### K4 — `archiv.html`: Ausgaben-Daten müssen manuell doppelt gepflegt werden (Maintenance-Bug)

Bei jeder neuen Ausgabe müssen manuell drei Stellen synchron gehalten werden: (1) `archiv.html` AUSGABEN-Array (Zeilen 152–177), (2) `issues/meta.json`, (3) `feed.xml`. Die Schemas sind inkonsistent: `meta.json` hat `first_topic` + `word_count`, das Array in `archiv.html` hat `teaser` + `lesezeit` — zwei verschiedene Feldnamen für dasselbe Konzept. `archiv.html` könnte stattdessen `meta.json` per `fetch()` laden:

**IST (`archiv.html`, Zeilen 147–180):** Inline-AUSGABEN-Daten (Variante A).

**SOLL:** Variante B aktivieren und das Schema in `meta.json` angleichen:
```js
// archiv.html ladeAusgaben():
function ladeAusgaben() {
  return fetch('/morgenpost/issues/meta.json', { cache: 'no-store' })
    .then(r => r.json())
    .then(data => data.map(e => ({
      datum:    e.date,
      titel:    e.titel || 'Na und? – ' + e.date,
      teaser:   e.first_topic,
      lesezeit: e.word_count,   // Feldname in meta.json anpassen: "reading_time_min"
      bild:     '/morgenpost/' + e.image_url,
      url:      '/morgenpost/issues/' + e.filename
    })));
}
```

Außerdem sollte in `meta.json` das Feld `word_count` in `lesezeit_min` umbenannt werden, da es tatsächlich Minuten enthält (Ausgabe 28. April: 22 Minuten ≈ ~4400 Wörter ist realistisch, aber der Name ist irreführend).

**Dateien:** `archiv.html` Z. 152–177, `issues/meta.json`  
**Aufwand:** Mittel

---

## Hohe Priorität (Design & Lesbarkeit)

### H1 — `design-tokens.css` vermischt Token-Definitionen mit Komponenten-Overrides (Architektur)

Die Datei `design-tokens.css` enthält ab Zeile 283 nicht nur CSS-Custom-Properties, sondern 49 Komponenten-Selektoren (`.gzf-*`, `.masthead-*`, `.toc-*`, `.analytics-*`, `.featured-*`, `.subscribe`, `.arch-*` etc.) als Override-Layer. Das macht die Datei zu einer Mischung aus Design-System und Reset-Sheet.

**Problem:** Ein echter Design-Token-File sollte ausschließlich `:root`-Variablen enthalten. Die Override-Regeln gehören in `article-layout.css` oder eine eigene `overrides.css`. Durch die Mischung ist unklar, wo neue Komponentenregeln hingehören, und die 107 `!important`-Deklarationen in `design-tokens.css` sind ein Signal für Spezifitätsprobleme (der Override-Layer kämpft gegen die Template-Stile).

**SOLL:** Zeilen 1–182 (reine Token-Definitionen) bleiben in `design-tokens.css`. Zeilen 283–569 (Artikel-Overrides) in eine neue Datei `article-overrides.css` auslagern.

**Dateien:** `design-tokens.css`  
**Aufwand:** Mittel

---

### H2 — Staticrypt-Login-Seite ist ungebrandetes Fremddesign

Der Login-Screen (sichtbar für jeden Nutzer vor dem Entschlüsseln) hat den Titel „Protected Page", einen grünen `#4CAF50`-Button (DECRYPT), keine deutschen Texte und keinen Na-und?-Bezug. Das ist der allererste Eindruck für neue Abonnenten und passt überhaupt nicht zum NYT-Stil der eigentlichen Seite.

**IST (in allen verschlüsselten HTML-Dateien):**
```css
background: #4CAF50;
/* ... */
background: #76B852;
```
```html
<p class="staticrypt-title">Protected Page</p>
<input type="submit" value="DECRYPT" />
```

**SOLL:** Staticrypt unterstützt eigene Templates. Eine `staticrypt-template.html` mit Na-und?-Branding (Playfair Display, NYT-Akzentblau `#326891`, deutschsprachige Texte) sollte als Custom Template eingebaut werden:
```
staticrypt --template ./staticrypt-template.html ...
```

**Dateien:** Alle `*.html` (Neugeneration nötig)  
**Aufwand:** Mittel

---

### H3 — Inkonsistente Font-Size-Einheiten: `pt` vs `rem` vs `px`

`app.js` (Zeilen 36, 46) setzt Schriftgrößen in `pt` (`11pt` als Basis), während das CSS-System komplett auf `rem`/`px`/`clamp()` aufgebaut ist (z. B. `--font-size-md: 1rem`). Die `applyFont()`-Funktion setzt `document.body.style.fontSize = (11 + fontStep) + 'pt'`, was alle `rem`-Werte im System beeinflusst — aber der kompensierende Override für `.gzf-thema-body` (Zeile 46) rechnet erneut in `pt`. Das Template (`Newsletter/template.html`) verwendet ebenfalls `pt` für alle Schriftgrößen.

Dieses Einheiten-Chaos bedeutet: Die Schriftgrößen-Skalierung über den A+/A−-Button verhält sich unberechenbar, wenn Template-`pt`-Werte mit Web-`rem`-Werten zusammentreffen.

**SOLL:** Alle Schriftgrößen-Overrides in `app.js` auf `em`-basierte relative Skalierung umstellen:
```js
// Statt body.style.fontSize = (11 + fontStep) + 'pt'
document.documentElement.style.fontSize = (100 + fontStep * 8) + '%';
// und den separaten Override-Block streichen — rem-Werte skalieren automatisch
```

**Datei:** `app.js` Z. 35–47  
**Aufwand:** Klein bis Mittel (Testen erforderlich)

---

### H4 — Kein Font-Preloading → sichtbarer FOUT bei langsamen Verbindungen

Weder `archiv.html` noch `404.html` (und damit auch nicht die unverschlüsselten Seiten) haben `<link rel="preload">` für die kritischen Schriften. `font-display: swap` in `design-tokens.css` ist vorhanden (gut), aber ohne Preload sieht der Nutzer zuerst Systemschriften, dann springen die Seiten auf Playfair Display und Source Serif 4 um.

**IST:** Keine Preload-Links.

**SOLL (`archiv.html` `<head>`, nach den Meta-Tags):**
```html
<link rel="preload" href="/morgenpost/fonts/playfair-display-latin.woff2"
      as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/morgenpost/fonts/source-serif-4-regular-latin.woff2"
      as="font" type="font/woff2" crossorigin>
```
Inter nur bei Bedarf preloaden (wird nur für Labels/Meta-Text genutzt).

**Dateien:** `archiv.html` Z. 22, `404.html` Z. 21  
**Aufwand:** Klein

---

### H5 — Archivseite: Drop Cap in Template blau, im Web neutral (visueller Konflikt)

`Newsletter/template.html` Zeile 288: `color: var(--color-accent, #326891)` → blauer Drop Cap.  
`article-layout.css` Zeile 55: `color: var(--color-text)` → schwarzer Drop Cap.  
`design-tokens.css` Zeile 343: `color: var(--color-text) !important` → erzwingt neutral.

Der Override in `design-tokens.css` gewinnt im Web korrekt, aber das Template selbst ist falsch. Bei einer zukünftigen Design-Änderung des Drop Caps muss man an drei Stellen denken. Das Fallback in `template.html` sollte an die anderen Stellen angeglichen werden.

**IST (`Newsletter/template.html`, Zeile 288):**
```css
color: var(--color-accent, #326891);
```
**SOLL:**
```css
color: var(--color-text, #121212);
```

**Datei:** `/Users/moritz/Desktop/Newsletter/template.html` Z. 288  
**Aufwand:** Minimal

---

### H6 — `archiv.html`: Kein `<meta name="canonical">` und kein `<link rel="canonical">`

Ohne kanonische URL kann Google die Archivseite doppelt indexieren (z. B. mit und ohne Trailing Slash). Zwar steht `noindex` drin, aber die og:url-Tags sind vorhanden.

**SOLL:** Da `robots: noindex` gesetzt ist, ist das für SEO nicht kritisch — es sei denn, die Archivseite soll irgendwann indiziert werden. Den `noindex` entfernen und kanonischen Link ergänzen wäre dann der richtige Weg.

---

## Mittlere Priorität (Code-Qualität & Wartbarkeit)

### M1 — Service Worker cached keine CSS-Dateien außer `app.css`

`sw.js` (Zeilen 6–13) cached nur: `/morgenpost/`, `manifest.json`, `app.js`, `app.css`, Icons. `design-tokens.css`, `article-layout.css`, `archive-layout.css`, `scroll-animations.css` und `print.css` fehlen im Pre-Cache. Beim Offline-Besuch der Archivseite fehlt die Gestaltung komplett.

**IST (`sw.js`, Zeilen 6–13):**
```js
const STATIC = [
  '/morgenpost/',
  '/morgenpost/manifest.json',
  '/morgenpost/app.js',
  '/morgenpost/app.css',
  '/morgenpost/icons/icon-192.png',
  '/morgenpost/icons/icon-512.png',
];
```

**SOLL:** Alle CSS-Dateien ergänzen (und Cache-Version bumpen):
```js
const CACHE = 'naund-v10';
const STATIC = [
  '/morgenpost/',
  '/morgenpost/archiv.html',
  '/morgenpost/manifest.json',
  '/morgenpost/app.js',
  '/morgenpost/app.css',
  '/morgenpost/design-tokens.css',
  '/morgenpost/article-layout.css',
  '/morgenpost/archive-layout.css',
  '/morgenpost/scroll-animations.css',
  '/morgenpost/fonts/playfair-display-latin.woff2',
  '/morgenpost/fonts/source-serif-4-regular-latin.woff2',
  '/morgenpost/fonts/inter-latin.woff2',
  '/morgenpost/icons/icon-192.png',
  '/morgenpost/icons/icon-512.png',
];
```

**Datei:** `sw.js` Z. 5–13  
**Aufwand:** Klein

---

### M2 — Hartkodierte px-Werte in `app.css` außerhalb des Token-Systems

`app.css` enthält mehrere hartkodierte Pixel-Werte die nicht aus den Design-Tokens stammen:

| Zeile | Wert | Sollte sein |
|---|---|---|
| 61 | `font-size: 9px` | `var(--font-size-xs)` (≈11.5px) oder neue Token |
| 124 | `font-size: 9px` | `var(--font-size-xs)` |
| 154 | `font-size: 10px` | `var(--font-size-xs)` |
| 209 | `font-size: 11px` | `var(--font-size-xs)` |
| 250 | `font-size: 16px` | `var(--font-size-md)` |

Die 9px-Werte sind eigentlich kleiner als `--font-size-xs` (11.5px) — ein eigener Token `--font-size-2xs: 0.56rem` (~9px) wäre sinnvoll.

**Datei:** `app.css`  
**Aufwand:** Klein

---

### M3 — `print.css`: Logikfehler `flex-direction: column` auf `display: block`-Element

`print.css` Zeile 109: `.arch-issue-link` wird in Zeile 107 auf `display: block` gesetzt, danach folgt `flex-direction: column !important` (Zeile 109) — diese Eigenschaft hat bei einem Block-Element keine Wirkung. Das ist toter Code.

**IST (`print.css`, Zeilen 107–111):**
```css
.arch-issue-link {
  display: block !important;
  flex-direction: column !important;  /* wirkungslos */
  padding: 10px 0 !important;
```

**SOLL:** `flex-direction: column !important;` entfernen.

**Datei:** `print.css` Z. 109  
**Aufwand:** Minimal

---

### M4 — `will-change` permanent gesetzt statt nur beim Hover

`scroll-animations.css` Zeilen 8–12 setzen `will-change: transform, opacity` dauerhaft auf alle `.arch-card`- und `.featured-img`-Elemente. `will-change` ist ein Hinweis an den Browser, GPU-Schichten zu erstellen — bei vielen Karten gleichzeitig ein unnötiger Speicheraufwand. Besser: nur bei `hover` oder per JS kurz vor der Animation setzen.

**IST (`scroll-animations.css`, Zeilen 7–12):**
```css
.featured-img {
  will-change: transform;
}
.arch-card {
  will-change: transform, opacity;
}
```

**SOLL:**
```css
.arch-card:hover {
  will-change: transform;
}
.featured-img:hover {
  will-change: transform;
}
```

**Datei:** `scroll-animations.css` Z. 7–12  
**Aufwand:** Klein

---

### M5 — `meta.json` Feld `word_count` ist irreführend (Daten-Schema)

`issues/meta.json` enthält `"word_count": 22` für Ausgaben mit ~22 Minuten Lesezeit. 22 Wörter wäre viel zu wenig — es handelt sich offensichtlich um Minuten. Das Feld sollte `reading_time_min` heißen. Da `archiv.html` diesen Wert noch nicht aus `meta.json` liest (siehe K4), ist die Auswirkung aktuell gering — aber beim nächsten Refactor fehlerträchtig.

**Datei:** `issues/meta.json`, und ggf. der Generator der die Datei erzeugt  
**Aufwand:** Klein

---

### M6 — Thema-Share-Button HTML-Entität `&#8599;` statt SVG

`app.js` Zeile 301: `btn.innerHTML = '&#8599;'` (↗ als Unicode-Zeichen). Konsistent mit allen anderen Buttons würde hier ein SVG-Icon passen — das ↗-Zeichen skaliert nicht zuverlässig über alle Schriftgrößen und Betriebssysteme.

**Datei:** `app.js` Z. 301  
**Aufwand:** Klein

---

## Niedrige Priorität (Nice-to-have)

### N1 — Keine `<link rel="preconnect">` für externe Ressourcen

GSAP wird über CDN geladen (aus dem verschlüsselten Index-Inhalt). Wenn dieser CDN-Link ein `cdnjs.cloudflare.com` oder ähnliches ist, würde ein `preconnect` die DNS-Auflösung beschleunigen. Da der Inhalt verschlüsselt ist, lässt sich das von außen nicht verifizieren — aber der HTML-Head der unverschlüsselten Seiten zeigt keine `preconnect`-Links.

---

### N2 — Benachrichtigungs-Prompt timing und Sichtbarkeit

`app.js` Zeile 451: `setTimeout(() => { ... }, 8000)` — der Notification-Prompt erscheint nach 8 Sekunden auf der Startseite. Für Mobilnutzer die schnell scrollen erscheint das Overlay störend genau dann, wenn sie sich in den Inhalt einlesen. Eine Scroll-basierte Auslösung (nach 50% der Seite) wäre nutzerfreundlicher. Außerdem fehlt die Dismissal-Persistenz über die Notification-Ablehnung hinaus: Wenn der Nutzer `Nein` drückt, wird `naund-notif-dismissed` gesetzt — aber wenn er den Tab schließt ohne zu klicken, erscheint der Prompt beim nächsten Besuch erneut.

---

### N3 — `archiv.html`: Suchfeld ohne Debounce auf erstem Input

`archiv.html` Zeile 349: `debounce(function() {...}, 150)` ist vorhanden — gut. In `app.js` Zeilen 420–430 (Suche auf der Indexseite) fehlt der Debounce allerdings komplett:
```js
input.addEventListener('input', () => {  // kein debounce!
  const q = input.value.trim().toLowerCase();
  cards.forEach(card => { ... });
});
```
Bei vielen Ausgaben kann das Ruckeln verursachen.

---

### N4 — `app.js`: `naund-dark` Klasse wird entfernt aber nie gesetzt

`app.js` Zeile 23: `document.documentElement.classList.remove('naund-dark')` — diese Klasse wird nirgendwo im Projekt als CSS-Selektor genutzt und auch nie hinzugefügt. Es ist ein Überbleibsel aus einer früheren Version (vermutlich vor der `data-theme`-Methode). Toter Code.

**Datei:** `app.js` Z. 23  
**Aufwand:** Minimal (eine Zeile löschen)

---

### N5 — RSS-Feed und archiv.html nicht automatisch synchronisiert

`feed.xml` wird wie `archiv.html` manuell aktualisiert. Bei drei parallelen Pflegepfaden (archiv.html, meta.json, feed.xml) ist das Vergessen einer Datei bei der nächsten Ausgabe wahrscheinlich. Idealerweise sollte ein Deploy-Skript alle drei aus einer einzigen Quelle generieren.

---

### N6 — `archiv.html` fehlt `role="banner"` auf dem `<header>`-Element

`archiv.html` Zeile 54: `<header class="arch-masthead">` — ohne `role="banner"`. Zum Vergleich hat `404.html` Zeile 38: `<header class="arch-masthead" role="banner">`. Inkonsistente ARIA-Attribute.

**SOLL (`archiv.html`, Z. 54):**
```html
<header class="arch-masthead" role="banner">
```

**Datei:** `archiv.html` Z. 54  
**Aufwand:** Minimal

---

### N7 — `arch-issue-link` fehlt `aria-label` mit Ausgabentitel

Die Archiv-Karten sind `<a href="...">` Links ohne `aria-label`. Screen Reader lesen den gesamten Textinhalt vor (`Dienstag, 28. April 2026 Na und? – Dienstag, 28. April 2026 ...`). Ein präzises `aria-label="Ausgabe vom 28. April 2026 lesen"` wäre zugänglicher. Das könnte in `erstelleKarte()` (`archiv.html` Z. 209) gesetzt werden.

---

## Architektur-Bewertung

### Stärken

Das Projekt ist für seine Größe (privater Newsletter, 3 Ausgaben bisher) erstaunlich gut strukturiert. Die wichtigsten Stärken:

- **Design-Token-System** ist vorhanden und konsequent (Farben, Abstände, Typografie alle als Custom Properties)
- **Hell/Dunkel-Modus** funktioniert ohne Flash of unstyled content dank inline Theme-Script vor dem first paint
- **Graceful Degradation** ist durchdacht: JS-Animationen nur wenn kein `prefers-reduced-motion`, GSAP-Prüfung am Anfang, IntersectionObserver-Fallback
- **PWA-Features** (Service Worker, Manifest, Push) sind implementiert
- **Accessibility-Grundlagen** (Skip-Links, ARIA-Labels, sr-only, focus-visible) sind vorhanden
- **Mobile Responsiveness** ist mit drei Breakpoints (600px, 768px, 1024px) abgedeckt

### Schwächen

- **Doppelte Datenpflege**: Neue Ausgabe = 3–4 manuelle Edits (archiv.html, meta.json, feed.xml, ggf. sw.js)
- **Architektur-Trennung**: `design-tokens.css` ist gleichzeitig Token-Datei und Override-Sheet (~107 `!important`)
- **Template-Drift**: `Newsletter/template.html` lebt außerhalb des Web-Repos, hat teilweise veraltete Fallback-Farben und divergiert vom Web-Design (Drop Cap blau vs. neutral)
- **`design-tokens.css` doppelt geladen**: @import + `<link>` gleichzeitig
- **Keine automatisierte Pipeline**: Kein Build-Step, keine Generierung von Seiten aus Daten

### Skalierbarkeit

Bei 3 Ausgaben noch handhabbar. Ab ~10–15 Ausgaben wird das manuelle Pflegen von `archiv.html` problematisch. Der Wechsel zu Variante B (meta.json per fetch) wäre dann dringend. Ab ~50 Ausgaben würde ein statischer Site-Generator (z. B. 11ty) oder zumindest ein einfaches Generierungs-Skript den Wartungsaufwand drastisch senken.

---

## Konkrete nächste Schritte

### Schritt 1 — Doppeltes CSS-Laden beheben `→ design-tokens.css` entfernen aus `<link>` (Klein)

**Was:** In `archiv.html` Zeile 28 und `404.html` Zeile 26 den `<link rel="stylesheet" href="...design-tokens.css">` entfernen.  
**Warum:** Behebt einen stillen Performance-Bug und den @import-Render-Blocking-Waterfall. Sofortige Wirkung auf Ladezeit.

---

### Schritt 2 — Falschen Fallback-Wert in `template.html` korrigieren (Klein)

**Was:** `Newsletter/template.html`, 4 Vorkommen von `var(--color-surface, #1c1818)` auf `var(--color-surface, #f7f7f7)` ändern.  
**Warum:** Verhindert, dass Ausgaben beim Öffnen ohne externe CSS-Tokens mit dunklem Rotton erscheinen. Visuell sofort sichtbar für alle Nutzer, die die HTML-Datei direkt öffnen oder im E-Mail-Client lesen.

---

### Schritt 3 — Archiv per `meta.json` laden statt Inline-Daten (Mittel)

**Was:** `archiv.html` von Variante A (inline AUSGABEN) auf Variante B (fetch aus meta.json) umstellen. Schema in `meta.json` anpassen (`word_count` → `lesezeit_min`, `first_topic` → `teaser`, `titel` ergänzen).  
**Warum:** Beendet die doppelte Datenpflege bei neuen Ausgaben. Einmalige Änderung an meta.json reicht künftig aus.

---

### Schritt 4 — Font-Preloading ergänzen (Klein)

**Was:** In `archiv.html` und `404.html` je zwei `<link rel="preload">` für Playfair Display und Source Serif 4 hinzufügen.  
**Warum:** Eliminiiert den visuell störenden Font-Tausch (FOUT) beim Seitenaufruf. Sichtbarer visueller Qualitätsgewinn, besonders auf mobilen Verbindungen.

---

### Schritt 5 — Service Worker Cache vervollständigen (Klein)

**Was:** `sw.js`: Cache-Version auf `naund-v10` bumpen, alle CSS-Dateien + Schriften zu `STATIC` ergänzen.  
**Warum:** Erst dann funktioniert die Archivseite (und die App insgesamt) wirklich offline. Aktuell würde ein Offline-Besuch der Archivseite ohne Styling enden.
