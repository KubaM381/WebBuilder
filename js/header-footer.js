// WebBuilder header/footer domain: header/footer data, canvas rendering
// (bar + items + resize handle), and its own sidebar/inspector editor UI.
(() => {
  const state=window.WebBuilderState;if(!state){console.error("WebBuilderHeaderFooter: shared state missing.");return;}
  const clone=v=>JSON.parse(JSON.stringify(v));
  function emitChange(target,detail){try{window.dispatchEvent(new CustomEvent("webbuilder:header-footer-change",{detail:{target,...clone(detail||{})}}));}catch(e){console.warn("WebBuilderHeaderFooter: change event failed",e);}}

  function numOr(v,fallback){const n=Number(v);return(v!=null&&v!==""&&Number.isFinite(n))?n:fallback;}

  // Legacy field migration — same pattern as elements.js migrateActionFields().
  function normalizeItem(item={}){return{id:item.id||`bar_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,type:item.type==="icon"?"icon":"text",text:item.text||"",iconName:item.iconName||null,x:numOr(item.x,20),y:numOr(item.y,18),color:item.color||"#ffffff",size:Number(item.size)||16,bold:!!item.bold,italic:!!item.italic,underline:!!item.underline,align:item.align||"left",fontFamily:item.fontFamily||"inherit",actionType:item.actionType||item.action||item.action_type||"none",actionUrl:item.actionUrl||item.action_url||item.url||"",actionMsg:item.actionMsg||item.actionMessage||item.message||"",productId:item.productId||item.product_id||item.product||null,modalTitle:item.modalTitle||"",modalBody:item.modalBody||"",modalFooter:item.modalFooter||"",messagePosition:item.messagePosition||"bottom-right"};}

  // In-place normalize keeps refs stable during an active drag (see state.js normalizeInPlace).
  function normalizeItemsInPlace(list){
    return window.WebBuilderUtils.normalizeInPlace(list, normalizeItem);
  }

  function normalizeState(){
    state.headerEnabled=!!state.headerEnabled;
    state.headerSticky=!!state.headerSticky;
    state.headerHeight=Math.max(40,Number(state.headerHeight)||64);
    state.headerBgType=state.headerBgType==="image"?"image":"solid";
    state.headerBgColor=String(state.headerBgColor||"#111827");
    state.headerBgImage=String(state.headerBgImage||"");
    state.headerItems=normalizeItemsInPlace(state.headerItems);
    state.footerEnabled=!!state.footerEnabled;
    state.footerHeight=Math.max(40,Number(state.footerHeight)||70);
    state.footerBgType=state.footerBgType==="image"?"image":"solid";
    state.footerBgColor=String(state.footerBgColor||"#111827");
    state.footerBgImage=String(state.footerBgImage||"");
    state.footerItems=normalizeItemsInPlace(state.footerItems);
    return state;
  }
  const getHeader=()=>({enabled:state.headerEnabled,sticky:state.headerSticky,height:state.headerHeight,bgType:state.headerBgType,bgColor:state.headerBgColor,bgImage:state.headerBgImage,items:state.headerItems});
  const getFooter=()=>({enabled:state.footerEnabled,height:state.footerHeight,bgType:state.footerBgType,bgColor:state.footerBgColor,bgImage:state.footerBgImage,items:state.footerItems});
  function updateHeader(p={},h=true){if(h)window.WebBuilderHistory?.arm();if(p.enabled!=null)state.headerEnabled=!!p.enabled;if(p.sticky!=null)state.headerSticky=!!p.sticky;if(p.height!=null)state.headerHeight=Math.max(40,Number(p.height)||64);if(p.bgType!=null)state.headerBgType=p.bgType==="image"?"image":"solid";if(p.bgColor!=null)state.headerBgColor=String(p.bgColor);if(p.bgImage!=null)state.headerBgImage=String(p.bgImage);if(Array.isArray(p.items))state.headerItems=p.items.map(normalizeItem);if(h)window.WebBuilderHistory?.commit();const r=getHeader();emitChange("header",r);return r;}
  function updateFooter(p={},h=true){if(h)window.WebBuilderHistory?.arm();if(p.enabled!=null)state.footerEnabled=!!p.enabled;if(p.height!=null)state.footerHeight=Math.max(40,Number(p.height)||70);if(p.bgType!=null)state.footerBgType=p.bgType==="image"?"image":"solid";if(p.bgColor!=null)state.footerBgColor=String(p.bgColor);if(p.bgImage!=null)state.footerBgImage=String(p.bgImage);if(Array.isArray(p.items))state.footerItems=p.items.map(normalizeItem);if(h)window.WebBuilderHistory?.commit();const r=getFooter();emitChange("footer",r);return r;}
  function addItem(type,target="header",patch={},h=true){const items=target==="footer"?state.footerItems:state.headerItems,item=normalizeItem({...patch,type,text:patch.text||(type==="icon"?"":"Neuer Text")});if(h)window.WebBuilderHistory?.arm();items.push(item);if(h)window.WebBuilderHistory?.commit();emitChange(target,target==="footer"?getFooter():getHeader());return item;}
  function removeItem(id,target="header",h=true){const items=target==="footer"?state.footerItems:state.headerItems,i=items.findIndex(x=>x?.id===id);if(i<0)return false;if(h)window.WebBuilderHistory?.arm();items.splice(i,1);if(state.selectedBarItemRef?.id===id)state.selectedBarItemRef=null;if(h)window.WebBuilderHistory?.commit();emitChange(target,target==="footer"?getFooter():getHeader());return true;}
  // Merge patch into item before normalizing, not after (order matters).
  function updateItem(id,patch,target="header",h=true){const items=target==="footer"?state.footerItems:state.headerItems,item=items.find(x=>x?.id===id);if(!item)return null;if(h)window.WebBuilderHistory?.arm();const merged=normalizeItem(Object.assign({},item,clone(patch||{})));Object.assign(item,merged);if(h)window.WebBuilderHistory?.commit();emitChange(target,target==="footer"?getFooter():getHeader());return item;}
  normalizeState();
  window.WebBuilderHeaderFooter={normalizeState,normalizeItem,getHeader,getFooter,updateHeader,updateFooter,addItem,removeItem,updateItem,onChange(cb){if(typeof cb!=="function")return()=>{};const h=e=>cb(e.detail);window.addEventListener("webbuilder:header-footer-change",h);return()=>window.removeEventListener("webbuilder:header-footer-change",h);}};

  // esc centralized in state.js (WebBuilderUtils.escapeHtml).
  const byId=id=>document.getElementById(id),esc=window.WebBuilderUtils.escapeHtml;

  function currentSelection(){
    const ref=state.selectedBarItemRef;
    if(!ref)return null;
    const items=ref.target==="footer"?state.footerItems:state.headerItems;
    const item=items.find(x=>x.id===ref.id);
    return item?{ref,item}:null;
  }
  // Deselect canvas element too — mirrors inspector.js select(); panels are mutually exclusive.
  function selectItem(target,id){
    state.selectedBarItemRef={target,id};
    if(window.WebBuilderInspector?.select) window.WebBuilderInspector.select(null);
    else if(window.WebBuilderElements) window.WebBuilderElements.setSelected(null);
    render();
  }
  function clearSelection(){
    if(!state.selectedBarItemRef)return;
    state.selectedBarItemRef=null;
    render();
  }

  function iconMarkup(name){const registry=window.WebBuilderIconRegistry;const m=registry&&typeof registry.get==="function"?registry.get(name):null;return m||"";}
  function itemInnerHtml(item){
    const textDeco=item.underline?"underline":"none",fontFam=item.fontFamily||"inherit",align=item.align||"left";
    if(item.type==="icon"){
      return `<span style="display:inline-flex;width:${Number(item.size)||24}px;height:${Number(item.size)||24}px;color:${item.color||"#fff"};">${iconMarkup(item.iconName)}</span>`;
    }
    return `<span style="font-size:${Number(item.size)||16}px;color:${item.color||"#fff"};font-weight:${item.bold?"bold":"400"};font-style:${item.italic?"italic":"normal"};text-decoration:${textDeco};font-family:${fontFam};text-align:${align};white-space:nowrap;">${esc(item.text||"")}</span>`;
  }
  function backgroundCss(target){
    const type=target==="footer"?state.footerBgType:state.headerBgType;
    const color=target==="footer"?state.footerBgColor:state.headerBgColor;
    const image=target==="footer"?state.footerBgImage:state.headerBgImage;
    if(type==="image"&&image) return `background-color:${color};background-image:url("${image}");background-size:cover;background-position:center;background-repeat:no-repeat;`;
    return `background-color:${color};background-image:none;`;
  }
  function bindResizeHandle(handle,target){
    handle.addEventListener("mousedown",e=>{
      e.preventDefault();e.stopPropagation();
      const isFooter=target==="footer";
      const bar=handle.closest(".builder-bar");
      if(!bar)return;
      const barRect=bar.getBoundingClientRect();
      const fixedEdgeY=isFooter?barRect.bottom:barRect.top;
      const zoom=Number(state.zoomLevel)||1;
      window.WebBuilderHistory?.arm();
      const onMove=moveEvent=>{
        const rawHeight=isFooter?(fixedEdgeY-moveEvent.clientY)/zoom:(moveEvent.clientY-fixedEdgeY)/zoom;
        const clamped=Math.max(40,Math.min(400,Math.round(rawHeight)));
        if(isFooter)state.footerHeight=clamped;else state.headerHeight=clamped;
        renderBars();
        const input=byId(isFooter?"footer-height-input":"header-height-input");
        if(input)input.value=clamped;
      };
      const onUp=()=>{
        document.removeEventListener("mousemove",onMove);
        document.removeEventListener("mouseup",onUp);
        window.WebBuilderHistory?.commit();
        emitChange(target,isFooter?getFooter():getHeader());
      };
      document.addEventListener("mousemove",onMove);
      document.addEventListener("mouseup",onUp);
    });
  }

  // Reuses canvas.js's attachInteraction() so bar items drag/click like canvas elements.
  function bindBarItemInteraction(domEl,item,barEl,target,cfg){
    const canvasHelper=window.WebBuilderCanvas;
    if(!canvasHelper?.attachInteraction){console.error("WebBuilderHeaderFooter: WebBuilderCanvas.attachInteraction missing.");return;}
    canvasHelper.attachInteraction(domEl,item,barEl,{
      getBounds(){
        const zoom=Number(state.zoomLevel)||1;
        const rect=barEl.getBoundingClientRect();
        const width=rect.width/zoom;
        return{minX:0,minY:0,maxX:Math.max(0,width-10),maxY:Math.max(0,(Number(cfg.height)||0)-10)};
      },
      onDragEnd(){emitChange(target,target==="footer"?getFooter():getHeader());},
      onClick(){
        if(state.isPreviewMode){window.WebBuilderActionRuntime?.execute?.(item);return;}
        selectItem(target,item.id);
      }
    });
  }

  function buildBarElement(target){
    const isFooter=target==="footer";
    const cfg=isFooter?getFooter():getHeader();
    const bar=document.createElement("div");
    const useSticky=!isFooter&&cfg.sticky&&state.isPreviewMode;
    bar.className="builder-bar"+(useSticky?" sticky-header":"");
    bar.dataset.barTarget=target;
    bar.style.position=useSticky?"sticky":"absolute";
    bar.style.left="0";bar.style.right="0";
    if(isFooter)bar.style.bottom="0";else bar.style.top="0";
    bar.style.height=cfg.height+"px";
    bar.style.zIndex=isFooter?"250":"300";
    bar.style.cssText+=backgroundCss(target);

    cfg.items.forEach(item=>{
      const el=document.createElement("div");
      const isSelected=state.selectedBarItemRef&&state.selectedBarItemRef.target===target&&state.selectedBarItemRef.id===item.id;
      el.className="bar-item"+(isSelected?" bar-item-selected":"")+(item.actionType&&item.actionType!=="none"?" has-action":"");
      el.style.left=(Number(item.x)||0)+"px";
      el.style.top=(Number(item.y)||0)+"px";
      el.dataset.id=item.id;
      el.innerHTML=itemInnerHtml(item);

      const badge=document.createElement("span");
      badge.className="element-badge";
      badge.innerText="⚡ Logik";
      el.appendChild(badge);

      bindBarItemInteraction(el,item,bar,target,cfg);

      bar.appendChild(el);
    });

    if(!state.isPreviewMode){
      const handle=document.createElement("div");
      handle.className="bar-resize-handle "+(isFooter?"top":"bottom");
      bindResizeHandle(handle,target);
      bar.appendChild(handle);
    }

    bar.addEventListener("click",e=>{if(e.target===bar&&!state.isPreviewMode)clearSelection();},true);
    return bar;
  }
  function renderBars(){
    const canvasEl=document.getElementById("canvas");
    if(!canvasEl)return;
    canvasEl.querySelectorAll(".builder-bar").forEach(el=>el.remove());
    if(state.headerEnabled)canvasEl.insertBefore(buildBarElement("header"),canvasEl.firstChild);
    if(state.footerEnabled)canvasEl.appendChild(buildBarElement("footer"));
  }

  function renderList(target){const list=byId(target==="footer"?"footer-items-list":"header-items-list");if(!list)return;const items=target==="footer"?state.footerItems:state.headerItems;list.innerHTML=items.length?"":'<p class="help-text">Noch keine Elemente.</p>';items.forEach(item=>{const isSel=state.selectedBarItemRef&&state.selectedBarItemRef.target===target&&state.selectedBarItemRef.id===item.id;const row=document.createElement("div");row.className="item-row"+(isSel?" active-item-row":"");row.innerHTML=`<button type="button" class="bar-item-select" data-id="${esc(item.id)}" style="flex:1;text-align:left;">${item.type==="icon"?esc(item.iconName||"Icon"):esc(item.text||"Text")}</button><button type="button" class="item-delete bar-item-delete" data-id="${esc(item.id)}">✕</button>`;list.appendChild(row);});}

  function syncBgControls(target){
    const type=target==="footer"?state.footerBgType:state.headerBgType;
    const color=target==="footer"?state.footerBgColor:state.headerBgColor;
    const image=target==="footer"?state.footerBgImage:state.headerBgImage;
    const typeSel=byId(`${target}-bg-type`),colorInput=byId(`${target}-bg-input`),urlInput=byId(`${target}-bg-image-url`);
    if(typeSel)typeSel.value=type;
    if(colorInput)colorInput.value=color;
    if(urlInput&&document.activeElement!==urlInput)urlInput.value=image||"";
    byId(`${target}-bg-solid-group`)?.classList.toggle("hidden",type!=="solid");
    byId(`${target}-bg-image-group`)?.classList.toggle("hidden",type!=="image");
  }

  // Defers while dragLock is true: renderBars() rebuilds DOM nodes and would
  // break an active drag's pointer capture (see canvas.js scheduleRender()).
  function render(){
    if(state.dragLock){
      if(window.requestAnimationFrame)window.requestAnimationFrame(render);else window.setTimeout(render,16);
      return;
    }
    const h=getHeader(),f=getFooter();
    if(byId("header-toggle"))byId("header-toggle").checked=h.enabled;
    if(byId("header-sticky-toggle"))byId("header-sticky-toggle").checked=h.sticky;
    if(byId("header-height-input"))byId("header-height-input").value=h.height;
    if(byId("footer-toggle"))byId("footer-toggle").checked=f.enabled;
    if(byId("footer-height-input"))byId("footer-height-input").value=f.height;
    syncBgControls("header");
    syncBgControls("footer");
    renderList("header");renderList("footer");
    renderEditor();
    renderBars();
  }

  function populateBarIconSelect(selectEl, selectedName) {
    if (!selectEl) return;
    const registry = window.WebBuilderIconRegistry;
    const allIcons = registry && typeof registry.getAll === "function" ? registry.getAll() : {};
    const names = Object.keys(allIcons);
    selectEl.innerHTML = names.length
      ? names.map(name => `<option value="${esc(name)}">${esc(name)}</option>`).join("")
      : '<option value="">— Kein Icon verfügbar —</option>';
    if (selectedName && names.includes(selectedName)) selectEl.value = selectedName;
  }

  function renderEditor(){
    const panel=byId("bar-inspector-form");
    const emptyMsg=byId("no-selection");
    const elementForm=byId("inspector-form");
    const sel=currentSelection();
    const showBar=!!sel&&!state.selectedElementId;
    if(panel)panel.classList.toggle("hidden",!showBar);
    if(showBar){
      elementForm?.classList.add("hidden");
      emptyMsg?.classList.add("hidden");
    }else if(!state.selectedElementId){
      emptyMsg?.classList.remove("hidden");
    }
    if(!sel)return;
    const{item}=sel;
    const isIcon=item.type==="icon";
    byId("bar-item-text-group")?.classList.toggle("hidden",isIcon);
    byId("bar-group-icon")?.classList.toggle("hidden",!isIcon);
    if(isIcon)populateBarIconSelect(byId("bar-prop-icon"),item.iconName);
    if(byId("bar-prop-text")&&document.activeElement!==byId("bar-prop-text"))byId("bar-prop-text").value=item.text||"";
    if(byId("bar-prop-size")&&document.activeElement!==byId("bar-prop-size"))byId("bar-prop-size").value=Number(item.size)||16;
    if(byId("bar-prop-color"))byId("bar-prop-color").value=item.color||"#ffffff";
    if(byId("bar-prop-font-family"))byId("bar-prop-font-family").value=item.fontFamily||"inherit";
    ["bold","italic","underline"].forEach(f=>byId(`bar-ttb-${f}`)?.classList.toggle("active",!!item[f]));
    ["left","center","right"].forEach(a=>byId(`bar-ttb-align-${a}`)?.classList.toggle("active",(item.align||"left")===a));
    if(byId("bar-prop-action-type"))byId("bar-prop-action-type").value=item.actionType||"none";
    if(byId("bar-prop-action-url")&&document.activeElement!==byId("bar-prop-action-url"))byId("bar-prop-action-url").value=item.actionUrl||"";
    if(byId("bar-prop-action-msg")&&document.activeElement!==byId("bar-prop-action-msg"))byId("bar-prop-action-msg").value=item.actionMsg||"";
    byId("bar-group-action-url")?.classList.toggle("hidden",item.actionType!=="open-url");
    byId("bar-group-action-msg")?.classList.toggle("hidden",!["alert-msg","open-custom-modal"].includes(item.actionType));
    byId("bar-group-product")?.classList.toggle("hidden",item.actionType!=="cart-add");

    const isModal=item.actionType==="open-custom-modal";
    const isAlert=item.actionType==="alert-msg";
    if(byId("bar-prop-modal-title")&&document.activeElement!==byId("bar-prop-modal-title"))byId("bar-prop-modal-title").value=item.modalTitle||"";
    if(byId("bar-prop-modal-body")&&document.activeElement!==byId("bar-prop-modal-body"))byId("bar-prop-modal-body").value=item.modalBody||"";
    if(byId("bar-prop-modal-footer")&&document.activeElement!==byId("bar-prop-modal-footer"))byId("bar-prop-modal-footer").value=item.modalFooter||"";
    if(byId("bar-prop-message-position"))byId("bar-prop-message-position").value=item.messagePosition||"bottom-right";
    byId("bar-group-modal-title")?.classList.toggle("hidden",!isModal);
    byId("bar-group-modal-body")?.classList.toggle("hidden",!isModal);
    byId("bar-group-modal-footer")?.classList.toggle("hidden",!isModal);
    byId("bar-group-message-position")?.classList.toggle("hidden",!isAlert);

    const productSel=byId("bar-prop-product");
    if(productSel){
      const list=window.WebBuilderProducts?.getAll?.()||[];
      productSel.innerHTML=list.length?list.map(p=>`<option value="${esc(p.id)}">${esc(p.icon||"📦")} ${esc(p.name)} — ${Number(p.discountPrice!=null?p.discountPrice:p.price).toFixed(2)} €</option>`).join(""):'<option value="">— Kein Produkt —</option>';
      productSel.value=item.productId||"";
    }
  }
  function updateSelected(patch){const sel=currentSelection();if(!sel)return;transact(()=>updateItem(sel.ref.id,patch,sel.ref.target,false));}

  function transact(fn){window.WebBuilderHistory?.arm();fn();window.WebBuilderHistory?.commit();render();}
  function bindControl(id,fn,event="change"){byId(id)?.addEventListener(event,e=>{e.preventDefault();e.stopImmediatePropagation();transact(()=>fn(e));},true);}

  function bindBgControls(target){
    byId(`${target}-bg-type`)?.addEventListener("change",e=>{transact(()=>{if(target==="footer")state.footerBgType=e.target.value==="image"?"image":"solid";else state.headerBgType=e.target.value==="image"?"image":"solid";});},true);
    byId(`${target}-bg-input`)?.addEventListener("input",e=>{transact(()=>{if(target==="footer")state.footerBgColor=e.target.value;else state.headerBgColor=e.target.value;});},true);
    byId(`${target}-bg-image-url`)?.addEventListener("change",e=>{transact(()=>{if(target==="footer")state.footerBgImage=e.target.value;else state.headerBgImage=e.target.value;});},true);
    byId(`${target}-bg-image-file`)?.addEventListener("change",e=>{
      const file=e.target.files?.[0];
      if(!file||!file.type.startsWith("image/"))return;
      const reader=new FileReader();
      reader.onload=()=>{
        if(typeof reader.result!=="string")return;
        transact(()=>{
          if(target==="footer"){state.footerBgImage=reader.result;state.footerBgType="image";}
          else{state.headerBgImage=reader.result;state.headerBgType="image";}
        });
      };
      reader.readAsDataURL(file);
    },true);
  }

  function bind(){
    bindControl("header-toggle",e=>updateHeader({enabled:e.target.checked},false));
    bindControl("header-sticky-toggle",e=>updateHeader({sticky:e.target.checked},false));
    bindControl("header-height-input",e=>updateHeader({height:e.target.value},false));
    bindControl("footer-toggle",e=>updateFooter({enabled:e.target.checked},false));
    bindControl("footer-height-input",e=>updateFooter({height:e.target.value},false));
    bindBgControls("header");
    bindBgControls("footer");

    [["btn-add-header-text","header","text"],["btn-add-header-icon","header","icon"],["btn-add-footer-text","footer","text"],["btn-add-footer-icon","footer","icon"]].forEach(([id,t,type])=>byId(id)?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();transact(()=>{const i=addItem(type,t,type==="icon"?{iconName:"arrow-right"}:{text:"Neuer Text"},false);state.selectedBarItemRef={target:t,id:i.id};window.WebBuilderElements?.setSelected?.(null);});},true));

    document.addEventListener("click",e=>{
      const s=e.target.closest?.(".bar-item-select"),d=e.target.closest?.(".bar-item-delete");
      if(s){e.preventDefault();e.stopImmediatePropagation();const l=s.closest("[id$='items-list']");selectItem(l?.id==="footer-items-list"?"footer":"header",s.dataset.id);}
      if(d){e.preventDefault();e.stopImmediatePropagation();const l=d.closest("[id$='items-list']"),t=l?.id==="footer-items-list"?"footer":"header";transact(()=>removeItem(d.dataset.id,t,false));}
    },true);

    [["bar-prop-text","text"],["bar-prop-color","color"],["bar-prop-font-family","fontFamily"],["bar-prop-action-url","actionUrl"],["bar-prop-action-msg","actionMsg"],["bar-prop-product","productId"],["bar-prop-modal-title","modalTitle"],["bar-prop-modal-body","modalBody"],["bar-prop-modal-footer","modalFooter"],["bar-prop-message-position","messagePosition"]].forEach(([id,f])=>byId(id)?.addEventListener("change",e=>updateSelected({[f]:e.target.value}),true));
    byId("bar-prop-icon")?.addEventListener("change",e=>updateSelected({iconName:e.target.value}),true);
    byId("bar-prop-size")?.addEventListener("change",e=>updateSelected({size:Math.max(8,Math.min(300,Number(e.target.value)||16))}),true);
    byId("bar-prop-action-type")?.addEventListener("change",e=>updateSelected({actionType:e.target.value}),true);
    ["bold","italic","underline"].forEach(f=>byId(`bar-ttb-${f}`)?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const sel=currentSelection();if(sel)updateSelected({[f]:!sel.item[f]});},true));
    ["left","center","right"].forEach(a=>byId(`bar-ttb-align-${a}`)?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();updateSelected({align:a});},true));
    byId("btn-delete-bar-item")?.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();const sel=currentSelection();if(sel)transact(()=>removeItem(sel.ref.id,sel.ref.target,false));},true);

    onChangeInternal();
    // header/footer changes arrive via onChange() below; state.notify() only covers products/preview here.
    state.subscribe?.(e=>{if(["products","preview"].includes(e?.domain))render();});
    render();
  }
  function onChangeInternal(){window.WebBuilderHeaderFooter.onChange(render);}

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});else bind();
  window.WebBuilderHeaderFooterRuntime={render,renderBars,selectItem,clearSelection,currentSelection,itemInnerHtml};
})();
