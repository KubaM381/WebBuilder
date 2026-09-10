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
    if (Array.isArray(patch.items)) state.headerItems = clone(patch.items);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return getHeader();
  }

  function updateFooter(patch = {}, recordHistory = true) {
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.arm();
    if (patch.enabled != null) state.footerEnabled = !!patch.enabled;
    if (patch.height != null) state.footerHeight = Math.max(40, Number(patch.height) || 70);
    if (patch.bgColor != null) state.footerBgColor = String(patch.bgColor);
    if (Array.isArray(patch.items)) state.footerItems = clone(patch.items);
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return getFooter();
  }

  function addItem(type, target = "header", patch = {}, recordHistory = true) {
    const items = target === "footer" ? state.footerItems : state.headerItems;
    const item = {
      id: `bar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: type === "icon" ? "icon" : "text",
      text: patch.text || (type === "icon" ? "" : "Neuer Text"),
      iconName: patch.iconName || null,
      x: Number(patch.x) || 20,
      y: Number(patch.y) || 18,
      color: patch.color || "#ffffff",
      size: Number(patch.size) || 16,
      bold: !!patch.bold,
      italic: !!patch.italic,
      underline: !!patch.underline,
      align: patch.align || "left",
      fontFamily: patch.fontFamily || "inherit",
      actionType: patch.actionType || "none",
      actionUrl: patch.actionUrl || "",
      actionMsg: patch.actionMsg || "",
      productId: patch.productId || null
    };
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
    if (recordHistory && window.WebBuilderHistory) window.WebBuilderHistory.commit();
    return item;
  }

  window.WebBuilderHeaderFooter = {
    getHeader,
    getFooter,
    updateHeader,
    updateFooter,
    addItem,
    removeItem,
    updateItem
  };
})();
