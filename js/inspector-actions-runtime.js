// WebBuilder inspector action runtime
// Owns the live action editor UI and keeps it connected to the shared element
// and product services while builder-legacy.js remains loaded as a transition layer.
(() => {
  const state = window.WebBuilderState;
  const inspector = window.WebBuilderInspector;
  const products = window.WebBuilderProducts;
  if (!state || !inspector) {
    console.error("WebBuilderInspectorActionsRuntime: required services missing.");
    return;
  }

  let bound = false;

  const byId = id => document.getElementById(id);
  const actionSelect = () => byId("prop-action-type");
  const selected = () => inspector.getSelected?.();

  function setHidden(id, hidden) {
    const el = byId(id);
    if (el) el.classList.toggle("hidden", hidden);
  }

  function syncActionVisibility(actionType) {
    setHidden("group-action-url", actionType !== "open-url");
    setHidden("group-action-msg", actionType !== "alert-msg" && actionType !== "open-custom-modal");
    setHidden("group-product", actionType !== "cart-add");
  }

  function renderProducts() {
    const select = byId("prop-product");
    const hint = byId("prop-product-hint");
    if (!select || !products) return;

    const list = products.getAll();
    const current = selected()?.productId || "";
    select.innerHTML = '<option value="">— Produkt auswählen —</option>' + list.map(product => {
      const price = product.discountPrice != null ? product.discountPrice : product.price;
      return `<option value="${escapeAttr(product.id)}">${escapeHtml(product.name)} (${Number(price).toFixed(2)} €)</option>`;
    }).join("");
    select.value = list.some(product => product.id === current) ? current : "";
    if (hint) hint.classList.toggle("hidden", list.length > 0);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  const escapeAttr = escapeHtml;

  function render() {
    const form = byId("inspector-form");
    const empty = byId("no-selection");
    const item = selected();
    if (!form || !empty) return;

    const hasSelection = !!item;
    form.classList.toggle("hidden", !hasSelection);
    empty.classList.toggle("hidden", hasSelection);
    if (!item) return;

    const action = item.actionType || item.action || "none";
    const actionSelectEl = actionSelect();
    if (actionSelectEl) actionSelectEl.value = action;
    const url = byId("prop-action-url");
    const msg = byId("prop-action-msg");
    if (url) url.value = item.actionUrl || item.action_url || "";
    if (msg) msg.value = item.actionMsg || item.actionMessage || item.message || "";
    syncActionVisibility(action);
    renderProducts();
  }

  function updateField(field, value) {
    const item = selected();
    if (!item) return;
    inspector.updateField(item.id, field, value, true);
    render();
  }

  function handleActionType(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const value = event.target.value || "none";
    updateField("actionType", value);
    syncActionVisibility(value);
  }

  function handleActionValue(event, field) {
    event.preventDefault();
    event.stopImmediatePropagation();
    updateField(field, event.target.value);
  }

  function bind() {
    if (bound) return;
    const select = actionSelect();
    const url = byId("prop-action-url");
    const msg = byId("prop-action-msg");
    const product = byId("prop-product");
    if (!select) return;

    bound = true;
    select.addEventListener("change", handleActionType, true);
    url?.addEventListener("change", event => handleActionValue(event, "actionUrl"), true);
    msg?.addEventListener("change", event => handleActionValue(event, "actionMsg"), true);
    product?.addEventListener("change", event => handleActionValue(event, "productId"), true);

    state.subscribe?.(event => {
      if (["elements", "selection", "products"].includes(event?.domain)) render();
    });
    window.addEventListener("webbuilder:state-change", event => {
      if (["elements", "selection", "products"].includes(event.detail?.domain)) render();
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", () => window.setTimeout(bind, 0));

  window.WebBuilderInspectorActionsRuntime = { bind, render, renderProducts };
})();
