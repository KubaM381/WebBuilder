// js/layout/header-footer-data.js
// WebBuilder header/footer data layer: state normalization, getters and
// mutators for the real page header/footer. No DOM access beyond
// emitChange()'s CustomEvent dispatch (same pattern as core/state.js's
// notify()). Rendering of the bars lives in
// layout/header-footer-render.js, the right-hand inspector panel + left
// sidebar list in layout/header-footer-inspector.js — both read this
// file's exports via window.WebBuilderHeaderFooter at top-level parse
// time, so this file must load first.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderHeaderFooter: shared state missing."); return; }
  const clone = v => JSON.parse(JSON.stringify(v));

  // Dispatches a CustomEvent instead of state.notify() — see
  // js/README.md "Event conventions" for why header/footer changes are
  // the one domain that doesn't go through the shared pub/sub. Exported
  // (not just used internally) so header-footer-render.js can call it
  // after a drag/resize interaction.
  function emitChange(target, detail) {
    try { window.dispatchEvent(new CustomEvent("webbuilder:header-footer-change", { detail: { target, ...clone(detail || {}) } })); }
    catch (e) { console.warn("WebBuilderHeaderFooter: change event failed", e); }
  }

  function numOr(v, fallback) { const n = Number(v); return (v != null && v !== "" && Number.isFinite(n)) ? n : fallback; }

  // Legacy field migration — same pattern as canvas/elements.js
  // migrateActionFields(). hoverHighlight is not a legacy field (new),
  // but defaults the same way: if a saved project doesn't have it yet, it
  // defaults to true (unchanged visual behavior for existing projects).
  function normalizeItem(item = {}) {
    return {
      id: item.id || `bar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: item.type === "icon" ? "icon" : "text",
      text: item.text || "",
      iconName: item.iconName || null,
      x: numOr(item.x, 20),
      y: numOr(item.y, 18),
      color: item.color || "#ffffff",
      size: Number(item.size) || 16,
      bold: !!item.bold,
      italic: !!item.italic,
      underline: !!item.underline,
      align: item.align || "left",
      fontFamily: item.fontFamily || "inherit",
      hoverHighlight: item.hoverHighlight != null ? !!item.hoverHighlight : true,
      actionType: item.actionType || item.action || item.action_type || "none",
      actionUrl: item.actionUrl || item.action_url || item.url || "",
      actionMsg: item.actionMsg || item.actionMessage || item.message || "",
      productId: item.productId || item.product_id || item.product || null,
      modalTitle: item.modalTitle || "",
      modalBody: item.modalBody || "",
      modalFooter: item.modalFooter || "",
      messagePosition: item.messagePosition || "bottom-right"
    };
  }

  // In-place normalize keeps refs stable during an active drag (see
  // core/utils.js normalizeInPlace).
  function normalizeItemsInPlace(list) {
    return window.WebBuilderUtils.normalizeInPlace(list, normalizeItem);
  }

  // Keeps bar items inside the visible bar area whenever its height
  // shrinks — via the height input, the drag-resize handle (see
  // header-footer-render.js), or a loaded project whose stored height is
  // smaller than an item's y. -10 matches the safety margin used by
  // header-footer-render.js's bindBarItemInteraction() bounds. Exported
  // so the render file's live drag-resize preview can reuse it instead
  // of duplicating the same clamp math.
  function clampItemsToHeight(items, height) {
    const maxY = Math.max(0, (Number(height) || 0) - 10);
    (items || []).forEach(item => { if (item) item.y = Math.min(maxY, Math.max(0, Number(item.y) || 0)); });
    return items;
  }

  function normalizeState() {
    state.headerEnabled = !!state.headerEnabled;
    state.headerSticky = !!state.headerSticky;
    state.headerHeight = Math.max(40, Number(state.headerHeight) || 64);
    state.headerBgType = state.headerBgType === "image" ? "image" : "solid";
    state.headerBgColor = String(state.headerBgColor || "#111827");
    state.headerBgImage = String(state.headerBgImage || "");
    state.headerItems = normalizeItemsInPlace(state.headerItems);
    clampItemsToHeight(state.headerItems, state.headerHeight);
    state.footerEnabled = !!state.footerEnabled;
    state.footerHeight = Math.max(40, Number(state.footerHeight) || 70);
    state.footerBgType = state.footerBgType === "image" ? "image" : "solid";
    state.footerBgColor = String(state.footerBgColor || "#111827");
    state.footerBgImage = String(state.footerBgImage || "");
    state.footerItems = normalizeItemsInPlace(state.footerItems);
    clampItemsToHeight(state.footerItems, state.footerHeight);
    return state;
  }

  const getHeader = () => ({ enabled: state.headerEnabled, sticky: state.headerSticky, height: state.headerHeight, bgType: state.headerBgType, bgColor: state.headerBgColor, bgImage: state.headerBgImage, items: state.headerItems });
  const getFooter = () => ({ enabled: state.footerEnabled, height: state.footerHeight, bgType: state.footerBgType, bgColor: state.footerBgColor, bgImage: state.footerBgImage, items: state.footerItems });

  function updateHeader(p = {}, h = true) {
    if (h) window.WebBuilderHistory?.arm();
    if (p.enabled != null) state.headerEnabled = !!p.enabled;
    if (p.sticky != null) state.headerSticky = !!p.sticky;
    if (p.height != null) { state.headerHeight = Math.max(40, Number(p.height) || 64); clampItemsToHeight(state.headerItems, state.headerHeight); }
    if (p.bgType != null) state.headerBgType = p.bgType === "image" ? "image" : "solid";
    if (p.bgColor != null) state.headerBgColor = String(p.bgColor);
    if (p.bgImage != null) state.headerBgImage = String(p.bgImage);
    if (Array.isArray(p.items)) state.headerItems = p.items.map(normalizeItem);
    if (h) window.WebBuilderHistory?.commit();
    const r = getHeader();
    emitChange("header", r);
    return r;
  }

  function updateFooter(p = {}, h = true) {
    if (h) window.WebBuilderHistory?.arm();
    if (p.enabled != null) state.footerEnabled = !!p.enabled;
    if (p.height != null) { state.footerHeight = Math.max(40, Number(p.height) || 70); clampItemsToHeight(state.footerItems, state.footerHeight); }
    if (p.bgType != null) state.footerBgType = p.bgType === "image" ? "image" : "solid";
    if (p.bgColor != null) state.footerBgColor = String(p.bgColor);
    if (p.bgImage != null) state.footerBgImage = String(p.bgImage);
    if (Array.isArray(p.items)) state.footerItems = p.items.map(normalizeItem);
    if (h) window.WebBuilderHistory?.commit();
    const r = getFooter();
    emitChange("footer", r);
    return r;
  }

  function addItem(type, target = "header", patch = {}, h = true) {
    const items = target === "footer" ? state.footerItems : state.headerItems;
    const item = normalizeItem({ ...patch, type, text: patch.text || (type === "icon" ? "" : "Neuer Text") });
    if (h) window.WebBuilderHistory?.arm();
    items.push(item);
    if (h) window.WebBuilderHistory?.commit();
    emitChange(target, target === "footer" ? getFooter() : getHeader());
    return item;
  }

  function removeItem(id, target = "header", h = true) {
    const items = target === "footer" ? state.footerItems : state.headerItems;
    const i = items.findIndex(x => x?.id === id);
    if (i < 0) return false;
    if (h) window.WebBuilderHistory?.arm();
    items.splice(i, 1);
    if (state.selectedBarItemRef?.id === id) state.selectedBarItemRef = null;
    if (h) window.WebBuilderHistory?.commit();
    emitChange(target, target === "footer" ? getFooter() : getHeader());
    return true;
  }

  // Merge patch into item before normalizing, not after (order matters).
  function updateItem(id, patch, target = "header", h = true) {
    const items = target === "footer" ? state.footerItems : state.headerItems;
    const item = items.find(x => x?.id === id);
    if (!item) return null;
    if (h) window.WebBuilderHistory?.arm();
    const merged = normalizeItem(Object.assign({}, item, clone(patch || {})));
    Object.assign(item, merged);
    if (h) window.WebBuilderHistory?.commit();
    emitChange(target, target === "footer" ? getFooter() : getHeader());
    return item;
  }

  normalizeState();

  window.WebBuilderHeaderFooter = {
    normalizeState, normalizeItem, getHeader, getFooter, updateHeader, updateFooter,
    addItem, removeItem, updateItem, emitChange, clampItemsToHeight,
    onChange(cb) {
      if (typeof cb !== "function") return () => {};
      const h = e => cb(e.detail);
      window.addEventListener("webbuilder:header-footer-change", h);
      return () => window.removeEventListener("webbuilder:header-footer-change", h);
    }
  };
})();
