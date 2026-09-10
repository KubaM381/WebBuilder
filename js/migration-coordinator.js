// WebBuilder migration coordinator
// Keeps the staged migration explicit and prevents multiple modules from
// becoming competing sources of truth while builder-legacy.js is still live.
(() => {
  const state = window.WebBuilderState;
  const bridge = window.WebBuilderLegacyBridge;

  if (!state || !bridge) {
    console.error("WebBuilderMigration: state/bridge missing.");
    return;
  }

  const domains = {};
  const STORAGE_KEY = state.STORAGE_KEY || state.storageKey || "webbuilder_pro_state";

  function register(name, adapter) {
    if (!name || !adapter || typeof adapter.read !== "function" || typeof adapter.write !== "function") {
      console.warn("WebBuilderMigration: invalid adapter", name);
      return false;
    }
    domains[name] = adapter;
    return true;
  }

  function get(name) {
    return domains[name] || null;
  }

  function status() {
    return Object.keys(domains).reduce((result, name) => {
      result[name] = {
        registered: true,
        connected: !!domains[name].connected,
        hydrated: !!domains[name].hydrated
      };
      return result;
    }, {});
  }

  function read(name) {
    const adapter = get(name);
    return adapter ? adapter.read() : null;
  }

  function write(name, value) {
    const adapter = get(name);
    return adapter ? adapter.write(value) : false;
  }

  function readPersistedProject() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn("WebBuilderMigration: persisted project could not be read.", error);
      return null;
    }
  }

  function hydrateSharedStateFromStorage() {
    const persisted = readPersistedProject();
    if (!persisted || typeof persisted !== "object") {
      return { ok: false, reason: "no-persisted-project" };
    }

    if (Array.isArray(persisted.cartItems)) {
      state.cartItems = persisted.cartItems;
      domains.cart.hydrated = true;
    }
    if (Array.isArray(persisted.products)) {
      state.products = persisted.products;
      domains.products.hydrated = true;
    }

    if (persisted.cartButtonLabel != null) state.cartButtonLabel = persisted.cartButtonLabel;
    if (persisted.cartConfig && typeof persisted.cartConfig === "object") {
      state.cartConfig = persisted.cartConfig;
    }
    if (persisted.appliedDiscountPercent != null) state.appliedDiscountPercent = persisted.appliedDiscountPercent;
    if (persisted.appliedDiscountLabel != null) state.appliedDiscountLabel = persisted.appliedDiscountLabel;

    return {
      ok: true,
      cartItems: state.cartItems.length,
      products: state.products.length
    };
  }

  function validateArrayDomain(name) {
    const adapter = get(name);
    if (!adapter) return { ok: false, reason: "domain-not-registered" };
    const value = adapter.read();
    return {
      ok: Array.isArray(value),
      count: Array.isArray(value) ? value.length : 0
    };
  }

  // Domain contracts. These remain separate from legacy lexical variables
  // until the corresponding legacy domain is patched safely.
  register("cart", {
    connected: false,
    hydrated: false,
    read: () => window.WebBuilderCart ? window.WebBuilderCart.getItems() : state.cartItems,
    write: value => {
      if (!Array.isArray(value)) return false;
      state.cartItems = value;
      return true;
    }
  });

  register("products", {
    connected: false,
    hydrated: false,
    read: () => window.WebBuilderCart ? window.WebBuilderCart.getProducts() : state.products,
    write: value => {
      if (!Array.isArray(value)) return false;
      state.products = value;
      return true;
    }
  });

  register("headerFooter", {
    connected: false,
    hydrated: false,
    read: () => window.WebBuilderHeaderFooter ? {
      header: window.WebBuilderHeaderFooter.getHeader(),
      footer: window.WebBuilderHeaderFooter.getFooter()
    } : null,
    write: value => {
      if (!value || !window.WebBuilderHeaderFooter) return false;
      window.WebBuilderHeaderFooter.updateHeader(value.header || {}, false);
      window.WebBuilderHeaderFooter.updateFooter(value.footer || {}, false);
      return true;
    }
  });

  // Import existing localStorage data into the shared state before the legacy
  // editor starts. This is deliberately one-way for now: legacy remains the
  // live source of truth, but the modular state no longer starts empty.
  const hydration = hydrateSharedStateFromStorage();

  window.WebBuilderMigration = {
    register,
    get,
    status,
    read,
    write,
    validateArrayDomain,
    hydrateSharedStateFromStorage,
    readPersistedProject,
    domains,
    hydration
  };
})();
