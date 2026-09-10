// WebBuilder migration coordinator
// Keeps the staged migration explicit and prevents multiple modules from
// becoming competing sources of truth while builder-legacy.js is still live.
(() => {
  const state = window.WebBuilderState;
  const bridge = window.WebBuilderLegacyBridge;
  const elementsService = window.WebBuilderElements;
  const cartService = window.WebBuilderCart;
  const headerFooterService = window.WebBuilderHeaderFooter;

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

  function get(name) { return domains[name] || null; }

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

  function persistNormalizedProject(persisted) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
      return true;
    } catch (error) {
      console.warn("WebBuilderMigration: normalized project could not be saved.", error);
      return false;
    }
  }

  function hydrateSharedStateFromStorage() {
    const persisted = readPersistedProject();
    if (!persisted || typeof persisted !== "object") {
      return { ok: false, reason: "no-persisted-project" };
    }

    if (Array.isArray(persisted.elements)) {
      if (elementsService && typeof elementsService.replaceAll === "function") elementsService.replaceAll(persisted.elements);
      else state.elements = persisted.elements;
      domains.elements.hydrated = true;
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
    if (persisted.cartConfig && typeof persisted.cartConfig === "object") state.cartConfig = persisted.cartConfig;
    if (persisted.appliedDiscountPercent != null) state.appliedDiscountPercent = persisted.appliedDiscountPercent;
    if (persisted.appliedDiscountLabel != null) state.appliedDiscountLabel = persisted.appliedDiscountLabel;

    if (persisted.headerEnabled != null) state.headerEnabled = !!persisted.headerEnabled;
    if (persisted.headerSticky != null) state.headerSticky = !!persisted.headerSticky;
    if (persisted.headerHeight != null) state.headerHeight = persisted.headerHeight;
    if (persisted.headerBgColor != null) state.headerBgColor = persisted.headerBgColor;
    if (Array.isArray(persisted.headerItems)) {
      state.headerItems = persisted.headerItems;
      domains.headerFooter.hydrated = true;
    }

    if (persisted.footerEnabled != null) state.footerEnabled = !!persisted.footerEnabled;
    if (persisted.footerHeight != null) state.footerHeight = persisted.footerHeight;
    if (persisted.footerBgColor != null) state.footerBgColor = persisted.footerBgColor;
    if (Array.isArray(persisted.footerItems)) {
      state.footerItems = persisted.footerItems;
      domains.headerFooter.hydrated = true;
    }

    if (cartService && typeof cartService.normalizeState === "function") cartService.normalizeState();
    if (headerFooterService && typeof headerFooterService.normalizeState === "function") headerFooterService.normalizeState();

    persisted.elements = state.elements;
    persisted.cartItems = state.cartItems;
    persisted.products = state.products;
    persisted.headerEnabled = state.headerEnabled;
    persisted.headerSticky = state.headerSticky;
    persisted.headerHeight = state.headerHeight;
    persisted.headerBgColor = state.headerBgColor;
    persisted.headerItems = state.headerItems;
    persisted.footerEnabled = state.footerEnabled;
    persisted.footerHeight = state.footerHeight;
    persisted.footerBgColor = state.footerBgColor;
    persisted.footerItems = state.footerItems;
    persistNormalizedProject(persisted);

    return {
      ok: true,
      elements: state.elements.length,
      cartItems: state.cartItems.length,
      products: state.products.length,
      headerItems: state.headerItems.length,
      footerItems: state.footerItems.length,
      normalizedCartProducts: !!(cartService && typeof cartService.normalizeState === "function"),
      normalizedHeaderFooter: !!(headerFooterService && typeof headerFooterService.normalizeState === "function")
    };
  }

  function validateArrayDomain(name) {
    const adapter = get(name);
    if (!adapter) return { ok: false, reason: "domain-not-registered" };
    const value = adapter.read();
    return { ok: Array.isArray(value), count: Array.isArray(value) ? value.length : 0 };
  }

  register("elements", {
    connected: true,
    hydrated: false,
    read: () => elementsService ? elementsService.getAll() : state.elements,
    write: value => {
      if (!Array.isArray(value)) return false;
      if (elementsService && typeof elementsService.replaceAll === "function") elementsService.replaceAll(value);
      else state.elements = value;
      return true;
    }
  });

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
    connected: true,
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

  const hydration = hydrateSharedStateFromStorage();

  window.WebBuilderMigration = {
    register, get, status, read, write, validateArrayDomain,
    hydrateSharedStateFromStorage, readPersistedProject, domains, hydration
  };
})();