// js/shop/cart-editor.js
// WebBuilder cart focus editor ("Warenkorb-Editor").
// Owns the dedicated editing stage mounted into .canvas-container: shows
// the full cart body (via cart-render.js's buildCartHtml()) centered over
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

  // Header/footer bleiben während des Warenkorb-Editors sichtbar und
  // bedienbar (css/styles.css versteckt .builder-bar nicht mehr im
  // "cart-focus-active"-Zustand). Damit die Editor-Bühne
  // (#cart-focus-stage) die Bars dabei weder optisch verdeckt noch ihre
  // Klicks blockiert, beschränkt sich die Bühne stattdessen auf den
  // Bereich zwischen der sichtbaren Header-Unterkante und der sichtbaren
  // Footer-Oberkante. Die Positionen werden live per
  // getBoundingClientRect() gemessen statt aus state.headerHeight/
  // footerHeight berechnet, damit das auch bei aktivem Zoom exakt passt.
  const STAGE_BAR_GAP = 10;
  function computeStageInsets() {
    const host = document.querySelector(".canvas-container");
    const canvasEl = document.getElementById("canvas");
    if (!host || !canvasEl) return { top: 0, bottom: 0 };
    const hostRect = host.getBoundingClientRect();
    let top = 0, bottom = 0;
    const headerBar = canvasEl.querySelector('.builder-bar[data-bar-target="header"]');
    const footerBar = canvasEl.querySelector('.builder-bar[data-bar-target="footer"]');
    if (headerBar) {
      const r = headerBar.getBoundingClientRect();
      top = Math.max(0, Math.round(r.bottom - hostRect.top) + STAGE_BAR_GAP);
    }
    if (footerBar) {
      const r = footerBar.getBoundingClientRect();
      bottom = Math.max(0, Math.round(hostRect.bottom - r.top) + STAGE_BAR_GAP);
    }
    return { top, bottom };
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
  const NON_POSITIONABLE = new Set(["component:background", "component:itemRepresentation"]);

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
    "cart-comp-checkout-fields", "cart-comp-discount-fields", "cart-comp-item-fields",
    "cart-comp-background-fields", "cart-comp-recommend-fields", "cart-comp-progress-fields",
    "cart-comp-qty-fields", "cart-comp-price-fields", "cart-comp-remove-fields",
    "cart-comp-totals-fields"
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
      "component:totals": "Kosten-Übersicht"
    };
    const labelEl = document.getElementById("cart-part-label");
    if (labelEl) labelEl.textContent = labels[sel] || sel;

    const config = cart.getConfig();

    if (sel === "component:checkout") {
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

  // BUGFIX: Sub-Teile (Icon/Name, Menge, Preis, Entfernen, Beschreibung)
  // und Top-Level-Komponenten (Rabattfeld, Fortschrittsbalken, ...) waren
  // NICHT ziehbar, sobald der Klick auf ein echtes <input>/<select>/
  // <button> innerhalb des Teils traf (z. B. das Entfernen-Icon selbst
  // oder das Rabattcode-Feld) — der alte Code hat in diesem Fall den Drag
  // gar nicht erst gestartet, sondern nur selektiert. Da innerhalb des
  // Warenkorb-Editors ohnehin NIE eine echte Aktion ausgelöst werden soll
  // (siehe AUFGABE B: Entfernen/Menge/Preis/Rabatt-Anwenden sind über die
  // #cart-items-list-Scoping-Konvention in cart-render.js bereits
  // geschützt), gibt es hier jetzt keine Sonderbehandlung mehr: JEDER
  // Klick auf einen Teil/eine Komponente startet preventDefault() + Drag,
  // unabhängig vom genauen Ziel-Element. Das macht z. B. das
  // Entfernen-Symbol zu einem reinen Ziehgriff (keine Button-Funktion
  // mehr erreichbar) und verhindert zugleich, dass Texteingaben (Rabatt-
  // code-Feld) durch Fokus/Tippen "funktionieren".
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

        // BUGFIX: Bounds relativ zur Eltern-Artikel-Box (.cart-item), damit
        // sich Icon/Name, Menge, Preis, Entfernen-Button und Beschreibung
        // nicht mehr aus dem Produktfeld herausziehen lassen. Einmalig
        // beim Drag-Start berechnet: "natural*" = aktuelle Position minus
        // dem schon aktiven Transform-Offset (origin), daraus ergibt sich
        // der erlaubte x/y-Bereich, in dem die linke/obere bzw.
        // rechte/untere Kante des Teils innerhalb der Artikel-Box bleibt.
        // Die Stage liegt außerhalb von .canvas-column und ist nicht
        // gezoomt, daher genügen rohe Client-Pixel-Deltas ohne
        // Zoom-Korrektur (siehe canvas/alignment.js für den Vergleich mit
        // dem gezoomten Canvas).
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
    // Stage auf den Bereich zwischen Header-Unterkante und
    // Footer-Oberkante begrenzen (siehe computeStageInsets() oben).
    const insets = computeStageInsets();
    stage.style.top = insets.top + "px";
    stage.style.bottom = insets.bottom + "px";
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
    const cardBgStyle = config.cardBackgroundColor ? ` style="background-color:${config.cardBackgroundColor};"` : "";
    const buildCartHtml = window.WebBuilderCartRuntime?.buildCartHtml;
    stage.innerHTML = `
      <div class="cart-focus-card${bgSelectedClass}"${cardBgStyle}>
        <div class="cart-focus-header">
          <p class="cart-focus-hint">🛒 Warenkorb-Editor — klicke auf einen Bereich (Artikel, Fortschrittsbalken, Rabattfeld, Empfehlung, Zur-Kasse-Button, Kosten-Übersicht, Hintergrund), um ihn anzupassen</p>
          <button type="button" class="btn btn-danger-outline btn-sm" id="cart-focus-exit-inline">✖</button>
        </div>
        <div class="cart-focus-body">${buildCartHtml ? buildCartHtml(items, { interactive: true, isDemo: usingDemo }) : ""}</div>
        <button type="button" class="btn btn-primary cart-focus-checkout${checkoutSelectedClass}" data-cart-component="checkout" style="width:100%; background-color:${checkoutColor}; border-radius:${checkoutRadius}; transform:translate(${checkoutLayout.x || 0}px, ${checkoutLayout.y || 0}px);">${esc(state.cartButtonLabel || "Zur Kasse gehen")}</button>
      </div>
    `;
    bindFocusStageInteractions(stage);
    document.getElementById("cart-focus-exit-inline")?.addEventListener("click", e => { e.preventDefault(); exitFocusMode(); }, true);
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

    // Bühnen-Bereich (zwischen Header/Footer) bei Fenstergrößenänderung
    // und bei Header-/Footer-Änderungen (z. B. Höhe per Ziehgriff
    // angepasst) neu berechnen, solange der Warenkorb-Editor offen ist.
    window.addEventListener("resize", () => { if (state.cartFocusMode) renderFocusStage(); });
    window.WebBuilderHeaderFooter?.onChange?.(() => { if (state.cartFocusMode) renderFocusStage(); });

    document.addEventListener("keydown", e => { if (e.key === "Escape" && state.cartFocusMode) exitFocusMode(); });
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bindFocusEditor, 0));
  window.WebBuilderCartFocus = {
    enter: enterFocusMode,
    exit: exitFocusMode,
    isActive: () => !!state.cartFocusMode,
    // Exposed for cart-render.js's refreshCartViews()/renderConfig(), so
    // the editor stage stays in sync whenever the drawer/config re-renders.
    renderStage: renderFocusStage,
    renderPartPanel: renderFocusPartPanel
  };
})();
