// WebBuilder inspector properties runtime
// Owns the core visual/text property controls for selected canvas elements.
// The legacy editor remains loaded, but these controls are intercepted here.
(() => {
  const state = window.WebBuilderState;
  const inspector = window.WebBuilderInspector;
  if (!state || !inspector) {
    console.error("WebBuilderInspectorPropertiesRuntime: required services missing.");
    return;
  }

  let bound = false;
  const byId = id => document.getElementById(id);
  const selected = () => inspector.getSelected?.();

  function setHidden(id, hidden) {
    const el = byId(id);
    if (el) el.classList.toggle("hidden", hidden);
  }

  function render() {
    const form = byId("inspector-form");
    const empty = byId("no-selection");
    const item = selected();
    if (!form || !empty) return;

    const hasSelection = !!item;
    form.classList.toggle("hidden", !hasSelection);
    empty.classList.toggle("hidden", hasSelection);
    if (!item) return;

    const values = {
      "prop-id": item.id || "",
      "prop-text": item.text || "",
      "prop-size": Number(item.size) || 18,
      "prop-color": item.color || "#000000",
      "prop-font-family": item.fontFamily || "inherit",
      "prop-image-url": item.imageUrl || ""
    };

    Object.entries(values).forEach(([id, value]) => {
      const el = byId(id);
      if (el && document.activeElement !== el) el.value = value;
    });

    const isImage = item.type === "image";
    const isTextLike = ["text", "headline", "button"].includes(item.type);
    setHidden("group-image", !isImage);
    setHidden("group-text", isImage || item.type === "shape" || item.type === "icon");
    setHidden("group-color", !isTextLike);

    ["ttb-bold", "ttb-italic", "ttb-underline"].forEach(id => {
      const button = byId(id);
      if (button) button.classList.toggle("active", !!item[id.replace("ttb-", "")]);
    });

    ["left", "center", "right"].forEach(align => {
      const button = byId(`ttb-align-${align}`);
      if (button) button.classList.toggle("active", (item.align || "left") === align);
    });
  }

  function update(field, value) {
    const item = selected();
    if (!item) return;
    inspector.updateField(item.id, field, value, true);
    render();
  }

  function numericValue(event) {
    const value = Number(event.target.value);
    return Number.isFinite(value) ? Math.max(12, Math.min(800, value)) : 18;
  }

  function handleField(event, field) {
    event.preventDefault();
    event.stopImmediatePropagation();
    update(field, field === "size" ? numericValue(event) : event.target.value);
  }

  function handleToggle(event, field) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const item = selected();
    if (!item) return;
    update(field, !item[field]);
  }

  function handleAlign(event, align) {
    event.preventDefault();
    event.stopImmediatePropagation();
    update("align", align);
  }

  function handleDelete(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const item = selected();
    if (item) inspector.remove(item.id, true);
    render();
  }

  function bind() {
    if (bound) return;
    if (!byId("inspector-form")) return;
    bound = true;

    byId("prop-text")?.addEventListener("change", event => handleField(event, "text"), true);
    byId("prop-size")?.addEventListener("change", event => handleField(event, "size"), true);
    byId("prop-color")?.addEventListener("change", event => handleField(event, "color"), true);
    byId("prop-font-family")?.addEventListener("change", event => handleField(event, "fontFamily"), true);
    byId("prop-image-url")?.addEventListener("change", event => handleField(event, "imageUrl"), true);

    byId("ttb-bold")?.addEventListener("click", event => handleToggle(event, "bold"), true);
    byId("ttb-italic")?.addEventListener("click", event => handleToggle(event, "italic"), true);
    byId("ttb-underline")?.addEventListener("click", event => handleToggle(event, "underline"), true);
    byId("ttb-align-left")?.addEventListener("click", event => handleAlign(event, "left"), true);
    byId("ttb-align-center")?.addEventListener("click", event => handleAlign(event, "center"), true);
    byId("ttb-align-right")?.addEventListener("click", event => handleAlign(event, "right"), true);
    byId("btn-delete-element")?.addEventListener("click", handleDelete, true);

    state.subscribe?.(event => {
      if (["elements", "selection"].includes(event?.domain)) render();
    });
    window.addEventListener("webbuilder:state-change", event => {
      if (["elements", "selection"].includes(event.detail?.domain)) render();
    });

    render();
  }

  document.addEventListener("DOMContentLoaded", () => window.setTimeout(bind, 0));
  window.WebBuilderInspectorPropertiesRuntime = { bind, render };
})();
