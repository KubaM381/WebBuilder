// WebBuilder legacy bridge
//
// Transitional integration layer between the modular services and the
// remaining legacy editor. The legacy editor still owns its lexical state;
// this bridge deliberately does not pretend otherwise.

(() => {
  const state = window.WebBuilderState;
  const storage = window.WebBuilderStorage;
  const history = window.WebBuilderHistory;

  if (!state || !storage || !history) {
    console.error("WebBuilderLegacyBridge: shared service missing.");
    return;
  }

  let legacyAdapter = null;

  function getState() {
    return state;
  }

  function snapshot() {
    return storage.createSnapshot(state);
  }

  function save() {
    return storage.save();
  }

  function load() {
    return storage.loadIntoState();
  }

  // The legacy editor can register a small adapter once its local variables
  // are moved behind functions. This avoids exposing or duplicating its
  // internal variables as additional globals.
  function registerLegacyAdapter(adapter) {
    if (!adapter || typeof adapter !== "object") {
      legacyAdapter = null;
      return false;
    }

    const required = ["read", "write"];
    if (!required.every(name => typeof adapter[name] === "function")) {
      console.warn("WebBuilderLegacyBridge: adapter needs read() and write().");
      return false;
    }

    legacyAdapter = adapter;
    return true;
  }

  function hasLegacyAdapter() {
    return !!legacyAdapter;
  }

  function readLegacyState() {
    if (!legacyAdapter) return null;
    try {
      return legacyAdapter.read();
    } catch (error) {
      console.error("WebBuilderLegacyBridge: legacy read failed", error);
      return null;
    }
  }

  function writeLegacyState(nextState) {
    if (!legacyAdapter) return false;
    try {
      legacyAdapter.write(nextState);
      return true;
    } catch (error) {
      console.error("WebBuilderLegacyBridge: legacy write failed", error);
      return false;
    }
  }

  // One-way synchronization helpers for the staged migration. They are
  // intentionally opt-in so existing editor behaviour remains unchanged.
  function syncSharedFromLegacy() {
    const legacyState = readLegacyState();
    if (!legacyState) return false;
    return storage.applySnapshot(legacyState, state);
  }

  function syncLegacyFromShared() {
    return writeLegacyState(storage.createSnapshot(state));
  }

  window.WebBuilderLegacyBridge = {
    getState,
    snapshot,
    save,
    load,
    history,
    registerLegacyAdapter,
    hasLegacyAdapter,
    readLegacyState,
    writeLegacyState,
    syncSharedFromLegacy,
    syncLegacyFromShared
  };
})();
