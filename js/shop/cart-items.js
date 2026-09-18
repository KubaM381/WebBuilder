// js/shop/cart-items.js
// Cart items: normalization, quantity/price mutation, totals. No config,
// no recommendations/milestones/segments — see cart-config.js,
// cart-recommendations.js, cart-milestones.js. Contributes to
// window.WebBuilderCart via Object.assign, same pattern as the
// cart-editor-*.js files.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCart: WebBuilderState is not available."); return; }
  function notify(domain, action, payload) { state.notify?.(domain, action, payload); }

  function normalizeCartItem(item = {}) {
    const price = Number(item.price) || 0;
    const discountPrice = item.discountPrice != null && item.discountPrice !== "" ? Number(item.discountPrice) || 0 : null;
    return {
      id: item.id || `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      // Reference to the source product, for reliable "already in cart?"
      // checks in recommendations. Optional — legacy items without it
      // fall back to name-matching (see cart-recommendations.js).
      productId: item.productId || null,
      name: item.name || "Produkt",
      price,
      discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null,
      qty: Math.max(1, Number(item.qty) || 1),
      icon: item.icon || "📦",
      description: item.description || ""
    };
  }

  function getEffectivePrice(item) {
    const discount = Number(item?.discountPrice);
    return Number.isFinite(discount) && discount > 0 && discount < (Number(item?.price) || 0) ? discount : Number(item?.price) || 0;
  }

  function getItems() { return state.cartItems; }
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

  function updateQty(id, qty, recordHistory = true) {
    const item = state.cartItems.find(i => i?.id === id);
    if (!item) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    item.qty = Math.max(1, Number(qty) || 1);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "updateQty", item);
    return item;
  }

  function changeQty(id, delta, recordHistory = true) {
    const item = state.cartItems.find(i => i?.id === id);
    if (!item) return null;
    const next = (Number(item.qty) || 0) + (Number(delta) || 0);
    return next <= 0 ? removeItem(id, recordHistory) : updateQty(id, next, recordHistory);
  }

  function updatePrice(id, price, recordHistory = true) {
    const item = state.cartItems.find(i => i?.id === id);
    if (!item) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    item.price = Number(price) || 0;
    if (item.discountPrice != null && item.discountPrice >= item.price) item.discountPrice = null;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "updatePrice", item);
    return item;
  }

  function updateDiscountPrice(id, value, recordHistory = true) {
    const item = state.cartItems.find(i => i?.id === id);
    if (!item) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    const v = Number(value);
    item.discountPrice = Number.isFinite(v) && v > 0 && v < (Number(item.price) || 0) ? v : null;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "updateDiscountPrice", item);
    return item;
  }

  function removeItem(id, recordHistory = true) {
    const i = state.cartItems.findIndex(x => x?.id === id);
    if (i < 0) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    const removed = state.cartItems.splice(i, 1)[0];
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "remove", removed);
    return true;
  }

  function clear(recordHistory = true) {
    if (!state.cartItems.length) return;
    if (recordHistory) window.WebBuilderHistory?.arm();
    state.cartItems.length = 0;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "clear");
  }

  window.WebBuilderCart = Object.assign(window.WebBuilderCart || {}, {
    normalizeCartItem, getEffectivePrice, getItems, getCount, getSubtotal,
    addItem, updateQty, changeQty, updatePrice, updateDiscountPrice, removeItem, clear
  });
})();
