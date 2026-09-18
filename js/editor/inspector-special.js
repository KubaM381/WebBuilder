// js/editor/inspector-special.js
// The "Erweiterte Eigenschaften" field group (icon frame + color, per-icon
// hover highlight, shape type/style, modal title/body/footer, message
// position), rendered below editor/inspector.js's fields in the same
// #inspector-form. Reaches editor/inspector.js's selection/update/render
// API only through window.WebBuilderInspector at runtime — no load-order
// requirement between the two.
(() => {
  const byId = id => document.getElementById(id);

  const FIELD_GROUPS = [
    "special-icon-frame", "special-icon-frame-color", "special-hover-highlight",
    "special-shape-type", "special-shape-style",
    "special-modal-title", "special-modal-body", "special-modal-footer",
    "special-message-position"
  ];

  function addField(panel, label, input) {
    const group = document.createElement("div");
    group.className = "form-group";
    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    group.append(labelEl, input);
    panel.appendChild(group);
  }

  function buildPanel(form) {
    const panel = document.createElement("div");
    panel.id = "inspector-special-runtime";
    panel.innerHTML = '<hr class="divider"><h4>⚙️ Erweiterte Eigenschaften</h4>';
    form.appendChild(panel);

    const iconFrame = document.createElement("input");
    iconFrame.type = "checkbox";
    iconFrame.id = "special-icon-frame";
    addField(panel, "Icon-Rahmen anzeigen", iconFrame);

    const iconFrameColor = document.createElement("input");
    iconFrameColor.type = "color";
    iconFrameColor.id = "special-icon-frame-color";
    addField(panel, "Rahmenfarbe", iconFrameColor);

    const hoverHighlight = document.createElement("input");
    hoverHighlight.type = "checkbox";
    hoverHighlight.id = "special-hover-highlight";
    addField(panel, "Hervorhebung bei Hover anzeigen", hoverHighlight);

    const shapeType = document.createElement("select");
    shapeType.id = "special-shape-type";
    [["rectangle", "Rechteck"], ["circle", "Kreis"], ["triangle", "Dreieck"]].forEach(([v, t]) => shapeType.add(new Option(t, v)));
    addField(panel, "Form", shapeType);

    const shapeStyle = document.createElement("select");
    shapeStyle.id = "special-shape-style";
    [["solid", "Gefüllt"], ["outline", "Umrandung"]].forEach(([v, t]) => shapeStyle.add(new Option(t, v)));
    addField(panel, "Form-Stil", shapeStyle);

    const modalTitle = document.createElement("input");
    modalTitle.id = "special-modal-title";
    addField(panel, "Modal-Titel", modalTitle);

    const modalBody = document.createElement("textarea");
    modalBody.id = "special-modal-body";
    modalBody.rows = 3;
    addField(panel, "Modal-Inhalt", modalBody);

    const modalFooter = document.createElement("input");
    modalFooter.id = "special-modal-footer";
    addField(panel, "Modal-Fußbereich", modalFooter);

    const messagePosition = document.createElement("select");
    messagePosition.id = "special-message-position";
    [
      ["bottom-right", "Unten rechts"], ["bottom-left", "Unten links"],
      ["top-right", "Oben rechts"], ["top-left", "Oben links"], ["center", "Zentriert"]
    ].forEach(([v, t]) => messagePosition.add(new Option(t, v)));
    addField(panel, "Meldungsposition", messagePosition);

    const bindings = [
      [iconFrame, "iconFrame", el => el.checked],
      [iconFrameColor, "iconFrameColor", el => el.value],
      [hoverHighlight, "hoverHighlight", el => el.checked],
      [shapeType, "shapeType", el => el.value],
      [shapeStyle, "shapeStyle", el => el.value],
      [modalTitle, "modalTitle", el => el.value],
      [modalBody, "modalBody", el => el.value],
      [modalFooter, "modalFooter", el => el.value],
      [messagePosition, "messagePosition", el => el.value]
    ];
    bindings.forEach(([el, field, readValue]) => {
      const eventName = el.type === "checkbox" ? "change" : (el.tagName === "INPUT" || el.tagName === "TEXTAREA") ? "input" : "change";
      el.addEventListener(eventName, () => {
        const item = window.WebBuilderInspector?.getSelected?.();
        if (item) window.WebBuilderInspector.update(item.id, { [field]: readValue(el) }, true);
        window.WebBuilderInspector?.renderAll?.();
      });
    });

    return panel;
  }

  function renderSpecial() {
    let panel = byId("inspector-special-runtime");
    const form = byId("inspector-form");
    if (!panel && form) panel = buildPanel(form);

    const item = window.WebBuilderInspector?.getSelected?.();
    if (!item) {
      panel?.classList.add("hidden");
      return;
    }
    panel?.classList.remove("hidden");

    const isIcon = item.type === "icon";
    const isShape = item.type === "shape";
    const isModal = item.actionType === "open-custom-modal";
    const isAlert = item.actionType === "alert-msg";

    FIELD_GROUPS.forEach(id => {
      const el = byId(id);
      if (!el) return;
      const group = el.closest(".form-group");
      if (id === "special-hover-highlight") group.classList.toggle("hidden", !isIcon);
      else if (id.startsWith("special-icon")) group.classList.toggle("hidden", id === "special-icon-frame" ? !isIcon : !isIcon || !item.iconFrame);
      else if (id.startsWith("special-shape")) group.classList.toggle("hidden", !isShape);
      else if (id.startsWith("special-modal")) group.classList.toggle("hidden", !isModal);
      else group.classList.toggle("hidden", !isAlert);
    });

    if (byId("special-icon-frame")) byId("special-icon-frame").checked = !!item.iconFrame;
    if (byId("special-icon-frame-color")) byId("special-icon-frame-color").value = item.iconFrameColor || "#111827";
    if (byId("special-hover-highlight")) byId("special-hover-highlight").checked = item.hoverHighlight !== false;
    if (byId("special-shape-type")) byId("special-shape-type").value = item.shapeType || "rectangle";
    if (byId("special-shape-style")) byId("special-shape-style").value = item.shapeStyle || "solid";
    if (byId("special-modal-title")) byId("special-modal-title").value = item.modalTitle || "";
    if (byId("special-modal-body")) byId("special-modal-body").value = item.modalBody || "";
    if (byId("special-modal-footer")) byId("special-modal-footer").value = item.modalFooter || "";
    if (byId("special-message-position")) byId("special-message-position").value = item.messagePosition || "bottom-right";
  }

  window.WebBuilderInspector = Object.assign(window.WebBuilderInspector || {}, { renderSpecial });
})();
