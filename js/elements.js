// WebBuilder elements service
// Shared element state, CRUD operations and icon registry.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderElements: WebBuilderState is not available."); return; }
  const clone = value => JSON.parse(JSON.stringify(value));
  // FIX: state.notify(domain, action, payload) expects positional args.
  // This previously called state.notify({domain:"elements", type}) — a single
  // object — which made state.notify's own `domain` parameter become that
  // object instead of the string "elements". Every subscriber that checked
  // e.g. `["elements","selection"].includes(event.domain)` therefore never
  // matched, so selection/update events silently never reached listeners
  // (including the right-hand inspector's own refresh logic).
  function notify(type = "update") { state.notify?.("elements", type); }
  function createId(prefix = "el") { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
  function getAll() { return state.elements; } function getById(id) { return state.elements.find(element => element && element.id === id) || null; }
  function create(type, iconName = null, x = 50, y = 50, shapeType = null) { return { id: createId("elem"), type, iconName, x, y, text: type === "button" ? "Klick mich" : (type === "headline" ? "Neue Überschrift" : "Beispieltext..."), color: type === "shape" ? "#4f46e5" : "#1f2937", size: type === "icon" ? 36 : (type === "headline" ? 32 : (type === "image" ? 200 : (type === "shape" ? 100 : 18))), imageUrl: type === "image" ? "https://picsum.photos/300/200" : "", actionType: "none", actionUrl: "", actionMsg: "", productId: null, shapeType: type === "shape" ? (shapeType || "rectangle") : null, shapeStyle: type === "shape" ? "solid" : null, bold: type === "headline", italic: false, underline: false, align: "left", fontFamily: "inherit", iconFrame: false, iconFrameColor: "#111827", modalTitle: "", modalBody: "", messagePosition: "bottom-right" }; }
  function add(element) { if (!element || typeof element !== "object") return null; const item = clone(element); if (!item.id) item.id = createId("elem"); state.elements.push(item); notify("add"); return item; }
  function addNew(type, iconName = null, x = 50, y = 50, shapeType = null) { return add(create(type, iconName, x, y, shapeType)); }
  function remove(id) { const index = state.elements.findIndex(element => element && element.id === id); if (index === -1) return false; state.elements.splice(index, 1); if (state.selectedElementId === id) state.selectedElementId = null; notify("remove"); return true; }
  function update(id, patch) { const element = getById(id); if (!element || !patch || typeof patch !== "object") return null; Object.assign(element, clone(patch)); notify("update"); return element; }
  function duplicate(id, offsetX = 24, offsetY = 24) { const original = getById(id); if (!original) return null; const copy = clone(original); copy.id = createId("elem"); copy.x = (Number(original.x) || 0) + offsetX; copy.y = (Number(original.y) || 0) + offsetY; return add(copy); }
  function replaceAll(items) { state.elements.length = 0; if (Array.isArray(items)) items.forEach(item => { if (item && typeof item === "object") state.elements.push(clone(item)); }); if (!getById(state.selectedElementId)) state.selectedElementId = null; notify("replace-all"); return state.elements; }
  function setSelected(id) { state.selectedElementId = id == null ? null : id; notify("selection"); return state.selectedElementId; }
  function getSelected() { return getById(state.selectedElementId); } function clear() { state.elements.length = 0; state.selectedElementId = null; notify("clear"); }
  function createLegacyProxy() { return new Proxy([], { get(_target, prop) { const current = state.elements; if (prop === "length") return current.length; if (prop === Symbol.iterator) return current[Symbol.iterator].bind(current); const value = current[prop]; return typeof value === "function" ? value.bind(current) : value; }, set(_target, prop, value) { if (prop === "length") { currentLengthSet(value); notify("proxy-set"); return true; } state.elements[prop] = value; notify("proxy-set"); return true; }, deleteProperty(_target, prop) { delete state.elements[prop]; notify("proxy-delete"); return true; }, ownKeys() { return Reflect.ownKeys(state.elements); }, getOwnPropertyDescriptor(_target, prop) { if (prop in state.elements) return { configurable: true, enumerable: true, writable: true, value: state.elements[prop] }; return undefined; } }); }
  function currentLengthSet(value) { state.elements.length = Number(value) || 0; }
  // FIX (Offene Punkte #4): web.html bietet in der Palette ein Icon
  // "⚙️ Einstellungen" mit data-icon="settings" an, aber diese Registry
  // definierte gar kein Icon namens "settings". Zieht man die Kachel auf
  // die Fläche, fand canvas.js kein passendes SVG und rendert das Element
  // stillschweigend als Textelement mit Platzhaltertext statt als Icon.
  // SVG wie im alten (vor-modularen) Builder übernommen.
  const icons = { cart: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1z"/></svg>', 'arrow-up': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>', 'arrow-down': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>', 'arrow-left': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>', 'arrow-right': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>', settings: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>' };
  const register = (name, markup) => { if (!name || !markup) return false; icons[name] = String(markup); return true; }; const getIcon = name => icons[name] || null; const getAllIcons = () => Object.assign({}, icons);
  window.WebBuilderElements = { clone, createId, getAll, getById, create, add, addNew, remove, update, duplicate, replaceAll, setSelected, getSelected, clear, createLegacyProxy };
  window.WebBuilderIconRegistry = { register, get: getIcon, getAll: getAllIcons };
})();
