import { state } from './builder.js';
import { createElement } from './elements.js';

export function initDragAndDrop() {
  const canvas = document.getElementById("canvas");

  document.querySelectorAll(".draggable-item").forEach(item => {
    item.addEventListener("dragstart", (e) => {
      state.draggedType = item.dataset.type;
      state.draggedIcon = item.dataset.icon || null;
      e.dataTransfer.setData("text/plain", state.draggedType);
    });
  });

  canvas?.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  canvas?.addEventListener("drop", (e) => {
    e.preventDefault();
    if (state.isPreviewMode) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - 40;
    const y = e.clientY - rect.top - 20;

    createElement(state.draggedType, state.draggedIcon, Math.max(0, x), Math.max(0, y));
  });
}

export function makeElementDraggableOnCanvas(domEl, item) {
  let isDragging = false;
  let startX, startY;

  domEl.addEventListener("mousedown", (e) => {
    if (state.isPreviewMode) return;
    isDragging = true;
    startX = e.clientX - item.x;
    startY = e.clientY - item.y;

    const onMouseMove = (moveEvent) => {
      if (!isDragging) return;
      item.x = Math.max(0, moveEvent.clientX - startX);
      item.y = Math.max(0, moveEvent.clientY - startY);
      domEl.style.left = `${item.x}px`;
      domEl.style.top = `${item.y}px`;
    };

    const onMouseUp = () => {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}
