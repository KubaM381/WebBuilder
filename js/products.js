// WebBuilder products domain
// Owns product data (CRUD, normalization) and the product-tab editor UI
// (Tab "📦 Produkte" in der linken Seitenleiste).
//
// Ausgelagert aus cart.js (siehe README "Geplante Strukturmaßnahme"):
// cart.js enthielt bisher zwei unabhängige Domänen (Produkte + Warenkorb)
// und war die größte Einzeldatei im Projekt. Andere Module referenzierten
// Produkte bereits ausschließlich über window.WebBuilderProducts /
// window.WebBuilderProductsRuntime (inspector.js, header-footer.js,
// preview.js, storage.js, toolbar.js) — diese Schnittstellen bleiben
// unverändert erhalten, nur die Implementierung zieht hierher um.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderProducts: WebBuilderState is not available."); return; }
  const clone = value => JSON.parse(JSON.stringify(value));
  function notify(domain, action, payload) { if (typeof state.notify === "function") state.notify(domain, action, payload); }

  // FIX (README Offener Punkt #4, ursprünglich in cart.js behoben):
  // `compareAtPrice` war ein totes Datenfeld ohne jede UI — die
  // tatsächliche Rabattlogik läuft vollständig über `discountPrice`.
  // Bereits gespeicherte alte Projekte mit `compareAtPrice` laden weiterhin
  // problemlos, das Feld wird beim Normalisieren einfach nicht mehr
  // übernommen.
  function normalizeProduct(product = {}) {
    const price = Number(product.price) || 0;
    const discountPrice = product.discountPrice != null && product.discountPrice !== "" ? Number(product.discountPrice) || 0 : null;
    return {
      id: product.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: product.name || "Neues Produkt",
      price,
      discountPrice: discountPrice != null && discountPrice > 0 && discountPrice < price ? discountPrice : null,
      icon: product.icon || "📦",
      description: product.description || ""
    };
  }
  // In-place normalisieren (siehe WebBuilderUtils.normalizeInPlace,
  // state.js) — hält Objektreferenzen stabil, damit Eingaben im
  // Produkt-Editor nicht durch eine History-Transaktion verworfen werden.
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

  // ------------------------------------------------------------------
  // Produkt-Tab-Editor-UI (linke Seitenleiste, Tab "📦 Produkte")
  // ------------------------------------------------------------------
  const esc = v => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  function renderProducts() {
    const list = document.getElementById("product-list");
    if (!list) return;
    const items = getProducts();
    list.innerHTML = items.length ? "" : '<p class="help-text">Noch keine Produkte angelegt. Klicke oben auf „+ Neues Produkt“.</p>';
    items.forEach(p => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.dataset.productId = p.id;
      card.innerHTML = `<div class="product-card-header"><span class="product-card-icon">${esc(p.icon)}</span><div class="product-card-title"><strong>${esc(p.name)}</strong><span>${esc(p.description)}</span></div><button type="button" class="product-delete" data-product-action="delete">×</button></div><div class="product-card-fields"><label>Name<input data-product-field="name" value="${esc(p.name)}"></label><label>Preis (€)<input type="number" min="0" step="0.01" data-product-field="price" value="${esc(p.price)}"></label><label>Rabattpreis (€)<input type="number" min="0" step="0.01" data-product-field="discountPrice" value="${p.discountPrice == null ? "" : esc(p.discountPrice)}"></label><label>Icon<input data-product-field="icon" value="${esc(p.icon)}"></label><label class="product-card-description">Beschreibung<textarea data-product-field="description" rows="2">${esc(p.description)}</textarea></label></div><div class="product-card-price">${p.discountPrice != null ? `<s>${Number(p.price).toFixed(2)} €</s> <strong>${Number(p.discountPrice).toFixed(2)} €</strong>` : `<strong>${Number(p.price).toFixed(2)} €</strong>`}</div>`;
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
    document.getElementById("btn-add-product")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      const p = addProduct();
      renderProducts();
      document.querySelector(`[data-product-id="${CSS.escape(p.id)}"] [data-product-field="name"]`)?.focus();
    }, true);

    // Reine Produkt-Tab-Darstellung reagiert nur auf die eigene Domäne;
    // andere Module (Warenkorb-Empfehlungen/Demo-Vorschau), die ebenfalls
    // von Produktänderungen abhängen, abonnieren "products" selbst
    // (siehe cart.js) — keine Duplikation der Render-Logik hier.
    state.subscribe?.(e => { if (e?.domain === "products") renderProducts(); });
    renderProducts();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));
  window.WebBuilderProductsRuntime = { render: renderProducts, addProduct };
})();
