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
    ├── toast.js             # zentraler Toast-/Benachrichtigungs-Helper
    ├── canvas.js            # Canvas, Drag & Drop, Canvas-Steuerung, Eigene-Icons-UI
    ├── elements.js          # Elementtypen, Elementdaten und Icon-Registry
    ├── inspector.js         # Auswahl, Eigenschaften, Elementaktionen und Duplizieren
    ├── toolbar.js           # Toolbar und Editor-Steuerung
    ├── header-footer.js     # Header-/Footer-Logik
    ├── cart.js              # Produkte und Warenkorb (siehe "Geplante Strukturmaßnahme")
    ├── export.js            # Statischer HTML-Export des aktuellen Projekts
    ├── modals.js            # Modal-/Dialog-Logik
    ├── storage.js           # Speicherung, Projektzustand und History
    ├── preview.js           # Vorschau und Action-Runtime
    ├── supabase.js          # Supabase-Anbindung (Auth, Projekte, Seiten, Cloud-UI)
    └── supabase-config.js   # Supabase-Konfiguration
```

## JavaScript-Architektur

Die `js/`-Struktur ist bewusst auf wenige größere fachliche Module begrenzt — **keine** Unterordner (`core/`, `canvas/`, `shop/`, ...). Diese flache Struktur ist bewusst so gewählt: wenige, klar benannte Dateien lassen sich für eine KI schnell und mit wenig Kontextverbrauch eingrenzen, verstehen und bearbeiten. Eine tiefe Ordnerstruktur mit vielen kleinen Dateien wäre für diese Projektgröße kontraproduktiv (mehr Dateien = mehr Suchtreffer, mehr `<script>`-Tags, mehr Pflegeaufwand), auch wenn sie "sauberer" aussieht.

Ein neues Modul (wie `export.js` oder `toast.js`) darf angelegt werden, wenn es eine klar abgegrenzte, eigenständige fachliche Verantwortung besitzt, die zu keinem bestehenden Modul thematisch passt und/oder mehrfach dupliziert vorlag — nicht als generischer Auffangort für "irgendwo muss der Code ja hin".

### Wann wird ein bestehendes Modul aufgeteilt?

Ein Modul wird nur aufgeteilt, wenn es **beide** Kriterien erfüllt:

1. Es enthält zwei oder mehr fachlich unabhängige Verantwortungen (nicht nur viel Code für eine einzige Sache).
2. Es ist dadurch spürbar unübersichtlich geworden (Richtwert: grob ab ~500–600 Zeilen).

Reine Codemenge/viele UI-Strings allein rechtfertigen **keine** Aufteilung. Diese Regel verhindert sowohl unnötige Zersplitterung als auch, dass ein Modul unbemerkt zum Sammelbecken für mehrere Domänen wird (siehe `cart.js` unten als konkreter Fall).

### Verantwortlichkeiten

- `builder.js` — zentraler Bootstrap und Builder-Kern. In dieser Phase bewusst nicht weiter aufteilen.
- `state.js` — zentraler Zustand, State-Änderungen und gemeinsame Builder-Daten.
- `toast.js` — einziger Ort für Toast-Benachrichtigungen (`window.WebBuilderToast.show(message, type)`); wird von `toolbar.js`, `export.js`, `supabase.js` und `canvas.js` verwendet.
- `canvas.js` — Canvas-Rendering, Drag & Drop, Zoom, Canvas-Steuerung. Besitzt zusätzlich die Palette-UI für benutzerdefinierte Icons (`renderCustomIconPalette()`, `bindCustomIconForm()`), da diese UI direkt auf der bestehenden Palette-Drag&Drop-Logik (`bindPaletteDragAndDrop()`) aufbaut.
- `elements.js` — Elementtypen, Elementdaten und Icon-Registry (`window.WebBuilderIconRegistry`: `register`, `get`, `getAll`, `addCustom`, `getCustomNames`). Reine Daten-/Registry-Logik, kein DOM-Zugriff.
- `inspector.js` — Auswahl, Eigenschaften, Aktionen, Duplizieren/Löschen und spezielle Element-Einstellungen.
- `toolbar.js` — Toolbar- und Editor-Steuerung (Zoom, Undo/Redo, lokales Speichern); exponiert zusätzlich `refreshAllDomains()`, das nach jedem State-Reset (Undo/Redo, Cloud-Laden) die komplette UI neu rendert.
- `header-footer.js` — Header-/Footer-Zustand und Editor-Funktionen.
- `cart.js` — **aktuell noch zwei Domänen in einer Datei:** Produktverwaltung (CRUD, Normalisierung, Produkt-Tab-Rendering) UND Warenkorb (Drawer-Rendering, Konfig-Editor, Rabattcode, Empfehlungen, Meilensteine/Fortschritt, Checkout-Styling). Größte Einzeldatei im Projekt — siehe "Geplante Strukturmaßnahme" unten für die vorgesehene Aufteilung.
- `export.js` — erzeugt aus dem aktuellen State einen statischen HTML-Export (Header/Canvas-Elemente/Footer); besitzt keine eigene Persistenz, keine Warenkorb-/Produktlogik.
- `modals.js` — Modal- und Dialogfunktionen.
- `storage.js` — Speicherung, Projektzustand und History-Funktionen. `createSnapshot()`/`applySnapshot()` sind die kanonische Serialisierungsform des gesamten Builder-Zustands und werden von lokalem Speichern, Undo/Redo **und** dem Supabase-Cloud-Speichern/-Laden gemeinsam genutzt. Eigene Icons sind bewusst NICHT Teil des Snapshots (siehe Icon-Registry in `elements.js`).
- `preview.js` — Preview-Modus und Action-/Link-Runtime.
- `supabase.js` — Supabase-Anbindung: Auth (Login/Registrierung/Passwort-Reset/Logout), Projekt-Verwaltung (erstellen/umbenennen/löschen/auflisten), Mehrseiten-Verwaltung (Seiten anlegen/umbenennen/löschen/wechseln) und die zugehörige Konto-/Cloud-UI (Modal über `#btn-cloud`). Nutzt zum Speichern/Laden ausschließlich `WebBuilderStorage.createSnapshot()`/`applySnapshot()`, damit Cloud-Daten strukturell nie vom lokalen Format abweichen. Nach der letzten Erweiterungsrunde spürbar gewachsen (~380 Zeilen) — noch eine einzige klare Domäne (Cloud-Anbindung inkl. UI), daher aktuell keine Aufteilung nötig, aber wie `cart.js` im Auge behalten (siehe "Wann wird ein Modul aufgeteilt?").
- `supabase-config.js` — Supabase-Konfiguration.

