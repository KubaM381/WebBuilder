// WebBuilder cart configuration runtime
// Moves the cart settings UI away from builder-legacy.js.
(() => {
  const cart = window.WebBuilderCart;
  const history = window.WebBuilderHistory;
  if (!cart) { console.error("WebBuilderCartConfigRuntime: cart service missing."); return; }

  const byId = id => document.getElementById(id);
  const transaction = action => { history?.arm(); action(); history?.commit(); render(); };

  function render() {
    const config = cart.getConfig() || {};
    const display = config.itemDisplay || {};
    const map = {
      "cart-item-shape": config.itemShape,
      "cart-remove-color": config.removeButtonColor,
      "cid-remove-style": display.removeStyle || "x",
      "cid-remove-shape": display.removeShape || "circle",
      "cid-quantity-style": display.quantityStyle || "stepper",
      "cid-price-style": display.priceStyle || "simple"
    };
    Object.entries(map).forEach(([id, value]) => { const el = byId(id); if (el && value != null) el.value = value; });
    const discount = byId("cart-discount-toggle"); if (discount) discount.checked = !!config.discountEnabled;
    const recommend = byId("cart-recommend-toggle"); if (recommend) recommend.checked = !!config.recommendEnabled;
    const progress = byId("cart-progress-toggle"); if (progress) progress.checked = !!config.progressEnabled;
    const desc = byId("cid-show-description"); if (desc) desc.checked = !!display.showDescription;
    const color = byId("cart-button-color"); if (color) color.value = config.buttonColor || "#4f46e5";
    const shape = byId("cart-button-shape"); if (shape) shape.value = config.buttonShape || "rounded";
    const label = byId("cart-button-label"); if (label) label.value = window.WebBuilderState?.cartButtonLabel || "Zur Kasse gehen";
    const recPanel = byId("cart-recommend-config"); if (recPanel) recPanel.classList.toggle("hidden", !config.recommendEnabled);
    const progressPanel = byId("cart-progress-config"); if (progressPanel) progressPanel.classList.toggle("hidden", !config.progressEnabled);
  }

  function bind() {
    const configMap = {
      "cart-item-shape": "itemShape",
      "cart-remove-color": "removeButtonColor",
      "cart-discount-toggle": "discountEnabled",
      "cart-recommend-toggle": "recommendEnabled",
      "cart-progress-toggle": "progressEnabled",
      "cart-button-color": "buttonColor",
      "cart-button-shape": "buttonShape"
    };
    Object.entries(configMap).forEach(([id, prop]) => {
      const el = byId(id); if (!el) return;
      el.addEventListener("change", e => transaction(() => cart.setConfig({ [prop]: el.type === "checkbox" ? el.checked : e.target.value }, false)), true);
      if (el.type !== "checkbox" && el.type !== "select-one") el.addEventListener("input", e => cart.setConfig({ [prop]: e.target.value }, false), true);
    });

    [
      ["cid-remove-style", "removeStyle"], ["cid-remove-shape", "removeShape"],
      ["cid-quantity-style", "quantityStyle"], ["cid-price-style", "priceStyle"]
    ].forEach(([id, prop]) => byId(id)?.addEventListener("change", e => transaction(() => cart.setItemDisplay({ [prop]: e.target.value }, false)), true));
    byId("cid-show-description")?.addEventListener("change", e => transaction(() => cart.setItemDisplay({ showDescription: e.target.checked }, false)), true);

    byId("cart-button-label")?.addEventListener("input", e => cart.setButtonLabel(e.target.value, false), true);
    cart.setButtonLabel && byId("cart-button-label")?.addEventListener("change", e => transaction(() => cart.setButtonLabel(e.target.value, false)), true);

    window.addEventListener("webbuilder:state-change", event => { if (event.detail?.domain === "cart") render(); });
    render();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));
  window.WebBuilderCartConfigRuntime = { render };
})();
