// js/shop/cart-editor-markup.js
// Statisches Markup von #cart-inspector-form (rechtes Warenkorb-Editor-
// Panel) aus web.html ausgelagert. Baut nur HTML und injiziert es per
// innerHTML — bindet keine Events und liest keinen State (das bleibt in
// cart-editor-panel.js/cart-editor-bindings.js, die dieselben Feld-IDs
// per getElementById ansprechen wie zuvor in web.html).
//
// Ladereihenfolge: MUSS vor js/ui/shared-markup.js laden — dieses füllt
// die drei hier absichtlich leeren Shape-Selects (Abgerundet/Eckig/
// Rund (Pille)) per shared-markup.js's buildShapeOptionsHtml(), was nur
// funktioniert, wenn die <select>-Elemente zu dem Zeitpunkt schon im DOM
// stehen.
(() => {
  function markup() {
    return `
      <p class="help-text" style="margin-bottom:6px;">🛒 Warenkorb-Editor</p>
      <p class="help-text" id="cart-part-empty">Noch kein Element ausgewählt. Klicke im Editor auf einen Bereich (Warenkorb-Titel, Artikel, Fortschrittsbalken, Rabattfeld, Empfehlung, Zur-Kasse-Button, Kosten-Übersicht, Trennlinie, Segment oder Hintergrund), um ihn hier anzupassen.</p>

      <div id="cart-part-editor" class="hidden">
        <div class="form-group"><label id="cart-part-label">Element</label></div>

        <div id="cart-comp-title-fields" class="hidden">
          <div class="form-group">
            <label for="cart-comp-title-label">Titel</label>
            <input type="text" id="cart-comp-title-label" placeholder="Dein Warenkorb ({anzahl})">
          </div>
          <p class="help-text">Verwende <code>{anzahl}</code> als Platzhalter für die aktuelle Artikelanzahl — er kann an beliebiger Stelle im Text stehen, z. B. „{anzahl} Produkte“.</p>
        </div>

        <div id="cart-comp-checkout-fields" class="hidden">
          <div class="form-group"><label for="cart-comp-checkout-label">Beschriftung</label><input type="text" id="cart-comp-checkout-label"></div>
          <div class="form-group"><label for="cart-comp-checkout-color">Farbe</label><input type="color" id="cart-comp-checkout-color"></div>
          <div class="form-group"><label for="cart-comp-checkout-shape">Form</label>
            <select id="cart-comp-checkout-shape"></select>
          </div>
        </div>

        <div id="cart-comp-discount-fields" class="hidden">
          <div class="form-group"><label for="cart-comp-discount-color">Farbe</label><input type="color" id="cart-comp-discount-color"></div>
          <div class="form-group"><label for="cart-comp-discount-shape">Form</label>
            <select id="cart-comp-discount-shape"></select>
          </div>
        </div>

        <div id="cart-comp-background-fields" class="hidden">
          <div class="form-group"><label for="cart-comp-bg-color">Hintergrundfarbe</label><input type="color" id="cart-comp-bg-color"></div>
        </div>

        <div id="cart-comp-totals-fields" class="hidden">
          <div class="form-group"><label for="cart-comp-currency">Währung</label>
            <select id="cart-comp-currency">
              <option value="eur">€ Euro</option>
              <option value="usd">$ US-Dollar</option>
              <option value="gbp">£ Britisches Pfund</option>
            </select>
          </div>
          <div class="form-group"><label for="cart-comp-subtotal-label">Label „Zwischensumme“</label><input type="text" id="cart-comp-subtotal-label" placeholder="Zwischensumme"></div>
          <div class="form-group"><label for="cart-comp-total-label">Label „Gesamt“</label><input type="text" id="cart-comp-total-label" placeholder="Gesamt"></div>

          <div class="inspector-subcard">
            <div class="inspector-subcard-title">💸 Rabatt</div>
            <div class="form-group"><label for="cart-comp-discount-label">Label „Rabatt“</label><input type="text" id="cart-comp-discount-label" placeholder="Rabatt"></div>
            <div class="form-group"><label for="cart-comp-discount-percent">Extra-Rabatt bei Meilenstein (%)</label><input type="number" id="cart-comp-discount-percent" min="0" max="100" step="1" placeholder="10"></div>
            <div class="form-group"><label for="cart-comp-discount-threshold">Rabatt ab Warenkorbwert (<span id="cart-discount-threshold-currency">€</span>)</label><input type="number" id="cart-comp-discount-threshold" min="0" step="0.01" placeholder="kein automatisches Ziel"></div>
            <p class="help-text">Der Extra-Rabatt gilt, sobald entweder ein Meilenstein „Extra-Rabatt“ erreicht ist oder der Warenkorbwert das oben eingestellte Ziel erreicht — beide Werte werden automatisch synchron gehalten, wenn ein solcher Meilenstein existiert. Er kommt zusätzlich zu einem eingelösten Rabattcode obendrauf.</p>
          </div>

          <div class="inspector-subcard">
            <div class="inspector-subcard-title">🚚 Versand</div>
            <div class="form-group"><label for="cart-comp-shipping-label">Label „Versand“</label><input type="text" id="cart-comp-shipping-label" placeholder="Versand"></div>
            <div class="form-group"><label for="cart-comp-shipping-cost">Versandkosten (<span id="cart-shipping-cost-currency">€</span>)</label><input type="number" id="cart-comp-shipping-cost" min="0" step="0.01"></div>
            <div class="form-group"><label for="cart-comp-shipping-free-text">Text bei kostenlosem Versand</label><input type="text" id="cart-comp-shipping-free-text" placeholder="Kostenlos"></div>
            <div class="form-group"><label for="cart-comp-shipping-free-threshold">Kostenlos ab Warenkorbwert (<span id="cart-shipping-free-threshold-currency">€</span>)</label><input type="number" id="cart-comp-shipping-free-threshold" min="0" step="0.01" placeholder="kein automatisches Ziel"></div>
            <p class="help-text">Die Versandkosten gelten nur, solange der Fortschrittsbalken aktiviert ist. Kostenlos wird der Versand, sobald entweder ein Meilenstein „Kostenloser Versand“ erreicht ist oder der Warenkorbwert das oben eingestellte Ziel erreicht — beide Werte werden automatisch synchron gehalten, wenn ein solcher Meilenstein existiert.</p>
          </div>

          <div class="hidden" id="cart-comp-free-product-group">
            <div class="inspector-subcard">
              <div class="inspector-subcard-title">🎁 Gratis-Produkt</div>
              <div class="form-group"><label for="cart-comp-free-product-label">Label</label><input type="text" id="cart-comp-free-product-label" placeholder="🎁 Gratis-Produkt"></div>
              <div class="form-group"><label for="cart-comp-free-product-value">Werttext</label><input type="text" id="cart-comp-free-product-value" placeholder="freigeschaltet"></div>
              <p class="help-text">Wird nur angezeigt, sobald ein Meilenstein mit Aktion „Gratis-Produkt Hinweis“ erreicht ist.</p>
            </div>
          </div>
        </div>

        <div id="cart-comp-divider-fields" class="hidden">
          <p class="help-text">Diese Trennlinie lässt sich überall im Warenkorb frei platzieren — zieh sie einfach an die gewünschte Stelle.</p>
          <button type="button" id="btn-remove-divider" class="btn btn-danger-outline" style="width:100%;">🗑️ Trennlinie entfernen</button>
        </div>

        <div id="cart-comp-progress-fields" class="hidden">
          <div class="form-group"><label for="cart-comp-progress-color">Balkenfarbe</label><input type="color" id="cart-comp-progress-color"></div>
          <div class="form-group"><label for="cart-comp-progress-complete-text">Text bei „alle Ziele erreicht“</label><input type="text" id="cart-comp-progress-complete-text" placeholder="✓ Alle Ziele freigeschaltet"></div>
          <p class="help-text" style="margin-top:-6px;">Wird angezeigt, sobald der höchste Meilenstein erreicht ist und dieser selbst kein eigenes „Text bei Erreichen“ gesetzt hat (siehe unten in der Meilenstein-Liste).</p>
          <p class="help-text">Meilensteine (das optionale Feld „Text bei Erreichen“ ersetzt die Standard-Erfolgsmeldung, sobald dieser Meilenstein der zuletzt erreichte ist). Ein Meilenstein mit Aktion „Kostenloser Versand“ hält sein Betrag-Feld automatisch mit dem Freibetrag-Ziel in der Kosten-Übersicht synchron, ein Meilenstein „Extra-Rabatt“ entsprechend mit dem Rabatt-Ziel im Rabatt-Bereich der Kosten-Übersicht:</p>
          <div class="mini-btn-row"><button type="button" id="btn-add-milestone" class="btn btn-secondary btn-sm" style="width:100%;">+ Meilenstein</button></div>
          <div id="cart-milestone-list" class="items-list"></div>
        </div>

        <div id="cart-comp-recommend-fields" class="hidden">
          <div class="form-group"><label for="cart-comp-recommend-shape">Form der Empfehlungskarte</label>
            <select id="cart-comp-recommend-shape"></select>
          </div>
          <div class="form-group"><label for="cart-comp-recommend-add-color">Farbe „+“-Button</label><input type="color" id="cart-comp-recommend-add-color"></div>
          <p class="help-text">Empfehlungen (angezeigt wird die erste passende):</p>
          <div class="mini-btn-row"><button type="button" id="btn-add-recommendation" class="btn btn-secondary btn-sm" style="width:100%;">+ Empfehlung aus Produkten</button></div>
          <div id="cart-recommend-list" class="items-list"></div>
        </div>

        <div id="cart-comp-item-fields" class="hidden">
          <div class="form-group"><label for="cart-item-shape">Form</label>
            <select id="cart-item-shape">
              <option value="transparent">Durchsichtig</option>
              <option value="square">Eckig</option>
              <option value="rounded">Abgerundet</option>
              <option value="pill">Rund</option>
            </select>
          </div>
          <div class="hidden" id="cart-item-divider-group">
            <label class="checkbox-row"><input type="checkbox" id="cid-show-item-dividers"> Trennlinie zwischen Produkten</label>
          </div>
          <div class="form-group"><label for="cart-item-bg-color">Hintergrundfarbe</label><input type="color" id="cart-item-bg-color"></div>
          <div class="form-group"><label for="cart-item-width">Breite (px, leer = automatisch)</label><input type="number" id="cart-item-width" min="120" step="1" placeholder="automatisch"></div>
          <div class="form-group"><label for="cart-item-height">Mindesthöhe (px, leer = automatisch)</label><input type="number" id="cart-item-height" min="30" step="1" placeholder="automatisch"></div>
          <p class="help-text">Tipp: Im Editor kannst du die Artikel-Box auch direkt an der Ecke unten rechts ziehen, um die Größe anzupassen.</p>
          <hr class="divider modal-divider-tight">
          <label class="checkbox-row"><input type="checkbox" id="cid-show-description"> Produktbeschreibung anzeigen</label>
        </div>

        <div id="cart-comp-qty-fields" class="hidden">
          <div class="form-group"><label>Mengenauswahl</label>
            <select id="cid-quantity-style">
              <option value="stepper">Einzelblöcke (− 1 +)</option>
              <option value="group">Gruppe (zusammenhängend)</option>
              <option value="dropdown">Dropdown-Liste</option>
              <option value="static">Nur Anzeige (nicht änderbar)</option>
            </select>
          </div>
          <div class="form-group"><label for="cid-quantity-shape">Form der Mengenauswahl (bei „Gruppe“)</label>
            <select id="cid-quantity-shape">
              <option value="square">Eckig</option>
              <option value="rounded">Abgerundet</option>
              <option value="pill">Rund (Pille)</option>
            </select>
          </div>
          <div class="form-group"><label for="cid-quantity-color">Farbe der +/- Buttons</label>
            <select id="cid-quantity-color">
              <option value="green">Grün</option>
              <option value="red">Rot</option>
              <option value="black">Schwarz</option>
              <option value="gray">Grau</option>
            </select>
          </div>
        </div>

        <div id="cart-comp-price-fields" class="hidden">
          <div class="form-group"><label>Preisanzeige</label>
            <select id="cid-price-style">
              <option value="simple">Einfach</option>
              <option value="strikethrough">Mit durchgestrichenem Originalpreis</option>
              <option value="perUnit">Einzelpreis + Summe</option>
            </select>
          </div>
        </div>

        <div id="cart-comp-remove-fields" class="hidden">
          <div class="form-group"><label>Entfernen-Symbol</label>
            <select id="cid-remove-style">
              <option value="x">✕ Kreuz</option>
              <option value="trash">🗑️ Papierkorb</option>
              <option value="text">Text „Entfernen“</option>
            </select>
          </div>
          <div class="form-group"><label>Entfernen-Button Form</label>
            <select id="cid-remove-shape">
              <option value="circle">Rund</option>
              <option value="square">Eckig</option>
              <option value="text">Ohne Rahmen</option>
            </select>
          </div>
          <div class="form-group"><label>Farbe Entfernen-Button</label><input type="color" id="cart-remove-color"></div>
        </div>

        <div id="cart-comp-position-fields">
          <div class="form-group">
            <label for="cart-part-x">Position X (px)</label>
            <input type="number" id="cart-part-x" step="1">
          </div>
          <div class="form-group">
            <label for="cart-part-y">Position Y (px)</label>
            <input type="number" id="cart-part-y" step="1">
          </div>
          <button type="button" id="cart-part-reset" class="btn btn-secondary" style="width:100%;">↺ Position zurücksetzen</button>
        </div>
      </div>

      <hr class="divider">
      <button type="button" id="btn-add-divider" class="btn btn-secondary" style="width:100%;">+ Trennlinie hinzufügen</button>

      <hr class="divider">
      <button type="button" id="btn-cart-focus-exit" class="btn btn-danger-outline" style="width:100%;">✖ Warenkorb-Editor schließen</button>
    `;
  }

  function populate() {
    const el = document.getElementById("cart-inspector-form");
    if (el && !el.dataset.webBuilderMarkupBound) {
      el.innerHTML = markup();
      el.dataset.webBuilderMarkupBound = "true";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", populate, { once: true });
  } else {
    populate();
  }

  window.WebBuilderCartEditorMarkup = { populate };
})();
