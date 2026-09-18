// js/shop/cart-editor-panel.js
// WebBuilder cart focus editor — right-hand panel rendering.
// Owns renderFocusPartPanel(): shows/hides the #cart-inspector-form field
// groups for whichever part/component is currently selected
// (state.cartFocusSelectedPart) and fills them with their current
// values. Field event bindings (turning user input into
// cart.setConfig()/cart.setItemDisplay() calls) live in
// cart-editor-bindings.js, not here — this file only reads and displays.
// Selection state and the layout data model live in cart-editor-stage.js,
// reached here only through window.WebBuilderCartFocus.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartFocus: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartFocus: WebBuilderCart is not available."); return; }
  const focus = () => window.WebBuilderCartFocus || {};

  const PART_FIELD_BLOCK_IDS = [
    "cart-comp-title-fields", "cart-comp-checkout-fields", "cart-comp-discount-fields", "cart-comp-item-fields",
    "cart-comp-background-fields", "cart-comp-recommend-fields", "cart-comp-progress-fields",
    "cart-comp-qty-fields", "cart-comp-price-fields", "cart-comp-remove-fields",
    "cart-comp-totals-fields", "cart-comp-divider-fields"
  ];

  function renderFocusPartPanel() {
    const empty = document.getElementById("cart-part-empty");
    const editor = document.getElementById("cart-part-editor");
    if (!empty || !editor) return;
    const sel = state.cartFocusSelectedPart;
    if (!sel) { empty.classList.remove("hidden"); editor.classList.add("hidden"); return; }
    empty.classList.add("hidden"); editor.classList.remove("hidden");

    PART_FIELD_BLOCK_IDS.forEach(id => document.getElementById(id)?.classList.add("hidden"));
    const positionFields = document.getElementById("cart-comp-position-fields");
    positionFields?.classList.toggle("hidden", !!focus().NON_POSITIONABLE?.has(sel));

    const labels = {
      icon: "Icon / Name", qty: "Mengenanzeige", price: "Preis", remove: "Entfernen-Button", description: "Beschreibung",
      "component:checkout": "Zur-Kasse-Button", "component:discount": "Rabattfeld", "component:progress": "Fortschrittsbalken",
      "component:recommend": "Empfehlung", "component:background": "Hintergrund", "component:itemRepresentation": "Artikel-Darstellung",
      "component:totals": "Kosten-Übersicht", "component:title": "Warenkorb-Titel"
    };
    const labelEl = document.getElementById("cart-part-label");
    if (labelEl) labelEl.textContent = focus().isDividerKey?.(sel) ? "Trennlinie" : (labels[sel] || sel);

    const config = cart.getConfig();

    // Labels that would otherwise show a hardcoded "€" follow the
    // currently selected currency (cartConfig.currency, see
    // cart-data.js CURRENCY_PRESETS).
    const currencySymbol = (config.currency && config.currency.symbol) || "€";
    const discountThresholdCurrencyEl = document.getElementById("cart-discount-threshold-currency");
    if (discountThresholdCurrencyEl) discountThresholdCurrencyEl.textContent = currencySymbol;
    const shippingCostCurrencyEl = document.getElementById("cart-shipping-cost-currency");
    if (shippingCostCurrencyEl) shippingCostCurrencyEl.textContent = currencySymbol;
    const shippingFreeThresholdCurrencyEl = document.getElementById("cart-shipping-free-threshold-currency");
    if (shippingFreeThresholdCurrencyEl) shippingFreeThresholdCurrencyEl.textContent = currencySymbol;

    if (sel === "component:title") {
      // The cart title is a plain, freely placeable component with an
      // optional {anzahl} placeholder for the live item count.
      document.getElementById("cart-comp-title-fields")?.classList.remove("hidden");
      const titleInput = document.getElementById("cart-comp-title-label");
      if (titleInput && document.activeElement !== titleInput) titleInput.value = config.cartTitleLabel || `Dein Warenkorb (${cart.TITLE_COUNT_PLACEHOLDER})`;
    } else if (sel === "component:checkout") {
      document.getElementById("cart-comp-checkout-fields")?.classList.remove("hidden");
      const labelInput = document.getElementById("cart-comp-checkout-label");
      if (labelInput && document.activeElement !== labelInput) labelInput.value = state.cartButtonLabel || "";
      const colorInput = document.getElementById("cart-comp-checkout-color");
      if (colorInput) colorInput.value = config.buttonColor || "#4f46e5";
      const shapeSel = document.getElementById("cart-comp-checkout-shape");
      if (shapeSel) shapeSel.value = config.buttonShape || "rounded";
    } else if (sel === "component:discount") {
      document.getElementById("cart-comp-discount-fields")?.classList.remove("hidden");
      const colorInput = document.getElementById("cart-comp-discount-color");
      if (colorInput) colorInput.value = config.discountButtonColor || "#4f46e5";
      const shapeSel = document.getElementById("cart-comp-discount-shape");
      if (shapeSel) shapeSel.value = config.discountButtonShape || "rounded";
      const percentInput = document.getElementById("cart-comp-discount-percent");
      if (percentInput && document.activeElement !== percentInput) percentInput.value = config.milestoneDiscountPercent != null ? config.milestoneDiscountPercent : 10;
      const discountThresholdInput = document.getElementById("cart-comp-discount-threshold");
      if (discountThresholdInput && document.activeElement !== discountThresholdInput) discountThresholdInput.value = config.milestoneDiscountThreshold != null ? config.milestoneDiscountThreshold : "";
    } else if (sel === "component:progress") {
      document.getElementById("cart-comp-progress-fields")?.classList.remove("hidden");
      const progressColorInput = document.getElementById("cart-comp-progress-color");
      if (progressColorInput) progressColorInput.value = config.progressBarColor || "#10b981";
      const completeTextInput = document.getElementById("cart-comp-progress-complete-text");
      if (completeTextInput && document.activeElement !== completeTextInput) completeTextInput.value = config.progressCompleteText || "✓ Alle Ziele freigeschaltet";
      window.WebBuilderCartConfigRuntime?.renderMilestoneList?.();
    } else if (sel === "component:recommend") {
      document.getElementById("cart-comp-recommend-fields")?.classList.remove("hidden");
      window.WebBuilderCartConfigRuntime?.renderRecommendList?.();
    } else if (sel === "component:background") {
      document.getElementById("cart-comp-background-fields")?.classList.remove("hidden");
      const colorInput = document.getElementById("cart-comp-bg-color");
      if (colorInput) colorInput.value = config.cardBackgroundColor || "#ffffff";
    } else if (sel === "component:itemRepresentation") {
      document.getElementById("cart-comp-item-fields")?.classList.remove("hidden");
      const shapeSel = document.getElementById("cart-item-shape");
      if (shapeSel) shapeSel.value = config.itemShape || "rounded";
      const bgInput = document.getElementById("cart-item-bg-color");
      if (bgInput) bgInput.value = config.itemBackgroundColor || "#f3f4f6";
      const wInput = document.getElementById("cart-item-width"), hInput = document.getElementById("cart-item-height");
      if (wInput && document.activeElement !== wInput) wInput.value = config.itemWidth || "";
      if (hInput && document.activeElement !== hInput) hInput.value = config.itemMinHeight || "";
      const sd = document.getElementById("cid-show-description"); if (sd) sd.checked = !!config.itemDisplay.showDescription;
      const dividerGroup = document.getElementById("cart-item-divider-group");
      dividerGroup?.classList.toggle("hidden", config.itemShape !== "transparent");
      const dividerCb = document.getElementById("cid-show-item-dividers");
      if (dividerCb) dividerCb.checked = !!config.itemDisplay.showItemDividers;
    } else if (sel === "component:totals") {
      document.getElementById("cart-comp-totals-fields")?.classList.remove("hidden");
      const currencySelect = document.getElementById("cart-comp-currency");
      if (currencySelect) {
        const currency = config.currency || {};
        const presetKey = Object.keys(cart.CURRENCY_PRESETS).find(key => {
          const p = cart.CURRENCY_PRESETS[key];
          return p.symbol === currency.symbol && p.position === currency.position && p.decimal === currency.decimal;
        }) || "eur";
        currencySelect.value = presetKey;
      }
      const subtotalInput = document.getElementById("cart-comp-subtotal-label");
      if (subtotalInput && document.activeElement !== subtotalInput) subtotalInput.value = config.subtotalLabel || "Zwischensumme";
      const discountInput = document.getElementById("cart-comp-discount-label");
      if (discountInput && document.activeElement !== discountInput) discountInput.value = config.discountLabel || "Rabatt";
      const totalLabelInput = document.getElementById("cart-comp-total-label");
      if (totalLabelInput && document.activeElement !== totalLabelInput) totalLabelInput.value = config.totalLabel || "Gesamt";
      const hasFreeProductMilestone = (config.milestones || []).some(m => m.action === "free-product");
      const freeProductGroup = document.getElementById("cart-comp-free-product-group");
      freeProductGroup?.classList.toggle("hidden", !hasFreeProductMilestone);
      if (hasFreeProductMilestone) {
        const freeProductLabelInput = document.getElementById("cart-comp-free-product-label");
        if (freeProductLabelInput && document.activeElement !== freeProductLabelInput) freeProductLabelInput.value = config.freeProductLabel || "🎁 Gratis-Produkt";
        const freeProductValueInput = document.getElementById("cart-comp-free-product-value");
        if (freeProductValueInput && document.activeElement !== freeProductValueInput) freeProductValueInput.value = config.freeProductValueText || "freigeschaltet";
      }
      // Shipping is part of the Kosten-Übersicht block, not its own component.
      const shippingLabelInput = document.getElementById("cart-comp-shipping-label");
      if (shippingLabelInput && document.activeElement !== shippingLabelInput) shippingLabelInput.value = config.shippingLabel || "Versand";
      const shippingCostInput = document.getElementById("cart-comp-shipping-cost");
      if (shippingCostInput && document.activeElement !== shippingCostInput) shippingCostInput.value = config.shippingCost != null ? config.shippingCost : 4.95;
      const shippingFreeInput = document.getElementById("cart-comp-shipping-free-text");
      if (shippingFreeInput && document.activeElement !== shippingFreeInput) shippingFreeInput.value = config.shippingFreeText || "Kostenlos";
      const shippingThresholdInput = document.getElementById("cart-comp-shipping-free-threshold");
      if (shippingThresholdInput && document.activeElement !== shippingThresholdInput) shippingThresholdInput.value = config.shippingFreeThreshold != null ? config.shippingFreeThreshold : "";
    } else if (focus().isDividerKey?.(sel)) {
      document.getElementById("cart-comp-divider-fields")?.classList.remove("hidden");
    } else if (sel === "qty") {
      document.getElementById("cart-comp-qty-fields")?.classList.remove("hidden");
      const qs = document.getElementById("cid-quantity-style"); if (qs) qs.value = config.itemDisplay.quantityStyle || "stepper";
      const qgs = document.getElementById("cid-quantity-shape"); if (qgs) qgs.value = config.itemDisplay.quantityGroupShape || "rounded";
      const qbc = document.getElementById("cid-quantity-color"); if (qbc) qbc.value = config.itemDisplay.quantityButtonColor || "black";
    } else if (sel === "price") {
      document.getElementById("cart-comp-price-fields")?.classList.remove("hidden");
      const ps = document.getElementById("cid-price-style"); if (ps) ps.value = config.itemDisplay.priceStyle || "simple";
    } else if (sel === "remove") {
      document.getElementById("cart-comp-remove-fields")?.classList.remove("hidden");
      const removeColor = document.getElementById("cart-remove-color");
      if (removeColor) removeColor.value = config.removeButtonColor || "#ef4444";
      const rs = document.getElementById("cid-remove-style"); if (rs) rs.value = config.itemDisplay.removeStyle || "x";
      const rsh = document.getElementById("cid-remove-shape"); if (rsh) rsh.value = config.itemDisplay.removeShape || "circle";
    }

    if (!focus().NON_POSITIONABLE?.has(sel)) {
      const layout = focus().getSelectedLayout?.() || { x: 0, y: 0 };
      const xInput = document.getElementById("cart-part-x"), yInput = document.getElementById("cart-part-y");
      if (xInput && document.activeElement !== xInput) xInput.value = layout.x;
      if (yInput && document.activeElement !== yInput) yInput.value = layout.y;
    }
  }

  window.WebBuilderCartFocus = Object.assign(window.WebBuilderCartFocus || {}, { renderPartPanel: renderFocusPartPanel });
})();
