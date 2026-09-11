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
    ├── state.js             # zentraler Builder-State
    ├── toast.js              # zentraler Toast-/Benachrichtigungs-Helper
    ├── canvas.js             # Canvas, Drag & Drop, Canvas-Steuerung, Eigene-Icons-UI
    ├── elements.js           # Elementtypen, Elementdaten und Icon-Registry
    ├── inspector.js          # Auswahl, Eigenschaften, Elementaktionen und Duplizieren
    ├── toolbar.js            # Toolbar und Editor-Steuerung
    ├── header-footer.js      # Header-/Footer-Logik
    ├── products.js           # Produktverwaltung (CRUD, Normalisierung, Produkt-Tab)
    ├── cart.js                # Warenkorb (siehe "Verantwortlichkeiten")
    ├── export.js             # Statischer HTML-Export des aktuellen Projekts
    ├── modals.js             # Modal-/Dialog-Logik
    ├── storage.js            # Speicherung, Projektzustand und History
    ├── preview.js            # Vorschau und Action-Runtime
    ├── supabase.js           # Supabase-Anbindung (Auth, Projekte, Seiten, Cloud-UI)
    └── supabase-config.js    # Supabase-Konfiguration
```

### Verantwortlichkeiten

- `builder.js` — zentraler Bootstrap und Builder-Kern. In dieser Phase bewusst nicht weiter aufteilen.
- `state.js` — zentraler Zustand, State-Änderungen und gemeinsame Builder-Daten.
- `toast.js` — einziger Ort für Toast-Benachrichtigungen (`window.WebBuilderToast.show(message, type)`); wird von `toolbar.js`, `export.js`, `supabase.js` und `canvas.js` verwendet.
- `canvas.js` — Canvas-Rendering, Drag & Drop, Zoom, Canvas-Steuerung. Besitzt zusätzlich die Palette-UI für benutzerdefinierte Icons (`renderCustomIconPalette()`, `bindCustomIconForm()`), da diese UI direkt auf der bestehenden Palette-Drag&Drop-Logik (`bindPaletteDragAndDrop()`) aufbaut.
- `elements.js` — Elementtypen, Elementdaten und Icon-Registry (`window.WebBuilderIconRegistry`: `register`, `get`, `getAll`, `addCustom`, `getCustomNames`). Reine Daten-/Registry-Logik, kein DOM-Zugriff.
- `inspector.js` — Auswahl, Eigenschaften, Aktionen, Duplizieren/Löschen und spezielle Element-Einstellungen.
- `toolbar.js` — Toolbar- und Editor-Steuerung (Zoom, Undo/Redo, lokales Speichern); exponiert zusätzlich `refreshAllDomains()`, das nach jedem State-Reset (Undo/Redo, Cloud-Laden) die komplette UI neu rendert.
- `header-footer.js` — Header-/Footer-Zustand und Editor-Funktionen.
- `products.js` — Produktverwaltung: CRUD (`add`/`update`/`remove`/`replaceAll`), `normalizeProduct` und das Rendering/die Bedienung des Produkt-Tabs (`#product-list`, `#btn-add-product`). Reine Datenquelle für Produkte; `window.WebBuilderProducts` (`getAll`, `getById`, `add`, `update`, `remove`, `replaceAll`, `normalize`, `normalizeState`) ist die kanonische Schnittstelle, die `inspector.js`, `header-footer.js`, `preview.js`, `storage.js`, `toolbar.js` und `cart.js` nutzen. `window.WebBuilderProductsRuntime.render()` rendert den Produkt-Tab neu (z. B. nach Undo/Redo oder Cloud-Laden). Ausgelagert aus `cart.js` (siehe Git-/Chatverlauf).
- `cart.js` — **nur noch Warenkorb-Domäne**: Warenkorb-Items, Drawer-Rendering (`renderCart()`, `buildCartItemHTML()`), Konfig-Editor-UI (`window.WebBuilderCartConfigRuntime`), Rabattcode, Empfehlungen und Meilensteine/Fortschritt, Checkout-Button-Styling. Referenziert Produkte ausschließlich über `window.WebBuilderProducts` (nur IDs, keine Datenduplikate). `window.WebBuilderCart` behält aus Kompatibilitätsgründen zusätzlich dünne, an `products.js` delegierende Produktfunktionen (`getProducts`, `getProduct`, `addProduct`, `updateProduct`, `removeProduct`, `replaceProducts`, `normalizeProduct`).
- `export.js` — erzeugt aus dem aktuellen State einen statischen HTML-Export (Header/Canvas-Elemente/Footer); besitzt keine eigene Persistenz, keine Warenkorb-/Produktlogik.
- `modals.js` — Modal- und Dialogfunktionen.
- `storage.js` — Speicherung, Projektzustand und History-Funktionen. `createSnapshot()`/`applySnapshot()` sind die kanonische Serialisierungsform des gesamten Builder-Zustands und werden von lokalem Speichern, Undo/Redo **und** dem Supabase-Cloud-Speichern/-Laden gemeinsam genutzt. Eigene Icons sind bewusst NICHT Teil des Snapshots (siehe Icon-Registry in `elements.js`).
- `preview.js` — Preview-Modus und Action-/Link-Runtime.
- `supabase.js` — Supabase-Anbindung: Auth (Login/Registrierung/Passwort-Reset/Logout), Projekt-Verwaltung (erstellen/umbenennen/löschen/auflisten), Mehrseiten-Verwaltung (Seiten anlegen/umbenennen/löschen/wechseln) und die zugehörige Konto-/Cloud-UI (Modal über `#btn-cloud`). Nutzt zum Speichern/Laden ausschließlich `WebBuilderStorage.createSnapshot()`/`applySnapshot()`, damit Cloud-Daten strukturell nie vom lokalen Format abweichen. Größe im Auge behalten (siehe Abschnitt "Wann wird ein Modul aufgeteilt?").
- `supabase-config.js` — Supabase-Konfiguration.

