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

// ------------------------------------------------------------------
// Gemeinsame Utility: normalisiert eine Liste von Objekten IN PLACE statt
// sie komplett neu zu erzeugen. Bereits bestehende, valide Einträge (mit
// id) behalten ihre Objektreferenz (Object.assign schreibt die
// normalisierten Werte zurück in dasselbe Objekt); nur neue/ungültige
// Einträge (kein Objekt oder ohne id) werden über normalizeFn frisch
// erzeugt. Wichtig für Module, die zwischenzeitlich eine Referenz auf ein
// Listenelement halten (z.B. während eines aktiven Drags oder einer
// laufenden Eingabe) — ein kompletter Array-Ersatz würde diese Referenz
// "aushängen" und nachfolgende Änderungen gingen beim nächsten Rendern
// wieder verloren.
// Genutzt von cart.js, products.js, header-footer.js.
//
// NEU: escapeHtml() zentralisiert dieselbe HTML-Escape-Logik, die zuvor
// unabhängig als "esc"/"escapeHtml" in canvas.js, export.js, inspector.js,
// header-footer.js, cart.js, products.js und supabase.js definiert war
// (7-fache Duplikation, siehe Projekt-Review). Alle genannten Module
// referenzieren jetzt ausschließlich diese eine Implementierung.
window.WebBuilderUtils = window.WebBuilderUtils || {
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
  // font-family) for button/headline/paragraph elements — was duplicated
  // per element type in both canvas.js (editor rendering) and export.js
  // (static HTML export), 6 nearly identical spots total. normalWeight
  // covers the differing non-bold default per element type (buttons use
  // "600", headlines "400", plain text/paragraphs "normal").
  buildTextStyleCss(item = {}, normalWeight = "normal") {
    return `font-weight:${item.bold ? "bold" : normalWeight};font-style:${item.italic ? "italic" : "normal"};text-decoration:${item.underline ? "underline" : "none"};font-family:${item.fontFamily || "inherit"};`;
  }
};
