// WebBuilder storage module
// Transitional storage/history service.
// The editor core still owns its legacy local variables; this module is the
// shared service that future editor modules can consume without touching DOM.

(() => {
  const state = window.WebBuilderState;
  if (!state) {
    console.error("WebBuilderStorage: WebBuilderState is not available.");
    return;
  }

  const STORAGE_KEY = state.storageKey || "webbuilder_pro_state";
  const HISTORY_LIMIT = state.historyLimit || 30;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createSnapshot(source = state) {
    return clone({
      elements: source.elements || [],
      cartItems: source.cartItems || [],
      cartButtonLabel: source.cartButtonLabel || "Zur Kasse gehen",
      cartConfig: source.cartConfig || {},
      products: source.products || [],
      canvasHeight: source.canvasHeight || 1100,
      zoomLevel: source.zoomLevel || 0.85,
      appliedDiscountPercent: source.appliedDiscountPercent || 0,
      appliedDiscountLabel: source.appliedDiscountLabel || "",
      headerEnabled: !!source.headerEnabled,
      headerSticky: !!source.headerSticky,
      headerHeight: source.headerHeight || 64,
      headerBgColor: source.headerBgColor || "#111827",
      headerItems: source.headerItems || [],
      footerEnabled: !!source.footerEnabled,
      footerHeight: source.footerHeight || 70,
      footerBgColor: source.footerBgColor || "#111827",
      footerItems: source.footerItems || [],
      background: source.background || null
    });
  }

  function applySnapshot(snapshot, target = state) {
    if (!snapshot || typeof snapshot !== "object") return false;

    const restored = createSnapshot(Object.assign({}, target, snapshot));
    Object.assign(target, restored);
    return true;
  }

  function pushHistory(snapshot = createSnapshot()) {
    state.historyStack.push(clone(snapshot));
    if (state.historyStack.length > HISTORY_LIMIT) state.historyStack.shift();
    state.redoStack.length = 0;
    return snapshot;
  }

  function armHistory() {
    state.pendingSnapshot = createSnapshot();
    return state.pendingSnapshot;
  }

  function commitHistory() {
    if (!state.pendingSnapshot) return false;
    pushHistory(state.pendingSnapshot);
    state.pendingSnapshot = null;
    return true;
  }

  function clearHistory() {
    state.historyStack.length = 0;
    state.redoStack.length = 0;
    state.pendingSnapshot = null;
  }

  function save(extra = {}) {
    const snapshot = Object.assign(createSnapshot(), extra);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
      return true;
    } catch (error) {
      console.error("WebBuilderStorage: save failed", error);
      return false;
    }
  }

  function load() {
    let raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      console.error("WebBuilderStorage: load failed", error);
      return null;
    }

    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn("WebBuilderStorage: invalid saved state ignored", error);
      return null;
    }
  }

  function loadIntoState() {
    const snapshot = load();
    if (!snapshot) return false;
    return applySnapshot(snapshot);
  }

  function remove() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (error) {
      console.error("WebBuilderStorage: remove failed", error);
      return false;
    }
  }

  window.WebBuilderStorage = {
    STORAGE_KEY,
    HISTORY_LIMIT,
    clone,
    createSnapshot,
    applySnapshot,
    pushHistory,
    armHistory,
    commitHistory,
    clearHistory,
    save,
    load,
    loadIntoState,
    remove
  };
})();
