// js/shop/cart-editor-bindings.js
// WebBuilder cart focus editor — field bindings.
// Owns every event listener for the #cart-inspector-form fields plus the
// "open/close editor" buttons: translates user input into
// cart.setConfig()/cart.setItemDisplay() calls and refreshes the
// drawer/stage/panel afterwards. Stage rendering, selection and the
// layout data model live in cart-editor-stage.js, panel rendering in
// cart-editor-panel.js — both reached here only through
// window.WebBuilderCartFocus.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartFocus: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartFocus: WebBuilderCart is not available."); return; }
  const focus = () => window.WebBuilderCartFocus || {};
  function refreshCartViews() { window.WebBuilderCartRuntime?.refresh?.(); }

  function bindFocusEditor() {
    document.getElementById("btn-cart-focus-editor")?.addEventListener("click", e => { e.preventDefault(); focus().enter?.(); }, true);
    document.getElementById("btn-cart-focus-exit")?.addEventListener("click", e => { e.preventDefault(); focus().exit?.(); }, true);
    document.getElementById("btn-select-item-representation")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!state.cartFocusMode) focus().enter?.();
      focus().select?.("component:itemRepresentation");
    }, true);

    document.getElementById("cart-comp-title-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ cartTitleLabel: e.target.value.trim() || `Dein Warenkorb (${cart.TITLE_COUNT_PLACEHOLDER})` }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-part-x")?.addEventListener("change", e => {
      if (!state.cartFocusSelectedPart) return;
      const layout = focus().getSelectedLayout?.() || { x: 0, y: 0 };
      focus().setSelectedLayout?.(Number(e.target.value) || 0, layout.y);
      focus().renderStage?.();
    }, true);
    document.getElementById("cart-part-y")?.addEventListener("change", e => {
      if (!state.cartFocusSelectedPart) return;
      const layout = focus().getSelectedLayout?.() || { x: 0, y: 0 };
      focus().setSelectedLayout?.(layout.x, Number(e.target.value) || 0);
      focus().renderStage?.();
    }, true);
    document.getElementById("cart-part-reset")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (state.cartFocusSelectedPart) { focus().resetSelectedLayout?.(); focus().renderStage?.(); focus().renderPartPanel?.(); }
    }, true);

    document.getElementById("cart-comp-checkout-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setButtonLabel(e.target.value, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-checkout-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ buttonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-checkout-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ buttonShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-discount-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ discountButtonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-discount-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ discountButtonShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-discount-percent")?.addEventListener("change", e => {
      const raw = e.target.value;
      const v = raw === "" ? 10 : Math.max(0, Math.min(100, Number(raw) || 0));
      window.WebBuilderHistory?.arm(); cart.setConfig({ milestoneDiscountPercent: v }, false); window.WebBuilderHistory?.commit();
      window.WebBuilderCartConfigRuntime?.renderMilestoneList?.();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-discount-threshold")?.addEventListener("change", e => {
      const raw = e.target.value;
      const v = raw === "" ? null : Math.max(0, Number(raw) || 0);
      window.WebBuilderHistory?.arm();
      cart.setConfig({ milestoneDiscountThreshold: v }, false);
      const synced = v != null ? cart.syncDiscountMilestone(v, false) : false;
      window.WebBuilderHistory?.commit();
      if (synced) {
        window.WebBuilderToast?.show?.(`Rabatt-Ziel auf ${cart.formatCurrency(v)} geändert.`, "info");
        window.WebBuilderCartConfigRuntime?.renderMilestoneList?.();
      }
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-progress-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ progressBarColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-progress-complete-text")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ progressCompleteText: e.target.value.trim() || "✓ Alle Ziele freigeschaltet" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-bg-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ cardBackgroundColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-currency")?.addEventListener("change", e => {
      const preset = cart.CURRENCY_PRESETS[e.target.value] || cart.CURRENCY_PRESETS.eur;
      window.WebBuilderHistory?.arm(); cart.setConfig({ currency: Object.assign({}, preset) }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-subtotal-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ subtotalLabel: e.target.value.trim() || "Zwischensumme" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-discount-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ discountLabel: e.target.value.trim() || "Rabatt" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-total-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ totalLabel: e.target.value.trim() || "Gesamt" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.getElementById("cart-comp-free-product-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ freeProductLabel: e.target.value.trim() || "🎁 Gratis-Produkt" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-free-product-value")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ freeProductValueText: e.target.value.trim() || "freigeschaltet" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    // Dividers are an arbitrarily repeatable component. A new divider
    // starts at the top of the cart body and is selected immediately so
    // it can be dragged into place.
    document.getElementById("btn-add-divider")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!state.cartFocusMode) focus().enter?.();
      const divider = cart.addDivider();
      if (divider) focus().select?.(`${focus().DIVIDER_PREFIX}${divider.id}`);
    }, true);
    document.getElementById("btn-remove-divider")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      const sel = state.cartFocusSelectedPart;
      if (!focus().isDividerKey?.(sel)) return;
      cart.removeDivider(sel.slice(focus().DIVIDER_PREFIX.length));
      state.cartFocusSelectedPart = null;
      focus().renderStage?.();
      focus().renderPartPanel?.();
    }, true);

    document.getElementById("cart-comp-shipping-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ shippingLabel: e.target.value.trim() || "Versand" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-shipping-cost")?.addEventListener("change", e => {
      const v = Math.max(0, Number(e.target.value) || 0);
      window.WebBuilderHistory?.arm(); cart.setConfig({ shippingCost: v }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-shipping-free-text")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ shippingFreeText: e.target.value.trim() || "Kostenlos" }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-shipping-free-threshold")?.addEventListener("change", e => {
      const raw = e.target.value;
      const v = raw === "" ? null : Math.max(0, Number(raw) || 0);
      window.WebBuilderHistory?.arm();
      cart.setConfig({ shippingFreeThreshold: v }, false);
      const synced = v != null ? cart.syncFreeShippingMilestone(v, false) : false;
      window.WebBuilderHistory?.commit();
      if (synced) {
        window.WebBuilderToast?.show?.(`Ziel für kostenlosen Versand auf ${cart.formatCurrency(v)} geändert.`, "info");
        window.WebBuilderCartConfigRuntime?.renderMilestoneList?.();
      }
      refreshCartViews();
    }, true);

    document.getElementById("cart-item-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ itemShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-item-bg-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ itemBackgroundColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-item-width")?.addEventListener("change", e => {
      const v = e.target.value === "" ? null : Math.max(120, Number(e.target.value) || 0);
      window.WebBuilderHistory?.arm(); cart.setConfig({ itemWidth: v }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-item-height")?.addEventListener("change", e => {
      const v = e.target.value === "" ? null : Math.max(30, Number(e.target.value) || 0);
      window.WebBuilderHistory?.arm(); cart.setConfig({ itemMinHeight: v }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-remove-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); cart.setConfig({ removeButtonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-remove-style")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ removeStyle: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-remove-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ removeShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-quantity-style")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ quantityStyle: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-quantity-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ quantityGroupShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-quantity-color")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ quantityButtonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-price-style")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ priceStyle: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-show-description")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ showDescription: e.target.checked }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-show-item-dividers")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); cart.setItemDisplay({ showItemDividers: e.target.checked }, false); window.WebBuilderHistory?.commit();
      window.WebBuilderCartFocus?.renderPartPanel?.();
      refreshCartViews();
    }, true);

    document.addEventListener("keydown", e => { if (e.key === "Escape" && state.cartFocusMode) focus().exit?.(); });
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bindFocusEditor, 0));
})();
