import { state } from './builder.js';
import { SVGMAP } from './elements.js';
import { showToast } from './preview.js';

export function initExport() {
  const btnExport = document.getElementById("btn-export");

  btnExport?.addEventListener("click", () => {
    const canvas = document.getElementById("canvas");
    let exportedHTML = `<!-- WebBuilder Pro Export -->\n<div style="position:relative; width:100%; min-height:${state.canvasMinHeight}px; background:${canvas?.style.background || '#ffffff'};">\n`;
    
    if (state.headerConfig.active) {
      exportedHTML += `  <header style="width:100%; padding:14px 24px; background:#fff; display:flex; justify-content:space-between; align-items:center; ${state.headerConfig.sticky ? 'position:sticky; top:0; z-index:1000;' : ''}"><div><strong>${state.headerConfig.title}</strong></div><nav>${state.headerConfig.links}</nav></header>\n`;
    }

    state.elements.forEach(item => {
      exportedHTML += `  <!-- Element: ${item.id} (${item.type}) -->\n`;
      exportedHTML += `  <div style="position:absolute; left:${item.x}px; top:${item.y}px; color:${item.color}; background-color:${item.bgTransparent ? 'transparent' : item.bgColor}; border:${item.borderWidth}px ${item.borderStyle} ${item.borderColor}; border-radius:${item.borderRadius}; padding:${item.padding}px;">\n`;
      
      if (item.type === "icon" && SVGMAP[item.iconName]) {
        exportedHTML += `    ${SVGMAP[item.iconName]}\n`;
      } else if (item.type === "button") {
        exportedHTML += `    <button style="font-size:${item.size}px; background:${item.color}; color:#fff; border:none; padding:10px 20px; border-radius:6px; cursor:pointer;">${item.text}</button>\n`;
      } else if (item.type === "headline") {
        exportedHTML += `    <h2 style="font-size:${item.size}px; color:${item.color}; margin:0;">${item.text}</h2>\n`;
      } else if (item.type === "image") {
        exportedHTML += `    <img src="${item.imageUrl}" style="width:${item.size}px; height:auto; display:block; border-radius:${item.borderRadius};" alt="Exportiertes Bild" />\n`;
      } else if (item.type === "box") {
        exportedHTML += `    <div style="width:${item.size}px; height:${Math.round(item.size*0.65)}px; background:${item.color}; border-radius:${item.borderRadius};"></div>\n`;
      } else {
        exportedHTML += `    <p style="font-size:${item.size}px; color:${item.color}; margin:0;">${item.text}</p>\n`;
      }
      exportedHTML += `  </div>\n`;
    });

    if (state.footerConfig.active) {
      exportedHTML += `  <footer style="width:100%; padding:18px 24px; background:#1e293b; color:#fff; text-align:center;">${state.footerConfig.text}</footer>\n`;
    }

    exportedHTML += `</div>`;

    console.log(exportedHTML);
    showToast("Vollständiges HTML wurde in der Konsole (F12) ausgegeben!", "success");
  });
}
