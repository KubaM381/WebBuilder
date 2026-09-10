// WebBuilder legacy canvas takeover
//
// Transitional guard: the legacy editor may still mutate the canvas DOM,
// but the modular canvas renderer is the single visual source of truth.
// This file contains no second element state and can be removed together
// with builder-legacy.js once the legacy editor is deleted.
(() => {
  const state = window.WebBuilderState;
  const canvas = window.WebBuilderCanvas;
  const runtime = window.WebBuilderCanvasRuntime;

  if (!state || !canvas || !runtime) {
    console.error("WebBuilderLegacyCanvasTakeover: canvas services missing.");
    return;
  }

  let rendering = false;
  let queued = false;
  let observer = null;

  function isCanvasMutation(records) {
    return records.some(record => {
      if (record.type === "childList") return true;
      if (record.type === "attributes") {
        return record.attributeName === "style" || record.attributeName === "class";
      }
      return false;
    });
  }

  function render() {
    if (rendering) return;
    rendering = true;
    try {
      observer?.disconnect();
      runtime.render();
    } finally {
      const target = document.getElementById("canvas");
      if (target && observer) {
        observer.observe(target, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["style", "class"]
        });
      }
      rendering = false;
    }
  }

  function scheduleRender() {
    if (rendering || queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      render();
    });
  }

  function installObserver() {
    const target = document.getElementById("canvas");
    if (!target || typeof MutationObserver === "undefined") return;

    observer = new MutationObserver(records => {
      if (rendering) return;
      if (isCanvasMutation(records)) scheduleRender();
    });

    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class"]
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    installObserver();
  });

  window.WebBuilderLegacyCanvasTakeover = {
    render,
    installObserver,
    isActive: () => !!observer
  };
})();