**Wichtig für Skript-Ladereihenfolge:** `products.js` muss in `builder.js` **vor** `cart.js` eingebunden werden (Abhängigkeitsreihenfolge, Projektregel 8), da `cart.js` Produkte ausschließlich über `window.WebBuilderProducts` referenziert.

## Offene Punkte (Stand aktuelle Runde)

Diese Liste wird von KI zu KI weitergeführt und nach jedem Schritt aktualisiert. Bereits erledigte Punkte werden hier NICHT mehr aufgeführt (siehe Git-/Chatverlauf für die Historie) — nur was noch offen ist.

Aktuell keine offenen Bug-/Reparaturpunkte und keine vorgesehene Strukturmaßnahme. Die zuvor geplante Aufteilung von `cart.js` in `products.js` + `cart.js` ist umgesetzt (siehe Abschnitt "Verantwortlichkeiten" oben).

Nur Beobachtungen/bewusste Design-Entscheidungen (keine Aktion nötig):

1. Rabattcode ist Demo-only (`DEMO10`) — entspricht dem Sollzustand.
2. Eigene Icons (Palette-Feature) werden bewusst nicht im Projekt-Speicherstand persistiert und gehen beim Neuladen/Projekt-Laden verloren. Kein Bug, sondern bewusste Design-Entscheidung — nur nachrüsten, falls der Nutzer das ausdrücklich wünscht (Größenlimits bei Supabase/`localStorage` durch potenziell große SVG-Strings beachten, falls doch persistiert werden soll).
3. `supabase.js`-Größe im Auge behalten — aktuell noch eine klare Domäne, keine Aufteilung nötig (siehe Regel 15).

Wichtig: Immer zuerst betroffene Datei(en) + direkte Abhängigkeiten lesen (Regel 1/11), nicht das ganze Projekt neu schreiben.
