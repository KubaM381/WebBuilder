// js/shop/cart-data.js
// WebBuilder cart data domain
// Owns cart data only: items, config, recommendations, milestones,
// normalization. No DOM/rendering — that lives in cart-render.js (shared
// drawer/editor HTML + drawer bindings) and cart-editor.js (the focus
// editor stage). Product management lives in products.js; cart-data
// references products only by ID via window.WebBuilderProducts, no
// duplicated product data.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCart: WebBuilderState is not available."); return; }
  const clone = value => JSON.parse(JSON.stringify(value));
  function notify(domain, action, payload) { if (typeof state.notify === "function") state.notify(domain, action, payload); }

  // Fixed palette for the quantity +/- buttons — deliberately a closed
  // set (not a free color picker) so the buttons stay legible against any
  // item background. Used by shop/cart-render.js.
  const QUANTITY_BUTTON_COLORS = { green: "#10b981", red: "#ef4444", black: "#111827", gray: "#6b7280" };
  function quantityColorHex(key) { return QUANTITY_BUTTON_COLORS[key] || QUANTITY_BUTTON_COLORS.black; }

  function normalizeCartItem(item = {}) {
    const price = Number(item.price) || 0;
    const discountPrice = item.discountPrice != null && item.discountPrice !== "" ? Number(item.discountPrice) || 0 : null;
    return {
      id: item.id || `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      // Reference back to the source product (reliable "already in cart?"
      // checks for recommendations). Optional — old saved cart items
      // without it just fall back to name-matching, see
      // pickRecommendation() below.
      productId: item.productId || null,
      name: item.name || "Produkt",
      price,
      discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null,
      qty: Math.max(1, Number(item.qty) || 1),
      icon: item.icon || "📦",
      description: item.description || ""
    };
  }
  function getEffectivePrice(item) { const discount = Number(item?.discountPrice); return Number.isFinite(discount) && discount > 0 && discount < (Number(item?.price) || 0) ? discount : Number(item?.price) || 0; }

  // ------------------------------------------------------------------
  // Recommendations — each entry is a small rule object instead of a
  // bare product ID, so text/alternative/condition can be configured per
  // recommendation. Legacy projects stored plain ID strings; those are
  // migrated transparently by normalizeRecommendation().
  // ------------------------------------------------------------------
  function defaultRecommendationText() { return "Das könnte dir auch gefallen"; }

  function normalizeRecommendation(entry) {
    const rec = typeof entry === "string" ? { productId: entry } : (entry || {});
    const cond = rec.condition && typeof rec.condition === "object" ? rec.condition : {};
    return {
      id: rec.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      productId: rec.productId || null,
      alternativeProductId: rec.alternativeProductId || null,
      text: rec.text || defaultRecommendationText(),
      // type: "none" | "cartCountEquals" | "cartCountAtLeast" | "subtotalBelow" | "subtotalAbove"
      condition: { type: cond.type || "none", value: Number(cond.value) || 0 }
    };
  }
  // BUGFIX: previously `.map(normalizeRecommendation)` — this built a
  // brand-new object for every recommendation on every normalize pass.
  // cart-data.js's own updateRecommendation()/addRecommendation()/
  // removeRecommendation() call window.WebBuilderHistory?.arm() before
  // mutating, and arm() triggers normalizeRuntimeState() ->
  // cart.normalizeState() -> this function. That replaced
  // state.cartConfig.recommendations with all-new objects *before* the
  // caller's own patch was applied to the (now orphaned) old reference —
  // the edit silently never reached the live array (same reference-
  // stability class of bug as normalizeState()/normalizeItem() for
  // cartItems, see project README "Key learnings"). Fixed by normalizing
  // in place (WebBuilderUtils.normalizeInPlace) so an existing
  // recommendation object keeps its identity across a normalize pass.
  function normalizeRecommendations(list) {
    return window.WebBuilderUtils.normalizeInPlace(Array.isArray(list) ? list : [], normalizeRecommendation);
  }

  const CONDITION_LABELS = {
    none: "Immer anzeigen",
    cartCountEquals: "Nur bei genau X Artikeln im Warenkorb",
    cartCountAtLeast: "Ab X Artikeln im Warenkorb",
    subtotalBelow: "Wenn Warenkorbwert unter X €",
    subtotalAbove: "Wenn Warenkorbwert über X €"
  };

  // "count" = Summe aller Mengen im (übergebenen) Warenkorb, nicht die
  // Anzahl unterschiedlicher Produkte.
  function conditionMatches(condition, ctx) {
    const type = condition?.type || "none";
    const value = Number(condition?.value) || 0;
    switch (type) {
      case "cartCountEquals": return ctx.count === value;
      case "cartCountAtLeast": return ctx.count >= value;
      case "subtotalBelow": return ctx.subtotal < value;
      case "subtotalAbove": return ctx.subtotal > value;
      default: return true;
    }
  }

  // Finds the first matching recommendation for the given cart contents.
  // If its primary product is already in the cart, falls back to the
  // configured alternative (if any and if that one isn't also in the cart).
  //
  // T5 fix: `opts.isDemo` must be set when `items` is the synthetic
  // placeholder cart item built by js/shop/cart-editor.js
  // renderFocusStage() for an empty real cart — that demo item is not an
  // actual cart item. It used to also feed the "already in cart"
  // exclusion below, which silently swallowed a recommendation whenever
  // it pointed at the very product the demo item happened to show (most
  // often products[0]) — the editor then rendered the "no matching
  // recommendation configured" dummy card even though everything was
  // configured correctly. count/subtotal are still computed from `items`
  // unchanged, so cartCountEquals/subtotalBelow/etc. keep reacting
  // sensibly in the preview — only the in-cart exclusion is skipped.
  function pickRecommendation(items, subtotal, opts = {}) {
    const list = Array.isArray(getConfig()?.recommendations) ? getConfig().recommendations : [];
    if (!list.length) return null;
    const count = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const inCartItems = opts.isDemo ? [] : items;
    const inCartIds = new Set(inCartItems.map(i => i.productId).filter(Boolean));
    const inCartNames = new Set(inCartItems.map(i => i.name));
    for (const rec of list) {
      if (!conditionMatches(rec.condition, { count, subtotal })) continue;
      let product = rec.productId ? window.WebBuilderProducts?.getById?.(rec.productId) : null;
      const primaryInCart = product && (inCartIds.has(product.id) || inCartNames.has(product.name));
      if (primaryInCart) {
        product = rec.alternativeProductId ? window.WebBuilderProducts?.getById?.(rec.alternativeProductId) : null;
        if (!product) continue;
        if (inCartIds.has(product.id) || inCartNames.has(product.name)) continue;
      }
      if (!product) continue;
      return { rec, product };
    }
    return null;
  }

  // Normalizes in place (WebBuilderUtils.normalizeInPlace) so references
  // stay stable during active quantity/price edits.
  function normalizeState() {
    window.WebBuilderProducts?.normalizeState?.();
    state.cartItems = window.WebBuilderUtils.normalizeInPlace(state.cartItems, normalizeCartItem);
    state.cartConfig.recommendations = normalizeRecommendations(state.cartConfig.recommendations);
    if (!Array.isArray(state.cartConfig.milestones)) state.cartConfig.milestones = [];
    // Defensive defaults for projects saved before these fields existed.
    if (!state.cartConfig.itemDisplay || typeof state.cartConfig.itemDisplay !== "object") state.cartConfig.itemDisplay = {};
    if (!state.cartConfig.itemDisplay.layout || typeof state.cartConfig.itemDisplay.layout !== "object") state.cartConfig.itemDisplay.layout = {};
    if (state.cartConfig.discountButtonColor == null) state.cartConfig.discountButtonColor = "#4f46e5";
    if (state.cartConfig.discountButtonShape == null) state.cartConfig.discountButtonShape = "rounded";
    // Fill color of the progress bar track.
    if (state.cartConfig.progressBarColor == null) state.cartConfig.progressBarColor = "#10b981";
    // Quantity selector "group" variant shape + the closed +/- color
    // palette. Defaults keep existing projects' look unchanged (stepper
    // style, black buttons) until explicitly edited.
    if (state.cartConfig.itemDisplay.quantityGroupShape == null) state.cartConfig.itemDisplay.quantityGroupShape = "rounded";
    if (state.cartConfig.itemDisplay.quantityButtonColor == null) state.cartConfig.itemDisplay.quantityButtonColor = "black";
    // Divider between items on a transparent item shape — default false,
    // so existing projects look unchanged until explicitly enabled.
    if (state.cartConfig.itemDisplay.showItemDividers == null) state.cartConfig.itemDisplay.showItemDividers = false;
    // Cart editor: per-component position offsets (progress, discount,
    // recommend, checkout, totals) plus "Artikel-Darstellung"
    // background/size overrides. Empty string / null mean "no override,
    // use the shape's/CSS's own default" so existing projects keep their
    // exact current look until someone explicitly customizes these.
    if (!state.cartConfig.componentLayout || typeof state.cartConfig.componentLayout !== "object") state.cartConfig.componentLayout = {};
    if (state.cartConfig.itemBackgroundColor == null) state.cartConfig.itemBackgroundColor = "";
    if (state.cartConfig.cardBackgroundColor == null) state.cartConfig.cardBackgroundColor = "";
    // Hintergrundfarbe des Fußbereichs (component:footer, enthält den
    // Zur-Kasse-Button) — unabhängig von cardBackgroundColor (der Karte
    // selbst). Leer = Default aus css/modals.css (.drawer-footer,
    // var(--bg-main)), damit unveränderte Projekte unverändert aussehen.
    if (state.cartConfig.footerBackgroundColor == null) state.cartConfig.footerBackgroundColor = "";
    if (state.cartConfig.itemWidth === undefined) state.cartConfig.itemWidth = null;
    if (state.cartConfig.itemMinHeight === undefined) state.cartConfig.itemMinHeight = null;
    // T1: editable title of the cart drawer/editor header (e.g. "Dein
    // Warenkorb"). Default matches the previously hardcoded string
    // exactly, so existing projects render byte-identical until changed.
    if (state.cartConfig.cartTitleLabel == null) state.cartConfig.cartTitleLabel = "Dein Warenkorb";
    // "Kosten-Übersicht" (component:totals, cart-editor.js): editable
    // labels for the subtotal/discount/shipping/total rows plus the
    // shipping cost amount and the free-shipping text. Defaults match the
    // previously hardcoded strings/values exactly, so existing projects
    // render byte-identical until someone explicitly edits these.
    if (state.cartConfig.subtotalLabel == null) state.cartConfig.subtotalLabel = "Zwischensumme";
    if (state.cartConfig.discountLabel == null) state.cartConfig.discountLabel = "Rabatt";
    if (state.cartConfig.shippingLabel == null) state.cartConfig.shippingLabel = "Versand";
    if (state.cartConfig.shippingCost == null) state.cartConfig.shippingCost = 4.95;
    if (state.cartConfig.shippingFreeText == null) state.cartConfig.shippingFreeText = "Kostenlos";
    if (state.cartConfig.totalLabel == null) state.cartConfig.totalLabel = "Gesamt";
    // T4: Empfehlungskarte — Form + Farbe des "+"-Buttons, sowie eine
    // eigene Positions-Map für ihre Unterteile (Icon/Name/Preis/Plus).
    // Eigene Map statt itemDisplay.layout, da die Empfehlungskarte kein
    // Warenkorb-Artikel ist (anderes Elternelement) — siehe
    // js/shop/cart-render.js buildRecommendCardContentHtml() und
    // js/shop/cart-editor.js resolveLayoutMap(). Defaults entsprechen dem
    // bisherigen fest verdrahteten Aussehen (css/modals.css
    // .cart-recommend-card / .cart-recommend-add), damit bestehende
    // Projekte unverändert bleiben.
    if (state.cartConfig.recommendShape == null) state.cartConfig.recommendShape = "rounded";
    if (state.cartConfig.recommendAddButtonColor == null) state.cartConfig.recommendAddButtonColor = "#4f46e5";
    if (!state.cartConfig.recommendDisplay || typeof state.cartConfig.recommendDisplay !== "object") state.cartConfig.recommendDisplay = {};
    if (!state.cartConfig.recommendDisplay.layout || typeof state.cartConfig.recommendDisplay.layout !== "object") state.cartConfig.recommendDisplay.layout = {};
    return state;
  }
  function getItems() { return state.cartItems; }
  function getConfig() { return state.cartConfig; }
  function getCount() { return state.cartItems.reduce((s, i) => s + (Number(i.qty) || 0), 0); }
  function getSubtotal() { return state.cartItems.reduce((s, i) => s + getEffectivePrice(i) * (Number(i.qty) || 0), 0); }
  function addItem(productOrItem, price, icon, description, recordHistory = true) {
    const source = typeof productOrItem === "object" ? productOrItem : { name: productOrItem, price, icon, description };
    const normalized = normalizeCartItem(Object.assign({}, source, { productId: source.productId || source.id || null }));
    const existing = state.cartItems.find(i => i.name === normalized.name);
    if (recordHistory) window.WebBuilderHistory?.arm();
    if (existing) existing.qty = (Number(existing.qty) || 0) + 1;
    else state.cartItems.push(normalized);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", existing ? "increment" : "add", existing || normalized);
    return existing || normalized;
  }
  function updateQty(id, qty, recordHistory = true) { const item = state.cartItems.find(i => i?.id === id); if (!item) return null; if (recordHistory) window.WebBuilderHistory?.arm(); item.qty = Math.max(1, Number(qty) || 1); if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "updateQty", item); return item; }
  function changeQty(id, delta, recordHistory = true) { const item = state.cartItems.find(i => i?.id === id); if (!item) return null; const next = (Number(item.qty) || 0) + (Number(delta) || 0); return next <= 0 ? removeItem(id, recordHistory) : updateQty(id, next, recordHistory); }
  function updatePrice(id, price, recordHistory = true) { const item = state.cartItems.find(i => i?.id === id); if (!item) return null; if (recordHistory) window.WebBuilderHistory?.arm(); item.price = Number(price) || 0; if (item.discountPrice != null && item.discountPrice >= item.price) item.discountPrice = null; if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "updatePrice", item); return item; }
  function updateDiscountPrice(id, value, recordHistory = true) { const item = state.cartItems.find(i => i?.id === id); if (!item) return null; if (recordHistory) window.WebBuilderHistory?.arm(); const v = Number(value); item.discountPrice = Number.isFinite(v) && v > 0 && v < (Number(item.price) || 0) ? v : null; if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "updateDiscountPrice", item); return item; }
  function removeItem(id, recordHistory = true) { const i = state.cartItems.findIndex(x => x?.id === id); if (i < 0) return false; if (recordHistory) window.WebBuilderHistory?.arm(); const removed = state.cartItems.splice(i, 1)[0]; if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "remove", removed); return true; }
  function clear(recordHistory = true) { if (!state.cartItems.length) return; if (recordHistory) window.WebBuilderHistory?.arm(); state.cartItems.length = 0; if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "clear"); }
  function setConfig(patch = {}, recordHistory = true) { if (recordHistory) window.WebBuilderHistory?.arm(); Object.assign(state.cartConfig, clone(patch)); if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "config", state.cartConfig); return state.cartConfig; }
  function setItemDisplay(patch = {}, recordHistory = true) { if (recordHistory) window.WebBuilderHistory?.arm(); state.cartConfig.itemDisplay = Object.assign({}, state.cartConfig.itemDisplay || {}, clone(patch)); if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "display", state.cartConfig.itemDisplay); return state.cartConfig.itemDisplay; }
  function setButtonLabel(label, recordHistory = true) { if (recordHistory) window.WebBuilderHistory?.arm(); state.cartButtonLabel = String(label || "Zur Kasse gehen"); if (recordHistory) window.WebBuilderHistory?.commit(); notify("cart", "button-label", state.cartButtonLabel); return state.cartButtonLabel; }

  // Demo discount code: "DEMO10" = -10%. `container` is the `.cart-discount`
  // wrapper the click came from — the drawer and the editor stage can both
  // render a discount field at the same time, so the input can no longer
  // be looked up by a page-wide id (see cart-render.js buildCartHtml()).
  function applyDiscountCode(container) {
    const input = container?.querySelector(".cart-discount-input");
    const code = (input?.value || "").trim().toUpperCase();
    if (code === "DEMO10") {
      state.appliedDiscountPercent = 10;
      state.appliedDiscountLabel = 'Code „DEMO10“ angewendet (−10%).';
    } else {
      state.appliedDiscountPercent = 0;
      state.appliedDiscountLabel = code ? "Ungültiger Code (Demo-Code: DEMO10)." : "";
    }
  }

  // Recommendations store product IDs only, no duplicated product data.
  function addRecommendation(productId) {
    if (!productId || !window.WebBuilderProducts?.getById?.(productId)) return null;
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.recommendations)) state.cartConfig.recommendations = [];
    const rec = normalizeRecommendation({ productId });
    state.cartConfig.recommendations.push(rec);
    window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
    return rec;
  }
  function removeRecommendation(recId) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.recommendations = (state.cartConfig.recommendations || []).filter(r => r.id !== recId);
    window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
  }
  function updateRecommendation(recId, patch = {}, recordHistory = true) {
    const rec = (state.cartConfig.recommendations || []).find(r => r.id === recId);
    if (!rec) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    if (patch.text !== undefined) rec.text = patch.text;
    if (patch.alternativeProductId !== undefined) rec.alternativeProductId = patch.alternativeProductId || null;
    if (patch.condition !== undefined) rec.condition = { type: patch.condition.type || "none", value: Number(patch.condition.value) || 0 };
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
    return rec;
  }

  // Progress-bar milestones. `icon` is an optional emoji/short text shown
  // once the milestone is reached, `reachedText` is an optional custom
  // message shown in the progress area once this milestone is the
  // highest one reached and no further milestone follows (see
  // cart-render.js buildCartHtml()).
  function addMilestone() {
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.milestones)) state.cartConfig.milestones = [];
    state.cartConfig.milestones.push({ id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, amount: 50, label: "Kostenloser Versand", action: "free-shipping", icon: "🚚", reachedText: "" });
    window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
  }
  function removeMilestone(id) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.milestones = (state.cartConfig.milestones || []).filter(m => m.id !== id);
    window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
  }

  normalizeState();
  window.WebBuilderCart = {
    getItems, getConfig, getCount, getSubtotal, getEffectivePrice,
    addItem, updateQty, changeQty, updatePrice, updateDiscountPrice, removeItem, clear,
    setConfig, setItemDisplay, setButtonLabel,
    normalizeCartItem, normalizeState,
    applyDiscountCode,
    addRecommendation, removeRecommendation, updateRecommendation,
    addMilestone, removeMilestone,
    // Internal helpers also used by shop/cart-render.js and
    // shop/cart-editor.js (kept here since they operate on the cart data/
    // config shape owned by this file).
    quantityColorHex, pickRecommendation, defaultRecommendationText, CONDITION_LABELS
  };
})();
