// js/editor/sections-inspector.js
// Right-hand panel for the Phase 2 flow-layout selection (Section/Row/
// Card) — #section-inspector-form, parallel to #bar-inspector-form /
// #cart-inspector-form. Read-only display + field bindings live together
// in this one file (unlike editor/inspector.js's split), since the
// field set here is small. Selection state and the canvas rendering live
// in canvas/sections-render.js, reached only through
// window.WebBuilderSectionsRuntime at runtime — no load-order
// requirement between the two.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderSectionsInspector: WebBuilderState is not available."); return; }
  const sectionsApi = window.WebBuilderSections;
  if (!sectionsApi) { console.error("WebBuilderSectionsInspector: WebBuilderSections is not available."); return; }
  const byId = id => document.getElementById(id);

  function getSelectionData() {
    const ref = state.selectedSectionRef;
    if (!ref) return null;
    const section = sectionsApi.getById(ref.sectionId);
    if (!section) return null;
    if (ref.type === "section") return { ref, section };
    const row = sectionsApi.findRow(ref.sectionId, ref.rowId);
    if (!row) return null;
    if (ref.type === "row") return { ref, section, row };
    const card = sectionsApi.findCard(ref.sectionId, ref.rowId, ref.cardId);
    if (!card) return null;
    return { ref, section, row, card };
  }

  const GROUP_IDS = [
    "section-group-bgcolor", "section-group-minheight",
    "section-group-columns", "section-group-align", "section-group-gap",
    "section-group-text"
  ];

  // Keeps #no-selection correct without editor/inspector.js or
  // layout/header-footer-inspector.js needing to know this panel exists:
  // it hides that shared message whenever this panel takes over, and
  // only restores it (on its own way out) if none of the other three
  // panels are currently showing either.
  function syncEmptyMessage(showingThisPanel) {
    const emptyMsg = byId("no-selection");
    if (!emptyMsg) return;
    if (showingThisPanel) { emptyMsg.classList.add("hidden"); return; }
    const otherVisible = ["inspector-form", "bar-inspector-form", "cart-inspector-form"]
      .some(id => { const el = byId(id); return el && !el.classList.contains("hidden"); });
    emptyMsg.classList.toggle("hidden", otherVisible || !!state.cartFocusMode);
  }

  function render() {
    const panel = byId("section-inspector-form");
    if (!panel) return;
    const data = getSelectionData();
    panel.classList.toggle("hidden", !data);
    syncEmptyMessage(!!data);
    if (!data) return;

    GROUP_IDS.forEach(id => byId(id)?.classList.add("hidden"));
    const label = byId("section-part-label");

    if (data.ref.type === "section") {
      if (label) label.textContent = "Section";
      byId("section-group-bgcolor")?.classList.remove("hidden");
      byId("section-group-minheight")?.classList.remove("hidden");
      const bgInput = byId("section-prop-bgcolor");
      if (bgInput) bgInput.value = data.section.background?.color || "#ffffff";
      const mh = byId("section-prop-minheight");
      if (mh && document.activeElement !== mh) mh.value = data.section.minHeight;
    } else if (data.ref.type === "row") {
      if (label) label.textContent = "Zeile";
      byId("section-group-columns")?.classList.remove("hidden");
      byId("section-group-align")?.classList.remove("hidden");
      byId("section-group-gap")?.classList.remove("hidden");
      const cols = byId("section-prop-columns");
      if (cols && document.activeElement !== cols) cols.value = data.row.columns;
      const align = byId("section-prop-align");
      if (align) align.value = data.row.align;
      const gap = byId("section-prop-gap");
      if (gap && document.activeElement !== gap) gap.value = data.row.gap;
    } else if (data.ref.type === "card") {
      if (label) label.textContent = "Karte";
      byId("section-group-text")?.classList.remove("hidden");
      const text = byId("section-prop-text");
      if (text && document.activeElement !== text) text.value = data.card.text || "";
    }
  }

  function bind() {
    byId("section-prop-bgcolor")?.addEventListener("input", e => {
      const data = getSelectionData();
      if (data?.ref.type === "section") {
        sectionsApi.updateSection(data.section.id, { background: Object.assign({}, data.section.background, { color: e.target.value }) });
      }
    }, true);
    byId("section-prop-minheight")?.addEventListener("change", e => {
      const data = getSelectionData();
      if (data?.ref.type === "section") sectionsApi.updateSection(data.section.id, { minHeight: Math.max(80, Number(e.target.value) || 200) });
    }, true);
    byId("section-prop-columns")?.addEventListener("change", e => {
      const data = getSelectionData();
      if (data?.ref.type === "row") sectionsApi.updateRow(data.section.id, data.row.id, { columns: Math.max(1, Math.min(6, Number(e.target.value) || 1)) });
    }, true);
    byId("section-prop-align")?.addEventListener("change", e => {
      const data = getSelectionData();
      if (data?.ref.type === "row") sectionsApi.updateRow(data.section.id, data.row.id, { align: e.target.value });
    }, true);
    byId("section-prop-gap")?.addEventListener("change", e => {
      const data = getSelectionData();
      if (data?.ref.type === "row") sectionsApi.updateRow(data.section.id, data.row.id, { gap: Math.max(0, Number(e.target.value) || 0) });
    }, true);
    byId("section-prop-text")?.addEventListener("change", e => {
      const data = getSelectionData();
      if (data?.ref.type === "card") sectionsApi.updateCard(data.section.id, data.row.id, data.card.id, { text: e.target.value });
    }, true);

    byId("btn-delete-section-part")?.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      const data = getSelectionData();
      if (!data) return;
      if (data.ref.type === "section" && confirm("Diese Section wirklich löschen?")) sectionsApi.removeSection(data.section.id);
      else if (data.ref.type === "row" && confirm("Diese Zeile wirklich löschen?")) sectionsApi.removeRow(data.section.id, data.row.id);
      else if (data.ref.type === "card" && confirm("Diese Karte wirklich löschen?")) sectionsApi.removeCard(data.section.id, data.row.id, data.card.id);
      else return;
      window.WebBuilderSectionsRuntime?.clearSelection?.();
    }, true);

    state.subscribe?.(event => { if (event?.domain === "sections") render(); });
    render();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));

  window.WebBuilderSectionsInspector = { render };
})();
