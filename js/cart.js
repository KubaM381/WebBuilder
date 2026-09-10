// WebBuilder cart service
// Owns cart data operations during the staged migration.
// Product CRUD lives in products.js; DOM rendering is migrated separately.

(() => {
  const state = window.WebBuilderState;
  const products = window.WebBuilderProducts;
  if (!state || !products) {
    console.error("WebBuilderCart: shared state/products service missing.");
    return;
  }

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function notify(action, payload) {
    if (typeof state.notify === "function") state.notify("cart", action, payload);
  }

  function normalizeCartItem(item = {}) {
    const price = Number(item.price) || 0;
    const discountPrice = item.discountPrice != null && item.discountPrice !== ""
      ? Number(item.discountPrice) || 0 : null;
    return {
      id: item.id || `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: item.name || "Produkt", price,
      discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null,
      qty: Math.max(1, Number(item.qty) || 1), icon: item.icon || "📦",
      description: item.description || "",
      compareAtPrice: item.compareAtPrice != null && item.compareAtPrice !== "" ? Number(item.compareAtPrice) || 0 : null
    };
  }

  function getEffectivePrice(item) {
    const discount = Number(item && item.discountPrice);
    return Number.isFinite(discount) && discount > 0 && discount < (Number(item.price) || 0)
      ? discount : Number(item && item.price) || 0;
  }

  function normalizeState(emit = false) {
    products.normalizeState();
    state.cartItems = Array.isArray(state.cartItems) ? state.cartItems.map(normalizeCartItem) : [];
    if (emit) notify("normalize", { count: state.cartItems.length });
    return state;
  }

  function getItems() { return state.cartItems; }
  function getProducts() { return products.getAll(); }
  function getConfig() { return state.cartConfig; }
  function getCount() { return state.cartItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0); }
  function getSubtotal() { return state.cartItems.reduce((sum, item) => sum + getEffectivePrice(item) * (Number(item.qty) || 0), 0); }

  function addItem(productOrItem, price, icon, description, compareAtPrice, recordHistory = true) {
    const source = typeof productOrItem === "object" ? productOrItem : { name: productOrItem, price, icon, description, compareAtPrice };
    const normalized = normalizeCartItem(source);
    const existing = state.cartItems.find(item => item.name === normalized.name);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    if (existing) existing.qty = (Number(existing.qty) || 0) + 1;
    else state.cartItems.push(normalized);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    notify(existing ? "increment" : "add", existing || normalized);
    return existing || normalized;
  }

  function updateQty(id, qty, recordHistory = true) {
    const item = state.cartItems.find(entry => entry && entry.id === id);
    if (!item) return null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    item.qty = Math.max(1, Number(qty) || 1);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    notify("updateQty", item); return item;
  }

  function changeQty(id, delta, recordHistory = true) {
    const item = state.cartItems.find(entry => entry && entry.id === id);
    if (!item) return null;
    const nextQty = (Number(item.qty) || 0) + (Number(delta) || 0);
    if (nextQty <= 0) return removeItem(id, recordHistory);
    return updateQty(id, nextQty, recordHistory);
  }

  function updatePrice(id, price, recordHistory = true) {
    const item = state.cartItems.find(entry => entry && entry.id === id);
    if (!item) return null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    item.price = Number(price) || 0;
    if (item.discountPrice != null && item.discountPrice >= item.price) item.discountPrice = null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    notify("updatePrice", item); return item;
  }

  function updateDiscountPrice(id, discountPrice, recordHistory = true) {
    const item = state.cartItems.find(entry => entry && entry.id === id);
    if (!item) return null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    const value = Number(discountPrice);
    item.discountPrice = Number.isFinite(value) && value > 0 && value < (Number(item.price) || 0) ? value : null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    notify("updateDiscountPrice", item); return item;
  }

  function removeItem(id, recordHistory = true) {
    const index = state.cartItems.findIndex(item => item && item.id === id);
    if (index < 0) return false;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    const removed = state.cartItems.splice(index, 1)[0];
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    notify("remove", removed); return true;
  }

  function clear(recordHistory = true) {
    if (!state.cartItems.length) return;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    state.cartItems.length = 0;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    notify("clear");
  }

  function setConfig(patch = {}, recordHistory = true) {
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    Object.assign(state.cartConfig, clone(patch));
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    notify("config", state.cartConfig); return state.cartConfig;
  }

  normalizeState();
  window.WebBuilderCart = {
    getItems, getProducts, getConfig, getCount, getSubtotal, getEffectivePrice,
    addItem, updateQty, changeQty, updatePrice, updateDiscountPrice, removeItem, clear,
    addProduct: products.add, updateProduct: products.update, removeProduct: products.remove,
    setConfig, normalizeProduct: products.normalize, normalizeCartItem, normalizeState
  };
})();
