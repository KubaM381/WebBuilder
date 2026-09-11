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
    ├── cart.js              # Produkte und Warenkorb
    ├── export.js            # Statischer HTML-Export des aktuellen Projekts
    ├── modals.js            # Modal-/Dialog-Logik
    ├── storage.js           # Speicherung, Projektzustand und History
    ├── preview.js           # Vorschau und Action-Runtime
    ├── supabase.js          # Supabase-Anbindung (Auth, Projekte, Cloud-UI)
    └── supabase-config.js   # Supabase-Konfiguration
```

## JavaScript-Architektur

Die `js/`-Struktur ist bewusst auf wenige größere fachliche Module begrenzt.

Ein neues Modul (wie `export.js` oder `toast.js`) darf angelegt werden, wenn es eine klar abgegrenzte, eigenständige fachliche Verantwortung besitzt, die zu keinem bestehenden Modul thematisch passt und/oder mehrfach dupliziert vorlag — nicht als generischer Auffangort für "irgendwo muss der Code ja hin".

### Verantwortlichkeiten

- `builder.js` — zentraler Bootstrap und Builder-Kern. In dieser Phase bewusst nicht weiter aufteilen.
- `state.js` — zentraler Zustand, State-Änderungen und gemeinsame Builder-Daten.
- `toast.js` — einziger Ort für Toast-Benachrichtigungen (`window.WebBuilderToast.show(message, type)`); wird von `toolbar.js`, `export.js`, `supabase.js` und `canvas.js` (Eigene-Icons-Feedback) verwendet.
- `canvas.js` — Canvas-Rendering, Drag & Drop, Zoom, Canvas-Steuerung. Besitzt zusätzlich die Palette-UI für benutzerdefinierte Icons (`renderCustomIconPalette()`, `bindCustomIconForm()`), da diese UI direkt auf der bestehenden Palette-Drag&Drop-Logik (`bindPaletteDragAndDrop()`) aufbaut.
- `elements.js` — Elementtypen, Elementdaten und Icon-Registry (`window.WebBuilderIconRegistry`: `register`, `get`, `getAll`, `addCustom`, `getCustomNames`). Reine Daten-/Registry-Logik, kein DOM-Zugriff.
- `inspector.js` — Auswahl, Eigenschaften, Aktionen, Duplizieren/Löschen und spezielle Element-Einstellungen.
- `toolbar.js` — Toolbar- und Editor-Steuerung (Zoom, Undo/Redo, lokales Speichern); exponiert zusätzlich `refreshAllDomains()`, das nach jedem State-Reset (Undo/Redo, Cloud-Laden) die komplette UI neu rendert.
- `header-footer.js` — Header-/Footer-Zustand und Editor-Funktionen.
- `cart.js` — Produktdaten, Produktnormalisierung, Warenkorb und Warenkorb-Konfiguration.
- `export.js` — erzeugt aus dem aktuellen State einen statischen HTML-Export (Header/Canvas-Elemente/Footer); besitzt keine eigene Persistenz, keine Warenkorb-/Produktlogik.
- `modals.js` — Modal- und Dialogfunktionen.
- `storage.js` — Speicherung, Projektzustand und History-Funktionen. `createSnapshot()`/`applySnapshot()` sind die kanonische Serialisierungsform des gesamten Builder-Zustands und werden von lokalem Speichern, Undo/Redo **und** dem Supabase-Cloud-Speichern/-Laden gemeinsam genutzt. Eigene Icons (siehe unten) sind bewusst NICHT Teil des Snapshots.
- `preview.js` — Preview-Modus und Action-/Link-Runtime.
- `supabase.js` — Supabase-Anbindung: Auth (Login/Registrierung/Logout), Projekt-Verwaltung (erstellen/auflisten) und die zugehörige Konto-/Cloud-UI (Modal über `#btn-cloud`). Nutzt zum Speichern/Laden ausschließlich `WebBuilderStorage.createSnapshot()`/`applySnapshot()`, damit Cloud-Daten strukturell nie vom lokalen Format abweichen.
- `supabase-config.js` — Supabase-Konfiguration.

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
13. **Priorität aktuell: Stabilität vor Struktur.** Solange offene Punkte/Bugs bestehen (siehe Abschnitt "Offene Punkte"), keine Modularisierung oder Umstrukturierung von bestehendem, funktionierendem Code ohne expliziten Auftrag durchführen — erst den Code korrekt und vollständig fertigstellen, danach kann strukturell weiter aufgeräumt werden.

## CSS-Architektur

Die CSS-Dateien bilden die geplante fachliche Struktur. `styles.css` bleibt aktuell die aktive Gesamt-CSS-Datei, damit das bestehende Erscheinungsbild stabil bleibt. Eine spätere CSS-Migration soll kontrolliert und ohne unnötige Selektoränderungen erfolgen.

