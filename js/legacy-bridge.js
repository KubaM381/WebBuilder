// WebBuilder legacy bridge
//
// This module intentionally does not mutate the legacy editor's local variables.
// builder-core.js still owns those variables during the staged migration.
// The bridge provides one safe integration point for the next extraction steps.
//
// Future modules should use window.WebBuilderState / window.WebBuilderStorage
// / window.WebBuilderHistory through this bridge instead of introducing
// another global state container.

(() => {
  const state = window.WebBuilderState;
  const storage = window.WebBuilderStorage;
  const history = window.WebBuilderHistory;

  if (!state || !storage || !history) {
    console.error("WebBuilderLegacyBridge: shared service missing.");
    return;
  }

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

  window.WebBuilderLegacyBridge = {
    getState,
    snapshot,
    save,
    load,
    history
  };
})();
