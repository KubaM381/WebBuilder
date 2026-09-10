// WebBuilder canvas interaction service
// Owns reusable drag interaction. Rendering stays separate from interaction logic.
(() => {
  const state = window.WebBuilderState;

  function toLocalCoords(containerEl, clientX, clientY) {
    if (window.WebBuilderCanvasViewport) {
      return window.WebBuilderCanvasViewport.toLocalCoords(containerEl, clientX, clientY);
    }
    return { x: 0, y: 0 };
  }

  function makeDraggable(domEl, item, containerEl, opts = {}) {
    if (!domEl || !item || !containerEl || !state) return;

    domEl.addEventListener("mousedown", event => {
      if (state.isPreviewMode) return;
      event.stopPropagation();

      const start = toLocalCoords(containerEl, event.clientX, event.clientY);
      const offsetX = start.x - (Number(item.x) || 0);
      const offsetY = start.y - (Number(item.y) || 0);
      const minX = opts.minX != null ? opts.minX : 0;
      const minY = opts.minY != null ? opts.minY : 0;
      const maxX = opts.maxX != null ? opts.maxX : Infinity;
      const maxY = opts.maxY != null ? opts.maxY : Infinity;

      if (window.WebBuilderHistory) window.WebBuilderHistory.arm();

      const onMove = moveEvent => {
        const point = toLocalCoords(containerEl, moveEvent.clientX, moveEvent.clientY);
        item.x = Math.min(maxX, Math.max(minX, point.x - offsetX));
        item.y = Math.min(maxY, Math.max(minY, point.y - offsetY));
        domEl.style.left = item.x + "px";
        domEl.style.top = item.y + "px";
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        if (window.WebBuilderHistory) window.WebBuilderHistory.commit();
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  window.WebBuilderCanvasInteraction = {
    toLocalCoords,
    makeDraggable
  };
})();
