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

  function getItems() { return state.cartItems; }
  function getProducts() { return state.products; }
  function getConfig() { return state.cartConfig; }
  function getCount() { return state.cartItems.reduce((sum, item) => sum + (Number(item.qty) || 0), 0); }
  function getSubtotal() { return state.cartItems.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0); }

  function addItem(productOrItem, price, icon, description, compareAtPrice, recordHistory = true) {
    const source = typeof productOrItem === "object" ? productOrItem : {
      name: productOrItem,
      price,
      icon,
      description,
      compareAtPrice
    };
    const existing = state.cartItems.find(item => item.name === source.name);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    if (existing) {
      existing.qty = (Number(existing.qty) || 0) + 1;
    } else {
      state.cartItems.push({
        id: source.id || `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        name: source.name || "Produkt",
        price: Number(source.price) || 0,
        qty: Math.max(1, Number(source.qty) || 1),
        icon: source.icon || "📦",
        description: source.description || "",
        compareAtPrice: source.compareAtPrice != null ? Number(source.compareAtPrice) || 0 : null
      });
    }
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return existing || state.cartItems[state.cartItems.length - 1];
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
    const item = {
      id: product.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: product.name || "Neues Produkt",
      price: Number(product.price) || 0,
      icon: product.icon || "📦",
      description: product.description || "",
      compareAtPrice: product.compareAtPrice != null ? Number(product.compareAtPrice) || 0 : null
    };
    state.products.push(item);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return item;
  }

  function updateProduct(id, patch, recordHistory = true) {
    const product = state.products.find(item => item && item.id === id);
    if (!product) return null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    Object.assign(product, clone(patch || {}));
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

  window.WebBuilderCart = {
    getItems,
    getProducts,
    getConfig,
    getCount,
    getSubtotal,
    addItem,
    updateQty,
    changeQty,
    updatePrice,
    removeItem,
    clear,
    addProduct,
    updateProduct,
    removeProduct,
    setConfig
  };
})();
