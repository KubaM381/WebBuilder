// js/core/state.js
// WebBuilder shared state registry.
// Canonical source of truth for the modular architecture.

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
  // being dragged (see canvas/alignment.js attachInteraction()), so a
  // re-render mid-drag doesn't replace the dragged DOM node. Not
  // persisted — pure runtime state, not project data.
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
    // Discount-code button style — independent from the checkout button
    // style above.
    discountButtonColor: "#4f46e5",
    discountButtonShape: "rounded",
    recommendEnabled: false,
    recommendations: [],
    progressEnabled: false,
    // Fill color of the progress bar track (cart editor: component:progress).
    progressBarColor: "#10b981",
    milestones: [],
    // Cart editor: free-form pixel offset per top-level cart block, keyed
    // by "progress" | "discount" | "recommend" | "checkout" | "totals".
    // Same mechanism as itemDisplay.layout below, one level up.
    componentLayout: {},
    itemDisplay: {
      removeStyle: "x",
      removeShape: "circle",
      quantityStyle: "stepper",
      priceStyle: "simple",
      showDescription: false,
      // Free-form pixel offset per cart-item sub-part, keyed by "icon" |
      // "qty" | "price" | "remove" | "description". Set via the cart
      // focus editor (js/shop/cart-editor.js). Applied everywhere the
      // item is rendered (drawer + focus stage), not just in the editor.
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
  // Cart editor preview header/footer (js/shop/cart-preview-bars.js) —
  // deliberately separate from headerItems/footerItems/headerEnabled/
  // footerEnabled above: the cart focus editor no longer shows or lets
  // you edit the REAL site header/footer. Persisted like any other
  // project setting (see core/storage.js createSnapshot()).
  cartPreviewHeaderEnabled: false,
  cartPreviewHeaderHeight: 64,
  cartPreviewHeaderColor: "#111827",
  cartPreviewHeaderLabel: "Header",
  // Advanced preview-bar styling, edited in the cart focus editor's
  // right-hand panel (#cart-comp-previewbar-fields, see
  // js/shop/cart-editor.js) — NOT duplicated into the sidebar. bgType
  // "solid" uses cartPreviewHeaderColor as a plain background color;
  // "image" additionally shows cartPreviewHeaderBgImage (cover/centered),
  // with the color kept as a fallback while the image loads. icon/
  // iconImage are mutually exclusive — picking one clears the other (see
  // js/shop/cart-preview-bars.js updateHeader()).
  cartPreviewHeaderBgType: "solid",
  cartPreviewHeaderBgImage: "",
  cartPreviewHeaderTextColor: "#ffffff",
  cartPreviewHeaderFontFamily: "inherit",
  cartPreviewHeaderBold: false,
  cartPreviewHeaderIcon: null,
  cartPreviewHeaderIconImage: "",
  cartPreviewFooterEnabled: false,
  cartPreviewFooterHeight: 70,
  cartPreviewFooterColor: "#111827",
  cartPreviewFooterLabel: "Footer",
  cartPreviewFooterBgType: "solid",
  cartPreviewFooterBgImage: "",
  cartPreviewFooterTextColor: "#ffffff",
  cartPreviewFooterFontFamily: "inherit",
  cartPreviewFooterBold: false,
  cartPreviewFooterIcon: null,
  cartPreviewFooterIconImage: "",
  // Cart focus editor mode — like isPreviewMode, this is pure runtime UI
  // state, not persisted (not part of storage.js's snapshot).
  cartFocusMode: false,
  // Which cart-item sub-part or top-level component is currently selected
  // for editing in the focus editor's right panel (see
  // js/shop/cart-editor.js). Either a sub-part key
  // ("icon"/"qty"/"price"/"remove"/"description"), a component key
  // prefixed with "component:" ("component:progress"/"component:discount"/
  // "component:recommend"/"component:checkout"/"component:totals"/
  // "component:background"/"component:itemRepresentation"/
  // "component:header"), or "previewHeader"/"previewFooter" for the cart
  // editor's own preview bars.
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
