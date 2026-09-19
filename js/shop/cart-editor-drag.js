// js/shop/cart-editor-drag.js
// WebBuilder cart focus editor — pointer-drag interaction.
// Owns every pointer-event drag on the cart editor stage: resizing the
// article representation ("Artikel-Darstellung"), dragging a top-level
// component (progress/discount/recommend/checkout/totals/title/segment/
// divider), and dragging a cart-item or recommend-card sub-part (icon/qty/
// price/remove/description). Does NOT own the stage's selection state or
// its layout data model — both live in cart-editor-stage.js and are
// reached here only through window.WebBuilderCartFocus at runtime.
//
// Not implemented via canvas/alignment.js's shared attachInteraction()
// controller: this stage positions parts/components via a CSS transform
// offset from their natural flow position on an unscaled surface (outside
// the zoom-scaled #canvas-column), whereas attachInteraction() assumes
// absolute left/top positioning inside a zoom-scaled container. It does
// reuse alignment.js's exported snapping primitives
// (collectSnapTargets/snapPosition/guide-layer helpers), always with
// zoomOverride: 1 since the stage is never zoom-scaled.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartFocus: WebBuilderState is not available."); return; }
  function notify(domain, action, payload) { state.notify?.(domain, action, payload); }
  const focus = () => window.WebBuilderCartFocus || {};

  // Every click on a part/component starts preventDefault() + drag,
  // regardless of the exact target (button, input, select) — nothing on
  // the cart editor stage has a working click action; every element here
  // is a pure drag handle.
  function bindFocusStageInteractions(container) {
    if (!container || container.dataset.webBuilderPartsBound === "true") return;
    container.dataset.webBuilderPartsBound = "true";
    container.addEventListener("pointerdown", e => {
      if (!state.cartFocusMode) return;

      const resizeHandle = e.target.closest?.(".cart-item-resize-handle");
      if (resizeHandle) {
        e.preventDefault(); e.stopPropagation();
        const itemEl = resizeHandle.closest(".cart-item");
        if (!itemEl) return;
        const startRect = itemEl.getBoundingClientRect();
        const startX = e.clientX, startY = e.clientY;
        const startW = startRect.width, startH = startRect.height;
        let moved = false;
        try { resizeHandle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          moved = true;
          const nextW = Math.max(120, Math.round(startW + dx));
          const nextH = Math.max(30, Math.round(startH + dy));
          state.cartConfig.itemWidth = nextW;
          state.cartConfig.itemMinHeight = nextH;
          itemEl.style.width = nextW + "px";
          itemEl.style.minHeight = nextH + "px";
          const wInput = document.getElementById("cart-item-width"), hInput = document.getElementById("cart-item-height");
          if (wInput) wInput.value = nextW;
          if (hInput) hInput.value = nextH;
        }
        function onUp() {
          resizeHandle.removeEventListener("pointermove", onMove);
          resizeHandle.removeEventListener("pointerup", onUp);
          resizeHandle.removeEventListener("pointercancel", onUp);
          try { resizeHandle.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          if (moved) {
            // Re-clamps any individually positioned sub-part
            // (icon/qty/price/remove) back inside the article's new
            // bounds — their stored pixel offset is relative to their
            // natural flow position, which the resize itself never
            // touches, so a part can otherwise end up outside the box.
            focus().clampPartLayoutsToItem?.(itemEl);
            window.WebBuilderHistory?.commit();
            notify("cart", "config", state.cartConfig);
            focus().renderStage?.();
          }
        }
        window.WebBuilderHistory?.arm();
        resizeHandle.addEventListener("pointermove", onMove);
        resizeHandle.addEventListener("pointerup", onUp);
        resizeHandle.addEventListener("pointercancel", onUp);
        return;
      }

      const compEl = e.target.closest?.("[data-cart-component]");
      if (compEl) {
        const key = compEl.dataset.cartComponent;
        e.preventDefault(); e.stopPropagation();
        focus().selectLight?.(`component:${key}`);
        // NON_POSITIONABLE components (background/itemRepresentation) are
        // selectable but never draggable.
        if (focus().NON_POSITIONABLE?.has(`component:${key}`)) return;

        const origin = state.cartConfig.componentLayout[key] || { x: 0, y: 0 };
        const startX = e.clientX, startY = e.clientY;
        let moved = false;
        let guides = null;

        // Bounds relative to the component's positioning parent — keeps
        // every top-level component inside the visible card area.
        const parentEl = compEl.closest(".cart-focus-body") || compEl.closest(".cart-focus-card");
        let bounds = null;
        if (parentEl) {
          const parentRect = parentEl.getBoundingClientRect();
          const compRect = compEl.getBoundingClientRect();
          const naturalLeft0 = compRect.left - (origin.x || 0);
          const naturalTop0 = compRect.top - (origin.y || 0);
          const rawMinX = parentRect.left - naturalLeft0;
          const rawMaxX = parentRect.right - compRect.width - naturalLeft0;
          const rawMinY = parentRect.top - naturalTop0;
          const rawMaxY = parentRect.bottom - compRect.height - naturalTop0;
          bounds = {
            minX: Math.min(rawMinX, rawMaxX), maxX: Math.max(rawMinX, rawMaxX),
            minY: Math.min(rawMinY, rawMaxY), maxY: Math.max(rawMinY, rawMaxY)
          };
        }

        // Sibling scope for snapping is simply the component's own DOM
        // parent — every component is wrapped in its own
        // <div data-cart-component> that is always a direct child of
        // whichever container it visually belongs to.
        const snapContainer = compEl.parentElement;
        let naturalLeft = null, naturalTop = null;
        if (snapContainer) {
          const compRect0 = compEl.getBoundingClientRect();
          naturalLeft = compRect0.left - (origin.x || 0);
          naturalTop = compRect0.top - (origin.y || 0);
        }

        try { compEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          if (!moved) {
            moved = true;
            if (snapContainer && window.WebBuilderAlignment?.createGuideLayer) {
              guides = window.WebBuilderAlignment.createGuideLayer(snapContainer);
            }
          }
          let nextX = origin.x + dx, nextY = origin.y + dy;
          if (bounds) {
            nextX = Math.min(bounds.maxX, Math.max(bounds.minX, nextX));
            nextY = Math.min(bounds.maxY, Math.max(bounds.minY, nextY));
          }

          if (guides && snapContainer && naturalLeft != null && window.WebBuilderAlignment?.collectSnapTargets) {
            const containerRect = snapContainer.getBoundingClientRect();
            const compRect = compEl.getBoundingClientRect();
            const localX = (naturalLeft - containerRect.left) + nextX;
            const localY = (naturalTop - containerRect.top) + nextY;
            const targets = window.WebBuilderAlignment.collectSnapTargets(snapContainer, compEl, "[data-cart-component]", 1);
            const snapped = window.WebBuilderAlignment.snapPosition(localX, localY, compRect.width, compRect.height, targets, 1);
            nextX += (snapped.x - localX);
            nextY += (snapped.y - localY);
            window.WebBuilderAlignment.updateGuideVisibility(guides, snapped.guideX, snapped.guideY);
          }

          compEl.style.transform = `translate(${nextX}px, ${nextY}px)`;
          state.cartConfig.componentLayout[key] = { x: Math.round(nextX), y: Math.round(nextY) };
        }
        function onUp() {
          compEl.removeEventListener("pointermove", onMove);
          compEl.removeEventListener("pointerup", onUp);
          compEl.removeEventListener("pointercancel", onUp);
          try { compEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          if (guides) { window.WebBuilderAlignment?.removeGuideLayer?.(guides); guides = null; }
          if (moved) { window.WebBuilderHistory?.commit(); notify("cart", "component-layout", state.cartConfig.componentLayout); }
        }
        window.WebBuilderHistory?.arm();
        compEl.addEventListener("pointermove", onMove);
        compEl.addEventListener("pointerup", onUp);
        compEl.addEventListener("pointercancel", onUp);
        return;
      }

      const partEl = e.target.closest?.("[data-cart-part]");
      if (partEl) {
        const partKey = partEl.dataset.cartPart;
        e.preventDefault(); e.stopPropagation();
        focus().selectLight?.(partKey);
        const origin = focus().getPartLayout?.(partKey) || { x: 0, y: 0 };
        const startX = e.clientX, startY = e.clientY;
        let moved = false;
        let guides = null;

        // Bounds relative to the parent box (.cart-item for cart-item
        // sub-parts, .cart-recommend-card for recommendation-card
        // sub-parts — both handled the same way, see
        // cart-editor-stage.js's resolveLayoutMap()).
        const parentEl = partEl.closest(".cart-item") || partEl.closest(".cart-recommend-card");
        let bounds = null;
        let naturalLeft = null, naturalTop = null;
        if (parentEl) {
          const parentRect = parentEl.getBoundingClientRect();
          const partRect = partEl.getBoundingClientRect();
          naturalLeft = partRect.left - (origin.x || 0);
          naturalTop = partRect.top - (origin.y || 0);
          const rawMinX = parentRect.left - naturalLeft;
          const rawMaxX = parentRect.right - partRect.width - naturalLeft;
          const rawMinY = parentRect.top - naturalTop;
          const rawMaxY = parentRect.bottom - partRect.height - naturalTop;
          bounds = {
            minX: Math.min(rawMinX, rawMaxX), maxX: Math.max(rawMinX, rawMaxX),
            minY: Math.min(rawMinY, rawMaxY), maxY: Math.max(rawMinY, rawMaxY)
          };
        }

        try { partEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          if (!moved) {
            moved = true;
            if (parentEl && window.WebBuilderAlignment?.createGuideLayer) {
              guides = window.WebBuilderAlignment.createGuideLayer(parentEl);
            }
          }
          let nextX = origin.x + dx, nextY = origin.y + dy;
          if (bounds) {
            nextX = Math.min(bounds.maxX, Math.max(bounds.minX, nextX));
            nextY = Math.min(bounds.maxY, Math.max(bounds.minY, nextY));
          }

          if (guides && parentEl && naturalLeft != null && window.WebBuilderAlignment?.collectSnapTargets) {
            const parentRect = parentEl.getBoundingClientRect();
            const partRect = partEl.getBoundingClientRect();
            const localX = (naturalLeft - parentRect.left) + nextX;
            const localY = (naturalTop - parentRect.top) + nextY;
            const targets = window.WebBuilderAlignment.collectSnapTargets(parentEl, partEl, "[data-cart-part]", 1);
            const snapped = window.WebBuilderAlignment.snapPosition(localX, localY, partRect.width, partRect.height, targets, 1);
            nextX += (snapped.x - localX);
            nextY += (snapped.y - localY);
            window.WebBuilderAlignment.updateGuideVisibility(guides, snapped.guideX, snapped.guideY);
          }

          partEl.style.transform = `translate(${nextX}px, ${nextY}px)`;
          focus().setPartLayoutSilent?.(partKey, nextX, nextY);
        }
        function onUp() {
          partEl.removeEventListener("pointermove", onMove);
          partEl.removeEventListener("pointerup", onUp);
          partEl.removeEventListener("pointercancel", onUp);
          try { partEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          if (guides) { window.WebBuilderAlignment?.removeGuideLayer?.(guides); guides = null; }
          if (moved) {
            window.WebBuilderHistory?.commit();
            const { layout } = focus().resolveLayoutMap?.(partKey) || {};
            notify("cart", "part-layout", layout);
          }
        }
        window.WebBuilderHistory?.arm();
        partEl.addEventListener("pointermove", onMove);
        partEl.addEventListener("pointerup", onUp);
        partEl.addEventListener("pointercancel", onUp);
        return;
      }

      const itemEl = e.target.closest?.(".cart-item");
      if (itemEl) {
        e.preventDefault();
        focus().select?.("component:itemRepresentation");
        return;
      }

      if (e.target.matches?.(".cart-focus-card")) {
        e.preventDefault();
        focus().select?.("component:background");
      }
    });
  }

  window.WebBuilderCartFocus = Object.assign(window.WebBuilderCartFocus || {}, { bindFocusStageInteractions });
})();
