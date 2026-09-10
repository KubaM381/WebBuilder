// WebBuilder header/footer service
// Owns header/footer data operations during the staged migration.
// DOM rendering stays in builder-legacy.js until the renderer is switched.

(() => {
  const state = window.WebBuilderState;
  if (!state) {
    console.error("WebBuilderHeaderFooter: shared state missing.");
    return;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeItem(item = {}) {
    return {
      id: item.id || `bar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: item.type === "icon" ? "icon" : "text",
      text: item.text || "",
      iconName: item.iconName || null,
      x: Number(item.x) || 20,
      y: Number(item.y) || 18,
      color: item.color || "#ffffff",
      size: Number(item.size) || 16,
      bold: !!item.bold,
      italic: !!item.italic,
      underline: !!item.underline,
      align: item.align || "left",
      fontFamily: item.fontFamily || "inherit",
      actionType: item.actionType || "none",
      actionUrl: item.actionUrl || "",
      actionMsg: item.actionMsg || "",
      productId: item.productId || null
    };
  }

  function normalizeState() {
    state.headerEnabled = !!state.headerEnabled;
    state.headerSticky = !!state.headerSticky;
    state.headerHeight = Math.max(40, Number(state.headerHeight) || 64);
    state.headerBgColor = String(state.headerBgColor || "#111827");
    state.headerItems = Array.isArray(state.headerItems) ? state.headerItems.map(normalizeItem) : [];

    state.footerEnabled = !!state.footerEnabled;
    state.footerHeight = Math.max(40, Number(state.footerHeight) || 70);
    state.footerBgColor = String(state.footerBgColor || "#111827");
    state.footerItems = Array.isArray(state.footerItems) ? state.footerItems.map(normalizeItem) : [];
    return state;
  }

  function getHeader() {
    return {
      enabled: state.headerEnabled,
      sticky: state.headerSticky,
      height: state.headerHeight,
      bgColor: state.headerBgColor,
      items: state.headerItems
    };
  }

  function getFooter() {
    return {
      enabled: state.footerEnabled,
      height: state.footerHeight,
      bgColor: state.footerBgColor,
      items: state.footerItems
    };
  }

  function updateHeader(patch = {}, recordHistory = true) {
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    if (patch.enabled != null) state.headerEnabled = !!patch.enabled;
    if (patch.sticky != null) state.headerSticky = !!patch.sticky;
    if (patch.height != null) state.headerHeight = Math.max(40, Number(patch.height) || 64);
    if (patch.bgColor != null) state.headerBgColor = String(patch.bgColor);
    if (Array.isArray(patch.items)) state.headerItems = patch.items.map(normalizeItem);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return getHeader();
  }

  function updateFooter(patch = {}, recordHistory = true) {
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    if (patch.enabled != null) state.footerEnabled = !!patch.enabled;
    if (patch.height != null) state.footerHeight = Math.max(40, Number(patch.height) || 70);
    if (patch.bgColor != null) state.footerBgColor = String(patch.bgColor);
    if (Array.isArray(patch.items)) state.footerItems = patch.items.map(normalizeItem);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return getFooter();
  }

  function addItem(type, target = "header", patch = {}, recordHistory = true) {
    const items = target === "footer" ? state.footerItems : state.headerItems;
    const item = normalizeItem({
      ...patch,
      type,
      text: patch.text || (type === "icon" ? "" : "Neuer Text")
    });
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    items.push(item);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return item;
  }

  function removeItem(id, target = "header", recordHistory = true) {
    const items = target === "footer" ? state.footerItems : state.headerItems;
    const index = items.findIndex(item => item && item.id === id);
    if (index < 0) return false;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    items.splice(index, 1);
    if (state.selectedBarItemRef && state.selectedBarItemRef.id === id) state.selectedBarItemRef = null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return true;
  }

  function updateItem(id, patch, target = "header", recordHistory = true) {
    const items = target === "footer" ? state.footerItems : state.headerItems;
    const item = items.find(entry => entry && entry.id === id);
    if (!item) return null;
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    Object.assign(item, clone(patch || {}));
    Object.assign(item, normalizeItem(item));
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return item;
  }

  normalizeState();

  window.WebBuilderHeaderFooter = {
    normalizeState,
    normalizeItem,
    getHeader,
    getFooter,
    updateHeader,
    updateFooter,
    addItem,
    removeItem,
    updateItem
  };
})();
