// js/canvas/drop-indicator.js
// WebBuilder Phase 1 "Drag & Drop 2.0" — animierter Drop-Ziel-Indikator.
//
// Ergänzt (ersetzt NICHT) die bestehenden Ausrichtungslinien aus
// canvas/alignment.js um:
//   - eine animierte, halbtransparente "Drop-Box" statt reiner Linien,
//   - eine Container-Hervorhebung beim Ziehen eines NEUEN Elements aus
//     der Palette,
//   - einen kurzen Spring-Bounce beim Loslassen.
//
// Rein additiv: jeder Aufrufer aus alignment.js/canvas.js nutzt
// optional-chaining (`window.WebBuilderDropIndicator?.foo?.()`) — ohne
// dieses Skript funktioniert Drag & Drop exakt wie vorher (nur ohne die
// Box/den Bounce).
//
// Performance: pro Animationsframe wird ausschließlich `transform`
// (translate) geschrieben, nie `left`/`top`/`width`/`height` — die
// Box-Größe steht während eines einzelnen Drags fest (das gezogene
// Element ändert seine eigene Größe während des Ziehens nicht) und wird
// deshalb nur einmalig gesetzt, nicht pro Frame.
(() => {
  const state = window.WebBuilderState;
  if (!state) { console.error("WebBuilderDropIndicator: WebBuilderState is not available."); return; }

  const prefersReducedMotion = () => !!window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

  // Ease-out-Folgefaktor pro Frame beim Hinterherlaufen der Box zur
  // jeweils aktuellen Snap-Position (kein physikalisches Feder-Modell mit
  // Überschwingen — das würde sich beim aktiven Ziehen gegen die eigene
  // Handbewegung des Nutzers "sträuben"). Das eigentliche Überschwingen
  // gibt es nur einmalig beim Loslassen, siehe applyBounce().
  const FOLLOW_LERP = 0.35;
  const SETTLE_EPSILON = 0.5;

  let box = null;         // das schwebende Indikator-Element
  let layerEl = null;     // Container, in den es aktuell eingehängt ist
  let raf = null;
  let current = null;     // { x, y } — animierter (gelerpter) Versatz
  let targetState = null; // { x, y, w, h, kind }
  let appliedSize = null; // zuletzt geschriebene { w, h }, um unnötige Style-Writes zu vermeiden

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

  // Startet einen neuen Drag. Wird von alignment.js's attachInteraction()
  // beim Umschalten in den Drag-Zustand aufgerufen (genau dort, wo auch
  // createGuideLayer() aufgerufen wird), sowie von canvas.js beim Start
  // eines Palette-Drags auf das leere Canvas.
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

  // opts: { containerEl, x, y, width, height, xKind, yKind }
  // xKind/yKind kommen direkt aus snapPosition()'s neuen Feldern
  // ("container" | "sibling" | null) bzw. werden von canvas.js für den
  // Palette-Drop-Fall fest auf "container" gesetzt.
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

  // Kurzer Spring-Bounce (Überschwingen) auf dem tatsächlichen,
  // platzierten Element — unabhängig vom Indikator selbst nutzbar
  // (canvas.js braucht das z. B. auch für frisch aus der Palette
  // erzeugte Elemente, für die es während des Drags noch gar kein
  // DOM-Element gab).
  function applyBounce(domEl) {
    if (!domEl || prefersReducedMotion()) return;
    domEl.classList.remove("drop-settle-bounce");
    void domEl.offsetWidth; // Reflow erzwingen, damit die Animation bei schnell aufeinanderfolgenden Drags erneut startet
    domEl.classList.add("drop-settle-bounce");
    domEl.addEventListener("animationend", () => domEl.classList.remove("drop-settle-bounce"), { once: true });
  }

  // Beendet den Drag: entfernt die Box und löst den Settle-Bounce auf
  // domEl aus (falls übergeben — beim Palette-Drop ist domEl beim Drop-
  // Zeitpunkt noch nicht gerendert, siehe canvas.js).
  function end(domEl) {
    removeBox();
    current = null;
    targetState = null;
    appliedSize = null;
    if (raf != null) { cancelAnimationFrame(raf); raf = null; }
    applyBounce(domEl);
  }

  // ------------------------------------------------------------------
  // Container-Hervorhebung — nur relevant, während ein NEUES Element aus
  // der Palette gezogen wird (siehe canvas.js dragover/dragleave/drop).
  // Bestehende Canvas-Elemente/Bar-Items befinden sich die ganze Drag-
  // Dauer über bereits "in" ihrem Container — ein Dauer-Tint wäre dort
  // nur Rauschen, deshalb wird diese Funktion beim normalen
  // Verschieben eines Elements bewusst nicht aufgerufen.
  // ------------------------------------------------------------------
  function setContainerActive(containerEl, active) {
    containerEl?.classList.toggle("drop-container-active", !!active);
  }

  // ------------------------------------------------------------------
  // FLIP-Hilfsfunktion — vorbereitet für Phase 2 (Section/Row/Grid),
  // aktuell von diesem Modul nirgends aufgerufen: Das heutige Freiform-
  // Canvas hat keine Flow-/Container-Beziehung zwischen Elementen (jedes
  // Element trägt seine eigene, explizite x/y-Position — siehe
  // js/README.md und canvas/alignment.js), es gibt also nichts, das
  // beim Drüberziehen legitim "Platz machen" müsste. Sobald Phase 2
  // echte Row/Grid-Kinder einführt, kann diese Funktion direkt
  // wiederverwendet werden, statt FLIP erneut zu implementieren.
  // ------------------------------------------------------------------
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
