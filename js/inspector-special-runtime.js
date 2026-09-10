// WebBuilder Inspector special-properties runtime
// Owns element-specific controls that are not part of the core text/image inspector.
(() => {
  const state = window.WebBuilderState;
  const inspector = window.WebBuilderInspector;
  const elements = window.WebBuilderElements;
  if (!state || !inspector || !elements) {
    console.error("WebBuilderInspectorSpecialRuntime: required services missing.");
    return;
  }

  const rootId = "inspector-special-runtime";

  function byId(id) { return document.getElementById(id); }
  function selected() { return inspector.getSelected(); }
  function refresh() {
    const canvas = window.WebBuilderCanvasRuntime || window.WebBuilderCanvas;
    if (canvas?.render) canvas.render();
  }
  function update(field, value) {
    const item = selected();
    if (!item) return;
    inspector.update(item.id, { [field]: value }, true);
  }
  function addControl(parent, label, input) {
    const group = document.createElement("div");
    group.className = "form-group";
    const labelEl = document.createElement("label");
    labelEl.textContent = label;
    group.append(labelEl, input);
    parent.appendChild(group);
    return input;
  }
  function makeSelect(options) {
    const select = document.createElement("select");
    options.forEach(([value, text]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = text;
      select.appendChild(option);
    });
    return select;
  }
  function ensurePanel() {
    let panel = byId(rootId);
    if (panel) return panel;
    const form = byId("inspector-form");
    if (!form) return null;
    panel = document.createElement("div");
    panel.id = rootId;
    panel.innerHTML = '<hr class="divider"><h4>⚙️ Erweiterte Eigenschaften</h4>';
    form.appendChild(panel);
    return panel;
  }
  function syncField(input, value) {
    if (!input) return;
    input.value = value ?? "";
  }
  function build() {
    const panel = ensurePanel();
    if (!panel || panel.dataset.bound === "1") return panel;
    panel.dataset.bound = "1";

    const iconFrame = document.createElement("input");
    iconFrame.type = "checkbox";
    iconFrame.id = "special-icon-frame";
    addControl(panel, "Icon-Rahmen anzeigen", iconFrame);
    const iconFrameColor = document.createElement("input");
    iconFrameColor.type = "color";
    iconFrameColor.id = "special-icon-frame-color";
    addControl(panel, "Rahmenfarbe", iconFrameColor);

    const shapeType = makeSelect([
      ["rectangle", "Rechteck"], ["circle", "Kreis"], ["triangle", "Dreieck"]
    ]);
    shapeType.id = "special-shape-type";
    addControl(panel, "Form", shapeType);
    const shapeStyle = makeSelect([
      ["solid", "Gefüllt"], ["outline", "Umrandung"]
    ]);
    shapeStyle.id = "special-shape-style";
    addControl(panel, "Form-Stil", shapeStyle);

    const modalTitle = document.createElement("input");
    modalTitle.type = "text";
    modalTitle.id = "special-modal-title";
    addControl(panel, "Modal-Titel", modalTitle);
    const modalBody = document.createElement("textarea");
    modalBody.id = "special-modal-body";
    modalBody.rows = 3;
    addControl(panel, "Modal-Inhalt", modalBody);
    const modalFooter = document.createElement("input");
    modalFooter.type = "text";
    modalFooter.id = "special-modal-footer";
    addControl(panel, "Modal-Fußbereich", modalFooter);
    const messagePosition = makeSelect([
      ["bottom-right", "Unten rechts"], ["bottom-left", "Unten links"],
      ["top-right", "Oben rechts"], ["top-left", "Oben links"], ["center", "Zentriert"]
    ]);
    messagePosition.id = "special-message-position";
    addControl(panel, "Meldungsposition", messagePosition);

    const bindings = [
      [iconFrame, "iconFrame", "change", value => value.checked],
      [iconFrameColor, "iconFrameColor", "input", value => value.value],
      [shapeType, "shapeType", "change", value => value.value],
      [shapeStyle, "shapeStyle", "change", value => value.value],
      [modalTitle, "modalTitle", "input", value => value.value],
      [modalBody, "modalBody", "input", value => value.value],
      [modalFooter, "modalFooter", "input", value => value.value],
      [messagePosition, "messagePosition", "change", value => value.value]
    ];
    bindings.forEach(([input, field, event, read]) => {
      input.addEventListener(event, () => update(field, read(input)));
    });
    return panel;
  }
  function render() {
    const panel = build();
    if (!panel) return;
    const item = selected();
    const form = byId("inspector-form");
    if (!item) {
      panel.classList.add("hidden");
      return;
    }
    panel.classList.remove("hidden");
    const icon = item.type === "icon";
    const shape = item.type === "shape";
    const action = item.actionType || item.action || "none";
    const iconFrame = byId("special-icon-frame");
    const iconColor = byId("special-icon-frame-color");
    const shapeType = byId("special-shape-type");
    const shapeStyle = byId("special-shape-style");
    const modalTitle = byId("special-modal-title");
    const modalBody = byId("special-modal-body");
    const modalFooter = byId("special-modal-footer");
    const messagePosition = byId("special-message-position");
    iconFrame.closest(".form-group").classList.toggle("hidden", !icon);
    iconColor.closest(".form-group").classList.toggle("hidden", !icon || !item.iconFrame);
    shapeType.closest(".form-group").classList.toggle("hidden", !shape);
    shapeStyle.closest(".form-group").classList.toggle("hidden", !shape);
    const modalVisible = action === "open-custom-modal";
    modalTitle.closest(".form-group").classList.toggle("hidden", !modalVisible);
    modalBody.closest(".form-group").classList.toggle("hidden", !modalVisible);
    modalFooter.closest(".form-group").classList.toggle("hidden", !modalVisible);
    const positionVisible = action === "alert-msg";
    messagePosition.closest(".form-group").classList.toggle("hidden", !positionVisible);
    iconFrame.checked = !!item.iconFrame;
    syncField(iconColor, item.iconFrameColor || "#111827");
    syncField(shapeType, item.shapeType || "rectangle");
    syncField(shapeStyle, item.shapeStyle || "solid");
    syncField(modalTitle, item.modalTitle || "");
    syncField(modalBody, item.modalBody || "");
    syncField(modalFooter, item.modalFooter || "");
    syncField(messagePosition, item.messagePosition || "bottom-right");
    if (form) form.classList.toggle("hidden", false);
  }
  function bind() {
    document.addEventListener("DOMContentLoaded", () => {
      build();
      render();
    }, { once: true });
    state.subscribe?.(change => {
      if (change?.domain === "elements" || change?.domain === "state") render();
    });
  }
  window.WebBuilderInspectorSpecialRuntime = { bind, build, render };
  bind();
})();
