(() => {
'use strict';
const $=id=>document.getElementById(id);
function ensureViewerButtons(){
 const host=document.querySelector('.r8-stage-top');if(!host)return;
 if(!$('deepShadowButton')){const b=document.createElement('button');b.id='deepShadowButton';b.type='button';b.textContent='DS';b.title='Deep Shadow';b.setAttribute('aria-label','Deep Shadow');host.appendChild(b);b.onclick=()=>{const next=!window.BizetKitchenWebGL?.isDeepShadow?.();window.BizetKitchenWebGL?.setDeepShadow?.(next);b.classList.toggle('active',next)};b.classList.toggle('active',window.BizetKitchenWebGL?.isDeepShadow?.()||false)}
 if(!$('motionButton')){const b=document.createElement('button');b.id='motionButton';b.type='button';b.textContent='↔';b.title='Анімація фасадів і шухляд';b.setAttribute('aria-label','Анімація фасадів і шухляд');host.appendChild(b);b.onclick=()=>{const next=!b.classList.contains('active');b.classList.toggle('active',next);window.BizetKitchenWebGL?.setMotion?.(next)}}
}
function syncView(){
 const isView=window.BIZET_KITCHEN_UI_MODE==='VIEW'||document.body.classList.contains('kitchen-view-mode');
 document.body.classList.toggle('r1050-view-full',isView);
 requestAnimationFrame(()=>{window.BizetKitchenWebGL?.redraw?.()});
}
function bindProductionPanel(){
 const body=$('panelBody');if(!body||!document.querySelector('#workspaceTools [data-panel="general"].is-active'))return;
 const profile=$('productionProfileR1050');if(profile){profile.value=window.BizetProductionR1050?.profile?.().id||'QUADRO';profile.onchange=()=>window.BizetProductionR1050?.setProfile?.(profile.value)}
 $('exportProjectR1050')?.addEventListener('click',()=>window.BizetProductionR1050?.exportKitchen?.());
 $('exportDetailR1050')?.addEventListener('click',()=>{const m=window.BizetProductionR1050?.engineeringFromKitchen?.();window.BizetProductionR1050?.downloadDetail?.(m,'BIZET_Kitchen_Detailing_R1050.csv')});
 $('exportBomR1050')?.addEventListener('click',()=>window.BizetPointB?.showBOMTest?.());
 $('exportApprovalR1050')?.addEventListener('click',()=>window.BizetPointB?.openApprovalDrawings?.());
}
function enforceCurrencyLocation(){
 const cur=$('projectCurrencySelect'),final=$('pointBFinalActions');if(!cur||!final)return;const line=final.querySelector('.r104-price-line');if(!line)return;const lab=cur.closest('label');if(lab&&lab.parentElement!==line)line.insertBefore(lab,line.firstChild);
}
const panelObserver=new MutationObserver(()=>setTimeout(bindProductionPanel,0));
function boot(){
 ensureViewerButtons();syncView();enforceCurrencyLocation();
 const pb=$('panelBody');if(pb)panelObserver.observe(pb,{childList:true,subtree:true});
 new MutationObserver(()=>syncView()).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('dblclick',e=>{if(e.target.closest('#modelStage'))e.preventDefault()},{capture:true});
 window.addEventListener('bizet:modelchange',()=>setTimeout(()=>{window.BizetKitchenWebGL?.redraw?.();enforceCurrencyLocation()},40));
 window.addEventListener('bizet:themechange',()=>document.documentElement.dataset.theme=localStorage.getItem('bizet_os_theme')||'light');
 window.addEventListener('bizet:deepshadowchange',e=>$('deepShadowButton')?.classList.toggle('active',!!e.detail?.enabled));
 setInterval(enforceCurrencyLocation,1200);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();