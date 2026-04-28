# Na und? – Integration Phase 4: Archivseite

## Neue Dateien

| Datei | Ort | Zweck |
|---|---|---|
| `archiv.html` | `Morgenpost-Web/` | Vollständige Archivseite |
| `archive-layout.css` | `Morgenpost-Web/` | Styles für die Archivseite |

## Einbindungsreihenfolge

Jede Seite bindet CSS in dieser Reihenfolge ein:

```html
<link rel="stylesheet" href="/morgenpost/design-tokens.css">
<link rel="stylesheet" href="/morgenpost/app.css">
<link rel="stylesheet" href="/morgenpost/archive-layout.css">  <!-- nur archiv.html -->
```

`design-tokens.css` muss immer zuerst geladen sein — alle Custom Properties (`--color-*`, `--font-*`, `--space-*` etc.) werden dort definiert.

## Neue Ausgabe hinzufügen

### Schritt 1 – Daten-Array in `archiv.html` erweitern

Öffne `archiv.html` und suche nach `var AUSGABEN = [`. Füge einen neuen Eintrag **am Anfang** des Arrays ein (neueste Ausgabe zuerst):

```js
var AUSGABEN = [
  {
    datum:    '2026-05-02',               // ISO-Datum YYYY-MM-DD
    titel:    'Na und? – Freitag, 2. Mai 2026',
    teaser:   'Hauptthema der Ausgabe – kurze Beschreibung',
    lesezeit: 22,                         // Minuten (word_count aus meta.json)
    bild:     '/morgenpost/issues/images/2026-05-02_na-und_1.jpg',
    url:      '/morgenpost/issues/2026-05-02_na-und.html'
  },
  // ... vorherige Ausgaben ...
];
```

### Schritt 2 – Datei deployen

```bash
cd ~/Desktop/Morgenpost-Web
git add archiv.html
git commit -m "Archiv: Ausgabe 2026-05-02 ergänzt"
git push
```

## Automatisierung (Variante B)

Statt manuellem Eintrag kann `newsletter.py` eine externe `ausgaben.json` schreiben. Dazu in `archiv.html` die `ladeAusgaben()`-Funktion ersetzen:

```js
function ladeAusgaben() {
  return fetch('/morgenpost/ausgaben.json').then(function (r) { return r.json(); });
}
```

Das Format von `ausgaben.json` entspricht dem `AUSGABEN`-Array (Array von Objekten mit `datum`, `titel`, `teaser`, `lesezeit`, `bild`, `url`). Das statische `var AUSGABEN = [...]` in `archiv.html` kann dann entfernt werden.

## JSON-Struktur pro Ausgabe

```json
{
  "datum":    "2026-04-28",
  "titel":    "Na und? – Dienstag, 28. April 2026",
  "teaser":   "Hauptthema der Ausgabe – ein bis zwei Sätze",
  "lesezeit": 22,
  "bild":     "/morgenpost/issues/images/2026-04-28_na-und_1.jpg",
  "url":      "/morgenpost/issues/2026-04-28_na-und.html"
}
```

| Feld | Typ | Quelle |
|---|---|---|
| `datum` | `"YYYY-MM-DD"` | Dateiname der Ausgabe |
| `titel` | String | Manuell oder aus `<title>` der Ausgabe |
| `teaser` | String | `first_topic` aus `meta.json` |
| `lesezeit` | Zahl (Minuten) | `word_count` aus `meta.json` |
| `bild` | Pfad-String | `image_url` aus `meta.json` (mit `/morgenpost/`-Präfix) |
| `url` | Pfad-String | `/morgenpost/issues/DATEINAME.html` |

## „Alle Ausgaben →"-Link für die Startseite

Diesen Snippet am Ende des Archiv-Bereichs auf `index.html` einfügen (nach den letzten 3–4 Ausgaben-Karten):

```html
<div style="text-align:right;margin-top:16px;border-top:1px solid var(--color-border);padding-top:12px;">
  <a href="/morgenpost/archiv.html"
     style="font-family:var(--font-sans);font-size:0.72rem;font-weight:600;
            text-transform:uppercase;letter-spacing:0.12em;color:var(--color-accent);
            text-decoration:none;">
    Alle Ausgaben →
  </a>
</div>
```

## Bestehende Ausgaben-HTML-Dateien

Die Dateien in `issues/` (z. B. `2026-04-28_na-und.html`) werden **nicht verändert**. Die Archivseite verlinkt nur auf sie. Die Verschlüsselung via staticrypt bleibt unberührt — Besucher werden beim Klick auf „Lesen →" nach dem Passwort gefragt.

## Theme-Toggle

Die Archivseite nutzt das selbe `app.js` wie alle anderen Seiten. Die Toolbar (Theme-Toggle, Schriftgröße) wird von `app.js` automatisch injiziert — kein zusätzliches HTML nötig. Das Dunkelmodus-Theme wird aus `localStorage` (`naund-dark`) gelesen, identisch zu den Ausgaben-Seiten.
