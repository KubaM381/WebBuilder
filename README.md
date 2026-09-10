# WebBuilder

Professioneller visueller Website-Builder mit HTML, CSS, JavaScript und Supabase-Anbindung.

## Aktuelle Projektstruktur

```text
WebBuilder/
├── index.html
├── web.html
├── css/
│   ├── styles.css          # aktuell aktive Gesamt-CSS-Datei
│   ├── base.css            # globale Basis / Variablen / Typografie
│   ├── layout.css          # grundlegendes Layout
│   ├── toolbar.css         # Toolbar
│   ├── sidebar.css         # linke Seitenleiste
│   ├── inspector.css       # Eigenschaften-/Inspector-Bereich
│   ├── canvas.css          # Canvas und Builder-Fläche
│   ├── elements.css        # Elemente und Elementdarstellung
│   ├── modals.css          # Modals und Dialoge
│   └── responsive.css      # Responsive Regeln
└── js/
    ├── builder.js          # zentraler Builder-Kern / Bootstrap
    ├── state.js            # zentraler Builder-State
    ├── canvas.js           # Canvas, Drag & Drop und Canvas-Steuerung
    ├── elements.js         # Elementtypen, Elementdaten und Icons
    ├── inspector.js        # Auswahl, Eigenschaften und Elementaktionen
    ├── toolbar.js          # Toolbar und Editor-Steuerung
    ├── header-footer.js    # Header-/Footer-Logik
    ├── cart.js             # Produkte und Warenkorb
    ├── modals.js           # Modal-/Dialog-Logik
    ├── storage.js          # Speicherung, Projektzustand und History
    ├── preview.js          # Vorschau und Action-Runtime
    ├── supabase.js         # Supabase-Anbindung
    └── supabase-config.js  # Supabase-Konfiguration
```

## JavaScript-Architektur

Die `js/`-Struktur ist bewusst auf wenige größere fachliche Module begrenzt. Es werden keine zusätzlichen `*-runtime.js`, `*-core.js`, `products.js`, `history.js` oder ähnlichen Mini-/Hilfsdateien für die Builder-Laufzeit angelegt, sofern kein zwingender architektonischer Grund besteht.

### Verantwortlichkeiten

- `builder.js` — zentraler Bootstrap und Builder-Kern. In dieser Phase bewusst nicht weiter aufteilen.
- `state.js` — zentraler Zustand, State-Änderungen und gemeinsame Builder-Daten.
- `canvas.js` — Canvas-Rendering, Drag & Drop, Zoom und Canvas-Steuerung.
- `elements.js` — Elementtypen, Elementdaten und Icon-Registry.
- `inspector.js` — Auswahl, Eigenschaften, Aktionen und spezielle Element-Einstellungen.
- `toolbar.js` — Toolbar- und Editor-Steuerung.
- `header-footer.js` — Header-/Footer-Zustand und Editor-Funktionen.
- `cart.js` — Produktdaten, Produktnormalisierung, Warenkorb und Warenkorb-Konfiguration.
- `modals.js` — Modal- und Dialogfunktionen.
- `storage.js` — Speicherung, Projektzustand und History-Funktionen.
- `preview.js` — Preview-Modus und Action-/Link-Runtime.
- `supabase.js` — bestehende Supabase-Anbindung.
- `supabase-config.js` — Supabase-Konfiguration.

## Regeln für KI-Änderungen

1. Zuerst die für die Aufgabe relevanten Module und deren direkte Abhängigkeiten lesen.
2. Nicht das gesamte Projekt lesen, wenn die Aufgabe auf wenige Module begrenzt werden kann.
3. Keine funktionierende Logik ohne konkreten Grund umschreiben.
4. Die bestehende 13-Dateien-JS-Struktur beibehalten.
5. Keine neuen Runtime-, Core-, Helper- oder Mini-Dateien erzeugen, wenn die Funktion sinnvoll in ein bestehendes Hauptmodul gehört.
6. `builder.js` nicht weiter aufteilen, solange dies nicht ausdrücklich entschieden wurde.
7. Bei Änderungen an einem Modul dessen öffentliche Schnittstellen (`window.WebBuilder...`) und Abhängigkeiten erhalten oder bewusst anpassen.
8. Nach strukturellen Änderungen Script-Reihenfolge, Imports/Pfade und Abhängigkeiten prüfen.
9. Bestehende Funktionen müssen nach Änderungen erhalten bleiben.
10. Supabase-Schlüssel und sonstige Secrets niemals ins Frontend oder in öffentliche Dateien einbauen.
11. Bei größeren Umbauten zuerst die betroffenen Module und Abhängigkeiten verstehen, dann gezielt ändern.

## CSS-Architektur

Die CSS-Dateien bilden die geplante fachliche Struktur. `styles.css` bleibt aktuell die aktive Gesamt-CSS-Datei, damit das bestehende Erscheinungsbild stabil bleibt. Eine spätere CSS-Migration soll kontrolliert und ohne unnötige Selektoränderungen erfolgen.

## Supabase

Supabase wird für Backend-/Datenbankfunktionen des Projekts verwendet. Datenbankstruktur, Policies und Sicherheitskonfiguration werden separat gepflegt.

## Entwicklungsprinzip

**Erst stabilisieren, dann gezielt modularisieren, danach erweitern.**
