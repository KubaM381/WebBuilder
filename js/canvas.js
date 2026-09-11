// WebBuilder canvas module
// Canvas remains a single domain module. Viewport, drag/drop interaction,
// rendering, background-editor binding, canvas controls and the "Eigene
// Icons"-palette UI are kept together here.
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

  // ------------------------------------------------------------------
  // Vereinheitlichter Interaktions-Controller (Klick + Drag)
  // ------------------------------------------------------------------
  // FIX (Architektur-Vereinheitlichung, siehe README/Chatverlauf): Vorher
  // liefen zwei komplett unabhängige Interaktionssysteme parallel:
  //   - normale Canvas-Elemente: mousedown-basiertes makeDraggable() PLUS
  //     ein separater "click"-Listener zur Selektion (verließ sich auf das
  //     native Klick-Event nach mouseup).
  //   - Header-/Footer-Elemente: eigene, unabhängige Pointer-Events-Logik.
  // Diese unterschiedlichen Mechanismen kollidierten miteinander und
  // hatten keine Koordination mit dem Re-Rendering. Jetzt nutzen BEIDE
  // Domänen exakt diese eine Funktion.
  //
  // - EIN pointerdown startet die Interaktion mit Pointer-Capture (das
  //   Element bekommt garantiert alle folgenden Events, unabhängig davon,
  //   wohin sich der Cursor bewegt).
  // - Erst wenn die Bewegung einen kleinen Schwellwert überschreitet, gilt
  //   die Interaktion als "Drag" (verhindert, dass Handzittern beim
  //   Klicken versehentlich als Verschieben gewertet wird).
  // - opts.onClick(event, wasDragging) wird IMMER beim Loslassen
  //   aufgerufen (reine Selektion — wie zuvor das native Klick-Event bei
  //   jedem mouseup, ob mit oder ohne vorherige Bewegung).
  // - opts.onDragStart()/onDragEnd() laufen nur bei echter Bewegung; die
  //   History-Transaktion (arm/commit) läuft ebenfalls nur dann, damit ein
  //   reiner Klick keinen unnötigen Undo-Schritt erzeugt.
  // - FIX (Kern-Bug, Render-vs-Interaktion-Race): Während einer aktiven
  //   Bewegung wird state.dragLock gesetzt. scheduleRender() weiter unten
  //   UND header-footer.js respektieren dieses Flag und verschieben ein
  //   anstehendes Re-Rendering, bis die Bewegung beendet ist. Vorher konnte
  //   ein durch requestAnimationFrame verzögertes Rendering (z. B. nach
  //   einer Selektion einen Frame zuvor) genau den DOM-Knoten wegreißen,
  //   den man gerade zu ziehen begonnen hatte — Pointer-Capture ging
  //   verloren, der Drag brach mitten in der Bewegung ab. Das erklärte
  //   sowohl "Elemente lassen sich teilweise verschieben, aber nicht
  //   zuverlässig anklicken" als auch das entsprechende Verhalten bei
  //   Header/Footer.
  // - opts.minX/minY/maxX/maxY (oder eine opts.getBounds()-Funktion, die
  //   bei Bewegungsstart ausgewertet wird) begrenzen die Bewegung — damit
  //   z. B. Header-/Footer-Elemente ihre Leiste nicht verlassen können,
  //   während normale Canvas-Elemente unbegrenzt bleiben (Standard:
  //   0/0/Infinity/Infinity, wie zuvor bei makeDraggable).
  const DRAG_THRESHOLD = 4;

  function attachInteraction(domEl, item, containerEl, opts = {}) {
    if (!domEl || !item || !containerEl) return;
    const recordHistory = opts.recordHistory !== false;

    domEl.addEventListener("pointerdown", event => {
      if (event.button != null && event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      try { domEl.setPointerCapture(event.pointerId); } catch (e) { /* ignore */ }

      const allowDrag = !state.isPreviewMode;
      const bounds = typeof opts.getBounds === "function" ? (opts.getBounds() || {}) : opts;
      const minX = bounds.minX != null ? bounds.minX : 0;
      const minY = bounds.minY != null ? bounds.minY : 0;
      const maxX = bounds.maxX != null ? bounds.maxX : Infinity;
      const maxY = bounds.maxY != null ? bounds.maxY : Infinity;

      const start = toLocalCoords(containerEl, event.clientX, event.clientY);
      const offsetX = start.x - (Number(item.x) || 0);
      const offsetY = start.y - (Number(item.y) || 0);
      const startClientX = event.clientX, startClientY = event.clientY;
      let dragging = false;

      function onMove(moveEvent) {
        if (!allowDrag) return;
        const dx = moveEvent.clientX - startClientX, dy = moveEvent.clientY - startClientY;
        if (!dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          dragging = true;
          state.dragLock = true;
          if (recordHistory) window.WebBuilderHistory?.arm();
          opts.onDragStart?.();
        }
        const point = toLocalCoords(containerEl, moveEvent.clientX, moveEvent.clientY);
        item.x = Math.min(maxX, Math.max(minX, point.x - offsetX));
        item.y = Math.min(maxY, Math.max(minY, point.y - offsetY));
        domEl.style.left = item.x + "px";
        domEl.style.top = item.y + "px";
      }

      function finish(upEvent) {
        domEl.removeEventListener("pointermove", onMove);
        domEl.removeEventListener("pointerup", finish);
        domEl.removeEventListener("pointercancel", finish);
        try { domEl.releasePointerCapture(event.pointerId); } catch (e) { /* ignore */ }
        if (dragging) {
          state.dragLock = false;
          if (recordHistory) window.WebBuilderHistory?.commit();
          opts.onDragEnd?.();
        }
        // Sowohl ein reiner Klick als auch das Ende eines Ziehvorgangs
        // sollen das Element auswählen bzw. die Klick-Aktion ausführen —
        // genau wie zuvor das native "click"-Event bei jedem mouseup.
        opts.onClick?.(upEvent, dragging);
      }

      domEl.addEventListener("pointermove", onMove);
      domEl.addEventListener("pointerup", finish);
      domEl.addEventListener("pointercancel", finish);
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
    'arrow-right': '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/></svg>',
    settings: '<svg class="icon-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>'
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
        el.innerHTML = `<img src="${escapeHtml(src)}" class="canvas-img" style="width:${item.size}px; height:auto;" alt="Bild Element" draggable="false" />`;
      } else {
        el.innerHTML = `<p style="font-size:${item.size}px; color:${item.color}; font-weight:${item.bold ? "bold" : "normal"}; font-style:${item.italic ? "italic" : "normal"}; text-decoration:${textDeco}; font-family:${fontFam}; text-align:${align};">${escapeHtml(item.text)}</p>`;
      }
      const badge = document.createElement("span");
      badge.className = "element-badge";
      badge.innerText = "⚡ Logik";
      el.appendChild(badge);

      // FIX: einziger Interaktionspfad für Klick UND Drag (siehe
      // attachInteraction() weiter oben) statt vorher getrennter
      // click-Listener + makeDraggable()-mousedown-Logik.
      attachInteraction(el, item, canvas, {
        onClick: () => {
          if (state.isPreviewMode) {
            if (typeof callbacks.onAction === "function") callbacks.onAction(item, el);
          } else if (typeof callbacks.onSelect === "function") callbacks.onSelect(item.id);
          else if (window.WebBuilderInspector && typeof window.WebBuilderInspector.select === "function") window.WebBuilderInspector.select(item.id);
          else elementsService.setSelected(item.id);
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

  function bindBackgroundEditor() {
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

    function syncControls() {
      const bg = state.background || {};
      if (typeSel) typeSel.value = bg.type || "solid";
      if (colorInput) colorInput.value = bg.color || "#ffffff";
      if (grad1Input) grad1Input.value = bg.grad1 || "#4f46e5";
      if (grad2Input) grad2Input.value = bg.grad2 || "#06b6d4";
      if (gradDirInput) gradDirInput.value = bg.gradDir || "to right";
      if (imageUrlInput && document.activeElement !== imageUrlInput) imageUrlInput.value = bg.imageUrl || "";
      applyGroupVisibility();
    }

    function commit(patch) {
      window.WebBuilderHistory?.arm();
      Object.assign(state.background, patch);
      window.WebBuilderHistory?.commit();
      syncControls();
      setBackground(state.background);
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
    window.WebBuilderCanvas.refreshBackgroundEditor = syncControls;
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

  function bindCustomIconForm() {
    const btn = document.getElementById("btn-add-custom-icon");
    if (!btn || btn.dataset.webBuilderCustomIconBound === "true") return;
    btn.dataset.webBuilderCustomIconBound = "true";
    btn.addEventListener("click", e => {
      e.preventDefault();
      const nameInput = document.getElementById("custom-icon-name");
      const sourceInput = document.getElementById("custom-icon-source");
      const name = (nameInput?.value || "").trim();
      const source = (sourceInput?.value || "").trim();
      const registry = window.WebBuilderIconRegistry;
      if (!name || !source || !registry || typeof registry.addCustom !== "function") {
        window.WebBuilderToast?.show?.("Bitte Name und SVG-Code/Bild-URL angeben.", "danger");
        return;
      }
      const ok = registry.addCustom(name, source);
      if (!ok) {
        window.WebBuilderToast?.show?.("Icon konnte nicht hinzugefügt werden.", "danger");
        return;
      }
      if (nameInput) nameInput.value = "";
      if (sourceInput) sourceInput.value = "";
      renderCustomIconPalette();
      window.WebBuilderToast?.show?.(`Icon "${name}" hinzugefügt ⚡`, "success");
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

  // FIX (Kern-Bug): scheduleRender() lief bisher IMMER nach genau einem
  // requestAnimationFrame, unabhängig davon, ob der Nutzer inzwischen
  // begonnen hat, das gerade selektierte/gerenderte Element zu ziehen.
  // Ein Rendering mitten in einer aktiven Bewegung ersetzt den DOM-Knoten
  // unter dem Cursor und bricht Pointer-Capture/Drag ab. Jetzt wird ein
  // anstehendes Rendering so lange verschoben (nächster Frame), bis
  // state.dragLock (siehe attachInteraction oben) wieder false ist —
  // nichts geht dabei verloren, es läuft nur etwas später.
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

  // FIX (MutationObserver entfernt): Der bisherige MutationObserver auf
  // #canvas versuchte, "reine Bar-Mutationen" von echten Element-Änderungen
  // zu unterscheiden, um kein unnötiges Re-Rendering auszulösen — ein
  // fragiler Mechanismus, der eine weitere Quelle für Timing-Probleme war.
  // Das ist unnötig: .builder-bar hat bereits explizites z-index:300/250
  // (siehe header-footer.js buildBarElement), während .placed-element
  // z-index:auto hat. Für positionierte Geschwisterelemente stapeln
  // Elemente mit explizitem, positivem z-index PER CSS-SPEZIFIKATION immer
  // über z-index:auto-Elementen — unabhängig von der DOM-Reihenfolge. Die
  // visuelle Stapelung UND das Hit-Testing (welches Element Klicks
  // empfängt) sind dadurch bereits robust und deterministisch über CSS
  // gelöst; ein DOM-Mutationen beobachtender Re-Render-Trigger ist dafür
  // nicht mehr nötig. Alle für Canvas-Elemente relevanten Zustandsänderungen
  // laufen weiterhin zuverlässig über state.subscribe()/state-change unten.
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
      bindBackgroundEditor();
      bindCustomIconForm();
      renderCustomIconPalette();
      renderOwnedCanvas();
    }, 0);
  });

  window.WebBuilderCanvas = {
    getCanvas, getCanvasColumn, normalizeState, applyZoom, setZoom, zoomIn, zoomOut,
    resetZoom, setCanvasHeight, extendCanvas, syncDom, toLocalCoords,
    // NEU: gemeinsamer Interaktions-Controller, auch von header-footer.js
    // genutzt (siehe dort bindBarItemInteraction). makeDraggable bleibt als
    // rückwärtskompatibler Alias erhalten, falls andere Stellen ihn noch
    // referenzieren.
    attachInteraction, makeDraggable: attachInteraction,
    renderCanvas, render: renderOwnedCanvas,
    setBackground, setRendererCallbacks, bindPaletteDragAndDrop, bindBackgroundEditor,
    constants: { ZOOM_MIN, ZOOM_MAX, CANVAS_MIN_HEIGHT, DEFAULT_ZOOM, DEFAULT_CANVAS_HEIGHT },
    renderShapeInner, computeBackgroundCss,
    renderCustomIconPalette, bindCustomIconForm
  };
})();
