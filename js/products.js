// WebBuilder products service
// Product-only data operations extracted from the cart domain.
// Keeps product normalization and CRUD independent from cart behaviour.

(() => {
  const state = window.WebBuilderState;
  if (!state) {
    console.error("WebBuilderProducts: shared state missing.");
    return;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalize(product = {}) {
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

  function normalizeState() {
    state.products = Array.isArray(state.products) ? state.products.map(normalize) : [];
    return state.products;
  }

  function getAll() {
    return state.products;
  }

  function getById(id) {
    return state.products.find(product => product && product.id === id) || null;
  }

  function add(product = {}, recordHistory = true) {
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    const item = normalize(product);
    state.products.push(item);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return item;
  }

  function update(id, patch = {}, recordHistory = true) {
    const product = getById(id);
    if (!product) return null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();

    Object.assign(product, clone(patch));
    const normalized = normalize(product);
    Object.keys(product).forEach(key => delete product[key]);
    Object.assign(product, normalized);

    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return product;
  }

  function remove(id, recordHistory = true) {
    const index = state.products.findIndex(product => product && product.id === id);
    if (index < 0) return false;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    state.products.splice(index, 1);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return true;
  }

  function replaceAll(products = [], recordHistory = false) {
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    state.products.length = 0;
    state.products.push(...(Array.isArray(products) ? products.map(normalize) : []));
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return state.products;
  }

  normalizeState();

  window.WebBuilderProducts = {
    normalize,
    normalizeState,
    getAll,
    getById,
    add,
    update,
    remove,
    replaceAll
  };
})();
