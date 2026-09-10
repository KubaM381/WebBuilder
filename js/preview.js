// WebBuilder preview domain
// Owns preview mode and runtime click actions.
(() => {
  const state=window.WebBuilderState;if(!state){console.error("WebBuilderPreview: WebBuilderState is not available.");return;}
  const isPreview=()=>!!state.isPreviewMode;
  function apply(mode=state.isPreviewMode){state.isPreviewMode=!!mode;document.body.classList.toggle("preview-mode",state.isPreviewMode);const b=document.getElementById("btn-mode-toggle");if(b)b.innerHTML=state.isPreviewMode?"✏️ Editor-Modus":"👁️ Vorschau";window.WebBuilderCanvas?.applyZoom(state.isPreviewMode);window.WebBuilderCanvas?.render?.();state.notify?.({domain:"preview",type:state.isPreviewMode?"enter":"exit"});return state.isPreviewMode;}
  const enter=()=>apply(true),exit=()=>apply(false),toggle=()=>apply(!state.isPreviewMode);
  function bindToggle(){const b=document.getElementById("btn-mode-toggle");if(!b||b.dataset.webBuilderPreviewBound==="true")return;b.dataset.webBuilderPreviewBound="true";b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();toggle();},true);}
  window.WebBuilderPreview={isPreview,apply,enter,exit,toggle,bindToggle};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindToggle,{once:true});else bindToggle();

  // FIX: body has overflow:hidden (see base.css), so window never scrolls.
  // The real scroll container is #canvas-container (overflow:auto), both in
  // the editor and in preview mode. We resolve it dynamically instead of
  // assuming window, and fall back gracefully if the DOM ever changes.
  function getScrollContainer(){
    const el=document.querySelector(".canvas-container");
    if(el&&el.scrollHeight>el.clientHeight)return el;
    // fallback: whichever element on the page is actually scrollable
    const doc=document.scrollingElement||document.documentElement;
    return doc;
  }
  function scrollToTop(){const c=getScrollContainer();c.scrollTo({top:0,behavior:"smooth"});return true;}
  function scrollToBottom(){const c=getScrollContainer();c.scrollTo({top:c.scrollHeight,behavior:"smooth"});return true;}

  function getActionType(item={}){return item.actionType||item.action||item.action_type||"none";}
  function execute(item={}){const type=getActionType(item),url=item.actionUrl||item.action_url||item.url||"",message=item.actionMsg||item.actionMessage||item.message||"Aktion ausgeführt!";switch(type){case"scroll-top":return scrollToTop();case"scroll-bottom":return scrollToBottom();case"history-back":window.history.back();return true;case"history-forward":window.history.forward();return true;case"open-url":if(!url)return false;window.open(url,"_blank","noopener,noreferrer");return true;case"cart-add":{const productId=item.productId||item.product_id||item.product,product=window.WebBuilderProducts?.getById?.(productId);if(!product||!window.WebBuilderCart)return false;window.WebBuilderCart.addItem(product);return true;}case"open-cart-drawer":return !!window.WebBuilderCartRuntime?.open?.();case"open-custom-modal":return !!window.WebBuilderModals?.open?.(item.modalTitle||"Information",item.modalBody||message,item.modalFooter||"");case"alert-msg":if(window.WebBuilderModals?.openMessage)window.WebBuilderModals.openMessage(item.modalTitle||"Hinweis",message);else window.alert(message);return true;default:return false;}}
  window.WebBuilderActionRuntime={getActionType,execute,getScrollContainer};
})();