## Offene Punkte (Stand aktuelle Runde)

Diese Liste wird von KI zu KI weitergeführt und nach jedem Schritt aktualisiert. Grundlage für diese Runde war ein Abgleich mit einer alten (vor-modularen) Fassung von `builder.js`, die der Nutzer zur Verfügung gestellt hat — daraus wurden mehrere Lücken/Regressionen der Modularisierung identifiziert.

1. Supabase-UI ist funktional (Login/Registrierung/Logout, Projekt
   erstellen/wählen, Speichern/Laden über `#btn-cloud`-Modal). Noch NICHT
   vorhanden:
   - Passwort-Reset / "Passwort vergessen"
   - Mehrseiten-Verwaltung (`getProjectPages()` existiert als Grundlage,
     keine UI dafür)
   - Projekte löschen/umbenennen
   - E-Mail-Bestätigungs-Hinweistext ist generisch, nicht an das tatsächliche
     Supabase-Auth-Setting angepasst
2. Rabattcode ist Demo-only (`DEMO10`) — entspricht aktuell dem Sollzustand,
   keine Änderung nötig.
3. `cart.js`-Größe im Auge behalten — ggf. spätere Aufteilung in kleinere
   Module, aktuell noch nicht zwingend nötig (siehe Regel 13).
6. [OFFEN] Inspector-Feld "Meldungsposition" (`messagePosition`) bei Aktion
   "alert-msg" hat aktuell KEINE Wirkung. `preview.js` ruft bei `alert-msg`
   immer `WebBuilderModals.openMessage()` auf (zentrales Modal) und ignoriert
   `item.messagePosition`. Der alte Code hatte dafür eine echte
   `showPositionedMessage()`-Funktion (Meldung an fester Bildschirmposition,
   z. B. unten rechts). Muss entweder in `preview.js`/`modals.js`
   nachgebaut, oder das Inspector-Feld entfernt werden, falls positionierte
   Meldungen nicht mehr gewollt sind.
7. [OFFEN] Kopf-/Fußzeilen-Icon-Elemente haben keine UI, um das Icon
   nachträglich zu ändern (im alten Code gab es ein `<select>` mit allen
   Icon-Namen in der Items-Liste). Aktuell bleibt ein per "+ Icon" erzeugtes
   Bar-Item fest auf dem beim Erstellen hartcodierten Icon (`arrow-right`).
8. [OFFEN] `cart.js`: Produkt-/Warenkorb-Datenmodell führt weiterhin ein
   ungenutztes Feld `compareAtPrice` (`normalizeProduct`/`normalizeCartItem`),
   ohne dass es irgendwo in der UI gesetzt/angezeigt wird (die tatsächliche
   Rabattlogik läuft komplett über `discountPrice`). Sollte bereinigt
   (Feld entfernen) oder bewusst mit eigener UI ausgestattet werden.
9. [OFFEN, neu] Eigene Icons (Punkt 5) gehen beim Neuladen der Seite bzw.
   nach Projekt-Laden verloren, da sie bewusst nicht im Snapshot enthalten
   sind (siehe Punkt 5). Falls das künftig stören sollte: Persistenz als
   eigenes Feature nachrüsten, nicht einfach in `createSnapshot()`
   reinmischen ohne Rücksprache (Größenlimits bei Supabase/`localStorage`
   durch potenziell große SVG-Strings beachten).

Wichtig: Immer zuerst betroffene Datei + direkte Abhängigkeiten lesen
(Regel 1/11), nicht das ganze Projekt neu schreiben.

## Supabase

Supabase wird für Backend-/Datenbankfunktionen des Projekts verwendet. Datenbankstruktur, Policies und Sicherheitskonfiguration werden separat gepflegt.

Aktuelle Struktur:

```text
projects
   ↓
pages
```

`projects` enthält Projekte eines Benutzers (`user_id`, `name`, `slug`). `pages` gehört zu einem Projekt (`project_id`, `slug`, eindeutig je `(project_id, slug)`). Der Seiteninhalt (`pages.content`) ist ein vollständiger `WebBuilderStorage.createSnapshot()` — dieselbe Struktur wie beim lokalen Speichern/Laden und bei Undo/Redo, damit Cloud- und lokaler Zustand niemals unterschiedliche Formen annehmen.

Auth läuft über den Standard-Supabase-Auth (E-Mail/Passwort). Der Supabase-Client selbst verwaltet die Session-Persistenz im Browser; die App merkt sich zusätzlich lokal (eigener `localStorage`-Schlüssel `webbuilder_supabase_ref`, unabhängig vom Undo/Redo-relevanten Builder-State) welches Projekt/welche Page zuletzt verknüpft war.

## Entwicklungsprinzip

**Erst stabilisieren, dann gezielt modularisieren, danach erweitern.**
