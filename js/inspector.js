import { state, renderCanvas } from './builder.js';
import { createElement } from './elements.js';
import { showToast } from './preview.js';

export function initInspector() {
  injectExtendedInspectorFields();
  setupInspectorListeners();
  setupBackgroundControls();
}

export function injectExtendedInspectorFields() {
  const inspectorForm = document.getElementById("inspector-form");
  const propActionType = document.getElementById("prop-action-type");
  const btnDelete = document.getElementById("btn-delete-element");
  if (!inspectorForm) return;

  if (propActionType) {
    propActionType.innerHTML = `
      <option value="none">Keine Aktion</option>
      <option value="open-url">URL öffnen</option>
      <option value="alert-msg">Meldung / Toast anzeigen</option>
      <option value="cart-add">In den Warenkorb legen</option>
      <option value="open-cart-drawer">Warenkorb öffnen</option>
      <option value="open-modal">Generisches Modal öffnen</option>
      <option value="scroll-top">Nach oben scrollen</option>
      <option value="scroll-bottom">Nach unten scrollen</option>
      <option value="history-back">Browser Zurück</option>
    `;
  }

  const modalGroup = document.createElement("div");
  modalGroup.id = "group-action-modal";
  modalGroup.className = "form-group hidden inspector-section";
  modalGroup.innerHTML = `
    <div class="inspector-section-title">Modal Konfiguration</div>
    <label>Modal Titel</label>
    <input type="text" id="prop-modal-title" class="form-control" placeholder="z. B. Cookie Richtlinien">
    <label style="margin-top:6px;">Modal Inhalt (Fließtext / HTML)</label>
    <textarea id="prop-modal-body" class="form-control" rows="3" placeholder="Inhalt hier eingeben..."></textarea>
  `;
  inspectorForm.insertBefore(modalGroup, btnDelete);

  const stylingGroup = document.createElement("div");
  stylingGroup.id = "group-styling";
  stylingGroup.className = "inspector-section";
  stylingGroup.innerHTML = `
    <div class="inspector-section-title">Styling & Rahmen</div>
    <label>Hintergrundfarbe (Element)</label>
    <input type="color" id="prop-bg-color" value="#ffffff">
    <label><input type="checkbox" id="prop-bg-transparent"> Transparent</label>

    <label style="margin-top:6px;">Rahmen (Border)</label>
    <div style="display:flex; gap:6px;">
      <select id="prop-border-style" class="form-control">
        <option value="none">Kein</option>
        <option value="solid">Durchgezogen</option>
        <option value="dashed">Gestrichelt</option>
        <option value="dotted">Gepunktet</option>
      </select>
      <input type="number" id="prop-border-width" class="form-control" placeholder="1" value="1" min="0" style="width:60px;">
      <input type="color" id="prop-border-color" value="#cbd5e1">
    </div>

    <label style="margin-top:6px;">Eckenabrundung (Radius / Shape)</label>
    <input type="text" id="prop-border-radius" class="form-control" placeholder="z. B. 8px oder 50%">

    <div style="display:flex; gap:6px; margin-top:6px;">
      <div>
        <label>Padding (px)</label>
        <input type="number" id="prop-padding" class="form-control" value="8">
      </div>
      <div>
        <label>Breite (px/% )</label>
        <input type="text" id="prop-width" class="form-control" placeholder="auto">
      </div>
    </div>
  `;
  inspectorForm.insertBefore(stylingGroup, btnDelete);

  const textIntGroup = document.createElement("div");
  textIntGroup.id = "group-text-interaction";
  textIntGroup.className = "inspector-section";
  textIntGroup.innerHTML = `
    <div class="inspector-section-title">Text & Link Optionen</div>
    <label>Link-Ziel Umfang</label>
    <select id="prop-link-scope" class="form-control">
      <option value="full">Gesamtes Element</option>
      <option value="word">Nur bestimmtes Wort</option>
    </select>
    
    <div id="subgroup-link-word" class="hidden" style="margin-top:6px;">
      <label>Anklickbares Wort</label>
      <input type="text" id="prop-link-word" class="form-control" placeholder="z. B. Hier">
    </div>

    <label style="margin-top:6px;">Wort-Hervorhebungen (z. B. 'Wort:red:bold')</label>
    <input type="text" id="prop-word-highlights" class="form-control" placeholder="Format: Wort:Farbe:fett">
  `;
  inspectorForm.insertBefore(textIntGroup, btnDelete);

  const hoverGroup = document.createElement("div");
  hoverGroup.id = "group-hover";
  hoverGroup.className = "inspector-section";
  hoverGroup.innerHTML = `
    <div class="inspector-section-title">Hover-Effekte & Tooltip</div>
    <label>Zweitbild bei Hover (Image-URL)</label>
    <input type="text" id="prop-hover-img" class="form-control" placeholder="https://...">
    
    <div style="display:flex; gap:6px; margin-top:6px;">
      <div>
        <label>Dauer (s)</label>
        <input type="text" id="prop-trans-duration" class="form-control" value="0.3s">
      </div>
      <div>
        <label>Easing</label>
        <select id="prop-trans-easing" class="form-control">
          <option value="ease">ease</option>
          <option value="linear">linear</option>
          <option value="ease-in-out">ease-in-out</option>
        </select>
      </div>
    </div>

    <label style="margin-top:6px;">Hover Tooltip / Beschreibung</label>
    <input type="text" id="prop-hover-tooltip" class="form-control" placeholder="z. B. Produktdetails anzeigen...">
  `;
  inspectorForm.insertBefore(hoverGroup, btnDelete);

  const catGroup = document.createElement("div");
  catGroup.id = "group-category";
  catGroup.className = "inspector-section";
  catGroup.innerHTML = `
    <div class="inspector-section-title">Kategorie & Zuordnung</div>
    <label>Kategorie / Tag</label>
    <input type="text" id="prop-category" class="form-control" placeholder="z. B. Pulver, Gas, Zubehör">
    <label><input type="checkbox" id="prop-is-category-trigger"> Ist Kategorie-Text (Hover hebt Produkte hervor)</label>
  `;
  inspectorForm.insertBefore(catGroup, btnDelete);

  const actionBtnsGroup = document.createElement("div");
  actionBtnsGroup.style.display = "flex";
  actionBtnsGroup.style.gap = "8px";
  actionBtnsGroup.style.marginTop = "12px";
  actionBtnsGroup.innerHTML = `
    <button type="button" id="btn-duplicate-element" class="btn btn-secondary" style="flex:1;">📋 Duplizieren</button>
    <button type="button" id="btn-group-element" class="btn btn-secondary" style="flex:1;">🔗 Gruppieren</button>
  `;
  inspectorForm.insertBefore(actionBtnsGroup, btnDelete);
}

