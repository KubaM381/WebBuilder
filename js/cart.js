// WebBuilder cart domain
// Owns product data, cart data and their editor UI. No separate product/cart runtime files.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderCart: WebBuilderState is not available."); return; }
  const clone = value => JSON.parse(JSON.stringify(value));
  function notify(domain, action, payload) { if (typeof state.notify === "function") state.notify(domain, action, payload); }
  function normalizeProduct(product = {}) { const price = Number(product.price) || 0; const discountPrice = product.discountPrice != null && product.discountPrice !== "" ? Number(product.discountPrice) || 0 : null; return { id: product.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, name: product.name || "Neues Produkt", price, discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null, icon: product.icon || "📦", description: product.description || "", compareAtPrice: product.compareAtPrice != null && product.compareAtPrice !== "" ? Number(product.compareAtPrice) || 0 : null }; }
  function normalizeProducts() { state.products = Array.isArray(state.products) ? state.products.map(normalizeProduct) : []; return state.products; }
  function getProducts() { return state.products; } function getProduct(id) { return state.products.find(p => p?.id === id) || null; }
  function addProduct(product = {}, recordHistory = true) { if (recordHistory) window.WebBuilderHistory?.arm(); const item = normalizeProduct(product); state.products.push(item); if (recordHistory) window.WebBuilderHistory?.commit(); notify("products", "add", item); return item; }
  function updateProduct(id, patch = {}, recordHistory = true) { const product = getProduct(id); if (!product) return null; if (recordHistory) window.WebBuilderHistory?.arm(); Object.assign(product, clone(patch)); Object.assign(product, normalizeProduct(product)); if (recordHistory) window.WebBuilderHistory?.commit(); notify("products", "update", product); return product; }
  function removeProduct(id, recordHistory = true) { const i = state.products.findIndex(p => p?.id === id); if (i < 0) return false; if (recordHistory) window.WebBuilderHistory?.arm(); const removed = state.products.splice(i,1)[0]; if (recordHistory) window.WebBuilderHistory?.commit(); notify("products", "remove", removed); return true; }
  function replaceProducts(items = [], recordHistory = false) { if (recordHistory) window.WebBuilderHistory?.arm(); state.products.length = 0; state.products.push(...(Array.isArray(items) ? items.map(normalizeProduct) : [])); if (recordHistory) window.WebBuilderHistory?.commit(); notify("products", "replaceAll", {count:state.products.length}); return state.products; }
  function normalizeCartItem(item = {}) { const price = Number(item.price) || 0; const discountPrice = item.discountPrice != null && item.discountPrice !== "" ? Number(item.discountPrice) || 0 : null; return { id: item.id || `cart_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, name: item.name || "Produkt", price, discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null, qty: Math.max(1, Number(item.qty) || 1), icon: item.icon || "📦", description: item.description || "", compareAtPrice: item.compareAtPrice != null && item.compareAtPrice !== "" ? Number(item.compareAtPrice) || 0 : null }; }
  function getEffectivePrice(item) { const discount = Number(item?.discountPrice); return Number.isFinite(discount) && discount > 0 && discount < (Number(item?.price) || 0) ? discount : Number(item?.price) || 0; }
  function normalizeState() { normalizeProducts(); state.cartItems = Array.isArray(state.cartItems) ? state.cartItems.map(normalizeCartItem) : []; if (!Array.isArray(state.cartConfig.recommendations)) state.cartConfig.recommendations = []; if (!Array.isArray(state.cartConfig.milestones)) state.cartConfig.milestones = []; return state; }
  function getItems() { return state.cartItems; } function getConfig() { return state.cartConfig; } function getCount() { return state.cartItems.reduce((s,i)=>s+(Number(i.qty)||0),0); } function getSubtotal() { return state.cartItems.reduce((s,i)=>s+getEffectivePrice(i)*(Number(i.qty)||0),0); }
  function addItem(productOrItem, price, icon, description, compareAtPrice, recordHistory = true) { const source = typeof productOrItem === "object" ? productOrItem : {name:productOrItem,price,icon,description,compareAtPrice}; const normalized=normalizeCartItem(source); const existing=state.cartItems.find(i=>i.name===normalized.name); if(recordHistory) window.WebBuilderHistory?.arm(); if(existing) existing.qty=(Number(existing.qty)||0)+1; else state.cartItems.push(normalized); if(recordHistory) window.WebBuilderHistory?.commit(); notify("cart", existing?"increment":"add", existing||normalized); return existing||normalized; }
  function updateQty(id,qty,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;if(recordHistory)window.WebBuilderHistory?.arm();item.qty=Math.max(1,Number(qty)||1);if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","updateQty",item);return item;}
  function changeQty(id,delta,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;const next=(Number(item.qty)||0)+(Number(delta)||0);return next<=0?removeItem(id,recordHistory):updateQty(id,next,recordHistory);}
  function updatePrice(id,price,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;if(recordHistory)window.WebBuilderHistory?.arm();item.price=Number(price)||0;if(item.discountPrice!=null&&item.discountPrice>=item.price)item.discountPrice=null;if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","updatePrice",item);return item;}
  function updateDiscountPrice(id,value,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;if(recordHistory)window.WebBuilderHistory?.arm();const v=Number(value);item.discountPrice=Number.isFinite(v)&&v>0&&v<(Number(item.price)||0)?v:null;if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","updateDiscountPrice",item);return item;}
  function removeItem(id,recordHistory=true){const i=state.cartItems.findIndex(x=>x?.id===id);if(i<0)return false;if(recordHistory)window.WebBuilderHistory?.arm();const removed=state.cartItems.splice(i,1)[0];if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","remove",removed);return true;}
  function clear(recordHistory=true){if(!state.cartItems.length)return;if(recordHistory)window.WebBuilderHistory?.arm();state.cartItems.length=0;if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","clear");}
  function setConfig(patch={},recordHistory=true){if(recordHistory)window.WebBuilderHistory?.arm();Object.assign(state.cartConfig,clone(patch));if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","config",state.cartConfig);return state.cartConfig;}
  function setItemDisplay(patch={},recordHistory=true){if(recordHistory)window.WebBuilderHistory?.arm();state.cartConfig.itemDisplay=Object.assign({},state.cartConfig.itemDisplay||{},clone(patch));if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","display",state.cartConfig.itemDisplay);return state.cartConfig.itemDisplay;}
  function setButtonLabel(label,recordHistory=true){if(recordHistory)window.WebBuilderHistory?.arm();state.cartButtonLabel=String(label||"Zur Kasse gehen");if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","button-label",state.cartButtonLabel);return state.cartButtonLabel;}

  // ------------------------------------------------------------------
  // Rabattcode (Demo-Implementierung: Code "DEMO10" = -10%)
  // ------------------------------------------------------------------
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

  // ------------------------------------------------------------------
  // Produktempfehlungen — referenzieren ausschließlich Produkt-IDs, keine
  // duplizierten Produktdaten (siehe Projektregel: Empfehlungen dürfen nur
  // auf echte Produkte im Bestand verweisen).
  // ------------------------------------------------------------------
  function addRecommendation(productId) {
    if (!productId || !getProduct(productId)) return null;
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

  // ------------------------------------------------------------------
  // Meilensteine (Fortschrittsbalken)
  // ------------------------------------------------------------------
  function addMilestone() {
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.milestones)) state.cartConfig.milestones = [];
    state.cartConfig.milestones.push({ id: `ms_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, amount: 50, label: "Kostenloser Versand", action: "free-shipping" });
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
  window.WebBuilderCart = { getItems, getProducts, getProduct, getConfig, getCount, getSubtotal, getEffectivePrice, addItem, updateQty, changeQty, updatePrice, updateDiscountPrice, removeItem, clear, setConfig, setItemDisplay, setButtonLabel, normalizeProduct, normalizeCartItem, normalizeState, addProduct, updateProduct, removeProduct, replaceProducts, applyDiscountCode, addRecommendation, removeRecommendation, addMilestone, removeMilestone };
  window.WebBuilderProducts = { normalize: normalizeProduct, normalizeState: normalizeProducts, getAll: getProducts, getById: getProduct, add: addProduct, update: updateProduct, remove: removeProduct, replaceAll: replaceProducts };

  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const eur=v=>`${Number(v||0).toFixed(2).replace(".",",")} €`;

  function renderProducts(){const list=document.getElementById("product-list");if(!list)return;const items=getProducts();list.innerHTML=items.length?"":'<p class="help-text">Noch keine Produkte angelegt. Klicke oben auf „+ Neues Produkt“.</p>';items.forEach(p=>{const card=document.createElement("div");card.className="product-card";card.dataset.productId=p.id;card.innerHTML=`<div class="product-card-header"><span class="product-card-icon">${esc(p.icon)}</span><div class="product-card-title"><strong>${esc(p.name)}</strong><span>${esc(p.description)}</span></div><button type="button" class="product-delete" data-product-action="delete">×</button></div><div class="product-card-fields"><label>Name<input data-product-field="name" value="${esc(p.name)}"></label><label>Preis (€)<input type="number" min="0" step="0.01" data-product-field="price" value="${esc(p.price)}"></label><label>Rabattpreis (€)<input type="number" min="0" step="0.01" data-product-field="discountPrice" value="${p.discountPrice==null?"":esc(p.discountPrice)}"></label><label>Icon<input data-product-field="icon" value="${esc(p.icon)}"></label><label class="product-card-description">Beschreibung<textarea data-product-field="description" rows="2">${esc(p.description)}</textarea></label></div><div class="product-card-price">${p.discountPrice!=null?`<s>${Number(p.price).toFixed(2)} €</s> <strong>${Number(p.discountPrice).toFixed(2)} €</strong>`:`<strong>${Number(p.price).toFixed(2)} €</strong>`}</div>`;list.appendChild(card);});}

  // ------------------------------------------------------------------
  // Baut das HTML für eine einzelne Warenkorb-Zeile — jetzt tatsächlich
  // abhängig von cartConfig.itemShape und cartConfig.itemDisplay, statt
  // hartcodiert "rounded" + Stepper + "X" wie zuvor.
  // ------------------------------------------------------------------
  function buildCartItemHTML(item, isDemo) {
    const config = getConfig() || {};
    const disp = config.itemDisplay || {};
    const idAttr = isDemo ? "" : ` data-cart-id="${esc(item.id)}"`;

    let removeInner = "✕";
    if (disp.removeStyle === "trash") removeInner = "🗑️";
    if (disp.removeStyle === "text") removeInner = "Entfernen";
    const removeShapeClass = disp.removeShape === "circle" ? "remove-shape-circle" : (disp.removeShape === "square" ? "remove-shape-square" : "");
    const removeBtn = `<button type="button" class="cart-item-remove ${removeShapeClass}"${idAttr} title="Entfernen" style="color:${config.removeButtonColor || "#ef4444"};">${removeInner}</button>`;

    let qtyHtml;
    if (disp.quantityStyle === "dropdown") {
      const opts = Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<option value="${n}" ${n === Number(item.qty) ? "selected" : ""}>${n}</option>`).join("");
      qtyHtml = `<select class="cart-qty-select"${idAttr}>${opts}</select>`;
    } else if (disp.quantityStyle === "static") {
      qtyHtml = `<span class="cart-qty-static">× ${Number(item.qty) || 1}</span>`;
    } else {
      qtyHtml = `<span class="cart-qty-stepper"><button type="button" class="cart-qty-minus"${idAttr}>−</button><span>${Number(item.qty) || 1}</span><button type="button" class="cart-qty-plus"${idAttr}>+</button></span>`;
    }

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
      priceHtml = `<input type="number" class="cart-item-price-input" data-cart-id="${esc(item.id)}" value="${Number(item.price || 0).toFixed(2)}" step="0.01" style="width:70px;" />`;
    }

    const descHtml = disp.showDescription && item.description ? `<div class="cart-item-desc">${esc(item.description)}</div>` : "";
    const shapeClass = "cart-item-" + (config.itemShape || "rounded");

    return `<div class="cart-item ${shapeClass}"${idAttr}>
      <span class="cart-item-title">${item.icon ? esc(item.icon) + " " : ""}${esc(item.name)}</span>
      ${qtyHtml}
      ${priceHtml}
      ${removeBtn}
      ${descHtml}
    </div>`;
  }

  function renderCartItemDemo() {
    const host = document.getElementById("cart-item-demo-preview");
    if (!host) return;
    const products = getProducts();
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
    const rows = ids.map(id => ({ id, product: getProduct(id) })).filter(r => r.product);
    // Verwaiste IDs (Produkt gelöscht) automatisch entfernen.
    if (rows.length !== ids.length) state.cartConfig.recommendations = rows.map(r => r.id);
    listEl.innerHTML = rows.length ? "" : '<p class="help-text">Noch keine Empfehlungen.</p>';
    rows.forEach(({ id, product }) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `<span class="product-icon-preview">${esc(product.icon || "📦")}</span><span style="flex:1;">${esc(product.name)} — ${eur(product.discountPrice != null ? product.discountPrice : product.price)}</span><button type="button" class="item-delete" data-rec-id="${esc(id)}">✕</button>`;
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
      const list = getProducts();
      if (!list.length) {
        window.WebBuilderModals?.openMessage?.("Keine Produkte", "Lege zuerst im Tab „📦 Produkte“ ein Produkt an.");
        return;
      }
      const bodyHtml = `<div style="display:flex;flex-direction:column;gap:8px;">${list.map(p => `<button type="button" class="btn btn-secondary product-pick-btn" data-id="${esc(p.id)}" style="justify-content:flex-start;">${esc(p.icon || "📦")} ${esc(p.name)} — ${eur(p.discountPrice != null ? p.discountPrice : p.price)}</button>`).join("")}</div>`;
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
      row.innerHTML = `<input type="number" class="ms-amount" data-id="${esc(m.id)}" value="${Number(m.amount) || 0}" step="1" style="width:70px;" placeholder="Betrag (€)">
        <input type="text" class="ms-label" data-id="${esc(m.id)}" value="${esc(m.label)}" style="width:100px;" placeholder="Label">
        <select class="ms-action" data-id="${esc(m.id)}">
          <option value="free-shipping" ${m.action === "free-shipping" ? "selected" : ""}>Kostenloser Versand</option>
          <option value="discount" ${m.action === "discount" ? "selected" : ""}>Extra-Rabatt (10%)</option>
          <option value="free-product" ${m.action === "free-product" ? "selected" : ""}>Gratis-Produkt Hinweis</option>
          <option value="message" ${m.action === "message" ? "selected" : ""}>Nur Hinweistext</option>
        </select>
        <button type="button" class="item-delete" data-id="${esc(m.id)}">✕</button>`;
      listEl.appendChild(row);
    });
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
      html+=`<div class="cart-progress"><div class="cart-progress-track"><div class="cart-progress-fill" style="width:${pct}%"></div>${milestones.map(m=>`<div class="cart-progress-mark ${subtotal>=Number(m.amount)?"reached":""}" style="left:${Math.min(100,(Number(m.amount)/max)*100)}%" title="${esc(m.label)}"></div>`).join("")}</div><p class="cart-progress-msg">${next?`Noch ${eur(Number(next.amount)-subtotal)} bis „${esc(next.label)}“`:"✓ Alle Ziele freigeschaltet"}</p></div>`;
    }

    html+=items.length?items.map(i=>buildCartItemHTML(i,false)).join(""):'<p class="cart-empty-msg">Dein Warenkorb ist leer.</p>';

    if(config.recommendEnabled && Array.isArray(config.recommendations) && config.recommendations.length){
      const cartNames=new Set(items.map(i=>i.name));
      const candidates=config.recommendations.map(id=>getProduct(id)).filter(p=>p && !cartNames.has(p.name));
      if(candidates.length){
        const pick=candidates[0];
        html+=`<div class="cart-recommend"><p class="cart-recommend-title">Das könnte dir auch gefallen</p><div class="cart-recommend-card"><span class="cart-recommend-icon">${esc(pick.icon||"📦")}</span><span class="cart-recommend-name">${esc(pick.name)}</span><span class="cart-recommend-price">${eur(pick.discountPrice!=null?pick.discountPrice:pick.price)}</span><button type="button" class="cart-recommend-add" data-rec-product-id="${esc(pick.id)}">+</button></div></div>`;
      }
    }

    if(config.discountEnabled){
      html+=`<div class="cart-discount"><input type="text" id="cart-discount-input" placeholder="Rabattcode (Demo: DEMO10)"><button type="button" id="cart-discount-apply">Anwenden</button>${state.appliedDiscountLabel?`<p class="cart-discount-msg ok">${esc(state.appliedDiscountLabel)}</p>`:""}</div>`;
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
    document.getElementById("product-list")?.addEventListener("click",e=>{const b=e.target.closest?.('[data-product-action="delete"]');if(!b)return;const c=b.closest("[data-product-id]");if(!c)return;e.preventDefault();e.stopImmediatePropagation();removeProduct(c.dataset.productId);renderProducts();renderRecommendList();renderCartItemDemo();},true);
    document.getElementById("product-list")?.addEventListener("change",e=>{const f=e.target.closest?.("[data-product-field]");const c=f?.closest("[data-product-id]");if(!f||!c)return;const value=f.type==="number"?(f.value===""?null:Number(f.value)):f.value;updateProduct(c.dataset.productId,{[f.dataset.productField]:value});renderProducts();renderRecommendList();renderCartItemDemo();},true);
    document.getElementById("btn-add-product")?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const p=addProduct();renderProducts();document.querySelector(`[data-product-id="${CSS.escape(p.id)}"] [data-product-field="name"]`)?.focus();},true);

    const list=document.getElementById("cart-items-list");
    list?.addEventListener("click",e=>{
      const discountBtn=e.target.closest?.("#cart-discount-apply");
      if(discountBtn){e.preventDefault();e.stopImmediatePropagation();applyDiscountCode();return;}
      const recBtn=e.target.closest?.(".cart-recommend-add");
      if(recBtn){e.preventDefault();e.stopImmediatePropagation();const product=getProduct(recBtn.dataset.recProductId);if(product)addItem(product);return;}
      const t=e.target.closest?.("[data-cart-id]");
      if(!t)return;
      e.preventDefault();e.stopImmediatePropagation();
      const id=t.dataset.cartId;
      if(t.classList.contains("cart-item-remove"))removeItem(id);
      else if(t.classList.contains("cart-qty-minus"))changeQty(id,-1);
      else if(t.classList.contains("cart-qty-plus"))changeQty(id,1);
      renderCart();
    },true);
    // FIX: previously the price input and the quantity dropdown were never
    // wired up at all — editing them in the drawer had zero effect.
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
    state.subscribe?.(e=>{if(["cart","products"].includes(e?.domain)){renderProducts();renderCart();renderRecommendList();renderMilestoneList();renderCartItemDemo();}});
    renderProducts();renderCart();renderRecommendList();renderMilestoneList();renderCartItemDemo();
  }
  function openCart(){document.getElementById("cart-drawer")?.classList.add("active");document.getElementById("cart-drawer-backdrop")?.classList.add("active");renderCart();return true;} function closeCart(){document.getElementById("cart-drawer")?.classList.remove("active");document.getElementById("cart-drawer-backdrop")?.classList.remove("active");return true;}
  document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0));
  window.WebBuilderCartRuntime={render:renderCart,open:openCart,close:closeCart}; window.WebBuilderProductsRuntime={render:renderProducts,addProduct};

  // Cart configuration editor lives in the cart domain.
  function renderConfig(){
    const c=getConfig()||{},d=c.itemDisplay||{};
    const map={"cart-item-shape":c.itemShape,"cart-remove-color":c.removeButtonColor,"cid-remove-style":d.removeStyle||"x","cid-remove-shape":d.removeShape||"circle","cid-quantity-style":d.quantityStyle||"stepper","cid-price-style":d.priceStyle||"simple"};
    Object.entries(map).forEach(([id,v])=>{const e=document.getElementById(id);if(e&&v!=null)e.value=v;});
    const ids=[["cart-discount-toggle",c.discountEnabled],["cart-recommend-toggle",c.recommendEnabled],["cart-progress-toggle",c.progressEnabled],["cid-show-description",d.showDescription]];
    ids.forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.checked=!!v;});
    const color=document.getElementById("cart-button-color");if(color)color.value=c.buttonColor||"#4f46e5";
    const shape=document.getElementById("cart-button-shape");if(shape)shape.value=c.buttonShape||"rounded";
    const label=document.getElementById("cart-button-label");if(label)label.value=state.cartButtonLabel||"Zur Kasse gehen";
    document.getElementById("cart-recommend-config")?.classList.toggle("hidden",!c.recommendEnabled);
    document.getElementById("cart-progress-config")?.classList.toggle("hidden",!c.progressEnabled);
    applyCheckoutButtonStyle();
    renderRecommendList();
    renderMilestoneList();
    renderCartItemDemo();
  }
  function bindConfig(){
    const map={"cart-item-shape":"itemShape","cart-remove-color":"removeButtonColor","cart-discount-toggle":"discountEnabled","cart-recommend-toggle":"recommendEnabled","cart-progress-toggle":"progressEnabled","cart-button-color":"buttonColor","cart-button-shape":"buttonShape"};
    Object.entries(map).forEach(([id,p])=>document.getElementById(id)?.addEventListener("change",e=>{window.WebBuilderHistory?.arm();setConfig({[p]:e.target.type==="checkbox"?e.target.checked:e.target.value},false);window.WebBuilderHistory?.commit();renderConfig();renderCart();},true));
    [["cid-remove-style","removeStyle"],["cid-remove-shape","removeShape"],["cid-quantity-style","quantityStyle"],["cid-price-style","priceStyle"]].forEach(([id,p])=>document.getElementById(id)?.addEventListener("change",e=>{window.WebBuilderHistory?.arm();setItemDisplay({[p]:e.target.value},false);window.WebBuilderHistory?.commit();renderConfig();renderCart();},true));
    document.getElementById("cid-show-description")?.addEventListener("change",e=>{window.WebBuilderHistory?.arm();setItemDisplay({showDescription:e.target.checked},false);window.WebBuilderHistory?.commit();renderConfig();renderCart();},true);
    document.getElementById("cart-button-label")?.addEventListener("change",e=>{window.WebBuilderHistory?.arm();setButtonLabel(e.target.value,false);window.WebBuilderHistory?.commit();renderConfig();},true);
    bindAddRecommendation();
    bindAddMilestone();
    renderConfig();
  }
  document.addEventListener("DOMContentLoaded",()=>setTimeout(bindConfig,0)); window.WebBuilderCartConfigRuntime={render:renderConfig,renderRecommendList,renderMilestoneList,renderCartItemDemo};
})();
