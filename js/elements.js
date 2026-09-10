// WebBuilder elements service
// Transitional module for the staged extraction of element logic from the
// legacy editor. This module owns element data operations; DOM rendering and
// inspector behaviour remain in builder-legacy.js until the next integration cut.

(() => {
  const state = window.WebBuilderState;
  if (!state) {
    console.error("WebBuilderElements: WebBuilderState is not available.");
    return;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createId(prefix = "el") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function getAll() {
    return state.elements;
  }

  function getById(id) {
    return state.elements.find(element => element && element.id === id) || null;
  }

  function create(type, iconName = null, x = 50, y = 50, shapeType = null) {
    const item = {
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
      modalTitle: "",
      modalBody: "",
      messagePosition: "bottom-right"
    };
    return item;
  }

  function add(element) {
    if (!element || typeof element !== "object") return null;
    const item = clone(element);
    if (!item.id) item.id = createId("elem");
    state.elements.push(item);
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
    return true;
  }

  function update(id, patch) {
    const element = getById(id);
    if (!element || !patch || typeof patch !== "object") return null;
    Object.assign(element, clone(patch));
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
    if (!getById(state.selectedElementId)) state.selectedElementId = null;
    return state.elements;
  }

  function setSelected(id) {
    state.selectedElementId = id == null ? null : id;
    return state.selectedElementId;
  }

  function getSelected() {
    return getById(state.selectedElementId);
  }

  function clear() {
    state.elements.length = 0;
    state.selectedElementId = null;
  }

  window.WebBuilderElements = {
    clone,
    createId,
    getAll,
    getById,
    create,
    add,
    addNew,
    remove,
    update,
    duplicate,
    replaceAll,
    setSelected,
    getSelected,
    clear
  };
})();
