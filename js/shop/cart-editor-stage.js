// js/shop/cart-editor-stage.js
// WebBuilder cart focus editor — stage & selection.
// Owns the focus-mode lifecycle (enter/exit), the on-canvas stage DOM
// (renderFocusStage, built from shop/cart-html.js's buildCartParts()),
// which part/component is currently selected, and the shared layout data
// model (get/set/reset the pixel offset of a part or component).
//
// Pointer drag interaction lives in cart-editor-drag.js, the right-hand
// panel rendering in cart-editor-panel.js, its field bindings in
// cart-editor-bindings.js. All four files contribute to the same
// window.WebBuilderCartFocus object and call into each other only at
// runtime through it, never at parse time — so their load order relative
// to one another does not matter (see js/README.md).
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartFocus: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartFocus: WebBuilderCart is not available."); return; }
  function notify(domain, action, payload) { state.notify?.(domain, action, payload); }

  // "recommend:"-prefixed part keys (icon/name/price/add of the
  // recommendation card) live in cartConfig.recommendDisplay.layout,
  // every other part key in cartConfig.itemDisplay.layout.
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

  // After the article box (itemEl, a real .cart-item DOM node on the
  // stage) is resized externally (e.g. content growing), a part's stored
  // pixel offset (itemDisplay.layout) can end up partly or fully outside
  // the box — the offset is measured from the part's natural flow
  // position. Only clamps parts that already have a custom offset.
  function clampPartLayoutsToItem(itemEl) {
    if (!itemEl) return;
    const itemRect = itemEl.getBoundingClientRect();
    itemEl.querySelectorAll(":scope > [data-cart-part]").forEach(partEl => {
      const partKey = partEl.dataset.cartPart;
      const { layout, key } = resolveLayoutMap(partKey);
      const current = layout[key];
      if (!current) return;
      const partRect = partEl.getBoundingClientRect();
      let dx = 0, dy = 0;
      if (partRect.left < itemRect.left) dx = itemRect.left - partRect.left;
      else if (partRect.right > itemRect.right) dx = itemRect.right - partRect.right;
      if (partRect.top < itemRect.top) dy = itemRect.top - partRect.top;
      else if (partRect.bottom > itemRect.bottom) dy = itemRect.bottom - partRect.bottom;
      if (dx || dy) layout[key] = { x: Math.round(current.x + dx), y: Math.round(current.y + dy) };
    });
  }

  // Top-level components (progress/discount/recommend/checkout/totals/
  // title/items) use a flat cartConfig.componentLayout map instead of
  // resolveLayoutMap()'s two maps, since they aren't cart-item sub-parts.
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

  // "background" (the whole card background) is selectable/editable but
  // never position-draggable — it has no sensible free position.
  const NON_POSITIONABLE = new Set(["component:background"]);

  // Every cart item renders the same data-cart-part keys, because one
  // shared pixel offset per part type applies to all items — so the
  // highlight has to mark EVERY match, not just the first one.
  function applySelectionHighlight() {
    const stage = document.getElementById("cart-focus-stage");
    if (!stage) return;
    stage.querySelectorAll(".cart-item-part-selected, .cart-component-selected").forEach(el => el.classList.remove("cart-item-part-selected", "cart-component-selected"));
    const sel = state.cartFocusSelectedPart;
    if (!sel) return;
    if (sel.startsWith("component:")) {
      const key = sel.slice("component:".length);
      if (key === "background") stage.querySelector(".cart-focus-card")?.classList.add("cart-component-selected");
      else stage.querySelectorAll(`[data-cart-component="${key}"]`).forEach(el => el.classList.add("cart-component-selected"));
    } else {
      stage.querySelectorAll(`[data-cart-part="${sel}"]`).forEach(el => el.classList.add("cart-item-part-selected"));
    }
  }

  // "Heavy" select re-renders the whole stage. "Light" select only
  // updates the highlight + panel — used at drag start so an
  // in-progress drag's DOM node isn't replaced mid-move.
  function selectFocusPart(partKey) {
    state.cartFocusSelectedPart = partKey;
    renderFocusStage();
    window.WebBuilderCartFocus?.renderPartPanel?.();
  }
  function selectFocusPartLight(partKey) {
    state.cartFocusSelectedPart = partKey;
    applySelectionHighlight();
    window.WebBuilderCartFocus?.renderPartPanel?.();
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
      : { title: "", progress: "", items: "", recommend: "", discount: "", totals: "", checkout: "" };
    stage.innerHTML = `
      <div class="cart-focus-card${bgSelectedClass}"${cardBgStyle}>
        <div class="cart-focus-body">
          ${parts.title}
          <div class="cart-focus-fixed-top">${parts.progress}</div>
          <div class="cart-focus-scroll">${parts.items}</div>
          <div class="cart-focus-fixed-bottom">${parts.recommend}${parts.discount}${parts.totals}${parts.checkout}</div>
        </div>
      </div>
    `;
    window.WebBuilderCartFocus?.bindFocusStageInteractions?.(stage);
    window.WebBuilderCartRuntime?.fitItemsBox?.(host, stage.querySelector(".cart-focus-card"));
  }

  function enterFocusMode() {
    if (state.isPreviewMode) window.WebBuilderPreview?.exit?.();
    state.cartFocusMode = true;
    state.cartFocusSelectedPart = null;
    document.body.classList.add("cart-focus-active");
    window.WebBuilderInspector?.select?.(null);
    window.WebBuilderHeaderFooterRuntime?.clearSelection?.();
    // Phase 2 flow-layout selection (Section/Row/Card) — see
    // canvas/sections-render.js; entering the cart editor has no
    // notify() call to react to, so this one line is added explicitly.
    window.WebBuilderSectionsRuntime?.clearSelection?.();
    document.getElementById("cart-inspector-form")?.classList.remove("hidden");
    renderFocusStage();
    window.WebBuilderCartFocus?.renderPartPanel?.();
  }
  function exitFocusMode() {
    state.cartFocusMode = false;
    state.cartFocusSelectedPart = null;
    document.body.classList.remove("cart-focus-active");
    document.getElementById("cart-focus-stage")?.remove();
    document.getElementById("cart-inspector-form")?.classList.add("hidden");
  }

  window.WebBuilderCartFocus = Object.assign(window.WebBuilderCartFocus || {}, {
    enter: enterFocusMode,
    exit: exitFocusMode,
    isActive: () => !!state.cartFocusMode,
    renderStage: renderFocusStage,
    select: selectFocusPart,
    selectLight: selectFocusPartLight,
    getPartLayout,
    setPartLayoutSilent,
    resolveLayoutMap,
    clampPartLayoutsToItem,
    getSelectedLayout,
    setSelectedLayout,
    resetSelectedLayout,
    NON_POSITIONABLE
  });
})();
