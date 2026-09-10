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
    ├── supabase.js          # Supabase-Anbindung
    └── supabase-config.js   # Supabase-Konfiguration
```

## JavaScript-Architektur

Die `js/`-Struktur ist bewusst auf wenige größere fachliche Module begrenzt. Es werden keine zusätzlichen `*-runtime.js`, `*-core.js`, `products.js`, `history.js` oder ähnlichen Mini-/Hilfsdateien für die Builder-Laufzeit angelegt, sofern kein zwingender architektonischer Grund besteht.

Ein neues Modul (wie `export.js`) darf angelegt werden, wenn es eine klar abgegrenzte, eigenständige fachliche Verantwortung besitzt, die zu keinem bestehenden Modul thematisch passt — nicht als generischer Auffangort für "irgendwo muss der Code ja hin".

### Verantwortlichkeiten

- `builder.js` — zentraler Bootstrap und Builder-Kern. In dieser Phase bewusst nicht weiter aufteilen.
- `state.js` — zentraler Zustand, State-Änderungen und gemeinsame Builder-Daten.
- `canvas.js` — Canvas-Rendering, Drag & Drop, Zoom und Canvas-Steuerung.
- `elements.js` — Elementtypen, Elementdaten und Icon-Registry.
- `inspector.js` — Auswahl, Eigenschaften, Aktionen, Duplizieren/Löschen und spezielle Element-Einstellungen.
- `toolbar.js` — Toolbar- und Editor-Steuerung (Zoom, Undo/Redo, Speichern).
- `header-footer.js` — Header-/Footer-Zustand und Editor-Funktionen.
- `cart.js` — Produktdaten, Produktnormalisierung, Warenkorb und Warenkorb-Konfiguration.
- `export.js` — erzeugt aus dem aktuellen State einen statischen HTML-Export (Header/Canvas-Elemente/Footer); besitzt keine eigene Persistenz, keine Warenkorb-/Produktlogik.
- `modals.js` — Modal- und Dialogfunktionen.
- `storage.js` — Speicherung, Projektzustand und History-Funktionen.
- `preview.js` — Preview-Modus und Action-/Link-Runtime.
- `supabase.js` — bestehende Supabase-Anbindung.
- `supabase-config.js` — Supabase-Konfiguration.

## Regeln für KI-Änderungen

1. Zuerst die für die Aufgabe relevanten Module und deren direkte Abhängigkeiten lesen.
2. Nicht das gesamte Projekt lesen, wenn die Aufgabe auf wenige Module begrenzt werden kann.
3. Keine funktionierende Logik ohne konkreten Grund umschreiben.
4. Die bestehende modulare JS-Struktur (aktuell die Dateien aus der Projektstruktur oben) beibehalten.
5. Keine neuen Runtime-, Core-, Helper- oder Mini-Dateien erzeugen, wenn die Funktion sinnvoll in ein bestehendes Hauptmodul gehört. Ein neues Modul ist nur zulässig, wenn es wie `export.js` eine eigenständige, klar abgegrenzte fachliche Verantwortung abbildet (siehe Abschnitt "JavaScript-Architektur").
6. `builder.js` nicht weiter aufteilen, solange dies nicht ausdrücklich entschieden wurde. Neue Module werden dort lediglich per `<script>`-Tag in korrekter Abhängigkeitsreihenfolge eingebunden.
7. Bei Änderungen an einem Modul dessen öffentliche Schnittstellen (`window.WebBuilder...`) und Abhängigkeiten erhalten oder bewusst anpassen.
8. Nach strukturellen Änderungen Script-Reihenfolge, Imports/Pfade und Abhängigkeiten prüfen.
9. Bestehende Funktionen müssen nach Änderungen erhalten bleiben.
10. Supabase-Schlüssel und sonstige Secrets niemals ins Frontend oder in öffentliche Dateien einbauen.
11. Bei größeren Umbauten zuerst die betroffenen Module und Abhängigkeiten verstehen, dann gezielt ändern.
12. Wenn eine Funktion aus einem bestehenden Modul in einem neuen Modul wiederverwendet werden muss (z. B. Rendering-Logik), diese nach Möglichkeit additiv im Ursprungsmodul über dessen bestehende `window.WebBuilder...`-Schnittstelle exponieren, statt sie zu duplizieren.
13. **Priorität aktuell: Stabilität vor Struktur.** Solange offene Punkte/Bugs bestehen (siehe Abschnitt "Offene Punkte"), keine Modularisierung oder Umstrukturierung von bestehendem, funktionierendem Code ohne expliziten Auftrag durchführen — erst den Code korrekt und vollständig fertigstellen, danach kann strukturell weiter aufgeräumt werden.

## CSS-Architektur

Die CSS-Dateien bilden die geplante fachliche Struktur. `styles.css` bleibt aktuell die aktive Gesamt-CSS-Datei, damit das bestehende Erscheinungsbild stabil bleibt. Eine spätere CSS-Migration soll kontrolliert und ohne unnötige Selektoränderungen erfolgen.

## Offene Punkte (Stand aktuelle Runde)

Diese Liste wird von KI zu KI weitergeführt und nach jedem Schritt aktualisiert:

1. Supabase-UI-Anbindung fehlt komplett — kein Button/Dialog ruft
   `createProject`/`saveProjectToSupabase`/`loadProjectFromSupabase`/`getCurrentUser`
   auf. Kein Login-UI vorhanden.
2. Kein zentraler Toast-Helper — aktuell in `supabase.js`, `toolbar.js` und
   `export.js` jeweils eigenständig implementiert. Nur vereinheitlichen, wenn
   ein echter architektonischer Grund besteht (z. B. im Rahmen der Supabase-
   UI-Anbindung, da dort ohnehin neue UI entsteht).
3. Rabattcode ist Demo-only (`DEMO10`) — keine echte Rabatt-Verwaltung/
   Persistenz, entspricht aktuell dem Sollzustand.
4. `cart.js`-Größe im Auge behalten — ggf. spätere Aufteilung in kleinere
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

`projects` enthält Projekte eines Benutzers. `pages` gehört zu einem Projekt. Seiteninhalte werden als JSON in `pages.content` gespeichert.

## Entwicklungsprinzip

**Erst stabilisieren, dann gezielt modularisieren, danach erweitern.**
