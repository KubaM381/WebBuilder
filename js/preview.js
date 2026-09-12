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

  // body has overflow:hidden (see base.css), so window/document never
  // scroll. .canvas-container is the real scroll container in both
  // editor and preview mode.
  function getScrollContainer(){
    const el=document.querySelector(".canvas-container");
    if(el)return el;
    return document.scrollingElement||document.documentElement;
  }

  // .canvas-column is transform:scale()'d (see canvas.js applyZoom()), so
  // right after a zoom/render change the layout may not be settled yet.
  // Two nested rAF calls ensure layout is current before we read
  // scrollHeight; a direct scrollTop fallback covers browsers where
  // scrollTo({behavior:"smooth"}) doesn't fire.
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

  // NOTE: only actionType/actionUrl/actionMsg/productId are produced by
  // elements.js and header-footer.js today. The action/action_type/
  // action_url/url/message/product_id fallbacks below are legacy support
  // for possibly older saved Supabase projects — NOT confirmed to still
  // be needed. Do not remove until confirmed with project owner whether
  // any stored project still uses the old field names.
  function getActionType(item={}){return item.actionType||item.action||item.action_type||"none";}
  function execute(item={}){const type=getActionType(item),url=item.actionUrl||item.action_url||item.url||"",message=item.actionMsg||item.actionMessage||item.message||"Aktion ausgeführt!";switch(type){case"scroll-top":return scrollToTop();case"scroll-bottom":return scrollToBottom();case"history-back":window.history.back();return true;case"history-forward":window.history.forward();return true;case"open-url":if(!url)return false;window.open(url,"_blank","noopener,noreferrer");return true;case"cart-add":{const productId=item.productId||item.product_id||item.product,product=window.WebBuilderProducts?.getById?.(productId);if(!product||!window.WebBuilderCart)return false;window.WebBuilderCart.addItem(product);return true;}case"open-cart-drawer":return !!window.WebBuilderCartRuntime?.open?.();case"open-custom-modal":return !!window.WebBuilderModals?.open?.(item.modalTitle||"Information",item.modalBody||message,item.modalFooter||"");
    // item.messagePosition picks where the message appears (top/bottom,
    // left/right, centered) via openPositionedMessage().
    case"alert-msg":if(window.WebBuilderModals?.openPositionedMessage)window.WebBuilderModals.openPositionedMessage(message,item.messagePosition||"bottom-right");else if(window.WebBuilderModals?.openMessage)window.WebBuilderModals.openMessage(item.modalTitle||"Hinweis",message);else window.alert(message);return true;default:return false;}}
  window.WebBuilderActionRuntime={getActionType,execute,getScrollContainer};
})();
