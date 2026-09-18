// js/editor/background.js
// WebBuilder background editor: solid/gradient/image background of the
// page, plus the sidebar controls for it (#bg-type, #bg-color-input,
// #bg-grad-*, #bg-image-*). Split out of canvas/canvas.js, which still
// owns setBackground()/computeBackgroundCss() (used by canvas rendering
// and export.js) — this file only owns the form binding. Must load after
// canvas/canvas.js: commit() calls window.WebBuilderCanvas.setBackground().
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderBackground: WebBuilderState is not available."); return; }

  let syncControls = null;

  function bind() {
    const typeSel = document.getElementById("bg-type");
    if (!typeSel || typeSel.dataset.webBuilderBgBound === "true") return;
    typeSel.dataset.webBuilderBgBound = "true";

    const solidGroup = document.getElementById("bg-solid-group");
    const gradientGroup = document.getElementById("bg-gradient-group");
    const imageGroup = document.getElementById("bg-image-group");
    const colorInput = document.getElementById("bg-color-input");
    const grad1Input = document.getElementById("bg-grad-1");
    const grad2Input = document.getElementById("bg-grad-2");
    const gradDirInput = document.getElementById("bg-grad-dir");
    const imageUrlInput = document.getElementById("bg-image-url");
    const imageFileInput = document.getElementById("bg-image-file");

    function applyGroupVisibility() {
      const type = state.background.type || "solid";
      solidGroup?.classList.toggle("hidden", type !== "solid");
      gradientGroup?.classList.toggle("hidden", type !== "gradient");
      imageGroup?.classList.toggle("hidden", type !== "image");
    }

    syncControls = function () {
      const bg = state.background || {};
      if (typeSel) typeSel.value = bg.type || "solid";
      if (colorInput) colorInput.value = bg.color || "#ffffff";
      if (grad1Input) grad1Input.value = bg.grad1 || "#4f46e5";
      if (grad2Input) grad2Input.value = bg.grad2 || "#06b6d4";
      if (gradDirInput) gradDirInput.value = bg.gradDir || "to right";
      if (imageUrlInput && document.activeElement !== imageUrlInput) imageUrlInput.value = bg.imageUrl || "";
      applyGroupVisibility();
    };

    function commit(patch) {
      window.WebBuilderHistory?.arm();
      Object.assign(state.background, patch);
      window.WebBuilderHistory?.commit();
      syncControls();
      window.WebBuilderCanvas?.setBackground?.(state.background);
      state.notify?.("background", "update", state.background);
    }

    typeSel.addEventListener("change", e => commit({ type: e.target.value }));
    colorInput?.addEventListener("input", () => commit({ color: colorInput.value }));
    grad1Input?.addEventListener("input", () => commit({ grad1: grad1Input.value }));
    grad2Input?.addEventListener("input", () => commit({ grad2: grad2Input.value }));
    gradDirInput?.addEventListener("change", () => commit({ gradDir: gradDirInput.value }));
    imageUrlInput?.addEventListener("change", () => commit({ imageUrl: imageUrlInput.value }));
    imageFileInput?.addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") commit({ imageUrl: reader.result, type: "image" });
      };
      reader.readAsDataURL(file);
    });

    syncControls();
  }

  function refresh() {
    syncControls?.();
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(bind, 0);
  });

  window.WebBuilderBackground = { bind, refresh };

  // Backward-compatible alias: existing call sites (builder.js's initial
  // render, Supabase/supabase-data.js after a cloud load, and possibly
  // others not currently in view) call
  // window.WebBuilderCanvas.refreshBackgroundEditor() — kept working here
  // instead of hunting down and rewriting every call site.
  if (window.WebBuilderCanvas) window.WebBuilderCanvas.refreshBackgroundEditor = refresh;
})();
