// js/canvas/elements.js
// WebBuilder elements service
// Owns canvas-element data (CRUD) only: create/add/update/remove/
// duplicate, selection. The icon registry (used by icon elements,
// header/footer icons and custom user icons) lives in its own file,
// canvas/icon-registry.js — split out since element CRUD and icon lookup
// are two independent concerns that don't need to change together.
(() => {
  const state = window.WebBuilderState;
  if (!state) {
    console.error("WebBuilderElements: WebBuilderState is not available.");
    return;
  }

  const clone = value => JSON.parse(JSON.stringify(value));

  function createId(prefix = "el") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Wraps state.notify with the fixed "elements" domain name.
  function notify(type = "update") {
    state.notify?.("elements", type);
  }

  // Migrates legacy click-action field names (action, action_type, url,
  // message, product_id, ...) to actionType/actionUrl/actionMsg/productId.
  // No-op once the canonical fields are set, so safe to call repeatedly.
  function migrateActionFields(item) {
    if (!item || typeof item !== "object") return item;
    if (item.actionType == null) item.actionType = item.action || item.action_type || "none";
    if (!item.actionUrl) item.actionUrl = item.action_url || item.url || "";
    if (!item.actionMsg) item.actionMsg = item.actionMessage || item.message || "";
    if (item.productId == null) item.productId = item.product_id || item.product || null;
    delete item.action; delete item.action_type; delete item.action_url; delete item.url;
    delete item.actionMessage; delete item.message; delete item.product_id; delete item.product;
    return item;
  }

  function normalizeState() {
    state.elements.forEach(migrateActionFields);
    // hoverHighlight is a new field (per-icon hover-border toggle, see
    // editor/inspector.js). Not part of migrateActionFields since it isn't
    // an action field — defaults to true so existing projects keep their
    // current (always-visible) hover behavior unless explicitly disabled.
    state.elements.forEach(item => { if (item && item.hoverHighlight == null) item.hoverHighlight = true; });
    return state.elements;
  }

  function getAll() {
    return state.elements;
  }

  function getById(id) {
    return state.elements.find(element => element && element.id === id) || null;
  }

  function create(type, iconName = null, x = 50, y = 50, shapeType = null) {
    return {
      id: createId("elem"),
      type,
      iconName,
      x,
      y,
      text: type === "button" ? "Klick mich" : (type === "headline" ? "Neue Überschrift" : "Beispieltext..."),
      color: type === "shape" ? "#4f46e5" : "#1f2937",
      size: type === "icon" ? 36 : (type === "headline" ? 32 : (type === "image" ? 200 : (type === "shape" ? 100 : 18))),
      imageUrl: type === "image" ? "https://picsum.photos/300/200" : "",
      actionType: "none",
      actionUrl: "",
      actionMsg: "",
      productId: null,
      shapeType: type === "shape" ? (shapeType || "rectangle") : null,
      shapeStyle: type === "shape" ? "solid" : null,
      bold: type === "headline",
      italic: false,
      underline: false,
      align: "left",
      fontFamily: "inherit",
      iconFrame: false,
      iconFrameColor: "#111827",
      // Only exposed in the inspector for icon elements (see
      // editor/inspector.js renderSpecial()), but stored on every element
      // type for consistency with the storage snapshot format.
      hoverHighlight: true,
      modalTitle: "",
      modalBody: "",
      messagePosition: "bottom-right"
    };
  }

  function add(element) {
    if (!element || typeof element !== "object") return null;
    const item = clone(element);
    if (!item.id) item.id = createId("elem");
    state.elements.push(item);
    notify("add");
    return item;
  }

  function addNew(type, iconName = null, x = 50, y = 50, shapeType = null) {
    return add(create(type, iconName, x, y, shapeType));
  }

  function remove(id) {
    const index = state.elements.findIndex(element => element && element.id === id);
    if (index === -1) return false;
    state.elements.splice(index, 1);
    if (state.selectedElementId === id) state.selectedElementId = null;
    notify("remove");
    return true;
  }

  function update(id, patch) {
    const element = getById(id);
    if (!element || !patch || typeof patch !== "object") return null;
    Object.assign(element, clone(patch));
    notify("update");
    return element;
  }

  function duplicate(id, offsetX = 24, offsetY = 24) {
    const original = getById(id);
    if (!original) return null;
    const copy = clone(original);
    copy.id = createId("elem");
    copy.x = (Number(original.x) || 0) + offsetX;
    copy.y = (Number(original.y) || 0) + offsetY;
    return add(copy);
  }

  function replaceAll(items) {
    state.elements.length = 0;
    if (Array.isArray(items)) {
      items.forEach(item => {
        if (item && typeof item === "object") state.elements.push(clone(item));
      });
    }
    normalizeState();
    if (!getById(state.selectedElementId)) state.selectedElementId = null;
    notify("replace-all");
    return state.elements;
  }

  function setSelected(id) {
    state.selectedElementId = id == null ? null : id;
    notify("selection");
    return state.selectedElementId;
  }

  function getSelected() {
    return getById(state.selectedElementId);
  }

  function clear() {
    state.elements.length = 0;
    state.selectedElementId = null;
    notify("clear");
  }

  window.WebBuilderElements = {
    clone, createId, getAll, getById, create, add, addNew, remove, update,
    duplicate, replaceAll, setSelected, getSelected, clear, normalizeState
  };
})();