export function selectElement(id) {
  state.selectedElementId = id;
  const noSelectionUI = document.getElementById("no-selection");
  const inspectorForm = document.getElementById("inspector-form");
  const item = state.elements.find(el => el.id === id);

  if (!item) {
    noSelectionUI?.classList.remove("hidden");
    inspectorForm?.classList.add("hidden");
    return;
  }

  noSelectionUI?.classList.add("hidden");
  inspectorForm?.classList.remove("hidden");

  const isImage = item.type === "image";
  const isBox = item.type === "box";

  document.getElementById("group-text")?.classList.toggle("hidden", isImage || isBox);
  document.getElementById("group-color")?.classList.toggle("hidden", isImage);
  document.getElementById("group-image")?.classList.toggle("hidden", !isImage);

  document.getElementById("prop-id").value = item.id;
  document.getElementById("prop-text").value = item.text || "";
  document.getElementById("prop-size").value = item.size || 20;
  document.getElementById("prop-color").value = item.color || "#1f2937";
  document.getElementById("prop-image-url").value = item.imageUrl || "";
  document.getElementById("prop-action-type").value = item.actionType || "none";
  document.getElementById("prop-action-url").value = item.actionUrl || "";
  document.getElementById("prop-action-msg").value = item.actionMsg || "";

  const modalTitleInput = document.getElementById("prop-modal-title");
  const modalBodyInput = document.getElementById("prop-modal-body");
  if (modalTitleInput) modalTitleInput.value = item.modalTitle || "";
  if (modalBodyInput) modalBodyInput.value = item.modalBody || "";

  const bgColorInputEl = document.getElementById("prop-bg-color");
  const bgTransInputEl = document.getElementById("prop-bg-transparent");
  const borderStyleInput = document.getElementById("prop-border-style");
  const borderWidthInput = document.getElementById("prop-border-width");
  const borderColorInput = document.getElementById("prop-border-color");
  const borderRadiusInput = document.getElementById("prop-border-radius");
  const paddingInput = document.getElementById("prop-padding");
  const widthInput = document.getElementById("prop-width");

  if (bgColorInputEl) bgColorInputEl.value = item.bgColor || "#ffffff";
  if (bgTransInputEl) bgTransInputEl.checked = !!item.bgTransparent;
  if (borderStyleInput) borderStyleInput.value = item.borderStyle || "none";
  if (borderWidthInput) borderWidthInput.value = item.borderWidth || 1;
  if (borderColorInput) borderColorInput.value = item.borderColor || "#cbd5e1";
  if (borderRadiusInput) borderRadiusInput.value = item.borderRadius || "0px";
  if (paddingInput) paddingInput.value = item.padding || 4;
  if (widthInput) widthInput.value = item.width || "auto";

  const linkScopeInput = document.getElementById("prop-link-scope");
  const linkWordInput = document.getElementById("prop-link-word");
  const wordHighlightsInput = document.getElementById("prop-word-highlights");
  if (linkScopeInput) linkScopeInput.value = item.linkScope || "full";
  if (linkWordInput) linkWordInput.value = item.linkWord || "";
  if (wordHighlightsInput) wordHighlightsInput.value = item.wordHighlights || "";
  document.getElementById("subgroup-link-word")?.classList.toggle("hidden", item.linkScope !== "word");

  const hoverImgInput = document.getElementById("prop-hover-img");
  const transDurInput = document.getElementById("prop-trans-duration");
  const transEaseInput = document.getElementById("prop-trans-easing");
  const hoverTooltipInput = document.getElementById("prop-hover-tooltip");
  if (hoverImgInput) hoverImgInput.value = item.hoverImageUrl || "";
  if (transDurInput) transDurInput.value = item.transitionDuration || "0.3s";
  if (transEaseInput) transEaseInput.value = item.transitionEasing || "ease";
  if (hoverTooltipInput) hoverTooltipInput.value = item.hoverTooltip || "";

  const categoryInput = document.getElementById("prop-category");
  const isCatTrigInput = document.getElementById("prop-is-category-trigger");
  if (categoryInput) categoryInput.value = item.category || "";
  if (isCatTrigInput) isCatTrigInput.checked = !!item.isCategoryTrigger;

  toggleActionFields(item.actionType);
  renderCanvas();
}

