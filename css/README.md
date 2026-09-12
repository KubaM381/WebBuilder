# CSS-Architektur

Die CSS-Struktur ist nach Verantwortlichkeit modularisiert. Jede Datei deckt genau einen Bereich der UI ab. Die Aufteilung ist **abgeschlossen** – `styles.css` ist kein "noch aktives Monolith-Übergangsformat" mehr, sondern nur noch der zentrale Einstiegspunkt.

## Dateien

| Datei | Verantwortlich für |
|---|---|
| `styles.css` | Zentraler Einstiegspunkt (`@import` aller Module) **plus** die `body.preview-mode`-Overrides. Diese Overrides sind bewusst hier zentral gesammelt statt in einer eigenen Datei, weil sie quer über mehrere Bereiche (Sidebar, Inspector, Canvas, Zoom-Controls) hinweg wirken – siehe Regel "keine unnötigen Mini-Dateien". |
| `base.css` | CSS-Variablen (Farben, Schatten), Reset, Grundtypografie, `.hidden`, `.divider`. |
| `layout.css` | Grobes Grundgerüst (`.app-body`). |
| `toolbar.css` | Obere Toolbar + alle `.btn*`-Button-Varianten (werden projektweit wiederverwendet). |
| `sidebar.css` | Linke Seitenleiste: Tabs, Paletten-Grid, Formular-Reihen (`.item-row`), Produktkarten. |
| `inspector.css` | Rechter Eigenschaften-Bereich, Textformat-Toolbar. |
| `canvas.css` | Zeichenfläche, Zoom-Controls, Header-/Footer-Leisten (`.builder-bar`), Bar-Item-Interaktion. |
| `elements.css` | Elementpalette (`.draggable-item`) und auf der Fläche platzierte Elemente (`.placed-element`). |
| `modals.css` | Toasts, Drawer (Warenkorb), generisches Modal. |
| `responsive.css` | Anpassungen für kleinere Bildschirme (≤1024px). |

## Regeln

1. Vor jeder Änderung prüfen, ob die Regel schon in einer bestehenden Datei existiert – keine doppelten Selektoren/Overrides.
2. Keine neue CSS-Datei anlegen, wenn eine bestehende Datei fachlich passt (z. B. gehören produktspezifische Klassen wie `.product-card` bewusst in `sidebar.css`, weil sie Teil des Produkte-Tabs in der Sidebar sind).
3. Selektoren/Klassennamen nicht ohne Grund umbenennen – sie werden aus JavaScript heraus per `className`/`classList` gesetzt.
4. `!important` ist im Projekt bewusst als Escape-Hatch für `body.preview-mode`-Overrides genutzt (Vorschau muss zuverlässig alle Editor-Chrome ausblenden, egal welche Spezifität die Grundregel hat). Außerhalb von Preview-Mode-Overrides sollte `!important` vermieden werden.
5. Responsive-Regeln zentral in `responsive.css` halten, nicht in den einzelnen Modul-Dateien verteilen.

## Zu prüfen (unsicher, ob noch benötigt)

Diese Klassen sind definiert, aber es konnte keine aktive Verwendung im aktuellen JavaScript gefunden werden. Vor dem Löschen bitte per Volltextsuche im ganzen Repo verifizieren:

- `.mini-check` (`sidebar.css`)
- `.item-row-drag-handle` (`sidebar.css`) – vermutlich für ein nie fertiggestelltes Drag-Reorder-Feature (z. B. Meilensteine/Empfehlungen sortierbar machen) vorbereitet.

## Empfehlung für später

Viele UI-Strings, die aus JavaScript heraus per `innerHTML` gebaut werden (z. B. Cloud-Modal in `supabase.js`, Warenkorb-Items in `cart.js`, Produktkarten in `products.js`), enthalten aktuell viele Inline-`style="..."`-Attribute statt CSS-Klassen. Das bläht die JS-Dateien auf und verteilt Design-Entscheidungen über zwei Sprachen. Mittelfristig sinnvoll: diese Inline-Styles in feste Klassen in `modals.css`/`sidebar.css` überführen.
