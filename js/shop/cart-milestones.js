// js/shop/cart-milestones.js
// Cart progress-bar milestones and freely placeable dividers — grouped
// together since both are repeatable, user-managed lists under
// cartConfig with the same add/remove shape. Contributes to
// window.WebBuilderCart.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCart: WebBuilderState is not available."); return; }
  function notify(domain, action, payload) { state.notify?.(domain, action, payload); }

  // ------------------------------------------------------------------
  // Milestones
  // ------------------------------------------------------------------

  function normalizeMilestonesConfig(config) {
    if (!Array.isArray(config.milestones)) config.milestones = [];
    if (config.progressBarColor == null) config.progressBarColor = "#10b981";
    if (config.progressCompleteText == null) config.progressCompleteText = "✓ Alle Ziele freigeschaltet";
    if (config.shippingFreeThreshold === undefined) config.shippingFreeThreshold = null;
    if (config.milestoneDiscountPercent == null) config.milestoneDiscountPercent = 10;
    if (config.milestoneDiscountThreshold === undefined) config.milestoneDiscountThreshold = null;
  }

  function addMilestone() {
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.milestones)) state.cartConfig.milestones = [];
    state.cartConfig.milestones.push({
      id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      amount: 50, label: "Kostenloser Versand", action: "free-shipping", icon: "🚚", reachedText: ""
    });
    window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
  }

  function removeMilestone(id) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.milestones = (state.cartConfig.milestones || []).filter(m => m.id !== id);
    window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
  }

  function syncFreeShippingMilestone(amount, recordHistory = true) {
    const milestone = (state.cartConfig.milestones || []).find(m => m.action === "free-shipping");
    if (!milestone) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    milestone.amount = amount;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
    return true;
  }

  function syncDiscountMilestone(amount, recordHistory = true) {
    const milestone = (state.cartConfig.milestones || []).find(m => m.action === "discount");
    if (!milestone) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    milestone.amount = amount;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
    return true;
  }

  // ------------------------------------------------------------------
  // Dividers
  // ------------------------------------------------------------------

  function normalizeDivider(entry = {}) {
    return { id: (entry && entry.id) || `div_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }

  // Normalizes cartConfig.dividers and migrates the old single
  // "totalsDividerEnabled" flag (pre-repeatable-dividers) into a real
  // divider entry, carrying over its stored position.
  function normalizeDividersState(config) {
    config.dividers = window.WebBuilderUtils.normalizeInPlace(Array.isArray(config.dividers) ? config.dividers : [], normalizeDivider);
    if (config.totalsDividerEnabled) {
      const migrated = normalizeDivider({});
      config.dividers.push(migrated);
      const oldLayout = config.componentLayout.totalsDivider;
      if (oldLayout) config.componentLayout[`divider:${migrated.id}`] = oldLayout;
    }
    delete config.totalsDividerEnabled;
    delete config.componentLayout.totalsDivider;
  }

  function addDivider() {
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.dividers)) state.cartConfig.dividers = [];
    const divider = normalizeDivider({});
    state.cartConfig.dividers.push(divider);
    window.WebBuilderHistory?.commit();
    notify("cart", "dividers", state.cartConfig.dividers);
    return divider;
  }

  function removeDivider(dividerId) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.dividers = (state.cartConfig.dividers || []).filter(d => d.id !== dividerId);
    delete state.cartConfig.componentLayout[`divider:${dividerId}`];
    window.WebBuilderHistory?.commit();
    notify("cart", "dividers", state.cartConfig.dividers);
  }

  window.WebBuilderCart = Object.assign(window.WebBuilderCart || {}, {
    normalizeMilestonesConfig, addMilestone, removeMilestone, syncFreeShippingMilestone, syncDiscountMilestone,
    normalizeDivider, normalizeDividersState, addDivider, removeDivider
  });
})();
