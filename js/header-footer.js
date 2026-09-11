// WebBuilder header/footer domain
(() => {
  const state = window.WebBuilderState;

  if (!state) {
    console.error("WebBuilderHeaderFooter: shared state missing.");
    return;
  }

  const clone = v => JSON.parse(JSON.stringify(v));

  function emitChange(target, detail) {
    try {
      window.dispatchEvent(
        new CustomEvent("webbuilder:header-footer-change", {
          detail: {
            target,
            ...clone(detail || {})
          }
        })
      );
    } catch (e) {
      console.warn("WebBuilderHeaderFooter: change event failed.", e);
    }
  }

  function normalizeItem(item = {}) {
    return {
      id:
        item.id ||
        `bar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: item.type === "icon" ? "icon" : "text",
      text: item.text || "",
      iconName: item.iconName || null,
      x: Number(item.x) || 20,
      y: Number(item.y) || 18,
      color: item.color || "#ffffff",
      size: Number(item.size) || 16,
      bold: !!item.bold,
      italic: !!item.italic,
      underline: !!item.underline,
      align: item.align || "left",
      fontFamily: item.fontFamily || "inherit",
      actionType: item.actionType || "none",
      actionUrl: item.actionUrl || "",
      actionMsg: item.actionMsg || "",
      productId: item.productId || null,
      modalTitle: item.modalTitle || "",
      modalBody: item.modalBody || "",
      modalFooter: item.modalFooter || "",
      messagePosition: item.messagePosition || "bottom-right"
    };
  }

  function normalizeState() {
    state.headerEnabled = !!state.headerEnabled;
    state.headerSticky = !!state.headerSticky;
    state.headerHeight = Math.max(40, Number(state.headerHeight) || 64);
    state.headerBgType = state.headerBgType === "image" ? "image" : "solid";
    state.headerBgColor = String(state.headerBgColor || "#111827");
    state.headerBgImage = String(state.headerBgImage || "");

    state.headerItems = Array.isArray(state.headerItems)
      ? state.headerItems.map(normalizeItem)
      : [];

    state.footerEnabled = !!state.footerEnabled;
    state.footerHeight = Math.max(40, Number(state.footerHeight) || 70);
    state.footerBgType = state.footerBgType === "image" ? "image" : "solid";
    state.footerBgColor = String(state.footerBgColor || "#111827");
    state.footerBgImage = String(state.footerBgImage || "");

    state.footerItems = Array.isArray(state.footerItems)
      ? state.footerItems.map(normalizeItem)
      : [];

    return state;
  }

  const getHeader = () => ({
    enabled: state.headerEnabled,
    sticky: state.headerSticky,
    height: state.headerHeight,
    bgType: state.headerBgType,
    bgColor: state.headerBgColor,
    bgImage: state.headerBgImage,
    items: state.headerItems
  });

  const getFooter = () => ({
    enabled: state.footerEnabled,
    height: state.footerHeight,
    bgType: state.footerBgType,
    bgColor: state.footerBgColor,
    bgImage: state.footerBgImage,
    items: state.footerItems
  });

  function updateHeader(p = {}, h = true) {
    if (h) window.WebBuilderHistory?.arm();

    if (p.enabled != null) state.headerEnabled = !!p.enabled;
    if (p.sticky != null) state.headerSticky = !!p.sticky;

    if (p.height != null) {
      state.headerHeight = Math.max(40, Number(p.height) || 64);
    }

    if (p.bgType != null) {
      state.headerBgType = p.bgType === "image" ? "image" : "solid";
    }

    if (p.bgColor != null) state.headerBgColor = String(p.bgColor);
    if (p.bgImage != null) state.headerBgImage = String(p.bgImage);

    if (Array.isArray(p.items)) {
      state.headerItems = p.items.map(normalizeItem);
    }

    if (h) window.WebBuilderHistory?.commit();

    const r = getHeader();
    emitChange("header", r);
    return r;
  }

  function updateFooter(p = {}, h = true) {
    if (h) window.WebBuilderHistory?.arm();

    if (p.enabled != null) state.footerEnabled = !!p.enabled;

    if (p.height != null) {
      state.footerHeight = Math.max(40, Number(p.height) || 70);
    }

    if (p.bgType != null) {
      state.footerBgType = p.bgType === "image" ? "image" : "solid";
    }

    if (p.bgColor != null) state.footerBgColor = String(p.bgColor);
    if (p.bgImage != null) state.footerBgImage = String(p.bgImage);

    if (Array.isArray(p.items)) {
      state.footerItems = p.items.map(normalizeItem);
    }

    if (h) window.WebBuilderHistory?.commit();

    const r = getFooter();
    emitChange("footer", r);
    return r;
  }

  function addItem(type, target = "header", patch = {}, h = true) {
    const items =
      target === "footer"
        ? state.footerItems
        : state.headerItems;

    const item = normalizeItem({
      ...patch,
      type,
      text:
        patch.text ||
        (type === "icon" ? "" : "Neuer Text")
    });

    if (h) window.WebBuilderHistory?.arm();

    items.push(item);

    if (h) window.WebBuilderHistory?.commit();

    emitChange(
      target,
      target === "footer" ? getFooter() : getHeader()
    );

    return item;
  }

  function removeItem(id, target = "header", h = true) {
    const items =
      target === "footer"
        ? state.footerItems
        : state.headerItems;

    const i = items.findIndex(x => x?.id === id);
    if (i < 0) return false;

    if (h) window.WebBuilderHistory?.arm();

    items.splice(i, 1);

    if (state.selectedBarItemRef?.id === id) {
      state.selectedBarItemRef = null;
    }

    if (h) window.WebBuilderHistory?.commit();

    emitChange(
      target,
      target === "footer" ? getFooter() : getHeader()
    );

    return true;
  }

  function updateItem(id, patch, target = "header", h = true) {
    const items =
      target === "footer"
        ? state.footerItems
        : state.headerItems;

    const item = items.find(x => x?.id === id);
    if (!item) return null;

    if (h) window.WebBuilderHistory?.arm();

    Object.assign(
      item,
      normalizeItem(
        Object.assign({}, item, clone(patch || {}))
      )
    );

    if (h) window.WebBuilderHistory?.commit();

    emitChange(
      target,
      target === "footer" ? getFooter() : getHeader()
    );

    return item;
  }

  normalizeState();

  window.WebBuilderHeaderFooter = {
    normalizeState,
    normalizeItem,
    getHeader,
    getFooter,
    updateHeader,
    updateFooter,
    addItem,
    removeItem,
    updateItem,

    onChange(cb) {
      if (typeof cb !== "function") return () => {};

      const handler = e => cb(e.detail);

      window.addEventListener(
        "webbuilder:header-footer-change",
        handler
      );

      return () =>
        window.removeEventListener(
          "webbuilder:header-footer-change",
          handler
        );
    }
  };

  const byId = id => document.getElementById(id);

  const esc = v =>
    String(v ?? "").replace(
      /[&<>"']/g,
      c =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;"
        }[c])
    );

  function currentSelection() {
    const ref = state.selectedBarItemRef;
    if (!ref) return null;

    const items =
      ref.target === "footer"
        ? state.footerItems
        : state.headerItems;

    const item = items.find(x => x.id === ref.id);

    return item ? { ref, item } : null;
  }

  function selectItem(target, id) {
    state.selectedBarItemRef = { target, id };

    if (window.WebBuilderInspector?.select) {
      window.WebBuilderInspector.select(null);
    } else {
      window.WebBuilderElements?.setSelected?.(null);
    }

    render();
  }

  function clearSelection() {
    if (!state.selectedBarItemRef) return;

    state.selectedBarItemRef = null;
    render();
  }

  function iconMarkup(name) {
    const registry = window.WebBuilderIconRegistry;

    return registry &&
      typeof registry.get === "function"
      ? registry.get(name) || ""
      : "";
  }

  function itemInnerHtml(item) {
    const deco = item.underline ? "underline" : "none";
    const font = item.fontFamily || "inherit";
    const align = item.align || "left";

    if (item.type === "icon") {
      const size = Number(item.size) || 24;

      return `<span style="display:inline-flex;width:${size}px;height:${size}px;color:${item.color || "#fff"}">${iconMarkup(item.iconName)}</span>`;
    }

    return `<span style="font-size:${Number(item.size) || 16}px;color:${item.color || "#fff"};font-weight:${item.bold ? "bold" : "400"};font-style:${item.italic ? "italic" : "normal"};text-decoration:${deco};font-family:${font};text-align:${align};white-space:nowrap">${esc(item.text || "")}</span>`;
  }

  function backgroundCss(target) {
    const type =
      target === "footer"
        ? state.footerBgType
        : state.headerBgType;

    const color =
      target === "footer"
        ? state.footerBgColor
        : state.headerBgColor;

    const image =
      target === "footer"
        ? state.footerBgImage
        : state.headerBgImage;

    if (type === "image" && image) {
      return `background-color:${color};background-image:url("${image}");background-size:cover;background-position:center;background-repeat:no-repeat;`;
    }

    return `background-color:${color};background-image:none;`;
  }

  function bindResizeHandle(handle, target) {
    handle.addEventListener("mousedown", e => {
      e.preventDefault();
      e.stopPropagation();

      const isFooter = target === "footer";
      const bar = handle.closest(".builder-bar");
      if (!bar) return;

      const rect = bar.getBoundingClientRect();
      const fixedEdgeY = isFooter ? rect.bottom : rect.top;
      const zoom = Number(state.zoomLevel) || 1;

      window.WebBuilderHistory?.arm();

      const onMove = moveEvent => {
        const rawHeight = isFooter
          ? (fixedEdgeY - moveEvent.clientY) / zoom
          : (moveEvent.clientY - fixedEdgeY) / zoom;

        const height = Math.max(
          40,
          Math.min(400, Math.round(rawHeight))
        );

        if (isFooter) {
          state.footerHeight = height;
        } else {
          state.headerHeight = height;
        }

        renderBars();

        const input = byId(
          isFooter
            ? "footer-height-input"
            : "header-height-input"
        );

        if (input) input.value = height;
      };

      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);

        window.WebBuilderHistory?.commit();

        emitChange(
          target,
          isFooter ? getFooter() : getHeader()
        );
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }

  // Nutzt ausschließlich das zentrale Drag-System aus canvas.js.
  function bindBarItemDrag(domEl, item, barEl) {
    const canvas = window.WebBuilderCanvas;

    if (!canvas?.makeDraggable) {
      console.warn(
        "WebBuilderHeaderFooter: canvas drag helper missing."
      );
      return;
    }

    canvas.makeDraggable(
      domEl,
      item,
      barEl,
      {
        getBounds: () => ({
          minX: 0,
          minY: 0,
          maxX: Math.max(
            0,
            barEl.clientWidth - domEl.offsetWidth
          ),
          maxY: Math.max(
            0,
            barEl.clientHeight - domEl.offsetHeight
          )
        })
      }
    );
  }

  function buildBarElement(target) {
    const isFooter = target === "footer";

    const cfg =
      isFooter
        ? getFooter()
        : getHeader();

    const bar = document.createElement("div");

    const useSticky =
      !isFooter &&
      cfg.sticky &&
      state.isPreviewMode;

    bar.className =
      "builder-bar" +
      (useSticky ? " sticky-header" : "");

    bar.dataset.barTarget = target;

    bar.style.position = useSticky ? "sticky" : "absolute";
    bar.style.left = "0";
    bar.style.right = "0";
    bar.style.top = isFooter ? "" : "0";
    bar.style.bottom = isFooter ? "0" : "";
    bar.style.height = cfg.height + "px";
    bar.style.zIndex = isFooter ? "250" : "300";
    bar.style.cssText += backgroundCss(target);

    cfg.items.forEach(item => {
      const el = document.createElement("div");

      const isSelected =
        state.selectedBarItemRef &&
        state.selectedBarItemRef.target === target &&
        state.selectedBarItemRef.id === item.id;

      el.className =
        "bar-item" +
        (isSelected ? " bar-item-selected" : "") +
        (
          item.actionType &&
          item.actionType !== "none"
            ? " has-action"
            : ""
        );

      el.style.left = (Number(item.x) || 0) + "px";
      el.style.top = (Number(item.y) || 0) + "px";
      el.dataset.id = item.id;
      el.innerHTML = itemInnerHtml(item);

      const badge = document.createElement("span");
      badge.className = "element-badge";
      badge.innerText = "⚡ Logik";
      el.appendChild(badge);

      // Klick bleibt für Auswahl/Aktion zuständig.
      // Drag läuft ausschließlich über makeDraggable().
      el.addEventListener(
        "click",
        e => {
          e.stopPropagation();

          if (state.isPreviewMode) {
            window.WebBuilderActionRuntime?.execute?.(item);
            return;
          }

          selectItem(target, item.id);
        },
        true
      );

      if (!state.isPreviewMode) {
        // Wichtig: Das Element erst anhängen, damit clientWidth/offsetWidth
        // beim eigentlichen Drag bereits echte Werte liefern.
        bar.appendChild(el);
        bindBarItemDrag(el, item, bar);
      } else {
        bar.appendChild(el);
      }
    });

    if (!state.isPreviewMode) {
      const handle = document.createElement("div");

      handle.className =
        "bar-resize-handle " +
        (isFooter ? "top" : "bottom");

      bindResizeHandle(handle, target);
      bar.appendChild(handle);
    }

    bar.addEventListener(
      "click",
      e => {
        if (
          e.target === bar &&
          !state.isPreviewMode
        ) {
          clearSelection();
        }
      },
      true
    );

    return bar;
  }

  function renderBars() {
    const canvasEl = byId("canvas");
    if (!canvasEl) return;

    canvasEl
      .querySelectorAll(".builder-bar")
      .forEach(el => el.remove());

    if (state.headerEnabled) {
      canvasEl.insertBefore(
        buildBarElement("header"),
        canvasEl.firstChild
      );
    }

    if (state.footerEnabled) {
      canvasEl.appendChild(
        buildBarElement("footer")
      );
    }
  }

  function renderList(target) {
    const list = byId(
      target === "footer"
        ? "footer-items-list"
        : "header-items-list"
    );

    if (!list) return;

    const items =
      target === "footer"
        ? state.footerItems
        : state.headerItems;

    list.innerHTML =
      items.length
        ? ""
        : '<p class="help-text">Noch keine Elemente.</p>';

    items.forEach(item => {
      const selected =
        state.selectedBarItemRef &&
        state.selectedBarItemRef.target === target &&
        state.selectedBarItemRef.id === item.id;

      const row = document.createElement("div");

      row.className =
        "item-row" +
        (selected ? " active-item-row" : "");

      row.innerHTML =
        `<button type="button" class="bar-item-select" data-id="${esc(item.id)}" style="flex:1;text-align:left">${item.type === "icon" ? esc(item.iconName || "Icon") : esc(item.text || "Text")}</button>` +
        `<button type="button" class="item-delete bar-item-delete" data-id="${esc(item.id)}">✕</button>`;

      list.appendChild(row);
    });
  }

  function syncBgControls(target) {
    const type =
      target === "footer"
        ? state.footerBgType
        : state.headerBgType;

    const color =
      target === "footer"
        ? state.footerBgColor
        : state.headerBgColor;

    const image =
      target === "footer"
        ? state.footerBgImage
        : state.headerBgImage;

    const typeSel = byId(`${target}-bg-type`);
    const colorInput = byId(`${target}-bg-input`);
    const urlInput = byId(`${target}-bg-image-url`);

    if (typeSel) typeSel.value = type;
    if (colorInput) colorInput.value = color;

    if (
      urlInput &&
      document.activeElement !== urlInput
    ) {
      urlInput.value = image || "";
    }

    byId(`${target}-bg-solid-group`)
      ?.classList.toggle("hidden", type !== "solid");

    byId(`${target}-bg-image-group`)
      ?.classList.toggle("hidden", type !== "image");
  }

  function render() {
    const h = getHeader();
    const f = getFooter();

    const headerToggle = byId("header-toggle");
    if (headerToggle) headerToggle.checked = h.enabled;

    const stickyToggle = byId("header-sticky-toggle");
    if (stickyToggle) stickyToggle.checked = h.sticky;

    const headerHeight = byId("header-height-input");
    if (headerHeight) headerHeight.value = h.height;

    const footerToggle = byId("footer-toggle");
    if (footerToggle) footerToggle.checked = f.enabled;

    const footerHeight = byId("footer-height-input");
    if (footerHeight) footerHeight.value = f.height;

    syncBgControls("header");
    syncBgControls("footer");

    renderList("header");
    renderList("footer");
    renderEditor();
    renderBars();
  }

  function populateBarIconSelect(selectEl, selectedName) {
    if (!selectEl) return;

    const registry = window.WebBuilderIconRegistry;

    const allIcons =
      registry &&
      typeof registry.getAll === "function"
        ? registry.getAll()
        : {};

    const names = Object.keys(allIcons);

    selectEl.innerHTML =
      names.length
        ? names
            .map(
              name =>
                `<option value="${esc(name)}">${esc(name)}</option>`
            )
            .join("")
        : '<option value="">— Kein Icon verfügbar —</option>';

    if (selectedName && names.includes(selectedName)) {
      selectEl.value = selectedName;
    }
  }

  function renderEditor() {
    const panel = byId("bar-inspector-form");
    const emptyMsg = byId("no-selection");
    const elementForm = byId("inspector-form");
    const sel = currentSelection();

    const showBar = !!sel && !state.selectedElementId;

    panel?.classList.toggle("hidden", !showBar);

    if (showBar) {
      elementForm?.classList.add("hidden");
      emptyMsg?.classList.add("hidden");
    } else if (!state.selectedElementId) {
      emptyMsg?.classList.remove("hidden");
    }

    if (!sel) return;

    const { item } = sel;
    const isIcon = item.type === "icon";

    byId("bar-item-text-group")?.classList.toggle("hidden", isIcon);
    byId("bar-group-icon")?.classList.toggle("hidden", !isIcon);

    if (isIcon) {
      populateBarIconSelect(
        byId("bar-prop-icon"),
        item.iconName
      );
    }

    const text = byId("bar-prop-text");
    if (text && document.activeElement !== text) {
      text.value = item.text || "";
    }

    const size = byId("bar-prop-size");
    if (size && document.activeElement !== size) {
      size.value = Number(item.size) || 16;
    }

    const color = byId("bar-prop-color");
    if (color) color.value = item.color || "#ffffff";

    const font = byId("bar-prop-font-family");
    if (font) font.value = item.fontFamily || "inherit";

    ["bold", "italic", "underline"].forEach(f => {
      byId(`bar-ttb-${f}`)
        ?.classList.toggle("active", !!item[f]);
    });

    ["left", "center", "right"].forEach(a => {
      byId(`bar-ttb-align-${a}`)
        ?.classList.toggle(
          "active",
          (item.align || "left") === a
        );
    });

    const actionType = byId("bar-prop-action-type");
    if (actionType) {
      actionType.value = item.actionType || "none";
    }

    const actionUrl = byId("bar-prop-action-url");
    if (
      actionUrl &&
      document.activeElement !== actionUrl
    ) {
      actionUrl.value = item.actionUrl || "";
    }

    const actionMsg = byId("bar-prop-action-msg");
    if (
      actionMsg &&
      document.activeElement !== actionMsg
    ) {
      actionMsg.value = item.actionMsg || "";
    }

    byId("bar-group-action-url")
      ?.classList.toggle(
        "hidden",
        item.actionType !== "open-url"
      );

    byId("bar-group-action-msg")
      ?.classList.toggle(
        "hidden",
        !["alert-msg", "open-custom-modal"].includes(item.actionType)
      );

    byId("bar-group-product")
      ?.classList.toggle(
        "hidden",
        item.actionType !== "cart-add"
      );

    const isModal = item.actionType === "open-custom-modal";
    const isAlert = item.actionType === "alert-msg";

    const modalTitle = byId("bar-prop-modal-title");
    if (
      modalTitle &&
      document.activeElement !== modalTitle
    ) {
      modalTitle.value = item.modalTitle || "";
    }

    const modalBody = byId("bar-prop-modal-body");
    if (
      modalBody &&
      document.activeElement !== modalBody
    ) {
      modalBody.value = item.modalBody || "";
    }

    const modalFooter = byId("bar-prop-modal-footer");
    if (
      modalFooter &&
      document.activeElement !== modalFooter
    ) {
      modalFooter.value = item.modalFooter || "";
    }

    const messagePosition = byId("bar-prop-message-position");
    if (messagePosition) {
      messagePosition.value =
        item.messagePosition || "bottom-right";
    }

    byId("bar-group-modal-title")
      ?.classList.toggle("hidden", !isModal);

    byId("bar-group-modal-body")
      ?.classList.toggle("hidden", !isModal);

    byId("bar-group-modal-footer")
      ?.classList.toggle("hidden", !isModal);

    byId("bar-group-message-position")
      ?.classList.toggle("hidden", !isAlert);

    const productSel = byId("bar-prop-product");

    if (productSel) {
      const list =
        window.WebBuilderProducts?.getAll?.() || [];

      productSel.innerHTML =
        list.length
          ? list
              .map(
                p =>
                  `<option value="${esc(p.id)}">${esc(p.icon || "📦")} ${esc(p.name)} — ${Number(p.discountPrice != null ? p.discountPrice : p.price).toFixed(2)} €</option>`
              )
              .join("")
          : '<option value="">— Kein Produkt —</option>';

      productSel.value = item.productId || "";
    }
  }

  function updateSelected(patch) {
    const sel = currentSelection();
    if (!sel) return;

    transact(() => {
      updateItem(
        sel.ref.id,
        patch,
        sel.ref.target,
        false
      );
    });
  }

  function transact(fn) {
    window.WebBuilderHistory?.arm();
    fn();
    window.WebBuilderHistory?.commit();
    render();
  }

  function bindControl(id, fn, event = "change") {
    byId(id)?.addEventListener(
      event,
      e => {
        e.preventDefault();
        e.stopImmediatePropagation();
        transact(() => fn(e));
      },
      true
    );
  }

  function bindBgControls(target) {
    byId(`${target}-bg-type`)?.addEventListener(
      "change",
      e => {
        transact(() => {
          if (target === "footer") {
            state.footerBgType =
              e.target.value === "image"
                ? "image"
                : "solid";
          } else {
            state.headerBgType =
              e.target.value === "image"
                ? "image"
                : "solid";
          }
        });
      },
      true
    );

    byId(`${target}-bg-input`)?.addEventListener(
      "input",
      e => {
        transact(() => {
          if (target === "footer") {
            state.footerBgColor = e.target.value;
          } else {
            state.headerBgColor = e.target.value;
          }
        });
      },
      true
    );

    byId(`${target}-bg-image-url`)?.addEventListener(
      "change",
      e => {
        transact(() => {
          if (target === "footer") {
            state.footerBgImage = e.target.value;
          } else {
            state.headerBgImage = e.target.value;
          }
        });
      },
      true
    );

    byId(`${target}-bg-image-file`)?.addEventListener(
      "change",
      e => {
        const file = e.target.files?.[0];

        if (!file || !file.type.startsWith("image/")) return;

        const reader = new FileReader();

        reader.onload = () => {
          if (typeof reader.result !== "string") return;

          transact(() => {
            if (target === "footer") {
              state.footerBgImage = reader.result;
              state.footerBgType = "image";
            } else {
              state.headerBgImage = reader.result;
              state.headerBgType = "image";
            }
          });
        };

        reader.readAsDataURL(file);
      },
      true
    );
  }

  function bind() {
    bindControl(
      "header-toggle",
      e => updateHeader(
        { enabled: e.target.checked },
        false
      )
    );

    bindControl(
      "header-sticky-toggle",
      e => updateHeader(
        { sticky: e.target.checked },
        false
      )
    );

    bindControl(
      "header-height-input",
      e => updateHeader(
        { height: e.target.value },
        false
      )
    );

    bindControl(
      "footer-toggle",
      e => updateFooter(
        { enabled: e.target.checked },
        false
      )
    );

    bindControl(
      "footer-height-input",
      e => updateFooter(
        { height: e.target.value },
        false
      )
    );

    bindBgControls("header");
    bindBgControls("footer");

    [
      ["btn-add-header-text", "header", "text"],
      ["btn-add-header-icon", "header", "icon"],
      ["btn-add-footer-text", "footer", "text"],
      ["btn-add-footer-icon", "footer", "icon"]
    ].forEach(([id, target, type]) => {
      byId(id)?.addEventListener(
        "click",
        e => {
          e.preventDefault();
          e.stopImmediatePropagation();

          transact(() => {
            const item = addItem(
              type,
              target,
              type === "icon"
                ? { iconName: "arrow-right" }
                : { text: "Neuer Text" },
              false
            );

            state.selectedBarItemRef = {
              target,
              id: item.id
            };

            window.WebBuilderElements?.setSelected?.(null);
          });
        },
        true
      );
    });

    document.addEventListener(
      "click",
      e => {
        const select = e.target.closest?.(".bar-item-select");
        const del = e.target.closest?.(".bar-item-delete");

        if (select) {
          e.preventDefault();
          e.stopImmediatePropagation();

          const list = select.closest("[id$='items-list']");
          selectItem(
            list?.id === "footer-items-list"
              ? "footer"
              : "header",
            select.dataset.id
          );
        }

        if (del) {
          e.preventDefault();
          e.stopImmediatePropagation();

          const list = del.closest("[id$='items-list']");
          const target =
            list?.id === "footer-items-list"
              ? "footer"
              : "header";

          transact(() =>
            removeItem(
              del.dataset.id,
              target,
              false
            )
          );
        }
      },
      true
    );

    [
      ["bar-prop-text", "text"],
      ["bar-prop-color", "color"],
      ["bar-prop-font-family", "fontFamily"],
      ["bar-prop-action-url", "actionUrl"],
      ["bar-prop-action-msg", "actionMsg"],
      ["bar-prop-product", "productId"],
      ["bar-prop-modal-title", "modalTitle"],
      ["bar-prop-modal-body", "modalBody"],
      ["bar-prop-modal-footer", "modalFooter"],
      ["bar-prop-message-position", "messagePosition"]
    ].forEach(([id, field]) => {
      byId(id)?.addEventListener(
        "change",
        e =>
          updateSelected({
            [field]: e.target.value
          }),
        true
      );
    });

    byId("bar-prop-icon")?.addEventListener(
      "change",
      e =>
        updateSelected({
          iconName: e.target.value
        }),
      true
    );

    byId("bar-prop-size")?.addEventListener(
      "change",
      e =>
        updateSelected({
          size: Math.max(
            8,
            Math.min(
              300,
              Number(e.target.value) || 16
            )
          )
        }),
      true
    );

    byId("bar-prop-action-type")?.addEventListener(
      "change",
      e =>
        updateSelected({
          actionType: e.target.value
        }),
      true
    );

    ["bold", "italic", "underline"].forEach(f => {
      byId(`bar-ttb-${f}`)?.addEventListener(
        "click",
        e => {
          e.preventDefault();
          e.stopImmediatePropagation();

          const sel = currentSelection();

          if (sel) {
            updateSelected({
              [f]: !sel.item[f]
            });
          }
        },
        true
      );
    });

    ["left", "center", "right"].forEach(a => {
      byId(`bar-ttb-align-${a}`)?.addEventListener(
        "click",
        e => {
          e.preventDefault();
          e.stopImmediatePropagation();

          updateSelected({
            align: a
          });
        },
        true
      );
    });

    byId("btn-delete-bar-item")?.addEventListener(
      "click",
      e => {
        e.preventDefault();
        e.stopImmediatePropagation();

        const sel = currentSelection();

        if (sel) {
          transact(() =>
            removeItem(
              sel.ref.id,
              sel.ref.target,
              false
            )
          );
        }
      },
      true
    );

    onChangeInternal();

    state.subscribe?.(e => {
      if (
        ["header", "footer", "products", "preview"]
          .includes(e?.domain)
      ) {
        render();
      }
    });

    render();
  }

  function onChangeInternal() {
    window.WebBuilderHeaderFooter.onChange(render);
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      bind,
      { once: true }
    );
  } else {
    bind();
  }

  window.WebBuilderHeaderFooterRuntime = {
    render,
    renderBars,
    selectItem,
    clearSelection,
    currentSelection,
    itemInnerHtml
  };
})();
