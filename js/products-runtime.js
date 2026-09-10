// WebBuilder Products runtime
// Takes live ownership of the product-management UI while the legacy editor
// remains loaded. Product data is read/written exclusively through
// WebBuilderProducts so the UI no longer needs a second product state.
(() => {
  const state = window.WebBuilderState;
  const products = window.WebBuilderProducts;
  const history = window.WebBuilderHistory;

  if (!state || !products) {
    console.error("WebBuilderProductsRuntime: required services missing.");
    return;
  }

  let productList = null;
  let addButton = null;

  const esc = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

  function render() {
    productList = productList || document.getElementById("product-list");
    if (!productList) return;

    const list = products.getAll();
    productList.innerHTML = "";

    if (!list.length) {
      productList.innerHTML = '<p class="help-text">Noch keine Produkte angelegt. Klicke oben auf „+ Neues Produkt“.</p>';
      return;
    }

    list.forEach(product => {
      const card = document.createElement("div");
      card.className = "product-card";
      card.dataset.productId = product.id;
      card.innerHTML = `
        <div class="product-card-header">
          <span class="product-card-icon">${esc(product.icon)}</span>
          <div class="product-card-title">
            <strong>${esc(product.name)}</strong>
            <span>${esc(product.description)}</span>
          </div>
          <button type="button" class="product-delete" data-product-action="delete" title="Produkt löschen">×</button>
        </div>
        <div class="product-card-fields">
          <label>Name<input data-product-field="name" value="${esc(product.name)}"></label>
          <label>Preis (€)<input type="number" min="0" step="0.01" data-product-field="price" value="${esc(product.price)}"></label>
          <label>Rabattpreis (€)<input type="number" min="0" step="0.01" data-product-field="discountPrice" value="${product.discountPrice == null ? "" : esc(product.discountPrice)}"></label>
          <label>Icon<input data-product-field="icon" value="${esc(product.icon)}"></label>
          <label class="product-card-description">Beschreibung<textarea data-product-field="description" rows="2">${esc(product.description)}</textarea></label>
        </div>
        <div class="product-card-price">
          ${product.discountPrice != null ? `<s>${Number(product.price).toFixed(2)} €</s> <strong>${Number(product.discountPrice).toFixed(2)} €</strong>` : `<strong>${Number(product.price).toFixed(2)} €</strong>`}
        </div>`;
      productList.appendChild(card);
    });
  }

  function updateFromField(card, field, value) {
    const id = card.dataset.productId;
    if (!id) return;
    if (history) history.arm();
    products.update(id, { [field]: value }, false);
    if (history) history.commit();
    render();
  }

  function addProduct() {
    const item = products.add({
      name: "Neues Produkt",
      price: 0,
      discountPrice: null,
      icon: "📦",
      description: ""
    });
    render();
    const input = productList?.querySelector(`[data-product-id="${CSS.escape(item.id)}"] [data-product-field="name"]`);
    input?.focus();
    input?.select();
  }

  function handleClick(event) {
    const deleteButton = event.target.closest?.('[data-product-action="delete"]');
    if (!deleteButton) return;
    const card = deleteButton.closest("[data-product-id]");
    if (!card) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    products.remove(card.dataset.productId);
    render();
  }

  function handleChange(event) {
    const field = event.target.closest?.("[data-product-field]");
    if (!field) return;
    const card = field.closest("[data-product-id]");
    if (!card) return;
    const name = field.dataset.productField;
    const value = field.type === "number"
      ? (field.value === "" ? null : Number(field.value))
      : field.value;
    updateFromField(card, name, value);
  }

  function bind() {
    productList = document.getElementById("product-list");
    addButton = document.getElementById("btn-add-product");
    if (!productList) return;

    // Capture phase prevents the legacy product handler from creating a
    // second local product in builder-legacy.js.
    productList.addEventListener("click", handleClick, true);
    productList.addEventListener("change", handleChange, true);

    addButton?.addEventListener("click", event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      addProduct();
    }, true);

    state.subscribe?.((event) => {
      if (event?.domain === "products") render();
    });

    window.addEventListener("webbuilder:state-change", event => {
      if (event.detail?.domain === "products") render();
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", () => {
    window.setTimeout(bind, 0);
  });

  window.WebBuilderProductsRuntime = { render, addProduct };
})();
