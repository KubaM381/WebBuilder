// WebBuilder header/footer runtime
// Owns live header/footer editor DOM so builder-legacy.js no longer handles this UI.
(() => {
  const service = window.WebBuilderHeaderFooter;
  if (!service) { console.error("WebBuilderHeaderFooterRuntime: service missing."); return; }

  const byId = id => document.getElementById(id);
  const history = () => window.WebBuilderHistory;
  let selected = null;

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>\"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  }

  function getItems(target) { return target === "footer" ? service.getFooter().items : service.getHeader().items; }

  function renderList(target) {
    const list = byId(target === "footer" ? "footer-items-list" : "header-items-list");
    if (!list) return;
    const items = getItems(target);
    list.innerHTML = items.length ? "" : '<p class="help-text">Noch keine Elemente.</p>';
    items.forEach(item => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.dataset.id = item.id;
      row.innerHTML = `<button type="button" class="bar-item-select" data-id="${esc(item.id)}" style="flex:1;text-align:left;">${item.type === "icon" ? esc(item.iconName || "Icon") : esc(item.text || "Text")}</button><button type="button" class="item-delete bar-item-delete" data-id="${esc(item.id)}">✕</button>`;
      list.appendChild(row);
    });
  }

  function renderEditor() {
    const empty = byId("bar-item-editor-empty");
    const form = byId("bar-item-editor-form");
    const items = selected ? getItems(selected.target) : [];
    const item = selected ? items.find(x => x.id === selected.id) : null;
    if (empty) empty.classList.toggle("hidden", !!item);
    if (form) form.classList.toggle("hidden", !item);
    if (!item) return;

    const textGroup = byId("bar-item-text-group");
    if (textGroup) textGroup.classList.toggle("hidden", item.type === "icon");
    const text = byId("bar-prop-text"); if (text) text.value = item.text || "";
    const action = byId("bar-prop-action-type"); if (action) action.value = item.actionType || "none";
    const url = byId("bar-prop-action-url"); if (url) url.value = item.actionUrl || "";
    const msg = byId("bar-prop-action-msg"); if (msg) msg.value = item.actionMsg || "";
    const groupUrl = byId("bar-group-action-url"); if (groupUrl) groupUrl.classList.toggle("hidden", item.actionType !== "open-url");
    const groupMsg = byId("bar-group-action-msg"); if (groupMsg) groupMsg.classList.toggle("hidden", !["alert-msg","open-custom-modal"].includes(item.actionType));
    const groupProduct = byId("bar-group-product"); if (groupProduct) groupProduct.classList.toggle("hidden", item.actionType !== "cart-add");
    const product = byId("bar-prop-product");
    if (product) {
      const products = window.WebBuilderProducts?.getAll?.() || [];
      product.innerHTML = products.length ? products.map(p => `<option value="${esc(p.id)}">${esc(p.icon || "📦")} ${esc(p.name)} — ${Number(p.price || 0).toFixed(2)} €</option>`).join("") : '<option value="">— Kein Produkt —</option>';
      if (item.productId) product.value = item.productId;
    }
  }

  function render() {
    const header = service.getHeader();
    const footer = service.getFooter();
    const ht = byId("header-toggle"); if (ht) ht.checked = header.enabled;
    const hs = byId("header-sticky-toggle"); if (hs) hs.checked = header.sticky;
    const hh = byId("header-height-input"); if (hh) hh.value = header.height;
    const hb = byId("header-bg-input"); if (hb) hb.value = header.bgColor;
    const ft = byId("footer-toggle"); if (ft) ft.checked = footer.enabled;
    const fh = byId("footer-height-input"); if (fh) fh.value = footer.height;
    const fb = byId("footer-bg-input"); if (fb) fb.value = footer.bgColor;
    renderList("header"); renderList("footer"); renderEditor();
  }

  function transact(fn) { history()?.arm(); fn(); history()?.commit(); render(); }

  function bindControl(id, fn, event = "change") {
    const el = byId(id); if (!el) return;
    el.addEventListener(event, e => { e.preventDefault(); e.stopImmediatePropagation(); transact(() => fn(e)); }, true);
  }

  function bind() {
    bindControl("header-toggle", e => service.updateHeader({enabled:e.target.checked}, false));
    bindControl("header-sticky-toggle", e => service.updateHeader({sticky:e.target.checked}, false));
    bindControl("header-height-input", e => service.updateHeader({height:e.target.value}, false));
    bindControl("header-bg-input", e => service.updateHeader({bgColor:e.target.value}, false), "input");
    bindControl("footer-toggle", e => service.updateFooter({enabled:e.target.checked}, false));
    bindControl("footer-height-input", e => service.updateFooter({height:e.target.value}, false));
    bindControl("footer-bg-input", e => service.updateFooter({bgColor:e.target.value}, false), "input");

    [["btn-add-header-text","header","text"],["btn-add-header-icon","header","icon"],["btn-add-footer-text","footer","text"],["btn-add-footer-icon","footer","icon"]].forEach(([id,target,type]) => {
      const el = byId(id); if (!el) return;
      el.addEventListener("click", e => { e.preventDefault(); e.stopImmediatePropagation(); transact(() => { const item = service.addItem(type,target, type === "icon" ? {iconName:"arrow-right"} : {text:"Neuer Text"}, false); selected = {target,id:item.id}; }); }, true);
    });

    document.addEventListener("click", e => {
      const select = e.target.closest?.(".bar-item-select");
      const del = e.target.closest?.(".bar-item-delete");
      if (select) {
        e.preventDefault(); e.stopImmediatePropagation();
        const list = select.closest("[id$='items-list']");
        const target = list?.id === "footer-items-list" ? "footer" : "header";
        selected = {target,id:select.dataset.id}; render(); return;
      }
      if (del) {
        e.preventDefault(); e.stopImmediatePropagation();
        const list = del.closest("[id$='items-list']");
        const target = list?.id === "footer-items-list" ? "footer" : "header";
        transact(() => service.removeItem(del.dataset.id,target,false));
        if (selected?.id === del.dataset.id) selected = null;
      }
    }, true);

    [["bar-prop-text","text"],["bar-prop-action-url","actionUrl"],["bar-prop-action-msg","actionMsg"],["bar-prop-product","productId"]].forEach(([id,prop]) => {
      const el=byId(id); if(!el) return;
      el.addEventListener("input", e => { if(!selected) return; service.updateItem(selected.id,{[prop]:e.target.value},selected.target,false); renderEditor(); }, true);
      el.addEventListener("change", e => { if(!selected) return; transact(() => service.updateItem(selected.id,{[prop]:e.target.value},selected.target,false)); }, true);
    });
    bindControl("bar-prop-action-type", e => { if(selected) service.updateItem(selected.id,{actionType:e.target.value},selected.target,false); });

    service.onChange(() => render());
    window.addEventListener("webbuilder:state-change", e => { if (["header","footer","products"].includes(e.detail?.domain)) render(); });
    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind, {once:true});
  else bind();
  window.WebBuilderHeaderFooterRuntime = {render};
})();