export function getSelected() {
  return state.elements.find(el => el.id === state.selectedElementId);
}

export function toggleActionFields(actionType) {
  document.getElementById("group-action-url")?.classList.toggle("hidden", actionType !== "open-url");
  document.getElementById("group-action-msg")?.classList.toggle("hidden", actionType !== "alert-msg");
  document.getElementById("group-action-modal")?.classList.toggle("hidden", actionType !== "open-modal");
}

function setupBackgroundControls() {
  const bgType = document.getElementById("bg-type");
  const bgSolidGroup = document.getElementById("bg-solid-group");
  const bgGradientGroup = document.getElementById("bg-gradient-group");
  const bgImageGroup = document.getElementById("bg-image-group");
  const bgColorInput = document.getElementById("bg-color-input");
  const bgGrad1Input = document.getElementById("bg-grad-1");
  const bgGrad2Input = document.getElementById("bg-grad-2");
  const bgGradDirInput = document.getElementById("bg-grad-dir");
  const bgImageUrlInput = document.getElementById("bg-image-url");
  const bgImageFileInput = document.getElementById("bg-image-file");

  if (!bgType) return;

  bgType.addEventListener("change", () => {
    const mode = bgType.value;
    bgSolidGroup?.classList.toggle("hidden", mode !== "solid");
    bgGradientGroup?.classList.toggle("hidden", mode !== "gradient");
    bgImageGroup?.classList.toggle("hidden", mode !== "image");
    updateCanvasBackground();
  });

  bgColorInput?.addEventListener("input", updateCanvasBackground);
  bgGrad1Input?.addEventListener("input", updateCanvasBackground);
  bgGrad2Input?.addEventListener("input", updateCanvasBackground);
  bgGradDirInput?.addEventListener("change", updateCanvasBackground);
  bgImageUrlInput?.addEventListener("input", updateCanvasBackground);

  bgImageFileInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (bgImageUrlInput) bgImageUrlInput.value = event.target.result;
        updateCanvasBackground();
      };
      reader.readAsDataURL(file);
    }
  });
}

export function updateCanvasBackground() {
  const canvas = document.getElementById("canvas");
  const bgType = document.getElementById("bg-type");
  if (!canvas || !bgType) return;

  const mode = bgType.value;
  if (mode === "solid") {
    canvas.style.background = document.getElementById("bg-color-input")?.value || "#ffffff";
    canvas.style.backgroundImage = "none";
  } else if (mode === "gradient") {
    const dir = document.getElementById("bg-grad-dir")?.value;
    const g1 = document.getElementById("bg-grad-1")?.value;
    const g2 = document.getElementById("bg-grad-2")?.value;
    canvas.style.background = `linear-gradient(${dir}, ${g1}, ${g2})`;
  } else if (mode === "image") {
    const url = document.getElementById("bg-image-url")?.value || 'https://picsum.photos/1000/1200';
    canvas.style.background = `url("${url}") center/cover no-repeat`;
  }
}

