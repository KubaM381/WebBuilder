// js/canvas/canvas.js
// WebBuilder canvas module
// Viewport, rendering of placed canvas elements, canvas controls
// (zoom/extend) and the "Eigene Icons"-palette UI. The background editor
// (solid/gradient/image form + bindings) lives in editor/background.js —
// it calls setBackground()/computeBackgroundCss() from this file at
// runtime, so this file must load first. Drag/click interaction and
// alignment-guide snapping live in canvas/alignment.js
// (window.WebBuilderAlignment) — shared with
// layout/header-footer-render.js for bar items, so neither file
// duplicates that logic. Must load after canvas/alignment.js and
// canvas/elements.js (see js/README.md "Load order").
//
// Phase 1 "Drag & Drop 2.0" (canvas/drop-indicator.js): bindPaletteDragAndDrop()
// additionally drives that module's container highlight + animated drop
// box while a NEW element is being dragged in from the sidebar palette
// (native HTML5 drag & drop — attachInteraction()/alignment.js is not
// involved here, since there is no existing element yet to attach a
// pointer-drag controller to). Every call is optional-chained, so this
// keeps working unchanged if drop-indicator.js isn't loaded.
(() => {
  const state = window.WebBuilderState;
  const elementsService = window.WebBuilderElements;

  if (!state || !elementsService) {
    console.error("WebBuilderCanvas: required shared services are missing.");
    return;
  }

  const ZOOM_MIN = 0.3;
  const ZOOM_MAX = 1.5;
  const CANVAS_MIN_HEIGHT = 400;
  const DEFAULT_ZOOM = 0.85;
  const DEFAULT_CANVAS_HEIGHT = 1100;
  let callbacks = { onAction: null };
  let renderQueued = false;
  let rendering = false;
  // Whether the drop indicator's container highlight/box is currently
  // "on" for an in-progress palette drag. Kept at module scope (not
  // local to bindPaletteDragAndDrop) because that function can run again
  // later (e.g. after new custom icons are added to the palette) and a
  // function-local variable would then split into two out-of-sync
  // closures — the canvas's dragover/dragleave/drop listeners are bound
  // only once (dataset guard) and must keep referencing the same flag
  // that later dragend listeners on newly added palette items also use.
  let paletteDragActive = false;

  const getCanvas = () => document.getElementById("canvas");
  const getCanvasColumn = () => document.getElementById("canvas-column");

  function normalizeState() {
    const zoom = Number(state.zoomLevel);
    const height = Number(state.canvasHeight);
    state.zoomLevel = Number.isFinite(zoom) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) : DEFAULT_ZOOM;
    state.canvasHeight = Number.isFinite(height) ? Math.max(CANVAS_MIN_HEIGHT, height) : DEFAULT_CANVAS_HEIGHT;
    return { zoomLevel: state.zoomLevel, canvasHeight: state.canvasHeight };
  }

  function applyZoom(isPreviewMode = state.isPreviewMode) {
    normalizeState();
    const column = getCanvasColumn();
    if (!column) return;
    column.style.transform = isPreviewMode ? "none" : `scale(${state.zoomLevel})`;
    if (!isPreviewMode) column.style.transformOrigin = "top center";
    const label = document.getElementById("zoom-level");
    if (label && !isPreviewMode) label.textContent = Math.round(state.zoomLevel * 100) + "%";
  }

  function setZoom(value, isPreviewMode = state.isPreviewMode) {
    const next = Number(value);
    state.zoomLevel = Number.isFinite(next) ? Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, next)) : DEFAULT_ZOOM;
    applyZoom(isPreviewMode);
    return state.zoomLevel;
  }

  function zoomIn(isPreviewMode = state.isPreviewMode) {
    return setZoom(Number((state.zoomLevel + 0.1).toFixed(2)), isPreviewMode);
  }

  function zoomOut(isPreviewMode = state.isPreviewMode) {
    return setZoom(Number((state.zoomLevel - 0.1).toFixed(2)), isPreviewMode);
  }

  function resetZoom(isPreviewMode = state.isPreviewMode) {
    return setZoom(1, isPreviewMode);
  }

  function setCanvasHeight(height) {
    const canvas = getCanvas();
    const next = Number(height);
    state.canvasHeight = Number.isFinite(next) ? Math.max(CANVAS_MIN_HEIGHT, next) : DEFAULT_CANVAS_HEIGHT;
    if (canvas) canvas.style.minHeight = state.canvasHeight + "px";
    return state.canvasHeight;
  }

  function extendCanvas(delta) {
    const amount = Number(delta);
    return setCanvasHeight(state.canvasHeight + (Number.isFinite(amount) ? amount : 0));
  }

  function syncDom() {
    normalizeState();
    setCanvasHeight(state.canvasHeight);
    applyZoom(state.isPreviewMode);
    return { zoomLevel: state.zoomLevel, canvasHeight: state.canvasHeight };
  }

  const escapeHtml = window.WebBuilderUtils.escapeHtml;
  // See core/utils.js WebBuilderUtils.buildTextStyleCss (shared with export.js).
  const buildTextStyleCss = window.WebBuilderUtils.buildTextStyleCss;

  // Icons come from the shared registry (canvas/icon-registry.js
  // WebBuilderIconRegistry.getMergedMap()) plus optional
  // window.WebBuilderIconMap overrides.
  function getIconMap() {
    return window.WebBuilderIconRegistry?.getMergedMap?.() || {};
  }

  function renderShapeInner(item) {
    const s = item.size || 100;
    const outline = item.shapeStyle === "outline";
    if (item.shapeType === "circle") {
      return `<div style="width:${s}px; height:${s}px; border-radius:50%; ${outline ? `background:transparent; border:3px solid ${item.color};` : `background:${item.color}; border:none;`}"></div>`;
    }
    if (item.shapeType === "triangle") {
      const half = s / 2;
      if (outline) return `<div style="position:relative; width:${s}px; height:${s}px;"><div style="position:absolute; inset:0; width:0; height:0; margin:auto; border-left:${half}px solid transparent; border-right:${half}px solid transparent; border-bottom:${s}px solid ${item.color};"></div><div style="position:absolute; top:3px; left:3px; width:0; height:0; border-left:${half - 3}px solid transparent; border-right:${half - 3}px solid transparent; border-bottom:${s - 6}px solid #ffffff;"></div></div>`;
      return `<div style="width:0; height:0; border-left:${half}px solid transparent; border-right:${half}px solid transparent; border-bottom:${s}px solid ${item.color};"></div>`;
    }
    const h = Math.round(s * 0.65);
    return `<div style="width:${s}px; height:${h}px; border-radius:6px; ${outline ? `background:transparent; border:3px solid ${item.color};` : `background:${item.color}; border:none;`}"></div>`;
  }

  function renderCanvas() {
    const canvas = getCanvas();
    if (!canvas) return false;
    const hint = document.getElementById("canvas-hint");
    canvas.querySelectorAll(".placed-element").forEach(el => el.remove());
    if (hint) hint.classList.toggle("hidden", state.elements.length > 0);
    const iconMap = getIconMap();
    state.elements.forEach(item => {
      const el = document.createElement("div");
      el.className = ["placed-element", item.id === state.selectedElementId ? "selected" : "", item.actionType !== "none" ? "has-action" : "", item.hoverHighlight === false ? "no-hover-highlight" : ""].filter(Boolean).join(" ");
      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      el.style.color = item.color;
      el.dataset.id = item.id;
      const align = item.align || "left";
      if (item.type === "icon" && iconMap[item.iconName]) {
        el.innerHTML = item.iconFrame ? `<span class="icon-frame-wrap" style="border-color:${item.iconFrameColor || "#111827"};">${iconMap[item.iconName]}</span>` : iconMap[item.iconName];
        const svg = el.querySelector("svg, img");
        if (svg) { svg.style.width = `${item.size}px`; svg.style.height = `${item.size}px`; }
      } else if (item.type === "button") {
        el.innerHTML = `<button class="btn btn-primary" style="font-size:${item.size}px; background-color:${item.color}; ${buildTextStyleCss(item, "600")}">${escapeHtml(item.text)}</button>`;
      } else if (item.type === "headline") {
        el.innerHTML = `<h2 style="font-size:${item.size}px; color:${item.color}; ${buildTextStyleCss(item, "400")} text-align:${align};">${escapeHtml(item.text)}</h2>`;
      } else if (item.type === "box") {
        el.innerHTML = `<div style="width:140px; height:90px; background:${item.color}; border-radius:8px; box-shadow: var(--shadow-md);"></div>`;
      } else if (item.type === "shape") {
        el.innerHTML = renderShapeInner(item);
      } else if (item.type === "image") {
        const src = item.imageUrl || "https://via.placeholder.com/200";
        el.innerHTML = `<img src="${escapeHtml(src)}" class="canvas-img" style="width:${item.size}px; height:auto;" alt="Bild Element" draggable="false" />`;
      } else {
        el.innerHTML = `<p style="font-size:${item.size}px; color:${item.color}; ${buildTextStyleCss(item)} text-align:${align};">${escapeHtml(item.text)}</p>`;
      }
      const badge = document.createElement("span");
      badge.className = "element-badge";
      badge.innerText = "⚡ Logik";
      el.appendChild(badge);

      // Single interaction path for click + drag — see canvas/alignment.js.
      window.WebBuilderAlignment?.attachInteraction(el, item, canvas, {
        onClick: () => {
          if (state.isPreviewMode) {
            callbacks.onAction?.(item, el);
          } else if (window.WebBuilderInspector?.select) {
            window.WebBuilderInspector.select(item.id);
          } else {
            elementsService.setSelected(item.id);
          }
        }
      });

      canvas.appendChild(el);
    });
    return true;
  }

  function computeBackgroundCss(background = state.background) {
    if (!background) return "background:#ffffff;";
    if (background.type === "gradient") {
      return `background-image:linear-gradient(${background.gradDir || "to right"}, ${background.grad1 || "#4f46e5"}, ${background.grad2 || "#06b6d4"});`;
    }
    if (background.type === "image" && background.imageUrl) {
      return `background:url("${background.imageUrl}") center/cover no-repeat;`;
    }
    return `background:${background.color || "#ffffff"};`;
  }

  function setBackground(background = state.background) {
    const canvas = getCanvas();
    if (!canvas || !background) return false;
    if (background.type === "gradient") {
      canvas.style.backgroundImage = "none";
      canvas.style.background = `linear-gradient(${background.gradDir || "to right"}, ${background.grad1 || "#4f46e5"}, ${background.grad2 || "#06b6d4"})`;
    } else if (background.type === "image" && background.imageUrl) {
      canvas.style.background = `url("${background.imageUrl}") center/cover no-repeat`;
    } else {
      canvas.style.background = background.color || "#ffffff";
      canvas.style.backgroundImage = "none";
    }
    return true;
  }

  function setRendererCallbacks(nextCallbacks = {}) {
    callbacks = Object.assign({}, callbacks, nextCallbacks);
  }

  function isEditorEventTarget(target, id) {
    return target && (target.id === id || target.closest?.(`#${id}`));
  }

  function handleCanvasControls(event) {
    if (state.isPreviewMode) return;
    if (isEditorEventTarget(event.target, "zoom-in")) { event.preventDefault(); event.stopImmediatePropagation(); zoomIn(false); return; }
    if (isEditorEventTarget(event.target, "zoom-out")) { event.preventDefault(); event.stopImmediatePropagation(); zoomOut(false); return; }
    if (isEditorEventTarget(event.target, "zoom-reset")) { event.preventDefault(); event.stopImmediatePropagation(); resetZoom(false); return; }
    if (isEditorEventTarget(event.target, "btn-extend-canvas") || isEditorEventTarget(event.target, "btn-extend-canvas-side")) { event.preventDefault(); event.stopImmediatePropagation(); extendCanvas(300); return; }
    if (isEditorEventTarget(event.target, "btn-shrink-canvas-side")) { event.preventDefault(); event.stopImmediatePropagation(); extendCanvas(-300); }
  }

  function handlePreviewAction(item) {
    const actions = window.WebBuilderActionRuntime;
    if (!state.isPreviewMode || !actions || !item) return false;
    return actions.execute(item);
  }

  // Rough default box size per palette item type, used only so the Phase
  // 1 drop indicator (canvas/drop-indicator.js) can preview roughly
  // where/how big a new element will land while it's being dragged in.
  // elementsService.create() remains the single source of truth for the
  // element actually created on drop — this never has to be kept in
  // exact sync with it.
  function previewSizeForDraggedType(type) {
    if (type === "icon") return { w: 36, h: 36 };
    if (type === "headline") return { w: 240, h: 40 };
    if (type === "button") return { w: 140, h: 40 };
    if (type === "box") return { w: 140, h: 90 };
    if (type === "image") return { w: 200, h: 130 };
    if (type === "shape") return { w: 100, h: 65 };
    return { w: 160, h: 24 };
  }

  function bindPaletteDragAndDrop() {
    document.querySelectorAll(".draggable-item").forEach(item => {
      if (item.dataset.webBuilderDragBound === "true") return;
      item.dataset.webBuilderDragBound = "true";
      item.addEventListener("dragstart", event => {
        state.draggedType = item.dataset.type || null;
        state.draggedIcon = item.dataset.icon || null;
        state.draggedShape = item.dataset.shape || null;
        if (event.dataTransfer) event.dataTransfer.setData("text/plain", state.draggedType || "");
      });
      // Cleans up the Phase 1 drop indicator/container highlight if the
      // drag ends without a "drop" on the canvas (dropped outside it,
      // cancelled with Esc, ...) — "dragend" always fires on the source
      // element, unlike "drop".
      item.addEventListener("dragend", () => {
        paletteDragActive = false;
        window.WebBuilderDropIndicator?.setContainerActive?.(getCanvas(), false);
        window.WebBuilderDropIndicator?.end?.(null);
      });
    });

    const canvasEl = getCanvas();
    if (!canvasEl || canvasEl.dataset.webBuilderDropBound === "true") return;
    canvasEl.dataset.webBuilderDropBound = "true";

    canvasEl.addEventListener("dragover", event => {
      event.preventDefault();
      if (state.isPreviewMode || !state.draggedType) return;
      const indicator = window.WebBuilderDropIndicator;
      if (!paletteDragActive) {
        paletteDragActive = true;
        indicator?.setContainerActive?.(canvasEl, true);
        indicator?.begin?.(canvasEl);
      }
      const point = window.WebBuilderAlignment.toLocalCoords(canvasEl, event.clientX, event.clientY);
      const size = previewSizeForDraggedType(state.draggedType);
      indicator?.update?.({
        containerEl: canvasEl,
        x: Math.max(0, point.x - 40),
        y: Math.max(0, point.y - 20),
        width: size.w,
        height: size.h,
        xKind: "container"
      });
    });

    canvasEl.addEventListener("dragleave", event => {
      // dragleave fires for every child boundary crossing too — only
      // treat it as "actually left the canvas" when the related target
      // (where the pointer is going) is outside the canvas entirely.
      if (event.target === canvasEl || !canvasEl.contains(event.relatedTarget)) {
        paletteDragActive = false;
        window.WebBuilderDropIndicator?.setContainerActive?.(canvasEl, false);
        window.WebBuilderDropIndicator?.end?.(null);
      }
    });

    canvasEl.addEventListener("drop", event => {
      event.preventDefault();
      paletteDragActive = false;
      window.WebBuilderDropIndicator?.setContainerActive?.(canvasEl, false);
      window.WebBuilderDropIndicator?.end?.(null);
      if (state.isPreviewMode || !state.draggedType) return;
      const point = window.WebBuilderAlignment.toLocalCoords(canvasEl, event.clientX, event.clientY);
      const created = elementsService.addNew(
        state.draggedType,
        state.draggedIcon,
        Math.max(0, point.x - 40),
        Math.max(0, point.y - 20),
        state.draggedShape
      );
      if (created) {
        if (window.WebBuilderInspector && typeof window.WebBuilderInspector.select === "function") window.WebBuilderInspector.select(created.id);
        else elementsService.setSelected(created.id);
        // Spring-bounce settle for the newly placed element (Phase 1) —
        // deferred two frames so the render pass triggered by addNew()'s
        // "elements" notify has actually mounted the new DOM node first.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const domEl = canvasEl.querySelector(`[data-id="${CSS.escape(created.id)}"]`);
          if (domEl) window.WebBuilderDropIndicator?.applyBounce?.(domEl);
        }));
      }
      state.draggedType = null;
      state.draggedIcon = null;
      state.draggedShape = null;
    });
  }

  function renderCustomIconPalette() {
    const container = document.getElementById("custom-icon-palette");
    if (!container) return;
    const registry = window.WebBuilderIconRegistry;
    const names = registry && typeof registry.getCustomNames === "function" ? registry.getCustomNames() : [];
    const allIcons = registry && typeof registry.getAll === "function" ? registry.getAll() : {};
    container.innerHTML = "";
    names.forEach(name => {
      const markup = allIcons[name];
      if (!markup) return;
      const item = document.createElement("div");
      item.className = "draggable-item";
      item.draggable = true;
      item.dataset.type = "icon";
      item.dataset.icon = name;
      item.innerHTML = `<span class="item-icon" style="width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;">${markup}</span><span>${escapeHtml(name)}</span>`;
      container.appendChild(item);
    });
    bindPaletteDragAndDrop();
  }

  // "Eigene Icons": Name-Feld + Datei-Upload. Die Datei wird per
  // FileReader als Data-URL gelesen; addCustomIcon() in
  // canvas/icon-registry.js erkennt automatisch, ob der übergebene Wert
  // mit "<svg" beginnt oder nicht, und baut andernfalls ein <img>-Tag.
  function bindCustomIconForm() {
    const btn = document.getElementById("btn-add-custom-icon");
    if (!btn || btn.dataset.webBuilderCustomIconBound === "true") return;
    btn.dataset.webBuilderCustomIconBound = "true";
    btn.addEventListener("click", e => {
      e.preventDefault();
      const nameInput = document.getElementById("custom-icon-name");
      const fileInput = document.getElementById("custom-icon-file");
      const name = (nameInput?.value || "").trim();
      const file = fileInput?.files?.[0];
      const registry = window.WebBuilderIconRegistry;
      if (!name || !file || !registry || typeof registry.addCustom !== "function") {
        window.WebBuilderToast?.show?.("Bitte Name und Bilddatei auswählen.", "danger");
        return;
      }
      if (!file.type.startsWith("image/")) {
        window.WebBuilderToast?.show?.("Bitte eine Bilddatei auswählen.", "danger");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        const ok = registry.addCustom(name, reader.result);
        if (!ok) {
          window.WebBuilderToast?.show?.("Icon konnte nicht hinzugefügt werden.", "danger");
          return;
        }
        if (nameInput) nameInput.value = "";
        if (fileInput) fileInput.value = "";
        renderCustomIconPalette();
        window.WebBuilderToast?.show?.(`Icon "${name}" hinzugefügt ⚡`, "success");
      };
      reader.readAsDataURL(file);
    });
  }

  function renderOwnedCanvas() {
    if (rendering) return;
    const canvasEl = getCanvas();
    if (!canvasEl) return;
    rendering = true;
    try {
      setRendererCallbacks({ onAction: handlePreviewAction });
      renderCanvas();
      setBackground(state.background);
      syncDom();
    } finally {
      rendering = false;
    }
  }

  // Delays a pending render while state.dragLock is active (see
  // canvas/alignment.js attachInteraction) so it can't replace the DOM
  // node mid-drag.
  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    const run = () => {
      if (state.dragLock) {
        if (window.requestAnimationFrame) window.requestAnimationFrame(run); else window.setTimeout(run, 16);
        return;
      }
      renderQueued = false;
      renderOwnedCanvas();
    };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run); else window.setTimeout(run, 0);
  }

  // Stacking order is handled by CSS z-index (see layout/header-footer-render.js),
  // so no MutationObserver is needed here — just re-render on relevant changes.
  state.subscribe?.(event => {
    const domain = event?.domain;
    if (["elements", "selection", "preview", "canvas", "background"].includes(domain)) scheduleRender();
  });

  window.addEventListener("webbuilder:state-change", event => {
    const domain = event.detail?.domain;
    if (["elements", "selection", "preview", "canvas", "background"].includes(domain)) scheduleRender();
  });

  document.addEventListener("click", handleCanvasControls, true);

  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(() => {
      bindPaletteDragAndDrop();
      bindCustomIconForm();
      renderCustomIconPalette();
      renderOwnedCanvas();
    }, 0);
  });

  window.WebBuilderCanvas = {
    getCanvas, getCanvasColumn, normalizeState, applyZoom, setZoom, zoomIn, zoomOut,
    resetZoom, setCanvasHeight, extendCanvas, syncDom,
    renderCanvas, render: renderOwnedCanvas,
    setBackground, setRendererCallbacks, bindPaletteDragAndDrop,
    constants: { ZOOM_MIN, ZOOM_MAX, CANVAS_MIN_HEIGHT, DEFAULT_ZOOM, DEFAULT_CANVAS_HEIGHT },
    renderShapeInner, computeBackgroundCss,
    renderCustomIconPalette, bindCustomIconForm
  };
})();
