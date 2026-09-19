// js/ui/sidebar-panels-markup.js
// Statisches Markup der vier Sidebar-Tabs (Elemente/Kopf-Fuß/Warenkorb/
// Produkte) aus web.html ausgelagert, um die HTML-Datei kürzer zu halten.
// Baut nur Strings und injiziert sie per innerHTML — bindet keine Events
// (das bleibt in canvas.js/editor/background.js/header-footer-inspector.js/
// cart-sidebar.js/products.js, exakt wie vorher).
//
// Ladereihenfolge: MUSS vor js/layout/header-footer-inspector.js laden —
// dessen bind() läuft synchron auf DOMContentLoaded (nicht per setTimeout)
// und braucht die Kopf-/Fußzeilen-Sidebar-Felder sofort. Alle anderen
// Consumer (canvas.js, editor/background.js, editor/inspector.js,
// shop/products.js, shop/cart-sidebar.js) greifen erst per
// setTimeout(fn, 0) zu und sind unabhängig von der Ladereihenfolge sicher.
(() => {
  function panelElements() {
    return `
      <p class="help-text">Ziehe Bausteine auf die Zeichenfläche.</p>

      <div class="section-title">Standard Elemente</div>
      <div class="palette-grid">
        <div class="draggable-item" draggable="true" data-type="headline"><span class="item-icon">🔤</span><span>Überschrift</span></div>
        <div class="draggable-item" draggable="true" data-type="text"><span class="item-icon">📝</span><span>Textfeld</span></div>
        <div class="draggable-item" draggable="true" data-type="button"><span class="item-icon">🔘</span><span>Button</span></div>
        <div class="draggable-item" draggable="true" data-type="box"><span class="item-icon">📦</span><span>Container Box</span></div>
        <div class="draggable-item" draggable="true" data-type="image"><span class="item-icon">🖼️</span><span>Bild</span></div>
      </div>

      <div class="section-title">Test-Objekte</div>
      <div class="palette-grid">
        <div class="draggable-item" draggable="true" data-type="shape" data-shape="rectangle"><span class="item-icon">▭</span><span>Rechteck</span></div>
        <div class="draggable-item" draggable="true" data-type="shape" data-shape="circle"><span class="item-icon">⚪</span><span>Kreis</span></div>
        <div class="draggable-item" draggable="true" data-type="shape" data-shape="triangle"><span class="item-icon">▲</span><span>Dreieck</span></div>
      </div>
      <p class="help-text">Test-Objekt auf die Fläche ziehen und rechts im Inspector Form, Farbe &amp; Stil wählen.</p>

      <div class="section-title">Icons &amp; Symbole</div>
      <div class="palette-grid">
        <div class="draggable-item" draggable="true" data-type="icon" data-icon="cart"><span class="item-icon">🛒</span><span>Warenkorb</span></div>
        <div class="draggable-item" draggable="true" data-type="icon" data-icon="settings"><span class="item-icon">⚙️</span><span>Einstellungen</span></div>
        <div class="draggable-item" draggable="true" data-type="icon" data-icon="arrow-up"><span class="item-icon">⬆️</span><span>Pfeil Oben</span></div>
        <div class="draggable-item" draggable="true" data-type="icon" data-icon="arrow-down"><span class="item-icon">⬇️</span><span>Pfeil Unten</span></div>
        <div class="draggable-item" draggable="true" data-type="icon" data-icon="arrow-left"><span class="item-icon">⬅️</span><span>Pfeil Links</span></div>
        <div class="draggable-item" draggable="true" data-type="icon" data-icon="arrow-right"><span class="item-icon">➡️</span><span>Pfeil Rechts</span></div>
      </div>

      <div class="section-title">Eigene Icons</div>
      <div class="sidebar-subsection">
        <p class="help-text" style="margin-bottom:8px;">Füge ein eigenes Icon per Bilddatei hinzu. Eigene Icons gelten nur für die aktuelle Sitzung und werden nicht im Projekt gespeichert.</p>
        <div class="form-group">
          <label for="custom-icon-name">Name</label>
          <input type="text" id="custom-icon-name" placeholder="z. B. haken">
        </div>
        <div class="form-group">
          <label>Bilddatei</label>
          <div class="file-input-wrapper">
            <button type="button" class="file-input-btn">📁 Datei wählen</button>
            <input type="file" id="custom-icon-file" accept="image/*">
          </div>
        </div>
        <button type="button" id="btn-add-custom-icon" class="btn btn-secondary" style="width:100%;">+ Icon hinzufügen</button>
        <div id="custom-icon-palette" class="palette-grid" style="margin-top:10px;"></div>
      </div>

      <div class="section-title">Hintergrund der Seite</div>
      <div class="sidebar-subsection sidebar-bg-controls">
        <div class="form-group">
          <label for="bg-type">Typ</label>
          <select id="bg-type">
            <option value="solid">Einfarbig</option>
            <option value="gradient">Farbverlauf</option>
            <option value="image">Hintergrundbild</option>
          </select>
        </div>

        <div id="bg-solid-group" class="form-group">
          <label for="bg-color-input">Farbe</label>
          <input type="color" id="bg-color-input" value="#ffffff" title="Hintergrundfarbe wählen">
        </div>

        <div id="bg-gradient-group" class="hidden form-group">
          <label>Farbverlauf</label>
          <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;">
            <input type="color" id="bg-grad-1" value="#4f46e5" title="Farbe 1">
            <input type="color" id="bg-grad-2" value="#06b6d4" title="Farbe 2">
            <select id="bg-grad-dir">
              <option value="to right">➔ Rechts</option>
              <option value="to bottom">⬇️ Unten</option>
              <option value="135deg">↘️ Diagonal</option>
            </select>
          </div>
        </div>

        <div id="bg-image-group" class="hidden form-group">
          <label for="bg-image-url">Bild</label>
          <input type="text" id="bg-image-url" placeholder="Bild URL eingeben...">
          <div class="file-input-wrapper" style="margin-top:6px;">
            <button type="button" class="file-input-btn">📁 Datei wählen</button>
            <input type="file" id="bg-image-file" accept="image/*">
          </div>
        </div>
      </div>

      <div class="section-title">Seitengröße</div>
      <div class="sidebar-subsection">
        <p class="help-text" style="margin-bottom:8px;">Verlängere die Zeichenfläche nach unten, wenn du mehr Platz brauchst. Der Knopf ist auch direkt unter der Fläche verfügbar.</p>
        <button type="button" id="btn-extend-canvas-side" class="btn btn-secondary" style="width:100%;">⬇️ Seite verlängern (+300px)</button>
        <button type="button" id="btn-shrink-canvas-side" class="btn btn-secondary" style="width:100%; margin-top:6px;">⬆️ Seite verkürzen (-300px)</button>
      </div>

      <div class="section-title">Danger Zone</div>
      <button type="button" id="btn-clear" class="btn btn-danger-outline" style="width:100%;">🗑️ Canvas leeren</button>
    `;
  }

  function panelHeaderFooter() {
    return `
      <div class="section-title">Kopfzeile</div>
      <div class="sidebar-subsection">
        <label class="checkbox-row"><input type="checkbox" id="header-toggle"> Header anzeigen</label>
        <label class="checkbox-row"><input type="checkbox" id="header-sticky-toggle"> Header fixiert (sticky)</label>

        <div class="form-group">
          <label for="header-height-input">Höhe (px) — auch direkt am Header ziehbar</label>
          <input type="number" id="header-height-input" value="64" min="40" max="400">
        </div>

        <div class="form-group">
          <label for="header-bg-type">Hintergrund-Typ</label>
          <select id="header-bg-type">
            <option value="solid">Einfarbig</option>
            <option value="image">Bild</option>
          </select>
        </div>
        <div id="header-bg-solid-group" class="form-group">
          <label for="header-bg-input">Hintergrundfarbe</label>
          <input type="color" id="header-bg-input" value="#111827">
        </div>
        <div id="header-bg-image-group" class="hidden form-group">
          <label for="header-bg-image-url">Bild</label>
          <input type="text" id="header-bg-image-url" placeholder="Bild URL eingeben...">
          <div class="file-input-wrapper" style="margin-top:6px;">
            <button type="button" class="file-input-btn">📁 Datei wählen</button>
            <input type="file" id="header-bg-image-file" accept="image/*">
          </div>
        </div>

        <div class="mini-btn-row">
          <button type="button" id="btn-add-header-text" class="btn btn-secondary btn-sm">+ Text</button>
          <button type="button" id="btn-add-header-icon" class="btn btn-secondary btn-sm">+ Icon</button>
        </div>
        <p class="help-text" style="margin:4px 0 8px;">Klicke auf ein Element in der Liste oder direkt auf der Fläche, um Text, Format, Farbe und Klick-Aktion rechts im Eigenschaften-Bereich einzustellen.</p>
        <div id="header-items-list" class="items-list"></div>
      </div>

      <div class="section-title">Fußzeile</div>
      <div class="sidebar-subsection">
        <label class="checkbox-row"><input type="checkbox" id="footer-toggle"> Footer anzeigen</label>
        <div class="form-group">
          <label for="footer-height-input">Höhe (px) — auch direkt am Footer ziehbar</label>
          <input type="number" id="footer-height-input" value="70" min="40" max="400">
        </div>

        <div class="form-group">
          <label for="footer-bg-type">Hintergrund-Typ</label>
          <select id="footer-bg-type">
            <option value="solid">Einfarbig</option>
            <option value="image">Bild</option>
          </select>
        </div>
        <div id="footer-bg-solid-group" class="form-group">
          <label for="footer-bg-input">Hintergrundfarbe</label>
          <input type="color" id="footer-bg-input" value="#111827">
        </div>
        <div id="footer-bg-image-group" class="hidden form-group">
          <label for="footer-bg-image-url">Bild</label>
          <input type="text" id="footer-bg-image-url" placeholder="Bild URL eingeben...">
          <div class="file-input-wrapper" style="margin-top:6px;">
            <button type="button" class="file-input-btn">📁 Datei wählen</button>
            <input type="file" id="footer-bg-image-file" accept="image/*">
          </div>
        </div>

        <div class="mini-btn-row">
          <button type="button" id="btn-add-footer-text" class="btn btn-secondary btn-sm">+ Text</button>
          <button type="button" id="btn-add-footer-icon" class="btn btn-secondary btn-sm">+ Icon</button>
        </div>
        <div id="footer-items-list" class="items-list"></div>
      </div>
    `;
  }

  // Sidebar enthält nur Ein-/Ausschalter + Sprung-Button zur
  // Artikel-Darstellung; Farben/Formen/Labels/Positionen und die
  // Empfehlungs-/Meilenstein-Listen werden im Warenkorb-Editor selbst
  // bearbeitet (#cart-inspector-form, siehe cart-editor-markup.js).
  function panelCart() {
    return `
      <button type="button" id="btn-cart-focus-editor" class="btn btn-primary" style="width:100%; margin-bottom:14px;">🎯 Warenkorb-Editor öffnen</button>

      <div class="section-title">Warenkorb-Grundeinstellungen</div>
      <div class="sidebar-subsection">
        <button type="button" id="btn-open-cart" class="btn btn-secondary" style="width:100%;">🛒 Vorschau öffnen</button>
      </div>

      <div class="section-title">Artikel-Darstellung</div>
      <div class="sidebar-subsection">
        <p class="help-text" style="margin-bottom:8px;">Form, Hintergrund und Größe der Artikel im Warenkorb. Öffnet den Editor und wählt die Artikel-Darstellung — dort lässt sie sich auch direkt an der Ecke ziehen, um sie größer/kleiner zu machen.</p>
        <button type="button" id="btn-select-item-representation" class="btn btn-secondary" style="width:100%;">🖼️ Artikel-Darstellung bearbeiten</button>
      </div>

      <div class="section-title">Artikelliste</div>
      <div class="sidebar-subsection">
        <p class="help-text" style="margin-bottom:8px;">Die Artikelliste hat eine feste Höhe und bekommt bei Bedarf ihren eigenen Scrollbalken — so bleiben Rabattfeld, Empfehlung und Kosten-Übersicht immer an derselben Stelle, egal wie viele Artikel im Warenkorb liegen.</p>
        <div class="form-group">
          <label for="cart-items-max-height">Höhe der Artikelliste (px, leer = Standard)</label>
          <input type="number" id="cart-items-max-height" min="80" step="10" placeholder="Standard">
        </div>
      </div>

      <div class="section-title">Produkt-Segmente</div>
      <div class="sidebar-subsection">
        <p class="help-text" style="margin-bottom:8px;">Gruppiere bestimmte Produkte im Warenkorb zu einem Segment (z. B. „Zubehör“) und trenne sie optional mit einer Linie von den übrigen Artikeln ab.</p>
        <div id="cart-segment-list" class="items-list"></div>
        <button type="button" id="btn-add-segment" class="btn btn-secondary" style="width:100%;">+ Segment erstellen</button>
      </div>

      <hr class="divider">
      <label class="checkbox-row"><input type="checkbox" id="cart-discount-toggle"> Rabattcode-Feld aktivieren</label>
      <p class="help-text" style="margin:-6px 0 0;">Farbe, Form &amp; Position im Warenkorb-Editor anpassbar — dort auf das Rabattfeld klicken.</p>

      <hr class="divider">
      <label class="checkbox-row"><input type="checkbox" id="cart-recommend-toggle"> Produktempfehlungen</label>
      <p class="help-text" style="margin:-6px 0 0;">Empfehlungen verwalten &amp; Position anpassen im Warenkorb-Editor — dort auf die Empfehlung klicken.</p>

      <hr class="divider">
      <label class="checkbox-row"><input type="checkbox" id="cart-progress-toggle"> Fortschrittsbalken</label>
      <p class="help-text" style="margin:-6px 0 0;">Farbe &amp; Meilensteine verwalten &amp; Position anpassen im Warenkorb-Editor — dort auf den Fortschrittsbalken klicken. Versandkosten &amp; Freibetrag-Ziel stehen dort in der Kosten-Übersicht.</p>
    `;
  }

  function panelProducts() {
    return `
      <div class="section-title">Produkte verwalten</div>
      <p class="help-text">Lege hier deine Produkte mit Name, Preis, Icon &amp; Beschreibung an. Im Element-Inspector wählst du dann bei der Aktion „In den Warenkorb legen“ eines dieser Produkte aus.</p>
      <button type="button" id="btn-add-product" class="btn btn-primary" style="width:100%; margin-bottom:12px;">+ Neues Produkt</button>
      <div id="product-list"></div>
    `;
  }

  function fill(id, html) {
    const el = document.getElementById(id);
    if (el && !el.dataset.webBuilderMarkupBound) {
      el.innerHTML = html;
      el.dataset.webBuilderMarkupBound = "true";
    }
  }

  function populate() {
    fill("panel-elements", panelElements());
    fill("panel-headerfooter", panelHeaderFooter());
    fill("panel-cart", panelCart());
    fill("panel-products", panelProducts());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", populate, { once: true });
  } else {
    populate();
  }

  window.WebBuilderSidebarPanelsMarkup = { populate };
})();
