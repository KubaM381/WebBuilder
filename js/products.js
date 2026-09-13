// WebBuilder products domain
// Owns product data (CRUD, normalization) and the product-tab editor UI.
// Other modules reference products only via window.WebBuilderProducts /
// window.WebBuilderProductsRuntime, never their own copies.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderProducts: WebBuilderState is not available."); return; }
  const clone = value => JSON.parse(JSON.stringify(value));
  function notify(domain, action, payload) { if (typeof state.notify === "function") state.notify(domain, action, payload); }

  // `compareAtPrice` is intentionally dropped here — discount logic runs
  // entirely on `discountPrice`. Old saved projects still load fine, the
  // field is just no longer carried over.
  //
  // Custom image icon (task 6): `iconType` ("emoji" default | "image")
  // picks which representation the product uses. `icon` (the emoji/text
  // fallback) stays populated regardless, since other modules
  // (cart.js, header-footer.js product picker, inspector.js product
  // select) still only ever read `icon` and don't know about images —
  // this keeps that fallback usable everywhere those show up. `iconImage`
  // is kept even while iconType is "emoji" so switching the type back and
  // forth in the editor doesn't lose an already-uploaded image. Legacy
  // `iconUrl` name (if ever produced by an older draft) is read as a
  // fallback for `iconImage`.
  function normalizeProduct(product = {}) {
    const price = Number(product.price) || 0;
    const discountPrice = product.discountPrice != null && product.discountPrice !== "" ? Number(product.discountPrice) || 0 : null;
    const iconType = product.iconType === "image" ? "image" : "emoji";
    const iconImage = String(product.iconImage || product.iconUrl || "");
    return {
      id: product.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: product.name || "Neues Produkt",
      price,
      discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null,
      icon: product.icon || "📦",
      iconType,
      iconImage,
      description: product.description || ""
    };
  }
  // Normalizes in place (WebBuilderUtils.normalizeInPlace) so references
  // stay stable during active edits in the product editor.
  function normalizeProducts() {
    state.products = window.WebBuilderUtils.normalizeInPlace(state.products, normalizeProduct);
    return state.products;
  }
  function getProducts() { return state.products; }
  function getProduct(id) { return state.products.find(p => p?.id === id) || null; }
  function addProduct(product = {}, recordHistory = true) { if (recordHistory) window.WebBuilderHistory?.arm(); const item = normalizeProduct(product); state.products.push(item); if (recordHistory) window.WebBuilderHistory?.commit(); notify("products", "add", item); return item; }
  function updateProduct(id, patch = {}, recordHistory = true) { const product = getProduct(id); if (!product) return null; if (recordHistory) window.WebBuilderHistory?.arm(); Object.assign(product, clone(patch)); Object.assign(product, normalizeProduct(product)); if (recordHistory) window.WebBuilderHistory?.commit(); notify("products", "update", product); return product; }
  function removeProduct(id, recordHistory = true) { const i = state.products.findIndex(p => p?.id === id); if (i < 0) return false; if (recordHistory) window.WebBuilderHistory?.arm(); const removed = state.products.splice(i, 1)[0]; if (recordHistory) window.WebBuilderHistory?.commit(); notify("products", "remove", removed); return true; }
  function replaceProducts(items = [], recordHistory = false) { if (recordHistory) window.WebBuilderHistory?.arm(); state.products.length = 0; state.products.push(...(Array.isArray(items) ? items.map(normalizeProduct) : [])); if (recordHistory) window.WebBuilderHistory?.commit(); notify("products", "replaceAll", { count: state.products.length }); return state.products; }

  normalizeProducts();
  window.WebBuilderProducts = { normalize: normalizeProduct, normalizeState: normalizeProducts, getAll: getProducts, getById: getProduct, add: addProduct, update: updateProduct, remove: removeProduct, replaceAll: replaceProducts };

  // Product-tab editor UI (sidebar "📦 Produkte" tab).
  const esc = window.WebBuilderUtils.escapeHtml;

  function renderProducts() {
    const list = document.getElementById("product-list");
    if (!list) return;
    const items = getProducts();
    list.innerHTML = items.length ? "" : '<p class="help-text">Noch keine Produkte angelegt. Klicke oben auf „+ Neues Produkt“.</p>';
    items.forEach(p => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.dataset.productId = p.id;
      // Preview falls back to the emoji/text icon whenever no image has
      // actually been uploaded yet, even if iconType is already "image"
      // (e.g. right after switching the type, before picking a file).
      const isImage = p.iconType === "image" && p.iconImage;
      const iconPreviewHtml = isImage
        ? `<img class="product-card-icon-img" src="${esc(p.iconImage)}" alt="Produktbild">`
        : `<span class="product-card-icon">${esc(p.icon)}</span>`;
      card.innerHTML = `<div class="product-card-header">${iconPreviewHtml}<div class="product-card-title"><strong>${esc(p.name)}</strong><span>${esc(p.description)}</span></div><button type="button" class="product-delete" data-product-action="delete">×</button></div><div class="product-card-fields"><label>Name<input data-product-field="name" value="${esc(p.name)}"></label><label>Preis (€)<input type="number" min="0" step="0.01" data-product-field="price" value="${esc(p.price)}"></label><label>Rabattpreis (€)<input type="number" min="0" step="0.01" data-product-field="discountPrice" value="${p.discountPrice == null ? "" : esc(p.discountPrice)}"></label><div class="product-card-icon-fields"><label>Icon-Typ<select data-product-field="iconType"><option value="emoji" ${p.iconType === "image" ? "" : "selected"}>Emoji / Text</option><option value="image" ${p.iconType === "image" ? "selected" : ""}>Eigenes Bild</option></select></label><label class="${p.iconType === "image" ? "hidden" : ""}">Icon (Emoji)<input data-product-field="icon" value="${esc(p.icon)}"></label><label class="${p.iconType === "image" ? "" : "hidden"}">Bild hochladen<div class="file-input-wrapper"><button type="button" class="file-input-btn">📁 Datei wählen</button><input type="file" accept="image/*" data-product-icon-upload="${esc(p.id)}"></div></label></div><label class="product-card-description">Beschreibung<textarea data-product-field="description" rows="2">${esc(p.description)}</textarea></label></div><div class="product-card-price">${p.discountPrice != null ? `<s>${Number(p.price).toFixed(2)} €</s> <strong>${Number(p.discountPrice).toFixed(2)} €</strong>` : `<strong>${Number(p.price).toFixed(2)} €</strong>`}</div>`;
      list.appendChild(card);
    });
  }

  function bind() {
    document.getElementById("product-list")?.addEventListener("click", e => {
      const b = e.target.closest?.('[data-product-action="delete"]');
      if (!b) return;
      const c = b.closest("[data-product-id]");
      if (!c) return;
      e.preventDefault(); e.stopImmediatePropagation();
      removeProduct(c.dataset.productId);
      renderProducts();
    }, true);
    document.getElementById("product-list")?.addEventListener("change", e => {
      const f = e.target.closest?.("[data-product-field]");
      const c = f?.closest("[data-product-id]");
      if (!f || !c) return;
      const value = f.type === "number" ? (f.value === "" ? null : Number(f.value)) : f.value;
      updateProduct(c.dataset.productId, { [f.dataset.productField]: value });
      renderProducts();
    }, true);
    // Custom product-icon image upload (task 6) — separate from the
    // generic [data-product-field] handler above since it needs to read
    // the file as a data URL first instead of just using .value.
    document.getElementById("product-list")?.addEventListener("change", e => {
      const fileInput = e.target.closest?.("[data-product-icon-upload]");
      if (!fileInput) return;
      const productId = fileInput.dataset.productIconUpload;
      const file = fileInput.files?.[0];
      if (!file || !file.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== "string") return;
        updateProduct(productId, { iconType: "image", iconImage: reader.result });
        renderProducts();
      };
      reader.readAsDataURL(file);
    }, true);
    document.getElementById("btn-add-product")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      const p = addProduct();
      renderProducts();
      document.querySelector(`[data-product-id="${CSS.escape(p.id)}"] [data-product-field="name"]`)?.focus();
    }, true);

    // Only re-renders this tab; cart.js subscribes to "products"
    // separately for its own recommendation/demo preview.
    state.subscribe?.(e => { if (e?.domain === "products") renderProducts(); });
    renderProducts();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));
  window.WebBuilderProductsRuntime = { render: renderProducts, addProduct };
})();
