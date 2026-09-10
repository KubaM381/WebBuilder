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
    ├── canvas.js            # Canvas, Drag & Drop und Canvas-Steuerung
    ├── elements.js          # Elementtypen, Elementdaten und Icons
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
- `toast.js` — einziger Ort für Toast-Benachrichtigungen (`window.WebBuilderToast.show(message, type)`); wird von `toolbar.js`, `export.js` und `supabase.js` verwendet.
- `canvas.js` — Canvas-Rendering, Drag & Drop, Zoom und Canvas-Steuerung.
- `elements.js` — Elementtypen, Elementdaten und Icon-Registry.
- `inspector.js` — Auswahl, Eigenschaften, Aktionen, Duplizieren/Löschen und spezielle Element-Einstellungen.
- `toolbar.js` — Toolbar- und Editor-Steuerung (Zoom, Undo/Redo, lokales Speichern); exponiert zusätzlich `refreshAllDomains()`, das nach jedem State-Reset (Undo/Redo, Cloud-Laden) die komplette UI neu rendert.
- `header-footer.js` — Header-/Footer-Zustand und Editor-Funktionen.
- `cart.js` — Produktdaten, Produktnormalisierung, Warenkorb und Warenkorb-Konfiguration.
- `export.js` — erzeugt aus dem aktuellen State einen statischen HTML-Export (Header/Canvas-Elemente/Footer); besitzt keine eigene Persistenz, keine Warenkorb-/Produktlogik.
- `modals.js` — Modal- und Dialogfunktionen.
- `storage.js` — Speicherung, Projektzustand und History-Funktionen. `createSnapshot()`/`applySnapshot()` sind die kanonische Serialisierungsform des gesamten Builder-Zustands und werden von lokalem Speichern, Undo/Redo **und** dem Supabase-Cloud-Speichern/-Laden gemeinsam genutzt.
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

Diese Liste wird von KI zu KI weitergeführt und nach jedem Schritt aktualisiert:

1. Supabase-UI ist jetzt funktional: Login/Registrierung/Logout, Projekt
   erstellen, bestehendes Projekt wählen, Speichern/Laden über
   `#btn-cloud`-Modal. Noch NICHT vorhanden:
   - Passwort-Reset / "Passwort vergessen"
   - Mehrseiten-Verwaltung (aktuell immer feste Page `slug: "startseite"`
     pro Projekt — `getProjectPages()` existiert bereits als Grundlage für
     eine spätere Mehrseiten-UI, wird aber noch nicht in der UI genutzt)
   - Projekte löschen/umbenennen
   - E-Mail-Bestätigungs-Hinweistext ist generisch, nicht an das tatsächliche
     Supabase-Auth-Setting (Bestätigung an/aus) angepasst
2. Rabattcode ist Demo-only (`DEMO10`) — keine echte Rabatt-Verwaltung/
   Persistenz, entspricht aktuell dem Sollzustand.
3. `cart.js`-Größe im Auge behalten — ggf. spätere Aufteilung in kleinere
   Module, aktuell noch nicht zwingend nötig (siehe Regel 13: erst Stabilität).

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
