# WebBuilder

Visueller Drag-and-Drop-Website-Baukasten (Vanilla JS, kein Build-Tool/Framework). Nutzer platzieren Elemente per Drag-and-Drop, gestalten Header/Footer, verwalten Produkte und einen Warenkorb, und speichern Projekte lokal oder in Supabase.

## Projektstruktur

```text
WebBuilder/
├── web.html              # einzige HTML-Einstiegsseite (Editor-UI)
├── README.md             # dieses Dokument
├── css/
│   ├── README.md         # CSS-Architektur, Details siehe dort
│   └── *.css
└── js/
    ├── README.md         # Modulübersicht, Details siehe dort
    └── *.js
```

> `index.html` wird aktuell nicht mehr aktiv genutzt/ist nicht Teil des laufenden Builders. Falls sie im Repo noch existiert: vor dem nächsten größeren Umbau prüfen, ob sie gelöscht werden kann.

## Kernarchitektur in Kürze

- **Ein zentraler State**: `js/state.js` definiert `window.WebBuilderState` – die einzige Quelle der Wahrheit für Elemente, Produkte, Warenkorb, Header/Footer, Hintergrund, Zoom, History.
- **Pub/Sub statt direkter Kopplung**: Module ändern den State und rufen `state.notify(domain, action, payload)` auf; andere Module hören per `state.subscribe(fn)` auf Domains, die sie betreffen (`"elements"`, `"products"`, `"cart"`, `"header"`, `"footer"`, `"preview"`, `"background"`, `"selection"`).
- **Eine Serialisierungsform für alles**: `js/storage.js` → `createSnapshot()` / `applySnapshot()`. Wird von lokalem Speichern, Undo/Redo **und** Supabase-Cloud-Speichern gemeinsam genutzt. Wer eine neue speicherbare Eigenschaft einführt, muss sie **hier** ergänzen, sonst geht sie beim Speichern/Laden verloren.
- **Ein Modul pro Fachbereich**, das sich selbst beim Laden initialisiert (`DOMContentLoaded`) und seine API unter `window.WebBuilderXxx` bereitstellt. Details: siehe `js/README.md`.
- **Ladereihenfolge ist wichtig**: `js/builder.js` lädt alle Module nacheinander per `document.write`. `products.js` **muss vor** `cart.js` stehen (cart.js referenziert Produkte nur über `window.WebBuilderProducts`).

## Supabase-Schema

```text
projects (id, user_id, name, slug, updated_at)
   └── pages (id, project_id, name, slug, content JSON, updated_at)
```

`content` in `pages` ist exakt das Ergebnis von `WebBuilderStorage.createSnapshot()` – niemals ein eigenes, abweichendes Format bauen.

## Sicherheit

- Im Client (`js/supabase-config.js`) darf **ausschließlich** der Publishable Key stehen, niemals ein Secret/Service-Role-Key.
- Zugriffsrechte laufen über Supabase Row Level Security (RLS) auf DB-Ebene, nicht über Client-Logik.

## Für die Weiterentwicklung (auch für KI-Assistenten)

1. Vor jeder Änderung: nur die tatsächlich betroffenen Dateien lesen (siehe `js/README.md` für "wer macht was").
2. Keine Refactorings "nebenbei" – wenn eine strukturelle Verbesserung sinnvoll erscheint, vorschlagen statt ungefragt umsetzen.
3. Neue speicherbare State-Felder immer auch in `storage.js` (`createSnapshot`/`applySnapshot`) ergänzen.
4. Neue Kommentare bitte kurz halten (Warum, nicht Bug-Historie). Die Historie gehört in Commit-Messages.

## Bekannte technische Schulden

Eine ausführliche, kategorisierte Liste (tote Funktionen, doppelte Logik, Formatierungs-Inkonsistenzen, veraltete Dokumentation, Architekturvorschläge) wurde im Rahmen eines Code-Reviews erstellt und im Chat-Verlauf mit dem Entwickler dokumentiert. Kurzfassung:

- Ein paar exportierte Funktionen werden nirgends aufgerufen (`WebBuilderElements.createLegacyProxy`, `WebBuilderCanvas.makeDraggable`-Alias, `WebBuilderCart`-Produkt-Delegationsmethoden) – Kandidaten zum Entfernen.
- Die "Array in-place statt komplett neu erzeugen"-Normalisierung ist in `cart.js`, `products.js` und `header-footer.js` dreimal fast identisch implementiert – Kandidat für eine gemeinsame Utility-Funktion.
- Icon-Map wird in `elements.js`, `canvas.js` und `export.js` dreimal unabhängig zusammengebaut (`canvas.js` dupliziert sogar die Icon-SVGs) – auf eine zentrale Funktion reduzieren.
- `inspector.js`, `cart.js`, `elements.js`, `preview.js` sind stark verdichtet (viele Anweisungen pro Zeile) – schwerer zu lesen als der Rest des Projekts, sollte bei nächster Berührung auf den übrigen Stil (mehrzeilig, eine Anweisung pro Zeile) vereinheitlicht werden.
- `supabase.js` ist die größte Datei und vermischt Daten-CRUD mit UI-Rendering des Cloud-Modals – Kandidat für einen Split analog zu `products.js`/`cart.js`.
