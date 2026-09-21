// js/layout/header-footer-render.js
// WebBuilder header/footer canvas rendering: builds the header/footer bar
// DOM elements on #canvas, their resize handle, and drag/click
// interaction for bar items (via canvas/alignment.js's shared
// attachInteraction()). Also owns bar-item selection state
// (currentSelection/selectItem/clearSelection), since selection directly
// drives which bar item's highlight class gets rendered here. Data lives
// in layout/header-footer-data.js (window.WebBuilderHeaderFooter) — must
// load after it. The right-hand inspector panel + left sidebar item list
// live in layout/header-footer-inspector.js; this file calls into it only
// through window.WebBuilderHeaderFooterRuntime at runtime, never at parse
// time, so there is no load-order requirement between the two.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderHeaderFooterRender: shared state missing."); return; }
  const hf = window.WebBuilderHeaderFooter;
  if (!hf) { console.error("WebBuilderHeaderFooterRender: WebBuilderHeaderFooter is not available."); return; }
  const esc = window.WebBuilderUtils.escapeHtml;

  function currentSelection() {
    const ref = state.selectedBarItemRef;
    if (!ref) return null;
    const items = ref.target === "footer" ? state.footerItems : state.headerItems;
    const item = items.find(x => x.id === ref.id);
    return item ? { ref, item } : null;
  }

  // Deselect canvas element too — mirrors editor/inspector.js select();
  // panels are mutually exclusive. Calls select(null) (never a real id),
  // so selecting a header/footer element never triggers the "leave cart
  // editor" branch in editor/inspector.js select().
  function selectItem(target, id) {
    state.selectedBarItemRef = { target, id };
    if (window.WebBuilderInspector?.select) window.WebBuilderInspector.select(null);
    else if (window.WebBuilderElements) window.WebBuilderElements.setSelected(null);
    // Phase 2 flow-layout selection (Section/Row/Card) is a fourth,
    // mutually exclusive right-hand panel that has no equivalent
    // notify() call to react to — see canvas/sections-render.js.
    window.WebBuilderSectionsRuntime?.clearSelection?.();
    window.WebBuilderHeaderFooterRuntime?.render?.();
  }

  function clearSelection() {
    if (!state.selectedBarItemRef) return;
    state.selectedBarItemRef = null;
    window.WebBuilderHeaderFooterRuntime?.render?.();
  }

  function iconMarkup(name) {
    const registry = window.WebBuilderIconRegistry;
    const m = registry && typeof registry.get === "function" ? registry.get(name) : null;
    return m || "";
  }

  function itemInnerHtml(item) {
    const textDeco = item.underline ? "underline" : "none", fontFam = item.fontFamily || "inherit", align = item.align || "left";
    if (item.type === "icon") {
      return `<span style="display:inline-flex;width:${Number(item.size) || 24}px;height:${Number(item.size) || 24}px;color:${item.color || "#fff"};">${iconMarkup(item.iconName)}</span>`;
    }
    return `<span style="font-size:${Number(item.size) || 16}px;color:${item.color || "#fff"};font-weight:${item.bold ? "bold" : "400"};font-style:${item.italic ? "italic" : "normal"};text-decoration:${textDeco};font-family:${fontFam};text-align:${align};white-space:nowrap;">${esc(item.text || "")}</span>`;
  }

  function backgroundCss(target) {
    const type = target === "footer" ? state.footerBgType : state.headerBgType;
    const color = target === "footer" ? state.footerBgColor : state.headerBgColor;
    const image = target === "footer" ? state.footerBgImage : state.headerBgImage;
    if (type === "image" && image) return `background-color:${color};background-image:url("${image}");background-size:cover;background-position:center;background-repeat:no-repeat;`;
    return `background-color:${color};background-image:none;`;
  }

  function bindResizeHandle(handle, target) {
    handle.addEventListener("mousedown", e => {
      e.preventDefault(); e.stopPropagation();
      const isFooter = target === "footer";
      const bar = handle.closest(".builder-bar");
      if (!bar) return;
      const barRect = bar.getBoundingClientRect();
      const fixedEdgeY = isFooter ? barRect.bottom : barRect.top;
      const zoom = Number(state.zoomLevel) || 1;
      window.WebBuilderHistory?.arm();
      const onMove = moveEvent => {
        const rawHeight = isFooter ? (fixedEdgeY - moveEvent.clientY) / zoom : (moveEvent.clientY - fixedEdgeY) / zoom;
        const clamped = Math.max(40, Math.min(400, Math.round(rawHeight)));
        if (isFooter) state.footerHeight = clamped; else state.headerHeight = clamped;
        // Reflow items live while dragging so they never sit outside the
        // shrinking bar until released.
        hf.clampItemsToHeight(isFooter ? state.footerItems : state.headerItems, clamped);
        window.WebBuilderHeaderFooterRuntime?.renderBars?.();
        const input = document.getElementById(isFooter ? "footer-height-input" : "header-height-input");
        if (input) input.value = clamped;
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        window.WebBuilderHistory?.commit();
        hf.emitChange(target, isFooter ? hf.getFooter() : hf.getHeader());
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  // Reuses canvas/alignment.js's attachInteraction() so bar items
  // drag/click like canvas elements — including alignment-guide snapping.
  function bindBarItemInteraction(domEl, item, barEl, target, cfg) {
    const alignment = window.WebBuilderAlignment;
    if (!alignment?.attachInteraction) { console.error("WebBuilderHeaderFooterRender: WebBuilderAlignment.attachInteraction missing."); return; }
    alignment.attachInteraction(domEl, item, barEl, {
      getBounds() {
        const zoom = Number(state.zoomLevel) || 1;
        const rect = barEl.getBoundingClientRect();
        const width = rect.width / zoom;
        return { minX: 0, minY: 0, maxX: Math.max(0, width - 10), maxY: Math.max(0, (Number(cfg.height) || 0) - 10) };
      },
      snapSelector: ".bar-item",
      onDragEnd() { hf.emitChange(target, target === "footer" ? hf.getFooter() : hf.getHeader()); },
      onClick() {
        if (state.isPreviewMode) { window.WebBuilderActionRuntime?.execute?.(item); return; }
        selectItem(target, item.id);
      }
    });
  }

  function buildBarElement(target) {
    const isFooter = target === "footer";
    const cfg = isFooter ? hf.getFooter() : hf.getHeader();
    const bar = document.createElement("div");
    const useSticky = !isFooter && cfg.sticky && state.isPreviewMode;
    bar.className = "builder-bar" + (useSticky ? " sticky-header" : "");
    bar.dataset.barTarget = target;
    bar.style.position = useSticky ? "sticky" : "absolute";
    bar.style.left = "0"; bar.style.right = "0";
    if (isFooter) bar.style.bottom = "0"; else bar.style.top = "0";
    bar.style.height = cfg.height + "px";
    bar.style.zIndex = isFooter ? "250" : "300";
    bar.style.cssText += backgroundCss(target);

    cfg.items.forEach(item => {
      const el = document.createElement("div");
      const isSelected = state.selectedBarItemRef && state.selectedBarItemRef.target === target && state.selectedBarItemRef.id === item.id;
      el.className = "bar-item" + (isSelected ? " bar-item-selected" : "") + (item.actionType && item.actionType !== "none" ? " has-action" : "") + (item.hoverHighlight === false ? " no-hover-highlight" : "");
      el.style.left = (Number(item.x) || 0) + "px";
      el.style.top = (Number(item.y) || 0) + "px";
      el.dataset.id = item.id;
      el.innerHTML = itemInnerHtml(item);

      const badge = document.createElement("span");
      badge.className = "element-badge";
      badge.innerText = "⚡ Logik";
      el.appendChild(badge);

      bindBarItemInteraction(el, item, bar, target, cfg);

      bar.appendChild(el);
    });

    if (!state.isPreviewMode) {
      const handle = document.createElement("div");
      handle.className = "bar-resize-handle " + (isFooter ? "top" : "bottom");
      bindResizeHandle(handle, target);
      bar.appendChild(handle);
    }

    bar.addEventListener("click", e => { if (e.target === bar && !state.isPreviewMode) clearSelection(); }, true);
    return bar;
  }

  function renderBars() {
    const canvasEl = document.getElementById("canvas");
    if (!canvasEl) return;
    canvasEl.querySelectorAll(".builder-bar").forEach(el => el.remove());
    if (state.headerEnabled) canvasEl.insertBefore(buildBarElement("header"), canvasEl.firstChild);
    if (state.footerEnabled) canvasEl.appendChild(buildBarElement("footer"));
  }

  // Object.assign onto an existing object (rather than a plain
  // assignment) so this file's load order relative to
  // header-footer-inspector.js doesn't matter: whichever of the two
  // loads first creates window.WebBuilderHeaderFooterRuntime, the other
  // extends it.
  window.WebBuilderHeaderFooterRuntime = Object.assign(window.WebBuilderHeaderFooterRuntime || {}, {
    renderBars, selectItem, clearSelection, currentSelection, itemInnerHtml
  });
})();
