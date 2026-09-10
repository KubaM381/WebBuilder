// WebBuilder shared state registry
// Transitional source of truth for the modular migration.
// builder-core.js still owns the live legacy variables until each subsystem is migrated.

window.WebBuilderState = window.WebBuilderState || {
  elements: [],
  selectedElementId: null,
  isPreviewMode: false,
  draggedType: null,
  draggedIcon: null,
  draggedShape: null,
  zoomLevel: 0.85,
  canvasHeight: 1100,
  products: [],
  cartItems: [],
  cartButtonLabel: "Zur Kasse gehen",
  cartConfig: {
    itemShape: "rounded",
    removeButtonColor: "#ef4444",
    buttonColor: "#4f46e5",
    buttonShape: "rounded",
    discountEnabled: false,
    recommendEnabled: false,
    recommendations: [],
    progressEnabled: false,
    milestones: [],
    itemDisplay: {
      removeStyle: "x",
      removeShape: "circle",
      quantityStyle: "stepper",
      priceStyle: "simple",
      showDescription: false
    }
  },
  appliedDiscountPercent: 0,
  appliedDiscountLabel: "",
  headerEnabled: false,
  headerSticky: false,
  headerHeight: 64,
  headerBgColor: "#111827",
  headerItems: [],
  footerEnabled: false,
  footerHeight: 70,
  footerBgColor: "#111827",
  footerItems: [],
  selectedBarItemRef: null,
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

window.WebBuilderState.STORAGE_KEY = window.WebBuilderState.storageKey;
window.WebBuilderState.HISTORY_LIMIT = window.WebBuilderState.historyLimit;