## Geplante Strukturmaßnahme (nächster Schritt)

`cart.js` erfüllt beide Kriterien aus "Wann wird ein Modul aufgeteilt?" (zwei unabhängige Domänen + zu groß) und soll bei Gelegenheit in zwei Dateien aufgeteilt werden — flach, ohne Unterordner:

- **`products.js`** (neu) — Produkt-CRUD, `normalizeProduct`, Produkt-Tab-Rendering (`renderProducts()` u. Ä.). Icon-Registry bleibt unverändert in `elements.js`.
- **`cart.js`** (bleibt) — nur noch Warenkorb: Items, Drawer-Rendering (`renderCart()`, `buildCartItemHTML()`), Konfig-Editor-UI, Rabattcode, Empfehlungen (referenzieren `products.js` weiterhin ausschließlich per ID, keine Datenduplikate — siehe Projektregel zu Produkten), Meilensteine/Fortschritt, Checkout-Button-Styling.

Bei Umsetzung: `window.WebBuilderCart`-Schnittstelle möglichst erhalten (Regel 7), neues `window.WebBuilderProducts` für die ausgelagerten Produktfunktionen exponieren, `<script>`-Tag für `products.js` **vor** `cart.js` in `web.html`/`builder.js` einbinden (Abhängigkeitsreihenfolge, Regel 8), und alle Stellen prüfen, die bisher `getProduct()`/`getProducts()` aus `cart.js` heraus nutzen (u. a. Inspector-Aktion "In den Warenkorb legen").

