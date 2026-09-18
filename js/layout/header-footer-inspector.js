// js/layout/header-footer-inspector.js
// WebBuilder header/footer UI: the left sidebar's element list + background
// controls (#header-items-list/#footer-items-list, #header-bg-*/#footer-bg-*)
// and the right-hand inspector panel for a selected bar element
// (#bar-inspector-form). render() is the master refresh for this whole
// domain — it re-syncs the sidebar toggles/lists/bg controls, re-renders
// the right panel, and re-renders the bars on canvas (via
// layout/header-footer-render.js's renderBars(), reached only through
// window.WebBuilderHeaderFooterRuntime at runtime, so no load-order
// dependency on that file is needed here). Must load after
// layout/header-footer-data.js.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderHeaderFooterInspector: shared state missing."); return; }
  const hf = window.WebBuilderHeaderFooter;
  if (!hf) { console.error("WebBuilderHeaderFooterInspector: WebBuilderHeaderFooter is not available."); return; }
  const byId = id => document.getElementById(id), esc = window.WebBuilderUtils.escapeHtml;
  const runtime = () => window.WebBuilderHeaderFooterRuntime || {};

  function renderList(target) {
    const list = byId(target === "footer" ? "footer-items-list" : "header-items-list");
    if (!list) return;
    const items = target === "footer" ? state.footerItems : state.headerItems;
    list.innerHTML = items.length ? "" : '<p class="help-text">Noch keine Elemente.</p>';
    items.forEach(item => {
      const isSel = state.selectedBarItemRef && state.selectedBarItemRef.target === target && state.selectedBarItemRef.id === item.id;
      const row = document.createElement("div");
      row.className = "item-row" + (isSel ? " active-item-row" : "");
      row.innerHTML = `<button type="button" class="bar-item-select" data-id="${esc(item.id)}" style="flex:1;text-align:left;">${item.type === "icon" ? esc(item.iconName || "Icon") : esc(item.text || "Text")}</button><button type="button" class="item-delete bar-item-delete" data-id="${esc(item.id)}">✕</button>`;
      list.appendChild(row);
    });
  }

  function syncBgControls(target) {
    const type = target === "footer" ? state.footerBgType : state.headerBgType;
    const color = target === "footer" ? state.footerBgColor : state.headerBgColor;
    const image = target === "footer" ? state.footerBgImage : state.headerBgImage;
    const typeSel = byId(`${target}-bg-type`), colorInput = byId(`${target}-bg-input`), urlInput = byId(`${target}-bg-image-url`);
    if (typeSel) typeSel.value = type;
    if (colorInput) colorInput.value = color;
    if (urlInput && document.activeElement !== urlInput) urlInput.value = image || "";
    byId(`${target}-bg-solid-group`)?.classList.toggle("hidden", type !== "solid");
    byId(`${target}-bg-image-group`)?.classList.toggle("hidden", type !== "image");
  }

  // Defers while dragLock is true: renderBars() rebuilds DOM nodes and
  // would break an active drag's pointer capture (see
  // canvas/canvas.js scheduleRender() for the same convention).
  function render() {
    if (state.dragLock) {
      if (window.requestAnimationFrame) window.requestAnimationFrame(render); else window.setTimeout(render, 16);
      return;
    }
    const h = hf.getHeader(), f = hf.getFooter();
    if (byId("header-toggle")) byId("header-toggle").checked = h.enabled;
    if (byId("header-sticky-toggle")) byId("header-sticky-toggle").checked = h.sticky;
    if (byId("header-height-input")) byId("header-height-input").value = h.height;
    if (byId("footer-toggle")) byId("footer-toggle").checked = f.enabled;
    if (byId("footer-height-input")) byId("footer-height-input").value = f.height;
    syncBgControls("header");
    syncBgControls("footer");
    renderList("header"); renderList("footer");
    renderEditor();
    runtime().renderBars?.();
  }

  function populateBarIconSelect(selectEl, selectedName) {
    if (!selectEl) return;
    const registry = window.WebBuilderIconRegistry;
    const allIcons = registry && typeof registry.getAll === "function" ? registry.getAll() : {};
    const names = Object.keys(allIcons);
    selectEl.innerHTML = names.length
      ? names.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join("")
      : '<option value="">— Kein Icon verfügbar —</option>';
    if (selectedName && names.includes(selectedName)) selectEl.value = selectedName;
  }

  function renderEditor() {
    const panel = byId("bar-inspector-form");
    const emptyMsg = byId("no-selection");
    const elementForm = byId("inspector-form");
    // Der Warenkorb-Editor läuft im Hintergrund weiter, wenn ein Kopf-/
    // Fußzeilen-Element ausgewählt wird — #cart-inspector-form tritt dafür
    // nur vorübergehend zur Seite und kommt automatisch zurück, sobald
    // kein Bar-Item mehr selektiert ist.
    const cartForm = byId("cart-inspector-form");
    const sel = runtime().currentSelection?.();
    const showBar = !!sel && !state.selectedElementId;
    if (panel) panel.classList.toggle("hidden", !showBar);
    if (showBar) {
      elementForm?.classList.add("hidden");
      emptyMsg?.classList.add("hidden");
      cartForm?.classList.add("hidden");
    } else {
      if (!state.selectedElementId && !state.cartFocusMode) emptyMsg?.classList.remove("hidden");
      if (state.cartFocusMode) cartForm?.classList.remove("hidden");
    }
    if (!sel) return;
    const { item } = sel;
    const isIcon = item.type === "icon";
    byId("bar-item-text-group")?.classList.toggle("hidden", isIcon);
    byId("bar-group-icon")?.classList.toggle("hidden", !isIcon);
    if (isIcon) populateBarIconSelect(byId("bar-prop-icon"), item.iconName);
    if (byId("bar-prop-hover-highlight")) byId("bar-prop-hover-highlight").checked = item.hoverHighlight !== false;
    if (byId("bar-prop-text") && document.activeElement !== byId("bar-prop-text")) byId("bar-prop-text").value = item.text || "";
    if (byId("bar-prop-size") && document.activeElement !== byId("bar-prop-size")) byId("bar-prop-size").value = Number(item.size) || 16;
    if (byId("bar-prop-color")) byId("bar-prop-color").value = item.color || "#ffffff";
    if (byId("bar-prop-font-family")) byId("bar-prop-font-family").value = item.fontFamily || "inherit";
    ["bold", "italic", "underline"].forEach(f => byId(`bar-ttb-${f}`)?.classList.toggle("active", !!item[f]));
    ["left", "center", "right"].forEach(a => byId(`bar-ttb-align-${a}`)?.classList.toggle("active", (item.align || "left") === a));
    if (byId("bar-prop-action-type")) byId("bar-prop-action-type").value = item.actionType || "none";
    if (byId("bar-prop-action-url") && document.activeElement !== byId("bar-prop-action-url")) byId("bar-prop-action-url").value = item.actionUrl || "";
    if (byId("bar-prop-action-msg") && document.activeElement !== byId("bar-prop-action-msg")) byId("bar-prop-action-msg").value = item.actionMsg || "";
    byId("bar-group-action-url")?.classList.toggle("hidden", item.actionType !== "open-url");
    byId("bar-group-action-msg")?.classList.toggle("hidden", !["alert-msg", "open-custom-modal"].includes(item.actionType));
    byId("bar-group-product")?.classList.toggle("hidden", item.actionType !== "cart-add");

    const isModal = item.actionType === "open-custom-modal";
    const isAlert = item.actionType === "alert-msg";
    if (byId("bar-prop-modal-title") && document.activeElement !== byId("bar-prop-modal-title")) byId("bar-prop-modal-title").value = item.modalTitle || "";
    if (byId("bar-prop-modal-body") && document.activeElement !== byId("bar-prop-modal-body")) byId("bar-prop-modal-body").value = item.modalBody || "";
    if (byId("bar-prop-modal-footer") && document.activeElement !== byId("bar-prop-modal-footer")) byId("bar-prop-modal-footer").value = item.modalFooter || "";
    if (byId("bar-prop-message-position")) byId("bar-prop-message-position").value = item.messagePosition || "bottom-right";
    byId("bar-group-modal-title")?.classList.toggle("hidden", !isModal);
    byId("bar-group-modal-body")?.classList.toggle("hidden", !isModal);
    byId("bar-group-modal-footer")?.classList.toggle("hidden", !isModal);
    byId("bar-group-message-position")?.classList.toggle("hidden", !isAlert);

    const productSel = byId("bar-prop-product");
    if (productSel) {
      const list = window.WebBuilderProducts?.getAll?.() || [];
      productSel.innerHTML = list.length ? list.map(p => `<option value="${esc(p.id)}">${esc(p.icon || "📦")} ${esc(p.name)} — ${Number(p.discountPrice != null ? p.discountPrice : p.price).toFixed(2)} €</option>`).join("") : '<option value="">— Kein Produkt —</option>';
      productSel.value = item.productId || "";
    }
  }

  function updateSelected(patch) {
    const sel = runtime().currentSelection?.();
    if (!sel) return;
    transact(() => hf.updateItem(sel.ref.id, patch, sel.ref.target, false));
  }

  function transact(fn) { window.WebBuilderHistory?.arm(); fn(); window.WebBuilderHistory?.commit(); render(); }
  function bindControl(id, fn, event = "change") { byId(id)?.addEventListener(event, e => { e.preventDefault(); e.stopImmediatePropagation(); transact(() => fn(e)); }, true); }

  function bindBgControls(target) {
    byId(`${target}-bg-type`)?.addEventListener("change", e => { transact(() => { if (target === "footer") state.footerBgType = e.target.value === "image" ? "image" : "solid"; else state.headerBgType = e.target.value === "image" ? "image" : "solid"; }); }, true);
    byId(`${target}-bg-input`)?.addEventListener("input", e => { transact(() => { if (target === "footer") state.footerBgColor = e.target.value; else state.headerBgColor = e.target.value; }); }, true);
    byId(`${target}-bg-image-url`)?.addEventListener("change", e => { transact(() => { if (target === "footer") state.footerBgImage = e.target.value; else state.headerBgImage = e.target.value; }); }, true);
    byId(`${target}-bg-image-file`)?.addEventListener("change", e => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        transact(() => {
          if (target === "footer") { state.footerBgImage = reader.result; state.footerBgType = "image"; }
          else { state.headerBgImage = reader.result; state.headerBgType = "image"; }
        });
      };
      reader.readAsDataURL(file);
    }, true);
  }

  function bind() {
    bindControl("header-toggle", e => hf.updateHeader({ enabled: e.target.checked }, false));
    bindControl("header-sticky-toggle", e => hf.updateHeader({ sticky: e.target.checked }, false));
    bindControl("header-height-input", e => hf.updateHeader({ height: e.target.value }, false));
    bindControl("footer-toggle", e => hf.updateFooter({ enabled: e.target.checked }, false));
    bindControl("footer-height-input", e => hf.updateFooter({ height: e.target.value }, false));
    bindBgControls("header");
    bindBgControls("footer");

    [["btn-add-header-text", "header", "text"], ["btn-add-header-icon", "header", "icon"], ["btn-add-footer-text", "footer", "text"], ["btn-add-footer-icon", "footer", "icon"]].forEach(([id, t, type]) => byId(id)?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      transact(() => {
        const i = hf.addItem(type, t, type === "icon" ? { iconName: "arrow-right" } : { text: "Neuer Text" }, false);
        state.selectedBarItemRef = { target: t, id: i.id };
        window.WebBuilderElements?.setSelected?.(null);
      });
    }, true));

    document.addEventListener("click", e => {
      const s = e.target.closest?.(".bar-item-select"), d = e.target.closest?.(".bar-item-delete");
      if (s) { e.preventDefault(); e.stopImmediatePropagation(); const l = s.closest("[id$='items-list']"); runtime().selectItem?.(l?.id === "footer-items-list" ? "footer" : "header", s.dataset.id); }
      if (d) { e.preventDefault(); e.stopImmediatePropagation(); const l = d.closest("[id$='items-list']"), t = l?.id === "footer-items-list" ? "footer" : "header"; transact(() => hf.removeItem(d.dataset.id, t, false)); }
    }, true);

    [["bar-prop-text", "text"], ["bar-prop-color", "color"], ["bar-prop-font-family", "fontFamily"], ["bar-prop-action-url", "actionUrl"], ["bar-prop-action-msg", "actionMsg"], ["bar-prop-product", "productId"], ["bar-prop-modal-title", "modalTitle"], ["bar-prop-modal-body", "modalBody"], ["bar-prop-modal-footer", "modalFooter"], ["bar-prop-message-position", "messagePosition"]].forEach(([id, f]) => byId(id)?.addEventListener("change", e => updateSelected({ [f]: e.target.value }), true));
    byId("bar-prop-icon")?.addEventListener("change", e => updateSelected({ iconName: e.target.value }), true);
    byId("bar-prop-hover-highlight")?.addEventListener("change", e => updateSelected({ hoverHighlight: e.target.checked }), true);
    byId("bar-prop-size")?.addEventListener("change", e => updateSelected({ size: Math.max(8, Math.min(300, Number(e.target.value) || 16)) }), true);
    byId("bar-prop-action-type")?.addEventListener("change", e => updateSelected({ actionType: e.target.value }), true);
    ["bold", "italic", "underline"].forEach(f => byId(`bar-ttb-${f}`)?.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); const sel = runtime().currentSelection?.(); if (sel) updateSelected({ [f]: !sel.item[f] }); }, true));
    ["left", "center", "right"].forEach(a => byId(`bar-ttb-align-${a}`)?.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); updateSelected({ align: a }); }, true));
    byId("btn-delete-bar-item")?.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); const sel = runtime().currentSelection?.(); if (sel) transact(() => hf.removeItem(sel.ref.id, sel.ref.target, false)); }, true);

    hf.onChange(render);
    // header/footer changes arrive via onChange() above; state.notify()
    // only covers products/preview here.
    state.subscribe?.(e => { if (["products", "preview"].includes(e?.domain)) render(); });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, { once: true });
  else bind();

  window.WebBuilderHeaderFooterRuntime = Object.assign(window.WebBuilderHeaderFooterRuntime || {}, { render });
})();
