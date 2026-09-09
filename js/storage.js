import { state, renderCanvas } from './builder.js';
import { showToast } from './preview.js';

const STORAGE_KEY = "webbuilder_project_state";

export function saveProjectToLocalStorage() {
  try {
    const projectData = {
      elements: state.elements,
      canvasMinHeight: state.canvasMinHeight,
      headerConfig: state.headerConfig,
      footerConfig: state.footerConfig,
      toastPosition: state.toastPosition,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
    showToast("Projekt erfolgreich lokal gespeichert! 💾", "success");
  } catch (err) {
    showToast("Fehler beim Speichern im Speicher!", "danger");
    console.error("Storage Error:", err);
  }
}

export function loadProjectFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      showToast("Kein gespeichertes Projekt gefunden.", "info");
      return false;
    }
    const data = JSON.parse(raw);
    if (data.elements) state.elements = data.elements;
    if (data.canvasMinHeight) state.canvasMinHeight = data.canvasMinHeight;
    if (data.headerConfig) state.headerConfig = data.headerConfig;
    if (data.footerConfig) state.footerConfig = data.footerConfig;
    if (data.toastPosition) state.toastPosition = data.toastPosition;

    renderCanvas();
    showToast("Projekt aus lokalem Speicher geladen! 📂", "success");
    return true;
  } catch (err) {
    showToast("Fehler beim Laden des Projekts!", "danger");
    console.error("Storage Error:", err);
    return false;
  }
}

export function enableAutoSave(intervalMs = 30000) {
  setInterval(() => {
    if (state.elements.length > 0) {
      saveProjectToLocalStorage();
    }
  }, intervalMs);
}
