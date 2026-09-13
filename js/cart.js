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

  // Fixed palette for the quantity +/- buttons (task 5) — deliberately a
  // closed set (not a free color picker) so the buttons stay legible
  // against any item background.
  const QUANTITY_BUTTON_COLORS = { green: "#10b981", red: "#ef4444", black: "#111827", gray: "#6b7280" };
  function quantityColorHex(key) { return QUANTITY_BUTTON_COLORS[key] || QUANTITY_BUTTON_COLORS.black; }

  function normalizeCartItem(item = {}) {
    const price = Number(item.price) || 0;
    const discountPrice = item.discountPrice != null && item.discountPrice !== "" ? Number(item.discountPrice) || 0 : null;
    return {
      id: item.id || `cart_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      // Reference back to the source product (task: reliable "already in
      // cart?" checks for recommendations). Optional — old saved cart
      // items without it just fall back to name-matching, see
      // pickRecommendation() below.
      productId: item.productId || null,
      name: item.name || "Produkt",
      price,
      discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null,
      qty: Math.max(1, Number(item.qty) || 1),
      icon: item.icon || "📦",
      description: item.description || ""
    };
  }
  function getEffectivePrice(item) { const discount = Number(item?.discountPrice); return Number.isFinite(discount) && discount > 0 && discount < (Number(item?.price) || 0) ? discount : Number(item?.price) || 0; }

  // ------------------------------------------------------------------
  // Recommendations — each entry is a small rule object instead of a
  // bare product ID, so text/alternative/condition can be configured per
  // recommendation. Legacy projects stored plain ID strings; those are
  // migrated transparently by normalizeRecommendation().
  // ------------------------------------------------------------------
  function defaultRecommendationText() { return "Das könnte dir auch gefallen"; }

  function normalizeRecommendation(entry) {
    const rec = typeof entry === "string" ? { productId: entry } : (entry || {});
    const cond = rec.condition && typeof rec.condition === "object" ? rec.condition : {};
    return {
      id: rec.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      productId: rec.productId || null,
      alternativeProductId: rec.alternativeProductId || null,
      text: rec.text || defaultRecommendationText(),
      // type: "none" | "cartCountEquals" | "cartCountAtLeast" | "subtotalBelow" | "subtotalAbove"
      // Kept as a single object (not an array) for now — extending to
      // multiple combined conditions later just means changing this one
      // shape plus conditionMatches()/the sidebar row.
      condition: { type: cond.type || "none", value: Number(cond.value) || 0 }
    };
  }
  function normalizeRecommendations(list) {
    return (Array.isArray(list) ? list : []).map(normalizeRecommendation);
  }

  const CONDITION_LABELS = {
    none: "Immer anzeigen",
    cartCountEquals: "Nur bei genau X Artikeln im Warenkorb",
    cartCountAtLeast: "Ab X Artikeln im Warenkorb",
    subtotalBelow: "Wenn Warenkorbwert unter X €",
    subtotalAbove: "Wenn Warenkorbwert über X €"
  };

  // "count" = Summe aller Mengen im (übergebenen) Warenkorb, nicht die
  // Anzahl unterschiedlicher Produkte.
  function conditionMatches(condition, ctx) {
    const type = condition?.type || "none";
    const value = Number(condition?.value) || 0;
    switch (type) {
      case "cartCountEquals": return ctx.count === value;
      case "cartCountAtLeast": return ctx.count >= value;
      case "subtotalBelow": return ctx.subtotal < value;
      case "subtotalAbove": return ctx.subtotal > value;
      default: return true;
    }
  }

  // Finds the first matching recommendation for the given cart contents.
  // If its primary product is already in the cart, falls back to the
  // configured alternative (if any and if that one isn't also in the cart).
  function pickRecommendation(items, subtotal) {
    const list = Array.isArray(getConfig()?.recommendations) ? getConfig().recommendations : [];
    if (!list.length) return null;
    const count = items.reduce((s, i) => s + (Number(i.qty) || 0), 0);
    const inCartIds = new Set(items.map(i => i.productId).filter(Boolean));
    const inCartNames = new Set(items.map(i => i.name));
    for (const rec of list) {
      if (!conditionMatches(rec.condition, { count, subtotal })) continue;
      let product = rec.productId ? window.WebBuilderProducts?.getById?.(rec.productId) : null;
      const primaryInCart = product && (inCartIds.has(product.id) || inCartNames.has(product.name));
      if (primaryInCart) {
        product = rec.alternativeProductId ? window.WebBuilderProducts?.getById?.(rec.alternativeProductId) : null;
        if (!product) continue;
        if (inCartIds.has(product.id) || inCartNames.has(product.name)) continue;
      }
      if (!product) continue;
      return { rec, product };
    }
    return null;
  }

  // Normalizes in place (WebBuilderUtils.normalizeInPlace) so references
  // stay stable during active quantity/price edits.
  function normalizeState() {
    window.WebBuilderProducts?.normalizeState?.();
    state.cartItems = window.WebBuilderUtils.normalizeInPlace(state.cartItems, normalizeCartItem);
    state.cartConfig.recommendations = normalizeRecommendations(state.cartConfig.recommendations);
    if (!Array.isArray(state.cartConfig.milestones)) state.cartConfig.milestones = [];
    // Defensive defaults for projects saved before tasks 3/4/7 existed.
    if (!state.cartConfig.itemDisplay || typeof state.cartConfig.itemDisplay !== "object") state.cartConfig.itemDisplay = {};
    if (!state.cartConfig.itemDisplay.layout || typeof state.cartConfig.itemDisplay.layout !== "object") state.cartConfig.itemDisplay.layout = {};
    if (state.cartConfig.discountButtonColor == null) state.cartConfig.discountButtonColor = "#4f46e5";
    if (state.cartConfig.discountButtonShape == null) state.cartConfig.discountButtonShape = "rounded";
    // Task 5: quantity selector "group" variant shape + the closed
    // +/- color palette. Defaults keep existing projects' look
    // unchanged (stepper style, black buttons) until explicitly edited.
    if (state.cartConfig.itemDisplay.quantityGroupShape == null) state.cartConfig.itemDisplay.quantityGroupShape = "rounded";
    if (state.cartConfig.itemDisplay.quantityButtonColor == null) state.cartConfig.itemDisplay.quantityButtonColor = "black";
    // Cart editor rework: per-component position offsets (progress,
    // discount, recommend, checkout — keyed like itemDisplay.layout) plus
    // "Artikel-Darstellung" background/size overrides. Empty string /
    // null mean "no override, use the shape's/CSS's own default" so
    // existing projects keep their exact current look until someone
    // explicitly customizes these in the cart editor.
    if (!state.cartConfig.componentLayout || typeof state.cartConfig.componentLayout !== "object") state.cartConfig.componentLayout = {};
    if (state.cartConfig.itemBackgroundColor == null) state.cartConfig.itemBackgroundColor = "";
    if (state.cartConfig.cardBackgroundColor == null) state.cartConfig.cardBackgroundColor = "";
    if (state.cartConfig.itemWidth === undefined) state.cartConfig.itemWidth = null;
    if (state.cartConfig.itemMinHeight === undefined) state.cartConfig.itemMinHeight = null;
    return state;
  }
  function getItems() { return state.cartItems; } function getConfig() { return state.cartConfig; } function getCount() { return state.cartItems.reduce((s,i)=>s+(Number(i.qty)||0),0); } function getSubtotal() { return state.cartItems.reduce((s,i)=>s+getEffectivePrice(i)*(Number(i.qty)||0),0); }
  function addItem(productOrItem, price, icon, description, recordHistory = true) {
    const source = typeof productOrItem === "object" ? productOrItem : { name: productOrItem, price, icon, description };
    const normalized = normalizeCartItem(Object.assign({}, source, { productId: source.productId || source.id || null }));
    const existing = state.cartItems.find(i => i.name === normalized.name);
    if (recordHistory) window.WebBuilderHistory?.arm();
    if (existing) existing.qty = (Number(existing.qty) || 0) + 1;
    else state.cartItems.push(normalized);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", existing ? "increment" : "add", existing || normalized);
    return existing || normalized;
  }
  function updateQty(id,qty,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;if(recordHistory)window.WebBuilderHistory?.arm();item.qty=Math.max(1,Number(qty)||1);if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","updateQty",item);return item;}
  function changeQty(id,delta,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;const next=(Number(item.qty)||0)+(Number(delta)||0);return next<=0?removeItem(id,recordHistory):updateQty(id,next,recordHistory);}
  function updatePrice(id,price,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;if(recordHistory)window.WebBuilderHistory?.arm();item.price=Number(price)||0;if(item.discountPrice!=null&&item.discountPrice>=item.price)item.discountPrice=null;if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","updatePrice",item);return item;}
  function updateDiscountPrice(id,value,recordHistory=true){const item=state.cartItems.find(i=>i?.id===id);if(!item)return null;if(recordHistory)window.WebBuilderHistory?.arm();const v=Number(value);item.discountPrice=Number.isFinite(v)&&v>0&&v<(Number(item.price)||0)?v:null;if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","updateDiscountPrice",item);return item;}
  function removeItem(id,recordHistory=true){const i=state.cartItems.findIndex(x=>x?.id===id);if(i<0)return false;if(recordHistory)window.WebBuilderHistory?.arm();const removed=state.cartItems.splice(i,1)[0];if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","remove",removed);return true;}
  function clear(recordHistory=true){if(!state.cartItems.length)return;if(recordHistory)window.WebBuilderHistory?.arm();state.cartItems.length=0;if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","clear");}
  function setConfig(patch={},recordHistory=true){if(recordHistory)window.WebBuilderHistory?.arm();Object.assign(state.cartConfig,clone(patch));if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","config",state.cartConfig);return state.cartConfig;}
  function setItemDisplay(patch={},recordHistory=true){if(recordHistory)window.WebBuilderHistory?.arm();state.cartConfig.itemDisplay=Object.assign({},state.cartConfig.itemDisplay||{},clone(patch));if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","display",state.cartConfig.itemDisplay);return state.cartConfig.itemDisplay;}
  function setButtonLabel(label,recordHistory=true){if(recordHistory)window.WebBuilderHistory?.arm();state.cartButtonLabel=String(label||"Zur Kasse gehen");if(recordHistory)window.WebBuilderHistory?.commit();notify("cart","button-label",state.cartButtonLabel);return state.cartButtonLabel;}

  // Demo discount code: "DEMO10" = -10%. `container` is the `.cart-discount`
  // wrapper the click came from — the drawer and the editor stage can both
  // render a discount field at the same time, so the input can no longer
  // be looked up by a page-wide id (see buildCartHtml()'s markup).
  function applyDiscountCode(container) {
    const input = container?.querySelector(".cart-discount-input");
    const code = (input?.value || "").trim().toUpperCase();
    if (code === "DEMO10") {
      state.appliedDiscountPercent = 10;
      state.appliedDiscountLabel = 'Code „DEMO10“ angewendet (−10%).';
    } else {
      state.appliedDiscountPercent = 0;
      state.appliedDiscountLabel = code ? "Ungültiger Code (Demo-Code: DEMO10)." : "";
    }
  }

  // Recommendations store product IDs only, no duplicated product data.
  function addRecommendation(productId) {
    if (!productId || !window.WebBuilderProducts?.getById?.(productId)) return null;
    window.WebBuilderHistory?.arm();
    if (!Array.isArray(state.cartConfig.recommendations)) state.cartConfig.recommendations = [];
    const rec = normalizeRecommendation({ productId });
    state.cartConfig.recommendations.push(rec);
    window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
    return rec;
  }
  function removeRecommendation(recId) {
    window.WebBuilderHistory?.arm();
    state.cartConfig.recommendations = (state.cartConfig.recommendations || []).filter(r => r.id !== recId);
    window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
  }
  function updateRecommendation(recId, patch = {}, recordHistory = true) {
    const rec = (state.cartConfig.recommendations || []).find(r => r.id === recId);
    if (!rec) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    if (patch.text !== undefined) rec.text = patch.text;
    if (patch.alternativeProductId !== undefined) rec.alternativeProductId = patch.alternativeProductId || null;
    if (patch.condition !== undefined) rec.condition = { type: patch.condition.type || "none", value: Number(patch.condition.value) || 0 };
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("cart", "recommendations", state.cartConfig.recommendations);
    return rec;
  }

  // Progress-bar milestones. `icon` (task 9) is an optional emoji/short
  // text shown once the milestone is reached (see buildCartHtml()).
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
    getItems, getConfig, getCount, getSubtotal, getEffectivePrice, addItem, updateQty, changeQty, updatePrice, updateDiscountPrice, removeItem, clear, setConfig, setItemDisplay, setButtonLabel, normalizeCartItem, normalizeState, applyDiscountCode, addRecommendation, removeRecommendation, updateRecommendation, addMilestone, removeMilestone
  };

  // esc centralized in state.js (WebBuilderUtils.escapeHtml).
  const esc=window.WebBuilderUtils.escapeHtml;
  const eur=v=>`${Number(v||0).toFixed(2).replace(".",",")} €`;

  // Wraps a top-level cart block (progress bar / discount field /
  // recommendation card) in a positionable, selectable wrapper — the same
  // "only wrap when needed" rule as wrapPart() inside buildCartItemHTML():
  // outside the editor (interactive=false), a block without a custom
  // offset renders exactly as before (no extra DOM), so projects that
  // never touch the cart editor see zero markup change.
  function wrapComponent(innerHtml, componentKey, interactive) {
    const layout = (getConfig().componentLayout || {})[componentKey] || { x: 0, y: 0 };
    const hasOffset = !!(layout.x || layout.y);
    if (!interactive && !hasOffset) return innerHtml;
    const selectedClass = interactive && state.cartFocusSelectedPart === `component:${componentKey}` ? " cart-component-selected" : "";
    const compAttr = interactive ? ` data-cart-component="${componentKey}"` : "";
    return `<div class="cart-component-wrap${selectedClass}"${compAttr} style="transform:translate(${layout.x || 0}px, ${layout.y || 0}px);">${innerHtml}</div>`;
  }

  // Builds one cart-row's HTML, based on cartConfig.itemShape/itemDisplay.
  // `interactive` is only true inside the cart editor stage: it adds
  // click/drag affordances and (on a transparent item shape) a dashed
  // frame around each sub-part. The per-part pixel offset
  // (cartConfig.itemDisplay.layout) itself is applied unconditionally, so
  // positioning changes made in the editor also show up in the real
  // drawer/preview, not just on stage. Same for the whole-article
  // background/width/height overrides (cartConfig.itemBackgroundColor/
  // itemWidth/itemMinHeight, "Artikel-Darstellung") below.
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

    // Task 5: quantity selector variants. "stepper" = individual +/-
    // blocks (unchanged default look), "group" = one connected control
    // with a configurable border-radius. Both draw the +/- color from the
    // same closed palette (quantityColorHex()) so switching variants
    // keeps the chosen color.
    const qtyColor = quantityColorHex(disp.quantityButtonColor);
    let qtyHtml;
    if (disp.quantityStyle === "dropdown") {
      const opts = Array.from({ length: 10 }, (_, i) => i + 1).map(n => `<option value="${n}" ${n === Number(item.qty) ? "selected" : ""}>${n}</option>`).join("");
      qtyHtml = `<select class="cart-qty-select"${idAttr}>${opts}</select>`;
    } else if (disp.quantityStyle === "static") {
      qtyHtml = `<span class="cart-qty-static">× ${Number(item.qty) || 1}</span>`;
    } else if (disp.quantityStyle === "group") {
      const groupShapeClass = "cart-qty-group-" + (disp.quantityGroupShape === "square" ? "square" : (disp.quantityGroupShape === "pill" ? "pill" : "rounded"));
      qtyHtml = `<span class="cart-qty-group ${groupShapeClass}" style="border-color:${qtyColor}; color:${qtyColor};"><button type="button" class="cart-qty-minus cart-qty-group-btn"${idAttr}>−</button><span class="cart-qty-group-value">${Number(item.qty) || 1}</span><button type="button" class="cart-qty-plus cart-qty-group-btn"${idAttr}>+</button></span>`;
    } else {
      qtyHtml = `<span class="cart-qty-stepper"><button type="button" class="cart-qty-minus" style="border-color:${qtyColor}; color:${qtyColor};"${idAttr}>−</button><span>${Number(item.qty) || 1}</span><button type="button" class="cart-qty-plus" style="border-color:${qtyColor}; color:${qtyColor};"${idAttr}>+</button></span>`;
    }
    qtyHtml = wrapPart(qtyHtml, "qty");

    const effective = getEffectivePrice(item);
    const hasDiscount = item.discountPrice != null && effective < Number(item.price || 0);
    let priceHtml;
    if (disp.priceStyle === "strikethrough" && hasDiscount) {
      priceHtml = `<span><s class="cart-item-price-strike">${eur(item.price)}</s> ${eur(effective)}</span>`;
    } else if (disp.priceStyle === "perUnit") {
      priceHtml = `<span>${eur(effective)} / Stk · Summe ${eur(effective * (Number(item.qty) || 1))}</span>`;
    } else if (isDemo || interactive) {
      // interactive (Warenkorb-Editor) added: der Preis wird dort NIE als
      // editierbares <input> gerendert, sondern rein informativ als
      // <span> — analog zum Demo-Artikel bei leerem Warenkorb. Das ist
      // Teil des Bugfixes "Warenkorb-Editor darf keine echten
      // Datenänderungen mehr auslösen" (siehe bind()'s Klick-/Change-
      // Handler weiter unten): so entsteht im Editor gar nicht erst der
      // Eindruck, man könne hier live den echten Preis ändern, und das
      // frühere "change"-Event, das updatePrice() mit dem echten Preis
      // aufrief, kann im Editor gar nicht mehr feuern. In der echten
      // Vorschau/im Drawer (interactive=false) bleibt das <input>
      // unverändert bestehen.
      priceHtml = `<span>${hasDiscount ? `<s class="cart-item-price-strike">${eur(item.price)}</s> ` : ""}${eur(effective)}</span>`;
    } else {
      priceHtml = `<input type="number" class="cart-item-price-input" data-cart-id="${esc(item.id)}" value="${Number(item.price || 0).toFixed(2)}" step="0.01" />`;
    }
    priceHtml = wrapPart(priceHtml, "price");

    const titleHtml = wrapPart(`<span class="cart-item-title">${item.icon ? esc(item.icon) + " " : ""}${esc(item.name)}</span>`, "icon");
    const descHtml = disp.showDescription && item.description ? wrapPart(`<div class="cart-item-desc">${esc(item.description)}</div>`, "description") : "";
    const shapeClass = "cart-item-" + (config.itemShape || "rounded");

    // "Artikel-Darstellung": custom background/size, applied everywhere
    // (drawer + editor). Empty/null (the default) means "use the shape
    // class's own look", so untouched projects render byte-identical to
    // before.
    let itemStyle = "";
    if (config.itemBackgroundColor) itemStyle += `background-color:${config.itemBackgroundColor};`;
    if (config.itemWidth) itemStyle += `width:${Number(config.itemWidth)}px;`;
    if (config.itemMinHeight) itemStyle += `min-height:${Number(config.itemMinHeight)}px;`;
    const styleAttr = itemStyle ? ` style="${itemStyle}"` : "";

    // Selecting "Artikel-Darstellung" (component:itemRepresentation) shows
    // a resize handle directly on the article in the editor stage — same
    // interaction style as header-footer.js's bar resize handle.
    const itemRepSelected = interactive && state.cartFocusSelectedPart === "component:itemRepresentation";
    const itemRepSelectedClass = itemRepSelected ? " cart-component-selected" : "";
    const resizeHandle = itemRepSelected ? `<span class="cart-item-resize-handle" title="Größe ziehen"></span>` : "";

    return `<div class="cart-item ${shapeClass}${itemRepSelectedClass}"${idAttr}${styleAttr}>
      ${titleHtml}
      ${qtyHtml}
      ${priceHtml}
      ${removeBtn}
      ${descHtml}
      ${resizeHandle}
    </div>`;
  }

  // Builds the shared cart body (progress bar, items, recommendation,
  // discount, totals). Used by both the real drawer (interactive=false)
  // and the editor stage (interactive=true), so both stay pixel-identical
  // apart from the editing affordances. `items`/subtotal come from the
  // passed-in list, not from state directly, so the editor stage can show
  // a synthetic demo item without touching the real cart.
  function buildCartHtml(items, opts = {}) {
    const interactive = !!opts.interactive;
    const isDemo = !!opts.isDemo;
    const config = getConfig() || {};
    const milestones = Array.isArray(config.milestones) ? [...config.milestones].sort((a, b) => Number(a.amount) - Number(b.amount)) : [];
    const subtotal = items.reduce((s, i) => s + getEffectivePrice(i) * (Number(i.qty) || 0), 0);
    let html = "";

    if (config.progressEnabled && milestones.length) {
      const max = Number(milestones[milestones.length - 1].amount || 1);
      const pct = Math.min(100, subtotal / max * 100);
      const next = milestones.find(m => subtotal < Number(m.amount));
      const reachedNow = milestones.filter(m => subtotal >= Number(m.amount || 0));
      const rewardsHtml = reachedNow.length ? `<div class="cart-milestone-rewards">${reachedNow.map(m => `<span class="cart-milestone-reward" title="${esc(m.label)}">${esc(m.icon || "🎉")}</span>`).join("")}</div>` : "";
      const progressHtml = `<div class="cart-progress"><div class="cart-progress-track"><div class="cart-progress-fill" style="width:${pct}%"></div>${milestones.map(m => `<div class="cart-progress-mark ${subtotal >= Number(m.amount) ? "reached" : ""}" style="left:${Math.min(100, (Number(m.amount) / max) * 100)}%" title="${esc(m.label)}"></div>`).join("")}</div>${rewardsHtml}<p class="cart-progress-msg">${next ? `Noch ${eur(Number(next.amount) - subtotal)} bis „${esc(next.label)}“` : "✓ Alle Ziele freigeschaltet"}</p></div>`;
      html += wrapComponent(progressHtml, "progress", interactive);
    }

    html += items.length ? items.map(i => buildCartItemHTML(i, isDemo, interactive)).join("") : '<p class="cart-empty-msg">Dein Warenkorb ist leer.</p>';

    if (config.recommendEnabled) {
      const picked = pickRecommendation(items, subtotal);
      if (picked) {
        const { rec, product } = picked;
        const recHtml = `<div class="cart-recommend"><p class="cart-recommend-title">${esc(rec.text || defaultRecommendationText())}</p><div class="cart-recommend-card"><span class="cart-recommend-icon">${esc(product.icon || "📦")}</span><span class="cart-recommend-name">${esc(product.name)}</span><span class="cart-recommend-price">${eur(product.discountPrice != null ? product.discountPrice : product.price)}</span><button type="button" class="cart-recommend-add" data-rec-product-id="${esc(product.id)}">+</button></div></div>`;
        html += wrapComponent(recHtml, "recommend", interactive);
      }
    }

    if (config.discountEnabled) {
      const discColor = config.discountButtonColor || "#4f46e5";
      const discRadius = config.discountButtonShape === "pill" ? "999px" : (config.discountButtonShape === "square" ? "0px" : "6px");
      const discountHtml = `<div class="cart-discount"><input type="text" class="cart-discount-input" placeholder="Rabattcode (Demo: DEMO10)"><button type="button" class="cart-discount-apply-btn" style="background-color:${discColor}; border-radius:${discRadius};">Anwenden</button>${state.appliedDiscountLabel ? `<p class="cart-discount-msg ok">${esc(state.appliedDiscountLabel)}</p>` : ""}</div>`;
      html += wrapComponent(discountHtml, "discount", interactive);
    }

    const reached = milestones.filter(m => subtotal >= Number(m.amount || 0));
    const free = reached.some(m => m.action === "free-shipping");
    const extra = reached.some(m => m.action === "discount") ? 10 : 0;
    const discountPercent = Number(state.appliedDiscountPercent || 0) + extra;
    const discountAmount = subtotal * discountPercent / 100;
    const shipping = config.progressEnabled ? (free ? 0 : 4.95) : 0;
    const total = Math.max(0, subtotal - discountAmount) + shipping;

    let totalsHtml = `<div class="cart-totals"><div class="cart-total-row"><span>Zwischensumme</span><span>${eur(subtotal)}</span></div>`;
    if (discountAmount > 0) totalsHtml += `<div class="cart-total-row"><span>Rabatt</span><span>−${eur(discountAmount)}</span></div>`;
    if (config.progressEnabled) totalsHtml += `<div class="cart-total-row"><span>Versand</span><span>${shipping === 0 ? "Kostenlos" : eur(shipping)}</span></div>`;
    if (reached.some(m => m.action === "free-product")) totalsHtml += `<div class="cart-total-row"><span>🎁 Gratis-Produkt</span><span>freigeschaltet</span></div>`;
    totalsHtml += `<div class="cart-total-row cart-total-final"><span>Gesamt</span><span>${eur(total)}</span></div></div>`;
    html += totalsHtml;

    return html;
  }

  function renderRecommendList() {
    const listEl = document.getElementById("cart-recommend-list");
    if (!listEl) return;
    let list = Array.isArray(getConfig()?.recommendations) ? getConfig().recommendations : [];
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
      const conditionOptions = Object.entries(CONDITION_LABELS).map(([v, l]) => `<option value="${v}" ${rec.condition?.type === v ? "selected" : ""}>${esc(l)}</option>`).join("");
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

    listEl.querySelectorAll(".item-delete[data-rec-id]").forEach(btn => btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      removeRecommendation(e.currentTarget.dataset.recId);
      renderRecommendList();
      refreshCartViews();
    }, true));
    listEl.querySelectorAll(".rec-text").forEach(inp => inp.addEventListener("change", e => {
      updateRecommendation(e.target.dataset.recId, { text: e.target.value });
      refreshCartViews();
    }, true));
    listEl.querySelectorAll(".rec-alternative").forEach(sel => sel.addEventListener("change", e => {
      updateRecommendation(e.target.dataset.recId, { alternativeProductId: e.target.value || null });
      refreshCartViews();
    }, true));
    listEl.querySelectorAll(".rec-condition-type").forEach(sel => sel.addEventListener("change", e => {
      const recId = e.target.dataset.recId;
      const rec = (getConfig().recommendations || []).find(r => r.id === recId);
      updateRecommendation(recId, { condition: { type: e.target.value, value: rec?.condition?.value || 0 } });
      renderRecommendList();
      refreshCartViews();
    }, true));
    listEl.querySelectorAll(".rec-condition-value").forEach(inp => inp.addEventListener("change", e => {
      const recId = e.target.dataset.recId;
      const rec = (getConfig().recommendations || []).find(r => r.id === recId);
      updateRecommendation(recId, { condition: { type: rec?.condition?.type || "none", value: Number(e.target.value) || 0 } });
      refreshCartViews();
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
        refreshCartViews();
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
      if (m) { window.WebBuilderHistory?.arm(); m.icon = e.target.value; window.WebBuilderHistory?.commit(); refreshCartViews(); }
    }, true));
    listEl.querySelectorAll(".ms-amount").forEach(inp => inp.addEventListener("input", e => {
      const m = (getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.amount = parseFloat(e.target.value) || 0; window.WebBuilderHistory?.commit(); refreshCartViews(); }
    }, true));
    listEl.querySelectorAll(".ms-label").forEach(inp => inp.addEventListener("input", e => {
      const m = (getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.label = e.target.value; window.WebBuilderHistory?.commit(); refreshCartViews(); }
    }, true));
    listEl.querySelectorAll(".ms-action").forEach(sel => sel.addEventListener("change", e => {
      const m = (getConfig().milestones || []).find(x => x.id === e.target.dataset.id);
      if (m) { window.WebBuilderHistory?.arm(); m.action = e.target.value; window.WebBuilderHistory?.commit(); refreshCartViews(); }
    }, true));
    listEl.querySelectorAll(".item-delete").forEach(btn => btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      removeMilestone(e.currentTarget.dataset.id);
      renderMilestoneList();
      refreshCartViews();
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
      refreshCartViews();
    }, true);
  }

  function applyCheckoutButtonStyle() {
    const btn = document.getElementById("cart-checkout-btn");
    if (!btn) return;
    const config = getConfig() || {};
    btn.style.backgroundColor = config.buttonColor || "#4f46e5";
    btn.style.borderRadius = config.buttonShape === "pill" ? "999px" : (config.buttonShape === "square" ? "0px" : "6px");
  }

  // Renders the real slide-in drawer (#cart-items-list, always non-interactive).
  function renderCart() {
    const list = document.getElementById("cart-items-list");
    if (!list) return;
    list.innerHTML = buildCartHtml(getItems(), { interactive: false, isDemo: false });
    document.getElementById("cart-count-badge")?.replaceChildren(document.createTextNode(String(getCount())));
    const config = getConfig() || {};
    const checkout = document.getElementById("cart-checkout-btn");
    if (checkout) {
      checkout.textContent = state.cartButtonLabel || "Zur Kasse gehen";
      // Position offset set for the checkout button in the cart editor
      // (component:checkout) applies everywhere, same as the other
      // per-component/per-part offsets — see wrapComponent()/wrapPart().
      const layout = (config.componentLayout || {}).checkout || { x: 0, y: 0 };
      checkout.style.transform = (layout.x || layout.y) ? `translate(${layout.x}px, ${layout.y}px)` : "";
    }
    // "Hintergrund" (component:background) applies to the real drawer too,
    // not just the editor preview.
    const drawer = document.getElementById("cart-drawer");
    if (drawer) drawer.style.backgroundColor = config.cardBackgroundColor || "";
  }

  // Re-renders every place the cart's content is currently visible: the
  // real drawer plus — if the editor is open — the editor stage.
  function refreshCartViews() {
    renderCart();
    if (state.cartFocusMode) { renderFocusStage(); renderFocusPartPanel(); }
  }

  function bind() {
    // Delegated on `document`. Scoped to #cart-items-list (the real
    // drawer) only — NOT to #cart-focus-stage. The editor stage
    // (js/cart.js "Cart editor stage") renders the exact same cart
    // markup/classes for editing purposes, but a click/change inside it
    // must NEVER trigger a real data mutation (remove item, change qty,
    // change price, apply a discount code, add a recommended product).
    // Inside the stage, clicks only ever SELECT the clicked part/
    // component — that is handled entirely by
    // bindFocusStageInteractions()'s own "pointerdown" listener further
    // below. This handler here explicitly ignores anything that
    // originates inside #cart-focus-stage, even though native controls
    // there (buttons/selects) still fire normal click/change events that
    // bubble up to `document`.
    document.addEventListener("click", e => {
      const inStage = !!e.target.closest?.("#cart-focus-stage");

      const discountBtn = e.target.closest?.(".cart-discount-apply-btn");
      if (discountBtn) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!inStage) { applyDiscountCode(discountBtn.closest(".cart-discount")); refreshCartViews(); }
        return;
      }
      const recBtn = e.target.closest?.(".cart-recommend-add");
      if (recBtn) {
        e.preventDefault(); e.stopImmediatePropagation();
        if (!inStage) { const product = window.WebBuilderProducts?.getById?.(recBtn.dataset.recProductId); if (product) addItem(product); refreshCartViews(); }
        return;
      }
      const t = e.target.closest?.("[data-cart-id]");
      if (!t || !t.closest("#cart-items-list")) return;
      e.preventDefault(); e.stopImmediatePropagation();
      const id = t.dataset.cartId;
      if (t.classList.contains("cart-item-remove")) removeItem(id);
      else if (t.classList.contains("cart-qty-minus")) changeQty(id, -1);
      else if (t.classList.contains("cart-qty-plus")) changeQty(id, 1);
      refreshCartViews();
    }, true);

    document.addEventListener("change", e => {
      const qtySel = e.target.closest?.(".cart-qty-select[data-cart-id]");
      if (qtySel && qtySel.closest("#cart-items-list")) { updateQty(qtySel.dataset.cartId, parseInt(qtySel.value, 10) || 1); refreshCartViews(); return; }
      const priceInput = e.target.closest?.(".cart-item-price-input[data-cart-id]");
      if (priceInput && priceInput.closest("#cart-items-list")) { updatePrice(priceInput.dataset.cartId, priceInput.value); refreshCartViews(); }
    }, true);

    document.getElementById("close-cart-btn")?.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); closeCart(); }, true);
    document.getElementById("cart-drawer-backdrop")?.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); closeCart(); }, true);
    document.getElementById("btn-open-cart")?.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); openCart(); }, true);
    bindAddRecommendation();
    bindAddMilestone();
    // Reacts to both "cart" and "products": product changes affect the
    // recommendation preview shown in the cart.
    state.subscribe?.(e => {
      if (["cart", "products"].includes(e?.domain)) {
        refreshCartViews();
        renderRecommendList();
        renderMilestoneList();
      }
    });
    refreshCartViews();
    renderRecommendList();
    renderMilestoneList();
  }
  function openCart(){document.getElementById("cart-drawer")?.classList.add("active");document.getElementById("cart-drawer-backdrop")?.classList.add("active");renderCart();return true;} function closeCart(){document.getElementById("cart-drawer")?.classList.remove("active");document.getElementById("cart-drawer-backdrop")?.classList.remove("active");return true;}
  document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0));
  window.WebBuilderCartRuntime={render:renderCart,open:openCart,close:closeCart};

  // Cart configuration editor: the sidebar now only holds the three
  // on/off toggles (discount/recommend/progress) plus the "Artikel-
  // Darstellung"-shortcut button — everything else (colors, shapes,
  // labels, list management) moved into the cart editor's right-hand
  // panel, see the "Cart editor stage" section below.
  function renderConfig(){
    const c=getConfig()||{};
    const ids=[["cart-discount-toggle",c.discountEnabled],["cart-recommend-toggle",c.recommendEnabled],["cart-progress-toggle",c.progressEnabled]];
    ids.forEach(([id,v])=>{const e=document.getElementById(id);if(e)e.checked=!!v;});
    applyCheckoutButtonStyle();
    if (state.cartFocusMode) { renderFocusStage(); renderFocusPartPanel(); }
  }
  function bindConfig(){
    const map={"cart-discount-toggle":"discountEnabled","cart-recommend-toggle":"recommendEnabled","cart-progress-toggle":"progressEnabled"};
    Object.entries(map).forEach(([id,p])=>document.getElementById(id)?.addEventListener("change",e=>{window.WebBuilderHistory?.arm();setConfig({[p]:e.target.checked},false);window.WebBuilderHistory?.commit();renderConfig();refreshCartViews();},true));
    bindAddRecommendation();
    bindAddMilestone();
    renderConfig();
  }
  document.addEventListener("DOMContentLoaded",()=>setTimeout(bindConfig,0)); window.WebBuilderCartConfigRuntime={render:renderConfig,renderRecommendList,renderMilestoneList};

  // ------------------------------------------------------------------
  // Cart editor stage ("Warenkorb-Editor").
  //
  // Entering it hides normal canvas content (elements + header/footer
  // bars, via CSS body.cart-focus-active — see css/styles.css) and shows
  // the FULL cart body (buildCartHtml()) centered over the canvas
  // (#cart-focus-stage, mounted into .canvas-container so it stays fixed
  // regardless of zoom): real cart items if any exist, otherwise one
  // synthetic demo item purely so there's something to arrange.
  //
  // Every top-level block is selectable and (except the background and
  // the article representation itself) freely draggable:
  //   - article sub-parts (icon/name, qty, price, remove, description) —
  //     data-cart-part, offset stored in cartConfig.itemDisplay.layout
  //   - progress bar / discount field / recommendation card / checkout
  //     button — data-cart-component, offset stored in
  //     cartConfig.componentLayout
  //   - the article box as a whole ("Artikel-Darstellung") — clicking its
  //     background (not a specific sub-part) selects it; a resize handle
  //     then lets you drag its width/height (cartConfig.itemWidth/
  //     itemMinHeight)
  //   - the card background — clicking empty card space selects it,
  //     color only (no position), cartConfig.cardBackgroundColor
  //
  // IMPORTANT: selecting an element that is *also* the element the drag
  // gesture started on must NOT trigger a full re-render before pointer
  // capture + move/up listeners are attached — a mid-gesture innerHTML
  // rebuild detaches the very node the listeners are bound to, so no
  // further pointermove/pointerup ever reaches them (this was the root
  // cause of "nothing can be dragged"). That's why selection during those
  // gestures goes through the light-weight selectFocusPartLight()
  // (class-toggle only) instead of the full-render selectFocusPart() —
  // the full render still happens once the gesture ends (via notify() ->
  // refreshCartViews()) or immediately for clicks that don't start a drag
  // on the same node (background/article-representation click, sidebar
  // shortcut button).
  //
  // IMPORTANT (bugfix): native controls inside a selectable part/
  // component (the remove button, the qty +/- buttons/dropdown, the
  // discount "Anwenden" button, the recommendation "+" button) are
  // intentionally NOT prevented from firing their normal click/change
  // event here, so typing/opening a dropdown/focusing still works. Those
  // events DO bubble up to the page-wide delegated listeners in bind()
  // above — but bind() explicitly ignores anything inside
  // #cart-focus-stage, so no real cart data is ever changed from here,
  // only the current selection (via selectFocusPartLight()).
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

  // Same read/write/reset trio as above, generalized for the top-level
  // components (progress/discount/recommend/checkout) so the X/Y fields
  // and reset button in the right panel can work with either kind of
  // selection through one code path.
  function getSelectedLayout() {
    const sel = state.cartFocusSelectedPart;
    if (!sel) return { x: 0, y: 0 };
    if (sel.startsWith("component:")) {
      const key = sel.slice("component:".length);
      return state.cartConfig.componentLayout[key] || { x: 0, y: 0 };
    }
    return getPartLayout(sel);
  }
  function setSelectedLayout(x, y) {
    const sel = state.cartFocusSelectedPart;
    if (!sel) return;
    if (sel.startsWith("component:")) {
      const key = sel.slice("component:".length);
      window.WebBuilderHistory?.arm();
      state.cartConfig.componentLayout[key] = { x: Math.round(x) || 0, y: Math.round(y) || 0 };
      window.WebBuilderHistory?.commit();
      notify("cart", "component-layout", state.cartConfig.componentLayout);
    } else {
      setPartLayout(sel, x, y);
    }
  }
  function resetSelectedLayout() {
    const sel = state.cartFocusSelectedPart;
    if (!sel) return;
    if (sel.startsWith("component:")) {
      const key = sel.slice("component:".length);
      window.WebBuilderHistory?.arm();
      delete state.cartConfig.componentLayout[key];
      window.WebBuilderHistory?.commit();
      notify("cart", "component-layout", state.cartConfig.componentLayout);
    } else {
      resetPartLayout(sel);
    }
  }
  // Components without a meaningful drag position (background color only,
  // article representation resized via handle instead of X/Y).
  const NON_POSITIONABLE = new Set(["component:background", "component:itemRepresentation"]);

  // Toggles the visual "selected" outline directly on the already-live
  // stage DOM, without touching innerHTML — safe to call mid-gesture.
  function applySelectionHighlight() {
    const stage = document.getElementById("cart-focus-stage");
    if (!stage) return;
    stage.querySelectorAll(".cart-item-part-selected, .cart-component-selected").forEach(el => el.classList.remove("cart-item-part-selected", "cart-component-selected"));
    const sel = state.cartFocusSelectedPart;
    if (!sel) return;
    if (sel.startsWith("component:")) {
      const key = sel.slice("component:".length);
      if (key === "background") stage.querySelector(".cart-focus-card")?.classList.add("cart-component-selected");
      else if (key === "itemRepresentation") stage.querySelectorAll(".cart-item").forEach(el => el.classList.add("cart-component-selected"));
      else stage.querySelector(`[data-cart-component="${key}"]`)?.classList.add("cart-component-selected");
    } else {
      stage.querySelector(`[data-cart-part="${sel}"]`)?.classList.add("cart-item-part-selected");
    }
  }

  // Full selection: safe for clicks that don't themselves start a drag on
  // the clicked node (sidebar shortcut, article-background click,
  // card-background click) — rebuilds the stage so e.g. the article's
  // resize handle actually appears.
  function selectFocusPart(partKey) {
    state.cartFocusSelectedPart = partKey;
    renderFocusStage();
    renderFocusPartPanel();
  }
  // Light selection: for pointerdown branches that continue into a drag
  // gesture on the very node that was just clicked — must NOT rebuild the
  // stage (see the big comment above bindFocusStageInteractions()).
  function selectFocusPartLight(partKey) {
    state.cartFocusSelectedPart = partKey;
    applySelectionHighlight();
    renderFocusPartPanel();
  }

  // Field-block IDs for the right-hand panel (renderFocusPartPanel()).
  // Kept as one list so hiding/showing stays a single source of truth —
  // extend here whenever a new component/part gets its own block.
  const PART_FIELD_BLOCK_IDS = [
    "cart-comp-checkout-fields", "cart-comp-discount-fields", "cart-comp-item-fields",
    "cart-comp-background-fields", "cart-comp-recommend-fields", "cart-comp-progress-fields",
    // Aufgabe C: Artikel-Teile "qty"/"price"/"remove" haben jetzt jeweils
    // ihr eigenes Feld-Panel statt gemeinsam in cart-comp-item-fields zu
    // stecken — nur sichtbar, wenn genau dieser Teil angeklickt wurde.
    "cart-comp-qty-fields", "cart-comp-price-fields", "cart-comp-remove-fields"
  ];

  function renderFocusPartPanel() {
    const empty = document.getElementById("cart-part-empty");
    const editor = document.getElementById("cart-part-editor");
    if (!empty || !editor) return;
    const sel = state.cartFocusSelectedPart;
    if (!sel) { empty.classList.remove("hidden"); editor.classList.add("hidden"); return; }
    empty.classList.add("hidden"); editor.classList.remove("hidden");

    PART_FIELD_BLOCK_IDS.forEach(id => document.getElementById(id)?.classList.add("hidden"));
    const positionFields = document.getElementById("cart-comp-position-fields");
    positionFields?.classList.toggle("hidden", NON_POSITIONABLE.has(sel));

    const labels = {
      icon: "Icon / Name", qty: "Mengenanzeige", price: "Preis", remove: "Entfernen-Button", description: "Beschreibung",
      "component:checkout": "Zur-Kasse-Button", "component:discount": "Rabattfeld", "component:progress": "Fortschrittsbalken",
      "component:recommend": "Empfehlung", "component:background": "Hintergrund", "component:itemRepresentation": "Artikel-Darstellung"
    };
    const labelEl = document.getElementById("cart-part-label");
    if (labelEl) labelEl.textContent = labels[sel] || sel;

    const config = getConfig();

    if (sel === "component:checkout") {
      document.getElementById("cart-comp-checkout-fields")?.classList.remove("hidden");
      const labelInput = document.getElementById("cart-comp-checkout-label");
      if (labelInput && document.activeElement !== labelInput) labelInput.value = state.cartButtonLabel || "";
      const colorInput = document.getElementById("cart-comp-checkout-color");
      if (colorInput) colorInput.value = config.buttonColor || "#4f46e5";
      const shapeSel = document.getElementById("cart-comp-checkout-shape");
      if (shapeSel) shapeSel.value = config.buttonShape || "rounded";
    } else if (sel === "component:discount") {
      document.getElementById("cart-comp-discount-fields")?.classList.remove("hidden");
      const colorInput = document.getElementById("cart-comp-discount-color");
      if (colorInput) colorInput.value = config.discountButtonColor || "#4f46e5";
      const shapeSel = document.getElementById("cart-comp-discount-shape");
      if (shapeSel) shapeSel.value = config.discountButtonShape || "rounded";
    } else if (sel === "component:progress") {
      document.getElementById("cart-comp-progress-fields")?.classList.remove("hidden");
      renderMilestoneList();
    } else if (sel === "component:recommend") {
      document.getElementById("cart-comp-recommend-fields")?.classList.remove("hidden");
      renderRecommendList();
    } else if (sel === "component:background") {
      document.getElementById("cart-comp-background-fields")?.classList.remove("hidden");
      const colorInput = document.getElementById("cart-comp-bg-color");
      if (colorInput) colorInput.value = config.cardBackgroundColor || "#ffffff";
    } else if (sel === "component:itemRepresentation") {
      // Aufgabe C: nur noch Form/Hintergrund/Größe/Beschreibung-Toggle —
      // Menge/Preis/Entfernen-Button haben jetzt eigene Panels (siehe
      // die drei else-if-Zweige unten).
      document.getElementById("cart-comp-item-fields")?.classList.remove("hidden");
      const shapeSel = document.getElementById("cart-item-shape");
      if (shapeSel) shapeSel.value = config.itemShape || "rounded";
      const bgInput = document.getElementById("cart-item-bg-color");
      if (bgInput) bgInput.value = config.itemBackgroundColor || "#f3f4f6";
      const wInput = document.getElementById("cart-item-width"), hInput = document.getElementById("cart-item-height");
      if (wInput && document.activeElement !== wInput) wInput.value = config.itemWidth || "";
      if (hInput && document.activeElement !== hInput) hInput.value = config.itemMinHeight || "";
      const sd = document.getElementById("cid-show-description"); if (sd) sd.checked = !!config.itemDisplay.showDescription;
    } else if (sel === "qty") {
      // Aufgabe C: eigenes Panel für den Artikel-Teil "Mengenanzeige".
      document.getElementById("cart-comp-qty-fields")?.classList.remove("hidden");
      const qs = document.getElementById("cid-quantity-style"); if (qs) qs.value = config.itemDisplay.quantityStyle || "stepper";
      const qgs = document.getElementById("cid-quantity-shape"); if (qgs) qgs.value = config.itemDisplay.quantityGroupShape || "rounded";
      const qbc = document.getElementById("cid-quantity-color"); if (qbc) qbc.value = config.itemDisplay.quantityButtonColor || "black";
    } else if (sel === "price") {
      // Aufgabe C: eigenes Panel für den Artikel-Teil "Preis".
      document.getElementById("cart-comp-price-fields")?.classList.remove("hidden");
      const ps = document.getElementById("cid-price-style"); if (ps) ps.value = config.itemDisplay.priceStyle || "simple";
    } else if (sel === "remove") {
      // Aufgabe C: eigenes Panel für den Artikel-Teil "Entfernen-Button".
      document.getElementById("cart-comp-remove-fields")?.classList.remove("hidden");
      const removeColor = document.getElementById("cart-remove-color");
      if (removeColor) removeColor.value = config.removeButtonColor || "#ef4444";
      const rs = document.getElementById("cid-remove-style"); if (rs) rs.value = config.itemDisplay.removeStyle || "x";
      const rsh = document.getElementById("cid-remove-shape"); if (rsh) rsh.value = config.itemDisplay.removeShape || "circle";
    }
    // sel === "icon" / "description": kein eigener Feld-Block, nur die
    // generischen Position X/Y-Felder unten (unverändertes Verhalten).

    if (!NON_POSITIONABLE.has(sel)) {
      const layout = getSelectedLayout();
      const xInput = document.getElementById("cart-part-x"), yInput = document.getElementById("cart-part-y");
      if (xInput && document.activeElement !== xInput) xInput.value = layout.x;
      if (yInput && document.activeElement !== yInput) yInput.value = layout.y;
    }
  }

  function bindFocusStageInteractions(container) {
    if (!container || container.dataset.webBuilderPartsBound === "true") return;
    container.dataset.webBuilderPartsBound = "true";
    container.addEventListener("pointerdown", e => {
      if (!state.cartFocusMode) return;

      // 1) Resize handle for the article representation (drag its width/
      // height directly). Only rendered when component:itemRepresentation
      // is already selected.
      const resizeHandle = e.target.closest?.(".cart-item-resize-handle");
      if (resizeHandle) {
        e.preventDefault(); e.stopPropagation();
        const itemEl = resizeHandle.closest(".cart-item");
        if (!itemEl) return;
        const startRect = itemEl.getBoundingClientRect();
        const startX = e.clientX, startY = e.clientY;
        const startW = startRect.width, startH = startRect.height;
        let moved = false;
        try { resizeHandle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          moved = true;
          const nextW = Math.max(120, Math.round(startW + dx));
          const nextH = Math.max(30, Math.round(startH + dy));
          state.cartConfig.itemWidth = nextW;
          state.cartConfig.itemMinHeight = nextH;
          itemEl.style.width = nextW + "px";
          itemEl.style.minHeight = nextH + "px";
          const wInput = document.getElementById("cart-item-width"), hInput = document.getElementById("cart-item-height");
          if (wInput) wInput.value = nextW;
          if (hInput) hInput.value = nextH;
        }
        function onUp() {
          resizeHandle.removeEventListener("pointermove", onMove);
          resizeHandle.removeEventListener("pointerup", onUp);
          resizeHandle.removeEventListener("pointercancel", onUp);
          try { resizeHandle.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          if (moved) { window.WebBuilderHistory?.commit(); notify("cart", "config", state.cartConfig); }
        }
        window.WebBuilderHistory?.arm();
        resizeHandle.addEventListener("pointermove", onMove);
        resizeHandle.addEventListener("pointerup", onUp);
        resizeHandle.addEventListener("pointercancel", onUp);
        return;
      }

      // 2) Top-level components (progress bar / discount field /
      // recommendation card / checkout button). Native controls inside
      // them (the discount input, its "Anwenden" button, the recommend
      // "+" button) only get a selection update — no preventDefault/
      // stopPropagation, so typing/focusing/clicking them still works
      // exactly as before. Any real data effect of those native controls
      // is now blocked centrally in bind()'s delegated listeners (see the
      // big comment there), not here.
      const compEl = e.target.closest?.("[data-cart-component]");
      if (compEl) {
        const key = compEl.dataset.cartComponent;
        if (e.target.closest?.("input, textarea, select, button")) {
          selectFocusPartLight(`component:${key}`);
          return;
        }
        e.preventDefault(); e.stopPropagation();
        selectFocusPartLight(`component:${key}`);
        const origin = state.cartConfig.componentLayout[key] || { x: 0, y: 0 };
        const startX = e.clientX, startY = e.clientY;
        let moved = false;
        try { compEl.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        function onMove(moveEvent) {
          const dx = moveEvent.clientX - startX, dy = moveEvent.clientY - startY;
          if (!moved && Math.hypot(dx, dy) < 3) return;
          moved = true;
          const nextX = origin.x + dx, nextY = origin.y + dy;
          compEl.style.transform = `translate(${nextX}px, ${nextY}px)`;
          state.cartConfig.componentLayout[key] = { x: Math.round(nextX), y: Math.round(nextY) };
        }
        function onUp() {
          compEl.removeEventListener("pointermove", onMove);
          compEl.removeEventListener("pointerup", onUp);
          compEl.removeEventListener("pointercancel", onUp);
          try { compEl.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          if (moved) { window.WebBuilderHistory?.commit(); notify("cart", "component-layout", state.cartConfig.componentLayout); }
        }
        window.WebBuilderHistory?.arm();
        compEl.addEventListener("pointermove", onMove);
        compEl.addEventListener("pointerup", onUp);
        compEl.addEventListener("pointercancel", onUp);
        return;
      }

      // 3) Article sub-parts (icon/name, qty, price, remove, description).
      // Same "don't steal focus from native controls" guard as above —
      // fixes the price display / quantity dropdown being unclickable in
      // the editor. As with (2), any real data effect is blocked
      // centrally in bind(), so clicking the remove button or the qty
      // +/- buttons here can never delete a real cart item or change its
      // real quantity — only select the "remove"/"qty" part.
      const partEl = e.target.closest?.("[data-cart-part]");
      if (partEl) {
        const partKey = partEl.dataset.cartPart;
        if (e.target.closest?.("input, textarea, select, button")) {
          selectFocusPartLight(partKey);
          return;
        }
        e.preventDefault(); e.stopPropagation();
        selectFocusPartLight(partKey);
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
        return;
      }

      // 4) Click on the article container itself (not a specific sub-
      // part) -> select the overall article representation.
      const itemEl = e.target.closest?.(".cart-item");
      if (itemEl) {
        e.preventDefault();
        selectFocusPart("component:itemRepresentation");
        return;
      }

      // 5) Click directly on the card's empty background -> select it.
      if (e.target.matches?.(".cart-focus-card")) {
        e.preventDefault();
        selectFocusPart("component:background");
      }
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
    const realItems = getItems();
    const usingDemo = realItems.length === 0;
    let items = realItems;
    if (usingDemo) {
      const products = window.WebBuilderProducts?.getAll?.() || [];
      const demoSource = products[0] || { name: "Beispielprodukt", price: 19.99, discountPrice: 14.99, icon: "📦", description: "Kurze Beschreibung des Produkts." };
      items = [{ id: "focus-demo", productId: demoSource.id || null, name: demoSource.name, price: demoSource.price, discountPrice: demoSource.discountPrice, qty: 2, icon: demoSource.icon, description: demoSource.description || "Kurze Beschreibung des Produkts." }];
    }
    const config = getConfig() || {};
    const checkoutColor = config.buttonColor || "#4f46e5";
    const checkoutRadius = config.buttonShape === "pill" ? "999px" : (config.buttonShape === "square" ? "0px" : "6px");
    const checkoutLayout = config.componentLayout.checkout || { x: 0, y: 0 };
    const checkoutSelectedClass = state.cartFocusSelectedPart === "component:checkout" ? " cart-component-selected" : "";
    const bgSelectedClass = state.cartFocusSelectedPart === "component:background" ? " cart-component-selected" : "";
    const cardBgStyle = config.cardBackgroundColor ? ` style="background-color:${config.cardBackgroundColor};"` : "";
    stage.innerHTML = `
      <div class="cart-focus-card${bgSelectedClass}"${cardBgStyle}>
        <div class="cart-focus-header">
          <p class="cart-focus-hint">🛒 Warenkorb-Editor — klicke auf einen Bereich (Artikel, Fortschrittsbalken, Rabattfeld, Empfehlung, Zur-Kasse-Button, Hintergrund), um ihn anzupassen</p>
          <button type="button" class="btn btn-danger-outline btn-sm" id="cart-focus-exit-inline">✖</button>
        </div>
        <div class="cart-focus-body">${buildCartHtml(items, { interactive: true, isDemo: usingDemo })}</div>
        <button type="button" class="btn btn-primary cart-focus-checkout${checkoutSelectedClass}" data-cart-component="checkout" style="width:100%; background-color:${checkoutColor}; border-radius:${checkoutRadius}; transform:translate(${checkoutLayout.x || 0}px, ${checkoutLayout.y || 0}px);">${esc(state.cartButtonLabel || "Zur Kasse gehen")}</button>
      </div>
    `;
    bindFocusStageInteractions(stage);
    document.getElementById("cart-focus-exit-inline")?.addEventListener("click", e => { e.preventDefault(); exitFocusMode(); }, true);
  }
  function enterFocusMode() {
    // Mutually exclusive with the real preview mode (top-right "Vorschau"
    // button) — see js/preview.js apply() for the other direction.
    if (state.isPreviewMode) window.WebBuilderPreview?.exit?.();
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
    // Sidebar shortcut: opens the editor (if needed) and jumps straight to
    // the article representation, so it doesn't have to be found by
    // clicking precisely on an article's empty background.
    document.getElementById("btn-select-item-representation")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (!state.cartFocusMode) enterFocusMode();
      selectFocusPart("component:itemRepresentation");
    }, true);

    // Position (X/Y) — shared by article sub-parts and the four
    // draggable components (progress/discount/recommend/checkout).
    document.getElementById("cart-part-x")?.addEventListener("change", e => {
      if (!state.cartFocusSelectedPart) return;
      const layout = getSelectedLayout();
      setSelectedLayout(Number(e.target.value) || 0, layout.y);
      renderFocusStage();
    }, true);
    document.getElementById("cart-part-y")?.addEventListener("change", e => {
      if (!state.cartFocusSelectedPart) return;
      const layout = getSelectedLayout();
      setSelectedLayout(layout.x, Number(e.target.value) || 0);
      renderFocusStage();
    }, true);
    document.getElementById("cart-part-reset")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      if (state.cartFocusSelectedPart) { resetSelectedLayout(); renderFocusStage(); renderFocusPartPanel(); }
    }, true);

    // Zur-Kasse-Button (component:checkout)
    document.getElementById("cart-comp-checkout-label")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setButtonLabel(e.target.value, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-checkout-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); setConfig({ buttonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-checkout-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setConfig({ buttonShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    // Rabattfeld (component:discount)
    document.getElementById("cart-comp-discount-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); setConfig({ discountButtonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-comp-discount-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setConfig({ discountButtonShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    // Hintergrund (component:background)
    document.getElementById("cart-comp-bg-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); setConfig({ cardBackgroundColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    // Artikel-Darstellung (component:itemRepresentation)
    document.getElementById("cart-item-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setConfig({ itemShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-item-bg-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); setConfig({ itemBackgroundColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-item-width")?.addEventListener("change", e => {
      const v = e.target.value === "" ? null : Math.max(120, Number(e.target.value) || 0);
      window.WebBuilderHistory?.arm(); setConfig({ itemWidth: v }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-item-height")?.addEventListener("change", e => {
      const v = e.target.value === "" ? null : Math.max(30, Number(e.target.value) || 0);
      window.WebBuilderHistory?.arm(); setConfig({ itemMinHeight: v }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cart-remove-color")?.addEventListener("input", e => {
      window.WebBuilderHistory?.arm(); setConfig({ removeButtonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-remove-style")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setItemDisplay({ removeStyle: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-remove-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setItemDisplay({ removeShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-quantity-style")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setItemDisplay({ quantityStyle: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    // Task 5: quantity "group" shape + +/- color palette.
    document.getElementById("cid-quantity-shape")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setItemDisplay({ quantityGroupShape: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-quantity-color")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setItemDisplay({ quantityButtonColor: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-price-style")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setItemDisplay({ priceStyle: e.target.value }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);
    document.getElementById("cid-show-description")?.addEventListener("change", e => {
      window.WebBuilderHistory?.arm(); setItemDisplay({ showDescription: e.target.checked }, false); window.WebBuilderHistory?.commit();
      refreshCartViews();
    }, true);

    document.addEventListener("keydown", e => { if (e.key === "Escape" && state.cartFocusMode) exitFocusMode(); });
  }
  document.addEventListener("DOMContentLoaded", () => setTimeout(bindFocusEditor, 0));
  window.WebBuilderCartFocus = { enter: enterFocusMode, exit: exitFocusMode, isActive: () => !!state.cartFocusMode };
})();
