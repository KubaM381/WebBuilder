# JavaScript-Architektur

Kein Bundler, kein Framework. Alle Module hängen ihre öffentliche API an `window.WebBuilderXxx`. `js/builder.js` lädt alle anderen Dateien in fester Reihenfolge per `document.write` – **die Reihenfolge in `builder.js` ist funktional relevant**, nicht nur kosmetisch.

## Ladereihenfolge (aus `builder.js`)

```text
state.js → toast.js → storage.js → elements.js → products.js → cart.js
→ canvas.js → inspector.js → toolbar.js → header-footer.js → export.js
→ modals.js → preview.js → supabase-config.js (Modul) → supabase.js (Modul)
```

Wichtigste Abhängigkeit: **`products.js` vor `cart.js`**, da `cart.js` Produkte ausschließlich über `window.WebBuilderProducts` referenziert (keine eigenen Produktdaten).

## Zentrale Bausteine

### `state.js`
Definiert `window.WebBuilderState` – den kompletten Anwendungszustand (Elemente, Produkte, Warenkorb, Header/Footer, Hintergrund, Zoom, History-Stacks). Stellt außerdem das Event-System bereit:

- `state.subscribe(fn)` – Listener registrieren, bekommt `{domain, action, payload, state}`.
- `state.notify(domain, action, payload)` – von jedem Modul aufgerufen, wenn sich seine Daten ändern.

Jedes andere Modul liest/schreibt ausschließlich über dieses `state`-Objekt – kein Modul hält eigenen, parallelen Zustand.

### `storage.js`
Exponiert `window.WebBuilderStorage` und `window.WebBuilderHistory`.

- `createSnapshot()` / `applySnapshot()` sind die **einzige** Serialisierungsform des gesamten Projekts – genutzt von lokalem Speichern, Undo/Redo und Supabase. Neue speicherbare Felder müssen hier ergänzt werden.
- `armHistory()` / `commitHistory()` kapseln eine Undo-Transaktion (vor einer Änderung "scharf machen", danach "committen").
- `WebBuilderHistory.undoSnapshot()` / `.redoSnapshot()` liefern Snapshots zum Zurück-/Wiederherstellen.

### `toast.js`
`window.WebBuilderToast.show(message, type)` – einzige Stelle für die unten rechts gestapelten Benachrichtigungen.

### `modals.js`
`window.WebBuilderModals` – generisches zentrales Modal (`open`, `openMessage`, `close`) sowie `openPositionedMessage()` für frei positionierte Meldungen (oben/unten/links/rechts/zentriert, konfigurierbar im Inspector).

## Fachliche Domänen-Module

### `elements.js`
Canvas-Elemente (Text, Headline, Button, Bild, Box, Shape, Icon) als reine Daten: CRUD (`add`, `update`, `remove`, `duplicate`), Auswahl (`setSelected`/`getSelected`). Enthält außerdem die **Icon-Registry** (`window.WebBuilderIconRegistry`: `register`, `get`, `getAll`, `addCustom`, `getCustomNames`) – reine Daten/Registry, kein DOM-Zugriff.

### `canvas.js`
Rendering der Canvas-Elemente, Zoom, Zeichenflächen-Größe, Drag-and-Drop aus der Palette, Hintergrund-Editor-Bindung, Palette-UI für eigene Icons. Besitzt außerdem den **gemeinsamen Interaktions-Controller** `attachInteraction()` (Klick + Drag über Pointer Events, mit Bewegungsschwelle und `state.dragLock`), den auch `header-footer.js` für Bar-Elemente wiederverwendet.

### `inspector.js`
Rechtes Eigenschaften-Panel für normale Canvas-Elemente: Textinhalt, Bild, Größe, Textformat, Klick-Aktionen (`actionType`/`actionUrl`/`actionMsg`/`productId`), erweiterte Eigenschaften (Icon-Rahmen, Formstil, Modal-Inhalt, Meldungsposition), Duplizieren/Löschen.

### `header-footer.js`
Eigenständige Domäne für Header/Footer: Zustand, Rendering der Leisten samt Elementen auf dem Canvas, Resize-Handle, sowie das **eigene rechte Inspector-Panel** für Bar-Elemente (separat vom normalen Element-Inspector, da beide Panels sich gegenseitig ausschließen).

### `products.js`
Produktverwaltung: CRUD + Normalisierung + das Rendering/die Bedienung des Produkt-Tabs (`#product-list`, `#btn-add-product`). `window.WebBuilderProducts` ist die kanonische Schnittstelle, die von `inspector.js`, `header-footer.js`, `preview.js`, `storage.js`, `cart.js` genutzt wird. `window.WebBuilderProductsRuntime.render()` rendert den Tab neu.

