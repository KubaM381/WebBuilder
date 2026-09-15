// js/shop/cart-editor.js
// WebBuilder cart focus editor ("Warenkorb-Editor").
// Owns the dedicated editing stage mounted into .canvas-container: shows
// the full cart body (via cart-render.js's buildCartParts()) centered over
// the canvas, lets the user click/drag individual parts and top-level
// components, and drives the right-hand #cart-inspector-form panel. Cart
// data/CRUD lives in cart-data.js, shared HTML building + the real drawer
// live in cart-render.js — this file only adds the editing affordances.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartFocus: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartFocus: WebBuilderCart is not available."); return; }
  function notify(domain, action, payload) { if (typeof state.notify === "function") state.notify(domain, action, payload); }
  const esc = window.WebBuilderUtils.escapeHtml;

  function refreshCartViews() { window.WebBuilderCartRuntime?.refresh?.(); }

  // Der Warenkorb-Editor ist bewusst NICHT mehr mit der echten Kopf-/
  // Fußzeile der Seite verbunden (window.WebBuilderHeaderFooter) — die
  // echten Bars bleiben während des Editors ausgeblendet (siehe
  // css/styles.css body.cart-focus-active). Stattdessen liefert
  // js/shop/cart-preview-bars.js zwei rein visuelle, unabhängig
  // konfigurierbare Vorschau-Balken (Ein/Aus, Höhe, Farbe, Beschriftung —
  // Sidebar "Warenkorb" > "Vorschau: Kopf-/Fußzeile"), die hier nur der
  // räumlichen Orientierung dienen. Da diese Balken feste Pixelhöhen aus
  // dem State beziehen statt aus gemessenen DOM-Rects, genügt eine reine
  // Konfigurationsabfrage statt getBoundingClientRect() — kein
  // Resize-/Zoom-Listener mehr nötig für die Balken selbst (siehe aber
  // den neuen Resize-Listener unten für die Kartenhöhe, T3).
  const STAGE_BAR_GAP = 10;
  function computeStageInsets() {
    const cfg = window.WebBuilderCartPreviewBars?.getConfig?.() || { header: {}, footer: {} };
    const top = cfg.header.enabled ? Math.max(0, Number(cfg.header.height) || 0) + STAGE_BAR_GAP : 0;
    const bottom = cfg.footer.enabled ? Math.max(0, Number(cfg.footer.height) || 0) + STAGE_BAR_GAP : 0;
    return { top, bottom };
  }

  // Wendet Hintergrund (einfarbig/Bild), Textfarbe, Schriftart und
  // Fett-Schalter eines Vorschau-Balkens auf sein DOM-Element an. Alle
  // Werte kommen aus window.WebBuilderCartPreviewBars.getConfig() (siehe
  // js/shop/cart-preview-bars.js) — die Datenfelder existierten dort
  // bereits, hier wird nur die visuelle Anwendung ergänzt. Inline-Styles
  // gewinnen bewusst gegenüber den CSS-Defaults in
  // css/modals.css .cart-preview-bar (color:#fff; font-weight:600;), die
  // dadurch reine Fallbacks für den unkonfigurierten Fall bleiben.
  function applyBarStyle(el, barCfg) {
    if (!el || !barCfg) return;
    if (barCfg.bgType === "image" && barCfg.bgImage) {
      el.style.backgroundImage = `url("${barCfg.bgImage}")`;
      el.style.backgroundSize = "cover";
      el.style.backgroundPosition = "center";
      el.style.backgroundRepeat = "no-repeat";
      // Farbe bleibt als Fallback gesetzt, solange das Bild lädt.
      el.style.backgroundColor = barCfg.color || "#111827";
    } else {
      el.style.backgroundImage = "none";
      el.style.backgroundColor = barCfg.color || "#111827";
    }
    el.style.color = barCfg.textColor || "#ffffff";
    el.style.fontFamily = barCfg.fontFamily || "inherit";
    el.style.fontWeight = barCfg.bold ? "bold" : "600";
  }

  // Baut das Innere eines Vorschau-Balkens: optionales Icon (eigenes
  // hochgeladenes Bild ODER ein Emoji/Text-Icon, gegenseitig
  // ausschließend — siehe js/shop/cart-preview-bars.js) gefolgt von der
  // Beschriftung. iconImage hat Vorrang, falls beide Felder aus
  // irgendeinem Grund gleichzeitig gesetzt wären.
  function buildPreviewBarContentHtml(barCfg) {
    let iconHtml = "";
    if (barCfg.iconImage) {
      iconHtml = `<img class="cart-preview-bar-icon-img" src="${esc(barCfg.iconImage)}" alt="">`;
    } else if (barCfg.icon) {
      iconHtml = `<span class="cart-preview-bar-icon">${esc(barCfg.icon)}</span>`;
    }
    return `${iconHtml}<span class="cart-preview-bar-text">${esc(barCfg.label || "")}</span>`;
  }

  // Baut/aktualisiert die beiden rein dekorativen Vorschau-Balken direkt
  // im selben Host wie #cart-focus-stage (siehe renderFocusStage()) —
  // keine Drag-Logik (siehe NON_POSITIONABLE/bindPreviewBarInteractions
  // unten), aber seit T2 anklickbar/auswählbar. Ein/Aus + Höhe +
  // Beschriftung kommen weiterhin aus js/shop/cart-preview-bars.js;
  // Hintergrund/Textfarbe/Schriftart/Fett/Icon werden hier per
  // applyBarStyle()/buildPreviewBarContentHtml() angewendet.
  function renderPreviewBars(host) {
    const cfg = window.WebBuilderCartPreviewBars?.getConfig?.();
    if (!host || !cfg) return;
    let top = document.getElementById("cart-preview-bar-top");
    if (cfg.header.enabled) {
      if (!top) {
        top = document.createElement("div");
        top.id = "cart-preview-bar-top";
        top.className = "cart-preview-bar cart-preview-bar-top";
        // T2: Klick-Ziel-Erkennung für bindPreviewBarInteractions() —
        // einmalig bei Erzeugung gesetzt, bleibt über spätere Updates
        // erhalten (Element wird nur aktualisiert, nicht neu erzeugt).
        top.dataset.cartPreviewbar = "header";
        host.appendChild(top);
      }
      top.style.height = (Number(cfg.header.height) || 64) + "px";
      applyBarStyle(top, cfg.header);
      top.innerHTML = buildPreviewBarContentHtml(cfg.header);
      top.classList.toggle("cart-component-selected", state.cartFocusSelectedPart === "previewHeader");
    } else if (top) {
      top.remove();
    }
    let bottom = document.getElementById("cart-preview-bar-bottom");
    if (cfg.footer.enabled) {
      if (!bottom) {
        bottom = document.createElement("div");
        bottom.id = "cart-preview-bar-bottom";
        bottom.className = "cart-preview-bar cart-preview-bar-bottom";
        bottom.dataset.cartPreviewbar = "footer";
        host.appendChild(bottom);
      }
      bottom.style.height = (Number(cfg.footer.height) || 70) + "px";
      applyBarStyle(bottom, cfg.footer);
      bottom.innerHTML = buildPreviewBarContentHtml(cfg.footer);
      bottom.classList.toggle("cart-component-selected", state.cartFocusSelectedPart === "previewFooter");
    } else if (bottom) {
      bottom.remove();
    }
  }

  function removePreviewBars() {
    document.getElementById("cart-preview-bar-top")?.remove();
    document.getElementById("cart-preview-bar-bottom")?.remove();
  }

  // T2: macht die beiden Vorschau-Balken direkt im Editor anklickbar.
  // Eigene, separate Bindung nötig (statt über bindFocusStageInteractions),
  // da die Balken NICHT Kinder von #cart-focus-stage sind, sondern direkt
  // in `host` (.canvas-container) hängen (siehe renderPreviewBars() oben).
  // Rein auswählbar, nicht verschiebbar — siehe NON_POSITIONABLE.
  function bindPreviewBarInteractions(host) {
    if (!host || host.dataset.webBuilderPreviewBarsBound === "true") return;
    host.dataset.webBuilderPreviewBarsBound = "true";
    host.addEventListener("pointerdown", e => {
      if (!state.cartFocusMode) return;
      const bar = e.target.closest?.("[data-cart-previewbar]");
      if (!bar) return;
      e.preventDefault(); e.stopPropagation();
      selectFocusPartLight(bar.dataset.cartPreviewbar === "footer" ? "previewFooter" : "previewHeader");
    });
  }

  function getPartLayout(partKey) {
    const layout = state.cartConfig.itemDisplay.layout || (state.cartConfig.itemDisplay.layout = {});
    return layout[partKey] || { x: 0, y: 0 };
  }
  function setPartLayoutSilent(partKey, x, y) {
    const layout = state.cartConfig.itemDisplay.layout || (state.cartConfig.itemDisplay.layout = {});
    layout[partKey] = { x: Math.round(x) || 0, y: Math.round(y) || 0 };
  }
  function setPartLayout(partKey, x, y, recordHistory = true) {
    if (recordHistory) window.WebBuilderHistory?.arm();
    setPartLayoutSilent(partKey, x, y);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "part-layout", state.cartConfig.itemDisplay.layout);
  }
  function resetPartLayout(partKey) {
    window.WebBuilderHistory?.arm();
    const layout = state.cartConfig.itemDisplay.layout || (state.cartConfig.itemDisplay.layout = {});
    delete layout[partKey];
    window.WebBuilderHistory?.commit();
    notify("cart", "part-layout", layout);
  }

  function getSelectedLayout() {
    const sel = state.cartFocusSelectedPart;
    if (!sel) return { x: 0, y: 0 };
    if (sel.startsWith("component:")) {
      const key = sel.slice("component:".length);
      return state.cartConfig.componentLayout[key] || { x: 0, y: 0 };
    }
    return getPartLayout(sel);
  }
  function setSelectedLayout(x, y) {
    const sel = state.cartFocusSelectedPart;
    if (!sel) return;
    if (sel.startsWith("component:")) {
      const key = sel.slice("component:".length);
      window.WebBuilderHistory?.arm();
      state.cartConfig.componentLayout[key] = { x: Math.round(x) || 0, y: Math.round(y) || 0 };
      window.WebBuilderHistory?.commit();
      notify("cart", "component-layout", state.cartConfig.componentLayout);
    } else {
      setPartLayout(sel, x, y);
    }
  }
  function resetSelectedLayout() {
    const sel = state.cartFocusSelectedPart;
    if (!sel) return;
    if (sel.startsWith("component:")) {
      const key = sel.slice("component:".length);
      window.WebBuilderHistory?.arm();
      delete state.cartConfig.componentLayout[key];
      window.WebBuilderHistory?.commit();
      notify("cart", "component-layout", state.cartConfig.componentLayout);
    } else {
      resetPartLayout(sel);
    }
  }
  // T1: "header" (the drawer-header preview at the top of the stage) is
  // selectable/editable but never position-draggable — same reasoning as
  // background/itemRepresentation. T2: "previewHeader"/"previewFooter"
  // (die beiden Vorschau-Balken) sind aus demselben Grund ebenfalls nur
  // auswählbar, nicht verschiebbar — anders als die echten Kopf-/
  // Fußzeilen-Elemente haben sie keine sinnvolle freie Position, ihre
  // Höhe wird stattdessen über ein eigenes Feld gesteuert. Siehe
  // bindFocusStageInteractions()'s generic [data-cart-component] branch
  // unten, das für jede NON_POSITIONABLE-Komponente kein Dragging
  // aufsetzt; für previewHeader/previewFooter greift das ohnehin nicht,
  // da sie über bindPreviewBarInteractions() separat behandelt werden.
  const NON_POSITIONABLE = new Set(["component:background", "component:itemRepresentation", "component:header", "previewHeader", "previewFooter"]);

  function applySelectionHighlight() {
    const stage = document.getElementById("cart-focus-stage");
    if (!stage) return;
    stage.querySelectorAll(".cart-item-part-selected, .cart-component-selected").forEach(el => el.classList.remove("cart-item-part-selected", "cart-component-selected"));
    // T2: die Vorschau-Balken liegen NICHT innerhalb von
    // #cart-focus-stage (siehe renderPreviewBars()) — eigene, separate
    // Bereinigung nötig, bevor die neue Auswahl markiert wird.
    document.getElementById("cart-preview-bar-top")?.classList.remove("cart-component-selected");
    document.getElementById("cart-preview-bar-bottom")?.classList.remove("cart-component-selected");
    const sel = state.cartFocusSelectedPart;
    if (!sel) return;
    if (sel === "previewHeader" || sel === "previewFooter") {
      document.getElementById(sel === "previewFooter" ? "cart-preview-bar-bottom" : "cart-preview-bar-top")?.classList.add("cart-component-selected");
      return;
    }
    if (sel.startsWith("component:")) {
      const key = sel.slice("component:".length);
      if (key === "background") stage.querySelector(".cart-focus-card")?.classList.add("cart-component-selected");
      else if (key === "itemRepresentation") stage.querySelectorAll(".cart-item").forEach(el => el.classList.add("cart-component-selected"));
      else stage.querySelector(`[data-cart-component="${key}"]`)?.classList.add("cart-component-selected");
    } else {
      stage.querySelector(`[data-cart-part="${sel}"]`)?.classList.add("cart-item-part-selected");
    }
  }

  function selectFocusPart(partKey) {
    state.cartFocusSelectedPart = partKey;
    renderFocusStage();
    renderFocusPartPanel();
  }
  function selectFocusPartLight(partKey) {
    state.cartFocusSelectedPart = partKey;
    applySelectionHighlight();
    renderFocusPartPanel();
  }

  // Field-block IDs for the right-hand panel (renderFocusPartPanel()).
  const PART_FIELD_BLOCK_IDS = [
    "cart-comp-header-fields", "cart-comp-checkout-fields", "cart-comp-discount-fields", "cart-comp-item-fields",
    "cart-comp-background-fields", "cart-comp-recommend-fields", "cart-comp-progress-fields",
    "cart-comp-qty-fields", "cart-comp-price-fields", "cart-comp-remove-fields",
    "cart-comp-totals-fields", "cart-comp-previewbar-fields"
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
    positionFields?.classList.toggle("hidden", NON_POSITIONABLE.has(sel));

    const labels = {
      icon: "Icon / Name", qty: "Mengenanzeige", price: "Preis", remove: "Entfernen-Button", description: "Beschreibung",
      "component:checkout": "Zur-Kasse-Button", "component:discount": "Rabattfeld", "component:progress": "Fortschrittsbalken",
      "component:recommend": "Empfehlung", "component:background": "Hintergrund", "component:itemRepresentation": "Artikel-Darstellung",
      "component:totals": "Kosten-Übersicht", "component:header": "Warenkorb-Titel",
      previewHeader: "Vorschau-Header", previewFooter: "Vorschau-Footer"
    };
    const labelEl = document.getElementById("cart-part-label");
    if (labelEl) labelEl.textContent = labels[sel] || sel;

    const config = cart.getConfig();

    if (sel === "previewHeader" || sel === "previewFooter") {
      // T2: Vorschau-Header/-Footer — Daten kommen NICHT aus
      // cartConfig, sondern aus window.WebBuilderCartPreviewBars
      // (state.cartPreviewHeader*/cartPreviewFooter*), siehe
      // js/shop/cart-preview-bars.js.
      document.getElementById("cart-comp-previewbar-fields")?.classList.remove("hidden");
      const isFooter = sel === "previewFooter";
      const barCfg = (window.WebBuilderCartPreviewBars?.getConfig?.() || { header: {}, footer: {} })[isFooter ? "footer" : "header"];
      const heightInput = document.getElementById("cart-comp-previewbar-height");
      if (heightInput && document.activeElement !== heightInput) heightInput.value = barCfg.height != null ? barCfg.height : (isFooter ? 70 : 64);
      const labelInput = document.getElementById("cart-comp-previewbar-label");
      if (labelInput && document.activeElement !== labelInput) labelInput.value = barCfg.label || (isFooter ? "Footer" : "Header");

      // Hintergrund-Typ: einfarbig/Bild — gleiches "solid"/"image"-Muster
      // wie bei der echten Kopf-/Fußzeile (siehe web.html #header-bg-type
      // / layout/header-footer.js syncBgControls()).
      const bgTypeSel = document.getElementById("cart-comp-previewbar-bg-type");
      if (bgTypeSel) bgTypeSel.value = barCfg.bgType === "image" ? "image" : "solid";
      document.getElementById("cart-comp-previewbar-bg-solid-group")?.classList.toggle("hidden", barCfg.bgType === "image");
      document.getElementById("cart-comp-previewbar-bg-image-group")?.classList.toggle("hidden", barCfg.bgType !== "image");
      const colorInput = document.getElementById("cart-comp-previewbar-color");
      if (colorInput) colorInput.value = barCfg.color || "#111827";
      const bgImageUrlInput = document.getElementById("cart-comp-previewbar-bg-image-url");
      if (bgImageUrlInput && document.activeElement !== bgImageUrlInput) bgImageUrlInput.value = barCfg.bgImage || "";

      // Textfarbe.
      const textColorInput = document.getElementById("cart-comp-previewbar-text-color");
      if (textColorInput) textColorInput.value = barCfg.textColor || "#ffffff";

      // Schriftart — Optionen einmalig aus ui/shared-markup.js befüllen
      // (dieselbe feste Auswahl wie #prop-font-family/#bar-prop-font-family),
      // Fallback falls das Modul aus irgendeinem Grund fehlt.
      const fontSelect = document.getElementById("cart-comp-previewbar-font-family");
      if (fontSelect) {
        if (!fontSelect.dataset.webBuilderMarkupBound) {
          fontSelect.innerHTML = window.WebBuilderSharedMarkup?.buildFontFamilyOptionsHtml?.() || '<option value="inherit">Standard</option>';
          fontSelect.dataset.webBuilderMarkupBound = "true";
        }
        fontSelect.value = barCfg.fontFamily || "inherit";
      }

      // Fett.
      const boldInput = document.getElementById("cart-comp-previewbar-bold");
      if (boldInput) boldInput.checked = !!barCfg.bold;

      // Icon: Typ wird aus dem tatsächlich gesetzten Feld abgeleitet, da
      // icon/iconImage gegenseitig ausschließend sind (siehe
      // js/shop/cart-preview-bars.js). "image" hat Vorrang vor "emoji",
      // falls aus irgendeinem Grund beide Felder gesetzt wären.
      const iconType = barCfg.iconImage ? "image" : (barCfg.icon ? "emoji" : "none");
      const iconTypeSel = document.getElementById("cart-comp-previewbar-icon-type");
      if (iconTypeSel) iconTypeSel.value = iconType;
      document.getElementById("cart-comp-previewbar-icon-emoji-group")?.classList.toggle("hidden", iconType !== "emoji");
      document.getElementById("cart-comp-previewbar-icon-image-group")?.classList.toggle("hidden", iconType !== "image");
      const iconInput = document.getElementById("cart-comp-previewbar-icon");
      if (iconInput && document.activeElement !== iconInput) iconInput.value = barCfg.icon || "";
    } else if (sel === "component:header") {
      // T1: editable title shown in the drawer-header preview at the top
      // of the stage (see renderFocusStage()) and in the real drawer
      // (cart-render.js renderCart()).
      document.getElementById("cart-comp-header-fields")?.classList.remove("hidden");
      const titleInput = document.getElementById("cart-comp-header-title");
      if (titleInput && document.activeElement !== titleInput) titleInput.value = config.cartTitleLabel || "Dein Warenkorb";
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
    } else if (sel === "component:progress") {
      document.getElementById("cart-comp-progress-fields")?.classList.remove("hidden");
      const progressColorInput = document.getElementById("cart-comp-progress-color");
      if (progressColorInput) progressColorInput.value = config.progressBarColor || "#10b981";
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
      // Divider option only visible on a transparent item shape — every
      // other shape already gives visual separation via the item box.
      const dividerGroup = document.getElementById("cart-item-divider-group");
      dividerGroup?.classList.toggle("hidden", config.itemShape !== "transparent");
      const dividerCb = document.getElementById("cid-show-item-dividers");
      if (dividerCb) dividerCb.checked = !!config.itemDisplay.showItemDividers;
    } else if (sel === "component:totals") {
      // "Kosten-Übersicht": Texte/Labels für Zwischensumme, Rabatt,
      // Versand, Gesamt, plus Versandkosten-Betrag und der Text bei
      // kostenlosem Versand. Siehe cart-data.js normalizeState() für die
      // Default-Werte (entsprechen dem bisherigen fest verdrahteten
      // Verhalten in cart-render.js).
      document.getElementById("cart-comp-totals-fields")?.classList.remove("hidden");
      const subtotalInput = document.getElementById("cart-comp-subtotal-label");
      if (subtotalInput && document.activeElement !== subtotalInput) subtotalInput.value = config.subtotalLabel || "Zwischensumme";
      const discountInput = document.getElementById("cart-comp-discount-label");
      if (discountInput && document.activeElement !== discountInput) discountInput.value = config.discountLabel || "Rabatt";
      const shippingLabelInput = document.getElementById("cart-comp-shipping-label");
      if (shippingLabelInput && document.activeElement !== shippingLabelInput) shippingLabelInput.value = config.shippingLabel || "Versand";
      const shippingCostInput = document.getElementById("cart-comp-shipping-cost");
      if (shippingCostInput && document.activeElement !== shippingCostInput) shippingCostInput.value = config.shippingCost != null ? config.shippingCost : 4.95;
      const shippingFreeInput = document.getElementById("cart-comp-shipping-free-text");
      if (shippingFreeInput && document.activeElement !== shippingFreeInput) shippingFreeInput.value = config.shippingFreeText || "Kostenlos";
      const totalLabelInput = document.getElementById("cart-comp-total-label");
      if (totalLabelInput && document.activeElement !== totalLabelInput) totalLabelInput.value = config.totalLabel || "Gesamt";
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

    if (!NON_POSITIONABLE.has(sel)) {
      const layout = getSelectedLayout();
      const xInput = document.getElementById("cart-part-x"), yInput = document.getElementById("cart-part-y");
      if (xInput && document.activeElement !== xInput) xInput.value = layout.x;
      if (yInput && document.activeElement !== yInput) yInput.value = layout.y;
    }
  }

  // Jeder Klick auf einen Teil/eine Komponente startet preventDefault() +
  // Drag, unabhängig vom genauen Ziel-Element (Button, Input, Select) —
  // im Warenkorb-Editor soll NIE eine echte Aktion ausgelöst werden
  // (Aufgabe B), jedes dieser Elemente ist ein reiner Ziehgriff.
  function bindFocusStageInteractions(container) {
    if (!container || container.dataset.webBuilderPartsBound === "true") return;
    container.dataset.webBuilderPartsBound = "true";
    container.addEventListener("pointerdown", e => {
      if (!state.cartFocusMode) return;

      const resizeHandle = e.target.closest?.(".cart-item-resize-handle");
      if (resizeHandle) {
        e.preventDefault(); e.stopPropagation();
        const itemEl = resizeHandle.closest(".cart-item");
        if (!itemEl) return;
        const startRect = itemEl.getBoundingClientRect();
        const startX = e.clientX, startY = e.clientY;
        const startW = startRect.width, startH = startRect.height;
        let moved = false;
        try { resizeHandle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          moved = true;
          const nextW = Math.max(120, Math.round(startW + dx));
          const nextH = Math.max(30, Math.round(startH + dy));
          state.cartConfig.itemWidth = nextW;
          state.cartConfig.itemMinHeight = nextH;
          itemEl.style.width = nextW + "px";
          itemEl.style.minHeight = nextH + "px";
          const wInput = document.getElementById("cart-item-width"), hInput = document.getElementById("cart-item-height");
          if (wInput) wInput.value = nextW;
          if (hInput) hInput.value = nextH;
        }
        function onUp() {
          resizeHandle.removeEventListener("pointermove", onMove);
          resizeHandle.removeEventListener("pointerup", onUp);
          resizeHandle.removeEventListener("pointercancel", onUp);
          try { resizeHandle.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          if (moved) { window.WebBuilderHistory?.commit(); notify("cart", "config", state.cartConfig); }
        }
        window.WebBuilderHistory?.arm();
        resizeHandle.addEventListener("pointermove", onMove);
        resizeHandle.addEventListener("pointerup", onUp);
        resizeHandle.addEventListener("pointercancel", onUp);
        return;
      }

      const compEl = e.target.closest?.("[data-cart-component]");
      if (compEl) {
        const key = compEl.dataset.cartComponent;
        e.preventDefault(); e.stopPropagation();
        selectFocusPartLight(`component:${key}`);
        // T1: NON_POSITIONABLE components (currently only "header") are
        // selectable but never draggable — bail out before any drag
        // tracking is set up. Generalized here (instead of a one-off
        // "header" check) so any future non-positionable
        // [data-cart-component] element is covered automatically.
        if (NON_POSITIONABLE.has(`component:${key}`)) return;
        const origin = state.cartConfig.componentLayout[key] || { x: 0, y: 0 };
        const startX = e.clientX, startY = e.clientY;
        let moved = false;
        try { compEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          moved = true;
          const nextX = origin.x + dx, nextY = origin.y + dy;
          compEl.style.transform = `translate(${nextX}px, ${nextY}px)`;
          state.cartConfig.componentLayout[key] = { x: Math.round(nextX), y: Math.round(nextY) };
        }
        function onUp() {
          compEl.removeEventListener("pointermove", onMove);
          compEl.removeEventListener("pointerup", onUp);
          compEl.removeEventListener("pointercancel", onUp);
          try { compEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          if (moved) { window.WebBuilderHistory?.commit(); notify("cart", "component-layout", state.cartConfig.componentLayout); }
        }
        window.WebBuilderHistory?.arm();
        compEl.addEventListener("pointermove", onMove);
        compEl.addEventListener("pointerup", onUp);
        compEl.addEventListener("pointercancel", onUp);
        return;
      }

      const partEl = e.target.closest?.("[data-cart-part]");
      if (partEl) {
        const partKey = partEl.dataset.cartPart;
        e.preventDefault(); e.stopPropagation();
        selectFocusPartLight(partKey);
        const origin = getPartLayout(partKey);
        const startX = e.clientX, startY = e.clientY;
        let moved = false;

        // Bounds relativ zur Eltern-Artikel-Box (.cart-item), damit sich
        // Icon/Name, Menge, Preis, Entfernen-Button und Beschreibung nicht
        // aus dem Produktfeld herausziehen lassen. Einmalig beim
        // Drag-Start berechnet: "natural*" = aktuelle Position minus dem
        // schon aktiven Transform-Offset (origin), daraus ergibt sich der
        // erlaubte x/y-Bereich, in dem die linke/obere bzw.
        // rechte/untere Kante des Teils innerhalb der Artikel-Box bleibt.
        const itemEl = partEl.closest(".cart-item");
        let bounds = null;
        if (itemEl) {
          const itemRect = itemEl.getBoundingClientRect();
          const partRect = partEl.getBoundingClientRect();
          const naturalLeft = partRect.left - (origin.x || 0);
          const naturalTop = partRect.top - (origin.y || 0);
          const rawMinX = itemRect.left - naturalLeft;
          const rawMaxX = itemRect.right - partRect.width - naturalLeft;
          const rawMinY = itemRect.top - naturalTop;
          const rawMaxY = itemRect.bottom - partRect.height - naturalTop;
          bounds = {
            minX: Math.min(rawMinX, rawMaxX), maxX: Math.max(rawMinX, rawMaxX),
            minY: Math.min(rawMinY, rawMaxY), maxY: Math.max(rawMinY, rawMaxY)
          };
        }

        try { partEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          moved = true;
          let nextX = origin.x + dx, nextY = origin.y + dy;
          if (bounds) {
            nextX = Math.min(bounds.maxX, Math.max(bounds.minX, nextX));
            nextY = Math.min(bounds.maxY, Math.max(bounds.minY, nextY));
          }
          partEl.style.transform = `translate(${nextX}px, ${nextY}px)`;
          setPartLayoutSilent(partKey, nextX, nextY);
        }
        function onUp() {
          partEl.removeEventListener("pointermove", onMove);
          partEl.removeEventListener("pointerup", onUp);
          partEl.removeEventListener("pointercancel", onUp);
          try { partEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          if (moved) { window.WebBuilderHistory?.commit(); notify("cart", "part-layout", state.cartConfig.itemDisplay.layout); }
        }
        window.WebBuilderHistory?.arm();
        partEl.addEventListener("pointermove", onMove);
        partEl.addEventListener("pointerup", onUp);
        partEl.addEventListener("pointercancel", onUp);
        return;
      }

      const itemEl = e.target.closest?.(".cart-item");
      if (itemEl) {
        e.preventDefault();
        selectFocusPart("component:itemRepresentation");
        return;
      }

      if (e.target.matches?.(".cart-focus-card")) {
        e.preventDefault();
        selectFocusPart("component:background");
      }
    });
  }

  function renderFocusStage() {
    if (!state.cartFocusMode) return;
    const host = document.querySelector(".canvas-container");
    if (!host) return;
    let stage = document.getElementById("cart-focus-stage");
    if (!stage) {
      stage = document.createElement("div");
      stage.id = "cart-focus-stage";
      stage.className = "cart-focus-stage";
      host.appendChild(stage);
    }
    renderPreviewBars(host);
    bindPreviewBarInteractions(host);
    // Nur noch ein oberer Versatz (Platz für den Vorschau-Header) plus ein
    // unterer Innenabstand (Platz für den Vorschau-Footer) — die Bühne hat
    // bewusst KEIN festes "bottom" — die tatsächliche Höhe der Bühne
    // richtet sich weiterhin nach dem Karteninhalt. Was NEU ist (T3): die
    // Karte selbst (.cart-focus-card) bekommt unten eine per JS berechnete
    // "max-height", damit nicht mehr die ganze Karte über den äußeren
    // .canvas-container-Scrollbalken wächst, sondern nur noch die
    // Artikelliste (.cart-focus-scroll) innerhalb der Karte scrollt.
    const insets = computeStageInsets();
    stage.style.top = insets.top + "px";
    stage.style.paddingBottom = insets.bottom + "px";
    // STAGE_PADDING = oberer + unterer Innenabstand von .cart-focus-stage
    // selbst (padding: 30px, siehe css/modals.css) — bleibt bei der
    // Höhenberechnung der Karte unberücksichtigt, sonst würde die Karte
    // ungewollt an den Bühnenrand stoßen.
    const STAGE_PADDING = 60;
    const viewportH = host.clientHeight || window.innerHeight;
    const maxCardHeight = Math.max(280, viewportH - insets.top - insets.bottom - STAGE_PADDING);
    const realItems = cart.getItems();
    const usingDemo = realItems.length === 0;
    let items = realItems;
    if (usingDemo) {
      const products = window.WebBuilderProducts?.getAll?.() || [];
      const demoSource = products[0] || { name: "Beispielprodukt", price: 19.99, discountPrice: 14.99, icon: "📦", description: "Kurze Beschreibung des Produkts." };
      items = [{ id: "focus-demo", productId: demoSource.id || null, name: demoSource.name, price: demoSource.price, discountPrice: demoSource.discountPrice, qty: 2, icon: demoSource.icon, description: demoSource.description || "Kurze Beschreibung des Produkts." }];
    }
    const config = cart.getConfig() || {};
    const checkoutColor = config.buttonColor || "#4f46e5";
    const checkoutRadius = config.buttonShape === "pill" ? "999px" : (config.buttonShape === "square" ? "0px" : "6px");
    const checkoutLayout = config.componentLayout.checkout || { x: 0, y: 0 };
    const checkoutSelectedClass = state.cartFocusSelectedPart === "component:checkout" ? " cart-component-selected" : "";
    const bgSelectedClass = state.cartFocusSelectedPart === "component:background" ? " cart-component-selected" : "";
    // T1: replaces the old static hint text + inline "✖" exit button with
    // an accurate, non-interactive preview of the real drawer header
    // (title + live/demo item count), reusing .drawer-header's styling so
    // both stay visually identical. Selectable via data-cart-component
    // like the other top-level blocks, but NON_POSITIONABLE (see above).
    const headerSelectedClass = state.cartFocusSelectedPart === "component:header" ? " cart-component-selected" : "";
    // T3: max-height ist immer gesetzt (begrenzt die Karte auf die
    // sichtbare Editor-Fläche), die optionale Hintergrundfarbe kommt
    // zusätzlich dazu.
    const cardStyleParts = [`max-height:${maxCardHeight}px`];
    if (config.cardBackgroundColor) cardStyleParts.push(`background-color:${config.cardBackgroundColor}`);
    const cardBgStyle = ` style="${cardStyleParts.join(";")};"`;
    const cartTitle = config.cartTitleLabel || "Dein Warenkorb";
    const previewCount = usingDemo ? (Number(items[0]?.qty) || 0) : cart.getCount();
    // T3: build the cart body as separate parts instead of one combined
    // string — progress bar goes into a fixed top strip, the item list
    // into its own scrollable middle section, and recommendation/
    // discount/totals into a fixed bottom strip (see
    // css/modals.css .cart-focus-fixed-top/.cart-focus-scroll/
    // .cart-focus-fixed-bottom). The real drawer keeps rendering via
    // buildCartHtml() unchanged (cart-render.js renderCart()).
    const buildCartParts = window.WebBuilderCartRuntime?.buildCartParts;
    const parts = buildCartParts
      ? buildCartParts(items, { interactive: true, isDemo: usingDemo })
      : { progress: "", items: "", recommend: "", discount: "", totals: "" };
    stage.innerHTML = `
      <div class="cart-focus-card${bgSelectedClass}"${cardBgStyle}>
        <div class="drawer-header cart-focus-header${headerSelectedClass}" data-cart-component="header"><h3>${esc(cartTitle)} (${previewCount})</h3><button type="button" class="close-btn" disabled>&times;</button></div>
        <div class="cart-focus-body">
          <div class="cart-focus-fixed-top">${parts.progress}</div>
          <div class="cart-focus-scroll">${parts.items}</div>
          <div class="cart-focus-fixed-bottom">${parts.recommend}${parts.discount}${parts.totals}</div>
        </div>
        <button type="button" class="btn btn-primary cart-focus-checkout${checkoutSelectedClass}" data-cart-component="checkout" style="width:100%; background-color:${checkoutColor}; border-radius:${checkoutRadius}; transform:translate(${checkoutLayout.x || 0}px, ${checkoutLayout.y || 0}px);">${esc(state.cartButtonLabel || "Zur Kasse gehen")}</button>
      </div>
    `;
    bindFocusStageInteractions(stage);
  }
  function enterFocusMode() {
    if (state.isPreviewMode) window.WebBuilderPreview?.exit?.();
    state.cartFocusMode = true;
    state.cartFocusSelectedPart = null;
    document.body.classList.add("cart-focus-active");
    window.WebBuilderInspector?.select?.(null);
    window.WebBuilderHeaderFooterRuntime?.clearSelection?.();
    document.getElementById("cart-inspector-form")?.classList.remove("hidden");
    renderFocusStage();
    renderFocusPartPanel();
  }
  function exitFocusMode() {
    state.cartFocusMode = false;
    state.cartFocusSelectedPart = null;
    document.body.classList.remove("cart-focus-active");
    document.getElementById("cart-focus-stage")?.remove();
    removePreviewBars();
    document.getElementById("cart-inspector-form")?.classList.add("hidden");
  }
  function bindFocusEditor() {
    document.getElementById("btn-cart-focus-editor")?.addEventListener("click", e => { e.preventDefault(); enterFocusMode(); }, true);
    document.getElementById("btn-cart-focus-exit")?.addEventListener("click", e => { e.preventDefault(); exitFocusMode(); }, true);
    document.getElementById("btn-select-item-representation")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!state.cartFocusMode) enterFocusMode();
      selectFocusPart("component:itemRepresentation");
    }, true);

    document.getElementById("cart-comp-header-title")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ cartTitleLabel: e.target.value.trim() || "Dein Warenkorb" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    // T2: Vorschau-Header/-Footer — Schreibpfad geht bewusst NICHT über
    // cart.setConfig() (die Balken sind kein Teil von cartConfig),
    // sondern über window.WebBuilderCartPreviewBars.updateHeader()/
    // updateFooter() — dieselben Funktionen, die auch die Sidebar-
    // Steuerung in #panel-cart verwendet, damit beide Wege synchron
    // bleiben. render() dort synchronisiert zusätzlich die Sidebar-Felder.
    // updateHeader()/updateFooter() rufen intern bereits
    // window.WebBuilderCartFocus.renderStage() auf (siehe
    // js/shop/cart-preview-bars.js), ein zusätzlicher renderFocusStage()-
    // Aufruf hier ist daher nicht nötig.
    document.getElementById("cart-comp-previewbar-height")?.addEventListener("change", e => {
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      fn?.({ height: e.target.value });
      window.WebBuilderCartPreviewBars?.render?.();
      renderFocusPartPanel();
    }, true);
    document.getElementById("cart-comp-previewbar-label")?.addEventListener("change", e => {
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      fn?.({ label: e.target.value });
      window.WebBuilderCartPreviewBars?.render?.();
    }, true);

    // Hintergrund-Typ (einfarbig/Bild) — Wechsel muss die beiden Gruppen
    // im Panel neu ein-/ausblenden, daher renderFocusPartPanel() danach.
    document.getElementById("cart-comp-previewbar-bg-type")?.addEventListener("change", e => {
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      fn?.({ bgType: e.target.value });
      window.WebBuilderCartPreviewBars?.render?.();
      renderFocusPartPanel();
    }, true);
    document.getElementById("cart-comp-previewbar-color")?.addEventListener("input", e => {
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      fn?.({ color: e.target.value });
      window.WebBuilderCartPreviewBars?.render?.();
    }, true);
    document.getElementById("cart-comp-previewbar-bg-image-url")?.addEventListener("change", e => {
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      fn?.({ bgImage: e.target.value, bgType: "image" });
      window.WebBuilderCartPreviewBars?.render?.();
      renderFocusPartPanel();
    }, true);
    document.getElementById("cart-comp-previewbar-bg-image-file")?.addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        fn?.({ bgImage: reader.result, bgType: "image" });
        window.WebBuilderCartPreviewBars?.render?.();
        renderFocusPartPanel();
      };
      reader.readAsDataURL(file);
    }, true);

    // Textfarbe.
    document.getElementById("cart-comp-previewbar-text-color")?.addEventListener("input", e => {
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      fn?.({ textColor: e.target.value });
      window.WebBuilderCartPreviewBars?.render?.();
    }, true);

    // Schriftart.
    document.getElementById("cart-comp-previewbar-font-family")?.addEventListener("change", e => {
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      fn?.({ fontFamily: e.target.value });
      window.WebBuilderCartPreviewBars?.render?.();
    }, true);

    // Fett.
    document.getElementById("cart-comp-previewbar-bold")?.addEventListener("change", e => {
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      fn?.({ bold: e.target.checked });
      window.WebBuilderCartPreviewBars?.render?.();
    }, true);

    // Icon-Typ: none/emoji/image — schaltet nur die Sichtbarkeit der
    // Unterfelder um und leert dabei das jeweils nicht mehr passende Feld
    // (icon/iconImage sind gegenseitig ausschließend, siehe
    // js/shop/cart-preview-bars.js).
    document.getElementById("cart-comp-previewbar-icon-type")?.addEventListener("change", e => {
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      const type = e.target.value;
      if (type === "none") fn?.({ icon: null, iconImage: "" });
      else if (type === "emoji") fn?.({ iconImage: "" });
      else if (type === "image") fn?.({ icon: null });
      window.WebBuilderCartPreviewBars?.render?.();
      renderFocusPartPanel();
    }, true);
    document.getElementById("cart-comp-previewbar-icon")?.addEventListener("change", e => {
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      fn?.({ icon: e.target.value, iconImage: "" });
      window.WebBuilderCartPreviewBars?.render?.();
    }, true);
    document.getElementById("cart-comp-previewbar-icon-image-file")?.addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const isFooter = state.cartFocusSelectedPart === "previewFooter";
      const fn = isFooter ? window.WebBuilderCartPreviewBars?.updateFooter : window.WebBuilderCartPreviewBars?.updateHeader;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        fn?.({ iconImage: reader.result, icon: null });
        window.WebBuilderCartPreviewBars?.render?.();
        renderFocusPartPanel();
      };
      reader.readAsDataURL(file);
    }, true);

    document.getElementById("cart-part-x")?.addEventListener("change", e => {
      if (!state.cartFocusSelectedPart) return;
      const layout = getSelectedLayout();
      setSelectedLayout(Number(e.target.value) || 0, layout.y);
      renderFocusStage();
    }, true);
    document.getElementById("cart-part-y")?.addEventListener("change", e => {
      if (!state.cartFocusSelectedPart) return;
      const layout = getSelectedLayout();
      setSelectedLayout(layout.x, Number(e.target.value) || 0);
      renderFocusStage();
    }, true);
    document.getElementById("cart-part-reset")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (state.cartFocusSelectedPart) { resetSelectedLayout(); renderFocusStage(); renderFocusPartPanel(); }
    }, true);

    document.getElementById("cart-comp-checkout-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setButtonLabel(e.target.value, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-checkout-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ buttonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-checkout-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ buttonShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-discount-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ discountButtonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-discount-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ discountButtonShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    // Fortschrittsbalken-Farbe (component:progress).
    document.getElementById("cart-comp-progress-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ progressBarColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-bg-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ cardBackgroundColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    // "Kosten-Übersicht" (component:totals): Texte/Labels + Versandkosten.
    // Alle setConfig()-Aufrufe fallen auf den jeweiligen Default zurück,
    // falls das Feld geleert wird, statt eine leere Zeile im Warenkorb
    // anzuzeigen.
    document.getElementById("cart-comp-subtotal-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ subtotalLabel: e.target.value.trim() || "Zwischensumme" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-discount-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ discountLabel: e.target.value.trim() || "Rabatt" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-shipping-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ shippingLabel: e.target.value.trim() || "Versand" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-shipping-cost")?.addEventListener("change", e => {
      const v = Math.max(0, Number(e.target.value) || 0);
      window.WebBuilderHistory?.arm(); cart.setConfig({ shippingCost: v }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-shipping-free-text")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ shippingFreeText: e.target.value.trim() || "Kostenlos" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-total-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ totalLabel: e.target.value.trim() || "Gesamt" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-item-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ itemShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-item-bg-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ itemBackgroundColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-item-width")?.addEventListener("change", e => {
      const v = e.target.value === "" ? null : Math.max(120, Number(e.target.value) || 0);
      window.WebBuilderHistory?.arm(); cart.setConfig({ itemWidth: v }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-item-height")?.addEventListener("change", e => {
      const v = e.target.value === "" ? null : Math.max(30, Number(e.target.value) || 0);
      window.WebBuilderHistory?.arm(); cart.setConfig({ itemMinHeight: v }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-remove-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ removeButtonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-remove-style")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ removeStyle: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-remove-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ removeShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-quantity-style")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ quantityStyle: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-quantity-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ quantityGroupShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-quantity-color")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ quantityButtonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-price-style")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ priceStyle: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-show-description")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ showDescription: e.target.checked }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-show-item-dividers")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ showItemDividers: e.target.checked }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.addEventListener("keydown", e => { if (e.key === "Escape" && state.cartFocusMode) exitFocusMode(); });

    // T3: die Kartenhöhe (max-height) wird aus der sichtbaren Höhe von
    // .canvas-container berechnet (siehe renderFocusStage()) — bei einer
    // Fenstergrößenänderung muss sie neu berechnet werden, sonst bleibt
    // sie auf dem Stand des letzten Renders "eingefroren".
    window.addEventListener("resize", () => {
      if (state.cartFocusMode) renderFocusStage();
    });
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bindFocusEditor, 0));
  window.WebBuilderCartFocus = {
    enter: enterFocusMode,
    exit: exitFocusMode,
    isActive: () => !!state.cartFocusMode,
    // Exposed for cart-render.js's refreshCartViews()/renderConfig() and
    // cart-preview-bars.js, so the editor stage stays in sync whenever
    // the drawer/config/preview bars re-render.
    renderStage: renderFocusStage,
    renderPartPanel: renderFocusPartPanel
  };
})();