Noch nicht umgesetzt — nur dokumentiert, damit die nächste Runde direkt starten kann, ohne die Analyse zu wiederholen.

## Regeln für KI-Änderungen

1. Zuerst die für die Aufgabe relevanten Module und deren direkte Abhängigkeiten lesen.
2. Nicht das gesamte Projekt lesen, wenn die Aufgabe auf wenige Module begrenzt werden kann.
3. Keine funktionierende Logik ohne konkreten Grund umschreiben.
4. Die bestehende modulare JS-Struktur (siehe Projektstruktur oben) beibehalten.
5. Keine neuen Runtime-, Core-, Helper- oder Mini-Dateien erzeugen, wenn die Funktion sinnvoll in ein bestehendes Hauptmodul gehört. Ein neues Modul ist nur zulässig, wenn es eine eigenständige, klar abgegrenzte fachliche Verantwortung abbildet (siehe Abschnitt "JavaScript-Architektur") — z. B. weil eine Funktionalität wie Export oder Toast-Benachrichtigungen bislang duplikativ oder gar nicht sauber existierte.
6. `builder.js` nicht weiter aufteilen, solange dies nicht ausdrücklich entschieden wurde. Neue Module werden dort lediglich per `<script>`-Tag in korrekter Abhängigkeitsreihenfolge eingebunden.
7. Bei Änderungen an einem Modul dessen öffentliche Schnittstellen (`window.WebBuilder...`) und Abhängigkeiten erhalten oder bewusst anpassen.
8. Nach strukturellen Änderungen Script-Reihenfolge, Imports/Pfade und Abhängigkeiten prüfen. ES-Module (`type="module"`, aktuell `supabase-config.js`/`supabase.js`) dürfen niemals via `import ... from` auf ein nicht-modulares `<script>` (wie `builder.js`) zugreifen — gemeinsamer State/Funktionen laufen ausschließlich über `window.WebBuilder...`, wie in jedem anderen Modul auch.
9. Bestehende Funktionen müssen nach Änderungen erhalten bleiben.
10. Supabase-Schlüssel und sonstige Secrets niemals ins Frontend oder in öffentliche Dateien einbauen.
11. Bei größeren Umbauten zuerst die betroffenen Module und Abhängigkeiten verstehen, dann gezielt ändern.
12. Wenn eine Funktion aus einem bestehenden Modul in einem neuen Modul wiederverwendet werden muss (z. B. Rendering-Logik oder Snapshot-Erzeugung), diese nach Möglichkeit additiv im Ursprungsmodul über dessen bestehende `window.WebBuilder...`-Schnittstelle exponieren, statt sie zu duplizieren.
13. **Priorität: Stabilität vor Struktur.** Solange offene Punkte/Bugs bestehen (siehe Abschnitt "Offene Punkte"), keine Modularisierung oder Umstrukturierung von bestehendem, funktionierendem Code ohne expliziten Auftrag durchführen. Aktueller Stand: alle bekannten Bugs sind behoben — die einzige aktuell vorgesehene Strukturmaßnahme ist die in "Geplante Strukturmaßnahme" beschriebene `cart.js`-Aufteilung, und auch die nur auf ausdrücklichen Auftrag hin.
14. **Kleine Aufgaben bündeln statt einzeln abarbeiten.** Wenn mehrere offene Punkte in der Liste unten klein/einfach sind UND dieselbe(n) Datei(en) betreffen (oder sich stark überschneidende Abhängigkeiten haben), sollen sie in einer Runde gemeinsam als eine mittelgroße Änderung umgesetzt werden, statt sie nacheinander in getrennten, sehr kleinen Schritten zu bearbeiten. Das vermeidet unnötig viele Einzel-Durchläufe durch dieselbe Datei. Größere, eigenständige Punkte (eigene Datei(en), eigene fachliche Domäne) bleiben trotzdem eigene Schritte.
15. **Schwellenwert fürs Aufteilen eines Moduls:** siehe Abschnitt "Wann wird ein bestehendes Modul aufgeteilt?" oben — beide Kriterien (mehrere unabhängige Verantwortungen UND spürbare Größe) müssen zutreffen, nicht nur eines.

