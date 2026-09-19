// js/shop/cart-milestones.js
// Cart progress-bar milestones, and the fixed per-category "divider
// after this component" switches. Grouped together since both live
// under cartConfig and are managed the same lightweight way. Unlike
// milestones, dividers are no longer a repeatable, freely positioned
// list — exactly one optional divider can sit right below each of a
// fixed set of components (see DIVIDER_CATEGORIES). Contributes to
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
  // Divider-after switches
  // ------------------------------------------------------------------

  // "Warenkorb-Titel" (title) and "Hintergrund" (background) are
  // deliberately excluded — a divider directly under the title never
  // made sense, and the background isn't a positioned block.
  const DIVIDER_CATEGORIES = ["items", "checkout", "discount", "recommend", "totals", "progress"];

  // Ensures cartConfig.dividerAfter only ever contains the fixed set of
  // known boolean switches, and cleans up every trace of the old
  // freely-placeable divider model (dividers array + their
  // componentLayout entries + the pre-repeatable single flag).
  function normalizeDividerAfterConfig(config) {
    const source = config.dividerAfter && typeof config.dividerAfter === "object" ? config.dividerAfter : {};
    const next = {};
    DIVIDER_CATEGORIES.forEach(key => { next[key] = !!source[key]; });
    config.dividerAfter = next;

    delete config.dividers;
    delete config.totalsDividerEnabled;
    if (config.componentLayout) {
      Object.keys(config.componentLayout).forEach(key => {
        if (key.startsWith("divider:")) delete config.componentLayout[key];
      });
      delete config.componentLayout.totalsDivider;
    }
  }

  function setDividerAfter(key, value, recordHistory = true) {
    if (!DIVIDER_CATEGORIES.includes(key)) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    if (!state.cartConfig.dividerAfter || typeof state.cartConfig.dividerAfter !== "object") state.cartConfig.dividerAfter = {};
    state.cartConfig.dividerAfter[key] = !!value;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "dividerAfter", state.cartConfig.dividerAfter);
    return true;
  }

  window.WebBuilderCart = Object.assign(window.WebBuilderCart || {}, {
    normalizeMilestonesConfig, addMilestone, removeMilestone, syncFreeShippingMilestone, syncDiscountMilestone,
    DIVIDER_CATEGORIES, normalizeDividerAfterConfig, setDividerAfter
  });
})();
