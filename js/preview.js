// WebBuilder preview domain
// Owns preview mode and runtime click actions.
(() => {
  const state=window.WebBuilderState;if(!state){console.error("WebBuilderPreview: WebBuilderState is not available.");return;}
  const isPreview=()=>!!state.isPreviewMode;
  function apply(mode=state.isPreviewMode){state.isPreviewMode=!!mode;document.body.classList.toggle("preview-mode",state.isPreviewMode);const b=document.getElementById("btn-mode-toggle");if(b)b.innerHTML=state.isPreviewMode?"✏️ Editor-Modus":"👁️ Vorschau";window.WebBuilderCanvas?.applyZoom(state.isPreviewMode);window.WebBuilderCanvas?.render?.();
    // FIX: state.notify(domain, action, payload) expects positional args, not
    // an object. Passing an object meant no subscriber ever matched
    // domain === "preview", so nothing reacted to preview mode toggling.
    state.notify?.("preview", state.isPreviewMode ? "enter" : "exit");
    return state.isPreviewMode;}
  const enter=()=>apply(true),exit=()=>apply(false),toggle=()=>apply(!state.isPreviewMode);
  function bindToggle(){const b=document.getElementById("btn-mode-toggle");if(!b||b.dataset.webBuilderPreviewBound==="true")return;b.dataset.webBuilderPreviewBound="true";b.addEventListener("click",e=>{e.preventDefault();e.stopImmediatePropagation();toggle();},true);}
  window.WebBuilderPreview={isPreview,apply,enter,exit,toggle,bindToggle};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bindToggle,{once:true});else bindToggle();

  // FIX: body has overflow:hidden (see base.css), so window/document never
  // scroll. The real scroll container is always .canvas-container
  // (overflow:auto, see canvas.css), in both editor and preview mode.
  // The previous version tried to verify "is this actually scrollable?"
  // via scrollHeight/clientHeight at click time, but that measurement can
  // be stale right after a render/zoom change, causing it to silently fall
  // back to document.documentElement — which never scrolls (body has
  // overflow:hidden). We now return .canvas-container unconditionally when
  // it exists, and only fall back to the document as a last resort if the
  // layout ever changes and that element disappears.
  function getScrollContainer(){
    const el=document.querySelector(".canvas-container");
    if(el)return el;
    return document.scrollingElement||document.documentElement;
  }

  // FIX (Regression, README Roadmap #1): "Nach oben/unten scrollen"
  // reagierte teils überhaupt nicht mehr. Ursache: .canvas-column wird per
  // CSS transform:scale(zoom) skaliert (siehe canvas.js applyZoom()).
  // Direkt nach einem Zoom- oder sonstigen Render-Wechsel kann das Layout
  // (scrollHeight etc.) noch nicht final stabilisiert sein — ein einzelner
  // requestAnimationFrame konnte dann noch einen veralteten Wert lesen,
  // wodurch scrollTo() faktisch ins Leere lief. Zusätzlich gab es keinerlei
  // Fallback, falls scrollTo({behavior:"smooth"}) in einer bestimmten
  // Zoom-/Browser-Konstellation nicht reagierte.
  //
  // Jetzt: zwei verschachtelte requestAnimationFrame-Zyklen, damit das
  // Layout garantiert aktuell ist, bevor die Zielposition berechnet wird,
  // plus ein direkter scrollTop-Fallback, falls scrollTo() aus irgendeinem
  // Grund nicht greift.
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

  function getActionType(item={}){return item.actionType||item.action||item.action_type||"none";}
  function execute(item={}){const type=getActionType(item),url=item.actionUrl||item.action_url||item.url||"",message=item.actionMsg||item.actionMessage||item.message||"Aktion ausgeführt!";switch(type){case"scroll-top":return scrollToTop();case"scroll-bottom":return scrollToBottom();case"history-back":window.history.back();return true;case"history-forward":window.history.forward();return true;case"open-url":if(!url)return false;window.open(url,"_blank","noopener,noreferrer");return true;case"cart-add":{const productId=item.productId||item.product_id||item.product,product=window.WebBuilderProducts?.getById?.(productId);if(!product||!window.WebBuilderCart)return false;window.WebBuilderCart.addItem(product);return true;}case"open-cart-drawer":return !!window.WebBuilderCartRuntime?.open?.();case"open-custom-modal":return !!window.WebBuilderModals?.open?.(item.modalTitle||"Information",item.modalBody||message,item.modalFooter||"");
    // FIX (Offener Punkt #3, siehe README): item.messagePosition wurde hier
    // bisher komplett ignoriert — die Meldung landete unabhängig von der
    // im Inspector gewählten "Meldungsposition" immer im zentralen Modal.
    // Nutzt jetzt WebBuilderModals.openPositionedMessage(), das die Meldung
    // tatsächlich an der gewählten Bildschirmposition (oben/unten,
    // links/rechts, zentriert) einblendet.
    case"alert-msg":if(window.WebBuilderModals?.openPositionedMessage)window.WebBuilderModals.openPositionedMessage(message,item.messagePosition||"bottom-right");else if(window.WebBuilderModals?.openMessage)window.WebBuilderModals.openMessage(item.modalTitle||"Hinweis",message);else window.alert(message);return true;default:return false;}}
  window.WebBuilderActionRuntime={getActionType,execute,getScrollContainer};
})();
