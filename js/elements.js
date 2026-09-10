// WebBuilder elements service
// Transitional module for the staged extraction of element logic from the
// legacy editor. It is deliberately DOM-independent and does not replace
// builder-legacy.js yet.

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

  function add(element) {
    if (!element || typeof element !== "object") return null;
    const item = clone(element);
    if (!item.id) item.id = createId();
    state.elements.push(item);
    return item;
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
    add,
    remove,
    update,
    setSelected,
    getSelected,
    clear
  };
})();