### `cart.js`
Warenkorb-Domäne: Items, Drawer-Rendering, Konfig-Editor (Form, Farben, Mengensteuerung, Preisdarstellung), Rabattcode (Demo: `DEMO10`), Empfehlungen, Meilensteine/Fortschrittsbalken. Referenziert Produkte nur über IDs via `window.WebBuilderProducts`.

> Achtung: Diese eine fachliche Domäne exponiert **drei** getrennte globale Objekte – falls du etwas suchst, hier die Übersicht: `window.WebBuilderCart` (Daten-CRUD), `window.WebBuilderCartRuntime` (`render`, `open`, `close` des Drawers), `window.WebBuilderCartConfigRuntime` (`render`, `renderRecommendList`, `renderMilestoneList`, `renderCartItemDemo` für den Konfig-Tab in der Sidebar).

### `toolbar.js`
Obere Toolbar: Zoom-Steuerung (delegiert an `canvas.js`), Undo/Redo (nutzt `storage.js`/`history`), lokales Speichern-Binding. Exponiert `refreshAllDomains()` – rendert nach Undo/Redo **oder** Cloud-Laden alle betroffenen UI-Bereiche neu (Canvas, Header/Footer, Warenkorb, Produkte).

### `preview.js`
Vorschau-Modus (Editor-Chrome ausblenden) sowie die Runtime für Klick-Aktionen im Vorschau-/Live-Modus (`window.WebBuilderActionRuntime.execute(item)`): Scrollen, Browser-Verlauf, URL öffnen, Produkt in Warenkorb, Warenkorb-Drawer öffnen, Modal öffnen, Meldung anzeigen.

### `export.js`
Erzeugt aus dem aktuellen State ein statisches HTML-Dokument (Header/Elemente/Footer) für den Export-Button. Kein eigener State, keine Warenkorb-/Produktlogik – reiner Snapshot-zu-HTML-Renderer.

### `supabase-config.js` / `supabase.js`
Supabase-Client (nur Publishable Key), Auth (Login/Registrierung/Passwort-Reset/Logout), Projekt- und Mehrseiten-Verwaltung (CRUD), sowie die Cloud-/Konto-Modal-UI (`#btn-cloud`). Nutzt für Speichern/Laden ausschließlich `WebBuilderStorage.createSnapshot()`/`applySnapshot()`. Größte Datei im Projekt – bei der nächsten größeren Änderung Aufteilung in Daten-Layer und Modal-UI erwägen.

## Event-Konventionen

- Elemente/Zustände tragen **einheitlich** diese Feldnamen für Klick-Aktionen: `actionType`, `actionUrl`, `actionMsg`, `productId`. Andere Schreibweisen (`action`, `action_type`, `product_id`, `message`, …), die man in `preview.js`/`inspector.js` als Fallback sieht, werden von keinem Modul mehr erzeugt – beim nächsten Kontakt mit diesem Code prüfen, ob sie noch gebraucht werden (z. B. für sehr alte gespeicherte Projekte) oder entfernt werden können.
- Drag-Interaktionen setzen `state.dragLock = true`, solange eine Bewegung aktiv ist. Jedes Modul, das bei State-Änderungen neu rendert, muss dieses Flag respektieren (siehe `scheduleRender()` in `canvas.js` und `render()` in `header-footer.js`), sonst kann ein Re-Render mitten im Drag den DOM-Knoten unter dem Cursor ersetzen und die Bewegung abbrechen.

## Bekannte technische Schulden (Kurzfassung, Details im Chat-Review)

- Tote Exporte: `WebBuilderElements.createLegacyProxy`, `WebBuilderCanvas.makeDraggable`-Alias, `callbacks.onSelect` in `canvas.js`, `WebBuilderCart`-Produkt-Delegationsmethoden.
- Dreifach duplizierte "In-place normalisieren"-Logik in `cart.js`/`products.js`/`header-footer.js`.
- Dreifach duplizierte Icon-Map-Merge-Logik in `elements.js`/`canvas.js`/`export.js` (inkl. doppelter SVG-Strings).
- Stilistisch stark verdichtete Dateien (`inspector.js`, `cart.js`, `elements.js`, `preview.js`) sollten auf den übrigen, gut lesbaren Stil vereinheitlicht werden.
- Viele mehrzeilige "FIX:"/"NEU:"-Kommentare erzählen Bug-Historie statt aktuelles Verhalten zu dokumentieren – gehören eher in Commit-Messages/CHANGELOG.
