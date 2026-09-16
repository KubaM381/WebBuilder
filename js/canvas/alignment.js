// js/canvas/alignment.js
// WebBuilder shared drag/click interaction + alignment guides.
// Extracted from canvas.js so both canvas/canvas.js (canvas elements) and
// layout/header-footer.js (bar items) can share exactly the same drag
// controller and Canva-style center/edge snapping without either file
// depending on the other. Must load before both.
//
// T11 (see docs/CART_EDITOR_TASKS.md): shop/cart-editor.js also uses the
// snapping primitives below (collectSnapTargets/snapPosition/guide-layer
// helpers), but NOT attachInteraction() itself — the cart editor positions
// parts/components via a CSS transform offset from their natural flow
// position, on an unscaled stage (outside #canvas-column, so never
// affected by state.zoomLevel), whereas attachInteraction() assumes
// absolute left/top positioning inside a zoom-scaled container. Forcing
// that model onto the cart editor would have meant restructuring its
// layout system; instead the snapping building blocks are exported here
// with an explicit, overridable zoom parameter so a caller with a
// different coordinate space (like cart-editor.js, always zoom=1) can
// reuse them safely without inheriting canvas.js's zoom assumption.
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

  // Shared click+drag controller (Pointer Events), used by canvas elements
  // and header/footer bar items. Movement below DRAG_THRESHOLD counts as
  // a click (opts.onClick); above it, a drag (opts.onDragStart/onDragEnd,
  // wrapped in a history transaction) and sets state.dragLock so
  // re-renders don't replace the dragged DOM node mid-move.
  // opts.getBounds() can restrict movement (minX/minY/maxX/maxY).
  const DRAG_THRESHOLD = 4;

  // ------------------------------------------------------------------
  // Alignment guides (Canva-style center/edge snapping while dragging).
  // Created at drag start and removed at drag end — never part of the
  // persisted DOM, matching the same "temporary while dragging"
  // convention as state.dragLock (see js/README.md "Event conventions").
  // ------------------------------------------------------------------
  const GUIDE_SNAP_PX = 6; // on-screen pixels; converted to local (unscaled) units via zoom below

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

  // Collects candidate snap lines — container center plus sibling edges/
  // centers — as local (unscaled) coordinates, i.e. the same coordinate
  // space toLocalCoords() produces and item.x/item.y already live in.
  // siblingSelector scopes this to direct children of the same container
  // (".placed-element" for the canvas, ".bar-item" for a header/footer bar,
  // "[data-cart-part]" for the cart editor — see shop/cart-editor.js).
  //
  // zoomOverride: callers whose container isn't affected by
  // state.zoomLevel (e.g. the cart editor stage, which sits outside the
  // zoom-scaled #canvas-column) MUST pass 1 here explicitly — omitting it
  // falls back to state.zoomLevel, which is only correct for canvas
  // elements and header/footer bar items.
  function collectSnapTargets(containerEl, excludeEl, siblingSelector, zoomOverride) {
    const zoom = zoomOverride != null ? zoomOverride : (Number(state.zoomLevel) || 1);
    const containerRect = containerEl.getBoundingClientRect();
    const xTargets = [containerRect.width / zoom / 2];
    const yTargets = [containerRect.height / zoom / 2];
    containerEl.querySelectorAll(`:scope > ${siblingSelector}`).forEach(el => {
      if (el === excludeEl) return;
      const r = el.getBoundingClientRect();
      const left = (r.left - containerRect.left) / zoom;
      const right = (r.right - containerRect.left) / zoom;
      const top = (r.top - containerRect.top) / zoom;
      const bottom = (r.bottom - containerRect.top) / zoom;
      xTargets.push(left, right, (left + right) / 2);
      yTargets.push(top, bottom, (top + bottom) / 2);
    });
    return { xTargets, yTargets };
  }

  // Snaps a proposed top-left (x, y) of an item sized (w, h) against the
  // collected targets. Checks the item's left/center/right edge against
  // every x-target (and top/center/bottom against every y-target),
  // keeping only the closest match per axis within the zoom-adjusted
  // threshold. Returns the (possibly adjusted) position plus which local
  // coordinate matched on each axis, so the caller can place guide lines.
  function snapPosition(x, y, w, h, targets, zoom) {
    const threshold = GUIDE_SNAP_PX / (zoom || 1);
    const ownX = [x, x + w / 2, x + w];
    const ownY = [y, y + h / 2, y + h];
    let bestX = null, bestXDiff = threshold;
    targets.xTargets.forEach(t => {
      ownX.forEach(p => {
        const diff = Math.abs(p - t);
        if (diff < bestXDiff) { bestXDiff = diff; bestX = { line: t, delta: t - p }; }
      });
    });
    let bestY = null, bestYDiff = threshold;
    targets.yTargets.forEach(t => {
      ownY.forEach(p => {
        const diff = Math.abs(p - t);
        if (diff < bestYDiff) { bestYDiff = diff; bestY = { line: t, delta: t - p }; }
      });
    });
    return {
      x: bestX ? x + bestX.delta : x,
      y: bestY ? y + bestY.delta : y,
      guideX: bestX ? bestX.line : null,
      guideY: bestY ? bestY.line : null
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
          opts.onDragEnd?.();
        }
        // A plain click and the end of a drag both trigger onClick, same
        // as the native "click" event used to on mouseup.
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
    // T11: exported so shop/cart-editor.js can reuse the same snapping
    // math/guide rendering from its own bespoke (transform-offset-based,
    // unscaled) pointer handling instead of duplicating it. Not used by
    // canvas/canvas.js or layout/header-footer.js directly — they go
    // through attachInteraction() above, which already calls these
    // internally.
    collectSnapTargets,
    snapPosition,
    createGuideLayer,
    removeGuideLayer,
    updateGuideVisibility
  };
})();
