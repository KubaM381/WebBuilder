# WebBuilder — JavaScript

Modulare JavaScript-Struktur des Website-Builders.

- `builder.js` — Einstiegspunkt / bestehende Builder-Kernlogik
- `elements.js` — Elementtypen und Elementdaten
- `dragdrop.js` — Drag & Drop
- `inspector.js` — Eigenschaften und Auswahl
- `toolbar.js` — Toolbar und Editor-Steuerung
- `preview.js` — Vorschau und Laufzeitverhalten
- `export.js` — HTML/CSS-Export und späteres Publishing
- `storage.js` — Autosave, lokale Speicherung und Projektzustand
- `supabase.js` — Supabase-Anbindung

Die Module werden schrittweise aus der bisherigen großen `builder.js` herausgelöst, damit bestehende Funktionen nicht versehentlich verloren gehen.
