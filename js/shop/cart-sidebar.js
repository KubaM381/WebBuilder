// js/shop/cart-sidebar.js
// WebBuilder cart sidebar UI — the left sidebar's cart config controls
// (#panel-cart): the discount/recommend/progress enable toggles, the
// recommendation list editor and the milestone list editor. None of this
// ties to selecting a specific on-canvas part, which is why it lives here
// rather than in the right-hand cart editor panel (shop/cart-editor.js).
// HTML building lives in shop/cart-html.js; the real drawer lives in
// shop/cart-drawer.js — this file calls
// window.WebBuilderCartRuntime.refresh() at runtime to update both after
// a change here, rather than duplicating that logic. Cart data/CRUD lives
// in shop/cart-data.js. Must load after shop/cart-data.js (reads
// window.WebBuilderCart at top-level parse time).
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCartSidebar: WebBuilderState is not available."); return; }
  const cart = window.WebBuilderCart;
  if (!cart) { console.error("WebBuilderCartSidebar: WebBuilderCart is not available."); return; }

  const esc = window.WebBuilderUtils.escapeHtml;
  const eur = v => cart.formatCurrency(v);
  function refreshCartViews() { window.WebBuilderCartRuntime?.refresh?.(); }

  // ------------------------------------------------------------------
  // Recommendations
  // ------------------------------------------------------------------

  function bindRecommendListDelegated() {
    const listEl = document.getElementById("cart-recommend-list");
    if (!listEl || listEl.dataset.webBuilderRecBound === "true") return;
    listEl.dataset.webBuilderRecBound = "true";

    listEl.addEventListener("click", e => {
      const btn = e.target.closest?.(".item-delete[data-rec-id]");
      if (!btn) return;
      e.preventDefault(); e.stopImmediatePropagation();
      cart.removeRecommendation(btn.dataset.recId);
    }, true);

    listEl.addEventListener("change", e => {
      const textInput = e.target.closest?.(".rec-text[data-rec-id]");
      if (textInput) { cart.updateRecommendation(textInput.dataset.recId, { text: textInput.value }); return; }

      const altSelect = e.target.closest?.(".rec-alternative[data-rec-id]");
      if (altSelect) { cart.updateRecommendation(altSelect.dataset.recId, { alternativeProductId: altSelect.value || null }); return; }

      const condType = e.target.closest?.(".rec-condition-type[data-rec-id]");
      if (condType) {
        const recId = condType.dataset.recId;
        const rec = (cart.getConfig().recommendations || []).find(r => r.id === recId);
        cart.updateRecommendation(recId, { condition: { type: condType.value, value: rec?.condition?.value || 0 } });
        return;
      }

      const condValue = e.target.closest?.(".rec-condition-value[data-rec-id]");
      if (condValue) {
        const recId = condValue.dataset.recId;
        const rec = (cart.getConfig().recommendations || []).find(r => r.id === recId);
        cart.updateRecommendation(recId, { condition: { type: rec?.condition?.type || "none", value: Number(condValue.value) || 0 } });
      }
    }, true);
  }

  function renderRecommendList() {
    const listEl = document.getElementById("cart-recommend-list");
    if (!listEl) return;
    bindRecommendListDelegated();
    let list = Array.isArray(cart.getConfig()?.recommendations) ? cart.getConfig().recommendations : [];
    const valid = list.filter(rec => window.WebBuilderProducts?.getById?.(rec.productId));
    if (valid.length !== list.length) { state.cartConfig.recommendations = valid; list = valid; }
    const products = window.WebBuilderProducts?.getAll?.() || [];
    listEl.innerHTML = list.length ? "" : '<p class="help-text">Noch keine Empfehlungen.</p>';
    list.forEach(rec => {
      const product = window.WebBuilderProducts?.getById?.(rec.productId);
      if (!product) return;
      const altOptions = ['<option value="">— Keine Alternative —</option>']
        .concat(products.filter(p => p.id !== rec.productId).map(p => `<option value="${esc(p.id)}" ${rec.alternativeProductId === p.id ? "selected" : ""}>${esc(p.icon || "📦")} ${esc(p.name)}</option>`))
        .join("");
      const conditionOptions = Object.entries(cart.CONDITION_LABELS).map(([v, l]) => `<option value="${v}" ${rec.condition?.type === v ? "selected" : ""}>${esc(l)}</option>`).join("");
      const row = document.createElement("div");
      row.className = "item-row cart-recommend-row";
      row.innerHTML = `
        <div class="cart-recommend-row-header">
          <span class="product-icon-preview">${esc(product.icon || "📦")}</span>
          <span class="item-row-text">${esc(product.name)} — ${eur(product.discountPrice != null ? product.discountPrice : product.price)}</span>
          <button type="button" class="item-delete" data-rec-id="${esc(rec.id)}">✕</button>
        </div>
        <input type="text" class="rec-text" data-rec-id="${esc(rec.id)}" value="${esc(rec.text)}" placeholder="Empfehlungstext">
        <span class="rec-field-label">Alternative, falls Produkt bereits im Warenkorb ist</span>
        <select class="rec-alternative" data-rec-id="${esc(rec.id)}">${altOptions}</select>
        <span class="rec-field-label">Anzeigen wenn</span>
        <div class="rec-condition-row">
          <select class="rec-condition-type" data-rec-id="${esc(rec.id)}">${conditionOptions}</select>
          <input type="number" class="rec-condition-value" data-rec-id="${esc(rec.id)}" min="0" step="1" value="${Number(rec.condition?.value) || 0}" ${rec.condition?.type === "none" ? "disabled" : ""}>
        </div>
      `;
      listEl.appendChild(row);
    });
  }

  function bindAddRecommendation() {
    const btn = document.getElementById("btn-add-recommendation");
    if (!btn || btn.dataset.webBuilderCartBound === "true") return;
    btn.dataset.webBuilderCartBound = "true";
    btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      const list = window.WebBuilderProducts?.getAll?.() || [];
      if (!list.length) {
        window.WebBuilderModals?.openMessage?.("Keine Produkte", "Lege zuerst im Tab „📦 Produkte“ ein Produkt an.");
        return;
      }
      const bodyHtml = `<div class="pick-list">${list.map(p => `<button type="button" class="btn btn-secondary product-pick-btn" data-id="${esc(p.id)}">${esc(p.icon || "📦")} ${esc(p.name)} — ${eur(p.discountPrice != null ? p.discountPrice : p.price)}</button>`).join("")}</div>`;
      window.WebBuilderModals?.open?.("Produkt als Empfehlung wählen", bodyHtml);
      document.querySelectorAll(".product-pick-btn").forEach(pickBtn => pickBtn.addEventListener("click", pe => {
        cart.addRecommendation(pe.currentTarget.dataset.id);
        renderRecommendList();
        refreshCartViews();
        window.WebBuilderModals?.close?.();
      }, true));
    }, true);
  }

  // ------------------------------------------------------------------
  // Milestones (Fortschrittsbalken)
  // ------------------------------------------------------------------

  function renderMilestoneList() {
    const listEl = document.getElementById("cart-milestone-list");
    if (!listEl) return;
    const milestones = Array.isArray(cart.getConfig()?.milestones) ? cart.getConfig().milestones : [];
    const milestoneDiscountPercent = Number(cart.getConfig()?.milestoneDiscountPercent);
    const discountOptionLabel = `Extra-Rabatt (${Number.isFinite(milestoneDiscountPercent) ? milestoneDiscountPercent : 10}%)`;
    listEl.innerHTML = milestones.length ? "" : '<p class="help-text">Noch keine Meilensteine.</p>';
    milestones.forEach(m => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<input type="text" class="ms-icon" data-id="${esc(m.id)}" value="${esc(m.icon || "")}" placeholder="Icon" title="Icon/Emoji, wird angezeigt sobald der Meilenstein erreicht ist">
        <input type="number" class="ms-amount" data-id="${esc(m.id)}" value="${Number(m.amount) || 0}" step="1" placeholder="Betrag (€)">
        <input type="text" class="ms-label" data-id="${esc(m.id)}" value="${esc(m.label)}" placeholder="Label">
        <input type="text" class="ms-reached-text" data-id="${esc(m.id)}" value="${esc(m.reachedText || "")}" placeholder="Text bei Erreichen (optional)" title="Wird anstelle der Standardmeldung gezeigt, sobald dies der zuletzt erreichte Meilenstein ist">
        <select class="ms-action" data-id="${esc(m.id)}">
          <option value="free-shipping" ${m.action === "free-shipping" ? "selected" : ""}>Kostenloser Versand</option>
          <option value="discount" ${m.action === "discount" ? "selected" : ""}>${esc(discountOptionLabel)}</option>
          <option value="free-product" ${m.action === "free-product" ? "selected" : ""}>Gratis-Produkt Hinweis</option>
          <option value="message" ${m.action === "message" ? "selected" : ""}>Nur Hinweistext</option>
        </select>
        <button type="button" class="item-delete" data-id="${esc(m.id)}">✕</button>`;
      listEl.appendChild(row);
    });
    listEl.querySelectorAll(".ms-icon").forEach(inp => inp.addEventListener("input", e => {
      const m = (cart.getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.icon = e.target.value; window.WebBuilderHistory?.commit(); refreshCartViews(); }
    }, true));
    listEl.querySelectorAll(".ms-amount").forEach(inp => inp.addEventListener("input", e => {
      const m = (cart.getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) {
        window.WebBuilderHistory?.arm();
        m.amount = parseFloat(e.target.value) || 0;
        if (m.action === "free-shipping") state.cartConfig.shippingFreeThreshold = m.amount;
        else if (m.action === "discount") state.cartConfig.milestoneDiscountThreshold = m.amount;
        window.WebBuilderHistory?.commit();
        refreshCartViews();
      }
    }, true));
    listEl.querySelectorAll(".ms-label").forEach(inp => inp.addEventListener("input", e => {
      const m = (cart.getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.label = e.target.value; window.WebBuilderHistory?.commit(); refreshCartViews(); }
    }, true));
    listEl.querySelectorAll(".ms-reached-text").forEach(inp => inp.addEventListener("input", e => {
      const m = (cart.getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.reachedText = e.target.value; window.WebBuilderHistory?.commit(); refreshCartViews(); }
    }, true));
    listEl.querySelectorAll(".ms-action").forEach(sel => sel.addEventListener("change", e => {
      const m = (cart.getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) {
        window.WebBuilderHistory?.arm();
        m.action = e.target.value;
        if (m.action === "free-shipping") state.cartConfig.shippingFreeThreshold = m.amount;
        else if (m.action === "discount") state.cartConfig.milestoneDiscountThreshold = m.amount;
        window.WebBuilderHistory?.commit();
        window.WebBuilderCartFocus?.renderPartPanel?.();
        refreshCartViews();
      }
    }, true));
    listEl.querySelectorAll(".item-delete").forEach(btn => btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      cart.removeMilestone(e.currentTarget.dataset.id);
      renderMilestoneList();
      window.WebBuilderCartFocus?.renderPartPanel?.();
      refreshCartViews();
    }, true));
  }

  function bindAddMilestone() {
    const btn = document.getElementById("btn-add-milestone");
    if (!btn || btn.dataset.webBuilderCartBound === "true") return;
    btn.dataset.webBuilderCartBound = "true";
    btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      cart.addMilestone();
      renderMilestoneList();
      refreshCartViews();
    }, true);
  }

  // ------------------------------------------------------------------
  // Base toggles (discount/recommend/progress) + master render
  // ------------------------------------------------------------------

  function renderConfig() {
    const c = cart.getConfig() || {};
    const ids = [["cart-discount-toggle", c.discountEnabled], ["cart-recommend-toggle", c.recommendEnabled], ["cart-progress-toggle", c.progressEnabled]];
    ids.forEach(([id, v]) => { const e = document.getElementById(id); if (e) e.checked = !!v; });
    if (state.cartFocusMode) {
      window.WebBuilderCartFocus?.renderStage?.();
      window.WebBuilderCartFocus?.renderPartPanel?.();
    }
  }

  function bindSidebar() {
    const map = { "cart-discount-toggle": "discountEnabled", "cart-recommend-toggle": "recommendEnabled", "cart-progress-toggle": "progressEnabled" };
    Object.entries(map).forEach(([id, p]) => document.getElementById(id)?.addEventListener("change", e => { window.WebBuilderHistory?.arm(); cart.setConfig({ [p]: e.target.checked }, false); window.WebBuilderHistory?.commit(); renderConfig(); refreshCartViews(); }, true));
    bindAddRecommendation();
    bindAddMilestone();
    renderConfig();
    renderRecommendList();
    renderMilestoneList();
    state.subscribe?.(e => { if (["cart", "products"].includes(e?.domain)) { renderRecommendList(); renderMilestoneList(); } });
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bindSidebar, 0));

  window.WebBuilderCartConfigRuntime = { render: renderConfig, renderRecommendList, renderMilestoneList };
})();
