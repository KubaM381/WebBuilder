// WebBuilder storage module
// Shared project persistence, snapshots and history service.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderStorage: WebBuilderState is not available."); return; }
  const STORAGE_KEY = state.storageKey || "webbuilder_pro_state";
  const HISTORY_LIMIT = state.historyLimit || 30;
  const clone = value => JSON.parse(JSON.stringify(value));
  function normalizeRuntimeState() {
    const elements = window.WebBuilderElements, products = window.WebBuilderProducts, cart = window.WebBuilderCart, headerFooter = window.WebBuilderHeaderFooter, canvas = window.WebBuilderCanvas;
    if (elements?.normalizeState) elements.normalizeState(); if (products?.normalizeState) products.normalizeState(); if (cart?.normalizeState) cart.normalizeState(); if (headerFooter?.normalizeState) headerFooter.normalizeState(); if (canvas?.normalizeState) canvas.normalizeState(); return state;
  }
  function createSnapshot(source = state) { return clone({ elements: source.elements || [], cartItems: source.cartItems || [], cartButtonLabel: source.cartButtonLabel || "Zur Kasse gehen", cartConfig: source.cartConfig || {}, products: source.products || [], canvasHeight: source.canvasHeight || 1100, zoomLevel: source.zoomLevel || 0.85, appliedDiscountPercent: source.appliedDiscountPercent || 0, appliedDiscountLabel: source.appliedDiscountLabel || "", headerEnabled: !!source.headerEnabled, headerSticky: !!source.headerSticky, headerHeight: source.headerHeight || 64, headerBgType: source.headerBgType || "solid", headerBgColor: source.headerBgColor || "#111827", headerBgImage: source.headerBgImage || "", headerItems: source.headerItems || [], footerEnabled: !!source.footerEnabled, footerHeight: source.footerHeight || 70, footerBgType: source.footerBgType || "solid", footerBgColor: source.footerBgColor || "#111827", footerBgImage: source.footerBgImage || "", footerItems: source.footerItems || [], background: source.background || null }); }
  function applySnapshot(snapshot, target = state) { if (!snapshot || typeof snapshot !== "object") return false; Object.assign(target, createSnapshot(Object.assign({}, target, snapshot))); if (target === state) normalizeRuntimeState(); return true; }
  function pushHistory(snapshot = createSnapshot()) { state.historyStack.push(clone(snapshot)); if (state.historyStack.length > HISTORY_LIMIT) state.historyStack.shift(); state.redoStack.length = 0; return snapshot; }
  function armHistory() { normalizeRuntimeState(); state.pendingSnapshot = createSnapshot(); return state.pendingSnapshot; }
  function commitHistory() { if (!state.pendingSnapshot) return false; pushHistory(state.pendingSnapshot); state.pendingSnapshot = null; return true; }
  function clearHistory() { state.historyStack.length = 0; state.redoStack.length = 0; state.pendingSnapshot = null; }
  function save(extra = {}) { normalizeRuntimeState(); try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.assign(createSnapshot(), extra))); return true; } catch (error) { console.error("WebBuilderStorage: save failed", error); return false; } }
  function load() { try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch (error) { console.error("WebBuilderStorage: load failed", error); return null; } }
  function loadIntoState() { const snapshot = load(); return snapshot ? applySnapshot(snapshot) : false; }
  function remove() { try { localStorage.removeItem(STORAGE_KEY); return true; } catch (error) { console.error("WebBuilderStorage: remove failed", error); return false; } }
  window.WebBuilderStorage = { STORAGE_KEY, HISTORY_LIMIT, clone, normalizeRuntimeState, createSnapshot, applySnapshot, pushHistory, armHistory, commitHistory, clearHistory, save, load, loadIntoState, remove };
  window.WebBuilderHistory = { snapshot: createSnapshot, push: pushHistory, arm: armHistory, commit: commitHistory, undoSnapshot() { if (!state.historyStack.length) return null; state.redoStack.push(createSnapshot()); return state.historyStack.pop(); }, redoSnapshot() { if (!state.redoStack.length) return null; state.historyStack.push(createSnapshot()); return state.redoStack.pop(); }, clear: clearHistory };
})();
