// WebBuilder migration coordinator
// Centralizes persisted project hydration for the modular architecture.
(() => {
  const state = window.WebBuilderState;
  const elementsService = window.WebBuilderElements;
  const cartService = window.WebBuilderCart;
  const productsService = window.WebBuilderProducts;
  const headerFooterService = window.WebBuilderHeaderFooter;
  const canvasService = window.WebBuilderCanvas;

  if (!state) {
    console.error("WebBuilderMigration: shared state missing.");
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
      result[name] = { registered: true, connected: !!domains[name].connected, hydrated: !!domains[name].hydrated };
      return result;
    }, {});
  }
  function read(name) { const adapter = get(name); return adapter ? adapter.read() : null; }
  function write(name, value) { const adapter = get(name); return adapter ? adapter.write(value) : false; }

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
      canvasService?.normalizeState?.();
      return { ok: false, reason: "no-persisted-project" };
    }

    if (Array.isArray(persisted.elements)) {
      elementsService?.replaceAll?.(persisted.elements);
      if (domains.elements) domains.elements.hydrated = true;
    }
    if (Array.isArray(persisted.cartItems)) {
      state.cartItems = persisted.cartItems;
      if (domains.cart) domains.cart.hydrated = true;
    }
    if (Array.isArray(persisted.products)) {
      productsService?.replaceAll?.(persisted.products);
      if (domains.products) domains.products.hydrated = true;
    }

    if (persisted.cartButtonLabel != null) state.cartButtonLabel = persisted.cartButtonLabel;
    if (persisted.cartConfig && typeof persisted.cartConfig === "object") state.cartConfig = persisted.cartConfig;
    if (persisted.appliedDiscountPercent != null) state.appliedDiscountPercent = persisted.appliedDiscountPercent;
    if (persisted.appliedDiscountLabel != null) state.appliedDiscountLabel = persisted.appliedDiscountLabel;

    if (persisted.headerEnabled != null) state.headerEnabled = !!persisted.headerEnabled;
    if (persisted.headerSticky != null) state.headerSticky = !!persisted.headerSticky;
    if (persisted.headerHeight != null) state.headerHeight = persisted.headerHeight;
    if (persisted.headerBgColor != null) state.headerBgColor = persisted.headerBgColor;
    if (Array.isArray(persisted.headerItems)) { state.headerItems = persisted.headerItems; if (domains.headerFooter) domains.headerFooter.hydrated = true; }

    if (persisted.footerEnabled != null) state.footerEnabled = !!persisted.footerEnabled;
    if (persisted.footerHeight != null) state.footerHeight = persisted.footerHeight;
    if (persisted.footerBgColor != null) state.footerBgColor = persisted.footerBgColor;
    if (Array.isArray(persisted.footerItems)) { state.footerItems = persisted.footerItems; if (domains.headerFooter) domains.headerFooter.hydrated = true; }

    if (persisted.zoomLevel != null) state.zoomLevel = persisted.zoomLevel;
    if (persisted.canvasHeight != null) state.canvasHeight = persisted.canvasHeight;
    if (persisted.background && typeof persisted.background === "object") state.background = persisted.background;

    cartService?.normalizeState?.();
    productsService?.normalizeState?.();
    headerFooterService?.normalizeState?.();
    canvasService?.normalizeState?.();
    if (domains.canvas) domains.canvas.hydrated = true;

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
    persisted.zoomLevel = state.zoomLevel;
    persisted.canvasHeight = state.canvasHeight;
    persisted.background = state.background;
    persistNormalizedProject(persisted);

    return {
      ok: true,
      elements: state.elements.length,
      cartItems: state.cartItems.length,
      products: state.products.length,
      headerItems: state.headerItems.length,
      footerItems: state.footerItems.length,
      zoomLevel: state.zoomLevel,
      canvasHeight: state.canvasHeight,
      normalizedCartProducts: !!cartService,
      normalizedProducts: !!productsService,
      normalizedHeaderFooter: !!headerFooterService,
      normalizedCanvas: !!canvasService
    };
  }

  function validateArrayDomain(name) {
    const adapter = get(name);
    if (!adapter) return { ok: false, reason: "domain-not-registered" };
    const value = adapter.read();
    return { ok: Array.isArray(value), count: Array.isArray(value) ? value.length : 0 };
  }

  register("elements", {
    connected: !!elementsService,
    hydrated: false,
    read: () => elementsService?.getAll?.() || state.elements,
    write: value => { if (!Array.isArray(value)) return false; elementsService?.replaceAll?.(value); return true; }
  });
  register("canvas", {
    connected: !!canvasService,
    hydrated: false,
    read: () => canvasService ? { zoomLevel: state.zoomLevel, canvasHeight: state.canvasHeight, background: state.background } : null,
    write: value => {
      if (!value || !canvasService) return false;
      if (value.zoomLevel != null) canvasService.setZoom(value.zoomLevel, state.isPreviewMode);
      if (value.canvasHeight != null) canvasService.setCanvasHeight(value.canvasHeight);
      if (value.background && typeof value.background === "object") state.background = value.background;
      return true;
    }
  });
  register("cart", {
    connected: !!cartService,
    hydrated: false,
    read: () => cartService?.getItems?.() || state.cartItems,
    write: value => { if (!Array.isArray(value) || !cartService) return false; cartService.clear(false); value.forEach(item => cartService.addItem(item, undefined, undefined, undefined, undefined, false)); cartService.normalizeState(); return true; }
  });
  register("products", {
    connected: !!productsService,
    hydrated: false,
    read: () => productsService?.getAll?.() || state.products,
    write: value => { if (!Array.isArray(value) || !productsService) return false; productsService.replaceAll(value); return true; }
  });
  register("headerFooter", {
    connected: !!headerFooterService,
    hydrated: false,
    read: () => headerFooterService ? { header: headerFooterService.getHeader(), footer: headerFooterService.getFooter() } : null,
    write: value => { if (!value || !headerFooterService) return false; headerFooterService.updateHeader(value.header || {}, false); headerFooterService.updateFooter(value.footer || {}, false); return true; }
  });

  const hydration = hydrateSharedStateFromStorage();
  window.WebBuilderMigration = { register, get, status, read, write, validateArrayDomain, hydrateSharedStateFromStorage, readPersistedProject, domains, hydration };
})();
