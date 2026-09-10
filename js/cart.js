// WebBuilder cart service
// Owns cart/product data operations during the staged migration.
// DOM rendering remains in builder-legacy.js until the renderer is switched.

(() => {
  const state = window.WebBuilderState;
  if (!state) {
    console.error("WebBuilderCart: shared state missing.");
    return;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeProduct(product = {}) {
    const price = Number(product.price) || 0;
    const discountPrice = product.discountPrice != null && product.discountPrice !== ""
      ? Number(product.discountPrice) || 0
      : null;
    return {
      id: product.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: product.name || "Neues Produkt",
      price,
      discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null,
      icon: product.icon || "📦",
      description: product.description || "",
      compareAtPrice: product.compareAtPrice != null && product.compareAtPrice !== ""
        ? Number(product.compareAtPrice) || 0
        : null
    };
  }

  function normalizeCartItem(item = {}) {
    const price = Number(item.price) || 0;
    const discountPrice = item.discountPrice != null && item.discountPrice !== ""
      ? Number(item.discountPrice) || 0
      : null;
    return {
      id: item.id || `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: item.name || "Produkt",
      price,
      discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null,
      qty: Math.max(1, Number(item.qty) || 1),
      icon: item.icon || "📦",
      description: item.description || "",
      compareAtPrice: item.compareAtPrice != null && item.compareAtPrice !== ""
        ? Number(item.compareAtPrice) || 0
        : null
    };
  }

  function getEffectivePrice(item) {
    const discount = Number(item && item.discountPrice);
    if (Number.isFinite(discount) && discount > 0 && discount < (Number(item.price) || 0)) return discount;
    return Number(item && item.price) || 0;
  }

  function normalizeState() {
    state.products = Array.isArray(state.products) ? state.products.map(normalizeProduct) : [];
    state.cartItems = Array.isArray(state.cartItems) ? state.cartItems.map(normalizeCartItem) : [];
    return state;
  }

  function getItems() { return state.cartItems; }
  function getProducts() { return state.products; }
  function getConfig() { return state.cartConfig; }
  function getCount() { return state.cartItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0); }
  function getSubtotal() { return state.cartItems.reduce((sum, item) => sum + getEffectivePrice(item) * (Number(item.qty) || 0), 0); }

  function addItem(productOrItem, price, icon, description, compareAtPrice, recordHistory = true) {
    const source = typeof productOrItem === "object" ? productOrItem : {
      name: productOrItem,
      price,
      icon,
      description,
      compareAtPrice
    };
    const normalized = normalizeCartItem(source);
    const existing = state.cartItems.find(item => item.name === normalized.name);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    if (existing) {
      existing.qty = (Number(existing.qty) || 0) + 1;
    } else {
      state.cartItems.push(normalized);
    }
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return existing || normalized;
  }

  function updateQty(id, qty, recordHistory = true) {
    const item = state.cartItems.find(entry => entry && entry.id === id);
    if (!item) return null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    item.qty = Math.max(1, Number(qty) || 1);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return item;
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
    return item;
  }

  function updateDiscountPrice(id, discountPrice, recordHistory = true) {
    const item = state.cartItems.find(entry => entry && entry.id === id);
    if (!item) return null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    const value = Number(discountPrice);
    item.discountPrice = Number.isFinite(value) && value > 0 && value < (Number(item.price) || 0) ? value : null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return item;
  }

  function removeItem(id, recordHistory = true) {
    const index = state.cartItems.findIndex(item => item && item.id === id);
    if (index < 0) return false;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    state.cartItems.splice(index, 1);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return true;
  }

  function clear(recordHistory = true) {
    if (!state.cartItems.length) return;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    state.cartItems.length = 0;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
  }

  function addProduct(product = {}, recordHistory = true) {
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    const item = normalizeProduct(product);
    state.products.push(item);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return item;
  }

  function updateProduct(id, patch, recordHistory = true) {
    const product = state.products.find(item => item && item.id === id);
    if (!product) return null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    Object.assign(product, clone(patch || {}));
    const normalized = normalizeProduct(product);
    Object.keys(product).forEach(key => delete product[key]);
    Object.assign(product, normalized);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return product;
  }

  function removeProduct(id, recordHistory = true) {
    const index = state.products.findIndex(item => item && item.id === id);
    if (index < 0) return false;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    state.products.splice(index, 1);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return true;
  }

  function setConfig(patch = {}, recordHistory = true) {
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    Object.assign(state.cartConfig, clone(patch));
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return state.cartConfig;
  }

  normalizeState();

  window.WebBuilderCart = {
    getItems,
    getProducts,
    getConfig,
    getCount,
    getSubtotal,
    getEffectivePrice,
    addItem,
    updateQty,
    changeQty,
    updatePrice,
    updateDiscountPrice,
    removeItem,
    clear,
    addProduct,
    updateProduct,
    removeProduct,
    setConfig,
    normalizeProduct,
    normalizeCartItem,
    normalizeState
  };
})();
