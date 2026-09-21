// js/canvas/sections-render.js
// WebBuilder Phase 2 — Flow-Layout renderer.
//
// Renders state.sections (Section -> Row -> Card, see
// canvas/sections-data.js) as a persistent flow container
// (#canvas-sections-flow) INSIDE #canvas, fully separate from the
// freeform renderer in canvas/canvas.js (which only ever touches
// .placed-element nodes and never sees this container) and from
// layout/header-footer-render.js's renderBars() (which only ever touches
// .builder-bar nodes). The container hides itself entirely
// (display:none) whenever state.sections is empty, so a project that
// only uses the freeform canvas looks pixel-identical to before this
// file existed.
//
// Also owns selection state for this tree (state.selectedSectionRef, not
// persisted — same convention as selectedElementId/selectedBarItemRef)
// and keeps it mutually exclusive with the other three right-hand panels
// (#inspector-form / #bar-inspector-form / #cart-inspector-form):
// - Taking over FROM those panels is handled reactively via
//   state.subscribe() for element selection (elements.js already
//   notifies "elements"/"selection" on every selection change) — no
//   change to editor/inspector.js was needed for that direction.
// - Bar-item selection and entering the cart focus editor don't notify
//   through state.notify() at all, so layout/header-footer-render.js's
//   selectItem() and shop/cart-editor-stage.js's enterFocusMode() each
//   carry one added line calling clearSelection() below.
// - Selecting INTO a section/row/card here clears the other three the
//   same way those panels already clear each other elsewhere
//   (WebBuilderInspector.select(null), WebBuilderHeaderFooterRuntime.
//   clearSelection(), WebBuilderCartFocus.exit()).
//
// The right-hand panel itself (#section-inspector-form) lives in
// editor/sections-inspector.js, reached only through
// window.WebBuilderSectionsInspector at runtime — no load-order
// requirement between the two files.
//
// Not yet implemented (next step): drag-and-drop reordering of
// sections/rows/cards via canvas/drop-indicator.js's flipReflow().
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderSectionsRuntime: WebBuilderState is not available."); return; }
  const sectionsApi = window.WebBuilderSections;
  if (!sectionsApi) { console.error("WebBuilderSectionsRuntime: WebBuilderSections is not available."); return; }

  const esc = window.WebBuilderUtils.escapeHtml;
  const buildTextStyleCss = window.WebBuilderUtils.buildTextStyleCss;

  function ensureContainer() {
    const canvasEl = document.getElementById("canvas");
    if (!canvasEl) return null;
    let el = document.getElementById("canvas-sections-flow");
    if (!el) {
      el = document.createElement("div");
      el.id = "canvas-sections-flow";
      el.className = "canvas-sections-flow";
      el.style.display = "none";
      // Inserted right after #canvas-hint (always the first child of
      // #canvas, see web.html — never removed, only hidden via
      // classList). header-footer-render.js's renderBars() only ever
      // insertBefore(canvasEl.firstChild) for the header bar and
      // appendChild() for the footer bar, so this container sitting
      // anywhere in between never conflicts with either.
      const hint = document.getElementById("canvas-hint");
      if (hint) canvasEl.insertBefore(el, hint.nextSibling);
      else canvasEl.appendChild(el);
    }
    return el;
  }

  function isSelected(type, sectionId, rowId, cardId) {
    const sel = state.selectedSectionRef;
    if (!sel || sel.type !== type || sel.sectionId !== sectionId) return false;
    if (type !== "section" && sel.rowId !== rowId) return false;
    if (type === "card" && sel.cardId !== cardId) return false;
    return true;
  }

  function setSelection(ref) {
    state.selectedSectionRef = ref;
    // Mirrors the mutual-exclusion calls already used by
    // shop/cart-editor-stage.js's enterFocusMode() and
    // layout/header-footer-render.js's selectItem().
    window.WebBuilderInspector?.select?.(null);
    window.WebBuilderHeaderFooterRuntime?.clearSelection?.();
    if (window.WebBuilderCartFocus?.isActive?.()) window.WebBuilderCartFocus.exit();
    renderSectionsFlow();
    window.WebBuilderSectionsInspector?.render?.();
  }

  function selectSection(sectionId) { setSelection({ type: "section", sectionId }); }
  function selectRow(sectionId, rowId) { setSelection({ type: "row", sectionId, rowId }); }
  function selectCard(sectionId, rowId, cardId) { setSelection({ type: "card", sectionId, rowId, cardId }); }

  // Called externally (by header-footer-render.js / cart-editor-stage.js)
  // when one of the other three panels takes over, internally when a
  // selected section/row/card gets deleted, and reactively when a normal
  // canvas element gets selected (see the "elements" subscription in
  // bind() below). Never cascades back into those other panels — it only
  // clears this module's own state.
  function clearSelection() {
    if (!state.selectedSectionRef) return;
    state.selectedSectionRef = null;
    renderSectionsFlow();
    window.WebBuilderSectionsInspector?.render?.();
  }

  // Card.elements is reserved for future rich per-card content: it
  // deliberately reuses the same "type" vocabulary and per-type styling
  // fields as canvas/elements.js (text/headline/button/image/icon) so the
  // same render helpers apply to both, but drops x/y — a card lays its
  // children out in normal flow, not free positioning. There is no
  // editor UI yet to add elements to a card, so in practice this only
  // matters once that editor exists; until then a card with no elements
  // simply shows its own `text` field instead (see sections-data.js
  // normalizeCard()).
  function renderCardElementHtml(item) {
    const iconMap = window.WebBuilderIconRegistry?.getMergedMap?.() || {};
    const align = item.align || "left";
    if (item.type === "icon" && iconMap[item.iconName]) {
      return `<span class="wb-card-el wb-card-el-icon" style="color:${item.color || "#1f2937"}; width:${Number(item.size) || 32}px; height:${Number(item.size) || 32}px;">${iconMap[item.iconName]}</span>`;
    }
    if (item.type === "button") {
      return `<button type="button" class="btn btn-primary wb-card-el" style="font-size:${Number(item.size) || 16}px; background-color:${item.color || "#4f46e5"}; ${buildTextStyleCss(item, "600")}">${esc(item.text || "")}</button>`;
    }
    if (item.type === "headline") {
      return `<h4 class="wb-card-el" style="font-size:${Number(item.size) || 22}px; color:${item.color || "#111827"}; ${buildTextStyleCss(item, "400")} text-align:${align};">${esc(item.text || "")}</h4>`;
    }
    if (item.type === "image") {
      return item.imageUrl ? `<img class="wb-card-el wb-card-el-image" src="${esc(item.imageUrl)}" style="width:${Number(item.size) || 200}px;" alt="" />` : "";
    }
    return `<p class="wb-card-el" style="font-size:${Number(item.size) || 16}px; color:${item.color || "#1f2937"}; ${buildTextStyleCss(item)} text-align:${align};">${esc(item.text || "")}</p>`;
  }

  function renderCardHtml(section, row, card) {
    const selected = isSelected("card", section.id, row.id, card.id);
    const items = Array.isArray(card.elements) ? card.elements : [];
    const bodyHtml = items.length
      ? items.map(renderCardElementHtml).join("")
      : `<p class="wb-card-text">${esc(card.text || "")}</p>`;
    return `
      <div class="wb-card${selected ? " wb-card-selected" : ""}" data-section-id="${esc(section.id)}" data-row-id="${esc(row.id)}" data-card-id="${esc(card.id)}">
        <div class="wb-card-controls">
          <button type="button" class="btn btn-secondary btn-sm wb-card-delete" title="Karte löschen">✕</button>
        </div>
        ${bodyHtml}
      </div>`;
  }

  function renderRowHtml(section, row) {
    const selected = isSelected("row", section.id, row.id);
    const justify = row.align === "center" ? "center" : row.align === "space-between" ? "space-between" : "start";
    const cardsHtml = row.cards.map(card => renderCardHtml(section, row, card)).join("");
    return `
      <div class="wb-row${selected ? " wb-row-selected" : ""}" data-section-id="${esc(section.id)}" data-row-id="${esc(row.id)}">
        <div class="wb-row-controls">
          <button type="button" class="btn btn-secondary btn-sm wb-row-add-card">+ Karte</button>
          <button type="button" class="btn btn-secondary btn-sm wb-row-delete">Zeile löschen</button>
        </div>
        <div class="wb-row-cards" style="display:grid; grid-template-columns:repeat(${Math.max(1, Number(row.columns) || 1)}, 1fr); justify-content:${justify}; gap:${Number(row.gap) || 0}px;">
          ${cardsHtml}
        </div>
      </div>`;
  }

  function renderSectionHtml(section) {
    const selected = isSelected("section", section.id);
    const bgCss = window.WebBuilderCanvas?.computeBackgroundCss?.(section.background) || `background:${section.background?.color || "#ffffff"};`;
    const rowsHtml = section.rows.map(row => renderRowHtml(section, row)).join("");
    return `
      <div class="wb-section${selected ? " wb-section-selected" : ""}" data-section-id="${esc(section.id)}" style="min-height:${Number(section.minHeight) || 200}px; ${bgCss}">
        <div class="wb-section-controls">
          <button type="button" class="btn btn-secondary btn-sm wb-section-add-row">+ Zeile</button>
          <button type="button" class="btn btn-secondary btn-sm wb-section-move-up" title="Nach oben">↑</button>
          <button type="button" class="btn btn-secondary btn-sm wb-section-move-down" title="Nach unten">↓</button>
          <button type="button" class="btn btn-secondary btn-sm wb-section-delete">Section löschen</button>
        </div>
        <div class="wb-section-rows">${rowsHtml}</div>
      </div>`;
  }

  function renderSectionsFlow() {
    const container = ensureContainer();
    if (!container) return;
    const sections = sectionsApi.getAll();
    // Zero footprint when empty — a purely freeform project's canvas
    // must look exactly like before this module existed.
    container.style.display = sections.length ? "" : "none";
    container.innerHTML = sections.length ? sections.map(renderSectionHtml).join("") : "";
  }

  function bindInteractions(container) {
    if (!container || container.dataset.webBuilderSectionsBound === "true") return;
    container.dataset.webBuilderSectionsBound = "true";

    container.addEventListener("click", e => {
      if (state.isPreviewMode) return;

      const addRow = e.target.closest(".wb-section-add-row");
      if (addRow) {
        e.preventDefault(); e.stopPropagation();
        const sectionEl = addRow.closest(".wb-section");
        if (sectionEl) sectionsApi.addRow(sectionEl.dataset.sectionId);
        return;
      }
      const addCard = e.target.closest(".wb-row-add-card");
      if (addCard) {
        e.preventDefault(); e.stopPropagation();
        const rowEl = addCard.closest(".wb-row");
        if (rowEl) sectionsApi.addCard(rowEl.dataset.sectionId, rowEl.dataset.rowId);
        return;
      }
      const delSection = e.target.closest(".wb-section-delete");
      if (delSection) {
        e.preventDefault(); e.stopPropagation();
        const sectionEl = delSection.closest(".wb-section");
        const id = sectionEl?.dataset.sectionId;
        if (id && confirm("Diese Section wirklich löschen?")) {
          sectionsApi.removeSection(id);
          if (state.selectedSectionRef?.sectionId === id) clearSelection();
        }
        return;
      }
      const delRow = e.target.closest(".wb-row-delete");
      if (delRow) {
        e.preventDefault(); e.stopPropagation();
        const rowEl = delRow.closest(".wb-row");
        const sectionId = rowEl?.dataset.sectionId, rowId = rowEl?.dataset.rowId;
        if (sectionId && rowId && confirm("Diese Zeile wirklich löschen?")) {
          sectionsApi.removeRow(sectionId, rowId);
          if (state.selectedSectionRef?.rowId === rowId) clearSelection();
        }
        return;
      }
      const delCard = e.target.closest(".wb-card-delete");
      if (delCard) {
        e.preventDefault(); e.stopPropagation();
        const cardEl = delCard.closest(".wb-card");
        const sectionId = cardEl?.dataset.sectionId, rowId = cardEl?.dataset.rowId, cardId = cardEl?.dataset.cardId;
        if (sectionId && rowId && cardId && confirm("Diese Karte wirklich löschen?")) {
          sectionsApi.removeCard(sectionId, rowId, cardId);
          if (state.selectedSectionRef?.cardId === cardId) clearSelection();
        }
        return;
      }
      const moveUp = e.target.closest(".wb-section-move-up");
      if (moveUp) {
        e.preventDefault(); e.stopPropagation();
        const sectionEl = moveUp.closest(".wb-section");
        if (sectionEl) sectionsApi.moveSection(sectionEl.dataset.sectionId, -1);
        return;
      }
      const moveDown = e.target.closest(".wb-section-move-down");
      if (moveDown) {
        e.preventDefault(); e.stopPropagation();
        const sectionEl = moveDown.closest(".wb-section");
        if (sectionEl) sectionsApi.moveSection(sectionEl.dataset.sectionId, 1);
        return;
      }

      // Selection — most specific (card) first, same priority order as
      // shop/cart-editor-drag.js's part-before-component check.
      const cardEl = e.target.closest(".wb-card");
      if (cardEl) {
        e.preventDefault(); e.stopPropagation();
        selectCard(cardEl.dataset.sectionId, cardEl.dataset.rowId, cardEl.dataset.cardId);
        return;
      }
      const rowEl = e.target.closest(".wb-row");
      if (rowEl) {
        e.preventDefault(); e.stopPropagation();
        selectRow(rowEl.dataset.sectionId, rowEl.dataset.rowId);
        return;
      }
      const sectionEl = e.target.closest(".wb-section");
      if (sectionEl) {
        e.preventDefault(); e.stopPropagation();
        selectSection(sectionEl.dataset.sectionId);
      }
    });
  }

  function bindAddSectionButton() {
    const btn = document.getElementById("btn-add-section");
    if (!btn || btn.dataset.webBuilderSectionsBound === "true") return;
    btn.dataset.webBuilderSectionsBound = "true";
    btn.addEventListener("click", e => {
      e.preventDefault(); e.stopImmediatePropagation();
      const created = sectionsApi.addSection();
      if (created) selectSection(created.id);
    }, true);
  }

  function bind() {
    bindInteractions(ensureContainer());
    bindAddSectionButton();

    state.subscribe?.(event => {
      if (event?.domain === "sections") { renderSectionsFlow(); return; }
      // Reacts to element selection (canvas.js/editor/inspector.js) so
      // clicking a normal canvas element closes this panel, without
      // editor/inspector.js needing to know this module exists.
      if (event?.domain === "elements" && event?.action === "selection" && state.selectedElementId != null && state.selectedSectionRef) {
        clearSelection();
      }
    });

    renderSectionsFlow();
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(bind, 0));

  window.WebBuilderSectionsRuntime = {
    render: renderSectionsFlow,
    clearSelection,
    getSelection: () => state.selectedSectionRef
  };
})();
