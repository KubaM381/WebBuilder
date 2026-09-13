// state.js
// WebBuilder shared state registry
// Canonical source of truth for the modular migration.

window.WebBuilderState = window.WebBuilderState || {
  elements: [],
  selectedElementId: null,
  isPreviewMode: false,
  draggedType: null,
  draggedIcon: null,
  draggedShape: null,
  zoomLevel: 0.85,
  canvasHeight: 1100,
  // Shared runtime flag set while any element (canvas or bar item) is
  // being dragged (see canvas.js attachInteraction()), so a re-render
  // mid-drag doesn't replace the dragged DOM node. Not persisted — pure
  // runtime state, not project data.
  dragLock: false,
  products: [],
  cartItems: [],
  cartButtonLabel: "Zur Kasse gehen",
  cartConfig: {
    itemShape: "rounded",
    // "Artikel-Darstellung" (cart editor): custom background/size for the
    // article box. Empty string / null = no override, use the shape
    // class's own default look (unchanged behavior for existing/new
    // projects until someone explicitly customizes this).
    itemBackgroundColor: "",
    itemWidth: null,
    itemMinHeight: null,
    // Background color of the cart card itself (real drawer AND the cart
    // editor's preview card) — same "empty = default" convention.
    cardBackgroundColor: "",
    removeButtonColor: "#ef4444",
    buttonColor: "#4f46e5",
    buttonShape: "rounded",
    discountEnabled: false,
    // Discount-code button style (task 7) — independent from the
    // checkout button style above.
    discountButtonColor: "#4f46e5",
    discountButtonShape: "rounded",
    recommendEnabled: false,
    recommendations: [],
    progressEnabled: false,
    milestones: [],
    // Cart editor: free-form pixel offset per top-level cart block, keyed
    // by "progress" | "discount" | "recommend" | "checkout". Same
    // mechanism as itemDisplay.layout below, one level up.
    componentLayout: {},
    itemDisplay: {
      removeStyle: "x",
      removeShape: "circle",
      quantityStyle: "stepper",
      priceStyle: "simple",
      showDescription: false,
      // Free-form pixel offset per cart-item sub-part (task 4), keyed by
      // "icon" | "qty" | "price" | "remove" | "description". Set via the
      // cart focus editor (js/cart.js). Applied everywhere the item is
      // rendered (drawer + focus stage), not just in the editor.
      layout: {}
    }
  },
  appliedDiscountPercent: 0,
  appliedDiscountLabel: "",
  headerEnabled: false,
  headerSticky: false,
  headerHeight: 64,
  headerBgType: "solid",
  headerBgColor: "#111827",
  headerBgImage: "",
  headerItems: [],
  footerEnabled: false,
  footerHeight: 70,
  footerBgType: "solid",
  footerBgColor: "#111827",
  footerBgImage: "",
  footerItems: [],
  selectedBarItemRef: null,
  // Cart focus editor mode (task 3) — like isPreviewMode, this is pure
  // runtime UI state, not persisted (not part of storage.js's snapshot).
  cartFocusMode: false,
  // Which cart-item sub-part or top-level component is currently selected
  // for editing in the focus editor's right panel (see js/cart.js). Also
  // runtime-only. Either a sub-part key ("icon"/"qty"/"price"/"remove"/
  // "description") or a component key prefixed with "component:"
  // ("component:progress"/"component:discount"/"component:recommend"/
  // "component:checkout"/"component:background"/
  // "component:itemRepresentation").
  cartFocusSelectedPart: null,
  background: {
    type: "solid",
    color: "#ffffff",
    grad1: "#4f46e5",
    grad2: "#06b6d4",
    gradDir: "to right",
    imageUrl: ""
  },
  storageKey: "webbuilder_pro_state",
  historyLimit: 30,
  historyStack: [],
  redoStack: [],
  pendingSnapshot: null
};

const WebBuilderState = window.WebBuilderState;
WebBuilderState._listeners = WebBuilderState._listeners || new Set();

WebBuilderState.subscribe = function subscribe(listener) {
  if (typeof listener !== "function") return () => {};
  this._listeners.add(listener);
  return () => this._listeners.delete(listener);
};

WebBuilderState.notify = function notify(domain, action, payload) {
  const event = { domain: domain || "state", action: action || "change", payload: payload || null, state: this };
  this._listeners.forEach(listener => {
    try { listener(event); } catch (error) { console.error("WebBuilderState listener failed", error); }
  });
  window.dispatchEvent(new CustomEvent("webbuilder:state-change", { detail: event }));
  return event;
};

// Shared, project-wide helpers.
window.WebBuilderUtils = window.WebBuilderUtils || {
  // Normalizes a list in place instead of rebuilding it, so existing
  // objects keep their reference (important while something else holds a
  // reference to a list item, e.g. during a drag or an active input).
  // Used by cart.js, products.js, header-footer.js.
  normalizeInPlace(list, normalizeFn) {
    if (!Array.isArray(list)) return [];
    return list.map(item => {
      if (item && typeof item === "object" && item.id) {
        Object.assign(item, normalizeFn(item));
        return item;
      }
      return normalizeFn(item);
    });
  },
  escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  },
  // Shared text-style CSS (font-weight/font-style/text-decoration/
  // font-family) for canvas.js and export.js. normalWeight covers the
  // differing non-bold default per element type (button "600", headline
  // "400", plain text "normal").
  buildTextStyleCss(item = {}, normalWeight = "normal") {
    return `font-weight:${item.bold ? "bold" : normalWeight};font-style:${item.italic ? "italic" : "normal"};text-decoration:${item.underline ? "underline" : "none"};font-family:${item.fontFamily || "inherit"};`;
  }
};
