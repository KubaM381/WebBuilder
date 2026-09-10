// WebBuilder canvas renderer service
// Rendering is intentionally kept behind a small API so the legacy renderer
// can be migrated here without changing the public canvas contract.
(() => {
  const state = window.WebBuilderState;

  function getCanvas() {
    return document.getElementById("canvas");
  }

  function clearCanvas() {
    const canvas = getCanvas();
    if (canvas) canvas.innerHTML = "";
    return canvas;
  }

  function setBackground(background = state && state.background) {
    const canvas = getCanvas();
    if (!canvas || !background) return false;

    if (background.type === "gradient") {
      canvas.style.background = `linear-gradient(${background.gradDir || "to right"}, ${background.grad1 || "#4f46e5"}, ${background.grad2 || "#06b6d4"})`;
    } else if (background.type === "image" && background.imageUrl) {
      canvas.style.backgroundImage = `url("${background.imageUrl}")`;
      canvas.style.backgroundSize = "cover";
      canvas.style.backgroundPosition = "center";
    } else {
      canvas.style.background = background.color || "#ffffff";
      canvas.style.backgroundImage = "none";
    }
    return true;
  }

  // The actual element renderer will be moved here from builder-legacy.js.
  // Keeping this explicit avoids creating a second rendering implementation.
  function renderCanvas() {
    return false;
  }

  window.WebBuilderCanvasRenderer = {
    getCanvas,
    clearCanvas,
    setBackground,
    renderCanvas
  };
})();
