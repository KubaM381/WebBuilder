import { state, renderCanvas, clearCategoryHighlights } from './builder.js';
import { selectElement } from './inspector.js';
import { showToast } from './preview.js';
import { addCustomIcon, createProductCardTemplate } from './elements.js';

export function initToolbar() {
  injectToolbarAndMehrMenuControls();

  const btnClear = document.getElementById("btn-clear");
  btnClear?.addEventListener("click", () => {
    if (confirm("Möchtest du wirklich alle Elemente von der Zeichenfläche löschen?")) {
      state.elements = [];
      state.selectedElementId = null;
      selectElement(null);
      renderCanvas();
      showToast("Zeichenfläche geleert", "info");
    }
  });

  document.getElementById("toast-pos-select")?.addEventListener("change", (e) => {
    state.toastPosition = e.target.value;
    showToast(`Toast-Position geändert zu ${state.toastPosition}`, "info");
  });

  document.getElementById("filter-search-input")?.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      clearCategoryHighlights();
      return;
    }
    const canvas = document.getElementById("canvas");
    const allPlacements = canvas?.querySelectorAll(".placed-element");
    allPlacements?.forEach(el => {
      const item = state.elements.find(i => i.id === el.dataset.id);
      if (item) {
        const match = (item.category && item.category.toLowerCase().includes(query)) ||
                      (item.text && item.text.toLowerCase().includes(query));
        if (match) {
          el.classList.add("category-highlighted");
          el.classList.remove("category-dimmed");
        } else {
          el.classList.add("category-dimmed");
          el.classList.remove("category-highlighted");
        }
      }
    });
  });

  document.getElementById("btn-template-product-card")?.addEventListener("click", createProductCardTemplate);

  document.getElementById("btn-add-custom-icon")?.addEventListener("click", () => {
    const nameInput = document.getElementById("custom-icon-name");
    const svgInput = document.getElementById("custom-icon-svg");
    if (nameInput && svgInput && nameInput.value) {
      addCustomIcon(nameInput.value.trim(), svgInput.value.trim());
      nameInput.value = "";
      svgInput.value = "";
    }
  });
}

export function injectToolbarAndMehrMenuControls() {
  const toolbar = document.querySelector(".toolbar") || document.body;
  
  const settingsDiv = document.createElement("div");
  settingsDiv.style.display = "inline-flex";
  settingsDiv.style.gap = "8px";
  settingsDiv.style.alignItems = "center";
  settingsDiv.style.marginLeft = "10px";
  settingsDiv.innerHTML = `
    <select id="toast-pos-select" class="form-control" style="width:auto; font-size:12px;">
      <option value="top-right">Toast: Top-Right</option>
      <option value="top-left">Toast: Top-Left</option>
      <option value="bottom-right">Toast: Bottom-Right</option>
      <option value="bottom-left">Toast: Bottom-Left</option>
    </select>
    <button id="btn-toggle-header" class="btn btn-secondary" style="font-size:12px;">Header: AUS</button>
    <button id="btn-toggle-footer" class="btn btn-secondary" style="font-size:12px;">Footer: AUS</button>
  `;
  toolbar.appendChild(settingsDiv);

  const sidebar = document.querySelector(".sidebar") || document.body;
  const extraPanel = document.createElement("div");
  extraPanel.className = "inspector-section";
  extraPanel.style.padding = "10px";
  extraPanel.innerHTML = `
    <div class="inspector-section-title">Mehr & Filter System</div>
    <div style="margin-bottom:8px;">
      <input type="text" id="filter-search-input" class="form-control" placeholder="Kategorie / Name suchen...">
    </div>
    <button id="btn-template-product-card" class="btn btn-primary" style="width:100%; margin-bottom:8px;">+ Produkt-Karte Template</button>
    
    <details>
      <summary style="cursor:pointer; font-size:12px; font-weight:600;">Custom SVG Icon hinzufügen</summary>
      <div style="margin-top:6px;">
        <input type="text" id="custom-icon-name" class="form-control" placeholder="Icon-Name (z.B. star)" style="margin-bottom:4px;">
        <textarea id="custom-icon-svg" class="form-control" rows="2" placeholder="<svg>...</svg> oder Bild-URL"></textarea>
        <button id="btn-add-custom-icon" class="btn btn-secondary" style="width:100%; margin-top:4px;">Icon Speichern</button>
      </div>
    </details>
  `;
  sidebar.prepend(extraPanel);
}
