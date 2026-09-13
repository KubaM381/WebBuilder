// js/cart.js
// WebBuilder cart domain
// Owns cart data and its editor UI only. Product management lives in
// products.js; cart.js references products only by ID via
// window.WebBuilderProducts, no duplicated product data.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCart: WebBuilderState is not available."); return; }
  const clone = value => JSON.parse(JSON.stringify(value));
  function notify(domain, action, payload) { if (typeof state.notify === "function") state.notify(domain, action, payload); }
  function normalizeCartItem(item = {}) { const price = Number(item.price) || 0; const discountPrice = item.discountPrice != null && item.discountPrice !== "" ? Number(item.discountPrice) || 0 : null; return { id: item.id || `cart_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, name: item.name || "Produkt", price, discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null, qty: Math.max(1, Number(item.qty) || 1), icon: item.icon || "📦", description: item.description || "" }; }
  function getEffectivePrice(item) { const discount = Number(item?.discountPrice); return Number.isFinite(discount) && discount > 0 && discount < (Number(item?.price) || 0) ? discount : Number(item?.price) || 0; }
  // Normalizes in place (WebBuilderUtils.normalizeInPlace) so references
  // stay stable during active quantity/price edits.
  function normalizeState() {
    window.WebBuilderProducts?.normalizeState?.();
    state.cartItems = window.WebBuilderUtils.normalizeInPlace(state.cartItems, normalizeCartItem);
    if (!Array.isArray(state.cartConfig.recommendations)) state.cartConfig.recommendations = [];
    if (!Array.isArray(state.cartConfig.milestones)) state.cartConfig.milestones = [];
    // Defensive defaults for projects saved before tasks 3/4/7 existed.
    if (!state.cartConfig.itemDisplay || typeof state.cartConfig.itemDisplay !== "object") state.cartConfig.itemDisplay = {};
    if (!state.cartConfig.itemDisplay.layout || typeof state.cartConfig.itemDisplay.layout !== "object") state.cartConfig.itemDisplay.layout = {};
    if (state.cartConfig.discountButtonColor == null) state.cartConfig.discountButtonColor = "#4f46e5";
    if (state.cartConfig.discountButtonShape == null) state.cartConfig.discountButtonShape = "rounded";
    return state;
  }
  function getItems() { return state.cartItems; } function getConfig() { return state.cartConfig; } function getCount() { return state.cartItems.reduce((s,i)=>s+(Number(i.qty)||0),0); } function getSubtotal() { return state.cartItems.reduce((s,i)=>s+getEffectivePrice(i)*(Number(i.qty)||0),0); }
  function addItem(productOrItem, price, icon, description, recordHistory = true) { const source = typeof productOrItem === "object" ? productOrItem : {name:productOrItem,price,icon,description}; const normalized=normalizeCartItem(source); const existing=state.cartItems.find(i=>i.name===normalized.name); if(recordHistory) window.WebBuilderHistory?.arm(); if(existing) existing.qty=(Number(existing.qty)||0)+1; else state.cartItems.push(normalized); if(recordHistory) window.WebBuilderHistory?.commit(); notify("cart", existing?"increment":"add", existing||normalized); return existing||normalized; }
  function updateQty(id,qty,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;if(recordHistory)window.WebBuilderHistory?.arm();item.qty=Math.max(1,Number(qty)||1);if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","updateQty",item);return item;}
  function changeQty(id,delta,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;const next=(Number(item.qty)||0)+(Number(delta)||0);return next<=0?removeItem(id,recordHistory):updateQty(id,next,recordHistory);}
  function updatePrice(id,price,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;if(recordHistory)window.WebBuilderHistory?.arm();item.price=Number(price)||0;if(item.discountPrice!=null&&item.discountPrice>=item.price)item.discountPrice=null;if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","updatePrice",item);return item;}
  function updateDiscountPrice(id,value,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;if(recordHistory)window.WebBuilderHistory?.arm();const v=Number(value);item.discountPrice=Number.isFinite(v)&&v>0&&v<(Number(item.price)||0)?v:null;if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","updateDiscountPrice",item);return item;}
  function removeItem(id,recordHistory=true){const i=state.cartItems.findIndex(x=>x?.id===id);if(i<0)return false;if(recordHistory)window.WebBuilderHistory?.arm();const removed=state.cartItems.splice(i,1)[0];if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","remove",removed);return true;}
  function clear(recordHistory=true){if(!state.cartItems.length)return;if(recordHistory)window.WebBuilderHistory?.arm();state.cartItems.length=0;if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","clear");}
  function setConfig(patch={},recordHistory=true){if(recordHistory)window.WebBuilderHistory?.arm();Object.assign(state.cartConfig,clone(patch));if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","config",state.cartConfig);return state.cartConfig;}
  function setItemDisplay(patch={},recordHistory=true){if(recordHistory)window.WebBuilderHistory?.arm();state.cartConfig.itemDisplay=Object.assign({},state.cartConfig.itemDisplay||{},clone(patch));if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","display",state.cartConfig.itemDisplay);return state.cartConfig.itemDisplay;}
  function setButtonLabel(label,recordHistory=true){if(recordHistory)window.WebBuilderHistory?.arm();state.cartButtonLabel=String(label||"Zur Kasse gehen");if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","button-label",state.cartButtonLabel);return state.cartButtonLabel;}

  // Demo discount code: "DEMO10" = -10%.
  function applyDiscountCode() {
    const input = document.getElementById("cart-discount-input");
    const code = (input?.value || "").trim().toUpperCase();
    if (code === "DEMO10") {
      state.appliedDiscountPercent = 10;
      state.appliedDiscountLabel = 'Code „DEMO10“ angewendet (−10%).';
    } else {
      state.appliedDiscountPercent = 0;
      state.appliedDiscountLabel = code ? "Ungültiger Code (Demo-Code: DEMO10)." : "";
    }
    renderCart();
  }

  // Recommendations store product IDs only, no duplicated product data.
  function addRecommendation(productId) {
    if (!productId || !window.WebBuilderProducts?.getById?.(productId)) return null;
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.recommendations)) state.cartConfig.recommendations = [];
    if (!state.cartConfig.recommendations.includes(productId)) state.cartConfig.recommendations.push(productId);
    window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
    return state.cartConfig.recommendations;
  }
  function removeRecommendation(productId) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.recommendations = (state.cartConfig.recommendations || []).filter(id => id !== productId);
    window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
  }

  // Progress-bar milestones. `icon` (task 9) is an optional emoji/short
  // text shown once the milestone is reached (see renderCart()).
  function addMilestone() {
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.milestones)) state.cartConfig.milestones = [];
    state.cartConfig.milestones.push({ id: `ms_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, amount: 50, label: "Kostenloser Versand", action: "free-shipping", icon: "🚚" });
    window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
  }
  function removeMilestone(id) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.milestones = (state.cartConfig.milestones || []).filter(m => m.id !== id);
    window.WebBuilderHistory?.commit();
    notify("cart", "milestones", state.cartConfig.milestones);
  }

  normalizeState();
  window.WebBuilderCart = {
    getItems, getConfig, getCount, getSubtotal, getEffectivePrice, addItem, updateQty, changeQty, updatePrice, updateDiscountPrice, removeItem, clear, setConfig, setItemDisplay, setButtonLabel, normalizeCartItem, normalizeState, applyDiscountCode, addRecommendation, removeRecommendation, addMilestone, removeMilestone
  };

  // esc centralized in state.js (WebBuilderUtils.escapeHtml).
  const esc=window.WebBuilderUtils.escapeHtml;
  const eur=v=>`${Number(v||0).toFixed(2).replace(".",",")} €`;

  // Builds one cart-row's HTML, based on cartConfig.itemShape/itemDisplay.
  // `interactive` (task 3/4) is only true for the cart focus editor's
  // demo item on the canvas stage: it adds click/drag affordances and (on
  // a transparent item shape) a permanent dashed frame around each
  // sub-part. The per-part pixel offset (cartConfig.itemDisplay.layout)
  // itself is applied unconditionally, so positioning changes made in the
  // editor also show up in the real drawer/preview, not just on stage.
  function buildCartItemHTML(item, isDemo, interactive = false) {
    const config = getConfig() || {};
    const disp = config.itemDisplay || {};
    const layout = disp.layout || {};
    const idAttr = isDemo ? "" : ` data-cart-id="${esc(item.id)}"`;
    const transparent = config.itemShape === "transparent";

    function wrapPart(innerHtml, partKey) {
      const off = layout[partKey] || { x: 0, y: 0 };
      const hasOffset = !!(off.x || off.y);
      if (!interactive && !hasOffset) return innerHtml;
      const frameClass = interactive && transparent ? " cart-item-part-frame" : "";
      const selectedClass = interactive && state.cartFocusSelectedPart === partKey ? " cart-item-part-selected" : "";
      const partAttr = interactive ? ` data-cart-part="${partKey}"` : "";
      return `<span class="cart-item-part${frameClass}${selectedClass}"${partAttr} style="transform:translate(${off.x || 0}px, ${off.y || 0}px);">${innerHtml}</span>`;
    }

    let removeInner = "✕";
    if (disp.removeStyle === "trash") removeInner = "🗑️";
    if (disp.removeStyle === "text") removeInner = "Entfernen";
    const removeShapeClass = disp.removeShape === "circle" ? "remove-shape-circle" : (disp.removeShape === "square" ? "remove-shape-square" : "");
    const removeBtn = wrapPart(`<button type="button" class="cart-item-remove ${removeShapeClass}"${idAttr} title="Entfernen" style="color:${config.removeButtonColor || "#ef4444"};">${removeInner}</button>`, "remove");

    let qtyHtml;
    if (disp.quantityStyle === "dropdown") {
      const opts = Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<option value="${n}" ${n === Number(item.qty) ? "selected" : ""}>${n}</option>`).join("");
      qtyHtml = `<select class="cart-qty-select"${idAttr}>${opts}</select>`;
    } else if (disp.quantityStyle === "static") {
      qtyHtml = `<span class="cart-qty-static">× ${Number(item.qty) || 1}</span>`;
    } else {
      qtyHtml = `<span class="cart-qty-stepper"><button type="button" class="cart-qty-minus"${idAttr}>−</button><span>${Number(item.qty) || 1}</span><button type="button" class="cart-qty-plus"${idAttr}>+</button></span>`;
    }
    qtyHtml = wrapPart(qtyHtml, "qty");

    const effective = getEffectivePrice(item);
    const hasDiscount = item.discountPrice != null && effective < Number(item.price || 0);
    let priceHtml;
    if (disp.priceStyle === "strikethrough" && hasDiscount) {
      priceHtml = `<span><s class="cart-item-price-strike">${eur(item.price)}</s> ${eur(effective)}</span>`;
    } else if (disp.priceStyle === "perUnit") {
      priceHtml = `<span>${eur(effective)} / Stk · Summe ${eur(effective * (Number(item.qty) || 1))}</span>`;
    } else if (isDemo) {
      priceHtml = `<span>${hasDiscount ? `<s class="cart-item-price-strike">${eur(item.price)}</s> ` : ""}${eur(effective)}</span>`;
    } else {
      priceHtml = `<input type="number" class="cart-item-price-input" data-cart-id="${esc(item.id)}" value="${Number(item.price || 0).toFixed(2)}" step="0.01" />`;
    }
    priceHtml = wrapPart(priceHtml, "price");

    const titleHtml = wrapPart(`<span class="cart-item-title">${item.icon ? esc(item.icon) + " " : ""}${esc(item.name)}</span>`, "icon");
    const descHtml = disp.showDescription && item.description ? wrapPart(`<div class="cart-item-desc">${esc(item.description)}</div>`, "description") : "";
    const shapeClass = "cart-item-" + (config.itemShape || "rounded");

    return `<div class="cart-item ${shapeClass}"${idAttr}>
      ${titleHtml}
      ${qtyHtml}
      ${priceHtml}
      ${removeBtn}
      ${descHtml}
    </div>`;
  }

  function renderCartItemDemo() {
    const host = document.getElementById("cart-item-demo-preview");
    if (!host) return;
    const products = window.WebBuilderProducts?.getAll?.() || [];
    const demoSource = products[0] || { name: "Beispielprodukt", price: 19.99, discountPrice: 14.99, icon: "📦", description: "Kurze Beschreibung des Produkts." };
    host.innerHTML = buildCartItemHTML({ id: "demo", name: demoSource.name, price: demoSource.price, discountPrice: demoSource.discountPrice, qty: 2, icon: demoSource.icon, description: demoSource.description || "Kurze Beschreibung des Produkts." }, true);
    const demoEl = host.querySelector(".cart-item");
    if (demoEl) {
      demoEl.style.cursor = "pointer";
      demoEl.addEventListener("click", () => {
        document.getElementById("cart-item-display-editor")?.classList.remove("hidden");
      }, true);
    }
  }

  function renderRecommendList() {
    const listEl = document.getElementById("cart-recommend-list");
    if (!listEl) return;
    const ids = Array.isArray(getConfig()?.recommendations) ? getConfig().recommendations : [];
    const rows = ids.map(id => ({ id, product: window.WebBuilderProducts?.getById?.(id) })).filter(r => r.product);
    // Drop orphaned IDs (product was deleted).
    if (rows.length !== ids.length) state.cartConfig.recommendations = rows.map(r => r.id);
    listEl.innerHTML = rows.length ? "" : '<p class="help-text">Noch keine Empfehlungen.</p>';
    rows.forEach(({ id, product }) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<span class="product-icon-preview">${esc(product.icon || "📦")}</span><span class="item-row-text">${esc(product.name)} — ${eur(product.discountPrice != null ? product.discountPrice : product.price)}</span><button type="button" class="item-delete" data-rec-id="${esc(id)}">✕</button>`;
      listEl.appendChild(row);
    });
    listEl.querySelectorAll("[data-rec-id]").forEach(btn => btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      removeRecommendation(e.currentTarget.dataset.recId);
      renderRecommendList();
      renderCart();
    }, true));
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
        addRecommendation(pe.currentTarget.dataset.id);
        renderRecommendList();
        renderCart();
        window.WebBuilderModals?.close?.();
      }, true));
    }, true);
  }

  function renderMilestoneList() {
    const listEl = document.getElementById("cart-milestone-list");
    if (!listEl) return;
    const milestones = Array.isArray(getConfig()?.milestones) ? getConfig().milestones : [];
    listEl.innerHTML = milestones.length ? "" : '<p class="help-text">Noch keine Meilensteine.</p>';
    milestones.forEach(m => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<input type="text" class="ms-icon" data-id="${esc(m.id)}" value="${esc(m.icon || "")}" placeholder="Icon" title="Icon/Emoji, wird angezeigt sobald der Meilenstein erreicht ist">
        <input type="number" class="ms-amount" data-id="${esc(m.id)}" value="${Number(m.amount) || 0}" step="1" placeholder="Betrag (€)">
        <input type="text" class="ms-label" data-id="${esc(m.id)}" value="${esc(m.label)}" placeholder="Label">
        <select class="ms-action" data-id="${esc(m.id)}">
          <option value="free-shipping" ${m.action === "free-shipping" ? "selected" : ""}>Kostenloser Versand</option>
          <option value="discount" ${m.action === "discount" ? "selected" : ""}>Extra-Rabatt (10%)</option>
          <option value="free-product" ${m.action === "free-product" ? "selected" : ""}>Gratis-Produkt Hinweis</option>
          <option value="message" ${m.action === "message" ? "selected" : ""}>Nur Hinweistext</option>
        </select>
        <button type="button" class="item-delete" data-id="${esc(m.id)}">✕</button>`;
      listEl.appendChild(row);
    });
    listEl.querySelectorAll(".ms-icon").forEach(inp => inp.addEventListener("input", e => {
      const m = (getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.icon = e.target.value; window.WebBuilderHistory?.commit(); renderCart(); }
    }, true));
    listEl.querySelectorAll(".ms-amount").forEach(inp => inp.addEventListener("input", e => {
      const m = (getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.amount = parseFloat(e.target.value) || 0; window.WebBuilderHistory?.commit(); renderCart(); }
    }, true));
    listEl.querySelectorAll(".ms-label").forEach(inp => inp.addEventListener("input", e => {
      const m = (getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.label = e.target.value; window.WebBuilderHistory?.commit(); renderCart(); }
    }, true));
    listEl.querySelectorAll(".ms-action").forEach(sel => sel.addEventListener("change", e => {
      const m = (getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.action = e.target.value; window.WebBuilderHistory?.commit(); renderCart(); }
    }, true));
    listEl.querySelectorAll(".item-delete").forEach(btn => btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      removeMilestone(e.currentTarget.dataset.id);
      renderMilestoneList();
      renderCart();
    }, true));
  }

  function bindAddMilestone() {
    const btn = document.getElementById("btn-add-milestone");
    if (!btn || btn.dataset.webBuilderCartBound === "true") return;
    btn.dataset.webBuilderCartBound = "true";
    btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      addMilestone();
      renderMilestoneList();
      renderCart();
    }, true);
  }

  function applyCheckoutButtonStyle() {
    const btn = document.getElementById("cart-checkout-btn");
    if (!btn) return;
    const config = getConfig() || {};
    btn.style.backgroundColor = config.buttonColor || "#4f46e5";
    btn.style.borderRadius = config.buttonShape === "pill" ? "999px" : (config.buttonShape === "square" ? "0px" : "6px");
  }

  function renderCart(){
    const list=document.getElementById("cart-items-list");
    if(!list)return;
    const config=getConfig()||{}, items=getItems(), subtotal=getSubtotal();
    const milestones=Array.isArray(config.milestones)?[...config.milestones].sort((a,b)=>Number(a.amount)-Number(b.amount)):[];
    let html="";

    if(config.progressEnabled&&milestones.length){
      const max=Number(milestones[milestones.length-1].amount||1),pct=Math.min(100,subtotal/max*100),next=milestones.find(m=>subtotal<Number(m.amount));
      // Task 9: reached milestones show their optional icon in a small row
      // above the progress message.
      const reachedNow=milestones.filter(m=>subtotal>=Number(m.amount||0));
      const rewardsHtml=reachedNow.length?`<div class="cart-milestone-rewards">${reachedNow.map(m=>`<span class="cart-milestone-reward" title="${esc(m.label)}">${esc(m.icon||"🎉")}</span>`).join("")}</div>`:"";
      html+=`<div class="cart-progress"><div class="cart-progress-track"><div class="cart-progress-fill" style="width:${pct}%"></div>${milestones.map(m=>`<div class="cart-progress-mark ${subtotal>=Number(m.amount)?"reached":""}" style="left:${Math.min(100,(Number(m.amount)/max)*100)}%" title="${esc(m.label)}"></div>`).join("")}</div>${rewardsHtml}<p class="cart-progress-msg">${next?`Noch ${eur(Number(next.amount)-subtotal)} bis „${esc(next.label)}“`:"✓ Alle Ziele freigeschaltet"}</p></div>`;
    }

    html+=items.length?items.map(i=>buildCartItemHTML(i,false)).join(""):'<p class="cart-empty-msg">Dein Warenkorb ist leer.</p>';

    if(config.recommendEnabled && Array.isArray(config.recommendations) && config.recommendations.length){
      const cartNames=new Set(items.map(i=>i.name));
      const candidates=config.recommendations.map(id=>window.WebBuilderProducts?.getById?.(id)).filter(p=>p && !cartNames.has(p.name));
      if(candidates.length){
        const pick=candidates[0];
        html+=`<div class="cart-recommend"><p class="cart-recommend-title">Das könnte dir auch gefallen</p><div class="cart-recommend-card"><span class="cart-recommend-icon">${esc(pick.icon||"📦")}</span><span class="cart-recommend-name">${esc(pick.name)}</span><span class="cart-recommend-price">${eur(pick.discountPrice!=null?pick.discountPrice:pick.price)}</span><button type="button" class="cart-recommend-add" data-rec-product-id="${esc(pick.id)}">+</button></div></div>`;
      }
    }

    if(config.discountEnabled){
      // Task 7: discount-code button styled independently from the
      // checkout button (cartConfig.discountButtonColor/-Shape).
      const discColor=config.discountButtonColor||"#4f46e5";
      const discRadius=config.discountButtonShape==="pill"?"999px":(config.discountButtonShape==="square"?"0px":"6px");
      html+=`<div class="cart-discount"><input type="text" id="cart-discount-input" placeholder="Rabattcode (Demo: DEMO10)"><button type="button" id="cart-discount-apply" style="background-color:${discColor}; border-radius:${discRadius};">Anwenden</button>${state.appliedDiscountLabel?`<p class="cart-discount-msg ok">${esc(state.appliedDiscountLabel)}</p>`:""}</div>`;
    }

    const reached=milestones.filter(m=>subtotal>=Number(m.amount||0));
    const free=reached.some(m=>m.action==="free-shipping");
    const extra=reached.some(m=>m.action==="discount")?10:0;
    const discountPercent=Number(state.appliedDiscountPercent||0)+extra;
    const discountAmount=subtotal*discountPercent/100;
    const shipping=config.progressEnabled?(free?0:4.95):0;
    const total=Math.max(0,subtotal-discountAmount)+shipping;

    let totalsHtml=`<div class="cart-totals"><div class="cart-total-row"><span>Zwischensumme</span><span>${eur(subtotal)}</span></div>`;
    if(discountAmount>0) totalsHtml+=`<div class="cart-total-row"><span>Rabatt</span><span>−${eur(discountAmount)}</span></div>`;
    if(config.progressEnabled) totalsHtml+=`<div class="cart-total-row"><span>Versand</span><span>${shipping===0?"Kostenlos":eur(shipping)}</span></div>`;
    if(reached.some(m=>m.action==="free-product")) totalsHtml+=`<div class="cart-total-row"><span>🎁 Gratis-Produkt</span><span>freigeschaltet</span></div>`;
    totalsHtml+=`<div class="cart-total-row cart-total-final"><span>Gesamt</span><span>${eur(total)}</span></div></div>`;
    html+=totalsHtml;

    list.innerHTML=html;
    document.getElementById("cart-count-badge")?.replaceChildren(document.createTextNode(String(getCount())));
    const checkout=document.getElementById("cart-checkout-btn");
    if(checkout)checkout.textContent=state.cartButtonLabel||"Zur Kasse gehen";
  }

  function bind(){
    const list=document.getElementById("cart-items-list");
    list?.addEventListener("click",e=>{
      const discountBtn=e.target.closest?.("#cart-discount-apply");
      if(discountBtn){e.preventDefault();e.stopImmediatePropagation();applyDiscountCode();return;}
      const recBtn=e.target.closest?.(".cart-recommend-add");
      if(recBtn){e.preventDefault();e.stopImmediatePropagation();const product=window.WebBuilderProducts?.getById?.(recBtn.dataset.recProductId);if(product)addItem(product);return;}
      const t=e.target.closest?.("[data-cart-id]");
      if(!t)return;
      e.preventDefault();e.stopImmediatePropagation();
      const id=t.dataset.cartId;
      if(t.classList.contains("cart-item-remove"))removeItem(id);
      else if(t.classList.contains("cart-qty-minus"))changeQty(id,-1);
      else if(t.classList.contains("cart-qty-plus"))changeQty(id,1);
      renderCart();
    },true);
    // Wires the price input and quantity dropdown inside the drawer.
    list?.addEventListener("change",e=>{
      const qtySel=e.target.closest?.(".cart-qty-select[data-cart-id]");
      if(qtySel){updateQty(qtySel.dataset.cartId,parseInt(qtySel.value,10)||1);renderCart();return;}
      const priceInput=e.target.closest?.(".cart-item-price-input[data-cart-id]");
      if(priceInput){updatePrice(priceInput.dataset.cartId,priceInput.value);renderCart();}
    },true);

    document.getElementById("close-cart-btn")?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();closeCart();},true);
    document.getElementById("cart-drawer-backdrop")?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();closeCart();},true);
    document.getElementById("btn-open-cart")?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();openCart();},true);
    bindAddRecommendation();
    bindAddMilestone();
    // Reacts to both "cart" and "products": product changes affect the
    // recommendation/demo preview shown in the cart. Also refreshes the
    // focus editor stage + part panel (task 3/4) while it's active.
    state.subscribe?.(e=>{if(["cart","products"].includes(e?.domain)){renderCart();renderRecommendList();renderMilestoneList();renderCartItemDemo();if(state.cartFocusMode){renderFocusStage();renderFocusPartPanel();}}});
    renderCart();renderRecommendList();renderMilestoneList();renderCartItemDemo();
  }
  function openCart(){document.getElementById("cart-drawer")?.classList.add("active");document.getElementById("cart-drawer-backdrop")?.classList.add("active");renderCart();return true;} function closeCart(){document.getElementById("cart-drawer")?.classList.remove("active");document.getElementById("cart-drawer-backdrop")?.classList.remove("active");return true;}
  document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0));
  window.WebBuilderCartRuntime={render:renderCart,open:openCart,close:closeCart};

  // Cart configuration editor lives in the cart domain.
  function renderConfig(){
    const c=getConfig()||{},d=c.itemDisplay||{};
    const map={"cart-item-shape":c.itemShape,"cart-remove-color":c.removeButtonColor,"cid-remove-style":d.removeStyle||"x","cid-remove-shape":d.removeShape||"circle","cid-quantity-style":d.quantityStyle||"stepper","cid-price-style":d.priceStyle||"simple","cart-discount-button-color":c.discountButtonColor||"#4f46e5","cart-discount-button-shape":c.discountButtonShape||"rounded"};
    Object.entries(map).forEach(([id,v])=>{const e=document.getElementById(id);if(e&&v!=null)e.value=v;});
    const ids=[["cart-discount-toggle",c.discountEnabled],["cart-recommend-toggle",c.recommendEnabled],["cart-progress-toggle",c.progressEnabled],["cid-show-description",d.showDescription]];
    ids.forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.checked=!!v;});
    const color=document.getElementById("cart-button-color");if(color)color.value=c.buttonColor||"#4f46e5";
    const shape=document.getElementById("cart-button-shape");if(shape)shape.value=c.buttonShape||"rounded";
    const label=document.getElementById("cart-button-label");if(label)label.value=state.cartButtonLabel||"Zur Kasse gehen";
    document.getElementById("cart-recommend-config")?.classList.toggle("hidden",!c.recommendEnabled);
    document.getElementById("cart-progress-config")?.classList.toggle("hidden",!c.progressEnabled);
    document.getElementById("cart-discount-style-config")?.classList.toggle("hidden",!c.discountEnabled);
    applyCheckoutButtonStyle();
    renderRecommendList();
    renderMilestoneList();
    renderCartItemDemo();
    if(state.cartFocusMode){renderFocusStage();renderFocusPartPanel();}
  }
  function bindConfig(){
    const map={"cart-item-shape":"itemShape","cart-remove-color":"removeButtonColor","cart-discount-toggle":"discountEnabled","cart-recommend-toggle":"recommendEnabled","cart-progress-toggle":"progressEnabled","cart-button-color":"buttonColor","cart-button-shape":"buttonShape","cart-discount-button-color":"discountButtonColor","cart-discount-button-shape":"discountButtonShape"};
    Object.entries(map).forEach(([id,p])=>document.getElementById(id)?.addEventListener("change",e=>{window.WebBuilderHistory?.arm();setConfig({[p]:e.target.type==="checkbox"?e.target.checked:e.target.value},false);window.WebBuilderHistory?.commit();renderConfig();renderCart();},true));
    [["cid-remove-style","removeStyle"],["cid-remove-shape","removeShape"],["cid-quantity-style","quantityStyle"],["cid-price-style","priceStyle"]].forEach(([id,p])=>document.getElementById(id)?.addEventListener("change",e=>{window.WebBuilderHistory?.arm();setItemDisplay({[p]:e.target.value},false);window.WebBuilderHistory?.commit();renderConfig();renderCart();},true));
    document.getElementById("cid-show-description")?.addEventListener("change",e=>{window.WebBuilderHistory?.arm();setItemDisplay({showDescription:e.target.checked},false);window.WebBuilderHistory?.commit();renderConfig();renderCart();},true);
    document.getElementById("cart-button-label")?.addEventListener("change",e=>{window.WebBuilderHistory?.arm();setButtonLabel(e.target.value,false);window.WebBuilderHistory?.commit();renderConfig();},true);
    bindAddRecommendation();
    bindAddMilestone();
    renderConfig();
  }
  document.addEventListener("DOMContentLoaded",()=>setTimeout(bindConfig,0)); window.WebBuilderCartConfigRuntime={render:renderConfig,renderRecommendList,renderMilestoneList,renderCartItemDemo};

  // ------------------------------------------------------------------
  // Cart focus editor (tasks 3 + 4).
  //
  // Entering focus mode hides normal canvas content (elements + header/
  // footer bars, via CSS body.cart-focus-active — see css/styles.css) and
  // shows a single demo cart item centered over the canvas
  // (#cart-focus-stage, mounted into .canvas-container so it stays fixed
  // regardless of zoom). The right-hand inspector swaps to
  // #cart-inspector-form (analogous to #bar-inspector-form).
  //
  // Each sub-part of the demo item (icon/name, qty, price, remove button,
  // description) is wrapped by buildCartItemHTML() in a
  // [data-cart-part] span when interactive=true. Clicking selects it;
  // dragging updates its pixel offset in
  // cartConfig.itemDisplay.layout[partKey]. During an active drag we only
  // touch the DOM directly + write state silently (no notify()) — exactly
  // like canvas.js's dragLock pattern — so a re-render can't replace the
  // dragged node mid-move. The offset is committed to history and
  // broadcast (notify) only on pointerup.
  // ------------------------------------------------------------------
  function getPartLayout(partKey) {
    const layout = state.cartConfig.itemDisplay.layout || (state.cartConfig.itemDisplay.layout = {});
    return layout[partKey] || { x: 0, y: 0 };
  }
  function setPartLayoutSilent(partKey, x, y) {
    const layout = state.cartConfig.itemDisplay.layout || (state.cartConfig.itemDisplay.layout = {});
    layout[partKey] = { x: Math.round(x) || 0, y: Math.round(y) || 0 };
  }
  function setPartLayout(partKey, x, y, recordHistory = true) {
    if (recordHistory) window.WebBuilderHistory?.arm();
    setPartLayoutSilent(partKey, x, y);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "part-layout", state.cartConfig.itemDisplay.layout);
  }
  function resetPartLayout(partKey) {
    window.WebBuilderHistory?.arm();
    const layout = state.cartConfig.itemDisplay.layout || (state.cartConfig.itemDisplay.layout = {});
    delete layout[partKey];
    window.WebBuilderHistory?.commit();
    notify("cart", "part-layout", layout);
  }
  function selectFocusPart(partKey) {
    state.cartFocusSelectedPart = partKey;
    renderFocusStage();
    renderFocusPartPanel();
  }
  function renderFocusPartPanel() {
    const empty = document.getElementById("cart-part-empty");
    const editor = document.getElementById("cart-part-editor");
    if (!empty || !editor) return;
    const partKey = state.cartFocusSelectedPart;
    if (!partKey) { empty.classList.remove("hidden"); editor.classList.add("hidden"); return; }
    empty.classList.add("hidden"); editor.classList.remove("hidden");
    const labels = { icon: "Icon / Name", qty: "Mengenanzeige", price: "Preis", remove: "Entfernen-Button", description: "Beschreibung" };
    const labelEl = document.getElementById("cart-part-label");
    if (labelEl) labelEl.textContent = labels[partKey] || partKey;
    const layout = getPartLayout(partKey);
    const xInput = document.getElementById("cart-part-x"), yInput = document.getElementById("cart-part-y");
    if (xInput && document.activeElement !== xInput) xInput.value = layout.x;
    if (yInput && document.activeElement !== yInput) yInput.value = layout.y;
  }
  function bindFocusStageInteractions(container) {
    if (!container || container.dataset.webBuilderPartsBound === "true") return;
    container.dataset.webBuilderPartsBound = "true";
    container.addEventListener("pointerdown", e => {
      if (!state.cartFocusMode) return;
      const partEl = e.target.closest?.("[data-cart-part]");
      if (!partEl) return;
      e.preventDefault(); e.stopPropagation();
      const partKey = partEl.dataset.cartPart;
      selectFocusPart(partKey);
      const origin = getPartLayout(partKey);
      const startX = e.clientX, startY = e.clientY;
      let moved = false;
      try { partEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      function onMove(moveEvent) {
        const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
        if (!moved && Math.hypot(dx, dy) < 3) return;
        moved = true;
        const nextX = origin.x + dx, nextY = origin.y + dy;
        partEl.style.transform = `translate(${nextX}px, ${nextY}px)`;
        setPartLayoutSilent(partKey, nextX, nextY);
      }
      function onUp() {
        partEl.removeEventListener("pointermove", onMove);
        partEl.removeEventListener("pointerup", onUp);
        partEl.removeEventListener("pointercancel", onUp);
        try { partEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (moved) { window.WebBuilderHistory?.commit(); notify("cart", "part-layout", state.cartConfig.itemDisplay.layout); }
      }
      window.WebBuilderHistory?.arm();
      partEl.addEventListener("pointermove", onMove);
      partEl.addEventListener("pointerup", onUp);
      partEl.addEventListener("pointercancel", onUp);
    });
  }
  function renderFocusStage() {
    if (!state.cartFocusMode) return;
    const host = document.querySelector(".canvas-container");
    if (!host) return;
    let stage = document.getElementById("cart-focus-stage");
    if (!stage) {
      stage = document.createElement("div");
      stage.id = "cart-focus-stage";
      stage.className = "cart-focus-stage";
      host.appendChild(stage);
    }
    const products = window.WebBuilderProducts?.getAll?.() || [];
    const demoSource = products[0] || { name: "Beispielprodukt", price: 19.99, discountPrice: 14.99, icon: "📦", description: "Kurze Beschreibung des Produkts." };
    const demoItem = { id: "focus-demo", name: demoSource.name, price: demoSource.price, discountPrice: demoSource.discountPrice, qty: 2, icon: demoSource.icon, description: demoSource.description || "Kurze Beschreibung des Produkts." };
    const config = getConfig() || {};
    const checkoutColor = config.buttonColor || "#4f46e5";
    const checkoutRadius = config.buttonShape === "pill" ? "999px" : (config.buttonShape === "square" ? "0px" : "6px");
    stage.innerHTML = `
      <div class="cart-focus-card">
        <p class="cart-focus-hint">Beispiel-Artikel — klicke auf einen Teil, um ihn zu verschieben</p>
        ${buildCartItemHTML(demoItem, true, true)}
        <button type="button" class="btn btn-primary" style="width:100%; margin-top:16px; background-color:${checkoutColor}; border-radius:${checkoutRadius};">${esc(state.cartButtonLabel || "Zur Kasse gehen")}</button>
      </div>
    `;
    bindFocusStageInteractions(stage);
  }
  function enterFocusMode() {
    state.cartFocusMode = true;
    state.cartFocusSelectedPart = null;
    document.body.classList.add("cart-focus-active");
    // Mutually exclusive with the normal element / bar-item inspectors.
    window.WebBuilderInspector?.select?.(null);
    window.WebBuilderHeaderFooterRuntime?.clearSelection?.();
    document.getElementById("cart-inspector-form")?.classList.remove("hidden");
    renderFocusStage();
    renderFocusPartPanel();
  }
  function exitFocusMode() {
    state.cartFocusMode = false;
    state.cartFocusSelectedPart = null;
    document.body.classList.remove("cart-focus-active");
    document.getElementById("cart-focus-stage")?.remove();
    document.getElementById("cart-inspector-form")?.classList.add("hidden");
  }
  function bindFocusEditor() {
    document.getElementById("btn-cart-focus-editor")?.addEventListener("click", e => { e.preventDefault(); enterFocusMode(); }, true);
    document.getElementById("btn-cart-focus-exit")?.addEventListener("click", e => { e.preventDefault(); exitFocusMode(); }, true);
    document.getElementById("cart-part-x")?.addEventListener("change", e => {
      const partKey = state.cartFocusSelectedPart; if (!partKey) return;
      const layout = getPartLayout(partKey);
      setPartLayout(partKey, Number(e.target.value) || 0, layout.y);
      renderFocusStage();
    }, true);
    document.getElementById("cart-part-y")?.addEventListener("change", e => {
      const partKey = state.cartFocusSelectedPart; if (!partKey) return;
      const layout = getPartLayout(partKey);
      setPartLayout(partKey, layout.x, Number(e.target.value) || 0);
      renderFocusStage();
    }, true);
    document.getElementById("cart-part-reset")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (state.cartFocusSelectedPart) { resetPartLayout(state.cartFocusSelectedPart); renderFocusStage(); renderFocusPartPanel(); }
    }, true);
    document.addEventListener("keydown", e => { if (e.key === "Escape" && state.cartFocusMode) exitFocusMode(); });
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bindFocusEditor, 0));
  window.WebBuilderCartFocus = { enter: enterFocusMode, exit: exitFocusMode, isActive: () => !!state.cartFocusMode };
})();