function setupInspectorListeners() {
  document.getElementById("prop-text")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.text = e.target.value; renderCanvas(); } });
  document.getElementById("prop-size")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.size = parseInt(e.target.value) || 16; renderCanvas(); } });
  document.getElementById("prop-color")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.color = e.target.value; renderCanvas(); } });
  document.getElementById("prop-image-url")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.imageUrl = e.target.value; renderCanvas(); } });

  document.getElementById("prop-action-type")?.addEventListener("change", (e) => {
    const item = getSelected();
    if (item) {
      item.actionType = e.target.value;
      toggleActionFields(item.actionType);
      renderCanvas();
    }
  });

  document.getElementById("prop-action-url")?.addEventListener("input", (e) => { const item = getSelected(); if (item) item.actionUrl = e.target.value; });
  document.getElementById("prop-action-msg")?.addEventListener("input", (e) => { const item = getSelected(); if (item) item.actionMsg = e.target.value; });

  document.getElementById("prop-modal-title")?.addEventListener("input", (e) => { const item = getSelected(); if (item) item.modalTitle = e.target.value; });
  document.getElementById("prop-modal-body")?.addEventListener("input", (e) => { const item = getSelected(); if (item) item.modalBody = e.target.value; });

  document.getElementById("prop-bg-color")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.bgColor = e.target.value; renderCanvas(); } });
  document.getElementById("prop-bg-transparent")?.addEventListener("change", (e) => { const item = getSelected(); if (item) { item.bgTransparent = e.target.checked; renderCanvas(); } });
  document.getElementById("prop-border-style")?.addEventListener("change", (e) => { const item = getSelected(); if (item) { item.borderStyle = e.target.value; renderCanvas(); } });
  document.getElementById("prop-border-width")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.borderWidth = parseInt(e.target.value) || 0; renderCanvas(); } });
  document.getElementById("prop-border-color")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.borderColor = e.target.value; renderCanvas(); } });
  document.getElementById("prop-border-radius")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.borderRadius = e.target.value; renderCanvas(); } });
  document.getElementById("prop-padding")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.padding = parseInt(e.target.value) || 0; renderCanvas(); } });
  document.getElementById("prop-width")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.width = e.target.value; renderCanvas(); } });

  document.getElementById("prop-link-scope")?.addEventListener("change", (e) => {
    const item = getSelected();
    if (item) {
      item.linkScope = e.target.value;
      document.getElementById("subgroup-link-word")?.classList.toggle("hidden", item.linkScope !== "word");
      renderCanvas();
    }
  });
  document.getElementById("prop-link-word")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.linkWord = e.target.value; renderCanvas(); } });
  document.getElementById("prop-word-highlights")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.wordHighlights = e.target.value; renderCanvas(); } });

  document.getElementById("prop-hover-img")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.hoverImageUrl = e.target.value; renderCanvas(); } });
  document.getElementById("prop-trans-duration")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.transitionDuration = e.target.value; renderCanvas(); } });
  document.getElementById("prop-trans-easing")?.addEventListener("change", (e) => { const item = getSelected(); if (item) { item.transitionEasing = e.target.value; renderCanvas(); } });
  document.getElementById("prop-hover-tooltip")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.hoverTooltip = e.target.value; renderCanvas(); } });

  document.getElementById("prop-category")?.addEventListener("input", (e) => { const item = getSelected(); if (item) { item.category = e.target.value; renderCanvas(); } });
  document.getElementById("prop-is-category-trigger")?.addEventListener("change", (e) => { const item = getSelected(); if (item) { item.isCategoryTrigger = e.target.checked; renderCanvas(); } });

  document.getElementById("btn-delete-element")?.addEventListener("click", () => {
    if (state.selectedElementId) {
      state.elements = state.elements.filter(el => el.id !== state.selectedElementId);
      state.selectedElementId = null;
      selectElement(null);
      renderCanvas();
      showToast("Element gelöscht", "info");
    }
  });

  document.getElementById("btn-duplicate-element")?.addEventListener("click", () => {
    const item = getSelected();
    if (item) {
      const cloneProps = { ...item, x: item.x + 25, y: item.y + 25 };
      delete cloneProps.id;
      createElement(item.type, item.iconName, cloneProps.x, cloneProps.y, cloneProps);
      showToast("Element dupliziert", "success");
    }
  });

  document.getElementById("btn-group-element")?.addEventListener("click", () => {
    const item = getSelected();
    if (item) {
      const gId = item.groupId || "group_" + Date.now();
      item.groupId = gId;
      showToast(`Element zu Gruppe '${gId}' zugewiesen`, "info");
    }
  });
}
