// js/canvas/drop-indicator.js
// Animierter Drop-Ziel-Indikator (Phase 1 "Drag & Drop 2.0"). Rein
// additiv zu den bestehenden Ausrichtungslinien in canvas/alignment.js —
// jeder Aufrufer nutzt optional-chaining, ohne dieses Skript funktioniert
// Dragging exakt wie vorher (nur Linien, keine Box, kein Bounce).
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderDropIndicator: WebBuilderState is not available."); return; }

  const prefersReducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // Ease-out-Folgefaktor pro Frame beim aktiven Ziehen (kein Überschwingen
  // hier — das würde sich gegen die Handbewegung sträuben). Das einmalige
  // Überschwingen beim Loslassen sitzt in applyBounce().
  const FOLLOW_LERP = 0.35;
  const SETTLE_EPSILON = 0.5;

  let box = null;
  let layerEl = null;
  let raf = null;
  let current = null;
  let targetState = null;
  let appliedSize = null;

  function ensureBox(containerEl) {
    if (box && layerEl === containerEl) return box;
    removeBox();
    layerEl = containerEl;
    box = document.createElement("div");
    box.className = "drop-indicator-box";
    box.style.left = "0";
    box.style.top = "0";
    containerEl.appendChild(box);
    return box;
  }

  function removeBox() {
    box?.remove();
    box = null;
    layerEl = null;
  }

  function applyTransform() {
    if (!box || !current) return;
    box.style.transform = `translate(${current.x}px, ${current.y}px)`;
  }

  // Schreibt width/height nur bei Änderung — layoutrelevant, deshalb nie
  // pro Animationsframe.
  function applySizeIfChanged() {
    if (!box || !targetState) return;
    if (!appliedSize || appliedSize.w !== targetState.w || appliedSize.h !== targetState.h) {
      box.style.width = targetState.w + "px";
      box.style.height = targetState.h + "px";
      appliedSize = { w: targetState.w, h: targetState.h };
    }
  }

  function tick() {
    raf = null;
    if (!box || !targetState) return;
    if (!current) current = { x: targetState.x, y: targetState.y };
    const reduced = prefersReducedMotion();
    if (reduced) {
      current.x = targetState.x;
      current.y = targetState.y;
    } else {
      current.x += (targetState.x - current.x) * FOLLOW_LERP;
      current.y += (targetState.y - current.y) * FOLLOW_LERP;
    }
    applyTransform();
    const settled = reduced
      || (Math.abs(targetState.x - current.x) < SETTLE_EPSILON && Math.abs(targetState.y - current.y) < SETTLE_EPSILON);
    if (!settled) raf = requestAnimationFrame(tick);
  }

  function scheduleTick() {
    if (raf == null) raf = requestAnimationFrame(tick);
  }

  // Startet einen neuen Drag — aufgerufen von alignment.js's
  // attachInteraction() an derselben Stelle, an der auch die Guide-Linien
  // erzeugt werden, sowie von canvas.js beim Start eines Palette-Drags.
  function begin(containerEl) {
    if (!containerEl) return;
    ensureBox(containerEl);
    current = null;
    targetState = null;
    appliedSize = null;
    box.classList.remove(
      "drop-indicator-box--visible",
      "drop-indicator-box--container",
      "drop-indicator-box--sibling",
      "drop-indicator-box--free"
    );
  }

  // opts: { containerEl, x, y, width, height, xKind, yKind }. xKind/yKind
  // stammen aus snapPosition()'s Kind-Tagging ("container" | "sibling" |
  // null); canvas.js setzt für einen Palette-Drop fest "container".
  function update(opts = {}) {
    const { containerEl, x, y, width, height, xKind, yKind } = opts;
    if (!containerEl || x == null || y == null || width == null || height == null) return;
    ensureBox(containerEl);
    const kind = (xKind === "container" || yKind === "container") ? "container"
      : (xKind === "sibling" || yKind === "sibling") ? "sibling" : "free";
    box.classList.toggle("drop-indicator-box--container", kind === "container");
    box.classList.toggle("drop-indicator-box--sibling", kind === "sibling");
    box.classList.toggle("drop-indicator-box--free", kind === "free");
    box.classList.add("drop-indicator-box--visible");
    targetState = { x, y, w: width, h: height, kind };
    applySizeIfChanged();
    scheduleTick();
  }

  // Kurzer Spring-Bounce auf dem tatsächlich platzierten Element,
  // unabhängig von der Indikator-Box (auch für frisch aus der Palette
  // erzeugte Elemente nutzbar, für die es beim Drag noch kein DOM gab).
  function applyBounce(domEl) {
    if (!domEl || prefersReducedMotion()) return;
    domEl.classList.remove("drop-settle-bounce");
    void domEl.offsetWidth; // Reflow erzwingen, damit schnell aufeinanderfolgende Drags neu starten
    domEl.classList.add("drop-settle-bounce");
    domEl.addEventListener("animationend", () => domEl.classList.remove("drop-settle-bounce"), { once: true });
  }

  // Beendet den Drag: entfernt die Box, löst den Settle-Bounce auf domEl
  // aus (beim Palette-Drop noch kein DOM vorhanden — canvas.js bounct dort
  // separat nach dem Rendern).
  function end(domEl) {
    removeBox();
    current = null;
    targetState = null;
    appliedSize = null;
    if (raf != null) { cancelAnimationFrame(raf); raf = null; }
    applyBounce(domEl);
  }

  // Container-Hervorhebung — nur relevant beim Ziehen eines NEUEN
  // Elements aus der Palette. Ein bestehendes Element ist während des
  // gesamten Drags bereits "im" Container, ein Dauer-Tint wäre dort nur
  // Rauschen.
  function setContainerActive(containerEl, active) {
    containerEl?.classList.toggle("drop-container-active", !!active);
  }

  // FLIP-Hilfsfunktion für Phase 2 (Section/Row/Grid) — aktuell ungenutzt:
  // das heutige Freiform-Canvas hat keine Flow-Beziehung zwischen
  // Elementen (jedes trägt seine eigene x/y), es gibt also nichts, das
  // legitim "Platz machen" müsste. Wird unverändert übernommen, sobald
  // Phase 2 echte Row/Grid-Kinder einführt.
  function flipReflow(elements, mutate) {
    if (prefersReducedMotion()) { mutate(); return; }
    const before = new Map();
    elements.forEach(el => before.set(el, el.getBoundingClientRect()));
    mutate();
    elements.forEach(el => {
      const b = before.get(el);
      if (!b) return;
      const a = el.getBoundingClientRect();
      const dx = b.left - a.left, dy = b.top - a.top;
      if (!dx && !dy) return;
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)";
        el.style.transform = "";
        el.addEventListener("transitionend", () => { el.style.transition = ""; }, { once: true });
      });
    });
  }

  window.WebBuilderDropIndicator = { begin, update, end, applyBounce, setContainerActive, flipReflow };
})();
