# WebBuilder — JavaScript

Modulare JavaScript-Struktur des Website-Builders.

## Aktueller Stand

- `builder.js` — **aktiver zentraler Builder-Kern**; wird in dieser Phase bewusst noch nicht aufgeteilt.
- `state.js` — zukünftiger zentraler Builder-State.
- `canvas.js` — zukünftige Canvas-/Drag-&-Drop-Logik.
- `elements.js` — zukünftige Elementtypen und Elementdaten.
- `inspector.js` — zukünftige Eigenschaften- und Auswahl-Logik.
- `toolbar.js` — zukünftige Toolbar- und Editor-Steuerung.
- `header-footer.js` — zukünftige Kopf-/Fußzeilen-Logik.
- `cart.js` — zukünftige Warenkorb-Logik.
- `modals.js` — zukünftige Modal-/Dialog-Logik.
- `storage.js` — zukünftige Speicherung und Projektzustand.
- `preview.js` — zukünftige Vorschau-/Runtime-Logik.
- `supabase.js` — bestehende Supabase-Anbindung.
- `supabase-config.js` — bestehende Supabase-Konfiguration.

Die neuen Module sind zunächst nur strukturelle Platzhalter. Es werden bewusst keine Imports/Exports oder Runtime-Abhängigkeiten eingeführt, damit `builder.js` unverändert weiterlaufen kann. Die eigentliche JS-Aufteilung erfolgt später kontrolliert.
