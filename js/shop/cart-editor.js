// js/shop/cart-editor.js
// WebBuilder cart focus editor ("Warenkorb-Editor").
// Owns the dedicated editing stage mounted into .canvas-container: shows
// the full cart body (via cart-render.js's buildCartParts()) centered over
// the canvas, lets the user click/drag individual parts and top-level
// components, and drives the right-hand #cart-inspector-form panel. Cart
// data/CRUD lives in cart-data.js, shared HTML building + the real drawer
// live in cart-render.js — this file only adds the editing affordances.
//
// Both the cart-item/recommend-card SUB-PART dragging ([data-cart-part]
// branch) and the top-level COMPONENT dragging ([data-cart-component]
// branch) show the same Canva-style alignment guides as canvas/canvas.js
// and layout/header-footer.js, by reusing canvas/alignment.js's exported
// snapping primitives (collectSnapTargets/snapPosition/guide-layer
// helpers) — NOT attachInteraction() itself, since positioning here works
// via a CSS transform offset from each element's natural flow position on
// an unscaled stage, not via attachInteraction()'s absolute left/top +
// zoom-scaled model. See the comment block at the top of
// canvas/alignment.js for the full reasoning.
//
// For component snapping, the sibling scope for a given component is
// simply its own DOM parent (compEl.parentElement) — every component is
// wrapped by cart-render.js's wrapComponent() in its own
// <div data-cart-component="..."> that is always a direct child of
// whichever container it visually belongs to (.cart-focus-fixed-top for
// "progress", .cart-focus-fixed-bottom for "recommend"/"discount"/
// "totals"/"checkout" as siblings, and .cart-focus-body itself for the
// title and the freely placeable dividers) — so no per-component
// special-casing is needed to find the right siblings. There is no
// separate header/footer bar anymore — title and checkout are just two
// more top-level components like the rest.
// The resize handle on the article representation
// (component:itemRepresentation) is a resize, not a move, and stays out
// of scope per the task description.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartFocus: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartFocus: WebBuilderCart is not available."); return; }
  function notify(domain, action, payload) { if (typeof state.notify === "function") state.notify(domain, action, payload); }

  function refreshCartViews() { window.WebBuilderCartRuntime?.refresh?.(); }

  // "recommend:"-prefixed part keys (icon/name/price/add of the
  // recommendation card, see cart-render.js buildRecommendCardContentHtml())
  // belong in cartConfig.recommendDisplay.layout, every other part key in
  // cartConfig.itemDisplay.layout (see cart-data.js normalizeState()).
  // resolveLayoutMap() is the single place deciding which map a given
  // partKey belongs to — every getter/setter below goes through it.
  function resolveLayoutMap(partKey) {
    if (String(partKey).startsWith("recommend:")) {
      const key = partKey.slice("recommend:".length);
      if (!state.cartConfig.recommendDisplay || typeof state.cartConfig.recommendDisplay !== "object") state.cartConfig.recommendDisplay = {};
      const layout = state.cartConfig.recommendDisplay.layout || (state.cartConfig.recommendDisplay.layout = {});
      return { layout, key };
    }
    const layout = state.cartConfig.itemDisplay.layout || (state.cartConfig.itemDisplay.layout = {});
    return { layout, key: partKey };
  }
  function getPartLayout(partKey) {
    const { layout, key } = resolveLayoutMap(partKey);
    return layout[key] || { x: 0, y: 0 };
  }
  function setPartLayoutSilent(partKey, x, y) {
    const { layout, key } = resolveLayoutMap(partKey);
    layout[key] = { x: Math.round(x) || 0, y: Math.round(y) || 0 };
  }
  function setPartLayout(partKey, x, y, recordHistory = true) {
    if (recordHistory) window.WebBuilderHistory?.arm();
    setPartLayoutSilent(partKey, x, y);
    if (recordHistory) window.WebBuilderHistory?.commit();
    const { layout } = resolveLayoutMap(partKey);
    notify("cart", "part-layout", layout);
  }
  function resetPartLayout(partKey) {
    window.WebBuilderHistory?.arm();
    const { layout, key } = resolveLayoutMap(partKey);
    delete layout[key];
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
  // "background" (the whole card background) and "itemRepresentation"
  // (the article box, resized via its own drag handle) are selectable/
  // editable but never position-draggable — neither has a sensible free
  // position. Dividers ("component:divider:<id>") are deliberately NOT in
  // this set — they ARE positionable, like progress/discount/recommend/
  // totals/checkout/title.
  const NON_POSITIONABLE = new Set(["component:background", "component:itemRepresentation"]);

  // Every cart item renders the same data-cart-part keys, because one
  // shared pixel offset per part type applies to all items
  // (cartConfig.itemDisplay.layout, see cart-render.js
  // buildCartItemHTML()). The highlight therefore has to mark EVERY
  // match, not just the first one — otherwise clicking a part on the
  // second item visibly highlighted the first item's part instead.
  function applySelectionHighlight() {
    const stage = document.getElementById("cart-focus-stage");
    if (!stage) return;
    stage.querySelectorAll(".cart-item-part-selected, .cart-component-selected").forEach(el => el.classList.remove("cart-item-part-selected", "cart-component-selected"));
    const sel = state.cartFocusSelectedPart;
    if (!sel) return;
    if (sel.startsWith("component:")) {
      const key = sel.slice("component:".length);
      if (key === "background") stage.querySelector(".cart-focus-card")?.classList.add("cart-component-selected");
      else if (key === "itemRepresentation") stage.querySelectorAll(".cart-item").forEach(el => el.classList.add("cart-component-selected"));
      else stage.querySelectorAll(`[data-cart-component="${key}"]`).forEach(el => el.classList.add("cart-component-selected"));
    } else {
      stage.querySelectorAll(`[data-cart-part="${sel}"]`).forEach(el => el.classList.add("cart-item-part-selected"));
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
    "cart-comp-title-fields", "cart-comp-checkout-fields", "cart-comp-discount-fields", "cart-comp-item-fields",
    "cart-comp-background-fields", "cart-comp-recommend-fields", "cart-comp-progress-fields",
    "cart-comp-qty-fields", "cart-comp-price-fields", "cart-comp-remove-fields",
    "cart-comp-totals-fields", "cart-comp-divider-fields"
  ];

  // T6: "component:divider:<id>" — every divider is its own positionable
  // component, so the panel branch is matched by prefix instead of an
  // exact key.
  const DIVIDER_PREFIX = "component:divider:";
  const isDividerKey = key => String(key || "").startsWith(DIVIDER_PREFIX);

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
      "component:totals": "Kosten-Übersicht", "component:title": "Warenkorb-Titel"
    };
    const labelEl = document.getElementById("cart-part-label");
    if (labelEl) labelEl.textContent = isDividerKey(sel) ? "Trennlinie" : (labels[sel] || sel);

    const config = cart.getConfig();

    if (sel === "component:title") {
      // Der Warenkorb-Titel ist eine ganz normale, frei platzierbare
      // Komponente (kein eigener Kopfbalken mehr) — siehe
      // js/shop/cart-render.js buildTitleHtml().
      document.getElementById("cart-comp-title-fields")?.classList.remove("hidden");
      const titleInput = document.getElementById("cart-comp-title-label");
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
      // T5: Versand ist wieder Teil der Kosten-Übersicht (keine eigene
      // Komponente mehr) — seine Felder sitzen jetzt in diesem Panel.
      const shippingLabelInput = document.getElementById("cart-comp-shipping-label");
      if (shippingLabelInput && document.activeElement !== shippingLabelInput) shippingLabelInput.value = config.shippingLabel || "Versand";
      const shippingCostInput = document.getElementById("cart-comp-shipping-cost");
      if (shippingCostInput && document.activeElement !== shippingCostInput) shippingCostInput.value = config.shippingCost != null ? config.shippingCost : 4.95;
      const shippingFreeInput = document.getElementById("cart-comp-shipping-free-text");
      if (shippingFreeInput && document.activeElement !== shippingFreeInput) shippingFreeInput.value = config.shippingFreeText || "Kostenlos";
      const shippingThresholdInput = document.getElementById("cart-comp-shipping-free-threshold");
      if (shippingThresholdInput && document.activeElement !== shippingThresholdInput) shippingThresholdInput.value = config.shippingFreeThreshold != null ? config.shippingFreeThreshold : "";
    } else if (isDividerKey(sel)) {
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
        // NON_POSITIONABLE components (background/itemRepresentation) are
        // selectable but never draggable — bail out before any drag
        // tracking is set up.
        if (NON_POSITIONABLE.has(`component:${key}`)) return;

        const origin = state.cartConfig.componentLayout[key] || { x: 0, y: 0 };
        const startX = e.clientX, startY = e.clientY;
        let moved = false;
        let guides = null;

        // Bounds relative to the component's positioning parent — keeps
        // every top-level component (title/progress/discount/recommend/
        // totals/checkout/dividers) inside the visible card area instead
        // of letting it be dragged out arbitrarily far. There is no
        // separate footer bar anymore — the checkout button is bounded to
        // the same .cart-focus-body area as every other component.
        const parentEl = compEl.closest(".cart-focus-body") || compEl.closest(".cart-focus-card");
        let bounds = null;
        if (parentEl) {
          const parentRect = parentEl.getBoundingClientRect();
          const compRect = compEl.getBoundingClientRect();
          const naturalLeft0 = compRect.left - (origin.x || 0);
          const naturalTop0 = compRect.top - (origin.y || 0);
          const rawMinX = parentRect.left - naturalLeft0;
          const rawMaxX = parentRect.right - compRect.width - naturalLeft0;
          const rawMinY = parentRect.top - naturalTop0;
          const rawMaxY = parentRect.bottom - compRect.height - naturalTop0;
          bounds = {
            minX: Math.min(rawMinX, rawMaxX), maxX: Math.max(rawMinX, rawMaxX),
            minY: Math.min(rawMinY, rawMaxY), maxY: Math.max(rawMinY, rawMaxY)
          };
        }

        // Sibling scope for snapping is simply the component's own DOM
        // parent (see the file-level comment above for why this is
        // always correct without per-component special-casing). Kept
        // deliberately separate from `bounds`/`parentEl` above — the
        // *bounds* box (how far a component may be dragged) and the
        // *snap* box (which siblings to align against) are different
        // concerns and don't need to be the same container.
        const snapContainer = compEl.parentElement;
        let naturalLeft = null, naturalTop = null;
        if (snapContainer) {
          const compRect0 = compEl.getBoundingClientRect();
          naturalLeft = compRect0.left - (origin.x || 0);
          naturalTop = compRect0.top - (origin.y || 0);
        }

        try { compEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          if (!moved) {
            moved = true;
            // Guide layer is created lazily on the first real move, same
            // convention as canvas/alignment.js attachInteraction().
            if (snapContainer && window.WebBuilderAlignment?.createGuideLayer) {
              guides = window.WebBuilderAlignment.createGuideLayer(snapContainer);
            }
          }
          let nextX = origin.x + dx, nextY = origin.y + dy;
          if (bounds) {
            nextX = Math.min(bounds.maxX, Math.max(bounds.minX, nextX));
            nextY = Math.min(bounds.maxY, Math.max(bounds.minY, nextY));
          }

          // Snap nextX/nextY against sibling components' edges/centers
          // (plus the snap container's own edges and center). The stage
          // is unscaled — zoom is passed explicitly as 1, never taken
          // from state.zoomLevel (see canvas/alignment.js's comment on
          // collectSnapTargets()'s zoomOverride parameter).
          if (guides && snapContainer && naturalLeft != null && window.WebBuilderAlignment?.collectSnapTargets) {
            const containerRect = snapContainer.getBoundingClientRect();
            const compRect = compEl.getBoundingClientRect();
            const localX = (naturalLeft - containerRect.left) + nextX;
            const localY = (naturalTop - containerRect.top) + nextY;
            const targets = window.WebBuilderAlignment.collectSnapTargets(snapContainer, compEl, "[data-cart-component]", 1);
            const snapped = window.WebBuilderAlignment.snapPosition(localX, localY, compRect.width, compRect.height, targets, 1);
            nextX += (snapped.x - localX);
            nextY += (snapped.y - localY);
            window.WebBuilderAlignment.updateGuideVisibility(guides, snapped.guideX, snapped.guideY);
          }

          compEl.style.transform = `translate(${nextX}px, ${nextY}px)`;
          state.cartConfig.componentLayout[key] = { x: Math.round(nextX), y: Math.round(nextY) };
        }
        function onUp() {
          compEl.removeEventListener("pointermove", onMove);
          compEl.removeEventListener("pointerup", onUp);
          compEl.removeEventListener("pointercancel", onUp);
          try { compEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          if (guides) { window.WebBuilderAlignment?.removeGuideLayer?.(guides); guides = null; }
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
        let guides = null;

        // Bounds relativ zur Eltern-Box (.cart-item für Artikel-Teile,
        // .cart-recommend-card für Empfehlungskarten-Teile — beide Fälle
        // sind hier bewusst gleich behandelt, siehe resolveLayoutMap()
        // oben). Einmalig beim Drag-Start berechnet: "natural*" = aktuelle
        // Position minus dem schon aktiven Transform-Offset (origin),
        // daraus ergibt sich sowohl der erlaubte x/y-Bereich als auch die
        // Umrechnung zwischen Transform-Offset und absoluter Position
        // innerhalb der Eltern-Box, die die Snap-Berechnung braucht.
        const parentEl = partEl.closest(".cart-item") || partEl.closest(".cart-recommend-card");
        let bounds = null;
        let naturalLeft = null, naturalTop = null;
        if (parentEl) {
          const parentRect = parentEl.getBoundingClientRect();
          const partRect = partEl.getBoundingClientRect();
          naturalLeft = partRect.left - (origin.x || 0);
          naturalTop = partRect.top - (origin.y || 0);
          const rawMinX = parentRect.left - naturalLeft;
          const rawMaxX = parentRect.right - partRect.width - naturalLeft;
          const rawMinY = parentRect.top - naturalTop;
          const rawMaxY = parentRect.bottom - partRect.height - naturalTop;
          bounds = {
            minX: Math.min(rawMinX, rawMaxX), maxX: Math.max(rawMinX, rawMaxX),
            minY: Math.min(rawMinY, rawMaxY), maxY: Math.max(rawMinY, rawMaxY)
          };
        }

        try { partEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          if (!moved) {
            moved = true;
            // Guide layer is created lazily on the first real move, same
            // convention as canvas/alignment.js attachInteraction().
            if (parentEl && window.WebBuilderAlignment?.createGuideLayer) {
              guides = window.WebBuilderAlignment.createGuideLayer(parentEl);
            }
          }
          let nextX = origin.x + dx, nextY = origin.y + dy;
          if (bounds) {
            nextX = Math.min(bounds.maxX, Math.max(bounds.minX, nextX));
            nextY = Math.min(bounds.maxY, Math.max(bounds.minY, nextY));
          }

          // Snap nextX/nextY against sibling parts' edges/centers plus
          // the parent box's own edges/center. The cart editor stage is
          // unscaled (it sits outside the zoom-scaled #canvas-column) —
          // zoom is passed explicitly as 1, never taken from
          // state.zoomLevel (see canvas/alignment.js comment on
          // collectSnapTargets()'s zoomOverride parameter).
          if (guides && parentEl && naturalLeft != null && window.WebBuilderAlignment?.collectSnapTargets) {
            const parentRect = parentEl.getBoundingClientRect();
            const partRect = partEl.getBoundingClientRect();
            // Absolute position (relative to parentEl's top-left) this
            // part would occupy at nextX/nextY, before snapping — derived
            // from the same "natural position minus origin offset" base
            // used for bounds above, so it stays correct even mid-drag
            // (partRect.width/height don't change while dragging).
            const localX = (naturalLeft - parentRect.left) + nextX;
            const localY = (naturalTop - parentRect.top) + nextY;
            const targets = window.WebBuilderAlignment.collectSnapTargets(parentEl, partEl, "[data-cart-part]", 1);
            const snapped = window.WebBuilderAlignment.snapPosition(localX, localY, partRect.width, partRect.height, targets, 1);
            // Snapping adjusts the part's ABSOLUTE position; since the
            // transform offset (nextX/nextY) is additive on top of the
            // unchanged natural flow position, the same delta applies
            // directly to the offset.
            nextX += (snapped.x - localX);
            nextY += (snapped.y - localY);
            window.WebBuilderAlignment.updateGuideVisibility(guides, snapped.guideX, snapped.guideY);
          }

          partEl.style.transform = `translate(${nextX}px, ${nextY}px)`;
          setPartLayoutSilent(partKey, nextX, nextY);
        }
        function onUp() {
          partEl.removeEventListener("pointermove", onMove);
          partEl.removeEventListener("pointerup", onUp);
          partEl.removeEventListener("pointercancel", onUp);
          try { partEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          if (guides) { window.WebBuilderAlignment?.removeGuideLayer?.(guides); guides = null; }
          if (moved) {
            window.WebBuilderHistory?.commit();
            const { layout } = resolveLayoutMap(partKey);
            notify("cart", "part-layout", layout);
          }
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
    const realItems = cart.getItems();
    const usingDemo = realItems.length === 0;
    let items = realItems;
    if (usingDemo) {
      const products = window.WebBuilderProducts?.getAll?.() || [];
      const demoSource = products[0] || { name: "Beispielprodukt", price: 19.99, discountPrice: 14.99, icon: "📦", description: "Kurze Beschreibung des Produkts." };
      items = [{ id: "focus-demo", productId: demoSource.id || null, name: demoSource.name, price: demoSource.price, discountPrice: demoSource.discountPrice, qty: 2, icon: demoSource.icon, description: demoSource.description || "Kurze Beschreibung des Produkts." }];
    }
    const config = cart.getConfig() || {};
    const bgSelectedClass = state.cartFocusSelectedPart === "component:background" ? " cart-component-selected" : "";
    const cardBgStyle = config.cardBackgroundColor ? ` style="background-color:${config.cardBackgroundColor};"` : "";
    const buildCartParts = window.WebBuilderCartRuntime?.buildCartParts;
    const parts = buildCartParts
      ? buildCartParts(items, { interactive: true, isDemo: usingDemo })
      : { title: "", dividers: "", progress: "", items: "", recommend: "", discount: "", totals: "", checkout: "" };
    // Kein eigener Kopf-/Fußbalken mehr — Titel und Zur-Kasse-Button
    // fließen wie jede andere Komponente ganz normal in .cart-focus-body
    // mit (siehe js/shop/cart-render.js buildTitleHtml()/
    // buildCheckoutHtml()).
    stage.innerHTML = `
      <div class="cart-focus-card${bgSelectedClass}"${cardBgStyle}>
        <div class="cart-focus-body">
          ${parts.title}
          ${parts.dividers}
          <div class="cart-focus-fixed-top">${parts.progress}</div>
          <div class="cart-focus-scroll">${parts.items}</div>
          <div class="cart-focus-fixed-bottom">${parts.recommend}${parts.discount}${parts.totals}${parts.checkout}</div>
        </div>
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

    document.getElementById("cart-comp-title-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ cartTitleLabel: e.target.value.trim() || "Dein Warenkorb" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
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

    document.getElementById("cart-comp-discount-percent")?.addEventListener("change", e => {
      const raw = e.target.value;
      const v = raw === "" ? 10 : Math.max(0, Math.min(100, Number(raw) || 0));
      window.WebBuilderHistory?.arm(); cart.setConfig({ milestoneDiscountPercent: v }, false); window.WebBuilderHistory?.commit();
      window.WebBuilderCartConfigRuntime?.renderMilestoneList?.();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-discount-threshold")?.addEventListener("change", e => {
      const raw = e.target.value;
      const v = raw === "" ? null : Math.max(0, Number(raw) || 0);
      window.WebBuilderHistory?.arm();
      cart.setConfig({ milestoneDiscountThreshold: v }, false);
      const synced = v != null ? cart.syncDiscountMilestone(v, false) : false;
      window.WebBuilderHistory?.commit();
      if (synced) {
        window.WebBuilderToast?.show?.(`Rabatt-Ziel auf ${cart.formatCurrency(v)} geändert.`, "info");
        window.WebBuilderCartConfigRuntime?.renderMilestoneList?.();
      }
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-progress-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ progressBarColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-progress-complete-text")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ progressCompleteText: e.target.value.trim() || "✓ Alle Ziele freigeschaltet" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-bg-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ cardBackgroundColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-currency")?.addEventListener("change", e => {
      const preset = cart.CURRENCY_PRESETS[e.target.value] || cart.CURRENCY_PRESETS.eur;
      window.WebBuilderHistory?.arm(); cart.setConfig({ currency: Object.assign({}, preset) }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-subtotal-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ subtotalLabel: e.target.value.trim() || "Zwischensumme" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-discount-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ discountLabel: e.target.value.trim() || "Rabatt" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-total-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ totalLabel: e.target.value.trim() || "Gesamt" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-free-product-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ freeProductLabel: e.target.value.trim() || "🎁 Gratis-Produkt" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-free-product-value")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ freeProductValueText: e.target.value.trim() || "freigeschaltet" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    // T6: Trennlinien sind eine beliebig oft hinzufügbare Komponente. Der
    // "+"-Knopf hängt am Editor-Panel selbst (nicht mehr in der
    // Kosten-Übersicht), die neue Linie startet oben im Warenkorb-Körper
    // und wird sofort ausgewählt, damit sie direkt an ihren Platz gezogen
    // werden kann.
    document.getElementById("btn-add-divider")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!state.cartFocusMode) enterFocusMode();
      const divider = cart.addDivider();
      if (divider) selectFocusPart(`${DIVIDER_PREFIX}${divider.id}`);
    }, true);
    document.getElementById("btn-remove-divider")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      const sel = state.cartFocusSelectedPart;
      if (!isDividerKey(sel)) return;
      cart.removeDivider(sel.slice(DIVIDER_PREFIX.length));
      state.cartFocusSelectedPart = null;
      renderFocusStage();
      renderFocusPartPanel();
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
    document.getElementById("cart-comp-shipping-free-threshold")?.addEventListener("change", e => {
      const raw = e.target.value;
      const v = raw === "" ? null : Math.max(0, Number(raw) || 0);
      window.WebBuilderHistory?.arm();
      cart.setConfig({ shippingFreeThreshold: v }, false);
      const synced = v != null ? cart.syncFreeShippingMilestone(v, false) : false;
      window.WebBuilderHistory?.commit();
      if (synced) {
        window.WebBuilderToast?.show?.(`Ziel für kostenlosen Versand auf ${cart.formatCurrency(v)} geändert.`, "info");
        window.WebBuilderCartConfigRuntime?.renderMilestoneList?.();
      }
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
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bindFocusEditor, 0));
  window.WebBuilderCartFocus = {
    enter: enterFocusMode,
    exit: exitFocusMode,
    isActive: () => !!state.cartFocusMode,
    renderStage: renderFocusStage,
    renderPartPanel: renderFocusPartPanel
  };
})();
