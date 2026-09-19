// js/shop/cart-recommendations.js
// Cart recommendations: rule objects ({id, productId, alternativeProductId,
// text, condition}), condition matching, and which one to show for a given
// cart state (pickRecommendation). References products only by ID via
// window.WebBuilderProducts. Contributes to window.WebBuilderCart.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCart: WebBuilderState is not available."); return; }
  function notify(domain, action, payload) { state.notify?.(domain, action, payload); }

  function defaultRecommendationText() { return "Das könnte dir auch gefallen"; }

  // Legacy projects stored plain product-ID strings instead of rule
  // objects — migrated transparently here.
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
  // In-place normalize (not .map()) so an active edit's object reference
  // stays valid across the normalize pass that runs before every history
  // commit.
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

  // Whether `product` is already represented by one of the given cart
  // items. Matches by productId whenever an item has one — the reliable
  // case. Name matching is only a fallback for genuinely legacy items
  // that predate the productId field: applying it unconditionally caused
  // false positives whenever two different products happened to share a
  // name (e.g. both still at the default "Neues Produkt"), which silently
  // blocked a valid recommendation from ever showing.
  function isProductInCart(product, cartItems) {
    if (!product) return false;
    return cartItems.some(item => item.productId ? item.productId === product.id : item.name === product.name);
  }

  // First matching recommendation for the given cart contents. If its
  // primary product is already in the cart, falls back to the configured
  // alternative (if any and not itself already in the cart).
  //
  // opts.isDemo must be set for the synthetic demo item the cart editor
  // shows on an empty cart (see cart-editor-stage.js) — otherwise that
  // demo item would count as "already in cart" and silently swallow a
  // matching recommendation.
  function pickRecommendation(items, subtotal, opts = {}) {
    const list = Array.isArray(state.cartConfig?.recommendations) ? state.cartConfig.recommendations : [];
    if (!list.length) return null;
    const count = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const inCartItems = opts.isDemo ? [] : items;
    for (const rec of list) {
      if (!conditionMatches(rec.condition, { count, subtotal })) continue;
      let product = rec.productId ? window.WebBuilderProducts?.getById?.(rec.productId) : null;
      if (isProductInCart(product, inCartItems)) {
        product = rec.alternativeProductId ? window.WebBuilderProducts?.getById?.(rec.alternativeProductId) : null;
        if (!product || isProductInCart(product, inCartItems)) continue;
      }
      if (!product) continue;
      return { rec, product };
    }
    return null;
  }

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

  window.WebBuilderCart = Object.assign(window.WebBuilderCart || {}, {
    defaultRecommendationText, normalizeRecommendation, normalizeRecommendations,
    pickRecommendation, addRecommendation, removeRecommendation, updateRecommendation,
    CONDITION_LABELS
  });
})();
