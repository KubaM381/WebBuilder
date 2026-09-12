// WebBuilder preview domain
// Owns preview mode and runtime click actions.
(() => {
  const state=window.WebBuilderState;if(!state){console.error("WebBuilderPreview: WebBuilderState is not available.");return;}
  const isPreview=()=>!!state.isPreviewMode;
  function apply(mode=state.isPreviewMode){state.isPreviewMode=!!mode;document.body.classList.toggle("preview-mode",state.isPreviewMode);const b=document.getElementById("btn-mode-toggle");if(b)b.innerHTML=state.isPreviewMode?"✏️ Editor-Modus":"👁️ Vorschau";window.WebBuilderCanvas?.applyZoom(state.isPreviewMode);window.WebBuilderCanvas?.render?.();
    // state.notify expects positional args (domain, action, payload).
    state.notify?.("preview", state.isPreviewMode ? "enter" : "exit");
    return state.isPreviewMode;}
  const enter=()=>apply(true),exit=()=>apply(false),toggle=()=>apply(!state.isPreviewMode);
  function bindToggle(){const b=document.getElementById("btn-mode-toggle");if(!b||b.dataset.webBuilderPreviewBound==="true")return;b.dataset.webBuilderPreviewBound="true";b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();toggle();},true);}
  window.WebBuilderPreview={isPreview,apply,enter,exit,toggle,bindToggle};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindToggle,{once:true});else bindToggle();

  // body has overflow:hidden (base.css); .canvas-container is the actual
  // scroll container in both editor and preview mode.
  function getScrollContainer(){
    const el=document.querySelector(".canvas-container");
    if(el)return el;
    return document.scrollingElement||document.documentElement;
  }

  // .canvas-column is scale()'d (canvas.js applyZoom()), so layout may
  // not be settled right after a zoom/render change — two nested rAF
  // calls wait for it before reading scrollHeight.
  function performScroll(getTarget){
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const container = getScrollContainer();
        if (!container) return;
        const target = Math.max(0, getTarget(container));
        if (typeof container.scrollTo === "function") {
          try {
            container.scrollTo({ top: target, behavior: "smooth" });
          } catch (error) {
            container.scrollTop = target;
          }
        } else {
          container.scrollTop = target;
        }
      });
    });
    return true;
  }
  function scrollToTop(){return performScroll(() => 0);}
  function scrollToBottom(){return performScroll(container => container.scrollHeight);}

  // elements.js/header-footer.js migrate legacy field names on load, so
  // items here always use actionType/actionUrl/actionMsg/productId.
  function getActionType(item={}){return item.actionType||"none";}
  function execute(item={}){const type=getActionType(item),url=item.actionUrl||"",message=item.actionMsg||"Aktion ausgeführt!";switch(type){case"scroll-top":return scrollToTop();case"scroll-bottom":return scrollToBottom();case"history-back":window.history.back();return true;case"history-forward":window.history.forward();return true;case"open-url":if(!url)return false;window.open(url,"_blank","noopener,noreferrer");return true;case"cart-add":{const product=window.WebBuilderProducts?.getById?.(item.productId);if(!product||!window.WebBuilderCart)return false;window.WebBuilderCart.addItem(product);return true;}case"open-cart-drawer":return !!window.WebBuilderCartRuntime?.open?.();case"open-custom-modal":return !!window.WebBuilderModals?.open?.(item.modalTitle||"Information",item.modalBody||message,item.modalFooter||"");
    // item.messagePosition picks the on-screen corner via openPositionedMessage().
    case"alert-msg":if(window.WebBuilderModals?.openPositionedMessage)window.WebBuilderModals.openPositionedMessage(message,item.messagePosition||"bottom-right");else if(window.WebBuilderModals?.openMessage)window.WebBuilderModals.openMessage(item.modalTitle||"Hinweis",message);else window.alert(message);return true;default:return false;}}
  window.WebBuilderActionRuntime={getActionType,execute,getScrollContainer};
})();
