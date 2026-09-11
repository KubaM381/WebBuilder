// WebBuilder shared state registry
// Canonical source of truth for the modular migration.
// Legacy locals may remain only until their domain is fully switched.

window.WebBuilderState = window.WebBuilderState || {
  elements: [],
  selectedElementId: null,
  isPreviewMode: false,
  draggedType: null,
  draggedIcon: null,
  draggedShape: null,
  zoomLevel: 0.85,
  canvasHeight: 1100,
  // NEU: geteiltes Laufzeit-Flag für die Klick/Drag-Vereinheitlichung
  // (siehe canvas.js attachInteraction()). Wird true, sobald sich ein
  // beliebiges Element (Canvas oder Header/Footer) tatsächlich in Bewegung
  // befindet, und verhindert, dass ein währenddessen angestoßenes
  // Re-Rendering den gerade gezogenen DOM-Knoten ersetzt und damit die
  // Bewegung/Pointer-Capture abbricht. Bewusst NICHT Teil des
  // Speicherstands (storage.js createSnapshot() übernimmt nur explizit
  // aufgeführte Felder) — reiner Laufzeitzustand, keine Projektdaten.
  dragLock: false,
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
WebBuilderState.STORAGE_KEY = WebBuilderState.storageKey;
WebBuilderState.HISTORY_LIMIT = WebBuilderState.historyLimit;
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
