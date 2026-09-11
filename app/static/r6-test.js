(() => {
  function applyR6Start(){
    const back=document.getElementById('backButton');
    const title=(document.getElementById('stepTitle')?.textContent||'').trim();
    if(back && /тип объекта|property type/i.test(title)) back.hidden=true;
    const screen=document.getElementById('configurationScreenFive');
    if(!screen)return;
    const custom=screen.querySelector('[data-start-config="CUSTOM"]');
    if(custom){custom.disabled=true;custom.dataset.r6PermanentDisabled='true';}
    const button=document.getElementById('configurationContinue5');
    if(button){const label=button.querySelector('span');if(label)label.textContent='Выбрать бытовую технику';}
  }
  applyR6Start();
  new MutationObserver(applyR6Start).observe(document.body,{subtree:true,childList:true});
  window.addEventListener('pageshow',()=>setTimeout(applyR6Start,10));
})();