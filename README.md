# WebBuilder

Professioneller visueller Website-Builder mit HTML/CSS/JavaScript und Supabase-Anbindung.

## Projektstruktur

```text
WebBuilder/
├── index.html
├── web.html
├── css/
│   ├── styles.css          # aktuell weiterhin aktive Gesamt-CSS-Datei
│   ├── base.css            # modulare Zielstruktur
│   ├── layout.css
│   ├── toolbar.css
│   ├── sidebar.css
│   ├── inspector.css
│   ├── canvas.css
│   ├── elements.css
│   ├── modals.css
│   └── responsive.css
└── js/
    ├── builder.js          # aktuell weiterhin zentrale Builder-Logik
    ├── state.js
    ├── canvas.js
    ├── elements.js
    ├── inspector.js
    ├── toolbar.js
    ├── header-footer.js
    ├── cart.js
    ├── modals.js
    ├── storage.js
    ├── preview.js
    ├── supabase.js
    └── supabase-config.js
```

## Modularisierungsstrategie

Die Struktur wird schrittweise modernisiert, ohne den funktionierenden Builder unnötig zu gefährden.

### Phase 1 — Struktur
- Neue CSS- und JS-Module anlegen.
- Dokumentation aktualisieren.
- `builder.js` bleibt unverändert.
- `styles.css` bleibt zunächst die aktive CSS-Datei.
- Neue JS-Dateien enthalten zunächst keine aktive Builder-Logik.

### Phase 2 — CSS-Migration
Die Regeln aus `styles.css` werden nach Verantwortlichkeit auf die neuen CSS-Dateien verteilt. Dabei werden Selektoren nicht unnötig umbenannt und das bestehende Erscheinungsbild bleibt erhalten.

### Phase 3 — JS-Migration
Erst nachdem die CSS-Struktur stabil ist, wird `builder.js` schrittweise nach Verantwortlichkeiten aufgeteilt. Abhängigkeiten werden über klare Imports/Exports organisiert.

## Wichtige Regeln für KI-Änderungen

1. Vor Änderungen zuerst die relevante Datei und ihre Abhängigkeiten prüfen.
2. Keine funktionierende Logik ohne Grund umschreiben.
3. `builder.js` in der aktuellen Phase nicht aufteilen.
4. CSS nur nach klaren Verantwortlichkeiten modularisieren.
5. Keine unnötigen Mini-Dateien erzeugen.
6. Imports, Pfade und Abhängigkeiten nach jeder strukturellen Änderung prüfen.
7. Supabase-Schlüssel niemals in unsichere oder unnötig exponierte Stellen verschieben.
8. Bei größeren Umbauten zuerst die Architektur dokumentieren und dann schrittweise migrieren.
9. Bestehende Funktionen müssen nach jeder Migration weiterhin funktionieren.

## Supabase

Supabase wird für Backend-/Datenbankfunktionen des Projekts verwendet. Die eigentliche Datenbankstruktur und Sicherheitskonfiguration wird separat gepflegt.

## Entwicklungsprinzip

**Erst stabilisieren, dann modularisieren, danach erweitern.**
