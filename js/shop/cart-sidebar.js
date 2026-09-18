// js/shop/cart-sidebar.js
// WebBuilder cart sidebar UI — the left sidebar's cart config controls
// (#panel-cart): the discount/recommend/progress enable toggles, the
// items-list max-height field, product-segment management, the
// recommendation list editor and the milestone list editor. None of this
// ties to selecting a specific on-canvas part, which is why it lives here
// rather than in the right-hand cart editor panel (shop/cart-editor.js).
// Split out of the former shop/cart-render.js (see
// docs/STRUCTURE_PLAN.md Phase 2). HTML building lives in
// shop/cart-html.js; the real drawer lives in shop/cart-drawer.js — this
// file calls window.WebBuilderCartRuntime.refresh() at runtime to update
// both after a change here, rather than duplicating that logic. Cart
// data/CRUD lives in shop/cart-data.js. Must load after shop/cart-data.js
// (reads window.WebBuilderCart at top-level parse time).
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

  // Delegierte Bindings für den Empfehlungs-Editor, einmalig auf den nie
  // ersetzten Container gelegt statt auf jede wegwerfbare Zeile.
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
    // Drop recommendations whose product was deleted in the meantime.
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
    // Der Extra-Rabatt ist konfigurierbar (cartConfig.milestoneDiscountPercent),
    // deshalb zeigt die Option den aktuellen Wert statt eines fest
    // verdrahteten "(10%)".
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
        // Gegenrichtung von cart.syncFreeShippingMilestone(): wird der
        // Betrag eines "free-shipping"-Meilensteins hier bearbeitet, zieht
        // das Freibetrag-Feld in der Kosten-Übersicht mit. Analog für
        // einen "discount"-Meilenstein und
        // cartConfig.milestoneDiscountThreshold.
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
        // Wird dieser Meilenstein gerade zum free-shipping-/discount-
        // Meilenstein, übernimmt das passende Ziel-Feld sofort seinen
        // aktuellen Betrag (passend zum Betrags-Sync oben).
        if (m.action === "free-shipping") state.cartConfig.shippingFreeThreshold = m.amount;
        else if (m.action === "discount") state.cartConfig.milestoneDiscountThreshold = m.amount;
        window.WebBuilderHistory?.commit();
        // Ein neu zugewiesenes "free-product"-Milestone kann dazu führen,
        // dass das Gratis-Produkt-Eingabefeld im Kosten-Übersicht-Panel
        // jetzt sichtbar werden muss (bzw. ein entferntes Milestone es
        // wieder verstecken muss) — siehe shop/cart-editor.js
        // renderFocusPartPanel().
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
  // Product segments
  // ------------------------------------------------------------------

  function renderSegmentList() {
    const listEl = document.getElementById("cart-segment-list");
    if (!listEl) return;
    const segments = Array.isArray(cart.getConfig()?.segments) ? cart.getConfig().segments : [];
    listEl.innerHTML = segments.length ? "" : '<p class="help-text">Noch keine Segmente.</p>';
    segments.forEach(segment => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<span class="item-row-text">${esc(segment.name)} (${(segment.productIds || []).length})</span><button type="button" class="btn btn-secondary btn-sm segment-edit-btn" data-seg-id="${esc(segment.id)}">✏️ Bearbeiten</button><button type="button" class="item-delete segment-delete-btn" data-seg-id="${esc(segment.id)}">✕</button>`;
      listEl.appendChild(row);
    });
  }

  // The "Markierungswerkzeug": a checklist of every product, pre-checked
  // for whichever ones already belong to this segment, plus name and
  // divider toggle. Reuses window.WebBuilderModals (same generic modal
  // every other picker in this file uses) instead of a bespoke dialog.
  function openSegmentModal(segmentId = null) {
    const config = cart.getConfig() || {};
    const existing = segmentId ? (config.segments || []).find(s => s.id === segmentId) : null;
    const products = window.WebBuilderProducts?.getAll?.() || [];
    const checkedIds = new Set(existing?.productIds || []);
    const rowsHtml = products.length
      ? products.map(p => `<label class="checkbox-row"><input type="checkbox" class="segment-product-check" value="${esc(p.id)}" ${checkedIds.has(p.id) ? "checked" : ""}> ${esc(p.icon || "📦")} ${esc(p.name)}</label>`).join("")
      : '<p class="help-text">Noch keine Produkte vorhanden — lege zuerst im Tab „📦 Produkte“ ein Produkt an.</p>';
    const bodyHtml = `
      <div class="modal-stack">
        <div class="form-group"><label for="segment-name-input">Name</label><input type="text" id="segment-name-input" value="${esc(existing?.name || "")}" placeholder="z. B. Zubehör"></div>
        <label class="checkbox-row"><input type="checkbox" id="segment-divider-toggle" ${!existing || existing.showDivider ? "checked" : ""}> Trennlinie unterhalb anzeigen</label>
        <hr class="divider modal-divider-tight">
        <p class="help-text" style="margin:0 0 4px;">Produkte für dieses Segment auswählen:</p>
        ${rowsHtml}
      </div>
    `;
    const footerHtml = `<button type="button" class="btn btn-primary" id="segment-save-btn">Speichern</button>`;
    window.WebBuilderModals?.open?.(existing ? "Segment bearbeiten" : "Segment erstellen", bodyHtml, footerHtml);
    document.getElementById("segment-save-btn")?.addEventListener("click", () => {
      const name = document.getElementById("segment-name-input")?.value.trim() || "Neues Segment";
      const showDivider = !!document.getElementById("segment-divider-toggle")?.checked;
      const productIds = Array.from(document.querySelectorAll(".segment-product-check:checked")).map(cb => cb.value);
      if (existing) cart.updateSegment(existing.id, { name, productIds, showDivider });
      else cart.addSegment({ name, productIds, showDivider });
      renderSegmentList();
      refreshCartViews();
      window.WebBuilderModals?.close?.();
    }, { once: true });
  }

  function bindSegmentControls() {
    const addBtn = document.getElementById("btn-add-segment");
    if (addBtn && addBtn.dataset.webBuilderSegBound !== "true") {
      addBtn.dataset.webBuilderSegBound = "true";
      addBtn.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); openSegmentModal(null); }, true);
    }
    const listEl = document.getElementById("cart-segment-list");
    if (listEl && listEl.dataset.webBuilderSegBound !== "true") {
      listEl.dataset.webBuilderSegBound = "true";
      listEl.addEventListener("click", e => {
        const editBtn = e.target.closest?.(".segment-edit-btn");
        if (editBtn) { e.preventDefault(); e.stopImmediatePropagation(); openSegmentModal(editBtn.dataset.segId); return; }
        const delBtn = e.target.closest?.(".segment-delete-btn");
        if (delBtn) {
          e.preventDefault(); e.stopImmediatePropagation();
          cart.removeSegment(delBtn.dataset.segId);
          renderSegmentList();
          refreshCartViews();
        }
      }, true);
    }
    const heightInput = document.getElementById("cart-items-max-height");
    if (heightInput && heightInput.dataset.webBuilderSegBound !== "true") {
      heightInput.dataset.webBuilderSegBound = "true";
      heightInput.addEventListener("change", e => {
        const raw = e.target.value;
        const v = raw === "" ? null : Math.max(80, Number(raw) || 0);
        window.WebBuilderHistory?.arm(); cart.setConfig({ itemsListMaxHeight: v }, false); window.WebBuilderHistory?.commit();
        refreshCartViews();
      }, true);
    }
    renderSegmentList();
  }

  // ------------------------------------------------------------------
  // Base toggles (discount/recommend/progress) + master render
  // ------------------------------------------------------------------

  function renderConfig() {
    const c = cart.getConfig() || {};
    const ids = [["cart-discount-toggle", c.discountEnabled], ["cart-recommend-toggle", c.recommendEnabled], ["cart-progress-toggle", c.progressEnabled]];
    ids.forEach(([id, v]) => { const e = document.getElementById(id); if (e) e.checked = !!v; });
    const heightInput = document.getElementById("cart-items-max-height");
    if (heightInput && document.activeElement !== heightInput) heightInput.value = c.itemsListMaxHeight != null ? c.itemsListMaxHeight : "";
    renderSegmentList();
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
    bindSegmentControls();
    renderConfig();
    renderRecommendList();
    renderMilestoneList();
    state.subscribe?.(e => { if (["cart", "products"].includes(e?.domain)) { renderRecommendList(); renderMilestoneList(); } });
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bindSidebar, 0));

  window.WebBuilderCartConfigRuntime = { render: renderConfig, renderRecommendList, renderMilestoneList, renderSegmentList };
})();
