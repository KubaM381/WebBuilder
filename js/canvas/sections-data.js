// js/canvas/sections-data.js
// WebBuilder Phase 2 — Flow-Layout-Datenschicht: Section -> Row -> Card
// (state.sections), vollstaendig unabhaengig vom Freiform-Canvas
// (state.elements, canvas/elements.js). Reines Daten-CRUD nach demselben
// Muster wie canvas/elements.js/layout/header-footer-data.js — kein DOM-
// Zugriff, kein Renderer. Der Renderer (eigener Flow-Container innerhalb
// von #canvas, reagiert nur auf state.subscribe("sections")) ist der
// naechste Schritt und bewusst noch nicht Teil dieser Datei.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderSections: WebBuilderState is not available."); return; }
  const clone = value => JSON.parse(JSON.stringify(value));
  function createId(prefix) { return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; }
  function notify(action, payload) { state.notify?.("sections", action, payload); }

  const ROW_ALIGNMENTS = ["start", "center", "space-between"];

  // elements: [] ist bewusst leer angelegt und reserviert — sobald der
  // Renderer ansteht, entscheidet sich, ob Cards das bestehende
  // canvas/elements.js-Schema wiederverwenden (kein Parallelmodell) oder
  // eine eigene, einfachere Flow-Repraesentation bekommen.
  function normalizeCard(card = {}) {
    return {
      id: card.id || createId("card"),
      text: card.text || "Neue Karte",
      elements: Array.isArray(card.elements) ? card.elements : []
    };
  }

  function normalizeRow(row = {}) {
    return {
      id: row.id || createId("row"),
      columns: Math.max(1, Math.min(6, Number(row.columns) || 1)),
      align: ROW_ALIGNMENTS.includes(row.align) ? row.align : "start",
      gap: Number.isFinite(Number(row.gap)) ? Number(row.gap) : 16,
      cards: Array.isArray(row.cards) ? row.cards.map(normalizeCard) : []
    };
  }

  // background nutzt dieselbe Form wie state.background (solid/gradient/
  // image), damit spaeter derselbe Editor/dieselbe CSS-Erzeugung
  // wiederverwendet werden kann statt eine zweite zu bauen.
  function normalizeSection(section = {}) {
    return {
      id: section.id || createId("section"),
      background: Object.assign(
        { type: "solid", color: "#ffffff", grad1: "#4f46e5", grad2: "#06b6d4", gradDir: "to right", imageUrl: "" },
        section.background || {}
      ),
      minHeight: Math.max(80, Number(section.minHeight) || 200),
      rows: Array.isArray(section.rows) ? section.rows.map(normalizeRow) : []
    };
  }

  function normalizeState() {
    state.sections = (Array.isArray(state.sections) ? state.sections : []).map(normalizeSection);
    return state.sections;
  }

  function getAll() { return state.sections; }
  function getById(id) { return state.sections.find(s => s?.id === id) || null; }
  function findRow(sectionId, rowId) { return getById(sectionId)?.rows.find(r => r?.id === rowId) || null; }
  function findCard(sectionId, rowId, cardId) { return findRow(sectionId, rowId)?.cards.find(c => c?.id === cardId) || null; }

  // Neue Section startet mit einer Row/Card, damit sie nach dem Anlegen
  // sofort etwas Sichtbares hat statt einer leeren Flaeche.
  function addSection(patch = {}, recordHistory = true) {
    if (recordHistory) window.WebBuilderHistory?.arm();
    const section = normalizeSection(Object.assign({ rows: [normalizeRow({ cards: [normalizeCard()] })] }, patch));
    state.sections.push(section);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("add", section);
    return section;
  }

  function removeSection(id, recordHistory = true) {
    const i = state.sections.findIndex(s => s?.id === id);
    if (i < 0) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    const removed = state.sections.splice(i, 1)[0];
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("remove", removed);
    return true;
  }

  function updateSection(id, patch = {}, recordHistory = true) {
    const section = getById(id);
    if (!section) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    Object.assign(section, clone(patch));
    Object.assign(section, normalizeSection(section));
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("update", section);
    return section;
  }

  function moveSection(id, delta, recordHistory = true) {
    const i = state.sections.findIndex(s => s?.id === id);
    if (i < 0) return false;
    const j = i + delta;
    if (j < 0 || j >= state.sections.length) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    const [item] = state.sections.splice(i, 1);
    state.sections.splice(j, 0, item);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("reorder", state.sections);
    return true;
  }

  function addRow(sectionId, patch = {}, recordHistory = true) {
    const section = getById(sectionId);
    if (!section) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    const row = normalizeRow(Object.assign({ cards: [normalizeCard()] }, patch));
    section.rows.push(row);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("add-row", { sectionId, row });
    return row;
  }

  function removeRow(sectionId, rowId, recordHistory = true) {
    const section = getById(sectionId);
    if (!section) return false;
    const i = section.rows.findIndex(r => r?.id === rowId);
    if (i < 0) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    section.rows.splice(i, 1);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("remove-row", { sectionId, rowId });
    return true;
  }

  function updateRow(sectionId, rowId, patch = {}, recordHistory = true) {
    const row = findRow(sectionId, rowId);
    if (!row) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    Object.assign(row, clone(patch));
    Object.assign(row, normalizeRow(row));
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("update-row", { sectionId, row });
    return row;
  }

  function addCard(sectionId, rowId, patch = {}, recordHistory = true) {
    const row = findRow(sectionId, rowId);
    if (!row) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    const card = normalizeCard(patch);
    row.cards.push(card);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("add-card", { sectionId, rowId, card });
    return card;
  }

  function removeCard(sectionId, rowId, cardId, recordHistory = true) {
    const row = findRow(sectionId, rowId);
    if (!row) return false;
    const i = row.cards.findIndex(c => c?.id === cardId);
    if (i < 0) return false;
    if (recordHistory) window.WebBuilderHistory?.arm();
    row.cards.splice(i, 1);
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("remove-card", { sectionId, rowId, cardId });
    return true;
  }

  function updateCard(sectionId, rowId, cardId, patch = {}, recordHistory = true) {
    const card = findCard(sectionId, rowId, cardId);
    if (!card) return null;
    if (recordHistory) window.WebBuilderHistory?.arm();
    Object.assign(card, clone(patch));
    Object.assign(card, normalizeCard(card));
    if (recordHistory) window.WebBuilderHistory?.commit();
    notify("update-card", { sectionId, rowId, card });
    return card;
  }

  normalizeState();

  window.WebBuilderSections = {
    normalizeState, normalizeSection, normalizeRow, normalizeCard,
    getAll, getById, findRow, findCard,
    addSection, removeSection, updateSection, moveSection,
    addRow, removeRow, updateRow,
    addCard, removeCard, updateCard,
    ROW_ALIGNMENTS
  };
})();
