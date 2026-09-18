// js/editor/inspector.js
// Right-hand inspector panel for canvas elements: selection, CRUD, and
// the core + click-action field groups. The "Erweiterte Eigenschaften"
// block lives in editor/inspector-special.js, reached only through
// window.WebBuilderInspector at runtime — no load-order requirement
// between the two.
(() => {
  const state = window.WebBuilderState;
  const elements = window.WebBuilderElements;
  if (!state || !elements) {
    console.error("WebBuilderInspector: shared state/elements service missing.");
    return;
  }

  function refreshCanvas() {
    window.WebBuilderCanvas?.render?.();
  }

  function getSelected() {
    return elements.getSelected();
  }

  // Selecting a real canvas element ends an open cart editor and
  // deselects any bar item — only one right-hand panel is shown at a
  // time. Called with id = null from header-footer-render.js's
  // selectItem() purely to clear the canvas selection, which must NOT
  // end the cart editor (gated on id != null).
  function select(id) {
    if (id != null && window.WebBuilderCartFocus?.isActive?.()) {
      window.WebBuilderCartFocus.exit();
    }
    const selected = elements.setSelected(id);
    if (id != null && state.selectedBarItemRef) {
      state.selectedBarItemRef = null;
    }
    if (id != null) {
      window.WebBuilderHeaderFooterRuntime?.render?.();
    }
    refreshCanvas();
    return selected;
  }

  function update(id, patch, recordHistory = true) {
    const target = id == null ? state.selectedElementId : id;
    if (!target || !elements.getById(target)) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    const updated = elements.update(target, patch);
    if (recordHistory) window.WebBuilderHistory?.commit();
    if (updated) refreshCanvas();
    return updated;
  }

  function updateField(id, field, value, recordHistory = true) {
    return field ? update(id, { [field]: value }, recordHistory) : null;
  }

  function remove(id, recordHistory = true) {
    const target = id == null ? state.selectedElementId : id;
    if (!target || !elements.getById(target)) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    const ok = elements.remove(target);
    if (recordHistory) window.WebBuilderHistory?.commit();
    if (ok) refreshCanvas();
    return ok;
  }

  function duplicate(id, recordHistory = true) {
    const target = id == null ? state.selectedElementId : id;
    if (!target || !elements.getById(target)) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    const copy = elements.duplicate(target);
    if (copy) elements.setSelected(copy.id);
    if (recordHistory) window.WebBuilderHistory?.commit();
    if (copy) refreshCanvas();
    return copy;
  }

  const byId = id => document.getElementById(id);
  // esc centralized in core/utils.js (WebBuilderUtils.escapeHtml).
  const esc = window.WebBuilderUtils.escapeHtml;

  function renderCore() {
    const form = byId("inspector-form");
    const empty = byId("no-selection");
    const item = getSelected();
    if (!form || !empty) return;

    const hasSelection = !!item;
    const barItems = state.selectedBarItemRef
      ? (state.selectedBarItemRef.target === "footer" ? state.footerItems : state.headerItems)
      : null;
    const barActive = !!(state.selectedBarItemRef && barItems && barItems.some(x => x.id === state.selectedBarItemRef.id));

    form.classList.toggle("hidden", !hasSelection);
    // Stays hidden while a bar item is selected (#bar-inspector-form
    // takes its place) or the cart editor is open (#cart-inspector-form
    // takes its place).
    empty.classList.toggle("hidden", hasSelection || barActive || state.cartFocusMode);
    if (!item) return;

    const values = {
      "prop-id": item.id || "",
      "prop-text": item.text || "",
      "prop-size": Number(item.size) || 18,
      "prop-color": item.color || "#000000",
      "prop-font-family": item.fontFamily || "inherit",
      "prop-image-url": item.imageUrl || ""
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = byId(id);
      if (el && document.activeElement !== el) el.value = value;
    });

    const isImage = item.type === "image";
    const isTextLike = ["text", "headline", "button"].includes(item.type);
    ["group-image", "group-text", "group-color"].forEach(id => {
      byId(id)?.classList.toggle(
        "hidden",
        id === "group-image" ? !isImage : id === "group-text" ? (isImage || item.type === "shape" || item.type === "icon") : !isTextLike
      );
    });
    ["bold", "italic", "underline"].forEach(f => byId(`ttb-${f}`)?.classList.toggle("active", !!item[f]));
    ["left", "center", "right"].forEach(a => byId(`ttb-align-${a}`)?.classList.toggle("active", (item.align || "left") === a));
  }

  function updateCore(field, value) {
    const item = getSelected();
    if (!item) return;
    updateField(item.id, field, value, true);
    renderAll();
  }

  function renderActions() {
    const item = getSelected();
    if (!item) return;

    const action = item.actionType || "none";
    const actionSelect = byId("prop-action-type");
    if (actionSelect) actionSelect.value = action;

    const urlInput = byId("prop-action-url");
    const msgInput = byId("prop-action-msg");
    const productSelect = byId("prop-product");
    if (urlInput && document.activeElement !== urlInput) urlInput.value = item.actionUrl || "";
    if (msgInput && document.activeElement !== msgInput) msgInput.value = item.actionMsg || "";

    byId("group-action-url")?.classList.toggle("hidden", action !== "open-url");
    byId("group-action-msg")?.classList.toggle("hidden", !["alert-msg", "open-custom-modal"].includes(action));
    byId("group-product")?.classList.toggle("hidden", action !== "cart-add");

    if (productSelect) {
      const list = window.WebBuilderProducts?.getAll?.() || [];
      productSelect.innerHTML = '<option value="">— Produkt auswählen —</option>'
        + list.map(p => `<option value="${esc(p.id)}">${esc(p.name)} (${Number(p.discountPrice != null ? p.discountPrice : p.price).toFixed(2)} €)</option>`).join("");
      productSelect.value = list.some(p => p.id === item.productId) ? item.productId : "";
    }
  }

  function renderAll() {
    renderCore();
    renderActions();
    window.WebBuilderInspector?.renderSpecial?.();
  }

  function bind() {
    [
      ["prop-text", "text"], ["prop-size", "size"], ["prop-color", "color"],
      ["prop-font-family", "fontFamily"], ["prop-image-url", "imageUrl"]
    ].forEach(([id, field]) => byId(id)?.addEventListener("change", e => {
      let value = e.target.value;
      if (field === "size") value = Math.max(12, Math.min(800, Number(value) || 18));
      updateCore(field, value);
    }, true));

    byId("prop-image-file")?.addEventListener("change", e => {
      const file = e.target.files?.[0];
      const item = getSelected();
      if (!file || !item || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => { if (typeof reader.result === "string") updateCore("imageUrl", reader.result); };
      reader.readAsDataURL(file);
    }, true);

    ["bold", "italic", "underline"].forEach(f => byId(`ttb-${f}`)?.addEventListener("click", e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const item = getSelected();
      if (item) updateCore(f, !item[f]);
    }, true));

    ["left", "center", "right"].forEach(a => byId(`ttb-align-${a}`)?.addEventListener("click", e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      updateCore("align", a);
    }, true));

    byId("btn-delete-element")?.addEventListener("click", e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const item = getSelected();
      if (item) remove(item.id, true);
      renderAll();
    }, true);

    // duplicate() already selects the copy; renderAll() follows via the
    // "selection" subscribe below.
    byId("btn-duplicate-element")?.addEventListener("click", e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      const item = getSelected();
      if (item) duplicate(item.id, true);
    }, true);

    byId("prop-action-type")?.addEventListener("change", e => {
      const item = getSelected();
      if (item) update(item.id, { actionType: e.target.value }, true);
      renderAll();
    }, true);

    [
      ["prop-action-url", "actionUrl"], ["prop-action-msg", "actionMsg"], ["prop-product", "productId"]
    ].forEach(([id, field]) => byId(id)?.addEventListener("change", e => {
      const item = getSelected();
      if (item) update(item.id, { [field]: e.target.value }, true);
      renderAll();
    }, true));

    state.subscribe?.(e => { if (["elements", "selection", "products"].includes(e?.domain)) renderAll(); });
    renderAll();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));

  window.WebBuilderInspector = Object.assign(window.WebBuilderInspector || {}, {
    getSelected, select, update, updateField, remove, duplicate, renderAll
  });
})();
