# CSS-Architektur

Die CSS-Struktur des WebBuilders wird kontrolliert modularisiert. Ziel ist eine klare Verantwortlichkeit pro Bereich, ohne das bestehende Erscheinungsbild unnötig zu verändern.

## Aktuelle Struktur

- `styles.css` — aktuell aktive Gesamt-CSS-Datei. Sie bleibt die zentrale Stylesheet-Datei, solange die Migration nicht vollständig abgeschlossen ist.
- `base.css` — globale Basis, Variablen und Typografie.
- `layout.css` — grundlegendes Builder-Layout.
- `toolbar.css` — Toolbar und Toolbar-Steuerelemente.
- `sidebar.css` — linke Editor-Seitenleiste und Tabs.
- `inspector.css` — rechter Inspector-/Eigenschaftenbereich.
- `canvas.css` — Canvas, Zoom und Builder-Fläche.
- `elements.css` — Elementpalette und platzierte Elemente.
- `modals.css` — Modals und Dialoge.
- `responsive.css` — Responsive Regeln für kleinere Bildschirmgrößen.

## Wichtige Regel

Die CSS-Struktur soll übersichtlich bleiben. Keine unnötigen Mini-Dateien anlegen, wenn Regeln sinnvoll in eine der bestehenden Dateien gehören.

## Migrationsstatus

`styles.css` ist weiterhin die aktive Gesamt-CSS-Datei. Die modularen Dateien bilden die Zielstruktur und werden kontrolliert befüllt. Bei einer späteren Migration müssen bestehende Selektoren, Abhängigkeiten und das aktuelle Erscheinungsbild möglichst unverändert bleiben.

Vor jeder CSS-Änderung soll geprüft werden, ob die betreffende Regel bereits in `styles.css` oder einem modularen Stylesheet vorhanden ist. Doppelte Regeln und unnötige Overrides sollen vermieden werden.

## Regeln für KI-Änderungen

1. Nur die für die konkrete Aufgabe relevanten CSS-Dateien lesen.
2. Bestehende funktionierende Styles nicht ohne Grund umschreiben.
3. Keine neuen CSS-Dateien erzeugen, wenn eine bestehende Datei fachlich passt.
4. Selektoren und Klassen nicht unnötig umbenennen.
5. Änderungen sollen das bestehende UI und Responsive-Verhalten erhalten.
6. Bei einer Migration zuerst Abhängigkeiten und Überschneidungen prüfen, dann gezielt verschieben.
