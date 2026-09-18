// js/shop/cart-milestones.js
// Cart progress-bar milestones, product segments, and freely placeable
// dividers — grouped together since all three are repeatable,
// user-managed lists under cartConfig with the same add/remove shape.
// Contributes to window.WebBuilderCart.
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

  // Keeps a "free-shipping" milestone's amount and
  // cartConfig.shippingFreeThreshold in sync (called from the shipping
  // fields in cart-editor-bindings.js). Reverse direction (editing the
  // milestone directly) lives in cart-sidebar.js. Returns false if no
  // such milestone exists — the threshold still applies on its own.
  function syncFreeShippingMilestone(amount, recordHistory = true) {
    const milestone = (state.cartConfig.milestones || []).find(m => m.action === "free-shipping");
    if (!milestone) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    milestone.amount = amount;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
    return true;
  }

  // Same as syncFreeShippingMilestone(), for a "discount" milestone and
  // cartConfig.milestoneDiscountThreshold.
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
  // Product segments
  // ------------------------------------------------------------------

  function normalizeSegment(entry = {}) {
    return {
      id: entry.id || `seg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: entry.name || "Neues Segment",
      productIds: Array.isArray(entry.productIds) ? entry.productIds.filter(Boolean) : [],
      showDivider: entry.showDivider !== false
    };
  }
  function normalizeSegments(list) {
    return window.WebBuilderUtils.normalizeInPlace(Array.isArray(list) ? list : [], normalizeSegment);
  }

  function addSegment(patch = {}) {
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.segments)) state.cartConfig.segments = [];
    const segment = normalizeSegment(patch);
    state.cartConfig.segments.push(segment);
    window.WebBuilderHistory?.commit();
    notify("cart", "segments", state.cartConfig.segments);
    return segment;
  }

  function updateSegment(segmentId, patch = {}, recordHistory = true) {
    const segment = (state.cartConfig.segments || []).find(s => s.id === segmentId);
    if (!segment) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    if (patch.name !== undefined) segment.name = patch.name || "Neues Segment";
    if (patch.productIds !== undefined) segment.productIds = Array.isArray(patch.productIds) ? patch.productIds.filter(Boolean) : [];
    if (patch.showDivider !== undefined) segment.showDivider = !!patch.showDivider;
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "segments", state.cartConfig.segments);
    return segment;
  }

  function removeSegment(segmentId) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.segments = (state.cartConfig.segments || []).filter(s => s.id !== segmentId);
    window.WebBuilderHistory?.commit();
    notify("cart", "segments", state.cartConfig.segments);
  }

  // ------------------------------------------------------------------
  // Dividers
  // ------------------------------------------------------------------

  function normalizeDivider(entry = {}) {
    return { id: (entry && entry.id) || `div_${Date.now()}_${Math.random().toString(36).slice(2, 8)}` };
  }

  // Normalizes cartConfig.dividers and migrates the old single
  // "totalsDividerEnabled" flag (pre-repeatable-dividers) into a real
  // divider entry, carrying over its stored position. Requires
  // config.componentLayout to already exist.
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
    normalizeSegment, normalizeSegments, addSegment, updateSegment, removeSegment,
    normalizeDivider, normalizeDividersState, addDivider, removeDivider
  });
})();
