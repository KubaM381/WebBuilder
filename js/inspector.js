// WebBuilder inspector domain
// Owns selection, property editing, actions and special element controls.
(() => {
  const state=window.WebBuilderState, elements=window.WebBuilderElements;
  if(!state||!elements){console.error("WebBuilderInspector: shared state/elements service missing.");return;}
  function refreshCanvas(){const c=window.WebBuilderCanvas;if(c?.render)c.render();}
  function getSelected(){return elements.getSelected();}
  function select(id){
    const s=elements.setSelected(id);
    // Selecting a real canvas element must deselect any header/footer bar
    // item, and vice versa (see header-footer.js selectItem) — only one of
    // the two right-hand inspector panels may be visible at a time.
    if(id!=null&&state.selectedBarItemRef){state.selectedBarItemRef=null;}
    if(id!=null)window.WebBuilderHeaderFooterRuntime?.render?.();
    refreshCanvas();
    return s;
  }
  function update(id,patch,recordHistory=true){const target=id==null?state.selectedElementId:id;if(!target||!elements.getById(target))return null;if(recordHistory)window.WebBuilderHistory?.arm();const u=elements.update(target,patch);if(recordHistory)window.WebBuilderHistory?.commit();if(u)refreshCanvas();return u;}
  function updateField(id,field,value,recordHistory=true){return field?update(id,{[field]:value},recordHistory):null;}
  function remove(id,recordHistory=true){const target=id==null?state.selectedElementId:id;if(!target||!elements.getById(target))return false;if(recordHistory)window.WebBuilderHistory?.arm();const ok=elements.remove(target);if(recordHistory)window.WebBuilderHistory?.commit();if(ok)refreshCanvas();return ok;}
  function duplicate(id,recordHistory=true){const target=id==null?state.selectedElementId:id;if(!target||!elements.getById(target))return null;if(recordHistory)window.WebBuilderHistory?.arm();const copy=elements.duplicate(target);if(copy)elements.setSelected(copy.id);if(recordHistory)window.WebBuilderHistory?.commit();if(copy)refreshCanvas();return copy;}
  window.WebBuilderInspector={getSelected,select,update,updateField,remove,duplicate};

  // esc centralized in state.js (WebBuilderUtils.escapeHtml).
  const byId=id=>document.getElementById(id), esc=window.WebBuilderUtils.escapeHtml;
  function renderCore(){
    const form=byId("inspector-form"),empty=byId("no-selection"),item=getSelected();
    if(!form||!empty)return;
    const has=!!item;
    const barItems=state.selectedBarItemRef?(state.selectedBarItemRef.target==="footer"?state.footerItems:state.headerItems):null;
    const barActive=!!(state.selectedBarItemRef&&barItems&&barItems.some(x=>x.id===state.selectedBarItemRef.id));
    form.classList.toggle("hidden",!has);
    // Keep the "no selection" hint hidden if a header/footer bar item is
    // being edited instead — that panel (rendered by header-footer.js)
    // takes its place.
    empty.classList.toggle("hidden",has||barActive);
    if(!item)return;
    const values={"prop-id":item.id||"","prop-text":item.text||"","prop-size":Number(item.size)||18,"prop-color":item.color||"#000000","prop-font-family":item.fontFamily||"inherit","prop-image-url":item.imageUrl||""};Object.entries(values).forEach(([id,v])=>{const e=byId(id);if(e&&document.activeElement!==e)e.value=v;});const image=item.type==="image",textLike=["text","headline","button"].includes(item.type);["group-image","group-text","group-color"].forEach(id=>byId(id)?.classList.toggle("hidden",id==="group-image"?!image:id==="group-text"?(image||item.type==="shape"||item.type==="icon"):!textLike));["bold","italic","underline"].forEach(f=>byId(`ttb-${f}`)?.classList.toggle("active",!!item[f]));["left","center","right"].forEach(a=>byId(`ttb-align-${a}`)?.classList.toggle("active",(item.align||"left")===a));
  }
  function updateCore(field,value){const item=getSelected();if(!item)return;updateField(item.id,field,value,true);renderAll();}
  // actionType/actionUrl/actionMsg/productId are the canonical fields;
  // elements.js normalizes legacy names on load, so no fallback is needed
  // here (see elements.js normalizeState / migrateActionFields).
  function renderActions(){const item=getSelected();if(!item)return;const action=item.actionType||"none", sel=byId("prop-action-type");if(sel)sel.value=action;const url=byId("prop-action-url"),msg=byId("prop-action-msg"),product=byId("prop-product");if(url&&document.activeElement!==url)url.value=item.actionUrl||"";if(msg&&document.activeElement!==msg)msg.value=item.actionMsg||"";byId("group-action-url")?.classList.toggle("hidden",action!=="open-url");byId("group-action-msg")?.classList.toggle("hidden",!['alert-msg','open-custom-modal'].includes(action));byId("group-product")?.classList.toggle("hidden",action!=="cart-add");if(product){const list=window.WebBuilderProducts?.getAll?.()||[];product.innerHTML='<option value="">— Produkt auswählen —</option>'+list.map(p=>`<option value="${esc(p.id)}">${esc(p.name)} (${Number(p.discountPrice!=null?p.discountPrice:p.price).toFixed(2)} €)</option>`).join("");product.value=list.some(p=>p.id===item.productId)?item.productId:"";}}
  function renderSpecial(){let panel=byId("inspector-special-runtime"),form=byId("inspector-form");if(!panel&&form){panel=document.createElement("div");panel.id="inspector-special-runtime";panel.innerHTML='<hr class="divider"><h4>⚙️ Erweiterte Eigenschaften</h4>';form.appendChild(panel);const add=(label,input)=>{const g=document.createElement("div");g.className="form-group";const l=document.createElement("label");l.textContent=label;g.append(l,input);panel.appendChild(g);};const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.id="special-icon-frame";add("Icon-Rahmen anzeigen",checkbox);const color=document.createElement("input");color.type="color";color.id="special-icon-frame-color";add("Rahmenfarbe",color);const shape=document.createElement("select");shape.id="special-shape-type";[["rectangle","Rechteck"],["circle","Kreis"],["triangle","Dreieck"]].forEach(([v,t])=>shape.add(new Option(t,v)));add("Form",shape);const style=document.createElement("select");style.id="special-shape-style";[["solid","Gefüllt"],["outline","Umrandung"]].forEach(([v,t])=>style.add(new Option(t,v)));add("Form-Stil",style);const title=document.createElement("input");title.id="special-modal-title";add("Modal-Titel",title);const body=document.createElement("textarea");body.id="special-modal-body";body.rows=3;add("Modal-Inhalt",body);const footer=document.createElement("input");footer.id="special-modal-footer";add("Modal-Fußbereich",footer);const pos=document.createElement("select");pos.id="special-message-position";[["bottom-right","Unten rechts"],["bottom-left","Unten links"],["top-right","Oben rechts"],["top-left","Oben links"],["center","Zentriert"]].forEach(([v,t])=>pos.add(new Option(t,v)));add("Meldungsposition",pos);[[checkbox,"iconFrame",v=>v.checked],[color,"iconFrameColor",v=>v.value],[shape,"shapeType",v=>v.value],[style,"shapeStyle",v=>v.value],[title,"modalTitle",v=>v.value],[body,"modalBody",v=>v.value],[footer,"modalFooter",v=>v.value],[pos,"messagePosition",v=>v.value]].forEach(([e,f,r])=>e.addEventListener(e.type==="checkbox"?"change":(e.tagName==="INPUT"||e.tagName==="TEXTAREA")?"input":"change",()=>{const i=getSelected();if(i)update(i.id,{[f]:r(e)},true);renderAll();}));}
    const item=getSelected();if(!item){panel?.classList.add("hidden");return;}panel?.classList.remove("hidden");const groups=["special-icon-frame","special-icon-frame-color","special-shape-type","special-shape-style","special-modal-title","special-modal-body","special-modal-footer","special-message-position"];const icon=item.type==="icon",shape=item.type==="shape",modal=item.actionType==="open-custom-modal",alert=item.actionType==="alert-msg";groups.forEach(id=>{const e=byId(id);if(!e)return;const g=e.closest(".form-group");if(id.startsWith("special-icon"))g.classList.toggle("hidden",id==="special-icon-frame"?!icon:!icon||!item.iconFrame);else if(id.startsWith("special-shape"))g.classList.toggle("hidden",!shape);else if(id.startsWith("special-modal"))g.classList.toggle("hidden",!modal);else g.classList.toggle("hidden",!alert);});byId("special-icon-frame")&&(byId("special-icon-frame").checked=!!item.iconFrame);if(byId("special-icon-frame-color"))byId("special-icon-frame-color").value=item.iconFrameColor||"#111827";if(byId("special-shape-type"))byId("special-shape-type").value=item.shapeType||"rectangle";if(byId("special-shape-style"))byId("special-shape-style").value=item.shapeStyle||"solid";if(byId("special-modal-title"))byId("special-modal-title").value=item.modalTitle||"";if(byId("special-modal-body"))byId("special-modal-body").value=item.modalBody||"";if(byId("special-modal-footer"))byId("special-modal-footer").value=item.modalFooter||"";if(byId("special-message-position"))byId("special-message-position").value=item.messagePosition||"bottom-right";
  }
  function renderAll(){renderCore();renderActions();renderSpecial();}
  function bind(){
    [["prop-text","text"],["prop-size","size"],["prop-color","color"],["prop-font-family","fontFamily"],["prop-image-url","imageUrl"]].forEach(([id,f])=>byId(id)?.addEventListener("change",e=>{let v=e.target.value;if(f==="size")v=Math.max(12,Math.min(800,Number(v)||18));updateCore(f,v);},true));
    byId("prop-image-file")?.addEventListener("change",e=>{const file=e.target.files?.[0],item=getSelected();if(!file||!item||!file.type.startsWith("image/"))return;const r=new FileReader();r.onload=()=>typeof r.result==="string"&&updateCore("imageUrl",r.result);r.readAsDataURL(file);},true);
    ["bold","italic","underline"].forEach(f=>byId(`ttb-${f}`)?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const i=getSelected();if(i)updateCore(f,!i[f]);},true));
    ["left","center","right"].forEach(a=>byId(`ttb-align-${a}`)?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();updateCore("align",a);},true));
    byId("btn-delete-element")?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const i=getSelected();if(i)remove(i.id,true);renderAll();},true);
    // duplicate() already selects the copy and calls refreshCanvas();
    // renderAll() follows automatically via the "selection" subscribe
    // below, no extra call needed here.
    byId("btn-duplicate-element")?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const i=getSelected();if(i)duplicate(i.id,true);},true);
    byId("prop-action-type")?.addEventListener("change",e=>{const i=getSelected();if(i)update(i.id,{actionType:e.target.value},true);renderAll();},true);
    [["prop-action-url","actionUrl"],["prop-action-msg","actionMsg"],["prop-product","productId"]].forEach(([id,f])=>byId(id)?.addEventListener("change",e=>{const i=getSelected();if(i)update(i.id,{[f]:e.target.value},true);renderAll();},true));
    state.subscribe?.(e=>{if(["elements","selection","products"].includes(e?.domain))renderAll();});
    renderAll();
  }
  document.addEventListener("DOMContentLoaded",()=>setTimeout(bind,0));
})();
