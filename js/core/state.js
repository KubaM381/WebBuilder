// js/core/state.js
// WebBuilder shared state registry — canonical source of truth for the
// modular architecture.

window.WebBuilderState = window.WebBuilderState || {
  // Snapshot schema version. Missing/1 = pre-Section snapshots (freeform
  // elements only); 2 = adds `sections` below. Old snapshots load
  // unchanged — storage.js's createSnapshot() defaults sections to [].
  schemaVersion: 2,
  elements: [],
  selectedElementId: null,
  // Phase 2 flow-layout tree (Section -> Row -> Card), fully independent
  // of the freeform `elements` above — see canvas/sections-data.js.
  sections: [],
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
    // Individual item look ("Produkte" component, selectable via the
    // cart editor stage — see cart-editor-panel.js "component:items").
    // Applies to every single .cart-item row; the surrounding items box
    // itself is positioned like any other component via componentLayout.
    itemShape: "rounded",
    itemBackgroundColor: "",
    itemWidth: null,
    itemMinHeight: null,
    cardBackgroundColor: "",
    removeButtonColor: "#ef4444",
    buttonColor: "#4f46e5",
    buttonShape: "rounded",
    discountEnabled: false,
    discountButtonColor: "#4f46e5",
    discountButtonShape: "rounded",
    recommendEnabled: false,
    recommendations: [],
    progressEnabled: false,
    progressBarColor: "#10b981",
    milestones: [],
    componentLayout: {},
    itemDisplay: {
      removeStyle: "x",
      removeShape: "circle",
      quantityStyle: "stepper",
      priceStyle: "simple",
      showDescription: false,
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
  // project setting (see core/storage.js createSnapshot()). Default is
  // "true" (always shown) for brand-new projects — this only affects
  // projects that have never set the field before; a saved project that
  // explicitly disabled the preview keeps that choice on reload (see
  // js/shop/cart-preview-bars.js normalizeState(), which coerces via
  // `!!` rather than re-defaulting).
  cartPreviewHeaderEnabled: true,
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
  cartPreviewFooterEnabled: true,
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
  // js/shop/cart-editor-stage.js / cart-editor-panel.js). Either a
  // sub-part key ("icon"/"qty"/"price"/"remove"/"description"), a
  // component key prefixed with "component:" ("component:title"/
  // "component:items"/"component:progress"/"component:discount"/
  // "component:recommend"/"component:checkout"/"component:totals"/
  // "component:background"/"component:divider:<id>"), or
  // "previewHeader"/"previewFooter" for the cart editor's own preview
  // bars.
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