## CSS-Architektur

Die CSS-Dateien bilden die geplante fachliche Struktur. `styles.css` bleibt aktuell die aktive Gesamt-CSS-Datei, damit das bestehende Erscheinungsbild stabil bleibt. Eine spätere CSS-Migration soll kontrolliert und ohne unnötige Selektoränderungen erfolgen.

## Offene Punkte (Stand aktuelle Runde)

Diese Liste wird von KI zu KI weitergeführt und nach jedem Schritt aktualisiert. Bereits erledigte Punkte werden hier NICHT mehr aufgeführt (siehe Git-/Chatverlauf für die Historie) — nur was noch offen ist. Kleine, thematisch/dateilich zusammenhängende Punkte sind bewusst zu einer gemeinsamen Aufgabe gebündelt (siehe Regel 14).

Aktuell keine offenen Bug-/Reparaturpunkte. Der einzige vorgesehene nächste Schritt ist die Strukturmaßnahme (`cart.js` → `products.js` + `cart.js`, siehe oben) — nur bei ausdrücklichem Auftrag umzusetzen (Regel 13).

Nur Beobachtungen/bewusste Design-Entscheidungen (keine Aktion nötig):

1. Rabattcode ist Demo-only (`DEMO10`) — entspricht dem Sollzustand.
2. Eigene Icons (Palette-Feature) werden bewusst nicht im Projekt-Speicherstand persistiert und gehen beim Neuladen/Projekt-Laden verloren. Kein Bug, sondern bewusste Design-Entscheidung — nur nachrüsten, falls der Nutzer das ausdrücklich wünscht (Größenlimits bei Supabase/`localStorage` durch potenziell große SVG-Strings beachten, falls doch persistiert werden soll).
3. `supabase.js`-Größe im Auge behalten — aktuell noch eine klare Domäne, keine Aufteilung nötig (siehe Regel 15).

Wichtig: Immer zuerst betroffene Datei(en) + direkte Abhängigkeiten lesen (Regel 1/11), nicht das ganze Projekt neu schreiben.

## Supabase

Supabase wird für Backend-/Datenbankfunktionen des Projekts verwendet. Datenbankstruktur, Policies und Sicherheitskonfiguration werden separat gepflegt.

Aktuelle Struktur:

```text
projects
   ↓
pages
```

`projects` enthält Projekte eines Benutzers (`user_id`, `name`, `slug`). `pages` gehört zu einem Projekt (`project_id`, `slug`, eindeutig je `(project_id, slug)`). Der Seiteninhalt (`pages.content`) ist ein vollständiger `WebBuilderStorage.createSnapshot()` — dieselbe Struktur wie beim lokalen Speichern/Laden und bei Undo/Redo, damit Cloud- und lokaler Zustand niemals unterschiedliche Formen annehmen.

Auth läuft über den Standard-Supabase-Auth (E-Mail/Passwort, inkl. Passwort-Reset per E-Mail). Der Supabase-Client selbst verwaltet die Session-Persistenz im Browser; die App merkt sich zusätzlich lokal (eigener `localStorage`-Schlüssel `webbuilder_supabase_ref`, unabhängig vom Undo/Redo-relevanten Builder-State) welches Projekt/welche Seite zuletzt verknüpft war.

**Offener Punkt außerhalb des Codes:** Löschen/Umbenennen von `projects` und `pages` benötigt `UPDATE`/`DELETE`-RLS-Policies für den jeweiligen Besitzer in Supabase selbst — bitte dort verifizieren, falls das noch nicht geprüft wurde (kein Code-/README-Thema, sondern DB-Konfiguration).

## Entwicklungsprinzip

**Erst stabilisieren, dann gezielt modularisieren, danach erweitern.** Stabilisierung ist abgeschlossen (Stand aktuelle Runde) — die vorgesehene Modularisierung ist ausschließlich die in "Geplante Strukturmaßnahme" beschriebene `cart.js`-Aufteilung, kein größerer Umbau.
