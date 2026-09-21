// js/canvas/alignment.js
// Gemeinsamer Drag/Click-Controller (Pointer Events) + Canva-artige
// Ausrichtungslinien. Genutzt von canvas/canvas.js (Canvas-Elemente) und
// layout/header-footer-render.js (Bar-Items), damit keins von beiden
// eigene Drag-/Snapping-Logik dupliziert. Muss vor beiden laden.
//
// shop/cart-editor-drag.js nutzt nur die Snapping-Primitiven unten
// (collectSnapTargets/snapPosition/Guide-Layer-Helfer), nicht
// attachInteraction() selbst — der Warenkorb-Editor positioniert Teile
// über einen CSS-Transform-Offset auf einer unskalierten Bühne und ruft
// diese Funktionen deshalb mit explizitem zoomOverride: 1 auf, statt
// state.zoomLevel zu erben.
//
// canvas/drop-indicator.js klinkt sich an denselben drei Stellen in
// attachInteraction() ein, an denen bereits die Guide-Linien erzeugt/
// aktualisiert/entfernt werden — immer per optional-chaining. Ohne diese
// Datei verhält sich Dragging exakt wie vorher (nur Linien, keine Box).
(() => {
  const state = window.WebBuilderState;
  if (!state) {
    console.error("WebBuilderAlignment: WebBuilderState is not available.");
    return;
  }

  function toLocalCoords(containerEl, clientX, clientY) {
    if (!containerEl) return { x: 0, y: 0 };
    const rect = containerEl.getBoundingClientRect();
    const zoom = Number(state.zoomLevel) || 1;
    return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
  }

  // Bewegung unter diesem Wert zählt als Klick (opts.onClick); darüber als
  // Drag (opts.onDragStart/onDragEnd, in eine History-Transaktion
  // eingebettet).
  const DRAG_THRESHOLD = 4;

  // Guides werden bei Drag-Start erzeugt und bei Drag-Ende entfernt — nie
  // Teil des gespeicherten DOM (gleiche Konvention wie state.dragLock).
  const GUIDE_SNAP_PX = 6; // Bildschirm-Pixel; unten via Zoom in lokale Einheiten umgerechnet

  function createGuideLayer(containerEl) {
    const layer = document.createElement("div");
    layer.className = "alignment-guides";
    const vLine = document.createElement("div");
    vLine.className = "alignment-guide-line alignment-guide-v";
    const hLine = document.createElement("div");
    hLine.className = "alignment-guide-line alignment-guide-h";
    layer.appendChild(vLine);
    layer.appendChild(hLine);
    containerEl.appendChild(layer);
    return { layer, vLine, hLine };
  }

  function removeGuideLayer(guides) {
    guides?.layer?.remove();
  }

  function updateGuideVisibility(guides, guideX, guideY) {
    if (!guides) return;
    if (guideX != null) { guides.vLine.style.left = guideX + "px"; guides.vLine.style.display = "block"; }
    else guides.vLine.style.display = "none";
    if (guideY != null) { guides.hLine.style.top = guideY + "px"; guides.hLine.style.display = "block"; }
    else guides.hLine.style.display = "none";
  }

  // Sammelt Snap-Kandidaten (Container-Kanten/-Mitte + Geschwister-Kanten/
  // -Mitten) als lokale (unskalierte) Koordinaten — derselbe Raum, den
  // toLocalCoords() liefert und in dem item.x/item.y bereits leben.
  // siblingSelector begrenzt auf direkte Kinder desselben Containers.
  //
  // zoomOverride: MUSS explizit 1 sein für einen Container, der nicht von
  // state.zoomLevel betroffen ist (z. B. die Warenkorb-Editor-Bühne) —
  // ohne Angabe fällt es auf state.zoomLevel zurück, was nur für
  // Canvas-Elemente/Bar-Items korrekt ist.
  //
  // xTargetKinds/yTargetKinds markieren jedes Ziel als "container" (die
  // ersten drei: 0/Mitte/Größe) oder "sibling" — für die visuelle
  // Unterscheidung in drop-indicator.js. Ein Aufrufer, der nur
  // { xTargets, yTargets } destructured, bleibt unverändert funktionsfähig.
  function collectSnapTargets(containerEl, excludeEl, siblingSelector, zoomOverride) {
    const zoom = zoomOverride != null ? zoomOverride : (Number(state.zoomLevel) || 1);
    const containerRect = containerEl.getBoundingClientRect();
    const containerWidth = containerRect.width / zoom;
    const containerHeight = containerRect.height / zoom;
    const xTargets = [0, containerWidth / 2, containerWidth];
    const yTargets = [0, containerHeight / 2, containerHeight];
    const xTargetKinds = ["container", "container", "container"];
    const yTargetKinds = ["container", "container", "container"];
    containerEl.querySelectorAll(`:scope > ${siblingSelector}`).forEach(el => {
      if (el === excludeEl) return;
      const r = el.getBoundingClientRect();
      const left = (r.left - containerRect.left) / zoom;
      const right = (r.right - containerRect.left) / zoom;
      const top = (r.top - containerRect.top) / zoom;
      const bottom = (r.bottom - containerRect.top) / zoom;
      xTargets.push(left, right, (left + right) / 2);
      yTargets.push(top, bottom, (top + bottom) / 2);
      xTargetKinds.push("sibling", "sibling", "sibling");
      yTargetKinds.push("sibling", "sibling", "sibling");
    });
    return { xTargets, yTargets, xTargetKinds, yTargetKinds };
  }

  // Snappt eine vorgeschlagene Top-Left-Position (x, y) eines (w, h)
  // großen Elements gegen die gesammelten Ziele; behält pro Achse nur den
  // nächstgelegenen Treffer innerhalb des zoomabhängigen Schwellwerts.
  // Liefert die (ggf. angepasste) Position, die getroffene lokale
  // Koordinate pro Achse (für Guide-Linien) und die Art des getroffenen
  // Ziels pro Achse (für drop-indicator.js).
  function snapPosition(x, y, w, h, targets, zoom) {
    const threshold = GUIDE_SNAP_PX / (zoom || 1);
    const ownX = [x, x + w / 2, x + w];
    const ownY = [y, y + h / 2, y + h];
    let bestX = null, bestXDiff = threshold, bestXIndex = -1;
    targets.xTargets.forEach((t, i) => {
      ownX.forEach(p => {
        const diff = Math.abs(p - t);
        if (diff < bestXDiff) { bestXDiff = diff; bestX = { line: t, delta: t - p }; bestXIndex = i; }
      });
    });
    let bestY = null, bestYDiff = threshold, bestYIndex = -1;
    targets.yTargets.forEach((t, i) => {
      ownY.forEach(p => {
        const diff = Math.abs(p - t);
        if (diff < bestYDiff) { bestYDiff = diff; bestY = { line: t, delta: t - p }; bestYIndex = i; }
      });
    });
    return {
      x: bestX ? x + bestX.delta : x,
      y: bestY ? y + bestY.delta : y,
      guideX: bestX ? bestX.line : null,
      guideY: bestY ? bestY.line : null,
      xKind: bestX && targets.xTargetKinds ? targets.xTargetKinds[bestXIndex] : null,
      yKind: bestY && targets.yTargetKinds ? targets.yTargetKinds[bestYIndex] : null
    };
  }

  function attachInteraction(domEl, item, containerEl, opts = {}) {
    if (!domEl || !item || !containerEl) return;
    const recordHistory = opts.recordHistory !== false;
    const snapEnabled = opts.snap !== false;
    const snapSelector = opts.snapSelector || ".placed-element";

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
      let guides = null;
      let elBox = null;

      function onMove(moveEvent) {
        if (!allowDrag) return;
        const dx = moveEvent.clientX - startClientX, dy = moveEvent.clientY - startClientY;
        if (!dragging) {
          if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
          dragging = true;
          state.dragLock = true;
          if (recordHistory) window.WebBuilderHistory?.arm();
          opts.onDragStart?.();
          if (snapEnabled) {
            elBox = domEl.getBoundingClientRect();
            guides = createGuideLayer(containerEl);
            window.WebBuilderDropIndicator?.begin?.(containerEl);
          }
        }
        const point = toLocalCoords(containerEl, moveEvent.clientX, moveEvent.clientY);
        let nextX = point.x - offsetX;
        let nextY = point.y - offsetY;

        if (guides && elBox) {
          const zoom = Number(state.zoomLevel) || 1;
          const w = elBox.width / zoom, h = elBox.height / zoom;
          const targets = collectSnapTargets(containerEl, domEl, snapSelector);
          const snapped = snapPosition(nextX, nextY, w, h, targets, zoom);
          nextX = snapped.x;
          nextY = snapped.y;
          updateGuideVisibility(guides, snapped.guideX, snapped.guideY);
          window.WebBuilderDropIndicator?.update?.({
            containerEl, x: nextX, y: nextY, width: w, height: h,
            xKind: snapped.xKind, yKind: snapped.yKind
          });
        }

        item.x = Math.min(maxX, Math.max(minX, nextX));
        item.y = Math.min(maxY, Math.max(minY, nextY));
        domEl.style.left = item.x + "px";
        domEl.style.top = item.y + "px";
      }

      function finish(upEvent) {
        domEl.removeEventListener("pointermove", onMove);
        domEl.removeEventListener("pointerup", finish);
        domEl.removeEventListener("pointercancel", finish);
        try { domEl.releasePointerCapture(event.pointerId); } catch (e) { /* ignore */ }
        if (guides) { removeGuideLayer(guides); guides = null; }
        if (dragging) {
          state.dragLock = false;
          if (recordHistory) window.WebBuilderHistory?.commit();
          window.WebBuilderDropIndicator?.end?.(domEl);
          opts.onDragEnd?.();
        }
        // Klick und Drag-Ende lösen beide onClick aus — wie zuvor "click".
        opts.onClick?.(upEvent, dragging);
      }

      domEl.addEventListener("pointermove", onMove);
      domEl.addEventListener("pointerup", finish);
      domEl.addEventListener("pointercancel", finish);
    });
  }

  window.WebBuilderAlignment = {
    attachInteraction,
    toLocalCoords,
    collectSnapTargets,
    snapPosition,
    createGuideLayer,
    removeGuideLayer,
    updateGuideVisibility
  };
})();
