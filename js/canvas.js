// WebBuilder canvas module
// Canvas remains a single domain module. Viewport, drag/drop interaction,
// rendering and canvas controls are kept together here.
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
  let callbacks = { onSelect: null, onAction: null };
  let renderQueued = false;
  let rendering = false;
  let canvasObserver = null;

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

  function toLocalCoords(containerEl, clientX, clientY) {
    if (!containerEl) return { x: 0, y: 0 };
    const rect = containerEl.getBoundingClientRect();
    const zoom = Number(state.zoomLevel) || 1;
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  }

  function syncDom() {
    normalizeState();
    setCanvasHeight(state.canvasHeight);
    applyZoom(state.isPreviewMode);
    return { zoomLevel: state.zoomLevel, canvasHeight: state.canvasHeight };
  }

  function makeDraggable(domEl, item, containerEl, opts = {}) {
    if (!domEl || !item || !containerEl) return;
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

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  }

  const FALLBACK_ICONS = {
    cart: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1z"/></svg>',
    'arrow-up': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z"/></svg>',
    'arrow-down': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>',
    'arrow-left': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>',
    'arrow-right': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>'
  };

  function getIconMap() {
    const registry = window.WebBuilderIconRegistry && typeof window.WebBuilderIconRegistry.getAll === "function"
      ? window.WebBuilderIconRegistry.getAll() : {};
    return Object.assign({}, FALLBACK_ICONS, registry, window.WebBuilderIconMap || {});
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
      el.className = ["placed-element", item.id === state.selectedElementId ? "selected" : "", item.actionType !== "none" ? "has-action" : ""].filter(Boolean).join(" ");
      el.style.left = `${item.x}px`;
      el.style.top = `${item.y}px`;
      el.style.color = item.color;
      el.dataset.id = item.id;
      const textDeco = item.underline ? "underline" : "none";
      const fontFam = item.fontFamily || "inherit";
      const align = item.align || "left";
      if (item.type === "icon" && iconMap[item.iconName]) {
        el.innerHTML = item.iconFrame ? `<span class="icon-frame-wrap" style="border-color:${item.iconFrameColor || "#111827"};">${iconMap[item.iconName]}</span>` : iconMap[item.iconName];
        const svg = el.querySelector("svg, img");
        if (svg) { svg.style.width = `${item.size}px`; svg.style.height = `${item.size}px`; }
      } else if (item.type === "button") {
        el.innerHTML = `<button class="btn btn-primary" style="font-size:${item.size}px; background-color:${item.color}; font-weight:${item.bold ? "bold" : "600"}; font-style:${item.italic ? "italic" : "normal"}; text-decoration:${textDeco}; font-family:${fontFam};">${escapeHtml(item.text)}</button>`;
      } else if (item.type === "headline") {
        el.innerHTML = `<h2 style="font-size:${item.size}px; color:${item.color}; font-weight:${item.bold ? "bold" : "400"}; font-style:${item.italic ? "italic" : "normal"}; text-decoration:${textDeco}; font-family:${fontFam}; text-align:${align};">${escapeHtml(item.text)}</h2>`;
      } else if (item.type === "box") {
        el.innerHTML = `<div style="width:140px; height:90px; background:${item.color}; border-radius:8px; box-shadow: var(--shadow-md);"></div>`;
      } else if (item.type === "shape") {
        el.innerHTML = renderShapeInner(item);
      } else if (item.type === "image") {
        const src = item.imageUrl || "https://via.placeholder.com/200";
        el.innerHTML = `<img src="${escapeHtml(src)}" class="canvas-img" style="width:${item.size}px; height:auto;" alt="Bild Element" />`;
      } else {
        el.innerHTML = `<p style="font-size:${item.size}px; color:${item.color}; font-weight:${item.bold ? "bold" : "normal"}; font-style:${item.italic ? "italic" : "normal"}; text-decoration:${textDeco}; font-family:${fontFam}; text-align:${align};">${escapeHtml(item.text)}</p>`;
      }
      const badge = document.createElement("span");
      badge.className = "element-badge";
      badge.innerText = "⚡ Logik";
      el.appendChild(badge);
      el.addEventListener("click", e => {
        e.stopPropagation();
        if (state.isPreviewMode) {
          if (typeof callbacks.onAction === "function") callbacks.onAction(item, el);
        } else if (typeof callbacks.onSelect === "function") callbacks.onSelect(item.id);
        else if (window.WebBuilderInspector && typeof window.WebBuilderInspector.select === "function") window.WebBuilderInspector.select(item.id);
        else elementsService.setSelected(item.id);
      }, true);
      makeDraggable(el, item, canvas);
      canvas.appendChild(el);
    });
    return true;
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

  // FIX: this was completely missing after the module split. The old
  // monolith wired dragstart on every ".draggable-item" in the sidebar and
  // dragover/drop on "#canvas" to actually create the dropped element —
  // without it, nothing in the palette can be placed on the canvas at all,
  // which is the single most basic thing the builder needs to do.
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
    });

    const canvasEl = getCanvas();
    if (!canvasEl || canvasEl.dataset.webBuilderDropBound === "true") return;
    canvasEl.dataset.webBuilderDropBound = "true";

    canvasEl.addEventListener("dragover", event => event.preventDefault());

    canvasEl.addEventListener("drop", event => {
      event.preventDefault();
      if (state.isPreviewMode || !state.draggedType) return;
      const point = toLocalCoords(canvasEl, event.clientX, event.clientY);
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
      }
      state.draggedType = null;
      state.draggedIcon = null;
      state.draggedShape = null;
    });
  }

  function renderOwnedCanvas() {
    if (rendering) return;
    const canvasEl = getCanvas();
    if (!canvasEl) return;
    rendering = true;
    if (canvasObserver) canvasObserver.disconnect();
    try {
      setRendererCallbacks({ onAction: handlePreviewAction });
      renderCanvas();
      setBackground(state.background);
      syncDom();
    } finally {
      rendering = false;
      if (canvasObserver) canvasObserver.observe(canvasEl, { childList: true });
    }
  }

  function scheduleRender() {
    if (renderQueued) return;
    renderQueued = true;
    const run = () => { renderQueued = false; renderOwnedCanvas(); };
    if (window.requestAnimationFrame) window.requestAnimationFrame(run); else window.setTimeout(run, 0);
  }

  function installCanvasOwnership() {
    const canvasEl = getCanvas();
    if (!canvasEl || !window.MutationObserver) return;
    if (canvasObserver) canvasObserver.disconnect();
    canvasObserver = new MutationObserver(mutations => {
      if (rendering) return;
      if (mutations.some(mutation => mutation.type === "childList")) scheduleRender();
    });
    canvasObserver.observe(canvasEl, { childList: true });
  }

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
    window.setTimeout(() => { installCanvasOwnership(); bindPaletteDragAndDrop(); renderOwnedCanvas(); }, 0);
  });

  window.WebBuilderCanvas = {
    getCanvas, getCanvasColumn, normalizeState, applyZoom, setZoom, zoomIn, zoomOut,
    resetZoom, setCanvasHeight, extendCanvas, syncDom, toLocalCoords, makeDraggable,
    renderCanvas, render: () => { setBackground(state.background); return renderCanvas(); },
    setBackground, setRendererCallbacks, bindPaletteDragAndDrop,
    constants: { ZOOM_MIN, ZOOM_MAX, CANVAS_MIN_HEIGHT, DEFAULT_ZOOM, DEFAULT_CANVAS_HEIGHT },
    render: renderOwnedCanvas
  };
})();
